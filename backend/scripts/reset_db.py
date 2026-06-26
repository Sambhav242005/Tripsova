"""Reset the dev database to a clean, EMPTY state.

Drops every table and recreates the schema with zero rows — no users, no
destinations, no content — so you can test the app from scratch.

  cd backend
  python -m scripts.reset_db

To repopulate the demo baseline instead (users, destinations, feed, pods),
run `python -m scripts.seed`.
"""
import asyncio

# Importing the app registers every ORM model on Base.metadata, so drop_all /
# create_all cover the *whole* schema — exactly what init_db() builds on startup.
import app.main  # noqa: F401
from app.database import Base, engine


async def reset() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset())
    print("Database reset — all tables dropped and recreated empty (0 rows).")
