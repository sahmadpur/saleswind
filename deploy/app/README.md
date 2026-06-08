# Saleswind app — self-hosted on the same server as the DB

The app runs in Docker next to the Postgres stack (`deploy/postgres`), connects
to it over the internal Docker network, and is exposed through a Cloudflare
Tunnel. The database is never published to the internet.

```
Browser ──HTTPS──> Cloudflare ──tunnel──> cloudflared (host)
                                              │  http://127.0.0.1:8090
                                              ▼
                                       saleswind-app ──┐ (saleswind_default network)
                                                        ▼
                                                  saleswind-db:5432
```

## Prerequisites

- `deploy/postgres` is already running (network `saleswind_default`, container
  `saleswind-db`).
- Cloudflare Tunnel (`cloudflared`) installed on the host.

## Deploy

```bash
# on the server, in the repo root
cd deploy/app
cp .env.example .env
#   DATABASE_URL=postgresql://saleswind:<DB_PASSWORD>@saleswind-db:5432/saleswind
#   AUTH_SECRET=$(openssl rand -base64 32)

docker compose up -d --build
docker compose logs -f app        # wait for "Starting Next.js" + ready
curl -sI http://127.0.0.1:8090/login   # 200 OK
```

Migrations run automatically at container start (`prisma migrate deploy`).

## Cloudflare Tunnel

Point your hostname at the app. For a config-file tunnel
(`/etc/cloudflared/config.yml`):

```yaml
ingress:
  - hostname: app.example.com
    service: http://localhost:8090
  - service: http_status:404
```

```bash
cloudflared tunnel route dns <tunnel-name> app.example.com   # if not already
systemctl restart cloudflared
```

For a dashboard-managed tunnel: Zero Trust → Networks → Tunnels → your tunnel →
Public Hostname → add `app.example.com` → service `http://localhost:8090`.

## Update / redeploy

```bash
git pull
cd deploy/app
docker compose up -d --build
```

## First admin login

Seeded user: `admin@saleswind.local` / `admin1234` (change it).
