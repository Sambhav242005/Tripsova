import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_food_places_return_verification_count_and_trust_flags(client: AsyncClient, test_session, test_user):
    from app.modules.places.models import FoodVerification, Place

    place = Place(
        name="Pin & Pan Cafe",
        slug="pin-pan-cafe-test",
        type="CAFE",
        address="Bhopal",
        diet_tags=["JAIN"],
        food_score=20,
        tripova_score=70,
        source="seed",
    )
    test_session.add(place)
    await test_session.flush()
    test_session.add(FoodVerification(place_id=place.id, user_id=test_user.id, diet_tag="JAIN", confidence_score=0.9))
    await test_session.flush()

    response = await client.get("/api/food")

    assert response.status_code == 200
    item = next(row for row in response.json() if row["id"] == str(place.id))
    assert item["verified_count"] == 1
    assert item["is_community_verified"] is True
    assert item["is_diet_trusted"] is True


@pytest.mark.asyncio
async def test_diet_filter_excludes_untagged_cafes(client: AsyncClient, test_session):
    from app.modules.places.models import Place

    tagged = Place(
        name="Jain Meals",
        slug="jain-meals-test",
        type="RESTAURANT",
        diet_tags=["JAIN"],
        food_score=20,
        tripova_score=80,
    )
    untagged = Place(
        name="Tea O'clock Cafe",
        slug="tea-oclock-cafe-test",
        type="CAFE",
        diet_tags=None,
        food_score=0,
        tripova_score=60,
    )
    test_session.add_all([tagged, untagged])
    await test_session.flush()

    response = await client.get("/api/food?diet_tag=jain")

    assert response.status_code == 200
    ids = {row["id"] for row in response.json()}
    assert str(tagged.id) in ids
    assert str(untagged.id) not in ids
