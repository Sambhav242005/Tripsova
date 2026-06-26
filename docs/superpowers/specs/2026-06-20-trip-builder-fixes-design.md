# Design — Trip Builder & navigation fixes (2026-06-20)

Four user-reported problems, designed together, built in one pass.

## 1. "Home" sends logged-in users to `/` instead of `/app`

**Root cause.** Three breadcrumb links hardcode `href="/"` on server-component
public pages, so a logged-in user browsing destinations/food lands on the
marketing page instead of the app:
- `frontend/src/app/destinations/page.tsx`
- `frontend/src/app/destinations/[slug]/page.tsx`
- `frontend/src/app/food/[slug]/page.tsx`

In-app nav (side drawer, bottom nav) is already correct.

**Fix.** New client component `frontend/src/components/tripova/home-crumb.tsx`
(`HomeCrumb`) that reads the existing auth context and renders
`<Link href={isAuthed ? "/app" : "/"}>Home</Link>`. Replace the three hardcoded
links. Logged-out behaviour unchanged.

## 2. Trip Builder "Getting there" has no map

**Root cause.** `GettingThereCard` (`plan-screen.tsx`) has coords + a computed
route but renders no map, unlike the Route Planner.

**Fix.** Backend `_plan_getting_there` already calls `plan_route`; include the
full `route` object in the returned `gettingThere` dict (mirrors
`JourneyPlanResponse.route`). Frontend: add `route?` to the `GettingThere` type
and render the existing `<LiveRouteMap result={gt.route} t={t} />` inside the
card. No new map code.

## 3. Generic itinerary — no real café / local speciality for unsynced cities

**Root cause.** `TripPlanner` only scores **pre-synced** DB `Place` rows. A city
with no `Destination`/`Place` rows (e.g. Ratlam) falls through to
`_empty_itinerary()` / generic archetype text ("guided local walk", "Dinner at
Local dining").

**Fix.** New `backend/app/modules/trips/live_places.py` — on-demand OSM (Overpass)
fetch reusing the hubs.py pattern (async, in-process cache, graceful empty on
failure). Fetches near the destination coords:
- cafés (`amenity=cafe`), restaurants (`amenity=restaurant`), and
- key sights (`tourism=attraction|museum|viewpoint|artwork`, `historic=*`).

In `TripPlanner._load_data`, when `self.all_places` is empty/thin, geocode the
destination and pull live OSM POIs, mapping them into the same scored-place /
scored-food dicts the itinerary builder already consumes (so real café and sight
names fill the slots). **Local speciality**: when `AI_ENABLED`, the AI provider
already names dishes; additionally infer a per-venue speciality from OSM
`cuisine=` tags. No fabrication — when neither AI nor `cuisine` is present, the
slot just names the real venue without a dish.

OSM venues carry no `id` from our DB; mapped dicts use `osm:<type>:<id>` ids and
real lat/lng/name/address/phone/cuisine where present.

## 4. No train number (Trip Builder + Route Planner)

**Root cause.** Train times are computed estimates; there is no real schedule
source, so no train number can be shown.

**Data.** Vendor a trimmed snapshot of the keyless **datameet/railways** dataset:
- `stations.json` (1.8 MB) → `backend/app/data/railways/stations.min.json`:
  compact `{code: [lng, lat, name]}`, dropping null-geometry junk entries.
- `trains.json` (14.7 MB) → `backend/app/data/railways/trains.min.json`: keep
  `number, name, from_station_code, from_station_name, to_station_code,
  to_station_name, departure, arrival, duration_m, type` + LineString geometry
  with coords rounded to 4 dp (~11 m) to shrink it.
- `schedules.json` (82 MB) is NOT vendored; the trains.json geometry already
  traces every stop, which is enough for pass-through matching.

Build script: `backend/scripts/build_railways_data.py` (downloads + trims;
re-runnable to refresh).

**Resolver.** New `backend/app/modules/trips/railways.py` (lazy-loaded, cached):
- `nearest_station(lat, lng)` → nearest real station code/name/coords (≤ ~30 km).
- `find_train(o_lat, o_lng, d_lat, d_lng)`:
  1. Resolve origin & dest nearest station codes.
  2. **Direct match**: trains with `from_station_code == o` and
     `to_station_code == d` → return number, name + **real** `departure` /
     `arrival` (`scheduled: true`).
  3. **Pass-through match** (fallback): scan train geometries for a vertex near
     origin at index `i` and one near dest at index `j` with `i < j` → return
     number + name only; times stay the computed estimate (`scheduled: false`).
  4. No match → `None`.
  Results cached by rounded coord pair.

**Wiring.** In `route_planner._plan_leg`, for a `TRAIN` leg, call `find_train`
and attach `trainNumber`, `trainName`, and (when direct) `scheduledDeparture` /
`scheduledArrival` to the leg `summary`. This flows automatically to the Route
Planner, the auto Journey Planner, and the Trip Builder getting-there leg (all
go through `plan_route`).

**Frontend.** Add the optional fields to `LegResponse` (route-screen) /
`GettingThere`. Render "🚆 Train 12345 · <name>" on the train leg in both the
Route Planner leg list and the getting-there card; when a real scheduled time
exists, show it, otherwise label the time **"estimated"** so we never present a
computed time as if it were a real timetable.

## Honesty / no-fabrication guardrails
- OSM venues: real names/coords only; speciality only from AI or `cuisine` tag.
- Trains: real number/name from the dataset; times marked **estimated** unless a
  direct timetable entry exists. No match → no number shown, existing estimate
  stands.

## Build order
1. `HomeCrumb` + 3 breadcrumb swaps.
2. Backend `route` in gettingThere → `LiveRouteMap` in card.
3. `live_places.py` + `_load_data` integration + speciality.
4. Railways build script → vendor data → `railways.py` → `_plan_leg` wiring →
   frontend train number display.
5. `npx tsc --noEmit` clean; backend tests green.
