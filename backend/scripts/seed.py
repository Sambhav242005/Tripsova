import asyncio
from datetime import datetime, timezone, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_factory, engine, Base
from app.security import hash_password
from app.shared.enums import (
    UserRole,
    VerificationStatus,
    PlaceType,
    DietTag,
    TripPodStatus,
    TripPodMemberStatus,
    PartnerType,
)
from app.modules.users.models import (
    User,
    Destination,
    Place,
    FoodVerification,
    FeedPost,
    TripPod,
    TripPodMember,
    Partner,
    Listing,
    TrustEvent,
)


def slugify(text: str) -> str:
    return text.lower().replace(" ", "-").replace("'", "").replace("&", "and").replace(".", "")


async def _create_users(session: AsyncSession) -> dict[str, User]:
    admin = User(
        name="Admin User",
        email="admin@tripsova.com",
        password_hash=hash_password("password123"),
        role=UserRole.ADMIN.value,
        verification_status=VerificationStatus.ID_VERIFIED.value,
        trust_score=95.0,
        travel_style={"preference": "luxury", "pace": "relaxed"},
        diet_preference=["PURE_VEG"],
    )
    traveller = User(
        name="Traveller Tina",
        email="traveller@tripsova.com",
        password_hash=hash_password("password123"),
        role=UserRole.USER.value,
        verification_status=VerificationStatus.EMAIL_VERIFIED.value,
        trust_score=78.0,
        travel_style={"preference": "budget", "pace": "moderate"},
        diet_preference=["VEGAN", "HALAL"],
    )
    partner_user = User(
        name="Partner Paul",
        email="partner@tripsova.com",
        password_hash=hash_password("password123"),
        role=UserRole.LOCAL_PARTNER.value,
        verification_status=VerificationStatus.PHONE_VERIFIED.value,
        trust_score=82.0,
        travel_style={"preference": "backpacker", "pace": "fast"},
        diet_preference=[],
    )
    session.add_all([admin, traveller, partner_user])
    await session.flush()
    return {
        "admin@tripsova.com": admin,
        "traveller@tripsova.com": traveller,
        "partner@tripsova.com": partner_user,
    }


async def _create_destinations(session: AsyncSession) -> dict[str, Destination]:
    destinations_data = [
        {
            "name": "Manali",
            "slug": "manali",
            "city": "Manali",
            "state": "Himachal Pradesh",
            "country": "India",
            "description": "Manali is a high-altitude Himalayan resort town in Himachal Pradesh. Nestled in the Kullu Valley at 2,050 metres, it is renowned for its snow-capped mountains, pine forests, and adventure sports. The town serves as a gateway to Ladakh and Spiti Valley and attracts both honeymooners and adventure enthusiasts year-round.",
            "best_time_to_visit": "October to June",
            "average_budget_min": 15000,
            "average_budget_max": 50000,
            "safety_summary": "Generally safe for tourists. Avoid isolated areas after dark.",
            "weather_summary": "Summer 15-25°C, Winter -5-10°C",
            "crowd_level": "High",
            "internet_quality": "Good in town, limited in remote areas",
            "latitude": 32.2432,
            "longitude": 77.1892,
            "tags": ["mountains", "adventure", "trekking", "honeymoon"],
        },
        {
            "name": "Rishikesh",
            "slug": "rishikesh",
            "city": "Rishikesh",
            "state": "Uttarakhand",
            "country": "India",
            "description": "Rishikesh is the yoga capital of the world. Situated on the banks of the Ganges at the foothills of the Himalayas, it is a hub for spiritual seekers, yoga retreats, and white-water rafting. The iconic suspension bridges Laxman Jhula and Ram Jhula add to its charm.",
            "best_time_to_visit": "September to April",
            "average_budget_min": 10000,
            "average_budget_max": 35000,
            "safety_summary": "Very safe for solo travellers including women. Beware of river currents.",
            "weather_summary": "Summer 25-40°C, Winter 5-20°C",
            "crowd_level": "Very High",
            "internet_quality": "Good",
            "latitude": 30.0869,
            "longitude": 78.2676,
            "tags": ["spiritual", "yoga", "adventure", "rafting"],
        },
        {
            "name": "Jaipur",
            "slug": "jaipur",
            "city": "Jaipur",
            "state": "Rajasthan",
            "country": "India",
            "description": "Jaipur, the Pink City, is Rajasthan's capital and a UNESCO World Heritage city. Known for its stunning palaces, vibrant bazaars, and rich Rajput history, it forms the golden triangle of Indian tourism alongside Delhi and Agra.",
            "best_time_to_visit": "October to March",
            "average_budget_min": 12000,
            "average_budget_max": 40000,
            "safety_summary": "Generally safe. Be cautious with touts at tourist spots.",
            "weather_summary": "Summer 25-45°C, Winter 5-22°C",
            "crowd_level": "High",
            "internet_quality": "Excellent",
            "latitude": 26.9124,
            "longitude": 75.7873,
            "tags": ["heritage", "culture", "shopping", "history"],
        },
        {
            "name": "Goa",
            "slug": "goa",
            "city": "Panaji",
            "state": "Goa",
            "country": "India",
            "description": "Goa is India's beach paradise. With its palm-fringed sandy shores, Portuguese colonial architecture, vibrant nightlife, and delectable seafood, it attracts millions of tourists every year. From quiet coves in South Goa to party hubs in the north, there is something for everyone.",
            "best_time_to_visit": "November to March",
            "average_budget_min": 15000,
            "average_budget_max": 60000,
            "safety_summary": "Very safe. Avoid isolated beaches at night.",
            "weather_summary": "Summer 25-35°C, Winter 20-30°C",
            "crowd_level": "Very High",
            "internet_quality": "Excellent",
            "latitude": 15.2993,
            "longitude": 74.1240,
            "tags": ["beach", "party", "water sports", "food"],
        },
        {
            "name": "Udaipur",
            "slug": "udaipur",
            "city": "Udaipur",
            "state": "Rajasthan",
            "country": "India",
            "description": "Udaipur, the City of Lakes, is one of India's most romantic destinations. Built around shimmering artificial lakes and adorned with grand palaces and havelis, it offers a glimpse into the opulent Rajput era. The Lake Palace floating on Pichola is iconic.",
            "best_time_to_visit": "October to March",
            "average_budget_min": 12000,
            "average_budget_max": 45000,
            "safety_summary": "Very safe. One of India's safest cities for tourists.",
            "weather_summary": "Summer 25-42°C, Winter 5-22°C",
            "crowd_level": "High",
            "internet_quality": "Excellent",
            "latitude": 24.5854,
            "longitude": 73.7125,
            "tags": ["romantic", "heritage", "lakes", "palace"],
        },
        {
            "name": "Kasol",
            "slug": "kasol",
            "city": "Kasol",
            "state": "Himachal Pradesh",
            "country": "India",
            "description": "Kasol is a tiny village in the Parvati Valley popular among backpackers and trekkers. Known as Mini Israel for its large Israeli traveller community, it offers scenic riverside camps, backpacker-friendly cafes, and access to the famous Kheer Ganga trek.",
            "best_time_to_visit": "March to June, September to November",
            "average_budget_min": 8000,
            "average_budget_max": 25000,
            "safety_summary": "Moderate. Trek with a guide. Avoid street substances.",
            "weather_summary": "Summer 15-25°C, Winter -2-10°C",
            "crowd_level": "Medium",
            "internet_quality": "Limited",
            "latitude": 32.0100,
            "longitude": 77.3150,
            "tags": ["trekking", "backpacker", "nature", "camping"],
        },
        {
            "name": "Spiti Valley",
            "slug": "spiti-valley",
            "city": "Kaza",
            "state": "Himachal Pradesh",
            "country": "India",
            "description": "Spiti Valley is a cold desert mountain valley nestled in the Himalayas. With its stark lunar landscape, ancient Buddhist monasteries, and remote villages, it offers one of India's most unique offbeat travel experiences. The valley is only accessible for a few months each year.",
            "best_time_to_visit": "May to October",
            "average_budget_min": 20000,
            "average_budget_max": 55000,
            "safety_summary": "Moderate. High altitude. Acclimatize properly. Limited medical facilities.",
            "weather_summary": "Summer 5-20°C, Winter -15-5°C",
            "crowd_level": "Low",
            "internet_quality": "Very Limited",
            "latitude": 32.2466,
            "longitude": 78.0461,
            "tags": ["offbeat", "adventure", "landscape", "photography"],
        },
    ]
    destinations = {}
    for d in destinations_data:
        dest = Destination(**d)
        session.add(dest)
    await session.flush()
    result = await session.execute(select(Destination))
    for dest in result.scalars().all():
        destinations[dest.slug] = dest
    return destinations


