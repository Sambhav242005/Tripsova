# Tripsova Production Readiness Plan

Date: 2026-06-11
Source audit: `docs/PROJECT_STRUCTURE.md` "Known Issues & Problems" section, re-verified against the current working tree.

## Already fixed (verified, no action needed)

- Initial Alembic migration exists (`backend/alembic/versions/599dafc6cc34_initial_schema.py`)
- `aiosqlite` in dev deps; `vaderSentiment` in `pyproject.toml`
- `config.py` uses pydantic-settings `BaseSettings`; `JWT_SECRET` is required (no insecure default)
- Test fixtures create real DB users (`conftest.py`)
- Redis cache helper exists (`backend/app/shared/cache.py`); nginx config exists (`deploy/nginx.conf`)
- Frontend talks to the live API via `frontend/src/lib/api.ts` / `server-api.ts`
- Fixed in this session: Postgres connection pooling (`database.py`), deduplicated JWT decode (`dependencies.py`), exception handler no longer returns `str(exc)` and now logs tracebacks (`main.py`), strengthened weak `/api/places` assertion (`test_api.py`)

## Remaining work

## Step 1. Align ranking tests with production scoring logic

`backend/tests/test_ranking.py` re-implements `_popularity_score` and `_final_score` with weights that have drifted from production (`test: popularity 0.30, food 0.10, no sentiment` vs `app/modules/places/ranking.py: popularity 0.25, sentiment 0.10, food 0.05`). The tests currently verify their own copy, not the app. Refactor `calculate_tripova_score` to extract pure, DB-free scoring functions (popularity, freshness, final-score composition with penalties) and make the tests import those functions.

Acceptance:
- `test_ranking.py` imports scoring functions from `app.modules.places.ranking` (no local re-implementation)
- `calculate_tripova_score` output unchanged for identical inputs (existing API tests still pass)
- Full backend suite passes

Out of scope: changing the scoring weights or formula behaviour.

## Step 2. Add API rate limiting middleware

No rate limiting exists on any endpoint. Add a rate-limiting layer (e.g. slowapi or a lightweight in-process token bucket keyed by client IP), with stricter limits on `/api/auth/login` and `/api/auth/register`, configurable via `Settings`.

Acceptance:
- Exceeding the limit returns HTTP 429 with a Retry-After header
- Auth endpoints have stricter limits than read endpoints
- Tests cover both the 429 path and the normal path

## Step 3. Implement refresh token mechanism

JWTs live 72h with no revocation. Add refresh tokens: a `refresh_tokens` table (Alembic migration), `/api/auth/refresh` and `/api/auth/logout` endpoints, rotation on use, and revocation on logout. Shorten the access-token default expiry.

Acceptance:
- Refresh endpoint rotates the token and rejects reused/revoked tokens
- Alembic upgrade/downgrade is clean
- Auth test suite covers issue, refresh, reuse-rejection, and logout flows

## Step 4. Add request/response logging middleware

No structured request logging exists. Add middleware logging method, path, status code, and duration per request, with a logger configuration in `main.py` honouring `DEBUG`.

Acceptance:
- Each request emits one structured log line with method, path, status, duration ms
- Health-check endpoints can be excluded from logs
- Backend suite passes

## Step 5. Add admin module schemas and tests

`app/modules/admin/` has routes and service but no `schemas.py` and zero test coverage. Add Pydantic response schemas for admin endpoints and a `tests/test_admin.py` covering authz (403 for non-admin) and the happy path for each endpoint.

Acceptance:
- All admin routes declare response models
- `tests/test_admin.py` covers every admin route with admin and non-admin callers
- Full backend suite passes

## Step 6. Refresh PROJECT_STRUCTURE.md known-issues section

`docs/PROJECT_STRUCTURE.md` still lists issues that are already fixed (migrations, deps, pydantic-settings, JWT default, test fixtures, nginx, Redis cache, frontend API wiring). Update the "Known Issues & Problems" and "Summary of Immediate Action Items" sections to reflect the current state, and fix the stale `D:\Travel/` root path references.

Acceptance:
- Every listed issue is verifiably still open in the current tree
- Fixed items are moved to a "Resolved" subsection or removed
- Root-path references match the actual repo layout
