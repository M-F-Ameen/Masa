# MASA Restaurant Management App
## Business Logic, Calculations, and Completeness Audit

**Audit date:** 2026-10-11  
**Repository:** `ahmadhasandev711-web/Masa`  
**Scope:** application source, Prisma schema, server actions, domain services, use cases, repositories, and reporting logic.  
**Change policy:** this is an analysis-only report. No application source code was changed.

## Executive conclusion

The project is a real multi-branch restaurant-management application built with Next.js, TypeScript, Prisma, and MariaDB/MySQL. The core POS path is reasonably structured and can run locally, but the application is **not yet reliable enough to be treated as an accounting, inventory, or operational-control system without corrective work**.

The most important risks are:

1. **Branch isolation is inconsistent.** Several table/tab actions accept object IDs while checking only a permission, allowing a branch-scoped user to potentially operate on another branch's tables/orders if IDs are known.
2. **Inventory deduction is not safe under concurrency and permits negative stock.** Duplicate deductions can occur, and overselling is allowed by design in the current code.
3. **Order status, payment, inventory, customer totals, and refund records are updated in separate operations.** A failure midway can leave these ledgers disagreeing.
4. **Several reports count orders that are not paid, while finance reports can count refunded/cancelled activity.** The same sale therefore has different meanings depending on the screen.
5. **Delivery dispatch and driver settlement controls are incomplete.** Orders can bypass the kitchen-ready state, drivers already on delivery can receive more work, and settlement concurrency/payment classification can be wrong.
6. **Costing is only an approximation of WAC.** The stored cost is global, not branch-specific or historical, and recipe/unit conversion is not enforced.
7. **The test suite is absent.** `npm test` finds no test files, so the highest-risk calculations and authorization boundaries are not protected by automated regression tests.

The app is suitable for continued development and local demonstration. Before production use, the P0/P1 findings below should be addressed and covered by integration tests.

## Technology and architecture understood

- Next.js 16 App Router with React 19 and TypeScript.
- Prisma 7 using the MariaDB adapter and a MySQL-compatible schema.
- Domain/application/infrastructure layering with server actions as the application boundary.
- Main business areas: catalog, POS, dine-in tables/tabs, online orders, kitchen/order workflow, delivery, inventory and recipes, purchasing, cash shifts, expenses, customer CRM, event bookings, and reports.
- Money is generally stored as integer minor units; quantities are decimal values for inventory.
- Orders preserve product/name/price snapshots, which is good for historical receipts, but the underlying costing and accounting are not fully historical.
- The schema has unique POS/online idempotency keys and unique order numbers, but several generators and workflows are not concurrency-safe enough to rely on those constraints alone.

## Severity scale

- **P0 — Critical:** security, financial integrity, or data corruption risk; fix before real operations.
- **P1 — High:** materially incorrect business result or workflow; fix before production.
- **P2 — Medium:** important control, consistency, or reporting weakness.
- **P3 — Low:** usability, maintainability, or policy gap.

## Confirmed findings

### P0 — Branch authorization is missing from multiple table/tab actions

**Evidence**

- `src/app/actions/table.actions.ts:115-180` checks POS permission for operations such as adding to a tab, transferring a table, printing a bill, splitting a bill, and closing a tab, but does not consistently call `BranchContextService.assertBranchAccess`.
- `src/application/tables/use-cases/add-items-to-tab.use-case.ts:24-38` loads an order by ID without checking that its branch is in the current session scope.
- `src/application/tables/use-cases/close-table-tab.use-case.ts:13-33` loads the table, order, and shift but does not verify that table, order, and shift belong to the same branch or that the shift belongs to the active cashier/session.
- `src/application/tables/use-cases/manage-tables.use-case.ts` and `manage-sections.use-case.ts` also load existing records by ID and rely on the action layer for authorization; their action callers must therefore always enforce scope.

**Business impact**

A user assigned to one branch may be able to modify or close another branch's table/order by submitting a valid ID. This can create cross-branch sales, inventory deductions, payment records, and cash-shift postings.