def _make_geom(lat: float, lng: float):
    return f"SRID=4326;POINT({lng} {lat})"


async def _create_all_places(session: AsyncSession, destinations: dict[str, Destination]):
    all_places = []

    def make_place(
        dest_slug: str,
        name: str,
        ptype: str,
        lat: float,
        lng: float,
        rating: float | None = None,
        reviews: int | None = None,
        price_range: str | None = None,
        diet_tags: list[str] | None = None,
        tags: list[str] | None = None,
        phone: str | None = None,
        is_partner: bool = False,
        address: str | None = None,
        website: str | None = None,
    ) -> Place:
        dest = destinations[dest_slug]
        p = Place(
            destination_id=dest.id,
            name=name,
            slug=slugify(name),
            type=ptype,
            latitude=lat,
            longitude=lng,
            geom_wkt=_make_geom(lat, lng),
            price_range=price_range,
            external_rating=rating,
            external_review_count=reviews,
            diet_tags=diet_tags if diet_tags else None,
            tags=tags,
            phone=phone,
            website=website,
            is_partner_listed=is_partner,
            source="seed",
            address=address or f"{name}, {dest.name}, {dest.state}",
        )
        session.add(p)
        all_places.append(p)
        return p

    # ── Manali ──────────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("manali", "Solang Valley", PlaceType.TOURIST_SPOT.value, 32.3150, 77.1520, 90, 12500,
               tags=["adventure", "snow", "paragliding"])
    make_place("manali", "Hadimba Temple", PlaceType.TOURIST_SPOT.value, 32.2520, 77.1810, 86, 8500,
               tags=["temple", "history", "architecture"])
    make_place("manali", "Rohtang Pass", PlaceType.VIEWPOINT.value, 32.3716, 77.1056, 94, 32000,
               tags=["pass", "snow", "viewpoint", "high-altitude"])
    make_place("manali", "Manu Temple", PlaceType.TOURIST_SPOT.value, 32.2480, 77.1870, 84, 3500,
               tags=["temple", "spiritual"])
    make_place("manali", "Jogini Falls", PlaceType.VIEWPOINT.value, 32.2600, 77.1700, 88, 2800,
               tags=["waterfall", "trek", "nature"])
    # Food
    make_place("manali", "Sharma Ji Ka Dhaba", PlaceType.RESTAURANT.value, 32.2410, 77.1860, 96, 234,
               price_range="₹100-300", diet_tags=["PURE_VEG", "JAIN", "NO_ONION_GARLIC"],
               tags=["dhaba", "local", "north-indian"])
    make_place("manali", "The Lazy Dog", PlaceType.CAFE.value, 32.2400, 77.1880, 90, 6200,
               price_range="₹400-1200", tags=["cafe", "western", "multicuisine"])
    make_place("manali", "Cafe 1947", PlaceType.CAFE.value, 32.2390, 77.1890, 92, 4100,
               price_range="₹300-800", diet_tags=["VEGAN"], tags=["cafe", "riverside", "organic"])
    make_place("manali", "Johnson's Cafe", PlaceType.CAFE.value, 32.2440, 77.1830, 88, 7800,
               price_range="₹500-1500", tags=["cafe", "wood-fired", "italian"])
    make_place("manali", "Valley View Restaurant", PlaceType.RESTAURANT.value, 32.2470, 77.1850, 84, 350,
               price_range="₹200-600", diet_tags=["PURE_VEG"],
               tags=["family", "north-indian", "view"])
    # Hotels / Homestays
    make_place("manali", "Snow Valley Resort", PlaceType.HOTEL.value, 32.2460, 77.1910, 86, 2100,
               price_range="₹3000-8000", phone="+91-1902-252345", is_partner=True,
               tags=["resort", "luxury", "mountain-view"])
    make_place("manali", "Manali Inn", PlaceType.HOTEL.value, 32.2420, 77.1860, 82, 3200,
               price_range="₹1500-4000", phone="+91-1902-250123",
               tags=["budget", "central"])
    make_place("manali", "Hilltop Homestay", PlaceType.HOMESTAY.value, 32.2500, 77.1750, 98, 98,
               price_range="₹800-2000", phone="+91-98160-12345",
               tags=["homestay", "cozy", "family-run"])
    # Emergency
    make_place("manali", "District Hospital Manali", PlaceType.EMERGENCY.value, 32.2480, 77.1800, phone="+91-1902-252222",
               address="NH 3, Manali, Himachal Pradesh")
    make_place("manali", "Manali Police Station", PlaceType.EMERGENCY.value, 32.2440, 77.1840, phone="+91-1902-252233",
               address="Mall Road, Manali")

    # ── Rishikesh ───────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("rishikesh", "Laxman Jhula", PlaceType.TOURIST_SPOT.value, 30.1220, 78.3220, 86, 15000,
               tags=["bridge", "iconic", "ganges"])
    make_place("rishikesh", "Triveni Ghat", PlaceType.TOURIST_SPOT.value, 30.1050, 78.2900, 90, 8900,
               tags=["ghat", "aarti", "spiritual"])
    make_place("rishikesh", "Beatles Ashram", PlaceType.TOURIST_SPOT.value, 30.1280, 78.3300, 88, 7200,
               tags=["ashram", "history", "meditation"])
    make_place("rishikesh", "Neer Garh Waterfall", PlaceType.VIEWPOINT.value, 30.1750, 78.3500, 92, 4500,
               tags=["waterfall", "trek", "swimming"])
    make_place("rishikesh", "Shivpuri", PlaceType.VIEWPOINT.value, 30.1400, 78.3700, 94, 6800,
               tags=["rafting", "adventure", "camping"])
    # Food
    make_place("rishikesh", "Chotiwala Restaurant", PlaceType.RESTAURANT.value, 30.1200, 78.3200, 86, 12000,
               price_range="₹200-500", diet_tags=["PURE_VEG"], tags=["traditional", "north-indian"])
    make_place("rishikesh", "The Sitting Elephant", PlaceType.CAFE.value, 30.1150, 78.3100, 90, 3400,
               price_range="₹300-700", diet_tags=["VEGAN", "PURE_VEG"],
               tags=["cafe", "organic", "river-view"])
    make_place("rishikesh", "Bhandari Swiss Cottage", PlaceType.RESTAURANT.value, 30.1250, 78.3250, 88, 5600,
               price_range="₹400-1000", diet_tags=["HALAL"], tags=["swiss", "multicuisine"])
    make_place("rishikesh", "Ganga View Cafe", PlaceType.CAFE.value, 30.1080, 78.2950, 92, 2100,
               price_range="₹250-600", diet_tags=["VEGAN"], tags=["cafe", "ganga-view", "healthy"])
    make_place("rishikesh", "Little Buddha Cafe", PlaceType.CAFE.value, 30.1180, 78.3150, 84, 4300,
               price_range="₹300-800", tags=["cafe", "hippie", "multicuisine"])
    # Hotels
    make_place("rishikesh", "Aloha on the Ganges", PlaceType.HOTEL.value, 30.1100, 78.3000, 90, 3200,
               price_range="₹4000-12000", phone="+91-135-2430123", is_partner=True,
               tags=["resort", "ganges-front", "luxury"])
    make_place("rishikesh", "The Great Ganga", PlaceType.HOTEL.value, 30.1120, 78.3050, 86, 1800,
               price_range="₹2000-5000", phone="+91-135-2430456",
               tags=["heritage", "mid-range"])
    make_place("rishikesh", "Rishikesh Valley Hostel", PlaceType.HOTEL.value, 30.1300, 78.3350, 94, 450,
               price_range="₹500-1500", phone="+91-98765-43210",
               tags=["hostel", "backpacker", "social"])
    # Emergency
    make_place("rishikesh", "AIIMS Rishikesh", PlaceType.EMERGENCY.value, 30.1350, 78.3050, phone="+91-135-2462000",
               address="Virbhadra Road, Rishikesh, Uttarakhand")
    make_place("rishikesh", "Rishikesh Police Station", PlaceType.EMERGENCY.value, 30.1160, 78.2900, phone="+91-135-2430232",
               address="Haridwar Road, Rishikesh")

    # ── Jaipur ──────────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("jaipur", "Amber Fort", PlaceType.TOURIST_SPOT.value, 26.9850, 75.8510, 92, 45000,
               tags=["fort", "unesco", "heritage"])
    make_place("jaipur", "Hawa Mahal", PlaceType.TOURIST_SPOT.value, 26.9239, 75.8267, 86, 38000,
               tags=["palace", "architecture", "iconic"])
    make_place("jaipur", "City Palace", PlaceType.TOURIST_SPOT.value, 26.9258, 75.8237, 90, 28000,
               tags=["palace", "museum", "heritage"])
    make_place("jaipur", "Jantar Mantar", PlaceType.TOURIST_SPOT.value, 26.9247, 75.8246, 84, 12000,
               tags=["observatory", "unesco", "science"])
    make_place("jaipur", "Nahargarh Fort", PlaceType.VIEWPOINT.value, 26.9400, 75.8200, 88, 8500,
               tags=["fort", "sunset", "viewpoint"])
    # Food
    make_place("jaipur", "LMB", PlaceType.RESTAURANT.value, 26.9180, 75.8280, 90, 15000,
               price_range="₹400-1200", diet_tags=["PURE_VEG", "JAIN"],
               tags=["traditional", "rajasthani", "thali"])
    make_place("jaipur", "Niros", PlaceType.RESTAURANT.value, 26.9160, 75.8250, 86, 9800,
               price_range="₹500-1500", tags=["multicuisine", "fine-dining", "heritage"])
    make_place("jaipur", "Tapri Central", PlaceType.CAFE.value, 26.9200, 75.8220, 92, 6200,
               price_range="₹200-600", diet_tags=["VEGAN"], tags=["cafe", "chai", "trendy"])
    make_place("jaipur", "Handi Restaurant", PlaceType.RESTAURANT.value, 26.9140, 75.8300, 88, 7800,
               price_range="₹600-1800", diet_tags=["HALAL"], tags=["mughlai", "non-veg", "royal"])
    make_place("jaipur", "Rawat Misthan Bhandar", PlaceType.RESTAURANT.value, 26.9100, 75.8200, 84, 30000,
               price_range="₹50-200", diet_tags=["PURE_VEG"],
               tags=["sweets", "street-food", "traditional"])
    # Hotels
    make_place("jaipur", "Rambagh Palace", PlaceType.HOTEL.value, 26.9010, 75.8120, 96, 5600,
               price_range="₹25000-80000", phone="+91-141-2211919", is_partner=True,
               tags=["palace", "luxury", "heritage", "taj"])
    make_place("jaipur", "Umaid Bhawan", PlaceType.HOTEL.value, 26.9050, 75.8150, 90, 4200,
               price_range="₹5000-15000", phone="+91-141-2202326",
               tags=["heritage", "boutique", "mid-range"])
    make_place("jaipur", "Pearl Palace Heritage", PlaceType.HOTEL.value, 26.9300, 75.8350, 94, 2800,
               price_range="₹2000-6000", phone="+91-141-2373996",
               tags=["heritage", "budget-luxury", "friendly"])
    # Emergency
    make_place("jaipur", "SMS Hospital Jaipur", PlaceType.EMERGENCY.value, 26.9050, 75.8100, phone="+91-141-2566251",
               address="JLN Marg, Jaipur, Rajasthan")
    make_place("jaipur", "Jaipur Police Station", PlaceType.EMERGENCY.value, 26.9120, 75.7870, phone="+91-141-2744000",
               address="Police Headquarters, Jaipur")

    # ── Goa ─────────────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("goa", "Baga Beach", PlaceType.TOURIST_SPOT.value, 15.5550, 73.7510, 88, 52000,
               tags=["beach", "party", "water-sports"])
    make_place("goa", "Dudhsagar Falls", PlaceType.VIEWPOINT.value, 15.3140, 74.3230, 92, 18000,
               tags=["waterfall", "trek", "nature"])
    make_place("goa", "Fort Aguada", PlaceType.TOURIST_SPOT.value, 15.4960, 73.7970, 86, 14000,
               tags=["fort", "history", "lighthouse"])
    make_place("goa", "Anjuna Flea Market", PlaceType.TOURIST_SPOT.value, 15.5730, 73.7440, 84, 11000,
               tags=["market", "shopping", "hippie"])
    make_place("goa", "Palolem Beach", PlaceType.TOURIST_SPOT.value, 15.0100, 74.0270, 94, 8500,
               tags=["beach", "serene", "sunset"])
    # Food
    make_place("goa", "Fisherman's Wharf", PlaceType.RESTAURANT.value, 15.5000, 73.8100, 90, 9200,
               price_range="₹1000-2500", diet_tags=["HALAL"],
               tags=["seafood", "goan", "river-view"])
    make_place("goa", "Gunpowder", PlaceType.RESTAURANT.value, 15.4900, 73.8300, 92, 3800,
               price_range="₹600-1500", diet_tags=["VEGAN", "PURE_VEG"],
               tags=["south-indian", "organic", "fusion"])
    make_place("goa", "Vinayak Family Restaurant", PlaceType.RESTAURANT.value, 15.5200, 73.7800, 86, 4500,
               price_range="₹300-800", diet_tags=["PURE_VEG", "JAIN"],
               tags=["family", "goan", "value"])
    make_place("goa", "Zeebop", PlaceType.RESTAURANT.value, 15.0150, 74.0300, 88, 3200,
               price_range="₹800-2000", diet_tags=["HALAL"],
               tags=["seafood", "beach-shack", "sunset"])
    make_place("goa", "Artjuna Cafe", PlaceType.CAFE.value, 15.5700, 73.7400, 94, 2100,
               price_range="₹400-1000", diet_tags=["VEGAN"],
               tags=["cafe", "organic", "art", "workshop"])
    # Hotels
    make_place("goa", "Taj Fort Aguada", PlaceType.HOTEL.value, 15.4950, 73.8000, 92, 4500,
               price_range="₹15000-40000", phone="+91-832-6645888", is_partner=True,
               tags=["luxury", "beach", "heritage"])
    make_place("goa", "W Goa", PlaceType.HOTEL.value, 15.5600, 73.7500, 90, 3200,
               price_range="₹12000-35000", phone="+91-832-3359999",
               tags=["luxury", "party", "resort"])
    make_place("goa", "Lazy Cabanas", PlaceType.HOMESTAY.value, 15.0050, 74.0250, 96, 650,
               price_range="₹2000-5000", phone="+91-98765-09876",
               tags=["boutique", "beachfront", "relaxed"])
    # Emergency
    make_place("goa", "Goa Medical College", PlaceType.EMERGENCY.value, 15.4200, 73.8200, phone="+91-832-2492800",
               address="Bambolim, Goa")
    make_place("goa", "Calangute Police Station", PlaceType.EMERGENCY.value, 15.5450, 73.7550, phone="+91-832-2278260",
               address="Calangute, Goa")

    # ── Udaipur ─────────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("udaipur", "City Palace", PlaceType.TOURIST_SPOT.value, 24.5760, 73.6830, 94, 35000,
               tags=["palace", "museum", "lake-view"])
    make_place("udaipur", "Lake Pichola", PlaceType.TOURIST_SPOT.value, 24.5700, 73.6790, 92, 28000,
               tags=["lake", "boat-ride", "romantic"])
    make_place("udaipur", "Jag Mandir", PlaceType.TOURIST_SPOT.value, 24.5680, 73.6760, 88, 9500,
               tags=["palace", "island", "architecture"])
    make_place("udaipur", "Sajjangarh Fort", PlaceType.VIEWPOINT.value, 24.6000, 73.6500, 90, 12000,
               tags=["fort", "sunset", "panoramic"])
    make_place("udaipur", "Fateh Sagar Lake", PlaceType.TOURIST_SPOT.value, 24.5900, 73.6700, 86, 18000,
               tags=["lake", "promenade", "sunset"])
    # Food
    make_place("udaipur", "Ambrai Restaurant", PlaceType.RESTAURANT.value, 24.5750, 73.6820, 94, 8500,
               price_range="₹1000-2500", tags=["lake-view", "fine-dining", "romantic"])
    make_place("udaipur", "Upre", PlaceType.RESTAURANT.value, 24.5730, 73.6840, 90, 4200,
               price_range="₹600-1500", diet_tags=["VEGAN"],
               tags=["rooftop", "lake-view", "multicuisine"])
    make_place("udaipur", "Natraj Dining Hall", PlaceType.RESTAURANT.value, 24.5800, 73.6880, 86, 12000,
               price_range="₹200-400", diet_tags=["PURE_VEG", "JAIN"],
               tags=["thali", "traditional", "value"])
    make_place("udaipur", "Jaiwana Haveli Roof Top", PlaceType.RESTAURANT.value, 24.5770, 73.6850, 92, 3800,
               price_range="₹500-1200", tags=["rooftop", "heritage", "lake-view"])
    make_place("udaipur", "Millets of Mewar", PlaceType.CAFE.value, 24.5780, 73.6900, 88, 1800,
               price_range="₹300-800", diet_tags=["VEGAN", "PURE_VEG"],
               tags=["organic", "healthy", "millets"])
    # Hotels
    make_place("udaipur", "Taj Lake Palace", PlaceType.HOTEL.value, 24.5750, 73.6770, 98, 3200,
               price_range="₹30000-80000", phone="+91-294-2428800", is_partner=True,
               tags=["palace", "luxury", "iconic", "lake"])
    make_place("udaipur", "Fateh Garh", PlaceType.HOTEL.value, 24.6050, 73.6600, 90, 2800,
               price_range="₹5000-15000", phone="+91-294-2431010",
               tags=["heritage", "fort", "sunset-view"])
    make_place("udaipur", "Mewar Haveli", PlaceType.HOTEL.value, 24.5820, 73.6920, 86, 4500,
               price_range="₹2000-6000", phone="+91-294-2522588",
               tags=["heritage", "mid-range", "city-view"])
    # Emergency
    make_place("udaipur", "Maharana Bhupal Hospital", PlaceType.EMERGENCY.value, 24.5850, 73.7100, phone="+91-294-2528000",
               address="Bansi Road, Udaipur, Rajasthan")
    make_place("udaipur", "Udaipur Police Station", PlaceType.EMERGENCY.value, 24.5790, 73.6800, phone="+91-294-2411100",
               address="Cheerwa Fatak, Udaipur")

    # ── Kasol ───────────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("kasol", "Kheer Ganga Trek", PlaceType.TREK.value, 32.0600, 77.4000, 94, 4800,
               tags=["trek", "hot-springs", "scenic"])
    make_place("kasol", "Manikaran Sahib", PlaceType.TOURIST_SPOT.value, 32.0200, 77.3500, 90, 6500,
               tags=["gurudwara", "hot-springs", "spiritual"])
    make_place("kasol", "Parvati River Banks", PlaceType.VIEWPOINT.value, 32.0080, 77.3120, 88, 3200,
               tags=["river", "camping", "nature"])
    make_place("kasol", "Tosh Village", PlaceType.VIEWPOINT.value, 32.0400, 77.4200, 92, 2800,
               tags=["village", "trek", "panoramic"])
    make_place("kasol", "Pulga Village", PlaceType.VIEWPOINT.value, 32.0450, 77.4350, 86, 1500,
               tags=["village", "offbeat", "trek"])
    # Food
    make_place("kasol", "Evergreen Cafe", PlaceType.CAFE.value, 32.0090, 77.3140, 90, 2800,
               price_range="₹200-600", diet_tags=["VEGAN", "PURE_VEG"],
               tags=["cafe", "organic", "river-view"])
    make_place("kasol", "Moon Dance Cafe", PlaceType.CAFE.value, 32.0100, 77.3160, 92, 3400,
               price_range="₹300-800", tags=["cafe", "ambient", "multicuisine"])
    make_place("kasol", "Jimi's Italian Kitchen", PlaceType.CAFE.value, 32.0110, 77.3180, 88, 1800,
               price_range="₹400-1000", diet_tags=["VEGAN"], tags=["italian", "wood-fired", "cozy"])
    make_place("kasol", "The Tibetan Kitchen", PlaceType.RESTAURANT.value, 32.0070, 77.3100, 86, 1200,
               price_range="₹200-500", diet_tags=["HALAL"], tags=["tibetan", "momos", "thukpa"])
    make_place("kasol", "Sunny's Cafe", PlaceType.CAFE.value, 32.0120, 77.3150, 84, 900,
               price_range="₹150-400", diet_tags=["PURE_VEG"], tags=["cafe", "budget", "friendly"])
    # Hotels
    make_place("kasol", "Kasol Inn", PlaceType.HOTEL.value, 32.0100, 77.3130, 84, 1800,
               price_range="₹1500-3500", phone="+91-1902-226033",
               tags=["budget", "central"])
    make_place("kasol", "Alpine Guest House", PlaceType.HOMESTAY.value, 32.0130, 77.3170, 88, 650,
               price_range="₹800-2000", phone="+91-98160-54321",
               tags=["guesthouse", "river-view", "cozy"])
    make_place("kasol", "Parvati Kuteer", PlaceType.HOMESTAY.value, 32.0060, 77.3110, 92, 320,
               price_range="₹600-1500", phone="+91-97360-12345",
               tags=["homestay", "budget", "friendly"])
    # Emergency
    make_place("kasol", "Bhuntar Community Health Centre", PlaceType.EMERGENCY.value, 31.9200, 77.1500, phone="+91-1902-265033",
               address="Bhuntar, Kullu, Himachal Pradesh")
    make_place("kasol", "Kasol Police Post", PlaceType.EMERGENCY.value, 32.0090, 77.3130, phone="+91-1902-226022",
               address="Kasol, Himachal Pradesh")

    # ── Spiti Valley ────────────────────────────────────────────────────────────
    # Tourist spots
    make_place("spiti-valley", "Key Monastery", PlaceType.TOURIST_SPOT.value, 32.2400, 78.0200, 94, 8500,
               tags=["monastery", "buddhist", "architecture"])
    make_place("spiti-valley", "Chandratal Lake", PlaceType.VIEWPOINT.value, 32.4700, 77.6200, 96, 4200,
               tags=["lake", "moon-lake", "trek", "high-altitude"])
    make_place("spiti-valley", "Pin Valley National Park", PlaceType.TOURIST_SPOT.value, 32.0500, 77.9000, 90, 1800,
               tags=["national-park", "wildlife", "trek"])
    make_place("spiti-valley", "Dhankar Monastery", PlaceType.TOURIST_SPOT.value, 32.1200, 78.0700, 88, 3500,
               tags=["monastery", "cliff", "heritage"])
    make_place("spiti-valley", "Kaza Village", PlaceType.TOURIST_SPOT.value, 32.2150, 78.0800, 86, 2800,
               tags=["village", "culture", "base-camp"])
    # Food
    make_place("spiti-valley", "The Himalayan Cafe", PlaceType.CAFE.value, 32.2140, 78.0780, 88, 1200,
               price_range="₹200-500", diet_tags=["PURE_VEG", "VEGAN"],
               tags=["cafe", "organic", "local"])
    make_place("spiti-valley", "Sol Cafe", PlaceType.CAFE.value, 32.2160, 78.0820, 90, 800,
               price_range="₹250-600", diet_tags=["VEGAN", "PURE_VEG"],
               tags=["cafe", "cozy", "wifi"])
    make_place("spiti-valley", "Spiti Organic Kitchen", PlaceType.RESTAURANT.value, 32.2130, 78.0750, 86, 450,
               price_range="₹200-500", diet_tags=["PURE_VEG"], tags=["organic", "local", "healthy"])
    make_place("spiti-valley", "Mud House Restaurant", PlaceType.RESTAURANT.value, 32.2150, 78.0800, 84, 600,
               price_range="₹150-400", diet_tags=["PURE_VEG"], tags=["traditional", "mud-house", "thali"])
    make_place("spiti-valley", "Norling Restaurant", PlaceType.RESTAURANT.value, 32.2170, 78.0830, 82, 350,
               price_range="₹200-500", diet_tags=["PURE_VEG"], tags=["tibetan", "noodle", "budget"])
    # Hotels
    make_place("spiti-valley", "Spiti Heritage Hotel", PlaceType.HOTEL.value, 32.2150, 78.0790, 86, 1200,
               price_range="₹2000-5000", phone="+91-98050-12345", is_partner=True,
               tags=["heritage", "warm", "traditional"])
    make_place("spiti-valley", "Himalayan Homestay", PlaceType.HOMESTAY.value, 32.2200, 78.0850, 94, 180,
               price_range="₹800-2000", phone="+91-94180-67890",
               tags=["homestay", "authentic", "family"])
    make_place("spiti-valley", "Kaza Grand", PlaceType.HOTEL.value, 32.2160, 78.0810, 82, 850,
               price_range="₹1500-3500", phone="+91-98050-09876",
               tags=["budget", "central", "convenient"])
    # Emergency
    make_place("spiti-valley", "Kaza Community Health Centre", PlaceType.EMERGENCY.value, 32.2180, 78.0840, phone="+91-98050-11200",
               address="Kaza, Spiti Valley, Himachal Pradesh")
    make_place("spiti-valley", "Spiti Police Station", PlaceType.EMERGENCY.value, 32.2140, 78.0760, phone="+91-98050-11222",
               address="Kaza, Spiti Valley, Himachal Pradesh")

    await session.flush()
    return all_places


