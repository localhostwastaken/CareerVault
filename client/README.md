# CareerVault — Web Client

React front end for CareerVault: cryptographically signed, blockchain-anchored career documents.
Six personas (Holder, Manager, HR, Org Admin, Recruiter, and anonymous Verifier) share one app.

> **Engineering and design rules live in [`Claude.md`](./Claude.md).** Read that before contributing —
> it is the binding spec for the design system, state handling, accessibility floor and size caps.
> This file only covers getting the app running.

## Stack

React 19 · Vite 7 · TypeScript 5 (strict) · Tailwind 4 (CSS-first `@theme`) · shadcn/ui on Radix ·
Redux Toolkit Query · React Hook Form + Zod · React Router 7 · Lucide icons · IBM Plex.

## Running locally

```bash
npm install
npm run dev        # http://localhost:5173
```

The client talks to the NestJS API on **http://localhost:9900** (see `src/config/APIEndpoints.ts`).
Start it from `../server`:

```bash
cd ../server && npm run start:dev
```

Copy `.env.example` to `.env` if you need to point at a different API host.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | `tsc -b && vite build` — must pass clean before any PR |
| `npm run lint` | ESLint over the whole project |
| `npm run preview` | Serve the production build locally |

## Project layout

```
src/
  styles/globals.css      # design tokens (@theme), fonts, spacing rhythm, print styles
  components/ui/          # shadcn primitives, themed to our tokens
  components/shared/      # cross-feature reusables (QueryBoundary, Skeletons, ErrorState, …)
  features/<feature>/     # api.ts · schema.ts · types.ts · components/
  pages/<Page>/           # thin composition of features + layout
  layouts/                # portal shell (per-role nav) and public shell
  hooks/ · lib/ · apis/ · store.ts · routes.tsx
```

## Conventions worth knowing up front

- **Every data screen renders four states** — loading (skeleton), error (with retry), empty, populated.
  Wrap RTK Query results in `QueryBoundary` rather than hand-rolling `isLoading &&` chains.
- **Use the semantic type and spacing scales** (`text-h2`, `text-body`, `gap-5`), never `text-sm` or
  ad-hoc pixel values.
- **No raw hex or Tailwind colour literals** in components — only semantic tokens.
- **Verify in a browser, don't eyeball.** Layout, spacing and responsive claims are measured; see the
  tooling section in `Claude.md`.
