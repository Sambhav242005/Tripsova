import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.database import Base

# Import all model modules so every table registers on Base.metadata for autogenerate.
import app.modules.auth.models  # noqa: F401
import app.modules.users.models  # noqa: F401
import app.modules.destinations.models  # noqa: F401
import app.modules.places.models  # noqa: F401
import app.modules.feed.models  # noqa: F401
import app.modules.trips.models  # noqa: F401
import app.modules.offline.models  # noqa: F401
import app.modules.trippods.models  # noqa: F401
import app.modules.trust.models  # noqa: F401
import app.modules.partners.models  # noqa: F401
import app.modules.bookings.models  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url_sync)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline():
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    from sqlalchemy.ext.asyncio import create_async_engine
    connectable = create_async_engine(settings.DATABASE_URL, poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
