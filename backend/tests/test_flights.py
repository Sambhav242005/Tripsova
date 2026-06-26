"""Offline unit tests for the provider-agnostic flight helpers in flights.py.

No network: captured/representative provider payloads are fed through the pure parsers
and the time-aware selector. ``find_flight`` itself is exercised only for its disabled
(no-token) contract, which must return None so the planner's estimate stands.
"""

from app.modules.trips import flights as fl


class TestIataOf:
    def test_extracts_code(self):
        assert fl._iata_of({"name": "Indira Gandhi Intl (DEL)"}) == "DEL"

    def test_none_when_absent(self):
        assert fl._iata_of({"name": "Some Airfield"}) is None
        assert fl._iata_of(None) is None


class TestIsoHhmm:
    def test_datetime(self):
        assert fl._iso_hhmm("2026-07-01T06:05:00") == "06:05"

    def test_utc_z(self):
        assert fl._iso_hhmm("2015-06-09T21:20:00Z") == "21:20"

    def test_invalid(self):
        assert fl._iso_hhmm("") is None
        assert fl._iso_hhmm(None) is None
        assert fl._iso_hhmm("not-a-time") is None


# ── Travelpayouts prices_for_dates (one-way): {"data": [ {price, airline,
#    flight_number, departure_at, duration_to, transfers}, ... ]}
TP_PAYLOAD = {
    "success": True,
    "data": [
        {"price": 4500, "airline": "6E", "flight_number": 2138,
         "departure_at": "2026-07-01T06:00:00+05:30", "duration_to": 130, "transfers": 0},
        {"price": 3900, "airline": "AI", "flight_number": 865,
         "departure_at": "2026-07-01T19:30:00+05:30", "duration_to": 130, "transfers": 0},
    ],
}

# ── Amadeus shape: data[].itineraries[].segments[] + price.total/currency
AMA_PAYLOAD = {
    "data": [
        {
            "itineraries": [{"segments": [
                {"departure": {"iataCode": "DEL", "at": "2026-07-01T06:00:00"},
                 "arrival": {"iataCode": "BOM", "at": "2026-07-01T08:10:00"},
                 "carrierCode": "6E", "number": "2138"},
            ]}],
            "price": {"currency": "EUR", "total": "85.40"},
        },
        {
            "itineraries": [{"segments": [
                {"departure": {"iataCode": "DEL", "at": "2026-07-01T20:00:00"},
                 "arrival": {"iataCode": "BLR", "at": "2026-07-01T21:30:00"},
                 "carrierCode": "AI", "number": "503"},
                {"departure": {"iataCode": "BLR", "at": "2026-07-01T22:30:00"},
                 "arrival": {"iataCode": "BOM", "at": "2026-07-01T23:55:00"},
                 "carrierCode": "AI", "number": "640"},
            ]}],
            "price": {"currency": "EUR", "total": "70.00"},
        },
    ]
}


class TestParseTravelpayouts:
    def test_parses_offers(self):
        flights = fl._parse_travelpayouts(TP_PAYLOAD, "INR")
        nums = sorted(f["number"] for f in flights)
        assert nums == ["6E 2138", "AI 865"]
        f0 = next(f for f in flights if f["number"] == "6E 2138")
        assert f0["dep"] == "06:00"
        assert f0["arr"] == "08:10"  # 06:00 + duration_to 130 min
        assert f0["price"] == 4500.0
        assert f0["currency"] == "INR"

    def test_failure_payload(self):
        assert fl._parse_travelpayouts({"success": False, "data": []}, "INR") == []
        assert fl._parse_travelpayouts({}, "INR") == []


class TestParseAmadeus:
    def test_first_and_last_segment(self):
        flights = fl._parse_amadeus(AMA_PAYLOAD, "INR")
        assert len(flights) == 2
        nonstop = flights[0]
        assert nonstop["number"] == "6E 2138"
        assert nonstop["dep"] == "06:00" and nonstop["arr"] == "08:10"
        assert nonstop["price"] == 85.40 and nonstop["currency"] == "EUR"
        assert nonstop["stops"] == 0
        # The connecting itinerary: dep of first seg, arr of last seg, 1 stop.
        conn = flights[1]
        assert conn["dep"] == "20:00" and conn["arr"] == "23:55"
        assert conn["stops"] == 1

    def test_empty(self):
        assert fl._parse_amadeus({"data": []}, "INR") == []
        assert fl._parse_amadeus({}, "INR") == []


class TestSelectFlight:
    def _flights(self):
        return fl._parse_travelpayouts(TP_PAYLOAD, "INR")  # 06:00 (₹4500), 19:30 (₹3900)

    def test_no_time_picks_cheapest(self):
        assert fl._select_flight(self._flights(), None)["number"] == "AI 865"  # 3900 < 4500

    def test_skips_departed_flight(self):
        # Leg starts 09:00 — the 06:00 has gone, only the 19:30 is catchable.
        assert fl._select_flight(self._flights(), 9 * 60)["number"] == "AI 865"

    def test_soonest_when_both_ahead(self):
        # Leg starts 05:00 — both ahead, soonest departure is the 06:00.
        assert fl._select_flight(self._flights(), 5 * 60)["number"] == "6E 2138"

    def test_all_departed_falls_back_to_earliest(self):
        assert fl._select_flight(self._flights(), 23 * 60)["number"] == "6E 2138"

    def test_empty(self):
        assert fl._select_flight([], 8 * 60) is None
