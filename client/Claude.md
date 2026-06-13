# CareerVault — Client Engineering & Design Rules (React)

Binding for all work in `client/`. Goal: a highly professional, distinctly non-AI, consistent UI across ~25 screens and 6 roles, built with maximal reuse. **No AI slop, no over-engineering.** When unsure, prefer the `/ui-ux-pro-max` skill for UI work.

> Sibling rule file: [`../server/Claude.md`](../server/Claude.md) (NestJS). Product specs live in [`../documentation/`](../documentation/). Cross-doc contradictions are resolved as **R1–R9** in the approved plan (see the server rules) — honor those resolutions in the UI (e.g. document statuses, role set).

## Stack (do not change without updating this file)
- React 19 · Vite 7 · TypeScript 5 (strict) · Tailwind 4 (CSS-first, `@theme` in `globals.css`)
- **shadcn/ui** (Radix) primitives, themed to our tokens — the only component primitive source
- **React Hook Form + Zod** for all forms (Formik/Yup are removed — do not reintroduce)
- **Redux Toolkit Query** for all server state (`APISlice` + per-feature `injectEndpoints`)
- React Router 7 (`createBrowserRouter`) · **Lucide React** icons only
- Talks to the API at **:9900** (`config/APIEndpoints.ts`); dev server on :5173.

## Design system (LOCKED — minimal base + subtle 3D depth)
Style: Swiss minimalism with **tasteful light-3D elevation** — soft layered shadows, gentle depth, crisp light surfaces. **Banned:** AI purple/pink gradients, neon, glow, heavy skeuomorphism, emojis as icons.

All tokens live as CSS variables + Tailwind `@theme` in `src/styles/globals.css`. **Never use raw hex or color utilities like `bg-blue-600`** — use semantic token classes (`bg-primary`, `text-verified`, `bg-pending-soft`).

- **Primary:** trust navy `#1E3A8A`
- **Status (FIXED semantics — never remap):** Verified/Anchored = emerald `#059669` · Pending/Draft = amber `#D97706` · Revoked/Failed = red `#DC2626` · Expired = gray `#6B7280`. Each has a `-soft` background variant. Status is always **icon + text + color**, never color alone (accessibility).
- **Anchor accent (blockchain badge):** gold `#B45309`
- **Surfaces:** bg `#F8FAFC` · surface `#FFFFFF` · surface-2 `#F1F5F9`
- **Text:** `#0F172A` · muted `#64748B` · subtle `#94A3B8`
- **Typography:** Plus Jakarta Sans (400/500/600/700/800), body line-height 1.5, **tabular numerals (`tnum`)** for hashes/amounts/dates.
- **Spacing:** 8pt grid only (`p-2/4/6/8/12/16/24`); no arbitrary `p-[13px]`.
- **Radius:** cards `rounded-xl` (12px) · inputs/buttons `rounded-lg` (8px) · badges `rounded-full`.
- **Elevation tokens (the 3D depth):** `shadow-soft` (resting cards), `shadow-raised` (hover/active, interactive lift), `shadow-overlay` (modals/popovers). Use elevation for hierarchy; keep fills flat. No more than one elevation step on hover.
- **Motion:** 150–300ms, ease-out enter / ease-in exit; animate transform + opacity only; respect `prefers-reduced-motion`.
- **Icons:** Lucide only, stroke 2px, sizes 14/16/20/24.

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
  routes.tsx · App.tsx · components/ImplementAuth.tsx (real auth from store)
```

## Reusable module catalog (build once, reuse everywhere — search before writing new)
Themed **Alert/Toast** system · `StatusBadge` (fixed semantics) · `HashDisplay` (truncate + `tnum` + copy) · `lib/format.ts` (local-timezone date/time, relative time, currency, number) · `EmptyState` · `PageHeader` · `StatCard` · `DataTable` · `ConfirmDialog` · `useApiError` (maps RTK Query errors → themed toast). Any "small" conversion (timezone, currency, hash, status label) MUST be a shared function, not inlined.

## Forms
React Hook Form + `zodResolver`. One Zod schema per form in the feature's `schema.ts`. Bind shadcn `Form`/`FormField`. No Formik.

## Data layer
`APISlice` (base, `credentials:"include"`, auth header from store, baseUrl from `APIEndpoints`). Each feature injects endpoints in `features/<feature>/api.ts` with `tagTypes` for cache invalidation. Types come from generated `lib/api-types.ts` — don't hand-duplicate server types.

## Routing & RBAC
`ImplementAuth` reads real auth/role state from the store (no hardcoded `true`). Role-based guards route each user to their portal (Admin/Manager/HR/Holder/Recruiter); Verifier pages are public. Lazy-load pages.

## Coding discipline (hard caps)
- Components ≤ 150 lines · Pages ≤ 200 · Hooks ≤ 80. Over cap → split.
- Filename matches export · PascalCase components · `useCamelCase` hooks · boolean props use `is/has/can/should`.
- No `any` (use `unknown` + narrow) · no raw hex/color utilities in components · no commented-out code · no barrel re-exports except `components/ui/index.ts` · no prop-drilling > 2 levels · no `useEffect` for already-rendered data · no premature abstraction (3 similar JSX blocks beat one over-flexible primitive).
- Comments explain **why**, never **what**.

## Accessibility
WCAG AA (AAA where feasible). Visible focus states, keyboard nav, status conveyed by icon+text+color, `prefers-reduced-motion` honored, semantic HTML, labelled inputs.

## Don't
Use emojis as structural icons · introduce a new color/status semantic · use Formik or a second form lib · add a state library beyond Redux Toolkit · use raw hex/`bg-blue-600` · build a primitive that shadcn already provides · exceed the size caps.
