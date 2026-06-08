# Self-hosted deployment (single Docker stack)

One compose stack (`saleswind`) runs both the Postgres database and the Next.js
app. Routing matches the other apps on the server:

```
Browser ──HTTPS──> Cloudflare ──tunnel──> cloudflared (host)
                                              │  http://localhost:80
                                              ▼
                                          Traefik ──Host()──> saleswind-app
                                                                  │ (internal network)
                                                                  ▼
                                                             saleswind-db
```

- `saleswind-db` is **internal only** (not published).
- `saleswind-app` joins the shared **`proxy`** network and is routed by Traefik
  via the `Host()` label. Cloudflare terminates TLS.

## Deploy

```bash
cd /home/saleswind && git pull
cp .env.example .env     # first time only — fill in values
docker compose up -d --build
docker compose logs -f app
```

`.env` values:
- `APP_HOST` — your hostname (e.g. `saleswind.cybercraft.az`), must match the
  Cloudflare public hostname.
- `POSTGRES_PASSWORD` and the password inside `DATABASE_URL` must be identical.
- `AUTH_SECRET` — `openssl rand -base64 32`.

Migrations run automatically on app start (`prisma migrate deploy`).

## Cloudflare Tunnel (dashboard-managed)

Zero Trust → Networks → Tunnels → *your tunnel* → Public Hostname → **Add**:
- Subdomain/domain: same as `APP_HOST`
- Service: `HTTP` → `localhost:80`  (Traefik)

## First admin login

`admin@saleswind.local` / `admin1234` (change it).
