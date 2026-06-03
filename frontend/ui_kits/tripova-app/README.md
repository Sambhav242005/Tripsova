# TRIPOVA — Mobile App UI Kit

A high-fidelity, interactive recreation of the full TRIPOVA app (all 9 screens), built as modular React/JSX loaded via in-browser Babel. Open **`index.html`** for the complete click-through.

## Run it
Open `index.html`. It's a 430px mobile column with a sticky masthead, frosted bottom nav, light/dark toggle, and a **live palette switcher** (three swatches, top-right) cycling Indigo & Vermillion / Peacock & Marigold / Aubergine & Gold.

## Screens
**Core (bottom nav):** Explore (live feed) · Plan (AI Trip Builder) · PureFind (food-safety finder) · Pods (companion matching) · More (hub).
**Phase 2 (via More):** Local Guides · Family Circle · Budget Tracker · Offline Maps · Profile.

## File map
| File | Role |
|---|---|
| `theme.js` | `PALETTES` (3 colorways × light/dark), fonts, food/category color maps, languages, sample-data helpers. Plain JS globals. |
| `data.js` | Sample content: feed posts, destinations, restaurants, pods, guides, family. |
| `primitives.jsx` | `Card`, `Btn`, `InputF`, `Divider`, `Fleuron`, `SectionTitle`, `SkeletonCard`. |
| `badges.jsx` | `TrustBadge`, `Hallmark` (gold seal), `FoodBadge`, `MultiSelectFood`, `GroupFoodBuilder`. |
| `screens-core.jsx` | `ExploreScreen`, `PlanScreen`, `PureFindScreen`, `PodsScreen`. |
| `screens-phase2.jsx` | `GuidesScreen`, `FamilyScreen`, `BudgetScreen`, `OfflineMapsScreen`, `ProfileScreen`. |
| `App.jsx` | Masthead, palette switcher, frosted bottom nav, More hub, routing; mounts `#root`. |

## Conventions
- Every component takes a theme object `t` (the active palette's light or dark token set). Swapping the palette object recolours everything; avatars & the FAB use the `accent→secondary` gradient.
- Components export to `window` at the end of each file (Babel scripts don't share scope). Load order is fixed in `index.html`: theme → data → primitives → badges → screens → App.
- These are cosmetic recreations (fake interactions, in-memory state), not production code.
