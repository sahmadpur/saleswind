# Saleswind

Saleswind is a sales-pipeline CRM where teams manage accounts and opportunities and move
each opportunity through a **Prospect → Sales → Contract → Project** lifecycle with
admin-configurable statuses and tags, tracking revenue, comments, activity history,
notifications, and reports.

Built with Next.js (App Router, TypeScript), PostgreSQL via Prisma, Auth.js (NextAuth v5)
credentials auth, Tailwind CSS, Vitest, and Playwright.

## Local development

### 1. Start PostgreSQL (Docker)

The project expects Postgres 17 on `localhost:5432` with two databases, `saleswind`
(dev) and `saleswind_test` (tests). To spin up a matching container:

```bash
docker run -d --name saleswind-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=saleswind \
  -p 5432:5432 \
  postgres:17

# create the test database
docker exec -it saleswind-pg createdb -U postgres saleswind_test
```

### 2. Environment files

Create `.env` (dev) and `.env.test` (tests). These are gitignored — never commit them.

`.env`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saleswind?schema=public"
AUTH_SECRET="<generated secret>"
```

`.env.test`:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saleswind_test?schema=public"
```

Generate `AUTH_SECRET` with Node's crypto (do **not** use `npx auth secret` — in this
environment that command resolves to the wrong package):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Install, migrate, seed, run

```bash
npm install
npx prisma migrate dev      # create/apply migrations to the dev DB
npx prisma db seed          # seed admin user + per-state status/tag vocabularies
npm run dev                 # http://localhost:3000
```

Sign in with the seeded admin (see [Seeded admin](#seeded-admin) below).

## Tests

```bash
# Unit + integration tests (Vitest). The integration suite runs against saleswind_test.
# Make sure that DB has migrations applied first:
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
