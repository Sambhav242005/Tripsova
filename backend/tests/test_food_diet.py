import pytest

from app.modules.data_sources.ingestion_service import _cuisine_or_type_tags, _osm_diet_tags
from app.modules.food.diet_ai import ai_infer_diet_tags
from app.shared.diet import diet_tags_match, to_canonical


class TestCanonical:
    def test_osm_vegetarian_maps_to_pure_veg_and_matches_filter(self):
        # The classic latent bug: "vegetarian" must satisfy the Pure Veg chip.
        assert to_canonical("vegetarian") == "PURE_VEG"
        assert diet_tags_match(["PURE_VEG"], ["pure_veg"]) is True

    def test_gluten_free_variants(self):
        assert to_canonical("gluten-free") == "GLUTEN"
        assert to_canonical("gluten_free") == "GLUTEN"

    def test_unknown_label_is_dropped(self):
        assert to_canonical("space food") is None


class TestOsmDietTags:
    def test_pure_veg_name_infers_canonical_tag(self):
        tags = {"name": "Shri Krishna Pure Veg Bhojnalay", "amenity": "restaurant"}
        assert _osm_diet_tags(tags) == ["PURE_VEG"]

    def test_no_signal_yields_no_diet(self):
        assert _osm_diet_tags({"name": "Domino's", "amenity": "fast_food"}) == []


class TestCuisineFallback:
    def test_falls_back_to_type_label_when_no_cuisine(self):
        assert _cuisine_or_type_tags(None, "RESTAURANT") == ["Restaurant"]
        assert _cuisine_or_type_tags("", "CAFE") == ["Cafe"]

    def test_uses_cuisine_when_present(self):
        assert _cuisine_or_type_tags("indian;chinese", "RESTAURANT") == ["indian", "chinese"]


class TestAiInferDisabled:
    async def test_returns_empty_per_item_when_ai_disabled(self, monkeypatch):
        # Force AI off (the env may have it enabled) → no network, all empty.
        from app.config import settings
        monkeypatch.setattr(settings, "AI_ENABLED", False)
        items = [{"name": "Al-Baik Grill", "cuisine": "arab"}, {"name": "Cafe X", "cuisine": None}]
        result = await ai_infer_diet_tags(items)
        assert result == [[], []]

    async def test_empty_input(self):
        assert await ai_infer_diet_tags([]) == []
