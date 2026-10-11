# POS reference fidelity refinement

## Objective

Refine the existing POS redesign so it matches the supplied reference image more faithfully. The user specifically wants the same colors, Arabic font treatment, control dimensions, button sizes, spacing, and visual proportions as the reference.

Reference: `C:\Users\m.farag\Downloads\Gemini_Generated_Image_jzshstjzshstjzsh.jpg`

Repository: `D:\MASA R-Mangment\Masa`

## Preserve functionality

- Do not change POS business logic, pricing, payments, inventory, table flows, receipt/KOT printing, offline sync, authorization, server actions, hooks, or database behavior.
- Keep existing callbacks, state names, accessibility labels, product selection, search, categories, modifiers, cart quantity changes, order types, shifts, tables, settlement, receipts, and mobile cart behavior.
- Only modify presentation classes/markup and the minimal product image presentation contract already introduced for the catalog.

## Reference measurements and composition

The supplied image is a wide 2048x1152 RTL desktop POS mockup. Reproduce its proportions:

- Page background: very light blue-gray/white, approximately `#F7F8FC`.
- Header is approximately 110px tall, with generous horizontal padding.
- Main content is a two-panel layout with a narrow left cart panel around 24–25% width and a wide right catalog panel around 75–76% width.
- Panels have white backgrounds, very thin cool-gray borders, approximately 14–16px corner radii, and almost imperceptible shadows.
- Main panel gap is approximately 14–16px; outer page padding is approximately 4–8px at a 2048px desktop width.
- The catalog has a wide search field around 54px high, followed by category buttons around 74px high, followed by product cards.
- Product grid is five columns at standard desktop POS widths, with about 16px gaps. Cards are around 255px tall in the reference, with an image zone, centered/right-aligned Arabic product name, price line, and a circular plus button.
- The cart panel has a prominent heading, a two-option segmented control around 56px tall, a large empty state centered in the available area, then two total rows and a large full-width payment button around 76px tall.
- Header controls are touch-friendly square buttons around 64–68px, with rounded corners around 16px. Date/time block and cashier block should have the same compact proportions.

## Exact visual direction

- Replace the previous purple/violet accent with the reference’s royal/cobalt blue. Use one consistent primary accent across active tabs, category “الكل”, product plus buttons, main payment buttons, selected states, and modal CTA buttons. Target a blue close to `#2D61C9`/`#2B5FCB`, not `#5A5BE5`.
- Use deep navy for major text and branding, close to `#142644` or `#122548`.
- Use pale blue-lavender surfaces for inactive category buttons and inactive order type, close to `#E9EEFC`/`#EEF2FD`.
- Use cool gray-blue borders around `#DCE3EF` and extremely soft blue-gray shadows.
- Preserve the existing Cairo font from `src/app/layout.tsx`; it is the correct Arabic-first typeface. Do not add an external font or switch to a generic font. Make heading/button weights and sizes resemble the reference: compact bold Arabic labels, not oversized rounded display text.
- Use consistent button heights and radii: header utility controls approximately 64px, category controls approximately 74px, order-type segmented control approximately 56px, product plus circles approximately 42px, main payment approximately 76px.
- Use subtle 1px outlines, not strong shadows or saturated gradients.
- Prices should use the reference’s dark navy/blue-green appearance where appropriate, while the payable amount and primary actions remain cobalt blue.
- Keep the reference’s clean white image backgrounds and rounded product cards. Use `product.imageUrl` when present; maintain a quiet fallback when absent.

## Files to refine

- `src/app/(pos)/pos/pos-client.tsx`
- `src/app/(pos)/pos/pos-catalog.tsx`
- `src/app/(pos)/pos/pos-cart.tsx`
- `src/app/(pos)/pos/pos-ui.tsx`
- `src/app/(pos)/pos/payment-modal.tsx`
- `src/app/(pos)/pos/payment-panel.tsx`
- `src/app/(pos)/pos/shift-panel.tsx`
- `src/app/(pos)/pos/product-picker.tsx`
- `src/app/(pos)/pos/table-picker-modal.tsx`
- `src/app/(pos)/pos/table-tab-modal.tsx`
- `src/app/(pos)/pos/pos-floor-plan.tsx`

## Implementation notes

- Prefer centralizing the updated visual tokens in `pos-ui.tsx` and reusing them.
- Remove remaining old purple (`#5a5be5`), black/zinc-heavy UI, and inconsistent component-local styling from the POS presentation where it conflicts with the reference. Keep print styles untouched.
- Use responsive fallbacks below desktop, but ensure the normal `lg`/desktop POS layout presents five cards whenever the catalog has enough width.
- Do not make buttons visually larger or smaller just for mobile if that changes the reference desktop proportions; use responsive classes only when necessary for usability.

## Verification

- Run `npm.cmd exec -- tsc --noEmit`.
- Run `git diff --cached --check` after staging the changes.
- If the local authenticated POS route is available, inspect desktop and mobile rendering. Verify the primary product add, cart, payment, table, and dialog interactions remain accessible.
