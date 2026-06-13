"""Tiny in-process TTL cache.

The project intentionally avoids Redis, so read-heavy public endpoints use this
lightweight, dependency-free time-to-live cache instead. It lives inside the
worker process (not shared across processes/replicas), which is fine for caching
slowly-changing public reads like the destinations list. Always pair it with
explicit invalidation on the corresponding write paths.
"""

from __future__ import annotations

import time
from typing import Any, Hashable, Optional


class TTLCache:
    def __init__(self, ttl_seconds: float = 300.0, maxsize: int = 512) -> None:
        self._ttl = ttl_seconds
        self._maxsize = maxsize
        # key -> (expires_at_monotonic, value). Insertion order = eviction order.
        self._store: dict[Hashable, tuple[float, Any]] = {}

    def get(self, key: Hashable) -> Optional[Any]:
        item = self._store.get(key)
        if item is None:
            return None
        expires_at, value = item
        if expires_at < time.monotonic():
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: Hashable, value: Any) -> None:
        # Bound memory with simple FIFO eviction of the oldest entry.
        if key not in self._store and len(self._store) >= self._maxsize:
            oldest = next(iter(self._store), None)
            if oldest is not None:
                self._store.pop(oldest, None)
        self._store[key] = (time.monotonic() + self._ttl, value)

    def clear(self) -> None:
        self._store.clear()
