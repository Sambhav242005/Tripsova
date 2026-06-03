"""
MBTiles Support — Placeholder for future integration.

This module is reserved for OpenMapTiles / MBTiles / MapLibre integration.
MBTiles is a file format for storing pre-rendered map tiles in a SQLite database.

Planned features (not yet implemented):
- Serve local MBTiles files for offline map rendering
- Import vector tiles from OpenMapTiles schema
- Generate terrain RGB tiles for elevation data
- Integration with MapLibre GL Native for offline maps
- Tile expiry and refresh logic

MBTiles spec: https://github.com/mapbox/mbtiles-spec
OpenMapTiles: https://openmaptiles.org/
MapLibre: https://maplibre.org/

Currently all tile serving falls back to online tile providers.
"""


class MBTilesSupport:
    def __init__(self, tiles_path: str = None):
        self.tiles_path = tiles_path
        self._available = False

    async def initialize(self) -> None:
        self._available = False

    async def get_tile(self, z: int, x: int, y: int) -> bytes | None:
        return None

    async def get_metadata(self) -> dict:
        return {
            "available": self._available,
            "format": "pbf" if self._available else None,
            "schema": "OpenMapTiles" if self._available else None,
            "note": "MBTiles support not yet implemented",
        }
