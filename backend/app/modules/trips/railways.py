"""
Real Indian train lookup over a vendored snapshot of the keyless datameet/railways
dataset (see scripts/build_railways_data.py).

The route planner computes *estimated* train times from distance and speed; it has
no idea which real train runs a route. This module answers that: given two points
(city or station coordinates), it finds a real train that connects them and returns
its **number** and **name** — so the traveller sees "Train 12138 · Punjab Mail"
instead of just an anonymous "Train" with a made-up clock.

Two match strategies, honest about what each can prove:

  1. Direct — a train whose origin station == our origin and terminus == our
     destination. For these we also return the dataset's real scheduled departure /
     arrival (``scheduled=True``).
  2. Pass-through — a train whose route *geometry* passes near both points in the
     right order. We can name the train (number + name) but NOT its time at an
     intermediate station (the snapshot has no per-stop times), so we leave the
     scheduled fields empty and the planner's estimate stands (``scheduled=False``).

Everything degrades to ``None`` (no train shown, estimate stands) if the data is
missing or nothing matches — never a fabricated number.
"""

import json
import logging
import math
import threading
from pathlib import Path
from typing import Optional

logger = logging.getLogger("tripsova.railways")

_DATA_DIR = Path(__file__).resolve().parents[2] / "data" / "railways"

# How far a city centre may sit from "its" station and still count as that station.
_MAX_STATION_KM = 40.0
# How near a train's route geometry must pass to a point to count as serving it.
_GEO_TOL_KM = 15.0
# Live eRail lookup: how many candidate stations to consider per endpoint, and the
# hard cap on eRail GETs per (origin,destination) pair (bounds the worst case).
_LIVE_CANDIDATES = 3
_LIVE_MAX_CALLS = 4

# Lazily loaded, then cached for the process lifetime.
_STATIONS: Optional[dict] = None          # code -> [lng, lat, name]
_TRAINS: Optional[list] = None            # list of train dicts
_DIRECT: Optional[dict] = None            # (from_code, to_code) -> [train, ...]
_STATION_RANK: Optional[dict] = None      # code -> importance score (terminus count)
_LOAD_LOCK = threading.Lock()

# (round(o_lat,2), round(o_lng,2), round(d_lat,2), round(d_lng,2)) -> result | None
_RESULT_CACHE: dict[tuple, Optional[dict]] = {}
# Same key, but for the live eRail lookup (kept separate so toggling the flag at
# runtime never serves a snapshot result as if it were live, or vice-versa).
_LIVE_CACHE: dict[tuple, Optional[dict]] = {}


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    lat1, lng1, lat2, lng2 = map(math.radians, (lat1, lng1, lat2, lng2))
    dlat, dlng = lat2 - lat1, lng2 - lng1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(a))


def _load() -> None:
    global _STATIONS, _TRAINS, _DIRECT, _STATION_RANK
    if _TRAINS is not None:
        return
    with _LOAD_LOCK:
        if _TRAINS is not None:
            return
        try:
            stations = json.loads((_DATA_DIR / "stations.min.json").read_text(encoding="utf-8"))
            trains = json.loads((_DATA_DIR / "trains.min.json").read_text(encoding="utf-8"))
        except Exception:
            logger.exception("railways snapshot missing/unreadable; train lookup disabled")
            _STATIONS, _TRAINS, _DIRECT, _STATION_RANK = {}, [], {}, {}
            return
        direct: dict[tuple, list] = {}
        rank: dict[str, int] = {}
        for tr in trains:
            frm, to = tr.get("from"), tr.get("to")
            if frm and to:
                direct.setdefault((frm, to), []).append(tr)
            # How often a station is a train's origin/terminus — a cheap proxy for
            # "is this a real junction" vs an adjacent cabin/halt/yard. Used to pick
            # the station a city is actually known by for the live timetable lookup.
            for code in (frm, to):
                if code:
                    rank[code] = rank.get(code, 0) + 1
        _STATIONS, _TRAINS, _DIRECT, _STATION_RANK = stations, trains, direct, rank
        logger.info("railways snapshot loaded: %d stations, %d trains", len(stations), len(trains))


