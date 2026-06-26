"""
Build a trimmed, vendored snapshot of the (keyless) datameet/railways dataset.

Source (public domain, no API key): https://github.com/datameet/railways

We vendor two small files so the trip planner can name a *real* train + station
for a journey, fully offline, with no per-request network call:

  app/data/railways/stations.min.json
      {"CODE": [lng, lat, "Name"], ...}   — only stations that have coordinates.

  app/data/railways/trains.min.json
      [{"number","name","from","fromName","to","toName","dep","arr",
        "durationM","type","geo": [[lng,lat], ...]}, ...]
      geo coords rounded to 4 dp (~11 m) to keep the file small while still
      letting us match trains that pass *through* two stations (not just trains
      whose origin/terminus are exactly our pair).

The 82 MB schedules.json is deliberately NOT vendored: the per-train geometry
above already traces every stop, which is all the resolver needs.

Re-run this script to refresh the snapshot:
    python -m scripts.build_railways_data
"""

import json
import sys
import urllib.request
from pathlib import Path

RAW = "https://raw.githubusercontent.com/datameet/railways/master"
STATIONS_URL = f"{RAW}/stations.json"
TRAINS_URL = f"{RAW}/trains.json"

OUT_DIR = Path(__file__).resolve().parent.parent / "app" / "data" / "railways"


def _fetch(url: str) -> dict:
    print(f"  downloading {url} ...", flush=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Tripsova/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _round_coords(coords: list) -> list:
    """Round a LineString's [lng, lat] pairs to 4 dp, dropping consecutive dups."""
    out: list[list[float]] = []
    for pair in coords:
        if not pair or len(pair) < 2 or pair[0] is None or pair[1] is None:
            continue
        rp = [round(float(pair[0]), 4), round(float(pair[1]), 4)]
        if not out or out[-1] != rp:
            out.append(rp)
    return out


def build_stations() -> dict:
    fc = _fetch(STATIONS_URL)
    out: dict[str, list] = {}
    for feat in fc.get("features", []):
        geom = feat.get("geometry")
        props = feat.get("properties") or {}
        code = props.get("code")
        if not geom or not code:
            continue  # skip the XX-/YY- placeholder rows that have null geometry
        coords = geom.get("coordinates")
        if not coords or len(coords) < 2:
            continue
        out[code] = [round(float(coords[0]), 5), round(float(coords[1]), 5), props.get("name") or code]
    return out


def build_trains() -> list:
    fc = _fetch(TRAINS_URL)
    out: list[dict] = []
    for feat in fc.get("features", []):
        p = feat.get("properties") or {}
        number = p.get("number")
        if not number:
            continue
        geom = feat.get("geometry") or {}
        geo = _round_coords(geom.get("coordinates") or []) if geom.get("type") == "LineString" else []
        out.append({
            "number": str(number),
            "name": p.get("name") or "",
            "from": p.get("from_station_code"),
            "fromName": p.get("from_station_name"),
            "to": p.get("to_station_code"),
            "toName": p.get("to_station_name"),
            "dep": p.get("departure"),
            "arr": p.get("arrival"),
            "durationM": p.get("duration_m"),
            "type": p.get("type"),
            "geo": geo,
        })
    return out


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("Building railways snapshot ->", OUT_DIR)

    stations = build_stations()
    (OUT_DIR / "stations.min.json").write_text(
        json.dumps(stations, separators=(",", ":")), encoding="utf-8"
    )
    print(f"  stations.min.json: {len(stations)} stations")

    trains = build_trains()
    (OUT_DIR / "trains.min.json").write_text(
        json.dumps(trains, separators=(",", ":")), encoding="utf-8"
    )
    print(f"  trains.min.json: {len(trains)} trains")
    return 0


if __name__ == "__main__":
    sys.exit(main())