async def _create_food_verifications(session: AsyncSession, users: dict[str, User], all_places: list[Place]):
    food_places = [p for p in all_places if p.type in ("RESTAURANT", "CAFE")]
    place_map = {p.slug: p for p in food_places}
    admin = users["admin@tripsova.com"]
    traveller = users["traveller@tripsova.com"]
    partner = users["partner@tripsova.com"]

    verifications = [
        FoodVerification(place_id=place_map["sharma-ji-ka-dhaba"].id, user_id=admin.id, diet_tag="PURE_VEG",
                         note="Authentic Himachali dhaba, strictly vegetarian. No onion-garlic option available.", confidence_score=0.95,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["cafe-1947"].id, user_id=traveller.id, diet_tag="VEGAN",
                         note="Great vegan options. Tofu-based dishes and plant-based milks available.", confidence_score=0.88,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["chotiwala-restaurant"].id, user_id=admin.id, diet_tag="PURE_VEG",
                         note="Famous pure-veg restaurant in Rishikesh. Been serving since 1950s.", confidence_score=0.92,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["the-sitting-elephant"].id, user_id=traveller.id, diet_tag="VEGAN",
                         note="Organic vegan cafe with river view. Handmade pastas and kombucha.", confidence_score=0.90,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["lmb"].id, user_id=admin.id, diet_tag="JAIN",
                         note="LMB has dedicated Jain thali. No root vegetables. Highly recommended.", confidence_score=0.96,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["rawat-misthan-bhandar"].id, user_id=traveller.id, diet_tag="PURE_VEG",
                         note="Famous for ghewar and traditional Rajasthani sweets. Pure vegetarian.", confidence_score=0.85,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["gunpowder"].id, user_id=traveller.id, diet_tag="VEGAN",
                         note="Excellent South Indian vegan options. The gunpowder chutney is a must-try.", confidence_score=0.91,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["artjuna-cafe"].id, user_id=admin.id, diet_tag="VEGAN",
                         note="Lovely vegan cafe in Anjuna. Their smoothie bowls are amazing.", confidence_score=0.87,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["ambrai-restaurant"].id, user_id=traveller.id, diet_tag="HALAL",
                         note="Can accommodate halal requests. Lake view dining experience.", confidence_score=0.78,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["millets-of-mewar"].id, user_id=traveller.id, diet_tag="VEGAN",
                         note="100% plant-based menu. Millets and locally sourced ingredients.", confidence_score=0.94,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["evergreen-cafe"].id, user_id=admin.id, diet_tag="PURE_VEG",
                         note="Riverside cafe in Kasol with pure veg Indian and Israeli dishes.", confidence_score=0.83,
                         verified_at=datetime.now(timezone.utc)),
        FoodVerification(place_id=place_map["the-himalayan-cafe"].id, user_id=partner.id, diet_tag="PURE_VEG",
                         note="One of the few cafes in Spiti with guaranteed pure veg kitchen.", confidence_score=0.89,
                         verified_at=datetime.now(timezone.utc)),
    ]
    session.add_all(verifications)
    await session.flush()