def _stations_within(lat: float, lng: float, max_km: float) -> list[dict]:
    """All stations within max_km of a point, nearest first."""
    _load()
    if not _STATIONS:
        return []
    out = []
    for code, (slng, slat, name) in _STATIONS.items():
        km = _haversine_km(lat, lng, slat, slng)
        if km <= max_km:
            out.append({"code": code, "name": name, "latitude": slat, "longitude": slng, "distanceKm": round(km, 1)})
    out.sort(key=lambda s: s["distanceKm"])
    return out


def nearest_station(lat: float, lng: float, max_km: float = _MAX_STATION_KM) -> Optional[dict]:
    """Nearest station with coordinates to a point, or None if none is within max_km."""
    within = _stations_within(lat, lng, max_km)
    return within[0] if within else None


def _ranked_stations_near(lat: float, lng: float, max_km: float, limit: int) -> list[dict]:
    """Stations near a point ordered by importance (terminus frequency) then distance —
    so a city resolves to its real junction, not an adjacent halt. Up to `limit`."""
    within = _stations_within(lat, lng, max_km)
    rank = _STATION_RANK or {}
    within.sort(key=lambda s: (-rank.get(s["code"], 0), s["distanceKm"]))
    return within[:limit]


def _hhmm(value: Optional[str]) -> Optional[str]:
    """'13:30:00' -> '13:30'; pass through anything already short; None-safe."""
    if not value:
        return None
    parts = str(value).split(":")
    if len(parts) >= 2:
        return f"{parts[0].zfill(2)}:{parts[1].zfill(2)}"
    return str(value)


def _result(tr: dict, o_st: Optional[dict], d_st: Optional[dict], scheduled: bool) -> dict:
    return {
        "trainNumber": tr.get("number"),
        "trainName": tr.get("name") or None,
        "fromStation": (o_st or {}).get("name") or tr.get("fromName"),
        "toStation": (d_st or {}).get("name") or tr.get("toName"),
        # Real timetable times only for a direct origin->terminus match.
        "scheduledDeparture": _hhmm(tr.get("dep")) if scheduled else None,
        "scheduledArrival": _hhmm(tr.get("arr")) if scheduled else None,
        "scheduled": scheduled,
    }


def _nearest_vertex_index(geo: list, lat: float, lng: float, tol_km: float):
    """Index of the geometry vertex nearest the point, plus its distance — if within tol."""
    best_i, best_km = -1, tol_km
    for i, pair in enumerate(geo):
        km = _haversine_km(lat, lng, pair[1], pair[0])  # geo is [lng, lat]
        if km <= best_km:
            best_km, best_i = km, i
    return (best_i, best_km) if best_i >= 0 else (None, None)


def _passthrough(o_lat: float, o_lng: float, d_lat: float, d_lng: float) -> Optional[dict]:
    """Best train whose route passes near origin then destination (in that order)."""
    best_tr = None
    best_score = None
    for tr in _TRAINS or []:
        geo = tr.get("geo")
        if not geo or len(geo) < 2:
            continue
        oi, ok = _nearest_vertex_index(geo, o_lat, o_lng, _GEO_TOL_KM)
        if oi is None:
            continue
        di, dk = _nearest_vertex_index(geo, d_lat, d_lng, _GEO_TOL_KM)
        if di is None or di <= oi:  # must reach destination *after* origin
            continue
        score = ok + dk
        if best_score is None or score < best_score:
            best_score, best_tr = score, tr
    return best_tr


def find_train(o_lat: float, o_lng: float, d_lat: float, d_lng: float) -> Optional[dict]:
    """A real train connecting two points, or None. See module docstring for strategy."""
    _load()
    if not _TRAINS:
        return None

    ckey = (round(o_lat, 2), round(o_lng, 2), round(d_lat, 2), round(d_lng, 2))
    if ckey in _RESULT_CACHE:
        return _RESULT_CACHE[ckey]

    o_stations = _stations_within(o_lat, o_lng, _MAX_STATION_KM)
    d_stations = _stations_within(d_lat, d_lng, _MAX_STATION_KM)
    o_st = o_stations[0] if o_stations else None
    d_st = d_stations[0] if d_stations else None

    result: Optional[dict] = None
    # 1) Direct origin->terminus train: real number + real scheduled times. The
    #    nearest station to a city centre is often a minor halt, not the major
    #    terminus, so we check every station near each city for a direct pairing
    #    and keep the quickest — that surfaces real timetable times far more often.
    by_code = {s["code"]: s for s in o_stations}
    by_code_d = {s["code"]: s for s in d_stations}
    best, best_dur, best_pair = None, 10**9, (o_st, d_st)
    for oc in by_code:
        for dc in by_code_d:
            if oc == dc:
                continue
            for tr in (_DIRECT or {}).get((oc, dc), ()):
                dur = tr.get("durationM") or 10**9
                if dur < best_dur:
                    best, best_dur, best_pair = tr, dur, (by_code[oc], by_code_d[dc])
    if best is not None:
        result = _result(best, best_pair[0], best_pair[1], scheduled=True)

    # 2) Pass-through train: real number/name, but the estimate keeps the times.
    if result is None:
        tr = _passthrough(o_lat, o_lng, d_lat, d_lng)
        if tr:
            result = _result(tr, o_st, d_st, scheduled=False)

    _RESULT_CACHE[ckey] = result
    return result