**Required correction**

Make every use case enforce resource scope, not only the UI/server action. Resolve the branch from the resource and require all related resources—order, table, shift, driver, and settlement—to agree on branch. Add negative authorization integration tests for every branch-scoped action.

### P0 — Inventory deduction is not concurrency-safe and allows overselling

**Evidence**

- `src/infrastructure/inventory/order-inventory-deduction.service.ts:21-33` checks for an existing movement using `findFirst`, but the schema has no unique constraint on `(referenceId, type, inventoryItemId)` or equivalent. Two concurrent calls can both pass the check.
- `src/infrastructure/inventory/order-inventory-deduction.service.ts:98-117` decrements or creates branch inventory without rejecting a negative resulting quantity.
- `src/infrastructure/pos/prisma-pos-transaction.ts:66-120` duplicates deduction logic and also permits negative stock.
- `prisma/schema.prisma:700-721` indexes `referenceId` but does not make the deduction idempotency key unique.

**Business impact**

Retries, simultaneous status changes, or two checkout requests can deduct the same recipe twice. A busy branch can sell more ingredients than it has, producing negative inventory and unreliable COGS.

**Required correction**

Use one shared deduction service inside the same transaction as the order transition. Add a database-level idempotency key or deduction ledger constraint, lock the branch-inventory rows, and define an explicit policy for insufficient stock: reject, backorder, or allow negative stock with a visible controlled exception. Do not silently mix these policies.

### P0 — Online order status changes can leave the order and inventory inconsistent

**Evidence**

- `src/application/ordering/use-cases/update-order-status.use-case.ts:78-134` changes payment/status data, then calls inventory deduction through a separate operation.
- The status is changed before the inventory operation completes. A deduction failure can leave an order in `PREPARING`/another later state without the corresponding stock movement.
- Cancellation/rejection also reclassifies stock movements to `WASTE` at `src/application/ordering/use-cases/update-order-status.use-case.ts:152-169`, rather than restoring stock when the food was never prepared.

**Business impact**

The order status, stock balance, COGS, customer totals, and refund audit can disagree after a timeout or database error. A cancellation before preparation may destroy inventory accounting by treating unused ingredients as waste.

**Required correction**

Implement an explicit order-transition transaction/outbox workflow. Decide whether cancellation at each stage means restock, waste, or no movement. Make the transition idempotent and record the actor, reason, payment reversal, inventory movement, and customer-stat change together.

### P1 — Online ordering ignores branch product availability

**Evidence**

- `src/application/ordering/use-cases/place-online-order.use-case.ts:64-79` validates that products, sizes, and modifiers are active, but does not check `BranchProductAvailability` for the selected branch.
- `prisma/schema.prisma:303-313` contains branch-specific availability specifically for this purpose.

**Business impact**

An online customer can order an item disabled at the target branch. The branch can receive an order it cannot produce, or the system may deduct inventory for an unavailable item.

**Required correction**

Require branch selection before pricing and validate product availability for that branch. Recheck availability during order acceptance/dispatch because availability may change between checkout and preparation.

### P1 — Dine-in tabs skip modifier rules and branch availability

**Evidence**

- `src/application/tables/use-cases/open-table-tab.use-case.ts:60-110` resolves valid products/modifiers but does not enforce modifier-group `minSelect`/`maxSelect` rules and silently ignores invalid modifier IDs.
- `src/application/tables/use-cases/add-items-to-tab.use-case.ts:44-95` has the same gap.
- These flows also do not consistently check branch product availability.

**Business impact**

The same product can have different validity and price composition in POS, online, and dine-in channels. Staff can create orders that the online/POS validators would reject, and the stored receipt can omit invalid selections without notifying the operator.

**Required correction**

Extract one shared line-resolution/validation service for all order channels. Reject unknown modifiers rather than silently dropping them, validate group limits, and check branch availability.

### P1 — Reports use inconsistent definitions of “sales”

**Evidence**

