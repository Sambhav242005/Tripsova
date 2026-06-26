"""
Real flight lookup for FLIGHT legs — provider-agnostic.

The route planner estimates flight legs from distance and speed; it has no idea which
real flight runs a route. This module answers that: given two points (city coords),
it resolves each to its nearest IATA airport (via the OSM hub lookup in ``hubs.py``),
asks a flight-data provider for current flights between them, and returns the one a
traveller would actually take — number, airline, scheduled times, and (when the
provider offers it) an indicative price.

Unlike trains there is **no keyless** flight source, so this is off unless a provider
token is configured. Two interchangeable providers, chosen by ``settings.FLIGHT_PROVIDER``:

  * ``travelpayouts`` — Aviasales data API. Free (affiliate token only), strong India
    coverage, but prices are *cached* from recent searches: indicative, not live seats.
  * ``amadeus``       — Amadeus Self-Service. Real-time, 400+ airlines; OAuth2 key+secret,
    free monthly quota then pay-per-call. Test base has thin non-US/EU data.

Everything degrades to ``None`` (no flight shown, the planner's estimate stands) when
disabled, unconfigured, unreachable, or nothing matches — never a fabricated flight.
Selection is time-aware: the soonest departure at/after the leg's start, like trains.
"""

import logging
import re
import time
from typing import Optional

logger = logging.getLogger("tripsova.flights")

# (provider, o_iata, d_iata, yyyy_mm_dd) -> list[normalised flight dict] | None
_FLIGHT_CACHE: dict[tuple, Optional[list]] = {}
# Cached Amadeus OAuth token: {"value": str, "exp": epoch_seconds}.
_AMADEUS_TOKEN: dict = {}

_IATA_RE = re.compile(r"\(([A-Z]{3})\)\s*$")


def _iata_of(hub: Optional[dict]) -> Optional[str]:
    """Extract the IATA code an OSM airport hub carries in its name ('… (DEL)')."""
    if not hub or not hub.get("name"):
        return None
    m = _IATA_RE.search(hub["name"])
    return m.group(1) if m else None


def _iso_hhmm(value: Optional[str]) -> Optional[str]:
    """ISO-ish datetime/time -> 'HH:MM' (local clock as given); None-safe."""
    if not value:
        return None
    m = re.search(r"T?(\d{1,2}):(\d{2})", str(value))
    if not m:
        return None
    h, mi = int(m.group(1)), int(m.group(2))
    if not (0 <= h <= 23 and 0 <= mi <= 59):
        return None
    return f"{h:02d}:{mi:02d}"


def _hhmm_minutes(hhmm: Optional[str], default: int) -> int:
    if not hhmm:
        return default
    try:
        h, m = hhmm.split(":")
        return int(h) * 60 + int(m)
    except (ValueError, AttributeError):
        return default


def _add_minutes(hhmm: Optional[str], minutes) -> Optional[str]:
    """'HH:MM' + N minutes -> 'HH:MM' (wrapping past midnight); None-safe."""
    base = _hhmm_minutes(hhmm, -1)
    if base < 0 or minutes is None:
        return None
    try:
        total = (base + int(minutes)) % (24 * 60)
    except (ValueError, TypeError):
        return None
    return f"{total // 60:02d}:{total % 60:02d}"


def _select_flight(flights: list[dict], after_minutes: Optional[int]) -> Optional[dict]:
    """The flight a traveller would take: soonest departure at/after ``after_minutes``
    (so an already-departed flight isn't surfaced), tie-broken by price then a shorter
    hop. Falls back to the day's earliest when all have left; cheapest when no time."""
    if not flights:
        return None
    if after_minutes is None:
        return min(flights, key=lambda f: (f.get("price") or 10**12,
                                           _hhmm_minutes(f.get("dep"), 10**9)))
    catchable = [f for f in flights if _hhmm_minutes(f.get("dep"), -1) >= after_minutes]
    pool = catchable or flights
    return min(pool, key=lambda f: (_hhmm_minutes(f.get("dep"), 10**9),
                                    f.get("price") or 10**12))


