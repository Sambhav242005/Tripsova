import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Float, Integer, ForeignKey, Text, Boolean, JSON
from sqlalchemy import Uuid as UUID

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    role = Column(String(50), default="USER", index=True)
    verification_status = Column(String(50), default="UNVERIFIED")
    trust_score = Column(Float, default=0.0)
    travel_style = Column(JSON, nullable=True)
    diet_preference = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Destination(Base):
    __tablename__ = "destinations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    city = Column(String(255), nullable=True)
    state = Column(String(255), nullable=True)
    country = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    best_time_to_visit = Column(String(500), nullable=True)
    average_budget_min = Column(Float, nullable=True)
    average_budget_max = Column(Float, nullable=True)
    safety_summary = Column(String(1000), nullable=True)
    weather_summary = Column(String(500), nullable=True)
    crowd_level = Column(String(50), nullable=True)
    internet_quality = Column(String(50), nullable=True)
    offline_available = Column(Boolean, default=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    photos = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    data_version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Place(Base):
    __tablename__ = "places"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(255), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)
    address = Column(Text, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    geom_wkt = Column(Text, nullable=True)
    price_range = Column(String(50), nullable=True)
    opening_hours = Column(JSON, nullable=True)
    photos = Column(JSON, nullable=True)
    tags = Column(JSON, nullable=True)
    diet_tags = Column(JSON, nullable=True)
    phone = Column(String(50), nullable=True)
    website = Column(String(500), nullable=True)
    external_rating = Column(Float, nullable=True)
    external_review_count = Column(Integer, nullable=True)
    external_rating_source = Column(String(100), nullable=True)
    popularity_score = Column(Float, default=0.0, index=True)
    confidence_score = Column(Float, default=0.0)
    tripova_score = Column(Float, default=0.0, index=True)
    trust_score = Column(Float, default=0.0)
    safety_score = Column(Float, default=0.0)
    food_score = Column(Float, default=0.0)
    source = Column(String(100), nullable=True)
    source_place_id = Column(String(255), nullable=True)
    is_partner_listed = Column(Boolean, default=False)
    is_offline_available = Column(Boolean, default=False)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PlaceSource(Base):
    __tablename__ = "place_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    place_id = Column(UUID(as_uuid=True), ForeignKey("places.id"), nullable=False, index=True)
    source_name = Column(String(100), nullable=False)
    source_place_id = Column(String(255), nullable=True)
    rating = Column(Float, nullable=True)
    review_count = Column(Integer, nullable=True)
    url = Column(String(500), nullable=True)
    raw_category = Column(String(255), nullable=True)
    last_fetched_at = Column(DateTime(timezone=True), nullable=True)
    confidence = Column(Float, default=0.0)


class FoodVerification(Base):
    __tablename__ = "food_verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    place_id = Column(UUID(as_uuid=True), ForeignKey("places.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    diet_tag = Column(String(50), nullable=False, index=True)
    note = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.0)
    media = Column(JSON, nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class FeedPost(Base):
    __tablename__ = "feed_posts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True, index=True)
    place_id = Column(UUID(as_uuid=True), ForeignKey("places.id"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    media = Column(JSON, nullable=True)
    crowd_level = Column(String(50), nullable=True)
    weather_note = Column(String(500), nullable=True)
    safety_note = Column(String(500), nullable=True)
    price_note = Column(String(500), nullable=True)
    food_note = Column(String(500), nullable=True)
    helpful_count = Column(Integer, default=0)
    report_count = Column(Integer, default=0)
    verification_score = Column(Float, default=0.0)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True)
    title = Column(String(255), nullable=True)
    trip_type = Column(String(50), nullable=True)
    days = Column(Integer, nullable=True)
    budget = Column(Float, nullable=True)
    people_count = Column(Integer, nullable=True)
    travel_style = Column(JSON, nullable=True)
    diet_preference = Column(JSON, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    offline_required = Column(Boolean, default=False)
    generated_plan = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Journey(Base):
    """A planned journey (auto-mode origin→destination), saved so the traveller can
    reopen it later or let it compute in the background.

    ``status`` is ``ready`` for a synchronously-planned journey, or ``pending`` →
    ``ready``/``failed`` for one running as a background job. ``result`` holds the full
    journey_planner output (legs, cost, route) so reopening needs no recompute.
    """

    __tablename__ = "journeys"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    origin = Column(String(255), nullable=False)
    destination = Column(String(255), nullable=False)
    round_trip = Column(Boolean, default=False)
    people_count = Column(Integer, default=1)
    budget = Column(Float, nullable=True)
    departure_time = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="ready", index=True)  # pending | ready | failed
    result = Column(JSON, nullable=True)
    error = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class OfflinePack(Base):
    __tablename__ = "offline_packs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id"), nullable=True)
    title = Column(String(255), nullable=True)
    pack_json = Column(JSON, nullable=True)
    data_version = Column(Integer, default=1)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)
    size_bytes = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class OfflineSyncLog(Base):
    __tablename__ = "offline_sync_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    client_last_synced_at = Column(DateTime(timezone=True), nullable=True)
    local_changes = Column(JSON, nullable=True)
    accepted_changes = Column(JSON, nullable=True)
    conflicts = Column(JSON, nullable=True)
    server_data_version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TripPod(Base):
    __tablename__ = "trip_pods"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True)
    title = Column(String(255), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    budget = Column(Float, nullable=True)
    travel_style = Column(JSON, nullable=True)
    max_members = Column(Integer, default=5)
    gender_preference = Column(String(50), nullable=True)
    verification_required = Column(Boolean, default=False)
    status = Column(String(50), default="OPEN", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TripPodMember(Base):
    __tablename__ = "trip_pod_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_pod_id = Column(UUID(as_uuid=True), ForeignKey("trip_pods.id"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(50), default="REQUESTED")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Partner(Base):
    __tablename__ = "partners"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False, index=True)
    phone = Column(String(20), nullable=False)
    email = Column(String(255), nullable=True)
    location = Column(String(500), nullable=True)
    verification_status = Column(String(50), default="UNVERIFIED")
    trust_score = Column(Float, default=0.0)
    response_rate = Column(Float, nullable=True)
    cancellation_rate = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Listing(Base):
    __tablename__ = "listings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    partner_id = Column(UUID(as_uuid=True), ForeignKey("partners.id"), nullable=False, index=True)
    place_id = Column(UUID(as_uuid=True), ForeignKey("places.id"), nullable=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=True)
    currency = Column(String(10), default="INR")
    availability = Column(JSON, nullable=True)
    photos = Column(JSON, nullable=True)
    status = Column(String(50), default="DRAFT", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    listing_id = Column(UUID(as_uuid=True), ForeignKey("listings.id"), nullable=True)
    partner_id = Column(UUID(as_uuid=True), ForeignKey("partners.id"), nullable=True)
    destination_id = Column(UUID(as_uuid=True), ForeignKey("destinations.id"), nullable=True)
    amount = Column(Float, nullable=True)
    commission_amount = Column(Float, nullable=True)
    currency = Column(String(10), default="INR")
    status = Column(String(50), default="PENDING", index=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    booking_metadata = Column("metadata", JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class DeepReviewQuery(Base):
    __tablename__ = "deep_review_queries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    place_id = Column(UUID(as_uuid=True), ForeignKey("places.id"), nullable=True, index=True)
    query = Column(Text, nullable=True)
    sources_used = Column(JSON, nullable=True)
    summary = Column(Text, nullable=True)
    sentiment = Column(String(50), nullable=True)
    sentiment_score = Column(Float, nullable=True)
    warnings = Column(JSON, nullable=True)
    confidence_score = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime(timezone=True), nullable=True)


class TrustEvent(Base):
    __tablename__ = "trust_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(String(255), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    score_delta = Column(Float, default=0.0)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