# ─────────────────────────── Live eRail lookup ───────────────────────────────
# The vendored snapshot is a ~2015 community dump: train numbers get retired and
# renumbered, so it can name a train that no longer runs. When TRAIN_LIVE_ENABLED
# is set, we ask eRail's keyless `getTrains` endpoint for the *current* trains on a
# station pair instead. It returns a delimited text blob (no API key, no JSON):
#
#   <header>^<train1>^<train2>^...        rows joined by '^'
#   field0~field1~field2~...              fields within a row joined by '~'
#
# with this field order per train row (only the first 14 matter to us):
#   0 number  1 name  2 srcName 3 srcCode 4 dstName 5 dstCode
#   6 fromName 7 fromCode 8 toName 9 toCode 10 fromTime 11 toTime 12 travelTime 13 runDays
# Times look like "17.25" (HH.MM). Error blobs (e.g. "~~~~~From station not found")
# simply yield no valid rows, so we fall back to the snapshot.


def _erail_time(value: Optional[str]) -> Optional[str]:
    """eRail 'HH.MM' (or 'HH:MM') -> 'HH:MM'; None/garbage -> None."""
    if not value:
        return None
    raw = str(value).strip().replace(".", ":")
    parts = raw.split(":")
    if len(parts) < 2 or not parts[0].isdigit() or not parts[1].isdigit():
        return None
    h, m = int(parts[0]), int(parts[1])
    if not (0 <= h <= 23 and 0 <= m <= 59):
        return None
    return f"{h:02d}:{m:02d}"


def _parse_erail(text: str) -> list[dict]:
    """Parse an eRail getTrains blob into train dicts; tolerant of error payloads."""
    if not text:
        return []
    trains: list[dict] = []
    for row in text.split("^"):
        f = row.split("~")
        if len(f) < 14:
            continue
        number = (f[0] or "").strip()
        # The header row and error rows have no real train number in field 0.
        if not number.isdigit():
            continue
        dep, arr = _erail_time(f[10]), _erail_time(f[11])
        if not dep or not arr:
            continue
        trains.append({
            "number": number,
            "name": (f[1] or "").strip() or None,
            "fromCode": (f[7] or "").strip() or None,
            "fromName": (f[6] or "").strip() or None,
            "toCode": (f[9] or "").strip() or None,
            "toName": (f[8] or "").strip() or None,
            "dep": dep,
            "arr": arr,
            "travelTime": _erail_time(f[12]),
        })
    return trains


def _to_minutes(hhmm: Optional[str], default: int) -> int:
    """'HH:MM' -> minutes since midnight; None/garbage -> default."""
    if not hhmm:
        return default
    parts = str(hhmm).split(":")
    try:
        return int(parts[0]) * 60 + int(parts[1])
    except (ValueError, IndexError):
        return default


def _best_live_train(trains: list[dict]) -> Optional[dict]:
    """Pick the quickest train (tie-break: earliest departure) — matches the
    snapshot resolver's 'keep the quickest' contract."""
    if not trains:
        return None
    return min(trains, key=lambda t: (_to_minutes(t.get("travelTime"), 10**9),
                                      _to_minutes(t.get("dep"), 10**9)))


