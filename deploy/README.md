# Raspberry Pi Deployment

Tripsova deploys from GitHub Actions with a self-hosted runner on the Raspberry
Pi. The Pi runner keeps an outbound connection to GitHub, so a push to `master`
or `main` starts the workflow without exposing SSH to GitHub.

The workflow in `.github/workflows/deploy.yml` is event-driven:

1. Run backend tests.
2. Build the frontend.
3. If those pass, run the deploy job on the Pi runner.
4. Sync the exact tested commit into `/home/sambhav/Tripsova`.
5. Install listed Debian packages.
6. Ensure the persistent deployment env file exists at `/home/sambhav/.tripsova/deploy.env`.
7. Rebuild and restart the Docker Compose stack.
8. Verify the homepage, the public logo asset, and `/api/destinations`.

The Pi exposes nginx on `http://192.168.1.5:80` and `https://192.168.1.5:443`.
The frontend container is published on host port `5174` for local debugging, but
browser traffic should normally enter through nginx. Nginx proxies `/api/*` to
the backend container internally, so the backend does not publish a direct LAN
port.

Cloudflare Tunnel should point at nginx on port 80 or 443. The frontend uses
relative API URLs in the browser, which avoids private-LAN API URLs being baked
into the client bundle.

The frontend Docker image runs Next.js in standalone mode. The Dockerfile must
copy both `.next/static` and `public/` into the runner image so public assets
such as `/brand/tripsova-client-logo.png` are available after deployment.

Add Python packages to `backend/requirements.txt`, frontend packages through
`frontend/package.json` and `frontend/package-lock.json`, and OS packages to
`deploy/system-packages.txt`.

Containers use `restart: unless-stopped`, and the database state lives in the
named Docker volume `tripsova_pgdata`. Do not remove that volume unless you
intend to wipe production data.
