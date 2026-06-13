from enum import Enum as PyEnum


class UserRole(str, PyEnum):
    USER = "USER"
    LOCAL_PARTNER = "LOCAL_PARTNER"
    ADMIN = "ADMIN"


class VerificationStatus(str, PyEnum):
    UNVERIFIED = "UNVERIFIED"
    EMAIL_VERIFIED = "EMAIL_VERIFIED"
    PHONE_VERIFIED = "PHONE_VERIFIED"
    ID_VERIFIED = "ID_VERIFIED"


class PlaceType(str, PyEnum):
    HOTEL = "HOTEL"
    HOMESTAY = "HOMESTAY"
    CAFE = "CAFE"
    RESTAURANT = "RESTAURANT"
    TOURIST_SPOT = "TOURIST_SPOT"
    VIEWPOINT = "VIEWPOINT"
    TREK = "TREK"
    EXPERIENCE = "EXPERIENCE"
    TRANSPORT = "TRANSPORT"
    EMERGENCY = "EMERGENCY"
    FUEL = "FUEL"


class DietTag(str, PyEnum):
    PURE_VEG = "PURE_VEG"
    JAIN = "JAIN"
    VEGAN = "VEGAN"
    HALAL = "HALAL"
    EGGLESS = "EGGLESS"
    NO_ONION_GARLIC = "NO_ONION_GARLIC"


class TripType(str, PyEnum):
    SOLO = "SOLO"
    FRIENDS = "FRIENDS"
    FAMILY = "FAMILY"
    COUPLE = "COUPLE"


class TripPodStatus(str, PyEnum):
    OPEN = "OPEN"
    FULL = "FULL"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class TripPodMemberStatus(str, PyEnum):
    REQUESTED = "REQUESTED"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    LEFT = "LEFT"


class PartnerType(str, PyEnum):
    HOTEL = "HOTEL"
    HOMESTAY = "HOMESTAY"
    CAFE = "CAFE"
    GUIDE = "GUIDE"
    EXPERIENCE_PROVIDER = "EXPERIENCE_PROVIDER"
    CAB_DRIVER = "CAB_DRIVER"


class ListingStatus(str, PyEnum):
    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    REJECTED = "REJECTED"


class BookingStatus(str, PyEnum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    REFUNDED = "REFUNDED"


class SentimentLabel(str, PyEnum):
    POSITIVE = "POSITIVE"
    MIXED = "MIXED"
    NEGATIVE = "NEGATIVE"
    UNKNOWN = "UNKNOWN"
