# Production deployment

This project supports Docker Compose on an empty host, or a systemd backend behind an existing Nginx host. Do not bind a second gateway to ports already serving another site.

## Existing Nginx host

Build the frontend locally (`cd frontend; npm ci; npm run build`) and copy source plus `frontend/dist` to `/opt/pubmed`. Create a `pubmed` system user and `/var/lib/pubmed/cache` owned by that user. Install Python 3.11+ runtime dependencies in `/opt/pubmed/.venv`.

Store backend variables in `/etc/pubmed/backend.env`, owned by root and mode 600. Use `NCBI_API_KEY`, `NCBI_EMAIL`, `LLM_API_KEY`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_TIMEOUT=45`, and `CORS_ORIGINS=https://pubmed.ai-calendar.xyz`. Never put SSH credentials in that file. Site and API routes are publicly accessible without a login prompt.

Install `pubmed.service` and start it with `systemctl enable --now pubmed`. The API listens only on `127.0.0.1:8001` with exactly one worker. Cache survives service restarts; in-memory task IDs do not. The bundled demo snapshot remains available from the application directory.

Install `pubmed-cert-renew.service` and `pubmed-cert-renew.timer` under `/etc/systemd/system`, then enable the timer. It renews only this project's certificate twice daily; preserve existing sites' renewal jobs. Configure the deploy hook to run `nginx -t && systemctl reload nginx` after successful renewal.

Add the HTTP-only ACME configuration as a new Nginx site, run `nginx -t`, and reload Nginx. Request a certificate with Certbot webroot `/var/lib/pubmed-acme` for `pubmed.ai-calendar.xyz`. After issuance replace only this site's config with `pubmed-https.conf`, validate and reload. Keep certificate renewal enabled and reload Nginx in the renewal deploy hook. Never modify other server blocks.

All site and API routes are publicly accessible over HTTPS. HTTP redirects to HTTPS (the certificate challenge path is the sole exception). New analysis requests are globally limited to two per minute, with a burst of two; status polling is not limited by this rule. Requests exceeding the quota get HTTP 429. This limits spend but is not a monetary budget; also set a provider account budget where available.

## Docker on an otherwise empty host

Create `deploy/private/backend.env` with backend variables above, and `deploy/private/gateway.env` with `SITE_DOMAIN=pubmed.ai-calendar.xyz`. These private files are ignored by Git and excluded from the Docker build context.

Run `docker compose up -d --build`. Only the Caddy gateway exposes public ports 80/443; backend and frontend stay on the internal container network. Caddy issues/renews HTTPS certificates. Cache and certificate state use named volumes. Do not run `docker compose down -v` unless intentionally deleting that persistent state.

## Verification

Check: homepage and `/api/health` return 200 without credentials or a login prompt; HTTP redirects; sample demo completes without upstream APIs; 300/500/1000 selection and Chinese switch work; a live query yields a valid AI brief or an explicitly labeled fallback; excess analysis submissions return 429; neither environment files nor API docs reveal credentials. Check that the original website still responds after each Nginx reload.

Run `node scripts/verify-production.mjs` from `frontend` for a live production check. Set `PUBMED_TEST_MODE=demo` to validate the public demo without a paid model call.