# ─────────────────────────────── Providers ───────────────────────────────────
# Each provider returns a list of *normalised* flight dicts:
#   {number, airline, dep ("HH:MM"), arr ("HH:MM"), price (float|None), currency}


def _parse_travelpayouts(payload: dict, currency: str) -> list[dict]:
    """Parse a Travelpayouts ``prices_for_dates`` (one-way) response into normalised
    flights. ``data`` is a list of offers; arrival is departure + ``duration_to`` (the
    outbound leg's minutes) — ``return_at`` is the *return trip*, not the arrival."""
    out: list[dict] = []
    if not isinstance(payload, dict) or not payload.get("success", True):
        return out
    data = payload.get("data")
    if not isinstance(data, list):
        return out
    for offer in data:
        if not isinstance(offer, dict):
            continue
        airline = (offer.get("airline") or "").strip() or None
        num = offer.get("flight_number")
        dep = _iso_hhmm(offer.get("departure_at"))
        if not dep:
            continue
        out.append({
            "number": f"{airline} {num}".strip() if num else None,
            "airline": airline,
            "dep": dep,
            "arr": _add_minutes(dep, offer.get("duration_to") or offer.get("duration")),
            "price": float(offer["price"]) if offer.get("price") is not None else None,
            "currency": currency,
            "stops": offer.get("transfers"),
        })
    return out


async def _travelpayouts_lookup(o_iata, d_iata, depart_date, currency, timeout, token, url) -> list[dict]:
    import httpx

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(
            url,
            params={"origin": o_iata, "destination": d_iata, "departure_at": depart_date,
                    "one_way": "true", "sorting": "price", "limit": 30,
                    "currency": currency, "token": token},
            headers={"X-Access-Token": token, "Accept-Encoding": "gzip, deflate"},
        )
        resp.raise_for_status()
        return _parse_travelpayouts(resp.json(), currency)


def _parse_amadeus(payload: dict, currency: str) -> list[dict]:
    """Parse an Amadeus flight-offers response into normalised flights (first segment
    of the first itinerary — the outbound boarding/arrival of each offer)."""
    out: list[dict] = []
    if not isinstance(payload, dict):
        return out
    for offer in payload.get("data") or []:
        itins = offer.get("itineraries") or []
        if not itins:
            continue
        segs = itins[0].get("segments") or []
        if not segs:
            continue
        first, last = segs[0], segs[-1]
        carrier = (first.get("carrierCode") or "").strip() or None
        num = first.get("number")
        dep = _iso_hhmm((first.get("departure") or {}).get("at"))
        arr = _iso_hhmm((last.get("arrival") or {}).get("at"))
        if not dep:
            continue
        price = (offer.get("price") or {}).get("total")
        out.append({
            "number": f"{carrier} {num}".strip() if num else None,
            "airline": carrier,
            "dep": dep,
            "arr": arr,
            "price": float(price) if price is not None else None,
            "currency": (offer.get("price") or {}).get("currency") or currency,
            "stops": max(0, len(segs) - 1),
        })
    return out


async def _amadeus_token(base, key, secret, timeout) -> Optional[str]:
    """Client-credentials OAuth token, cached until ~30s before expiry."""
    now = time.time()
    if _AMADEUS_TOKEN.get("value") and _AMADEUS_TOKEN.get("exp", 0) > now + 30:
        return _AMADEUS_TOKEN["value"]
    import httpx

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{base}/v1/security/oauth2/token",
            data={"grant_type": "client_credentials", "client_id": key, "client_secret": secret},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        resp.raise_for_status()
        body = resp.json()
    token = body.get("access_token")
    if token:
        _AMADEUS_TOKEN.update(value=token, exp=now + int(body.get("expires_in", 1799)))
    return token