async def _create_feed_posts(session: AsyncSession, users: dict[str, User], destinations: dict[str, Destination]):
    admin = users["admin@tripsova.com"]
    traveller = users["traveller@tripsova.com"]
    partner = users["partner@tripsova.com"]

    posts = [
        FeedPost(
            destination_id=destinations["manali"].id, user_id=admin.id,
            content="Just returned from Solang Valley! The paragliding was absolutely breathtaking. Soaring above the snow-capped peaks is an experience of a lifetime. Highly recommend the winter session.",
            crowd_level="High", weather_note="Clear skies, 8°C", safety_note="Very safe with trained instructors",
            helpful_count=45, report_count=0, verification_score=0.92,
        ),
        FeedPost(
            destination_id=destinations["manali"].id, user_id=traveller.id,
            content="Hadimba Temple is stunning but gets very crowded by 10 AM. Go early morning around 7 AM to experience the serene vibe without the tourist rush. The cedar forest surrounding it is magical.",
            crowd_level="Very High", weather_note="Pleasant 12°C", safety_note="Watch out for pickpockets in crowds",
            helpful_count=32, report_count=1, verification_score=0.85,
        ),
        FeedPost(
            destination_id=destinations["rishikesh"].id, user_id=traveller.id,
            content="Did the 16km rafting stretch from Shivpuri to Rishikesh. Class 3 and 4 rapids were thrilling! The river was at perfect level in October. Make sure to go with a licensed operator.",
            crowd_level="High", weather_note="Warm 28°C, perfect for rafting",
            safety_note="Always wear a life jacket. Listen to your guide.",
            helpful_count=67, report_count=0, verification_score=0.95,
        ),
        FeedPost(
            destination_id=destinations["rishikesh"].id, user_id=admin.id,
            content="The Ganga Aarti at Triveni Ghat is a spiritual experience that words cannot describe. Reach by 5 PM to get a good spot. The chants and the diyas floating on the river create an ethereal atmosphere.",
            crowd_level="Very High", weather_note="Pleasant 24°C", safety_note="Secure your valuables",
            helpful_count=28, report_count=0, verification_score=0.88,
        ),
        FeedPost(
            destination_id=destinations["jaipur"].id, user_id=traveller.id,
            content="Amber Fort is massive! Spend at least 3-4 hours exploring the entire complex. The light and sound show in the evening is fantastic. Skip the elephant ride and take the jeep instead.",
            crowd_level="Very High", price_note="Entry ₹500 for foreigners, ₹50 for Indians",
            helpful_count=53, report_count=2, verification_score=0.81,
        ),
        FeedPost(
            destination_id=destinations["jaipur"].id, user_id=admin.id,
            content="LMB's thali is the best in Jaipur! Unlimited rajasthani dishes served with warmth. Dal Baati Churma and Gatte ki Sabzi were exceptional. Must visit for every food lover.",
            crowd_level="High", price_note="Thali ₹800 per person",
            helpful_count=41, report_count=0, verification_score=0.93,
            food_note="Pure vegetarian, Jain option available",
        ),
        FeedPost(
            destination_id=destinations["goa"].id, user_id=traveller.id,
            content="Palolem Beach in South Goa is heaven on earth. Unlike the crowded north beaches, this one is calm, clean, and perfect for swimming. Stay at a beach shack for the full experience.",
            crowd_level="Medium", weather_note="Hot 32°C, sea breeze makes it pleasant",
            safety_note="Safe for swimming during the day",
            helpful_count=89, report_count=0, verification_score=0.96,
        ),
        FeedPost(
            destination_id=destinations["goa"].id, user_id=admin.id,
            content="Dudhsagar Falls trek is not for the faint-hearted. The 4-hour trek through the jungle is challenging but rewarding. The waterfall at the end is magnificent. Best visited during monsoon.",
            crowd_level="Medium", price_note="Entry ₹50 + guide ₹1000 per group",
            safety_note="Slippery trails. Wear good trekking shoes.",
            helpful_count=22, report_count=1, verification_score=0.76,
        ),
        FeedPost(
            destination_id=destinations["udaipur"].id, user_id=traveller.id,
            content="Sunset from Sajjangarh Fort is the most beautiful thing I have ever seen. The entire city of Udaipur with its lakes turns golden. Reach by 4:30 PM to enjoy the view and explore the fort.",
            crowd_level="High", weather_note="Pleasant 26°C",
            helpful_count=74, report_count=0, verification_score=0.94,
        ),
        FeedPost(
            destination_id=destinations["udaipur"].id, user_id=admin.id,
            content="Dinner at Ambrai with Lake Pichola view and the City Palace lit up in the background. Undoubtedly the most romantic restaurant setting in India. Book a table by the railing at least 3 days in advance.",
            crowd_level="High", price_note="₹2000-3000 for two",
            helpful_count=56, report_count=0, verification_score=0.91,
            food_note="Halal and vegan options available on request",
        ),
        FeedPost(
            destination_id=destinations["kasol"].id, user_id=traveller.id,
            content="Kheer Ganga trek is a must-do from Kasol. The hot water springs at the top after a 10km trek are pure bliss. Stay overnight at the guesthouse up there for the sunrise view.",
            crowd_level="Medium", weather_note="Cool 15°C at top",
            safety_note="Trek with a guide. Trail can be confusing in parts.",
            helpful_count=38, report_count=0, verification_score=0.87,
        ),
        FeedPost(
            destination_id=destinations["kasol"].id, user_id=admin.id,
            content="Moon Dance Cafe by the Parvati river is the perfect place to unwind. Their Israeli breakfast and fresh juices are fantastic. The vibe is incredibly chill. Works perfectly for digital nomads.",
            crowd_level="Medium", price_note="₹400-800 per person",
            helpful_count=19, report_count=0, verification_score=0.82,
        ),
        FeedPost(
            destination_id=destinations["spiti-valley"].id, user_id=traveller.id,
            content="Chandratal Lake at 4300m is worth every bit of the arduous journey. The crystal clear water reflecting the surrounding mountains creates a surreal landscape. Camping here under the stars is unforgettable.",
            crowd_level="Low", weather_note="Cold 5°C even in summer",
            safety_note="High altitude. Take Diamox. Acclimatize in Kaza for 2 days.",
            helpful_count=95, report_count=0, verification_score=0.97,
        ),
        FeedPost(
            destination_id=destinations["spiti-valley"].id, user_id=admin.id,
            content="Key Monastery is one of the oldest Buddhist monasteries in the world. The murals and thangkas inside are priceless. Photography is not allowed inside but the exterior views of the Spiti valley are breathtaking.",
            crowd_level="Low", weather_note="Cool 8°C, windy",
            helpful_count=33, report_count=0, verification_score=0.89,
        ),
        FeedPost(
            destination_id=destinations["goa"].id, user_id=partner.id,
            content="Organized a guided tour of South Goa for a group of 10. We visited the spice plantations, Dudhsagar, and ended at Palolem. The local seafood thali was a hit! DM me for custom itineraries.",
            crowd_level="Medium", price_note="Custom package ₹3500 per person",
            helpful_count=15, report_count=0, verification_score=0.72,
        ),
        FeedPost(
            destination_id=destinations["manali"].id, user_id=partner.id,
            content="Rohtang Pass was open till early November this year! Unbelievable snow. Got some amazing photos for my travel blog. The road is narrow and winding so hire an experienced driver.",
            crowd_level="Very High", weather_note="-2°C with snowfall",
            safety_note="Carry oxygen if prone to altitude sickness",
            helpful_count=47, report_count=0, verification_score=0.84,
        ),
        FeedPost(
            destination_id=destinations["jaipur"].id, user_id=traveller.id,
            content="Bartering at Johari Bazaar is an art form. I got a beautiful Kundan necklace for 40% of the asking price. Pro tip: Act disinterested and be willing to walk away. The best deals are on weekdays.",
            crowd_level="Very High", price_note="Budget ₹2000-10000 for jewellery",
            safety_note="Watch out for touts. Stick to reputable shops.",
            helpful_count=61, report_count=3, verification_score=0.79,
        ),
    ]
    session.add_all(posts)
    await session.flush()


