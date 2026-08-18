# CareerVault — Client Engineering & Design Rules (React)

Binding for all work in `client/`. Goal: a highly professional, distinctly non-AI, consistent UI across ~25 screens and 6 roles, built with maximal reuse. **No AI slop, no over-engineering.**

## Tooling for UI work (optional — skip cleanly if not installed)

Two Claude Code skills make this work faster. Both are plugins, so **availability varies per
machine**; nothing here is required to contribute. Invoke by name — never hard-code an install path,
since it differs across plugin/global/project installs.

| Skill | Use it for | Invoke |
|---|---|---|
| `ui-ux-pro-max` | Style/colour/typography/chart/UX lookups grounded in a local database rather than taste | `/ui-ux-pro-max` or the Skill tool |
| `playwright-skill` | Driving the running app: screenshots, responsive checks, measuring computed spacing, login flows | `/playwright-skill` or the Skill tool |

**When applying `ui-ux-pro-max` output to this repo, override it on two points:** its default icon
library is Phosphor (we are **Lucide-only**), and its "Common Rules"/"Pre-Delivery" checklists are
scoped to native app UI (iOS/Android/RN/Flutter) — they do not apply to this desktop-web client. Its
`--domain ux` and `--domain chart` results *do* apply and are worth following.

**Verify in a real browser, not by eye.** `playwright-skill` auto-detects the dev server, writes
throwaway scripts to `/tmp`, and runs them. Use it to check the four states, the four breakpoints,
and the spacing rhythm below. If it isn't installed, any Playwright/Puppeteer setup works — the
point is that layout and spacing claims must be *measured*.

> Sibling rule file: [`../server/Claude.md`](../server/Claude.md) (NestJS). Product specs live in [`../documentation/`](../documentation/). Cross-doc contradictions are resolved as **R1–R9** in the approved plan (see the server rules) — honor those resolutions in the UI (e.g. document statuses, role set).

## Stack (do not change without updating this file)
- React 19 · Vite 7 · TypeScript 5 (strict) · Tailwind 4 (CSS-first, `@theme` in `globals.css`)
- **shadcn/ui** (Radix) primitives, themed to our tokens — the only component primitive source
- **React Hook Form + Zod** for all forms (Formik/Yup are removed — do not reintroduce)
- **Redux Toolkit Query** for all server state (`APISlice` + per-feature `injectEndpoints`)
- React Router 7 (`createBrowserRouter`) · **Lucide React** icons only
- Talks to the API at **:9900** (`config/APIEndpoints.ts`); dev server on :5173.

## Design system — "Ledger" (instrument of record)
Ink on paper. **Hairline rules instead of shadows.** Every identifier in a real mono face. The UI
itself should read as an authentic document. Derived from the `ui-ux-pro-max` skill's **E-Ink/Paper**
× **Swiss Modernism 2.0** styles (both rated WCAG AAA) with the **IBM Plex** superfamily.
**Banned:** gradients, neon, glow, skeuomorphism, emojis as icons, resting drop-shadows.

**Light theme only** — the paper aesthetic inverts poorly, and one theme keeps every contrast pair
verifiable. Do not add a dark mode without redoing the full contrast pass.

All tokens are CSS variables + Tailwind `@theme` in `src/styles/globals.css`. **Never use raw hex or
Tailwind colour literals like `bg-blue-600`** — use the semantic utilities (`bg-primary`,
`text-verified`, `bg-pending-soft`, `border-rule-strong`, `text-seal`).

- **Primary action = ink `#1A1A1A`, not a hue.** Every warm and green hue is taken by fixed status
  semantics, so a coloured primary button reads as "verified". Do not reintroduce a coloured primary.
- **Single accent — seal navy `#1B3A5C`** (`text-seal`): links, active nav, focus ring, brand mark.
  Swiss allows exactly one accent; do not add a second.
- **Status (FIXED semantics — never remap):** Verified `#15803D` · Pending `#A84D07` ·
  Revoked `#B4231F` · Expired `#57534E` · Anchor gold `#8A5A16`. Each has a `-soft` ground.
  Status is always **icon + text + colour**, never colour alone.
- **Surfaces:** paper `#FDFBF7` · panel `#FFFFFF` · surface-2 `#F4F2EC` (inset wells).
- **Text:** ink `#1A1A1A` · muted `#4A4A4A` · subtle `#6B6B6B`.
- **Rules:** `border` `#E0E0E0` decorative hairlines · `rule-strong` `#C9C6BF` emphasis ·
  **`input` `#8C8880` for control boundaries** — these must clear 3:1 (WCAG 1.4.11). Never style a
  form control's boundary with the decorative hairline.
