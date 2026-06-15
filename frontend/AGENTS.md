<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Tripova Frontend — Coding Guide

## Stack

* Next.js (forked — see note above), React client components (`"use client"`), TypeScript.
* `lucide-react` for icons, accessed dynamically by name string via the shared `Icon` component.
* No CSS modules or Tailwind. Components are styled with **inline `style` objects** driven by theme tokens.

## Theme tokens (`t`)

Every visual component takes a `t: Theme` prop (imported from `@/data`) and reads colours/tokens
off it — `t.card`, `t.border`, `t.text`, `t.muted`, `t.accent`, `t.gold`, `t.goldFill`, `t.heading`,
`t.secondary`, `t.overlay`, etc. Never hardcode hex colours; always go through `t`. Thread `t` down
to child components rather than re-deriving it.

## Branding

* The brand mark lives in `src/components/tripova/logo.tsx` (`LogoMark` + `Logo`): navy disc, gold
  serif "T", dashed flight-path orbit, airplane silhouette, `TRIPSOVA` serif wordmark.
* Serif type uses the CSS var `var(--font-dm-serif), Georgia, serif`.
* Feature screens open with the shared `ScreenHeader` primitive (gold dash eyebrow + serif title +
  subtitle) from `src/components/tripova/primitives/index.tsx`. Reuse it for a consistent editorial
  identity instead of ad-hoc headings. `SectionTitle` is the in-page section header.

## Data — real APIs only

* **No demo / hardcoded / fabricated data.** All screens read from the live backend via the `api`
  helper (`api.get<T>(path)` / `api.post`). List endpoints return `PaginatedList<T>` (`{ items: T[] }`);
  some (e.g. food) return a plain array — check `src/lib/types.ts`.
* Destinations come through the `useDestinations(limit?)` hook (`src/lib/destinations.ts`) →
  `{ destinations, loading, error, reload }`.
* Every section must handle loading, error (with retry), and empty states honestly. Sections that
  have no data should self-hide or show a clear empty message — never invent placeholder content.

## Home feed order

The home feed sections render in this client-specified order:
**CityFeed → Trip Pulse → TripPod → PureFind**. Preserve this order unless the client changes it.

## Workflow

* Run `npx tsc --noEmit -p tsconfig.json` after edits; keep it clean.
* Match the surrounding inline-style idiom and comment density when adding components.
