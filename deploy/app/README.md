# Saleswind app — self-hosted (same pattern as docai.az)

Runs as a container next to the Postgres stack. Exposed through Traefik +
Cloudflare Tunnel, exactly like the other apps on this server:

```
Browser ──HTTPS──> Cloudflare ──tunnel──> cloudflared (host)
                                              │  http://localhost:80
                                              ▼
                                          Traefik ──Host() label──> saleswind-app
                                                                        │ (saleswind_default)
                                                                        ▼
                                                                   saleswind-db:5432
```

- App joins the shared **`proxy`** network (Traefik) and **`saleswind_default`**
  (to reach Postgres). The DB is never published.
- Traefik routes by the `Host()` label (entrypoint `web` / :80). Cloudflare
  terminates TLS.

## Deploy

```bash
# on the server, in the repo
cd /home/saleswind-app && git pull
cd deploy/app
cp .env.example .env
#   APP_HOST=saleswind.example.com           # your hostname
#   DATABASE_URL=postgresql://saleswind:<DB_PASSWORD>@saleswind-db:5432/saleswind
#   AUTH_SECRET=$(openssl rand -base64 32)

docker compose up -d --build
docker compose logs -f app          # wait for "Starting Next.js" + ready
```

Migrations run automatically at container start (`prisma migrate deploy`).

## Cloudflare Tunnel (dashboard-managed)

The tunnel here runs with a token, so public hostnames are configured in the
Cloudflare dashboard (not a local file):

Zero Trust → Networks → Tunnels → *your tunnel* → Public Hostname → **Add**:
- **Subdomain/Domain**: `saleswind.example.com` (same value as `APP_HOST`)
- **Service**: `HTTP` → `localhost:80`  *(points at Traefik, same as docai.az)*

Traefik then routes that host to this container via the `Host()` label.

## Update / redeploy

```bash
cd /home/saleswind-app && git pull && cd deploy/app && docker compose up -d --build
```

## First admin login

Seeded user: `admin@saleswind.local` / `admin1234` (change it).