- `src/application/reports/use-cases/get-sales-analytics.use-case.ts:59-69` excludes cancelled/rejected/pending orders but does not require `paymentStatus = PAID`.
- `src/application/reports/use-cases/get-branch-performance.use-case.ts:46-82` likewise excludes some statuses but does not require paid orders.
- `src/application/ordering/use-cases/list-orders.use-case.ts:177-199` applies payment filtering to `paidSummary`, but channel summaries use the broader order filter.
- `src/infrastructure/finance/prisma-finance.repository.ts:33-87` aggregates shift payments/orders without consistently excluding refunded/cancelled/deleted activity.

**Business impact**

Unpaid, partially paid, failed, or refunded activity can appear as revenue in one report and not another. Managers cannot reconcile the dashboard, cash shift, and profit-and-loss report.

**Required correction**

Define canonical metrics: gross sales, paid sales, refunds, tax collected, delivery fees, discounts, net sales, and COGS. Centralize the query predicates and use them in every report and shift calculation. Reconcile from payment/refund ledgers, not only order status.

### P1 — Delivery dispatch bypasses the kitchen and driver availability controls

**Evidence**

- `src/application/delivery/use-cases/dispatch-order.use-case.ts:24-52` rejects terminal/already-dispatched orders but does not require `READY_FOR_PICKUP`.
- The same use case checks that a driver is active but does not require driver status `AVAILABLE`; a driver already `ON_DELIVERY` can receive more orders.
- `src/application/delivery/use-cases/dispatch-order.use-case.ts:54-71` updates orders/driver without conditional status predicates or row locking sufficient to prevent concurrent assignment.

**Business impact**

Orders can be dispatched before they are ready, and the same driver/order can be assigned concurrently. This creates operational confusion and can cause duplicate delivery responsibility.

**Required correction**

Require the correct state transition (`READY_FOR_PICKUP -> OUT_FOR_DELIVERY`), require an available driver, lock the driver and order rows, and update with conditions such as “status is still READY_FOR_PICKUP / driver is still AVAILABLE.”

### P1 — Driver settlement can double-link orders and misclassify cash

**Evidence**

- `src/application/delivery/use-cases/settle-driver-cash.use-case.ts:28-45` preloads delivered unsettled orders.
- `:81-121` creates a settlement and links all preloaded orders without a conditional `driverSettlementId IS NULL` update or row lock.
- `src/domain/delivery/services/driver-settlement-calculator.service.ts:47-63` treats an order as COD when `paymentMethod = CASH OR paymentStatus = PENDING`. A pending card/online order can therefore be counted as driver-held cash.
- The settlement use case creates cash payments only for `paymentMethod = CASH` at `:97-112`, which does not match the calculator's broader rule.
- `:60-73` accepts or finds a cash shift without fully validating that it is open, belongs to the selected branch, and is appropriate for the current cashier.

**Business impact**

The driver can be charged for money they never collected, while a real COD order can be omitted or settled twice. Cash-in can also be posted to the wrong shift.

**Required correction**

Classify COD only from the actual payment method/payment ledger. Lock orders during settlement, update only unsettled rows, verify the shift branch/status/cashier, and make the settlement operation idempotent.

### P1 — COGS/WAC is not historical or branch-specific

**Evidence**

- `prisma/schema.prisma:642-659` stores one `InventoryItem.defaultCostMinor` for all branches.
- `src/infrastructure/inventory/prisma-inventory.repository.ts:532-559` recalculates that default cost using aggregate stock across branches.
- `src/infrastructure/inventory/order-inventory-deduction.service.ts:121-123` uses the current global default cost when creating sale movements.
- `src/infrastructure/pos/prisma-pos-transaction.ts:119-120` validates cost using hard-coded `EGP`.

**Business impact**

Purchases received at different costs or in different branches can overwrite one global cost. Historical COGS changes when the current item cost changes, and branch profitability can be wrong.

**Required correction**

