# Self-hosted Postgres for Saleswind (with Vercel)

This runs Postgres in Docker **on your own server**. The app is deployed on
Vercel, and Vercel reaches this database over the internet using TLS.

> ⚠️ **This exposes Postgres to the public internet** (Vercel has no fixed
> egress IP on Hobby/Pro, so you can't lock it down to a single source IP).
> The two things protecting it are a **strong password** and **TLS**. Don't
> skip either. Optionally use a non-default port and fail2ban.

## 1. Configure

```bash
cd deploy/postgres
cp .env.example .env
# set a strong password:
openssl rand -base64 24      # paste into POSTGRES_PASSWORD in .env
```

## 2. Generate the TLS cert

```bash
./gen-cert.sh
```

This writes a self-signed cert to `./certs` and sets the ownership Postgres
requires (uid 999, key mode 600).

## 3. Start it

```bash
docker compose up -d
docker compose logs -f db        # should reach "database system is ready"
```

## 4. Open the firewall

```bash
sudo ufw allow 5432/tcp          # or your cloud provider's security group
```

Confirm it's reachable from outside the server:

```bash
# from your laptop, not the server:
nc -vz YOUR_SERVER_HOST 5432
```

## 5. Connection string for Vercel

Use this as `DATABASE_URL` (replace host + password):

```
postgresql://saleswind:YOUR_PASSWORD@YOUR_SERVER_HOST:5432/saleswind?sslmode=require
```

- `sslmode=require` → encrypted, no CA verification (correct for a self-signed
  cert). The app's DB client (`src/lib/db.ts`) is already set up to match this.
- `YOUR_SERVER_HOST` is the server's public IP or domain.

## 6. After the first Vercel deploy — seed the admin user

The Vercel build runs `prisma migrate deploy` (schema only). Create the initial
admin login once by running the seed against the production DB from your laptop:

```bash
DATABASE_URL='postgresql://saleswind:YOUR_PASSWORD@YOUR_SERVER_HOST:5432/saleswind?sslmode=require' \
  npx prisma db seed
```

## Maintenance

```bash
docker compose down            # stop (keeps data in the named volume)
docker compose pull && docker compose up -d   # upgrade image
# Backup:
docker exec saleswind-db pg_dump -U saleswind saleswind > backup.sql
```
