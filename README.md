# Saleswind

Saleswind is a sales-pipeline CRM where teams manage accounts and opportunities and move
each opportunity through a **Prospect → Sales → Contract → Project** lifecycle with
admin-configurable statuses and tags, tracking revenue, comments, activity history,
notifications, and reports.

Built with Next.js (App Router, TypeScript), PostgreSQL via Prisma, Auth.js (NextAuth v5)
credentials auth, Tailwind CSS, Vitest, and Playwright.

## Local development

Same single Docker stack as production (`docker-compose.yml`), plus
`docker-compose.dev.yml`, enabled by `COMPOSE_FILE` in `.env`. It publishes
`app` on `:3000` and `db` on `:5432` and serves auth over plain http.

```bash
cp .env.example .env    # first time: set passwords / AUTH_SECRET, uncomment COMPOSE_FILE and the localhost DATABASE_URL
docker compose up -d db
npx prisma migrate deploy && npx prisma db seed   # first time only
npm run dev             # http://localhost:3000, hot reload
```

Sign in with the seeded admin (see [Seeded admin](#seeded-admin) below).

To run the built app container instead (no hot reload, same as prod):
`docker compose up -d --build`.

## Tests

```bash
# Unit + integration tests (Vitest) run against saleswind_test on the stack's db.
# First time: create it and apply migrations. .env.test:
#   DATABASE_URL="postgresql://<user>:<password>@localhost:5432/saleswind_test?schema=public"
docker compose exec db createdb -U saleswind saleswind_test
npx dotenv-cli -e .env.test -- npx prisma migrate deploy
npm test

# End-to-end smoke tests (Playwright). Needs the dev DB seeded (npx prisma db seed).
npm run test:e2e
```

## Deployment (Vercel)

Next.js deploys to Vercel with zero extra config — there is no `vercel.json`. The build
command is the standard `npm run build`, which has been wired to run Prisma on every
deploy:

```
"build": "prisma generate && prisma migrate deploy && next build"
```

`prisma migrate deploy` reads the database URL from `prisma.config.ts` (which loads the
environment), so each deploy applies any pending migrations automatically before the
Next build runs.

### Required environment variables

Set these in the Vercel project settings (Production, and Preview if used):

| Variable        | Description                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| `DATABASE_URL`  | Connection string for a production Postgres (Vercel Postgres or external).   |
| `AUTH_SECRET`   | Secret for Auth.js session encryption. Generate with the Node crypto snippet above. |

### First deploy: seed the production database

Migrations apply automatically on each deploy, but the database must be **seeded once**
after the first successful deploy to create the admin user and the per-state
status/tag vocabularies. Run the seed against the production `DATABASE_URL`:

```bash
DATABASE_URL="<your production DATABASE_URL>" npx prisma db seed
```

### Seeded admin

The seed creates a default admin account:

- **Email:** `admin@saleswind.local`
- **Password:** `admin1234`

**Rotate this password immediately** after the first login (and ideally create your own
admin user and remove or disable this one). Do not leave the default credentials in place
on any deployed environment.

## Notes

- **Middleware deprecation (future cleanup):** Next.js 16 emits a non-blocking warning
  that the `middleware` file convention is deprecated in favor of `proxy`. The current
  `src/middleware.ts` still works on Next 16; renaming it to the `proxy` convention is a
  future cleanup and is intentionally out of scope here.
</content>
</invoke>