Choose and document a costing method. For WAC, maintain branch-level quantity/value and calculate cost at receipt; record the resolved unit cost on each sale movement. For FIFO/lot costing, maintain lots. Store unit-of-measure conversions and enforce compatible recipe/purchase units.

### P1 — Recipe model permits incomplete and cross-linked recipes

**Evidence**

- `src/application/inventory/dto/inventory.dto.ts` validates UUIDs and positive quantities but not ownership relationships.
- `src/infrastructure/inventory/prisma-inventory.repository.ts:233-280` deletes and recreates recipe rows without verifying that a size belongs to the product or that a modifier belongs to a product's modifier groups.
- `src/domain/inventory/services/inventory-consumption.service.ts:21-24` explicitly treats products without recipes as consuming zero stock.

**Business impact**

An invalid recipe can deduct the wrong ingredient, while a missing recipe makes sales look profitable and leaves stock untouched. Recipe quantities are also multiplied without an explicit conversion between units such as kilograms/grams or liters/milliliters.

**Required correction**

Validate recipe ownership in the same transaction, enforce unit conversion, report products with missing recipes, and make a policy decision: block sale, warn, or allow an intentional non-stock item.

### P1 — Refund handling is an audit record, not a real refund workflow

**Evidence**

- `src/application/ordering/use-cases/update-order-status.use-case.ts:78-117` marks the order payment status as refunded and creates a `ReturnInvoice`, but does not create a payment reversal/refund transaction or integrate with a payment provider.
- Return-number creation uses a random suffix and is not retried safely on collision.

**Business impact**

The database can say a customer was refunded while cash/card balances were not actually reversed. Finance reports and customer-facing refund status can therefore be false.

**Required correction**

Create a payment/refund ledger with amount, method, actor, reason, provider reference, and timestamp. Make refund operations idempotent and define inventory treatment separately for prepared, unprepared, and returned items.

### P1 — Cash-shift controls do not fully enforce ownership and audit separation

**Evidence**

- `src/infrastructure/finance/prisma-finance.repository.ts:264-369` performs blind close by branch but does not verify that the session cashier owns the shift.
- `src/app/actions/finance.actions.ts:47-55` allows any user with `MANAGE_FINANCE` to invoke it for an accessible branch.
- `src/infrastructure/finance/prisma-finance.repository.ts:363-364` calls `getShiftDetails` through the repository/global Prisma client while a close transaction is open, which can read outside the transaction.
- `src/infrastructure/finance/prisma-finance.repository.ts:371-420` can audit a non-open shift, so an already audited shift can potentially be overwritten.

**Business impact**

The shift lifecycle is not a strict append-only control. A manager may close another cashier's shift unintentionally, or a previously approved audit may be modified.

**Required correction**

Define who may close another cashier's shift, enforce that policy explicitly, use the transaction client for all reads in the close transaction, and allow audit only for `CLOSED -> AUDITED` with immutable approval metadata.

### P1 — Table tab writes have race conditions around totals and closing

**Evidence**

- `src/application/tables/use-cases/add-items-to-tab.use-case.ts:97-169` calculates totals before the transaction and then appends/updates without locking the order/table for the calculation.
- `src/application/tables/use-cases/close-table-tab.use-case.ts:51-99` preloads state, then updates the order and table without conditional checks tying the update to the same active order/status.

**Business impact**

Two staff terminals can add items simultaneously and overwrite totals, or one terminal can close while another adds items. Payments and inventory can then be based on a stale total.

**Required correction**

Perform the read, lock, line insert, recalculation, payment validation, and state update inside one transaction. Use conditional updates and retry safe transaction conflicts.

### P1 — Customer aggregate fields can drift from actual orders

**Evidence**

- `src/application/ordering/use-cases/place-online-order.use-case.ts:246-253` increments `Customer.totalOrders` and `totalSpent` at order placement, before payment/completion.
- `src/application/ordering/use-cases/update-order-status.use-case.ts:136-150` compensates on cancellation/rejection, but the separate operations are not an atomic ledger.
- `Customer.lastOrderAt` is not consistently updated when the aggregate changes.

