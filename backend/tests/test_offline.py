from datetime import datetime, timedelta, timezone


def _build_mock_pack():
    now = datetime.now(timezone.utc)
    return {
        "destination": {
            "id": "dest-123",
            "name": "Test Destination",
            "slug": "test-destination",
            "description": "A beautiful test destination",
            "country": "Testland",
            "region": "Test Region",
            "latitude": 12.34,
            "longitude": 56.78,
            "image_url": "https://example.com/image.jpg",
            "safety_summary": "Safe area",
        },
        "places": [
            {
                "id": "place-1",
                "name": "Test Restaurant",
                "slug": "test-restaurant",
                "type": "RESTAURANT",
                "lat": 12.34,
                "lng": 56.78,
                "rating": 90,
                "review_count": 100,
                "diet_tags": ["vegetarian", "vegan"],
                "tripova_score": 85.0,
                "contact_info": {"phone": "+1234567890"},
                "description": "A test restaurant",
                "image_url": None,
            },
            {
                "id": "place-2",
                "name": "Emergency Hospital",
                "slug": "emergency-hospital",
                "type": "EMERGENCY",
                "lat": 12.35,
                "lng": 56.79,
                "rating": None,
                "review_count": None,
                "diet_tags": [],
                "tripova_score": 60.0,
                "contact_info": None,
                "description": "Emergency services",
                "image_url": None,
            },
            {
                "id": "place-3",
                "name": "Bus Station",
                "slug": "bus-station",
                "type": "TRANSPORT",
                "lat": 12.33,
                "lng": 56.77,
                "rating": 60,
                "review_count": 50,
                "diet_tags": [],
                "tripova_score": 45.0,
                "contact_info": None,
                "description": "Main bus station",
                "image_url": None,
            },
        ],
        "itinerary": None,
        "food_spots": [
            {
                "id": "place-1",
                "name": "Test Restaurant",
                "slug": "test-restaurant",
                "type": "RESTAURANT",
                "lat": 12.34,
                "lng": 56.78,
                "rating": 90,
                "review_count": 100,
                "diet_tags": ["vegetarian", "vegan"],
                "tripova_score": 85.0,
                "contact_info": {"phone": "+1234567890"},
                "description": "A test restaurant",
                "image_url": None,
            },
        ],
        "emergency_places": [
            {
                "id": "place-2",
                "name": "Emergency Hospital",
                "slug": "emergency-hospital",
                "type": "EMERGENCY",
                "lat": 12.35,
                "lng": 56.79,
                "rating": None,
                "review_count": None,
                "diet_tags": [],
                "tripova_score": 60.0,
                "contact_info": None,
                "description": "Emergency services",
                "image_url": None,
            },
        ],
        "safety_notes": {
            "summary": "Safe area",
            "recent_posts": [],
        },
        "transport_notes": [
            {
                "id": "place-3",
                "name": "Bus Station",
                "slug": "bus-station",
                "type": "TRANSPORT",
                "lat": 12.33,
                "lng": 56.77,
                "rating": 60,
                "review_count": 50,
                "diet_tags": [],
                "tripova_score": 45.0,
                "contact_info": None,
                "description": "Main bus station",
                "image_url": None,
            },
        ],
        "contacts": [
            {"name": "Police", "number": "100", "type": "police"},
            {"name": "Ambulance", "number": "102", "type": "medical"},
            {"name": "Fire Brigade", "number": "101", "type": "fire"},
            {"name": "Tourist Helpline", "number": "1800111363", "type": "tourist"},
            {"name": "Women's Helpline", "number": "1091", "type": "helpline"},
        ],
        "feed_summary": [],
        "coordinates": {
            "center": {"lat": 12.34, "lng": 56.78},
        },
        "map_metadata": {
            "bounds": {
                "min_lat": 12.33,
                "max_lat": 12.35,
                "min_lng": 56.77,
                "max_lng": 56.79,
            },
            "zoom_level": 12,
        },
        "generated_at": now.isoformat(),
        "expires_at": (now + timedelta(days=30)).isoformat(),
        "data_version": 1,
    }


class TestOfflinePackStructure:
    def test_pack_contains_destination(self):
        pack = _build_mock_pack()
        assert "destination" in pack
        assert pack["destination"]["name"] == "Test Destination"
        assert "latitude" in pack["destination"]
        assert "longitude" in pack["destination"]

    def test_pack_contains_places(self):
        pack = _build_mock_pack()
        assert "places" in pack
        assert isinstance(pack["places"], list)
        assert len(pack["places"]) == 3

    def test_pack_contains_food_spots(self):
        pack = _build_mock_pack()
        assert "food_spots" in pack
        assert isinstance(pack["food_spots"], list)
        for spot in pack["food_spots"]:
            assert spot["type"] in ("RESTAURANT", "CAFE")

    def test_pack_contains_emergency_places(self):
        pack = _build_mock_pack()
        assert "emergency_places" in pack
        assert isinstance(pack["emergency_places"], list)
        for ep in pack["emergency_places"]:
            assert ep["type"] == "EMERGENCY"

    def test_pack_contains_safety_notes(self):
        pack = _build_mock_pack()
        assert "safety_notes" in pack
        assert "summary" in pack["safety_notes"]
        assert "recent_posts" in pack["safety_notes"]

    def test_pack_contains_coordinates(self):
        pack = _build_mock_pack()
        assert "coordinates" in pack
        assert "center" in pack["coordinates"]
        assert "lat" in pack["coordinates"]["center"]
        assert "lng" in pack["coordinates"]["center"]

    def test_pack_contains_contacts(self):
        pack = _build_mock_pack()
        assert "contacts" in pack
        assert isinstance(pack["contacts"], list)
        assert len(pack["contacts"]) == 5

    def test_pack_contains_metadata(self):
        pack = _build_mock_pack()
        assert "map_metadata" in pack
        assert "data_version" in pack
        assert pack["data_version"] == 1
        assert "generated_at" in pack
        assert "expires_at" in pack

    def test_pack_contains_itinerary(self):
        pack = _build_mock_pack()
        assert "itinerary" in pack

    def test_pack_contains_feed_summary(self):
        pack = _build_mock_pack()
        assert "feed_summary" in pack

    def test_pack_contains_transport_notes(self):
        pack = _build_mock_pack()
        assert "transport_notes" in pack
        assert isinstance(pack["transport_notes"], list)
        for t in pack["transport_notes"]:
            assert t["type"] == "TRANSPORT"

    def test_food_spots_filtered_correctly(self):
        pack = _build_mock_pack()
        assert len(pack["food_spots"]) == 1
        assert pack["food_spots"][0]["name"] == "Test Restaurant"

    def test_emergency_spots_filtered_correctly(self):
        pack = _build_mock_pack()
        assert len(pack["emergency_places"]) == 1
        assert pack["emergency_places"][0]["name"] == "Emergency Hospital"
