# Interactive admin search placeholder

## Objective
Enhance the shared desktop admin header search field in `src/app/(admin)/admin/admin-shell.tsx`. Keep the existing controlled `search` value and navigation filtering behavior intact, but replace the static placeholder with an elegant Arabic typewriter that cycles through realistic search prompts.

## Required prompts
Use concise Arabic prompts such as:
- `البحث بالباركود`
- `البحث باسم المنتج`
- `البحث برقم الطلب`
- `البحث باسم العميل`
- `البحث في القوائم`

## Interaction and performance
- Animate only the `placeholder` attribute; never write into the user's value.
- Use a lightweight `useEffect`/timeout loop with cleanup; do not add dependencies or animation libraries.
- Type characters, pause briefly when a phrase is complete, delete characters, then advance.
- Pause the animation while the search input has text or focus, and resume cleanly when cleared/blurred if practical.
- Respect `prefers-reduced-motion`: show a stable first prompt and do not animate.
- Avoid timer leaks, stale closures, unnecessary renders, and hydration mismatch.
- Preserve existing search filtering through `setSearch` and `AdminNav searchQuery`.

## Visual direction
The existing MASA admin UI is a restrained Atlantic-blue system: white glassy header, #142644 text, muted #91A0B8 placeholder, rounded 16px search field, and Lucide Search icon. Keep it polished, subtle, RTL-safe, and readable. Do not change unrelated layout or navigation behavior.

## Scope
Modify only the shared admin shell and, if truly necessary, a small scoped CSS rule in `src/app/globals.css`. Do not touch the reference `custom-app-template/` folder or add assets.

## Validation
Run lint/type checks relevant to the changed files and report exactly which files were changed.