**Business impact**

Pending, failed, refunded, or partially processed orders can inflate customer value and order count. CRM segmentation and loyalty decisions become unreliable.

**Required correction**

Derive customer aggregates from a canonical paid-order/payment ledger or update them transactionally on a clearly defined event, such as successful payment. Add a reconciliation command to rebuild aggregates.

### P1 — Sales date/time logic is inconsistent and Cairo DST is hard-coded incorrectly

**Evidence**

- `src/domain/shared/utils/date-range.ts:15-16` constructs Cairo day boundaries using a fixed `+02:00` offset. Cairo can use daylight-saving offset changes, so this is not always correct.
- `src/application/ordering/use-cases/list-orders.use-case.ts:60-70` uses UTC midnight for date filters.
- `src/application/reports/use-cases/get-sales-analytics.use-case.ts:141-163` mixes server-local `getHours()` with UTC `toISOString()` dates.
- `src/application/finance/use-cases/get-profit-and-loss.use-case.ts:13-22` converts dates using the server's local timezone.

**Business impact**

Orders near midnight or a DST boundary can appear on the wrong business day. Hourly, daily, branch, shift, and P&L reports can disagree.

**Required correction**

Use one named business timezone (`Africa/Cairo`) with a timezone-aware library or database-safe UTC boundaries. Store UTC timestamps, convert only at query/display boundaries, and test midnight/DST cases.

### P1 — Online order numbering is race-prone

**Evidence**

- `src/application/ordering/use-cases/place-online-order.use-case.ts:296-312` obtains the daily number using `COUNT(*) + 1` under a transaction.
- `Order.orderNumber` is unique at `prisma/schema.prisma:458`, but the generator does not robustly retry order-number collisions.

**Business impact**

Concurrent online checkouts can calculate the same next number. One request may fail after a valid customer checkout, or retry behavior may create confusion.

**Required correction**

Use a database sequence/counter row per branch/day with row locking, or generate a globally unique internal number and keep the human display number separate. Retry unique conflicts safely.

## Important calculation and policy weaknesses

### Pricing, tax, discount, and currency

- `src/domain/ordering/services/order-pricing.service.ts:23-82` applies tax to subtotal but not delivery fee. This may be correct or incorrect depending on the tax policy; it must be explicit and shared with reports/invoices.
- Tax rate input has no strong domain range validation. Invalid settings could produce negative or extreme tax.
- POS rejects a discount equal to the pre-discount total (`src/domain/pos/services/pos-sale.service.ts:24-33`), so a legitimate 100% promotion cannot be represented even if the business wants to allow it.
- The code contains multiple fallbacks to `EGP`, including table tabs, driver settlement, finance, split bills, and POS transaction cost validation. This conflicts with configurable restaurant currency and can cause mixed-currency records.
- `src/domain/shared/value-objects/money.ts:40-45` uses JavaScript number arithmetic in `fromMajor`. The value is rounded, but input validation should reject non-finite values and monetary input should preferably arrive as a validated decimal string or integer minor unit.

### Inventory and procurement

- No reservation exists for pending online orders. Inventory is consumed later, so multiple pending orders can promise the same stock.
- `src/infrastructure/inventory/prisma-inventory.repository.ts:381-467` generates purchase-order numbers from time plus a short random suffix. It should handle collisions deterministically.
- Stock adjustment accepts arbitrary positive/negative deltas. There is no approval threshold, reason enforcement, or dual-control requirement for large adjustments.
- No lot, expiry, wastage reason, supplier invoice reconciliation, or branch transfer workflow is evident.
- Product replacement in `src/application/catalog/use-cases/save-product.use-case.ts:31-62` deletes/recreates sizes and modifier groups. This can invalidate recipe links and operational references unless the deletion/cascade policy is deliberately intended.

### Order lifecycle and delivery

