# POS Reference Evaluation — Round 1

**Verdict: NEEDS REVISION**

## Scope and evidence

- Reference image: `C:\Users\m.farag\Downloads\Gemini_Generated_Image_jzshstjzshstjzsh.jpg` (2048×1152).
- Live page inspected: `http://localhost:3000/pos`.
- Live viewport inspected: 1920×1009.
- Staged presentation files inspected: `src/app/(pos)/pos/pos-client.tsx`, `pos-catalog.tsx`, `payment-modal.tsx`, `payment-panel.tsx`, and `pos-ui.tsx`.
- The requested brief at `.pos-design-session/brief.md` was not present in the current checkout, so the supplied image and the stated visual requirements were used as the evaluation baseline.
- `npm.cmd exec -- tsc --noEmit` passed.
- `git diff --cached --check` passed.
- The route returned HTTP 200 and rendered the authenticated POS shell.

## Summary

The implementation has the right overall composition: RTL Arabic POS, a 112px desktop header, a left cart panel occupying approximately 25% of the width, a five-column catalog, pale neutral page surfaces, white cards, Cairo typography, and cobalt primary actions. The cart/catalog proportions are close to the reference and the main payment action is correctly sized at 76px.

It is not yet reference-faithful because the category styling is visibly broken in the live page, the header icon/content details do not match, and the live catalog data/images are materially different from the supplied reference. These should be fixed before calling the redesign complete.

## Priority findings

### P0 — Active and inactive category colors are not applied

In the live page, all category buttons have a white background. The active `الكل` button also has white text, making its label and icon effectively invisible. The reference requires:

- active `الكل`: solid cobalt blue, white icon/text;
- inactive categories: pale blue/lavender surface;
- all category buttons: visible border and consistent icon/text contrast.

The DOM contains the intended classes (`bg-[#2D61C9]` and `bg-[#E9EEFC]`), but `posButton` also contains `bg-white` in `src/app/(pos)/pos/pos-ui.tsx:16`. The generated utility order leaves `bg-white` winning in the browser. This is a functional visual defect, not merely a minor color variance.

**Recommended fix:** make the shared button token composable without a competing background utility, or apply explicit category variants with deterministic CSS precedence. Verify the computed backgrounds after the fix, not only the class strings.

### P1 — Header identity icon does not match the reference

The reference header uses a dark navy rounded square containing a white fork-and-knife/restaurant mark. The live page uses the `Store` icon in `pos-client.tsx:245`, which reads as a shop/storefront. The size and navy container are close, but the symbol is visibly different and changes the brand impression.

**Recommended fix:** use the project’s closest restaurant/cutlery icon or a small approved local asset while preserving the 64px desktop container and 18px radius.

### P1 — Header date/time presentation differs from the reference

The structure is correct (theme control, divider, date/time, bell/history, print, user selector), and the measured desktop header is 112px high. However, the live page uses the browser’s `ar-EG` localized date with Arabic numerals and a different weekday/month ordering, while the reference shows the compact two-line composition `السبت 24 مايو 2025` and `10:42 ص` with western numerals. This is visible in the top-left utility cluster.

**Recommended fix:** preserve the dynamic clock but format it to the reference’s exact two-line order, spacing, and numeral policy. Do not hard-code the date.

### P1 — Catalog content and product imagery do not match the supplied design

The reference shows the specific Arabic café product set and clean coffee/dessert/drink imagery. The live page currently shows a different database catalog, including a bagel, soup, popcorn, pizza, doughnuts, and other unrelated assets. The product names and prices also differ materially from the reference.

This cannot be solved with CSS alone. If exact visual matching is required, the seed/catalog data and product image assets must be aligned with the reference or the design must explicitly be treated as a layout-only reference.

**Recommended fix:** confirm whether the reference product set is authoritative. If yes, create/import the matching product records and approved local image assets without changing POS calculations or order behavior.

### P2 — Product cards are slightly too tall/dense for the reference frame

The live first-row cards measured approximately 263px wide × 278px high at 1920px viewport width. The reference cards are visually closer to a compact ~256px-high rhythm at 2048px, with a tighter image/title/price vertical stack. The five-column count and horizontal spacing are correct.

**Recommended fix:** reduce card vertical padding or image block height only after the category fix, then compare at both 1920px and 2048px widths. Keep the 42px circular plus control.

### P2 — Visible secondary surfaces still use mixed neutral/utility tones

The main shell is consistently navy/cobalt/pale-blue, but the live DOM/source still contains zinc, emerald, amber, and rose surfaces in post-sale, floor-plan, table, and status states. These may be semantically useful status colors, but they diverge from the supplied monochrome blue treatment when those dialogs/states are visible.

**Recommended fix:** retain semantic error/success colors where they communicate state, but normalize neutral dialog controls, borders, text, and surfaces to the reference navy/cobalt/pale-blue tokens. Evaluate each dialog in its open state.

## Areas that match well

- Cairo is correctly loaded and is the computed font on the live POS page (`src/app/layout.tsx` and `src/app/globals.css`).
- Desktop header height is 112px, matching the reference composition.
- Cart width is approximately 476px of 1920px (about 24.8%), close to the reference’s roughly quarter-width cart.
- Search field height is 54px, with the input itself vertically centered at 44px.
- Category control height is 74px, matching the reference target.
- Catalog renders five product columns at the inspected desktop width.
- Product cards use white surfaces, cool gray borders, rounded corners, navy text, and cobalt circular add controls.
- Main payment action is 76px high and uses the intended cobalt family.
- TypeScript and staged whitespace checks pass.
- The accessible tree exposes search, category filters, product buttons, cart controls, receipt history, printing, user menu, and payment controls, indicating the visual work did not remove the primary interaction targets.

## Functionality preservation assessment

No source-level business or calculation changes were observed in the inspected presentation diff. The live accessibility tree still exposes product selection buttons, category filters, search, order type controls, notes/discount controls, receipt history, printing, and disabled payment for an empty cart. This is a positive signal, but a complete behavior pass should still test adding a product, changing quantity, applying a note/discount, opening payment, and completing a non-destructive test order with test data.

## Acceptance criteria for the next pass

1. Computed background for active `الكل` is cobalt and its text/icon are white.
2. Computed backgrounds for inactive categories are pale blue/lavender, not white.
3. Header mark is a restaurant/cutlery mark matching the reference silhouette.
4. Date/time follows the reference two-line layout while remaining dynamic.
5. Product data/assets are either aligned to the reference or explicitly accepted as live-database content.
6. Card height and vertical rhythm are tuned at 1920px and 2048px desktop widths.
7. Open and inspect payment/product/table/post-sale dialogs for the same visual token system.
8. Re-run TypeScript, staged diff checks, and a live interaction smoke test after the fixes.