async def _create_trip_pods(session: AsyncSession, users: dict[str, User], destinations: dict[str, Destination]):
    admin = users["admin@tripsova.com"]
    traveller = users["traveller@tripsova.com"]
    partner = users["partner@tripsova.com"]

    pod1 = TripPod(
        creator_id=admin.id,
        destination_id=destinations["manali"].id,
        title="Manali Adventure Trek",
        start_date=datetime(2026, 7, 15, tzinfo=timezone.utc),
        end_date=datetime(2026, 7, 22, tzinfo=timezone.utc),
        budget=25000.0,
        travel_style={"preference": "adventure", "pace": "moderate"},
        max_members=5,
        gender_preference="ANY",
        verification_required=True,
        status=TripPodStatus.OPEN.value,
    )
    pod2 = TripPod(
        creator_id=traveller.id,
        destination_id=destinations["goa"].id,
        title="Goa Beach Bums",
        start_date=datetime(2026, 11, 1, tzinfo=timezone.utc),
        end_date=datetime(2026, 11, 7, tzinfo=timezone.utc),
        budget=30000.0,
        travel_style={"preference": "party", "pace": "relaxed"},
        max_members=4,
        gender_preference="ANY",
        verification_required=False,
        status=TripPodStatus.FULL.value,
    )
    pod3 = TripPod(
        creator_id=partner.id,
        destination_id=destinations["spiti-valley"].id,
        title="Spiti Valley Road Trip",
        start_date=datetime(2026, 8, 10, tzinfo=timezone.utc),
        end_date=datetime(2026, 8, 20, tzinfo=timezone.utc),
        budget=45000.0,
        travel_style={"preference": "offbeat", "pace": "moderate"},
        max_members=6,
        gender_preference="ANY",
        verification_required=True,
        status=TripPodStatus.OPEN.value,
    )
    session.add_all([pod1, pod2, pod3])
    await session.flush()

    members = [
        TripPodMember(trip_pod_id=pod1.id, user_id=traveller.id, status=TripPodMemberStatus.APPROVED.value),
        TripPodMember(trip_pod_id=pod1.id, user_id=partner.id, status=TripPodMemberStatus.REQUESTED.value),
        TripPodMember(trip_pod_id=pod2.id, user_id=admin.id, status=TripPodMemberStatus.APPROVED.value),
        TripPodMember(trip_pod_id=pod2.id, user_id=partner.id, status=TripPodMemberStatus.APPROVED.value),
        TripPodMember(trip_pod_id=pod3.id, user_id=admin.id, status=TripPodMemberStatus.REQUESTED.value),
        TripPodMember(trip_pod_id=pod3.id, user_id=traveller.id, status=TripPodMemberStatus.APPROVED.value),
    ]
    session.add_all(members)
    await session.flush()


