# Tripova Frontend

Next.js app for Tripova — an India-first travel discovery platform.

## Stack

- **Next.js** (React 19) with client components
- **TypeScript**
- **lucide-react** for icons
- **Inline styles** driven by theme tokens (no Tailwind on app screens)

## Setup

```bash
npm install
npm run dev
```

Opens on `http://localhost:3000`. The app expects a running backend at `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run test:e2e` | Playwright E2E tests |

## Structure

```
src/
├── app/                    # Next.js routes
│   ├── (app)/              # Authenticated app shell (layout + per-screen pages)
│   ├── about/              # Marketing / public pages
│   ├── destinations/       # SSR destination pages
│   ├── food/               # SSR food pages
│   └── welcome/            # Marketing landing
├── components/tripova/     # All app UI components
│   ├── screens/            # 16 screen files
│   ├── auth/               # Auth context + login/register
│   └── primitives/         # Shared UI (ScreenHeader, Card, Btn, etc.)
├── lib/                    # API client, types, hooks
└── data/                   # Theme tokens, translations
```

## Data

All screens fetch live data from the backend API. No hardcoded demo content. See `src/lib/types.ts` for API response types.

## Theme

Brand palette: Midnight Navy, Dusty Blue, Champagne Gold. Two theme objects (`LIGHT`/`DARK` in `src/data/theme.ts`) drive all colours via a `t` prop.