- **Typography — IBM Plex superfamily.** `font-sans` Plex Sans (UI/body) · `font-serif` Plex Serif
  (**ceremony only**: landing hero, page `h1`, verdict banner) · `font-mono` Plex Mono
  (**every** hash, token, DID, entity ID, IP). Always pair `font-mono` with `tnum`.
- **Type scale — use the semantic sizes, never `text-sm`/`text-lg` for structure:**
  `text-display` 56 · `text-h1` 24 · `text-h2` 18 · `text-h3` 15 · `text-body` 14 ·
  `text-body-lg` 16 · `text-label` 13 · `text-micro` 11. Field labels and table heads use the
  `.label-micro` utility. **A section `h2` must never be smaller than body text.**
- **Spacing — one rhythm, 4pt sub-grid on an 8pt base.** Allowed gaps: 4 · 6 · 8 · 12 · 16 · 20 ·
  24 · 32 · 40 · 48. No arbitrary `p-[13px]`.

  | Relationship | Value | Class |
  |---|---|---|
  | icon ↔ text, inline pairs | 6px | `gap-1.5` |
  | **label → control**, control → help/error | **8px** | `gap-2` |
  | list rows, inline button groups | 12px | `gap-3` |
  | card grids | 16px | `gap-4` |
  | **field → field** in a form | **20px** | `gap-5` |
  | block → block inside a card | 24px | `gap-6` |
  | section → section on a page | 32px | `gap-8` |

  Padding: `p-6` standard card · `p-5` compact/stat card · `p-4` list row. Page shell `px-4 lg:px-8`,
  `py-6 lg:py-8`.

  **Prefer flex `gap-*` over `space-y-*`.** Gaps measure between border boxes; `space-y` margins are
  measured from a child's own box, so a child whose box overlaps its leading silently shrinks the
  gap. That bug shipped once: Radix `Label` is `display:inline` by default, which collapsed every
  `space-y-2` label→control gap to **2px** while the same markup with a `block` label rendered 12px.
  `Label` is now `block leading-none` and `FormItem` uses `flex flex-col gap-2`. Do not revert either.
- **Radius:** 4px everywhere (`rounded-lg`/`rounded-xl` both resolve to 4px) · badges `rounded-full`.
- **Elevation — resting surfaces are flat.** `shadow-soft` is `none` by design. `shadow-overlay` is
  for dialogs, dropdowns and toasts only. Convey hierarchy with rules and contrast, never a lift;
  hover changes colour/border, never geometry (no layout shift).
- **Layering — use the scale, never arbitrary z:** `z-10` sticky headers · `z-20` scrim ·
  `z-30` drawer · `z-40` dropdown/popover · `z-50` dialog + toast.
- **Motion:** 150–300ms, ease-out enter / ease-in exit; transform + opacity only; infinite animation
  for loaders only; respect `prefers-reduced-motion`.
- **Icons:** Lucide only, stroke 2px, sizes 14/16/20/24.

### State handling is mandatory, not optional
Every screen that reads server data must render **four** states. Wrap RTK Query results in
`QueryBoundary` — do not hand-roll `isLoading &&` chains, and never let a failed request fall through
to an empty state.
- **Loading** → a shape-matched skeleton from `components/shared/Skeletons.tsx`. Never a bare
  "Loading…" paragraph.
- **Error** → `ErrorState` with a working retry. `isError` must be handled.
- **Empty** → `EmptyState` with a next action.
- **Success** → the content, and for mutations an `Act III` moment (`SuccessPanel`), not just a toast.

### Accessibility floor
WCAG AA minimum, AAA for body text. Visible focus on every interactive element (use the `.focus-ring`
utility or the primitives, which already carry it). Errors announced via `role="alert"`. Forms
validate on blur (`mode: 'onBlur'`), labels are real `<FormLabel>`s — never placeholder-only. Tables
scroll or fall back to cards on narrow viewports. Verify at 375/768/1024/1440.

### Before you call a UI change done
1. `npm run build` and `npm run lint` clean.
2. All four states render (loading / error / empty / populated) — force the error with devtools offline.
3. No horizontal overflow at 375/768/1024/1440: compare `scrollWidth` to `clientWidth`, don't eyeball it.
4. Every gap lands on the spacing ladder above — measure with `playwright-skill`, don't eyeball it.
5. Keyboard-only pass: every interactive element reachable with a visible focus ring.

**A caution learned the hard way:** `cn()` runs `tailwind-merge`, which only knows Tailwind's stock
scales. Our custom `text-*` sizes are registered in `lib/utils.ts` via `extendTailwindMerge` — before
that, `text-body-lg` was classified as a text *colour* and silently deleted `text-primary-foreground`,
producing ink-on-ink invisible button labels. **Register any new `--text-*` token there too.**

