import pytest

from app.modules.trips.feasibility import check_leg_feasibility, leg_warning

# ~128 km apart — a real short intercity hop.
RATLAM = {"name": "Ratlam", "latitude": 23.3315, "longitude": 75.0367}
INDORE = {"name": "Indore", "latitude": 22.7196, "longitude": 75.8577}
# ~1150 km apart — a real fly-able hop.
DELHI = {"name": "Delhi", "latitude": 28.6139, "longitude": 77.2090}
MUMBAI = {"name": "Mumbai", "latitude": 19.0760, "longitude": 72.8777}


def _airports(catalog):
    """Fake nearest_airport: returns the closest fake airport with distanceKm attached."""
    from app.modules.trips.route_planner import haversine_km

    async def _lookup(point):
        best, best_km = None, None
        for hub in catalog:
            km = haversine_km(point["latitude"], point["longitude"], hub["latitude"], hub["longitude"])
            if best_km is None or km < best_km:
                best, best_km = hub, km
        return None if best is None else {**best, "distanceKm": round(best_km, 1)}

    return _lookup


# An airport sitting right on each city — so the airport gate always passes when present.
_AIRPORT_AT = lambda pt: _airports([{"name": f"{pt['name']} Airport", **pt}])  # noqa: E731


class TestHardBlocks:
    async def test_intercity_metro_is_rejected(self):
        reason = await check_leg_feasibility(RATLAM, INDORE, "METRO")
        assert reason and "Metro" in reason

    async def test_short_flight_is_rejected(self):
        # 128 km — below FLIGHT_MIN_KM, so it's blocked before any airport lookup.
        reason = await check_leg_feasibility(RATLAM, INDORE, "FLIGHT", airport_lookup=_AIRPORT_AT(RATLAM))
        assert reason and "too short to fly" in reason

    async def test_flight_blocked_when_no_airport_near_origin(self):
        # Long enough to fly, but the only airport is far from Ratlam.
        far = _airports([{"name": "Mumbai Airport", **MUMBAI}])
        reason = await check_leg_feasibility(DELHI, MUMBAI, "FLIGHT", airport_lookup=far)
        assert reason and "No airport" in reason

    async def test_flight_allowed_with_airports_both_ends(self):
        near = _airports([
            {"name": "Delhi Airport", **DELHI},
            {"name": "Mumbai Airport", **MUMBAI},
        ])
        assert await check_leg_feasibility(DELHI, MUMBAI, "FLIGHT", airport_lookup=near) is None

    async def test_flight_not_blocked_when_lookup_unavailable(self):
        # Overpass down → lookup returns None → we don't block a long-enough flight.
        async def _down(_pt):
            return None

        assert await check_leg_feasibility(DELHI, MUMBAI, "FLIGHT", airport_lookup=_down) is None

    async def test_walk_across_a_state_is_rejected(self):
        reason = await check_leg_feasibility(RATLAM, INDORE, "WALK")
        assert reason and "walk" in reason


class TestAllowedModes:
    async def test_short_metro_is_allowed(self):
        near = {"name": "Suburb", "latitude": 23.34, "longitude": 75.10}  # ~7 km
        assert await check_leg_feasibility(RATLAM, near, "METRO") is None

    async def test_car_and_train_are_always_allowed_for_a_short_hop(self):
        assert await check_leg_feasibility(RATLAM, INDORE, "CAR") is None
        assert await check_leg_feasibility(RATLAM, INDORE, "TRAIN") is None


class TestWarnings:
    async def test_paused_water_resolves_as_car(self):
        # FERRY is paused; unknown modes fall back to CAR (no warning).
        note = leg_warning(RATLAM, INDORE, "FERRY")
        assert note is None

    async def test_ordinary_leg_has_no_warning(self):
        assert leg_warning(RATLAM, INDORE, "CAR") is None
        assert leg_warning(RATLAM, INDORE, "TRAIN") is None

    async def test_very_long_bus_is_flagged(self):
        note = leg_warning(DELHI, MUMBAI, "BUS")
        assert note and "estimate only" in note