- `src/application/delivery/use-cases/dispatch-order.use-case.ts` can dispatch without the kitchen-ready state.
- `src/application/ordering/use-cases/assign-order-branch.use-case.ts:29-45` changes branch for an order without rechecking target-branch availability or repricing branch-specific delivery/tax rules.
- `src/application/ordering/use-cases/update-order-status.use-case.ts:69-76` auto-marks cash orders paid when completed/delivered, but does not create a corresponding payment event at that point.
- `src/application/tables/use-cases/split-table-bill.use-case.ts:19-33` calculates a split preview but does not persist split payment allocations. It should not be presented as complete split-bill accounting until payment records are implemented.
- `src/application/bookings/use-cases/update-booking-status.use-case.ts:9-29` permits enum status assignment without transition rules. A booking can move directly between states without audit or validation.
- `src/application/bookings/use-cases/create-event-booking.use-case.ts:27-34` does not validate that the branch is active, the date is not in the past, the guest count is valid for capacity, or that bookings do not overlap.

### Reporting and profitability

- `src/infrastructure/finance/prisma-finance.repository.ts:593-715` calls `order.totalMinor` “net sales.” That total includes tax and delivery fees, which are not normally restaurant revenue. The accounting definition needs to be documented.
- P&L COGS is based on inventory movement date and the stored movement cost, while sales are based on order/payment dates. Period cutoffs can therefore mismatch.
- `src/application/reports/use-cases/get-menu-engineering.use-case.ts:88-96` calculates recipe cost from product-level recipe rows and does not clearly include size-specific and modifier-specific costs. It also uses a current default cost rather than a historical sale cost.
- The menu-engineering report is not a complete menu-engineering matrix: it ranks items but does not calculate category averages, popularity/contribution quadrants, or a decision classification.
- `src/application/reports/use-cases/get-branch-performance.use-case.ts:46-82` names a value `netRevenue` after subtracting expenses, but does not subtract COGS and may include unpaid sales. This is not net profit.
- Low-stock reporting in `src/application/reports/use-cases/get-inventory-analytics.use-case.ts:92-112` only sees existing `BranchInventory` rows; an item with no row is not necessarily surfaced as a zero-stock alert.

### Authorization and public exposure

- `src/app/actions/booking.actions.ts:26-39` checks permission for booking status updates but does not enforce branch scope.
- `src/app/actions/order.actions.ts:64-82` forces non-central users to their first assigned branch, so a legitimate user assigned to multiple branches cannot select another assigned branch.
- `src/infrastructure/auth/branch-context.service.ts:23-31` treats resources with a null branch as visible to all scoped users. This is dangerous for any order/resource that should never be unassigned.
- `src/application/ordering/use-cases/get-order-tracker.use-case.ts:12-67` exposes public tracking by a sequential/guessable order number. It masks some customer data but returns operational contact information. The number should be combined with a possession secret, phone verification, or high-entropy tracking token.
- `src/infrastructure/security/rate-limiter.ts:10-12` stores rate limits in process memory. This is not effective across multiple Node processes, containers, or serverless instances, and it resets on restart.
- `src/app/actions/finance.actions.ts:64-72` uses the same `MANAGE_FINANCE` permission for audit as for normal finance operations. If audit approval is intended as separation of duties, a distinct permission/role is needed.

## Missing or incomplete business capabilities

These are not necessarily defects in a first release, but they are missing for a mature restaurant-management product:

- Real online payment gateway flow, payment webhooks, partial payments, failed payments, and payment reconciliation. The enum supports online-like states, but the online checkout currently creates cash payments.
- Full refund/return workflow with provider reversal, cash refund, card refund, approval, and restocking policy.
- Stock reservation for pending online orders.
- Branch-specific pricing, tax, delivery zones/fees, operating hours, and menu versions.
- Ingredient unit conversion and enforceable recipe completeness.
- Purchase-order lifecycle controls: approval, partial receipt, cancellation, invoice matching, and supplier balance.
- Branch transfers, stock counts, stock-take variance approval, expiry/lot tracking, and waste reasons.
- Promotions, coupons, scheduled pricing, customer discounts, loyalty, and a proper discount approval/audit trail.
- Order edit/amendment history after confirmation, voids, and item-level cancellation/refund.
- Booking capacity, availability calendar, deposits, conflict detection, and status-transition audit.
- Durable audit log for sensitive operations: discounts, status changes, refunds, stock adjustments, shift close/audit, recipe edits, and permission changes.
- Automated tests for domain calculations, authorization, concurrency/idempotency, and report reconciliation.

