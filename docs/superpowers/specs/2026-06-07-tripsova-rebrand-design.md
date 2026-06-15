# Tripsova — Production-Ready Completion (Design Spec)

**Date:** 2026-06-07
**Status:** Approved (user said "do it")
**Scope decided by user:** Everything (production-ready), decomposed into 4 tracks.
**Brand:** Tripsova. Taglines — "Discover through people." (brand) + "Powered by Travellers" (in-app community line).
**Hard constraint:** No Redis (use in-process TTL caching + in-memory rate limiting).

---

## 0. Roadmap (4 tracks, in order)

| # | Track | Summary |
|---|-------|---------|
| **T1** | Brand & Theme System + SEO quick-wins | New palette, fonts, logo, copy/metadata, robots/sitemap/manifest/icons. **(this spec)** |
| T2 | Frontend ↔ Backend wiring + SSR content pages | Extend try-API-then-fallback to all screens; add `/destinations/[slug]`, `/food/[slug]`, `/stories/[slug]` server routes for SEO. |
| T3 | Backend hardening | The 32 documented issues, blocking-first. |
| T4 | Deploy / Infra | nginx + TLS, in-process TTL caching, docker-compose (no Redis), CI. |

Each later track gets its own spec. **This document covers Track 1.**

---

## 1. Architecture facts (why the approach is low-risk)

- The entire `frontend/src/components/tripova/**` UI renders via **inline `style={{}}` objects** that read from a single JS theme object `t` (`LIGHT`/`DARK` in `src/data/theme.ts`). Editing those objects recolors every screen, badge, overlay, and the shell automatically.
- shadcn `ui/` primitives (button, dialog, input, etc.) read **CSS variables** from `src/app/globals.css`.
- Fonts are loaded in `src/app/layout.tsx` via `next/font` (currently Geist).
- Brand text ("TRIPOVA" / "POWERED BY TRAVELLERS" / Compass icon) is hardcoded in `app-shell.tsx`, `auth/login-screen.tsx`, `auth/register-screen.tsx`, and `badges/index.tsx` (`PoweredBy`).
- **Chosen approach:** central token update (theme.ts + globals.css) + fonts (layout.tsx) + logo/copy. **Rejected:** full Tailwind migration (huge diff) and CSS-var bridge (touches every screen prop).

> WARNING — Frontend `AGENTS.md`: "This is NOT the Next.js you know — read `node_modules/next/dist/docs/` before writing any code." Implementation MUST read the relevant Next 16 guides (next/font, Metadata API, file conventions: robots/sitemap/manifest/icon/opengraph-image) before coding.

---

## 2. Color tokens (map palette -> existing semantic keys)

Palette: Midnight Navy `#1B263B` · Dusty Blue `#6C8BA7` · Champagne Gold `#D4B483` · Off White `#FAF9F6` · Pearl Grey `#ECECEC` · Graphite `#2E2E2E`.

### LIGHT
| key | value | source |
|-----|-------|--------|
| bg | `#FAF9F6` | Off White |
| bg2 | `#ECECEC` | Pearl Grey |
| card | `#FFFFFF` | — |
| accent | `#1B263B` | Midnight Navy (primary) |
| secondary | `#6C8BA7` | Dusty Blue |
| gold | `#B08A45` | Champagne (darkened for legible text/icons on light) |
| goldFill | `#D4B483` | Champagne Gold (fills, icon-on-navy) |
| text | `#2E2E2E` | Graphite |
| heading | `#1B263B` | Navy |
| muted | `#6E7681` | cool grey (derived) |
| border | `#E4E2DC` | soft neutral (derived) |
| success | `#3F8F5B` | tuned green |
| warning | `#C8922E` | amber-gold |
| danger | `#C0492F` | refined terracotta |
| overlay | `rgba(27,38,59,0.05)` | navy-based |
| tag | `#EFEDE8` | pearl chip bg |
| teal | `#5E8295` | remapped to slate-blue |

### DARK (derived from navy)
| key | value |
|-----|-------|
| bg / bg2 / card | `#11161F` / `#161D29` / `#1C2533` |
| accent | `#8AA9C6` (lightened dusty blue) |
| secondary | `#6C8BA7` |
| gold / goldFill | `#D9B871` / `#E3C58A` |
| text / heading | `#E6E8EC` / `#F4F6F9` |
| muted / border | `#93A0B2` / `#2A3344` |
| success / warning / danger | `#5FB87C` / `#E0B25A` / `#E0775C` |
| overlay / tag / teal | `rgba(230,232,236,0.05)` / `#222C3B` / `#6FA0B5` |