async def _create_partners(session: AsyncSession, users: dict[str, User], destinations: dict[str, Destination]):
    partner_user = users["partner@tripsova.com"]
    admin = users["admin@tripsova.com"]

    p1 = Partner(
        user_id=admin.id,
        name="Green Valley Tours",
        type=PartnerType.GUIDE.value,
        phone="+91-98765-11111",
        email="greenvalley@example.com",
        location="Manali, Himachal Pradesh",
        verification_status="ID_VERIFIED",
        trust_score=94.0,
        response_rate=98.5,
        cancellation_rate=1.2,
    )
    p2 = Partner(
        user_id=partner_user.id,
        name="Himalayan Homestays",
        type=PartnerType.HOMESTAY.value,
        phone="+91-98765-22222",
        email="himalayan@example.com",
        location="Kasol, Himachal Pradesh",
        verification_status="PHONE_VERIFIED",
        trust_score=82.0,
        response_rate=92.0,
        cancellation_rate=3.5,
    )
    p3 = Partner(
        user_id=None,
        name="Spice Route Cafe",
        type=PartnerType.CAFE.value,
        phone="+91-98765-33333",
        email="spiceroute@example.com",
        location="Jaipur, Rajasthan",
        verification_status="EMAIL_VERIFIED",
        trust_score=76.0,
        response_rate=85.0,
        cancellation_rate=5.0,
    )
    session.add_all([p1, p2, p3])
    await session.flush()


