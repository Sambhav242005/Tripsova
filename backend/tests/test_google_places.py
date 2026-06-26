"""Offline unit tests for the Google Places (New) provider parsers.

No network: a representative Places API (New) payload is fed through the pure parsers
and asserted to produce the legacy provider dict shape the ingestion pipeline consumes.
This locks in the migration away from the retired legacy endpoints (which returned
status=REQUEST_DENIED, "You're calling a legacy API…") that left food search empty.
"""

from app.modules.data_sources import google_places_provider as gp


# Shape returned by POST https://places.googleapis.com/v1/places:searchText with a
# field mask of places.id,displayName,formattedAddress,location,rating,
# userRatingCount,types,priceLevel — trimmed to two places.
SEARCH_PAYLOAD = {
    "places": [
        {
            "id": "ChIJsFive",
            "types": ["restaurant", "bar", "food", "point_of_interest"],
            "formattedAddress": "Station Rd, Ratlam, MP 457001, India",
            "location": {"latitude": 23.331, "longitude": 75.041},
            "rating": 4.3,
            "userRatingCount": 812,
            "displayName": {"text": "The Five Elements Restaurant and Bar", "languageCode": "en"},
            "priceLevel": "PRICE_LEVEL_MODERATE",
        },
        {
            "id": "ChIJcafe",
            "types": ["cafe", "food", "point_of_interest"],
            "formattedAddress": "Do Batti, Ratlam, MP, India",
            "location": {"latitude": 23.334, "longitude": 75.037},
            "rating": 4.1,
            "userRatingCount": 96,
            "displayName": {"text": "Brew & Bite Cafe", "languageCode": "en"},
        },
    ]
}

# Shape returned by GET https://places.googleapis.com/v1/places/{id} (single object).
DETAILS_PAYLOAD = {
    "id": "ChIJsFive",
    "types": ["restaurant", "food"],
    "formattedAddress": "Station Rd, Ratlam, MP 457001, India",
    "location": {"latitude": 23.331, "longitude": 75.041},
    "rating": 4.3,
    "userRatingCount": 812,
    "displayName": {"text": "The Five Elements Restaurant and Bar"},
    "priceLevel": "PRICE_LEVEL_EXPENSIVE",
    "nationalPhoneNumber": "07412 123456",
    "websiteUri": "https://fiveelements.example",
    "googleMapsUri": "https://maps.google.com/?cid=123",
    "regularOpeningHours": {"weekdayDescriptions": ["Monday: 11:00 AM – 11:00 PM"]},
}


class TestParseSearchResponse:
    def test_maps_to_provider_shape(self):
        results = gp.parse_search_response(SEARCH_PAYLOAD)
        assert len(results) == 2
        first = results[0]
        assert first["source_id"] == "ChIJsFive"
        assert first["source"] == "google_places"
        assert first["name"] == "The Five Elements Restaurant and Bar"
        assert first["full_address"].startswith("Station Rd, Ratlam")
        assert first["lat"] == 23.331 and first["lng"] == 75.041
        assert first["rating"] == 4.3
        assert first["review_count"] == 812
        assert "restaurant" in first["types"]

    def test_cafe_type_preserved_for_downstream_bucketing(self):
        # sync_food_places_from_google keys CAFE vs RESTAURANT off `"cafe" in types`.
        cafe = gp.parse_search_response(SEARCH_PAYLOAD)[1]
        assert "cafe" in cafe["types"]
        assert cafe["name"] == "Brew & Bite Cafe"

    def test_empty_and_missing(self):
        assert gp.parse_search_response({"places": []}) == []
        assert gp.parse_search_response({}) == []
        assert gp.parse_search_response(None) == []


class TestParseDetailsResponse:
    def test_maps_contact_and_price(self):
        d = gp.parse_details_response(DETAILS_PAYLOAD)
        assert d["source_id"] == "ChIJsFive"
        assert d["contact_info"]["phone"] == "07412 123456"
        assert d["contact_info"]["website"] == "https://fiveelements.example"
        assert d["contact_info"]["url"] == "https://maps.google.com/?cid=123"
        assert d["contact_info"]["opening_hours"] == ["Monday: 11:00 AM – 11:00 PM"]
        # Enum -> legacy 0-4 int.
        assert d["price_level"] == 3

    def test_empty_payload(self):
        assert gp.parse_details_response({}) == {}
        assert gp.parse_details_response(None) == {}
        assert gp.parse_details_response({"displayName": {"text": "no id"}}) == {}
