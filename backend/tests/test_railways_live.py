"""Offline unit tests for the live-eRail parsing/ranking helpers in railways.py.

These never hit the network: they feed a captured eRail `getTrains` payload through
the pure parser and selection helpers. The live `find_train_live` itself is exercised
only for its no-network failure path (snapshot fallback contract).
"""

import asyncio

from app.modules.trips import railways as r

# A trimmed but realistic RTM->INDB getTrains blob: one header row, two real trains,
# captured from the keyless endpoint. Fields joined by '~', rows by '^'.
ERAIL_SAMPLE = (
    "~RTM~Ratlam Jn~INDB~Indore Jn Bg~~2026-6-21-13-53-26~~~"
    "^11125~RTM GWALIOR EXP~Ratlam Jn~RTM~Gwalior Jn~GWL~Ratlam Jn~RTM~Indore Jn Bg~INDB"
    "~17.25~19.25~02.00~1011001~x~y~z~more~fields~here"
    "^79318~RTM-DADN DMU~Ratlam Jn~RTM~Dr Ambedkar Ngr~DADN~Ratlam Jn~RTM~Indore Jn Bg~INDB"
    "~19.00~21.50~02.50~1111111~x~y~z~more~fields~here"
)


class TestErailTime:
    def test_dotted(self):
        assert r._erail_time("17.25") == "17:25"

    def test_colon(self):
        assert r._erail_time("9:5") == "09:05"

    def test_invalid(self):
        assert r._erail_time("") is None
        assert r._erail_time("99.99") is None
        assert r._erail_time("First") is None
        assert r._erail_time(None) is None


class TestParseErail:
    def test_parses_two_trains(self):
        trains = r._parse_erail(ERAIL_SAMPLE)
        assert [t["number"] for t in trains] == ["11125", "79318"]
        first = trains[0]
        assert first["name"] == "RTM GWALIOR EXP"
        assert first["fromCode"] == "RTM"
        assert first["toName"] == "Indore Jn Bg"
        assert first["dep"] == "17:25"
        assert first["arr"] == "19:25"
        assert first["travelTime"] == "02:00"

    def test_header_and_garbage_skipped(self):
        # Header row (field 0 = "") and an error blob must not produce trains.
        assert r._parse_erail("~RTM~Ratlam~INDB~Indore~~ts~~~") == []
        assert r._parse_erail("~~~~~From station not found") == []
        assert r._parse_erail("") == []

    def test_short_rows_skipped(self):
        # A row with < 14 fields is ignored rather than IndexError-ing.
        assert r._parse_erail("^123~Some Train~a~b") == []


class TestBestLiveTrain:
    def test_picks_fastest_then_earliest(self):
        trains = r._parse_erail(ERAIL_SAMPLE)
        best = r._best_live_train(trains)
        assert best["number"] == "11125"  # 02:00 < 02:50

    def test_empty(self):
        assert r._best_live_train([]) is None


class TestSelectLiveTrain:
    # Sample has 11125 dep 17:25 (fast, 2h) and 79318 dep 19:00 (slow, 2h50).
    def _trains(self):
        return r._parse_erail(ERAIL_SAMPLE)

    def test_no_time_keeps_fastest(self):
        assert r._select_live_train(self._trains(), None)["number"] == "11125"

    def test_skips_train_already_departed(self):
        # Leg starts 18:00 — the 17:25 has gone, so the 19:00 is the one you'd catch.
        assert r._select_live_train(self._trains(), 18 * 60)["number"] == "79318"

    def test_soonest_catchable_when_both_ahead(self):
        # Leg starts 06:00 — both are ahead, pick the soonest departure (17:25).
        assert r._select_live_train(self._trains(), 6 * 60)["number"] == "11125"

    def test_all_departed_falls_back_to_earliest(self):
        # Leg starts 23:00 — none left today, surface the day's earliest (tomorrow).
        assert r._select_live_train(self._trains(), 23 * 60)["number"] == "11125"

    def test_empty(self):
        assert r._select_live_train([], 12 * 60) is None


class TestRankedStations:
    def test_junction_outranks_adjacent_halt(self):
        # RTM (Ratlam Jn, many trains) must outrank RTD (Ratlam A Cabin, none),
        # even though the cabin can be marginally closer to the city centroid.
        ranked = r._ranked_stations_near(23.331, 75.037, r._MAX_STATION_KM, 3)
        codes = [s["code"] for s in ranked]
        assert "RTM" in codes
        assert codes[0] == "RTM"


class TestFindTrainLiveFallback:
    def test_returns_none_when_no_station_resolves(self):
        # Mid-ocean coords resolve to no station -> None (caller uses snapshot).
        r._LIVE_CACHE.clear()
        res = asyncio.run(r.find_train_live(0.0, 0.0, 1.0, 1.0))
        assert res is None