def _select_live_train(trains: list[dict], after_minutes: Optional[int]) -> Optional[dict]:
    """Choose the train a traveller would actually take.

    With ``after_minutes`` (the leg's wall-clock departure, minutes since midnight),
    prefer the **soonest departure at/after** that time — so a train that already left
    today isn't shown departing now. Tie-break by the quicker run. If every train for
    the pair departs earlier in the day, fall back to the day's earliest (the caller's
    ``_anchor_to_schedule`` then rolls it to tomorrow). Without a time, keep the
    quickest train (``_best_live_train``)."""
    if not trains:
        return None
    if after_minutes is None:
        return _best_live_train(trains)
    catchable = [t for t in trains if _to_minutes(t.get("dep"), -1) >= after_minutes]
    pool = catchable or trains
    return min(pool, key=lambda t: (_to_minutes(t.get("dep"), 10**9),
                                    _to_minutes(t.get("travelTime"), 10**9)))


async def _fetch_live_trains(o_lat: float, o_lng: float, d_lat: float, d_lng: float):
    """All current eRail trains for the two points, plus resolved station names, as
    ``(trains, o_name, d_name)`` — or ``None`` on any failure. Cached by rounded coords
    so the (single) network fetch is independent of the leg's departure time."""
    from app.config import settings

    ckey = (round(o_lat, 2), round(o_lng, 2), round(d_lat, 2), round(d_lng, 2))
    if ckey in _LIVE_CACHE:
        return _LIVE_CACHE[ckey]

    # Candidate stations for each endpoint, most-important first. A city's nearest
    # station is often a minor halt with no service, so we try its real junction(s).
    o_cands = _ranked_stations_near(o_lat, o_lng, _MAX_STATION_KM, _LIVE_CANDIDATES)
    d_cands = _ranked_stations_near(d_lat, d_lng, _MAX_STATION_KM, _LIVE_CANDIDATES)
    # Pair the candidates by combined importance, capping total network calls.
    pairs = [(o, d) for o in o_cands for d in d_cands if o["code"] != d["code"]]
    pairs.sort(key=lambda p: (
        -((_STATION_RANK or {}).get(p[0]["code"], 0) + (_STATION_RANK or {}).get(p[1]["code"], 0)),
        p[0]["distanceKm"] + p[1]["distanceKm"],
    ))

    found = None
    try:
        import httpx

        async with httpx.AsyncClient(timeout=settings.TRAIN_LIVE_TIMEOUT_SECONDS) as client:
            for o_st, d_st in pairs[:_LIVE_MAX_CALLS]:
                resp = await client.get(
                    settings.TRAIN_LIVE_API_URL,
                    params={
                        "Station_From": o_st["code"],
                        "Station_To": d_st["code"],
                        "DataSource": "0",
                        "Language": "0",
                        "Cache": "true",
                    },
                    headers={"User-Agent": "Tripsova/1.0 (+https://tripsova.sambhav-surana.online)"},
                )
                resp.raise_for_status()
                trains = _parse_erail(resp.text)
                if trains:
                    found = (trains, o_st["name"], d_st["name"])
                    break
    except Exception:
        logger.warning("live eRail train lookup failed near (%.3f,%.3f)->(%.3f,%.3f); using snapshot",
                       o_lat, o_lng, d_lat, d_lng)
        found = None

    _LIVE_CACHE[ckey] = found
    return found


async def find_train_live(
    o_lat: float, o_lng: float, d_lat: float, d_lng: float,
    after_minutes: Optional[int] = None,
) -> Optional[dict]:
    """A *current* real train connecting two points via eRail, or None on any failure
    (caller should then fall back to the offline snapshot).

    ``after_minutes`` is the leg's wall-clock departure (minutes since midnight): when
    given, the soonest train departing at/after it is chosen instead of the globally
    quickest, so a service that has already left for the day isn't surfaced."""
    fetched = await _fetch_live_trains(o_lat, o_lng, d_lat, d_lng)
    if not fetched:
        return None
    trains, o_name, d_name = fetched
    best = _select_live_train(trains, after_minutes)
    if not best:
        return None
    return {
        "trainNumber": best["number"],
        "trainName": best["name"],
        # eRail names the actual boarding/alighting stations for the pair.
        "fromStation": best.get("fromName") or o_name,
        "toStation": best.get("toName") or d_name,
        "scheduledDeparture": best["dep"],
        "scheduledArrival": best["arr"],
        "scheduled": True,
    }