## What appears sound or reasonably implemented

The following patterns are good foundations, subject to the cross-channel gaps above:

- Integer minor-unit money is used for most order/payment amounts.
- `Order.posIdempotencyKey` and `Order.onlineIdempotencyKey` are unique in the schema (`prisma/schema.prisma:456-465`).
- POS DTOs constrain quantities and payment shapes (`src/application/pos/dto/pos.dto.ts:4-41`).
- POS settlement has explicit cash/card/mixed branches (`src/domain/pos/services/pos-settlement.service.ts:10-26`).
- Table opening uses a transaction and table-row update conditions to prevent basic double opening (`src/application/tables/use-cases/open-table-tab.use-case.ts:125-209`).
- The order state machine prevents some invalid terminal transitions (`src/domain/ordering/services/order-state-machine.service.ts:17-27`).
- Product and order snapshots help preserve receipt names/prices after menu edits.
- Foreign keys and several restrictive/cascade relationships make accidental orphan records less likely, although recipe ownership still needs application validation.

## Recommended remediation order

### Phase 1 — Protect money, stock, and branch boundaries

1. Add resource-scope checks to every server action and use case; test cross-branch denial.
2. Consolidate inventory deduction into one transactional service and add database idempotency/locking.
3. Decide and enforce insufficient-stock behavior.
4. Make payment/refund/order status/inventory changes atomic and retry-safe.
5. Correct online branch availability and dine-in modifier validation.
6. Fix delivery dispatch/settlement locking and payment classification.

### Phase 2 — Make reports reconcilable

1. Define canonical sale/payment/refund/COGS formulas.
2. Require paid/valid payment state consistently where revenue is reported.
3. Exclude or reverse refunds in shift and P&L queries.
4. Implement branch-level historical costing and unit conversion.
5. Standardize all date boundaries on `Africa/Cairo` and test near midnight/DST.

### Phase 3 — Complete operational controls

1. Add booking validation/capacity and status transitions.
2. Add stock counts, transfers, waste/restocking policies, and purchase approvals.
3. Add durable audit logs and separation of duties for finance approval.
4. Add payment gateway/refund reconciliation if online payments are required.
5. Add automated integration and concurrency tests.

## Minimum acceptance tests before production

- A branch user cannot read or mutate another branch's table, order, booking, shift, inventory, or settlement even when an object ID is supplied directly.
- Two simultaneous submissions with the same idempotency key produce one order and one inventory deduction.
- Two different orders cannot make the same stock insufficient without the configured policy deciding the result.
- A failed inventory deduction cannot leave an order in a later state without a compensating/retryable record.
- A pending online order is not counted as paid revenue.
- A refunded/cancelled order is removed from or reversed in shift/P&L totals.
- A driver cannot be assigned a second route while unavailable, and one order cannot be settled twice.
- A dine-in order rejects invalid modifier counts and modifiers not belonging to the product.
- Product availability is enforced consistently in POS, dine-in, and online channels.
- Cairo business-day reports agree across orders, shifts, P&L, and analytics around midnight and timezone offset changes.
- Historical COGS for an old sale does not change when a new purchase changes the current ingredient cost.
- Refund, discount, stock adjustment, recipe change, shift close, and audit operations leave an immutable actor/reason trail.

## Final assessment

The application has a solid feature surface and a promising layered structure, but it currently behaves more like a feature-complete prototype than a financially authoritative restaurant system. The highest priority is not adding more screens; it is making branch authorization, transaction boundaries, inventory costing, payment truth, and report definitions consistent across every channel.