async def _create_listings(session: AsyncSession, all_places: list[Place]):
    partner_places = [p for p in all_places if p.is_partner_listed]
    result = await session.execute(select(Partner))
    partners = result.scalars().all()
    if not partners:
        return
    for i, place in enumerate(partner_places):
        partner = partners[i % len(partners)]
        listing = Listing(
            partner_id=partner.id,
            place_id=place.id,
            destination_id=place.destination_id,
            title=f"Official Booking: {place.name}",
            description=f"Book your stay/experience at {place.name} through Tripova.",
            price=5000.0,
            currency="INR",
            status="ACTIVE",
        )
        session.add(listing)
    await session.flush()


async def _create_trust_events(session: AsyncSession, users: dict[str, User]):
    admin = users["admin@tripsova.com"]
    traveller = users["traveller@tripsova.com"]
    partner = users["partner@tripsova.com"]

    events = [
        TrustEvent(entity_type="USER", entity_id=str(admin.id), event_type="ACCOUNT_CREATED", score_delta=10.0,
                   reason="Initial account creation"),
        TrustEvent(entity_type="USER", entity_id=str(admin.id), event_type="ID_VERIFIED", score_delta=30.0,
                   reason="Government ID verified successfully"),
        TrustEvent(entity_type="USER", entity_id=str(admin.id), event_type="FEED_POST_HELPFUL", score_delta=5.0,
                   reason="Feed post received 45 upvotes"),
        TrustEvent(entity_type="USER", entity_id=str(traveller.id), event_type="ACCOUNT_CREATED", score_delta=10.0,
                   reason="Initial account creation"),
        TrustEvent(entity_type="USER", entity_id=str(traveller.id), event_type="EMAIL_VERIFIED", score_delta=15.0,
                   reason="Email verified"),
        TrustEvent(entity_type="USER", entity_id=str(traveller.id), event_type="FOOD_VERIFIED", score_delta=8.0,
                   reason="Verified food at 3 restaurants"),
        TrustEvent(entity_type="USER", entity_id=str(partner.id), event_type="ACCOUNT_CREATED", score_delta=10.0,
                   reason="Initial account creation"),
        TrustEvent(entity_type="USER", entity_id=str(partner.id), event_type="PHONE_VERIFIED", score_delta=10.0,
                   reason="Phone number verified via OTP"),
        TrustEvent(entity_type="USER", entity_id=str(partner.id), event_type="PARTNER_LISTING_ADDED", score_delta=12.0,
                   reason="Added first partner listing"),
    ]
    session.add_all(events)
    await session.flush()


async def seed():
    print("Creating database engine...")
    async with engine.begin() as conn:
        print("Dropping all tables...")
        await conn.run_sync(Base.metadata.drop_all)
        print("Creating all tables...")
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        try:
            print("Seeding users...")
            users = await _create_users(session)
            print(f"  Created {len(users)} users")

            print("Seeding destinations...")
            destinations = await _create_destinations(session)
            print(f"  Created {len(destinations)} destinations")

            print("Seeding places...")
            all_places = await _create_all_places(session, destinations)
            print(f"  Created {len(all_places)} places")

            print("Seeding food verifications...")
            await _create_food_verifications(session, users, all_places)

            print("Seeding feed posts...")
            await _create_feed_posts(session, users, destinations)

            print("Seeding trip pods...")
            await _create_trip_pods(session, users, destinations)

            print("Seeding partners...")
            await _create_partners(session, users, destinations)

            print("Seeding listings...")
            await _create_listings(session, all_places)

            print("Seeding trust events...")
            await _create_trust_events(session, users)

            await session.commit()
            print("\nDatabase seeded successfully!")
        except Exception as e:
            await session.rollback()
            print(f"Error during seeding: {e}")
            raise
        finally:
            await session.close()

    await engine.dispose()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(seed())