async def _amadeus_lookup(o_iata, d_iata, depart_date, currency, timeout, base, key, secret) -> list[dict]:
    token = await _amadeus_token(base, key, secret, timeout)
    if not token:
        return []
    import httpx

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.get(
            f"{base}/v2/shopping/flight-offers",
            params={"originLocationCode": o_iata, "destinationLocationCode": d_iata,
                    "departureDate": depart_date, "adults": 1,
                    "currencyCode": currency, "max": 20},
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return _parse_amadeus(resp.json(), currency)


# ─────────────────────────────── Public API ──────────────────────────────────


async def _fetch_flights(o_iata, d_iata, depart_date) -> Optional[list]:
    """All current flights for an airport pair on a date, normalised — or None on any
    failure. Cached per (provider, pair, date); the pick is applied separately so the
    leg's departure time never multiplies network calls."""
    from app.config import settings

    provider = (settings.FLIGHT_PROVIDER or "").strip().lower()
    ckey = (provider, o_iata, d_iata, depart_date)
    if ckey in _FLIGHT_CACHE:
        return _FLIGHT_CACHE[ckey]

    flights: Optional[list] = None
    try:
        if provider == "travelpayouts":
            if not settings.TRAVELPAYOUTS_TOKEN:
                logger.warning("FLIGHT_PROVIDER=travelpayouts but TRAVELPAYOUTS_TOKEN unset; using estimate")
            else:
                flights = await _travelpayouts_lookup(
                    o_iata, d_iata, depart_date, settings.FLIGHT_CURRENCY,
                    settings.FLIGHT_LIVE_TIMEOUT_SECONDS, settings.TRAVELPAYOUTS_TOKEN,
                    settings.TRAVELPAYOUTS_API_URL)
        elif provider == "amadeus":
            if not (settings.AMADEUS_API_KEY and settings.AMADEUS_API_SECRET):
                logger.warning("FLIGHT_PROVIDER=amadeus but key/secret unset; using estimate")
            else:
                flights = await _amadeus_lookup(
                    o_iata, d_iata, depart_date, settings.FLIGHT_CURRENCY,
                    settings.FLIGHT_LIVE_TIMEOUT_SECONDS, settings.AMADEUS_API_BASE,
                    settings.AMADEUS_API_KEY, settings.AMADEUS_API_SECRET)
        else:
            logger.warning("unknown FLIGHT_PROVIDER %r; using estimate", provider)
    except Exception:
        logger.warning("live flight lookup (%s) failed for %s->%s; using estimate",
                       provider, o_iata, d_iata)
        flights = None

    _FLIGHT_CACHE[ckey] = flights
    return flights


async def find_flight(o_lat, o_lng, d_lat, d_lng, depart_dt) -> Optional[dict]:
    """A real flight connecting two points on ``depart_dt``'s date, or None.

    ``depart_dt`` is the leg's planned departure datetime: its date scopes the search
    and its wall-clock time selects the soonest catchable flight."""
    from app.modules.trips import hubs

    o_air = await hubs.nearest_airport({"latitude": o_lat, "longitude": o_lng})
    d_air = await hubs.nearest_airport({"latitude": d_lat, "longitude": d_lng})
    o_iata, d_iata = _iata_of(o_air), _iata_of(d_air)
    if not o_iata or not d_iata or o_iata == d_iata:
        return None

    flights = await _fetch_flights(o_iata, d_iata, depart_dt.strftime("%Y-%m-%d"))
    if not flights:
        return None
    best = _select_flight(flights, depart_dt.hour * 60 + depart_dt.minute)
    if not best:
        return None

    price_text = None
    if best.get("price") is not None:
        price_text = f"{best['price']:.0f} {best.get('currency') or ''}".strip()
    return {
        "flightNumber": best.get("number"),
        "airline": best.get("airline"),
        "fromAirport": o_air.get("name"),
        "toAirport": d_air.get("name"),
        "scheduledDeparture": best.get("dep"),
        "scheduledArrival": best.get("arr"),
        "priceText": price_text,
        "scheduled": bool(best.get("dep") and best.get("arr")),
    }