`globals.css` shadcn variables (`--primary`, `--background`, `--ring`, etc.) updated to the same palette so `ui/` components and auth inputs match. `theme_color = #1B263B`, `background_color = #FAF9F6`.

---

## 3. Typography

- **DM Serif Display** (400 + 400 italic) -> headings: `SectionTitle` primitive, screen titles, brand hero.
- **Manrope** (variable 400-800) -> body/UI default (cascades to all inline-styled screens for free).
- Load via `next/font/google` in `layout.tsx`; expose `--font-sans` (Manrope) and `--font-serif` (DM Serif). Set `--font-heading: var(--font-serif)` in globals.css. Body uses Manrope; `SectionTitle` + screen headers use `var(--font-serif)`.

---

## 4. Logo

- New component `src/components/tripova/logo.tsx`:
  - `LogoMark({ size })` — inline SVG of the location-pin/teardrop containing a mountain silhouette + circular "moon" accent (echoes the provided logo), navy->blue gradient with champagne moon.
  - `Logo({ showTagline })` — `LogoMark` + "Tripsova" wordmark + optional "Discover through people." tagline.
- Replace usages: `app-shell.tsx` header logo box + wordmark/subline; `auth/login-screen.tsx` + `auth/register-screen.tsx` hero.
- **Recreated as SVG, not the JPEG** (raster has a navy background, won't scale/theme).
- Generate branded `app/icon.png`, `app/apple-icon.png`, favicon from the mark.

> **Update (2026-06-15) — shipped logo supersedes the teardrop concept above.**
> Per later client feedback the mark was redesigned and is now the implemented version:
> a **navy circular disc** with a **gold serif "T"**, an **airplane with a dotted/dashed
> swoosh orbit**, and the **TRIPSOVA** serif wordmark. The component API is unchanged
> (`LogoMark({ size })` + `Logo({ size, showTagline, color, taglineColor })` in
> `src/components/tripova/logo.tsx`); only the visual was reworked. The teardrop/mountain/moon
> description above is the original concept and is kept for history.

---

## 5. Copy / metadata

- `layout.tsx` `metadata`: `metadataBase`, title default `"Tripsova — Discover through people"`, template `"%s | Tripsova"`, 120-160-char description, keywords, `openGraph`, `twitter`, `icons`, `manifest`, `alternates.canonical`.
- Header wordmark `TRIPOVA -> Tripsova`; header subline -> "Discover through people.".
- Keep `PoweredBy` badge ("Powered by Travellers") as the in-app community line.
- Rename **user-facing display strings** Tripova -> Tripsova (app text, README hero). **Do NOT rename** infra identifiers in this pass: DB name `tripova`, package `name: "frontend"`, env keys, repo URLs (avoid breakage; later sweep).

---

## 6. SEO quick-wins (independent of palette/logo, bundled here)

- `app/robots.ts` (allow, declare host + sitemap).
- `app/sitemap.ts` (static: `/` for now; becomes dynamic in T2).
- `app/manifest.ts` (name, short_name, theme_color `#1B263B`, background `#FAF9F6`, icons, display standalone).
- `Organization` JSON-LD `<script type="application/ld+json">` in `layout.tsx`.
- `app/opengraph-image.tsx` (navy bg, logo, tagline) for OG + Twitter.
- `next.config.ts`: set `metadataBase` source + `headers()` (basic security + cache).
- `src/components/tripova/icon.tsx`: replace `(Lucide as any)[name]` whole-namespace lookup with a curated map of used icons (tree-shaking / bundle size).
- Remove unused `public/{file,globe,next,vercel,window}.svg`.

---

## 7. Out of scope for T1
- SSR content routes + dynamic sitemap (T2).
- Any backend change (T2-T4).
- DB/package/env identifier renames.

---

## 8. Acceptance / verification
- `npm run build` (or `next build`) succeeds with no new type/lint errors.
- App renders in the new palette (light default), dark mode works, DM Serif headings + Manrope body visible.
- Tripsova logo + wordmark + tagline show in header, login, register; no "Tripova"/Compass-logo remnants in user-facing UI.
- `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, branded favicon/icons, and OG image resolve.
- `view-source` shows branded `<title>`, meta description, OG tags, and Organization JSON-LD.
- Run the app and visually confirm against the theme image before marking T1 done.