## Folder layout (feature-first)
```
src/
  styles/globals.css        # @theme tokens, fonts, reduced-motion
  config/APIEndpoints.ts     # baseUrl (:9900)
  store.ts · apis/APISlice.ts
  lib/                       # format.ts (date/timezone/currency), api-types.ts (generated), utils
  components/ui/             # shadcn primitives (themed) — do not hand-roll equivalents
  components/shared/         # cross-feature reusables (see catalog)
  features/<feature>/        # api.ts (injectEndpoints), hooks.ts, schema.ts (zod), types.ts, components/
  pages/<Page>/<Page>.tsx    # compose features + layout (thin)
  layouts/                   # per-role portal shells + public layout
  routes.tsx · App.tsx · components/RequireAuth.tsx + GuestOnly.tsx (route guards)
```

## Reusable module catalog (build once, reuse everywhere — search before writing new)
**State:** `QueryBoundary` (loading/error/empty/content for any RTK Query result) · `Skeletons.tsx`
(`ListSkeleton`, `StatCardsSkeleton`, `TableSkeleton`, `DetailSkeleton`, `CardGridSkeleton`) ·
`ErrorState` · `EmptyState` · `SuccessPanel` (Act III) · `AppErrorBoundary` + `RouteErrorBoundary`.
**Composition:** `PageHeader` (the page's only `h1`) · `Section` (`h2` blocks) · `StatCard` ·
`Stepper` (progress rails, incl. terminal states) · `ConfirmDialog` · `FilterBar` + `useListFilters`
(URL-synced search/status/sort) · `useDocumentTitle`.
**Data display:** `StatusBadge` (fixed semantics) · `HashDisplay` (mono + `tnum` + copy) ·
`CopyButton` · `lib/format.ts` (local-timezone date/time, relative time, currency, number, hash) ·
`lib/notify.ts` (`notify`, `toastApiError`, `apiErrorMessage`).

Any "small" conversion (timezone, currency, hash, status label) MUST be a shared function, not
inlined. `AuditLog` once carried its own `en-GB`-hardcoded `formatDate` — don't do that again.

## Forms
React Hook Form + `zodResolver`. One Zod schema per form in the feature's `schema.ts`. Bind shadcn `Form`/`FormField`. No Formik.

## Data layer
`APISlice` (base, `credentials:"include"`, auth header from store, baseUrl from `APIEndpoints`). Each feature injects endpoints in `features/<feature>/api.ts` with `tagTypes` for cache invalidation. Types come from generated `lib/api-types.ts` — don't hand-duplicate server types.

## Routing & RBAC
Auth state is a **tri-state**: `auth.status` is `'restoring' | 'authenticated' | 'anonymous'`.
The access token is memory-only, so a cold load must call `/auth/refresh` before it knows anything —
`bootstrapSession` (`apis/APISlice.ts`) fires that once from `main.tsx`, *before* React mounts.
**Never treat "no token" as "signed out"**: that is what flashed the sign-in screen on every reload.
`RequireAuth` renders `LoadingScreen` while `restoring` and is the ONLY component that sends a
visitor to `/auth/login`; `GuestOnly` wraps `/auth/login` + `/auth/register` and is the ONLY owner of
the post-authentication redirect (the pages themselves must not navigate). `refreshSession` in
`APISlice.ts` is the single, in-flight-shared implementation of the refresh call — do not add a
second one. Role-based guards (`RoleGate`, `RoleHomeRedirect`) run inside `RequireAuth`, so they
never see a half-restored persona. Verifier pages are public. Lazy-load pages.

## Coding discipline (hard caps)
- Components ≤ 150 lines · Pages ≤ 200 · Hooks ≤ 80. Over cap → split.
- Filename matches export · PascalCase components · `useCamelCase` hooks · boolean props use `is/has/can/should`.
- No `any` (use `unknown` + narrow) · no raw hex/color utilities in components · no commented-out code · no barrel re-exports except `components/ui/index.ts` · no prop-drilling > 2 levels · no `useEffect` for already-rendered data · no premature abstraction (3 similar JSX blocks beat one over-flexible primitive).
- Comments explain **why**, never **what**.

## Accessibility
WCAG AA (AAA where feasible). Visible focus states, keyboard nav, status conveyed by icon+text+color, `prefers-reduced-motion` honored, semantic HTML, labelled inputs.

## Don't
Use emojis as structural icons · introduce a new color/status semantic · use Formik or a second form lib · add a state library beyond Redux Toolkit · use raw hex/`bg-blue-600` · build a primitive that shadcn already provides · exceed the size caps.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
