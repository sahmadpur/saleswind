# Saleswind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production sales-pipeline CRM where users create accounts and opportunities, move opportunities through a Prospect→Sales→Contract→Project lifecycle with admin-configurable statuses/tags, and track revenue, comments, activity history, notifications, and reports.

**Architecture:** Monolithic Next.js (App Router) on Vercel. React Server Components render data-heavy pages; Server Actions perform all mutations through a thin service layer that enforces permissions, diffs changes into an append-only activity log, and emits notifications in the same transaction. PostgreSQL via Prisma. Auth.js Credentials provider for email/password sessions.

**Tech Stack:** Next.js (App Router, TypeScript), PostgreSQL, Prisma, Auth.js (NextAuth) v5, Zod, Tailwind CSS, Vitest, Playwright, bcryptjs.

---

## File Structure

```
saleswind/
├── prisma/
│   ├── schema.prisma                 # All models + State enum
│   └── seed.ts                       # Seed admin user + per-state statuses/tags
├── src/
│   ├── lib/
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── auth.ts                   # Auth.js config (Credentials)
│   │   ├── session.ts                # getCurrentUser / requireUser / requireRole helpers
│   │   └── domain/                   # Pure, framework-free logic (unit-tested)
│   │       ├── finance.ts            # grossProfit()
│   │       ├── lifecycle.ts          # transition rules: canAdvance/canMoveBack/nextState/prevState
│   │       ├── permissions.ts        # can(user, action) checks
│   │       └── activity-diff.ts      # diff(old, new) -> ActivityLog entries
│   ├── services/                     # DB-touching server-only services
│   │   ├── opportunity-service.ts    # create/update/transition (logs activity, notifies)
│   │   ├── account-service.ts
│   │   ├── comment-service.ts
│   │   ├── notification-service.ts
│   │   ├── dictionary-service.ts     # statuses/tags/definitions CRUD
│   │   ├── user-service.ts
│   │   └── report-service.ts         # aggregations + CSV/PDF data
│   ├── actions/                      # 'use server' entrypoints calling services
│   │   ├── opportunity-actions.ts
│   │   ├── account-actions.ts
│   │   ├── comment-actions.ts
│   │   ├── notification-actions.ts
│   │   ├── dictionary-actions.ts
│   │   └── user-actions.ts
│   ├── schemas/                      # Zod schemas shared client/server
│   │   ├── account.ts
│   │   ├── opportunity.ts
│   │   └── user.ts
│   ├── app/
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   ├── (auth)/login/page.tsx
│   │   ├── (app)/layout.tsx          # App shell: left nav + top bar + notification bell
│   │   ├── (app)/opportunities/page.tsx
│   │   ├── (app)/opportunities/new/page.tsx
│   │   ├── (app)/opportunities/[id]/page.tsx
│   │   ├── (app)/accounts/page.tsx
│   │   ├── (app)/accounts/[id]/page.tsx
│   │   ├── (app)/reports/page.tsx
│   │   ├── (app)/reports/export/route.ts   # CSV/PDF download handlers
│   │   ├── (app)/dictionary/page.tsx       # admin
│   │   ├── (app)/users/page.tsx            # admin
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── components/                   # Reusable UI (Google-like design system)
│   │   ├── ui/                       # Button, Input, Select, Card, Pill, Chip, Dialog, Table
│   │   ├── nav/AppShell.tsx
│   │   ├── nav/NotificationBell.tsx
│   │   ├── opportunities/OpportunityTable.tsx
│   │   ├── opportunities/KanbanBoard.tsx
│   │   ├── opportunities/StateStepper.tsx
│   │   ├── opportunities/TransitionControls.tsx
│   │   ├── opportunities/TagPicker.tsx
│   │   ├── comments/CommentThread.tsx
│   │   └── activity/ActivityLogView.tsx
│   └── middleware.ts                 # Route protection
├── tests/
│   ├── unit/                         # mirrors src/lib/domain
│   ├── integration/                  # service tests against test Postgres
│   └── e2e/                          # Playwright smoke
├── vitest.config.ts
├── playwright.config.ts
└── .env / .env.test
```

**Decomposition principle:** pure logic lives in `src/lib/domain` (fast unit tests, no DB). Services own DB access and orchestration (integration-tested). Actions are thin `'use server'` wrappers that validate input (Zod) and call services. UI never calls Prisma directly.

---

## Phase 0 — Project Setup

### Task 1: Scaffold Next.js + Tailwind

**Files:**
- Create: project scaffold, `src/app/layout.tsx`, `src/app/page.tsx`, `tailwind.config.ts`, `.gitignore`

- [ ] **Step 1: Create the Next.js app**

Run (in the empty repo root, non-interactive flags set every prompt):
```bash
npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack --use-npm
```
Expected: project files generated under `src/`, dev server runnable.

- [ ] **Step 2: Verify it builds and runs**

Run:
```bash
npm run build
```
Expected: build completes with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with TypeScript and Tailwind"
```

### Task 2: Prisma + Postgres connection

**Files:**
- Create: `prisma/schema.prisma`, `src/lib/db.ts`, `.env`, `.env.test`

- [ ] **Step 1: Install Prisma and init**

```bash
npm install prisma @prisma/client
npm install -D tsx
npx prisma init --datasource-provider postgresql
```
Expected: `prisma/schema.prisma` and `.env` created.

- [ ] **Step 2: Set connection strings**

In `.env`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saleswind?schema=public"
```
In `.env.test`:
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/saleswind_test?schema=public"
```

- [ ] **Step 3: Create the Prisma client singleton**

> **Prisma 7 requires a driver adapter.** `new PrismaClient({ datasources })` is invalid in v7 — you must pass a driver adapter. Install `@prisma/adapter-pg pg` (+ `-D @types/pg`) and wire the `PrismaPg` adapter with the connection string from `DATABASE_URL`. Any code that constructs a `PrismaClient` (this singleton, `prisma/seed.ts`) must use this pattern.

`src/lib/db.ts`:
```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: add Prisma client and database config"
```

### Task 3: Test infrastructure (Vitest)

**Files:**
- Create: `vitest.config.ts`, `tests/unit/.gitkeep`, `tests/integration/setup.ts`

- [ ] **Step 1: Install Vitest (+ dotenv tooling)**

```bash
npm install -D vitest@latest @vitest/coverage-v8@latest dotenv@latest dotenv-cli@latest
```
`dotenv` (library) loads `.env.test` inside Vitest; `dotenv-cli` provides the `dotenv` binary used to point Prisma CLI commands at the test DB.

- [ ] **Step 2: Configure Vitest to auto-load the test DB env**

Create `tests/setup-env.ts` (runs before any test module imports `@/lib/db`, so `DATABASE_URL` points at `saleswind_test`):
```ts
import { config } from "dotenv";
// override:true so the test DB URL wins even if a dev .env was already loaded
config({ path: ".env.test", override: true });
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    globals: true,
    // Integration tests share one test database and use broad deleteMany() cleanup.
    // Run test files sequentially so concurrent files don't clobber each other's rows.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // Services start with `import "server-only"`, which throws when imported in
      // Vitest's node environment. Alias it (and client-only) to a no-op stub so
      // integration tests can import services directly.
      "server-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
      "client-only": path.resolve(__dirname, "tests/stubs/empty.ts"),
    },
  },
});
```
Also create the stub `tests/stubs/empty.ts` with a single line: `export {};`

> Note (Prisma 7): integration tests get their connection from `DATABASE_URL` (loaded above) because `src/lib/db.ts` constructs `PrismaClient` with `datasources.db.url = process.env.DATABASE_URL`. No `npx dotenv -e …` wrapper is needed for `npm test` — just ensure the test DB has migrations applied (`npx dotenv-cli -e .env.test -- npx prisma migrate deploy`).

- [ ] **Step 3: Add test scripts to package.json**

Add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Add a smoke test and run it**

`tests/unit/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```
Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Vitest test infrastructure"
```

---

## Phase 1 — Data Model & Seed

### Task 4: Prisma schema (all models)

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Write the full schema**

Replace the `model`/`enum` section of `prisma/schema.prisma` with:
```prisma
enum Role {
  ADMIN
  MANAGER
  AGENT
}

enum State {
  PROSPECT
  SALES
  CONTRACT
  PROJECT
}

model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  role          Role     @default(AGENT)
  createdAt     DateTime @default(now())

  ownedOpportunities Opportunity[] @relation("OwnedOpportunities")
  comments           Comment[]
  notifications      Notification[]
}

model Account {
  id                  String   @id @default(cuid())
  number              Int      @unique @default(autoincrement())
  name                String
  industry            String?
  website             String?
  primaryContactName  String?
  primaryContactEmail String?
  primaryContactPhone String?
  notes               String?
  createdById         String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  opportunities Opportunity[]
}

model Status {
  id       String  @id @default(cuid())
  state    State
  label    String
  isActive Boolean @default(true)

  opportunities Opportunity[]
  @@unique([state, label])
}

model Tag {
  id       String  @id @default(cuid())
  state    State
  label    String
  isActive Boolean @default(true)

  opportunityTags OpportunityTag[]
  @@unique([state, label])
}

model Opportunity {
  id               String   @id @default(cuid())
  accountId        String
  title            String
  description      String?
  ownerId          String
  state            State    @default(PROSPECT)
  statusId         String?
  revenue          Decimal  @default(0) @db.Decimal(14, 2)
  marginPct        Decimal  @default(0) @db.Decimal(5, 2)
  meetingAt        DateTime?
  isCancelled      Boolean  @default(false)
  lastReason       String?
  createdById      String
  createdAt        DateTime @default(now())
  lastModifiedAt   DateTime @default(now())
  lastModifiedById String

  account        Account          @relation(fields: [accountId], references: [id])
  owner          User             @relation("OwnedOpportunities", fields: [ownerId], references: [id])
  status         Status?          @relation(fields: [statusId], references: [id])
  tags           OpportunityTag[]
  comments       Comment[]
  activities     ActivityLog[]
  notifications  Notification[]
}

model OpportunityTag {
  opportunityId String
  tagId         String
  opportunity   Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([opportunityId, tagId])
}

model Comment {
  id            String    @id @default(cuid())
  opportunityId String
  authorId      String
  body          String
  createdAt     DateTime  @default(now())
  deletedAt     DateTime?

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
  author      User        @relation(fields: [authorId], references: [id])
}

model ActivityLog {
  id            String   @id @default(cuid())
  opportunityId String
  userId        String
  actionType    String
  fieldChanged  String?
  oldValue      String?
  newValue      String?
  createdAt     DateTime @default(now())

  opportunity Opportunity @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
}

model Notification {
  id            String    @id @default(cuid())
  userId        String
  opportunityId String?
  type          String
  message       String
  readAt        DateTime?
  createdAt     DateTime  @default(now())

  user        User         @relation(fields: [userId], references: [id])
  opportunity Opportunity? @relation(fields: [opportunityId], references: [id], onDelete: Cascade)
}

model Definition {
  id         String @id @default(cuid())
  term       String @unique
  definition String
}
```

- [ ] **Step 2: Create and apply the migration**

Run:
```bash
npx prisma migrate dev --name init
```
Expected: migration created and applied, Prisma Client generated.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add Prisma data model"
```

### Task 5: Seed script

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (prisma seed config)

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs
npm install -D @types/bcryptjs
```

- [ ] **Step 2: Write the seed script**

`prisma/seed.ts` (Prisma 7: construct the client with the `PrismaPg` adapter; `dotenv/config` loads `DATABASE_URL` from `.env`, or from `.env.test` when run via `dotenv-cli`):
```ts
import "dotenv/config";
import { PrismaClient, State } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

const STATUSES: Record<State, string[]> = {
  PROSPECT: ["Not Started", "Cancelled", "In Progress"],
  SALES: ["In Progress", "Cancelled", "Lost", "Pending"],
  CONTRACT: ["In Progress", "Cancelled", "Delayed", "Pending"],
  PROJECT: ["In Progress", "Cancelled"],
};

const TAGS: Record<State, string[]> = {
  PROSPECT: ["Researching", "Initial Contract", "Mail sent", "Working with other partner", "Hard to get in", "Contact attempted", "Lead is not defined", "High Chance", "Low Chance"],
  SALES: ["Contact Attempted", "Presentation Sent", "Meeting Completed", "Qualification", "Unresponsive", "Waiting for response", "Mostly Negative", "Mostly Positive", "High Chances", "Demo", "Lead is defined"],
  CONTRACT: ["Contract Signed", "Implementation Planned", "Onboarding Started", "Closed Won", "Lost to Competitor", "Budget Unavailable", "No Decision", "Client Cancelled", "Requirements Changed", "Closed Lost", "Won", "Lost"],
  PROJECT: ["Delayed by Client", "Delayed Internally", "Budget Frozen", "Waiting for Future Opportunity"],
};

async function main() {
  const passwordHash = await bcrypt.hash("admin1234", 10);
  await db.user.upsert({
    where: { email: "admin@saleswind.local" },
    update: {},
    create: { name: "Admin", email: "admin@saleswind.local", passwordHash, role: "ADMIN" },
  });

  for (const state of Object.values(State)) {
    for (const label of STATUSES[state]) {
      await db.status.upsert({ where: { state_label: { state, label } }, update: {}, create: { state, label } });
    }
    for (const label of TAGS[state]) {
      await db.tag.upsert({ where: { state_label: { state, label } }, update: {}, create: { state, label } });
    }
  }
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
```

- [ ] **Step 3: Register the seed command (Prisma 7 → `prisma.config.ts`)**

Prisma 7 no longer reads the `package.json` `"prisma".seed` key. Add the seed to `prisma.config.ts` instead, inside the existing `migrations` block:
```ts
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
```
If `npx prisma db seed` does not pick this up on the installed Prisma version, verify the correct key with `npx prisma db seed --help`; the seed can always be run directly with `npx tsx prisma/seed.ts` as a fallback (it is self-contained).

- [ ] **Step 4: Run the seed and verify**

Run (dev DB):
```bash
npx prisma db seed   # or: npx tsx prisma/seed.ts
```
Then verify counts without the interactive Studio:
```bash
npx tsx -e "import('dotenv/config').then(()=>Promise.all([import('@prisma/client'),import('@prisma/adapter-pg')])).then(async ([{PrismaClient},{PrismaPg}])=>{const d=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})});console.log('users',await d.user.count(),'statuses',await d.status.count(),'tags',await d.tag.count());await d.\$disconnect();})"
```
Expected: 1 admin user, 13 statuses, 36 tags across the four states. (`npx prisma studio` is also available but is interactive — skip in automated runs.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: seed admin user and per-state vocabularies"
```

---

## Phase 2 — Pure Domain Logic (unit-tested, no DB)

### Task 6: Gross profit calculation

**Files:**
- Create: `src/lib/domain/finance.ts`
- Test: `tests/unit/finance.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/finance.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { grossProfit } from "@/lib/domain/finance";

describe("grossProfit", () => {
  it("multiplies revenue by margin percent", () => {
    expect(grossProfit(100000, 30)).toBe(30000);
  });
  it("returns 0 when revenue is 0", () => {
    expect(grossProfit(0, 30)).toBe(0);
  });
  it("rounds to 2 decimals", () => {
    expect(grossProfit(99.99, 33.33)).toBe(33.33);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- finance`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/domain/finance.ts`:
```ts
export function grossProfit(revenue: number, marginPct: number): number {
  return Math.round(revenue * (marginPct / 100) * 100) / 100;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- finance`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: gross profit calculation"
```

### Task 7: Lifecycle transition rules

**Files:**
- Create: `src/lib/domain/lifecycle.ts`
- Test: `tests/unit/lifecycle.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/lifecycle.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { ORDER, nextState, prevState, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";

describe("lifecycle", () => {
  it("defines the state order", () => {
    expect(ORDER).toEqual(["PROSPECT", "SALES", "CONTRACT", "PROJECT"]);
  });
  it("advances one step", () => {
    expect(nextState("PROSPECT")).toBe("SALES");
    expect(nextState("PROJECT")).toBeNull();
  });
  it("moves back one step", () => {
    expect(prevState("SALES")).toBe("PROSPECT");
    expect(prevState("PROSPECT")).toBeNull();
  });
  it("cannot advance past the last state", () => {
    expect(canAdvance("PROJECT")).toBe(false);
    expect(canAdvance("SALES")).toBe(true);
  });
  it("cannot move back from the first state", () => {
    expect(canMoveBack("PROSPECT")).toBe(false);
    expect(canMoveBack("CONTRACT")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lifecycle`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/domain/lifecycle.ts`:
```ts
import type { State } from "@prisma/client";

export const ORDER: State[] = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"];

export function nextState(s: State): State | null {
  const i = ORDER.indexOf(s);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
}

export function prevState(s: State): State | null {
  const i = ORDER.indexOf(s);
  return i > 0 ? ORDER[i - 1] : null;
}

export function canAdvance(s: State): boolean {
  return nextState(s) !== null;
}

export function canMoveBack(s: State): boolean {
  return prevState(s) !== null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- lifecycle`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: opportunity lifecycle transition rules"
```

### Task 8: Permission checks

**Files:**
- Create: `src/lib/domain/permissions.ts`
- Test: `tests/unit/permissions.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/permissions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { can } from "@/lib/domain/permissions";

describe("permissions", () => {
  it("agents can manage opportunities but not the dictionary", () => {
    expect(can("AGENT", "opportunity:write")).toBe(true);
    expect(can("AGENT", "dictionary:manage")).toBe(false);
    expect(can("AGENT", "reports:view")).toBe(false);
  });
  it("managers can view reports", () => {
    expect(can("MANAGER", "reports:view")).toBe(true);
    expect(can("MANAGER", "dictionary:manage")).toBe(false);
  });
  it("admins can do everything", () => {
    expect(can("ADMIN", "dictionary:manage")).toBe(true);
    expect(can("ADMIN", "users:manage")).toBe(true);
    expect(can("ADMIN", "reports:view")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- permissions`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/domain/permissions.ts`:
```ts
import type { Role } from "@prisma/client";

export type Action =
  | "opportunity:write"
  | "account:write"
  | "comment:write"
  | "reports:view"
  | "dictionary:manage"
  | "users:manage";

const MATRIX: Record<Role, Action[]> = {
  AGENT: ["opportunity:write", "account:write", "comment:write"],
  MANAGER: ["opportunity:write", "account:write", "comment:write", "reports:view"],
  ADMIN: ["opportunity:write", "account:write", "comment:write", "reports:view", "dictionary:manage", "users:manage"],
};

export function can(role: Role, action: Action): boolean {
  return MATRIX[role].includes(action);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- permissions`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: role permission matrix"
```

### Task 9: Activity diffing

**Files:**
- Create: `src/lib/domain/activity-diff.ts`
- Test: `tests/unit/activity-diff.test.ts`

- [ ] **Step 1: Write the failing test**

`tests/unit/activity-diff.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { diffFields } from "@/lib/domain/activity-diff";

describe("diffFields", () => {
  it("returns one entry per changed field", () => {
    const entries = diffFields(
      { title: "A", revenue: 100 },
      { title: "B", revenue: 100 }
    );
    expect(entries).toEqual([{ fieldChanged: "title", oldValue: "A", newValue: "B" }]);
  });
  it("returns empty array when nothing changed", () => {
    expect(diffFields({ title: "A" }, { title: "A" })).toEqual([]);
  });
  it("stringifies non-string values", () => {
    const entries = diffFields({ revenue: 100 }, { revenue: 200 });
    expect(entries).toEqual([{ fieldChanged: "revenue", oldValue: "100", newValue: "200" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- activity-diff`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/domain/activity-diff.ts`:
```ts
export interface FieldChange {
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
}

function toStr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  for (const key of Object.keys(after)) {
    if (toStr(before[key]) !== toStr(after[key])) {
      changes.push({ fieldChanged: key, oldValue: toStr(before[key]), newValue: toStr(after[key]) });
    }
  }
  return changes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- activity-diff`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: activity field diffing"
```

---

## Phase 3 — Authentication

### Task 10: Auth.js Credentials provider

**Files:**
- Create: `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `.env` (add `AUTH_SECRET`)

> **Why two files:** NextAuth v5 runs the middleware on the Edge runtime, where Prisma and bcrypt cannot run. We split an **edge-safe** base config (`auth.config.ts` — no DB, used by middleware) from the **full** config (`auth.ts` — adds the Credentials provider that touches the DB, used by server components and the route handler).

- [ ] **Step 1: Install Auth.js**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Add AUTH_SECRET**

Run:
```bash
npx auth secret
```
Expected: `AUTH_SECRET` appended to `.env`.

- [ ] **Step 3: Create the edge-safe base config**

`src/lib/auth.config.ts`:
```ts
import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // real providers added in auth.ts (kept out of the edge bundle)
  callbacks: {
    authorized: ({ auth, request }) => {
      const isLoggedIn = !!auth?.user;
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      if (isLogin) {
        return isLoggedIn ? Response.redirect(new URL("/opportunities", request.nextUrl)) : true;
      }
      return isLoggedIn; // false → redirect to signIn page
    },
    jwt: ({ token, user }) => {
      if (user) { token.id = user.id; token.role = (user as { role: string }).role; }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
```

- [ ] **Step 4: Create the full config (adds Credentials)**

`src/lib/auth.ts`:
```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (creds) => {
        const email = creds?.email as string;
        const password = creds?.password as string;
        if (!email || !password) return null;
        const user = await db.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
```

- [ ] **Step 5: Wire the route handler**

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

- [ ] **Step 6: Add a type augmentation**

`src/types/next-auth.d.ts`:
```ts
import type { Role } from "@prisma/client";
declare module "next-auth" {
  interface User { role: Role; }
  interface Session { user: { id: string; role: Role; name?: string | null; email?: string | null; }; }
}
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: Auth.js credentials provider (split edge-safe config)"
```

### Task 11: Session helpers

**Files:**
- Create: `src/lib/session.ts`
- Test: `tests/unit/session-guard.test.ts`

- [ ] **Step 1: Write the failing test (pure guard logic)**

`tests/unit/session-guard.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { assertRole } from "@/lib/session";
import type { Role } from "@prisma/client";

describe("assertRole", () => {
  const user = { id: "1", role: "AGENT" as Role };
  it("passes when the user has permission", () => {
    expect(() => assertRole(user, "opportunity:write")).not.toThrow();
  });
  it("throws when the user lacks permission", () => {
    expect(() => assertRole(user, "dictionary:manage")).toThrow("Forbidden");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- session-guard`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/lib/session.ts`:
```ts
import { auth } from "@/lib/auth";
import { can, type Action } from "@/lib/domain/permissions";
import type { Role } from "@prisma/client";

export interface SessionUser { id: string; role: Role; name?: string | null; email?: string | null; }

export function assertRole(user: { role: Role }, action: Action): void {
  if (!can(user.role, action)) throw new Error("Forbidden");
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  return (session?.user as SessionUser) ?? null;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(action: Action): Promise<SessionUser> {
  const user = await requireUser();
  assertRole(user, action);
  return user;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- session-guard`
Expected: passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: session and role-guard helpers"
```

### Task 12: Login page + route protection

**Files:**
- Create: `src/app/(auth)/login/page.tsx`, `src/middleware.ts`

- [ ] **Step 1: Build the login page**

`src/app/(auth)/login/page.tsx`:
```tsx
import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default function LoginPage() {
  async function login(formData: FormData) {
    "use server";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: "/opportunities",
      });
    } catch (e) {
      redirect("/login?error=1");
    }
  }
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <form action={login} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-medium text-neutral-900">Sign in to Saleswind</h1>
        <input name="email" type="email" placeholder="Email" required
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Password" required
          className="mb-6 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <button type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Sign in
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Add route-protection middleware**

This instantiates NextAuth from the **edge-safe** `authConfig` only (no Prisma/bcrypt), and the `authorized` callback defined in Task 10 handles the redirect logic.

`src/middleware.ts`:
```ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 3: Manually verify**

Run `npm run dev`, visit `/opportunities` (redirects to `/login`), sign in with `admin@saleswind.local` / `admin1234`.
Expected: redirect to `/opportunities` after login.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: login page and route protection"
```

---

## Phase 4 — App Shell & Design System

### Task 13: UI primitives (Google-like design system)

> **Design note:** Apply the **superpowers:frontend-design** skill when building this task and all subsequent UI tasks, to realize the modern/minimalistic Google-like language from the spec (Inter font, neutral surfaces, one accent color, subtle elevation, generous whitespace).

**Files:**
- Create: `src/components/ui/Button.tsx`, `Input.tsx`, `Select.tsx`, `Card.tsx`, `Pill.tsx`, `Chip.tsx`, `Dialog.tsx`
- Modify: `src/app/layout.tsx` (Inter font)

- [ ] **Step 1: Set the font and base styles**

In `src/app/layout.tsx`, import Inter and apply it:
```tsx
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-neutral-50 font-sans text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Build the primitives**

`src/components/ui/Button.tsx`:
```tsx
import { cn } from "@/lib/cn";
import type { ButtonHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return <button className={cn("rounded-lg px-4 py-2 text-sm font-medium transition", styles, className)} {...props} />;
}
```

`src/components/ui/Pill.tsx`:
```tsx
import { cn } from "@/lib/cn";

const STATE_STYLES: Record<string, string> = {
  PROSPECT: "bg-amber-50 text-amber-700",
  SALES: "bg-blue-50 text-blue-700",
  CONTRACT: "bg-violet-50 text-violet-700",
  PROJECT: "bg-emerald-50 text-emerald-700",
};

export function Pill({ state }: { state: string }) {
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATE_STYLES[state] ?? "bg-neutral-100 text-neutral-700")}>
      {state.charAt(0) + state.slice(1).toLowerCase()}
    </span>
  );
}
```

`src/components/ui/Chip.tsx`:
```tsx
export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-700">
      {label}
      {onRemove && <button type="button" onClick={onRemove} className="text-neutral-400 hover:text-neutral-700">×</button>}
    </span>
  );
}
```

`src/components/ui/Card.tsx`:
```tsx
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>{children}</div>;
}
```

`src/components/ui/Input.tsx`:
```tsx
import type { InputHTMLAttributes } from "react";
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none ${props.className ?? ""}`} />;
}
```

`src/components/ui/Select.tsx`:
```tsx
import type { SelectHTMLAttributes } from "react";
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none ${props.className ?? ""}`} />;
}
```

`src/components/ui/Dialog.tsx`:
```tsx
"use client";
export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
```

- [ ] **Step 3: Add the `cn` helper**

`src/lib/cn.ts`:
```ts
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: UI primitives and design system base"
```

### Task 14: App shell (left nav + top bar)

**Files:**
- Create: `src/app/(app)/layout.tsx`, `src/components/nav/AppShell.tsx`

- [ ] **Step 1: Build the app shell**

`src/components/nav/AppShell.tsx`:
```tsx
import Link from "next/link";
import type { Role } from "@prisma/client";
import { can } from "@/lib/domain/permissions";

const NAV = [
  { href: "/opportunities", label: "Opportunities", action: null },
  { href: "/accounts", label: "Accounts", action: null },
  { href: "/reports", label: "Reports", action: "reports:view" as const },
  { href: "/dictionary", label: "Dictionary", action: "dictionary:manage" as const },
  { href: "/users", label: "Users", action: "users:manage" as const },
];

export function AppShell({ role, children, bell }: { role: Role; children: React.ReactNode; bell: React.ReactNode }) {
  const items = NAV.filter((i) => !i.action || can(role, i.action));
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-neutral-200 bg-white p-4">
        <div className="mb-8 px-2 text-lg font-semibold text-blue-600">Saleswind</div>
        <nav className="space-y-1">
          {items.map((i) => (
            <Link key={i.href} href={i.href}
              className="block rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100">{i.label}</Link>
          ))}
        </nav>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-end gap-4 border-b border-neutral-200 bg-white px-6">
          {bell}
        </header>
        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the route-group layout**

`src/app/(app)/layout.tsx`:
```tsx
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/nav/AppShell";
import { NotificationBell } from "@/components/nav/NotificationBell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AppShell role={user.role} bell={<NotificationBell />}>{children}</AppShell>;
}
```

- [ ] **Step 3: Add a placeholder NotificationBell (replaced in Task 25)**

`src/components/nav/NotificationBell.tsx`:
```tsx
export function NotificationBell() {
  return <span className="text-sm text-neutral-400">🔔</span>;
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: app shell with left nav and top bar"
```

---

## Phase 5 — Accounts

### Task 15: Account schema, service, and actions

**Files:**
- Create: `src/schemas/account.ts`, `src/services/account-service.ts`, `src/actions/account-actions.ts`
- Test: `tests/integration/account-service.test.ts`

- [ ] **Step 1: Write the Zod schema**

`src/schemas/account.ts`:
```ts
import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  primaryContactName: z.string().optional(),
  primaryContactEmail: z.string().email().optional().or(z.literal("")),
  primaryContactPhone: z.string().optional(),
  notes: z.string().optional(),
});

export type AccountInput = z.infer<typeof accountSchema>;
```

- [ ] **Step 2: Write the failing integration test**

`tests/integration/account-service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createAccount, listAccounts } from "@/services/account-service";

let userId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `t${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
});
afterAll(async () => { await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect(); });

describe("account-service", () => {
  it("creates an account with an auto number and lists it", async () => {
    const acc = await createAccount({ name: "Acme" }, userId);
    expect(acc.name).toBe("Acme");
    expect(acc.number).toBeGreaterThan(0);
    const list = await listAccounts();
    expect(list.some((a) => a.id === acc.id)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

First migrate the test DB: `npx dotenv-cli -e .env.test -- npx prisma migrate deploy`
Run: `npm test -- account-service`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the service**

`src/services/account-service.ts`:
```ts
import "server-only";
import { db } from "@/lib/db";
import type { AccountInput } from "@/schemas/account";

export async function createAccount(input: AccountInput, userId: string) {
  return db.account.create({ data: { ...input, website: input.website || null, primaryContactEmail: input.primaryContactEmail || null, createdById: userId } });
}

export async function listAccounts() {
  return db.account.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { opportunities: true } } } });
}

export async function getAccount(id: string) {
  return db.account.findUnique({ where: { id }, include: { opportunities: { include: { status: true } } } });
}

export async function updateAccount(id: string, input: AccountInput) {
  return db.account.update({ where: { id }, data: { ...input, website: input.website || null, primaryContactEmail: input.primaryContactEmail || null } });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- account-service`
Expected: passing.

- [ ] **Step 6: Write the actions**

`src/actions/account-actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { accountSchema } from "@/schemas/account";
import { createAccount, updateAccount } from "@/services/account-service";

export async function createAccountAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const acc = await createAccount(parsed.data, user.id);
  revalidatePath("/accounts");
  redirect(`/accounts/${acc.id}`);
}

export async function updateAccountAction(id: string, _prev: unknown, formData: FormData) {
  await requireRole("account:write");
  const parsed = accountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await updateAccount(id, parsed.data);
  revalidatePath(`/accounts/${id}`);
  return { ok: true };
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: account schema, service, and actions"
```

### Task 16: Account pages

**Files:**
- Create: `src/app/(app)/accounts/page.tsx`, `src/app/(app)/accounts/[id]/page.tsx`, `src/components/accounts/AccountForm.tsx`

- [ ] **Step 1: Build the account form (client)**

`src/components/accounts/AccountForm.tsx`:
```tsx
"use client";
import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AccountForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ error?: unknown }>; }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-3 max-w-lg">
      <Input name="name" placeholder="Account name" required />
      <Input name="industry" placeholder="Industry" />
      <Input name="website" placeholder="Website (https://...)" />
      <Input name="primaryContactName" placeholder="Contact name" />
      <Input name="primaryContactEmail" placeholder="Contact email" />
      <Input name="primaryContactPhone" placeholder="Contact phone" />
      <Input name="notes" placeholder="Notes" />
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save account"}</Button>
      {state?.error ? <p className="text-sm text-red-600">Please check the form.</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Build the accounts list page**

`src/app/(app)/accounts/page.tsx`:
```tsx
import Link from "next/link";
import { listAccounts } from "@/services/account-service";
import { createAccountAction } from "@/actions/account-actions";
import { AccountForm } from "@/components/accounts/AccountForm";
import { Card } from "@/components/ui/Card";

export default async function AccountsPage() {
  const accounts = await listAccounts();
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Accounts</h1>
      </div>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">New account</h2>
        <AccountForm action={createAccountAction} />
      </Card>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500">
            <tr><th className="p-4">#</th><th className="p-4">Name</th><th className="p-4">Industry</th><th className="p-4">Opportunities</th></tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                <td className="p-4 text-neutral-400">{a.number}</td>
                <td className="p-4"><Link href={`/accounts/${a.id}`} className="text-blue-600 hover:underline">{a.name}</Link></td>
                <td className="p-4">{a.industry ?? "—"}</td>
                <td className="p-4">{a._count.opportunities}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Build the account detail page**

`src/app/(app)/accounts/[id]/page.tsx`:
```tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAccount } from "@/services/account-service";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";

export default async function AccountDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await getAccount(id);
  if (!account) notFound();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">{account.name}</h1>
      <Card>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div><dt className="text-neutral-500">Industry</dt><dd>{account.industry ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Website</dt><dd>{account.website ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Contact</dt><dd>{account.primaryContactName ?? "—"}</dd></div>
          <div><dt className="text-neutral-500">Email</dt><dd>{account.primaryContactEmail ?? "—"}</dd></div>
        </dl>
      </Card>
      <Card className="p-0">
        <h2 className="p-4 text-sm font-medium text-neutral-500">Opportunities</h2>
        <table className="w-full text-sm">
          <tbody>
            {account.opportunities.map((o) => (
              <tr key={o.id} className="border-t border-neutral-100 hover:bg-neutral-50">
                <td className="p-4"><Link href={`/opportunities/${o.id}`} className="text-blue-600 hover:underline">{o.title}</Link></td>
                <td className="p-4"><Pill state={o.state} /></td>
                <td className="p-4">{o.status?.label ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: Manually verify**

Run `npm run dev`, sign in, create an account, open its detail page.
Expected: account created, listed, detail renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: account list and detail pages"
```

---

## Phase 6 — Opportunities (core)

### Task 17: Opportunity service — create & update with activity logging

**Files:**
- Create: `src/schemas/opportunity.ts`, `src/services/opportunity-service.ts`, `src/services/notification-service.ts`
- Test: `tests/integration/opportunity-service.test.ts`

- [ ] **Step 1: Write the Zod schema**

`src/schemas/opportunity.ts`:
```ts
import { z } from "zod";

export const opportunityCreateSchema = z.object({
  accountId: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  ownerId: z.string().min(1),
  revenue: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(100),
  meetingAt: z.string().optional(),
});

export const opportunityUpdateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ownerId: z.string().min(1),
  statusId: z.string().optional(),
  revenue: z.coerce.number().min(0),
  marginPct: z.coerce.number().min(0).max(100),
  meetingAt: z.string().optional(),
});

export type OpportunityCreateInput = z.infer<typeof opportunityCreateSchema>;
export type OpportunityUpdateInput = z.infer<typeof opportunityUpdateSchema>;
```

- [ ] **Step 2: Write the notification service (used by opportunity service)**

`src/services/notification-service.ts`:
```ts
import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type Tx = PrismaClient | Prisma.TransactionClient;

export async function notify(tx: Tx, userId: string, opportunityId: string, type: string, message: string) {
  return tx.notification.create({ data: { userId, opportunityId, type, message } });
}
```

- [ ] **Step 3: Write the failing integration test**

`tests/integration/opportunity-service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity, updateOpportunity } from "@/services/opportunity-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `o${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  const a = await db.account.create({ data: { name: "Acme", createdById: userId } });
  accountId = a.id;
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunity.deleteMany();
  await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("opportunity-service", () => {
  it("creates an opportunity and logs creation", async () => {
    const o = await createOpportunity({ accountId, title: "5 Printers", ownerId: userId, revenue: 100000, marginPct: 30 }, userId);
    expect(o.title).toBe("5 Printers");
    const logs = await db.activityLog.findMany({ where: { opportunityId: o.id } });
    expect(logs.some((l) => l.actionType === "created")).toBe(true);
  });

  it("logs a field change on update and stamps lastModified", async () => {
    const o = await createOpportunity({ accountId, title: "Old", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    await updateOpportunity(o.id, { title: "New", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const logs = await db.activityLog.findMany({ where: { opportunityId: o.id, fieldChanged: "title" } });
    expect(logs[0].oldValue).toBe("Old");
    expect(logs[0].newValue).toBe("New");
    const updated = await db.opportunity.findUnique({ where: { id: o.id } });
    expect(updated?.lastModifiedById).toBe(userId);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- opportunity-service`
Expected: FAIL — module not found.

- [ ] **Step 5: Implement the service**

`src/services/opportunity-service.ts`:
```ts
import "server-only";
import { db } from "@/lib/db";
import { diffFields } from "@/lib/domain/activity-diff";
import { notify } from "@/services/notification-service";
import type { OpportunityCreateInput, OpportunityUpdateInput } from "@/schemas/opportunity";

function parseMeeting(v?: string): Date | null {
  return v ? new Date(v) : null;
}

export async function createOpportunity(input: OpportunityCreateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const o = await tx.opportunity.create({
      data: {
        accountId: input.accountId,
        title: input.title,
        description: input.description,
        ownerId: input.ownerId,
        revenue: input.revenue,
        marginPct: input.marginPct,
        meetingAt: parseMeeting(input.meetingAt),
        createdById: userId,
        lastModifiedById: userId,
      },
    });
    await tx.activityLog.create({ data: { opportunityId: o.id, userId, actionType: "created" } });
    // Assignment notification: tell the owner if they didn't create it themselves
    if (o.ownerId !== userId) await notify(tx, o.ownerId, o.id, "assignment", `You were assigned "${o.title}"`);
    return o;
  });
}

export async function updateOpportunity(id: string, input: OpportunityUpdateInput, userId: string) {
  return db.$transaction(async (tx) => {
    const before = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    const after = {
      title: input.title,
      description: input.description ?? null,
      ownerId: input.ownerId,
      statusId: input.statusId || null,
      revenue: input.revenue,
      marginPct: input.marginPct,
      meetingAt: parseMeeting(input.meetingAt),
    };
    const changes = diffFields(
      { title: before.title, description: before.description, ownerId: before.ownerId, statusId: before.statusId, revenue: Number(before.revenue), marginPct: Number(before.marginPct), meetingAt: before.meetingAt?.toISOString() ?? null },
      { ...after, revenue: after.revenue, marginPct: after.marginPct, meetingAt: after.meetingAt?.toISOString() ?? null }
    );
    const updated = await tx.opportunity.update({
      where: { id },
      data: { ...after, lastModifiedAt: new Date(), lastModifiedById: userId },
    });
    for (const c of changes) {
      await tx.activityLog.create({ data: { opportunityId: id, userId, actionType: "updated", ...c } });
    }
    // Assignment notification: tell the new owner if ownership changed to someone else
    if (after.ownerId !== before.ownerId && after.ownerId !== userId) {
      await notify(tx, after.ownerId, id, "assignment", `You were assigned "${after.title}"`);
    }
    return updated;
  });
}

export async function listOpportunities() {
  return db.opportunity.findMany({
    orderBy: { lastModifiedAt: "desc" },
    include: { account: true, owner: true, status: true, tags: { include: { tag: true } } },
  });
}

export async function getOpportunity(id: string) {
  return db.opportunity.findUnique({
    where: { id },
    include: {
      account: true, owner: true, status: true,
      tags: { include: { tag: true } },
      comments: { where: { deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- opportunity-service`
Expected: 2 passing.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: opportunity service with activity logging"
```

### Task 18: Transition service (advance / back / cancel)

**Files:**
- Modify: `src/services/opportunity-service.ts`
- Test: `tests/integration/opportunity-transition.test.ts`

- [ ] **Step 1: Write the failing integration test**

`tests/integration/opportunity-transition.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity, transitionOpportunity } from "@/services/opportunity-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `tr${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
});
afterAll(async () => {
  await db.notification.deleteMany(); await db.activityLog.deleteMany();
  await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("transitionOpportunity", () => {
  it("advances one step and logs it", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const r = await transitionOpportunity(o.id, "advance", userId);
    expect(r.state).toBe("SALES");
  });
  it("rejects advancing past PROJECT", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    await transitionOpportunity(o.id, "advance", userId);
    await transitionOpportunity(o.id, "advance", userId);
    await transitionOpportunity(o.id, "advance", userId);
    await expect(transitionOpportunity(o.id, "advance", userId)).rejects.toThrow();
  });
  it("requires a reason to move back", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    await transitionOpportunity(o.id, "advance", userId);
    await expect(transitionOpportunity(o.id, "back", userId)).rejects.toThrow("reason");
    const r = await transitionOpportunity(o.id, "back", userId, "wrong stage");
    expect(r.state).toBe("PROSPECT");
  });
  it("cancels with a reason from any state", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const r = await transitionOpportunity(o.id, "cancel", userId, "lost");
    expect(r.isCancelled).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- opportunity-transition`
Expected: FAIL — `transitionOpportunity` not exported.

- [ ] **Step 3: Implement the transition**

Append to `src/services/opportunity-service.ts`:
```ts
import { nextState, prevState, canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import { notify } from "@/services/notification-service";

export type TransitionKind = "advance" | "back" | "cancel";

export async function transitionOpportunity(id: string, kind: TransitionKind, userId: string, reason?: string) {
  return db.$transaction(async (tx) => {
    const o = await tx.opportunity.findUniqueOrThrow({ where: { id } });
    if (o.isCancelled) throw new Error("Opportunity is cancelled");

    let newState = o.state;
    let isCancelled: boolean = o.isCancelled; // explicit boolean: the `if (o.isCancelled) throw` guard above narrows to literal `false`

    if (kind === "advance") {
      if (!canAdvance(o.state)) throw new Error("Cannot advance past the final state");
      newState = nextState(o.state)!;
    } else if (kind === "back") {
      if (!reason) throw new Error("A reason is required to move back");
      if (!canMoveBack(o.state)) throw new Error("Cannot move back from the first state");
      newState = prevState(o.state)!;
    } else {
      if (!reason) throw new Error("A reason is required to cancel");
      isCancelled = true;
    }

    const updated = await tx.opportunity.update({
      where: { id },
      data: { state: newState, isCancelled, statusId: kind === "cancel" ? o.statusId : null, lastReason: reason ?? null, lastModifiedAt: new Date(), lastModifiedById: userId },
    });

    await tx.activityLog.create({
      data: { opportunityId: id, userId, actionType: kind, fieldChanged: "state", oldValue: o.state, newValue: isCancelled ? "CANCELLED" : newState },
    });

    if (o.ownerId !== userId) {
      const verb = kind === "cancel" ? "was cancelled" : `moved to ${newState}`;
      await notify(tx, o.ownerId, id, "state", `"${o.title}" ${verb}`);
    }

    return updated;
  });
}
```

> Note: on `advance`/`back` the `statusId` is reset to `null` because each state has its own status vocabulary; the user picks a new status in the new state.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- opportunity-transition`
Expected: all passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: opportunity state transitions with notifications"
```

### Task 19: Opportunity actions

**Files:**
- Create: `src/actions/opportunity-actions.ts`

- [ ] **Step 1: Write the actions**

`src/actions/opportunity-actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { opportunityCreateSchema, opportunityUpdateSchema } from "@/schemas/opportunity";
import { createOpportunity, updateOpportunity, transitionOpportunity, type TransitionKind } from "@/services/opportunity-service";

export async function createOpportunityAction(_prev: unknown, formData: FormData) {
  const user = await requireRole("opportunity:write");
  const parsed = opportunityCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  const o = await createOpportunity(parsed.data, user.id);
  revalidatePath("/opportunities");
  redirect(`/opportunities/${o.id}`);
}

export async function updateOpportunityAction(id: string, _prev: unknown, formData: FormData) {
  const user = await requireRole("opportunity:write");
  const parsed = opportunityUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await updateOpportunity(id, parsed.data, user.id);
  revalidatePath(`/opportunities/${id}`);
  return { ok: true };
}

export async function transitionAction(id: string, kind: TransitionKind, reason?: string) {
  const user = await requireRole("opportunity:write");
  await transitionOpportunity(id, kind, user.id, reason);
  revalidatePath(`/opportunities/${id}`);
  revalidatePath("/opportunities");
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: opportunity server actions"
```

### Task 20: Opportunities list page + table

**Files:**
- Create: `src/app/(app)/opportunities/page.tsx`, `src/components/opportunities/OpportunityTable.tsx`, `src/lib/format.ts`

- [ ] **Step 1: Add formatting helpers**

`src/lib/format.ts`:
```ts
export function money(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}
```

- [ ] **Step 2: Build the table component**

`src/components/opportunities/OpportunityTable.tsx`:
```tsx
import Link from "next/link";
import { Pill } from "@/components/ui/Pill";
import { Chip } from "@/components/ui/Chip";
import { grossProfit } from "@/lib/domain/finance";
import { money, relativeTime } from "@/lib/format";

type Row = {
  id: string; title: string; state: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown;
  account: { name: string }; owner: { name: string }; status: { label: string } | null;
  tags: { tag: { label: string } }[]; lastModifiedAt: Date;
};

export function OpportunityTable({ rows }: { rows: Row[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="border-b border-neutral-200 text-left text-neutral-500">
        <tr>
          <th className="p-3">Title</th><th className="p-3">Account</th><th className="p-3">State</th>
          <th className="p-3">Status</th><th className="p-3">Tags</th><th className="p-3 text-right">Revenue</th>
          <th className="p-3 text-right">Margin</th><th className="p-3 text-right">Gross profit</th>
          <th className="p-3">Owner</th><th className="p-3">Last modified</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((o) => (
          <tr key={o.id} className={`border-b border-neutral-100 hover:bg-neutral-50 ${o.isCancelled ? "opacity-50" : ""}`}>
            <td className="p-3"><Link href={`/opportunities/${o.id}`} className="font-medium text-blue-600 hover:underline">{o.title}</Link></td>
            <td className="p-3">{o.account.name}</td>
            <td className="p-3"><Pill state={o.isCancelled ? "CANCELLED" : o.state} /></td>
            <td className="p-3">{o.status?.label ?? "—"}</td>
            <td className="p-3"><div className="flex flex-wrap gap-1">{o.tags.map((t) => <Chip key={t.tag.label} label={t.tag.label} />)}</div></td>
            <td className="p-3 text-right">{money(Number(o.revenue))}</td>
            <td className="p-3 text-right">{Number(o.marginPct)}%</td>
            <td className="p-3 text-right font-medium">{money(grossProfit(Number(o.revenue), Number(o.marginPct)))}</td>
            <td className="p-3">{o.owner.name}</td>
            <td className="p-3 text-neutral-500">{relativeTime(new Date(o.lastModifiedAt))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

- [ ] **Step 3: Build the list page with view toggle**

`src/app/(app)/opportunities/page.tsx`:
```tsx
import Link from "next/link";
import { listOpportunities } from "@/services/opportunity-service";
import { OpportunityTable } from "@/components/opportunities/OpportunityTable";
import { KanbanBoard } from "@/components/opportunities/KanbanBoard";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const rows = await listOpportunities();
  const isKanban = view === "kanban";
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Opportunities</h1>
        <div className="flex items-center gap-2">
          <Link href="/opportunities?view=table" className={`rounded-lg px-3 py-1.5 text-sm ${!isKanban ? "bg-neutral-200" : "hover:bg-neutral-100"}`}>Table</Link>
          <Link href="/opportunities?view=kanban" className={`rounded-lg px-3 py-1.5 text-sm ${isKanban ? "bg-neutral-200" : "hover:bg-neutral-100"}`}>Board</Link>
          <Link href="/opportunities/new"><Button>New opportunity</Button></Link>
        </div>
      </div>
      {isKanban ? <KanbanBoard rows={rows} /> : <Card className="p-0"><OpportunityTable rows={rows} /></Card>}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: opportunities list page and table"
```

### Task 21: Kanban board view

**Files:**
- Create: `src/components/opportunities/KanbanBoard.tsx`

- [ ] **Step 1: Build the board**

`src/components/opportunities/KanbanBoard.tsx`:
```tsx
import Link from "next/link";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Row = {
  id: string; title: string; state: string; isCancelled: boolean;
  revenue: unknown; marginPct: unknown; account: { name: string };
};

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export function KanbanBoard({ rows }: { rows: Row[] }) {
  const active = rows.filter((r) => !r.isCancelled);
  return (
    <div className="grid grid-cols-4 gap-4">
      {ORDER.map((state) => {
        const items = active.filter((r) => r.state === state);
        return (
          <div key={state} className="rounded-2xl bg-neutral-100 p-3">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-medium text-neutral-700">{LABEL[state]}</span>
              <span className="text-xs text-neutral-400">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="block rounded-xl bg-white p-3 shadow-sm hover:shadow">
                  <div className="text-sm font-medium text-neutral-900">{o.title}</div>
                  <div className="text-xs text-neutral-500">{o.account.name}</div>
                  <div className="mt-2 text-xs text-neutral-700">{money(grossProfit(Number(o.revenue), Number(o.marginPct)))} GP</div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

Run `npm run dev`, visit `/opportunities?view=kanban`.
Expected: four columns, cards grouped by state.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: kanban board view"
```

### Task 22: New-opportunity page

**Files:**
- Create: `src/app/(app)/opportunities/new/page.tsx`, `src/components/opportunities/OpportunityCreateForm.tsx`

- [ ] **Step 1: Build the create form (client, live gross profit)**

`src/components/opportunities/OpportunityCreateForm.tsx`:
```tsx
"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Option = { id: string; label: string };

export function OpportunityCreateForm({ action, accounts, users }: {
  action: (prev: unknown, fd: FormData) => Promise<{ error?: unknown }>;
  accounts: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [revenue, setRevenue] = useState(0);
  const [margin, setMargin] = useState(0);
  return (
    <form action={formAction} className="max-w-lg space-y-3">
      <Select name="accountId" required defaultValue="">
        <option value="" disabled>Select account…</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
      </Select>
      <Input name="title" placeholder="Title (e.g. 5 XWZ Printers)" required />
      <Input name="description" placeholder="Description" />
      <Select name="ownerId" required defaultValue="">
        <option value="" disabled>Assign owner…</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </Select>
      <div className="flex gap-3">
        <Input name="revenue" type="number" step="0.01" placeholder="Revenue" required onChange={(e) => setRevenue(Number(e.target.value))} />
        <Input name="marginPct" type="number" step="0.01" placeholder="Margin %" required onChange={(e) => setMargin(Number(e.target.value))} />
      </div>
      <p className="text-sm text-neutral-500">Gross profit: <span className="font-medium text-neutral-900">{money(grossProfit(revenue, margin))}</span></p>
      <Input name="meetingAt" type="datetime-local" />
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create opportunity"}</Button>
      {state?.error ? <p className="text-sm text-red-600">Please check the form.</p> : null}
    </form>
  );
}
```

- [ ] **Step 2: Build the page (loads accounts + users)**

`src/app/(app)/opportunities/new/page.tsx`:
```tsx
import { db } from "@/lib/db";
import { createOpportunityAction } from "@/actions/opportunity-actions";
import { OpportunityCreateForm } from "@/components/opportunities/OpportunityCreateForm";
import { Card } from "@/components/ui/Card";

export default async function NewOpportunityPage() {
  const [accounts, users] = await Promise.all([
    db.account.findMany({ orderBy: { name: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-medium">New opportunity</h1>
      <Card>
        <OpportunityCreateForm
          action={createOpportunityAction}
          accounts={accounts.map((a) => ({ id: a.id, label: a.name }))}
          users={users.map((u) => ({ id: u.id, label: u.name }))}
        />
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Manually verify**

Run `npm run dev`, create an opportunity; confirm redirect to its detail page and it appears in the list.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: new opportunity page with live gross profit"
```

### Task 23: Opportunity detail — header, stepper, edit, transitions

**Files:**
- Create: `src/app/(app)/opportunities/[id]/page.tsx`, `src/components/opportunities/StateStepper.tsx`, `src/components/opportunities/TransitionControls.tsx`, `src/components/opportunities/OpportunityEditForm.tsx`

- [ ] **Step 1: Build the state stepper**

`src/components/opportunities/StateStepper.tsx`:
```tsx
import { ORDER } from "@/lib/domain/lifecycle";

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export function StateStepper({ state, cancelled }: { state: string; cancelled: boolean }) {
  const currentIdx = ORDER.indexOf(state as (typeof ORDER)[number]);
  return (
    <div className="flex items-center gap-2">
      {ORDER.map((s, i) => {
        const done = i <= currentIdx && !cancelled;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? "bg-blue-600 text-white" : "bg-neutral-200 text-neutral-500"}`}>{i + 1}</div>
            <span className={`text-sm ${i === currentIdx && !cancelled ? "font-medium text-neutral-900" : "text-neutral-500"}`}>{LABEL[s]}</span>
            {i < ORDER.length - 1 && <span className="text-neutral-300">→</span>}
          </div>
        );
      })}
      {cancelled && <span className="ml-3 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">Cancelled</span>}
    </div>
  );
}
```

- [ ] **Step 2: Build the transition controls (client, reason prompt)**

`src/components/opportunities/TransitionControls.tsx`:
```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { transitionAction } from "@/actions/opportunity-actions";
import type { TransitionKind } from "@/services/opportunity-service";

export function TransitionControls({ id, canAdvance, canBack, cancelled }: {
  id: string; canAdvance: boolean; canBack: boolean; cancelled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  if (cancelled) return <p className="text-sm text-neutral-500">This opportunity is cancelled.</p>;

  async function run(kind: TransitionKind, needsReason: boolean) {
    let reason: string | undefined;
    if (needsReason) {
      reason = window.prompt(`Reason to ${kind}?`) ?? undefined;
      if (!reason) return;
    }
    setBusy(true);
    await transitionAction(id, kind, reason);
    setBusy(false);
  }

  return (
    <div className="flex gap-2">
      {canAdvance && <Button disabled={busy} onClick={() => run("advance", false)}>Advance</Button>}
      {canBack && <Button variant="ghost" disabled={busy} onClick={() => run("back", true)}>Move back</Button>}
      <Button variant="danger" disabled={busy} onClick={() => run("cancel", true)}>Cancel</Button>
    </div>
  );
}
```

- [ ] **Step 3: Build the edit form (client, live gross profit, status options for current state)**

`src/components/opportunities/OpportunityEditForm.tsx`:
```tsx
"use client";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { grossProfit } from "@/lib/domain/finance";
import { money } from "@/lib/format";

type Option = { id: string; label: string };

export function OpportunityEditForm({ action, defaults, statuses, users }: {
  action: (prev: unknown, fd: FormData) => Promise<{ ok?: boolean; error?: unknown }>;
  defaults: { title: string; description: string; ownerId: string; statusId: string; revenue: number; marginPct: number; meetingAt: string };
  statuses: Option[]; users: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [revenue, setRevenue] = useState(defaults.revenue);
  const [margin, setMargin] = useState(defaults.marginPct);
  return (
    <form action={formAction} className="space-y-3">
      <Input name="title" defaultValue={defaults.title} required />
      <Input name="description" defaultValue={defaults.description} />
      <Select name="statusId" defaultValue={defaults.statusId}>
        <option value="">No status</option>
        {statuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </Select>
      <Select name="ownerId" defaultValue={defaults.ownerId}>
        {users.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
      </Select>
      <div className="flex gap-3">
        <Input name="revenue" type="number" step="0.01" defaultValue={defaults.revenue} onChange={(e) => setRevenue(Number(e.target.value))} />
        <Input name="marginPct" type="number" step="0.01" defaultValue={defaults.marginPct} onChange={(e) => setMargin(Number(e.target.value))} />
      </div>
      <p className="text-sm text-neutral-500">Gross profit: <span className="font-medium text-neutral-900">{money(grossProfit(revenue, margin))}</span></p>
      <Input name="meetingAt" type="datetime-local" defaultValue={defaults.meetingAt} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      {state?.ok ? <span className="ml-3 text-sm text-emerald-600">Saved</span> : null}
    </form>
  );
}
```

- [ ] **Step 4: Build the detail page**

`src/app/(app)/opportunities/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getOpportunity } from "@/services/opportunity-service";
import { updateOpportunityAction } from "@/actions/opportunity-actions";
import { canAdvance, canMoveBack } from "@/lib/domain/lifecycle";
import { StateStepper } from "@/components/opportunities/StateStepper";
import { TransitionControls } from "@/components/opportunities/TransitionControls";
import { OpportunityEditForm } from "@/components/opportunities/OpportunityEditForm";
import { TagPicker } from "@/components/opportunities/TagPicker";
import { CommentThread } from "@/components/comments/CommentThread";
import { ActivityLogView } from "@/components/activity/ActivityLogView";
import { Card } from "@/components/ui/Card";

export default async function OpportunityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await getOpportunity(id);
  if (!o) notFound();

  const [statuses, tags, users] = await Promise.all([
    db.status.findMany({ where: { state: o.state, isActive: true }, orderBy: { label: "asc" } }),
    db.tag.findMany({ where: { state: o.state, isActive: true }, orderBy: { label: "asc" } }),
    db.user.findMany({ orderBy: { name: "asc" } }),
  ]);
  const attached = new Set(o.tags.map((t) => t.tag.id));

  const bind = updateOpportunityAction.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium">{o.title}</h1>
        <p className="text-sm text-neutral-500">{o.account.name} · Owner {o.owner.name}</p>
      </div>
      <Card><StateStepper state={o.state} cancelled={o.isCancelled} /></Card>
      <Card>
        <TransitionControls id={o.id} canAdvance={canAdvance(o.state)} canBack={canMoveBack(o.state)} cancelled={o.isCancelled} />
      </Card>
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h2 className="mb-4 text-sm font-medium text-neutral-500">Details</h2>
          <OpportunityEditForm
            action={bind}
            defaults={{
              title: o.title, description: o.description ?? "", ownerId: o.ownerId, statusId: o.statusId ?? "",
              revenue: Number(o.revenue), marginPct: Number(o.marginPct),
              meetingAt: o.meetingAt ? o.meetingAt.toISOString().slice(0, 16) : "",
            }}
            statuses={statuses.map((s) => ({ id: s.id, label: s.label }))}
            users={users.map((u) => ({ id: u.id, label: u.name }))}
          />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-medium text-neutral-500">Tags</h2>
          <TagPicker opportunityId={o.id} allTags={tags.map((t) => ({ id: t.id, label: t.label }))} attachedIds={[...attached]} />
        </Card>
      </div>
      <Card><CommentThread opportunityId={o.id} comments={o.comments.map((c) => ({ id: c.id, body: c.body, author: c.author.name, createdAt: c.createdAt }))} /></Card>
      <Card><ActivityLogView entries={o.activities} /></Card>
    </div>
  );
}
```

- [ ] **Step 5: Manually verify after Tasks 24–26 exist**

(Tag/comment/activity components are built next; after Task 26, verify the detail page renders and Advance/Cancel work.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: opportunity detail with stepper, edit, and transitions"
```

### Task 24: Tag attach/detach

**Files:**
- Create: `src/components/opportunities/TagPicker.tsx`
- Modify: `src/services/opportunity-service.ts`, `src/actions/opportunity-actions.ts`
- Test: `tests/integration/opportunity-tags.test.ts`

- [ ] **Step 1: Write the failing integration test**

`tests/integration/opportunity-tags.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { attachTag, detachTag } from "@/services/opportunity-service";

let userId: string, accountId: string, tagId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `tag${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
  tagId = (await db.tag.create({ data: { state: "PROSPECT", label: `Tag${Date.now()}` } })).id;
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunityTag.deleteMany(); await db.opportunity.deleteMany();
  await db.tag.deleteMany({ where: { id: tagId } }); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("tags", () => {
  it("attaches and detaches a tag", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    await attachTag(o.id, tagId, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(1);
    await detachTag(o.id, tagId, userId);
    expect(await db.opportunityTag.count({ where: { opportunityId: o.id } })).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- opportunity-tags`
Expected: FAIL — `attachTag` not exported.

- [ ] **Step 3: Implement in the service**

Append to `src/services/opportunity-service.ts`:
```ts
export async function attachTag(opportunityId: string, tagId: string, userId: string) {
  await db.$transaction(async (tx) => {
    await tx.opportunityTag.create({ data: { opportunityId, tagId } });
    const tag = await tx.tag.findUniqueOrThrow({ where: { id: tagId } });
    await tx.activityLog.create({ data: { opportunityId, userId, actionType: "tag-added", newValue: tag.label } });
    await tx.opportunity.update({ where: { id: opportunityId }, data: { lastModifiedAt: new Date(), lastModifiedById: userId } });
  });
}

export async function detachTag(opportunityId: string, tagId: string, userId: string) {
  await db.$transaction(async (tx) => {
    await tx.opportunityTag.delete({ where: { opportunityId_tagId: { opportunityId, tagId } } });
    const tag = await tx.tag.findUniqueOrThrow({ where: { id: tagId } });
    await tx.activityLog.create({ data: { opportunityId, userId, actionType: "tag-removed", oldValue: tag.label } });
    await tx.opportunity.update({ where: { id: opportunityId }, data: { lastModifiedAt: new Date(), lastModifiedById: userId } });
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- opportunity-tags`
Expected: passing.

- [ ] **Step 5: Add the tag actions**

Append to `src/actions/opportunity-actions.ts`:
```ts
import { attachTag, detachTag } from "@/services/opportunity-service";

export async function attachTagAction(opportunityId: string, tagId: string) {
  const user = await requireRole("opportunity:write");
  await attachTag(opportunityId, tagId, user.id);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function detachTagAction(opportunityId: string, tagId: string) {
  const user = await requireRole("opportunity:write");
  await detachTag(opportunityId, tagId, user.id);
  revalidatePath(`/opportunities/${opportunityId}`);
}
```

- [ ] **Step 6: Build the TagPicker component**

`src/components/opportunities/TagPicker.tsx`:
```tsx
"use client";
import { Chip } from "@/components/ui/Chip";
import { attachTagAction, detachTagAction } from "@/actions/opportunity-actions";

type Tag = { id: string; label: string };

export function TagPicker({ opportunityId, allTags, attachedIds }: { opportunityId: string; allTags: Tag[]; attachedIds: string[] }) {
  const attachedSet = new Set(attachedIds);
  const attached = allTags.filter((t) => attachedSet.has(t.id));
  const available = allTags.filter((t) => !attachedSet.has(t.id));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {attached.length === 0 && <span className="text-sm text-neutral-400">No tags yet</span>}
        {attached.map((t) => <Chip key={t.id} label={t.label} onRemove={() => detachTagAction(opportunityId, t.id)} />)}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
        {available.map((t) => (
          <button key={t.id} onClick={() => attachTagAction(opportunityId, t.id)}
            className="rounded-full border border-dashed border-neutral-300 px-2.5 py-0.5 text-xs text-neutral-600 hover:border-blue-400 hover:text-blue-600">
            + {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: attach/detach tags on opportunities"
```

### Task 25: Comments

**Files:**
- Create: `src/services/comment-service.ts`, `src/actions/comment-actions.ts`, `src/components/comments/CommentThread.tsx`
- Test: `tests/integration/comment-service.test.ts`

- [ ] **Step 1: Write the failing integration test**

`tests/integration/comment-service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { addComment, deleteComment, listComments } from "@/services/comment-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `c${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
});
afterAll(async () => {
  await db.comment.deleteMany(); await db.notification.deleteMany(); await db.activityLog.deleteMany();
  await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("comment-service", () => {
  it("adds a comment then soft-deletes it (excluded from list, row remains)", async () => {
    const o = await createOpportunity({ accountId, title: "T", ownerId: userId, revenue: 1, marginPct: 1 }, userId);
    const c = await addComment(o.id, "Hello", userId);
    expect((await listComments(o.id)).length).toBe(1);
    await deleteComment(c.id);
    expect((await listComments(o.id)).length).toBe(0);
    expect(await db.comment.count({ where: { id: c.id } })).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- comment-service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

`src/services/comment-service.ts`:
```ts
import "server-only";
import { db } from "@/lib/db";
import { notify } from "@/services/notification-service";

export async function addComment(opportunityId: string, body: string, authorId: string) {
  return db.$transaction(async (tx) => {
    const comment = await tx.comment.create({ data: { opportunityId, body, authorId } });
    const o = await tx.opportunity.findUniqueOrThrow({ where: { id: opportunityId } });
    if (o.ownerId !== authorId) await notify(tx, o.ownerId, opportunityId, "comment", `New comment on "${o.title}"`);
    return comment;
  });
}

export async function deleteComment(id: string) {
  return db.comment.update({ where: { id }, data: { deletedAt: new Date() } });
}

export async function listComments(opportunityId: string) {
  return db.comment.findMany({ where: { opportunityId, deletedAt: null }, include: { author: true }, orderBy: { createdAt: "asc" } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- comment-service`
Expected: passing.

- [ ] **Step 5: Write the actions**

`src/actions/comment-actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { addComment, deleteComment } from "@/services/comment-service";

export async function addCommentAction(opportunityId: string, formData: FormData) {
  const user = await requireRole("comment:write");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;
  await addComment(opportunityId, body, user.id);
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function deleteCommentAction(opportunityId: string, commentId: string) {
  await requireRole("comment:write");
  await deleteComment(commentId);
  revalidatePath(`/opportunities/${opportunityId}`);
}
```

- [ ] **Step 6: Build the CommentThread component**

`src/components/comments/CommentThread.tsx`:
```tsx
"use client";
import { addCommentAction, deleteCommentAction } from "@/actions/comment-actions";
import { Button } from "@/components/ui/Button";
import { relativeTime } from "@/lib/format";

type Comment = { id: string; body: string; author: string; createdAt: Date };

export function CommentThread({ opportunityId, comments }: { opportunityId: string; comments: Comment[] }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium text-neutral-500">Comments</h2>
      <div className="space-y-3">
        {comments.map((c) => (
          <div key={c.id} className="group flex items-start justify-between rounded-lg bg-neutral-50 p-3">
            <div>
              <div className="text-sm text-neutral-900">{c.body}</div>
              <div className="mt-1 text-xs text-neutral-400">{c.author} · {relativeTime(new Date(c.createdAt))}</div>
            </div>
            <button onClick={() => deleteCommentAction(opportunityId, c.id)} className="text-xs text-neutral-300 opacity-0 hover:text-red-500 group-hover:opacity-100">Delete</button>
          </div>
        ))}
        {comments.length === 0 && <p className="text-sm text-neutral-400">No comments yet</p>}
      </div>
      <form action={addCommentAction.bind(null, opportunityId)} className="flex gap-2">
        <input name="body" placeholder="Add a comment…" className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
        <Button type="submit">Post</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: comments with soft delete and author history"
```

### Task 26: Activity log view

**Files:**
- Create: `src/components/activity/ActivityLogView.tsx`

- [ ] **Step 1: Build the activity log view**

`src/components/activity/ActivityLogView.tsx`:
```tsx
import { relativeTime } from "@/lib/format";

type Entry = { id: string; actionType: string; fieldChanged: string | null; oldValue: string | null; newValue: string | null; createdAt: Date };

function describe(e: Entry): string {
  switch (e.actionType) {
    case "created": return "Created the opportunity";
    case "updated": return `Changed ${e.fieldChanged} from "${e.oldValue ?? "—"}" to "${e.newValue ?? "—"}"`;
    case "advance": return `Advanced to ${e.newValue}`;
    case "back": return `Moved back to ${e.newValue}`;
    case "cancel": return "Cancelled the opportunity";
    case "tag-added": return `Added tag "${e.newValue}"`;
    case "tag-removed": return `Removed tag "${e.oldValue}"`;
    default: return e.actionType;
  }
}

export function ActivityLogView({ entries }: { entries: Entry[] }) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-neutral-500">Activity history</h2>
      <ol className="space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-300" />
            <span className="text-neutral-700">{describe(e)}</span>
            <span className="text-xs text-neutral-400">{relativeTime(new Date(e.createdAt))}</span>
          </li>
        ))}
        {entries.length === 0 && <p className="text-sm text-neutral-400">No activity yet</p>}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify the full detail page**

Run `npm run dev`, open an opportunity: edit fields (activity entries appear), attach/detach tags, post/delete a comment, Advance and Cancel (with reason).
Expected: every action logs an entry; cancel sets the cancelled badge.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: activity history view"
```

---

## Phase 7 — Notifications

### Task 27: Notification actions + bell UI

**Files:**
- Create: `src/actions/notification-actions.ts`
- Modify: `src/services/notification-service.ts`, `src/components/nav/NotificationBell.tsx`
- Test: `tests/integration/notification-service.test.ts`

- [ ] **Step 1: Write the failing integration test**

`tests/integration/notification-service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { listNotifications, markAllRead } from "@/services/notification-service";

let userId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `n${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } });
  userId = u.id;
  await db.notification.createMany({ data: [
    { userId, type: "state", message: "a" },
    { userId, type: "comment", message: "b" },
  ] });
});
afterAll(async () => { await db.notification.deleteMany(); await db.user.deleteMany(); await db.$disconnect(); });

describe("notification-service", () => {
  it("lists unread then marks all read", async () => {
    const before = await listNotifications(userId);
    expect(before.filter((n) => !n.readAt).length).toBe(2);
    await markAllRead(userId);
    const after = await listNotifications(userId);
    expect(after.filter((n) => !n.readAt).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- notification-service`
Expected: FAIL — `listNotifications` not exported.

- [ ] **Step 3: Extend the service**

Append to `src/services/notification-service.ts`:
```ts
import { db } from "@/lib/db";

export async function listNotifications(userId: string) {
  return db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
}

export async function unreadCount(userId: string) {
  return db.notification.count({ where: { userId, readAt: null } });
}

export async function markAllRead(userId: string) {
  await db.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- notification-service`
Expected: passing.

- [ ] **Step 5: Write the action**

`src/actions/notification-actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { markAllRead } from "@/services/notification-service";

export async function markAllReadAction() {
  const user = await requireUser();
  await markAllRead(user.id);
  revalidatePath("/", "layout");
}
```

- [ ] **Step 6: Build the real NotificationBell (server component fetches, client dropdown)**

Replace `src/components/nav/NotificationBell.tsx`:
```tsx
import { requireUser } from "@/lib/session";
import { listNotifications, unreadCount } from "@/services/notification-service";
import { NotificationDropdown } from "@/components/nav/NotificationDropdown";

export async function NotificationBell() {
  const user = await requireUser();
  const [items, count] = await Promise.all([listNotifications(user.id), unreadCount(user.id)]);
  return <NotificationDropdown count={count} items={items.map((n) => ({ id: n.id, message: n.message, read: !!n.readAt }))} />;
}
```

`src/components/nav/NotificationDropdown.tsx`:
```tsx
"use client";
import { useState } from "react";
import { markAllReadAction } from "@/actions/notification-actions";

type Item = { id: string; message: string; read: boolean };

export function NotificationDropdown({ count, items }: { count: number; items: Item[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative text-neutral-600 hover:text-neutral-900">
        🔔
        {count > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-72 rounded-xl bg-white p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-medium text-neutral-500">Notifications</span>
            <button onClick={() => markAllReadAction()} className="text-xs text-blue-600 hover:underline">Mark all read</button>
          </div>
          {items.length === 0 && <p className="px-2 py-3 text-sm text-neutral-400">Nothing yet</p>}
          {items.map((n) => (
            <div key={n.id} className={`rounded-lg px-2 py-2 text-sm ${n.read ? "text-neutral-400" : "text-neutral-800"}`}>{n.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: in-app notifications bell"
```

---

## Phase 8 — Dictionary & Users (admin)

### Task 28: Dictionary service + actions

**Files:**
- Create: `src/services/dictionary-service.ts`, `src/actions/dictionary-actions.ts`
- Test: `tests/integration/dictionary-service.test.ts`

- [ ] **Step 1: Write the failing integration test**

`tests/integration/dictionary-service.test.ts`:
```ts
import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { addStatus, toggleStatus, addTag } from "@/services/dictionary-service";

afterAll(async () => { await db.$disconnect(); });

describe("dictionary-service", () => {
  it("adds a status and toggles its active flag", async () => {
    const label = `S${Date.now()}`;
    const s = await addStatus("SALES", label);
    expect(s.isActive).toBe(true);
    const t = await toggleStatus(s.id);
    expect(t.isActive).toBe(false);
    await db.status.delete({ where: { id: s.id } });
  });
  it("adds a tag", async () => {
    const label = `T${Date.now()}`;
    const tag = await addTag("PROSPECT", label);
    expect(tag.label).toBe(label);
    await db.tag.delete({ where: { id: tag.id } });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dictionary-service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

`src/services/dictionary-service.ts`:
```ts
import "server-only";
import { db } from "@/lib/db";
import type { State } from "@prisma/client";

export async function addStatus(state: State, label: string) {
  return db.status.create({ data: { state, label } });
}
export async function toggleStatus(id: string) {
  const s = await db.status.findUniqueOrThrow({ where: { id } });
  return db.status.update({ where: { id }, data: { isActive: !s.isActive } });
}
export async function renameStatus(id: string, label: string) {
  return db.status.update({ where: { id }, data: { label } });
}
export async function addTag(state: State, label: string) {
  return db.tag.create({ data: { state, label } });
}
export async function toggleTag(id: string) {
  const t = await db.tag.findUniqueOrThrow({ where: { id } });
  return db.tag.update({ where: { id }, data: { isActive: !t.isActive } });
}
export async function renameTag(id: string, label: string) {
  return db.tag.update({ where: { id }, data: { label } });
}
export async function listVocabularies() {
  const [statuses, tags, definitions] = await Promise.all([
    db.status.findMany({ orderBy: [{ state: "asc" }, { label: "asc" }] }),
    db.tag.findMany({ orderBy: [{ state: "asc" }, { label: "asc" }] }),
    db.definition.findMany({ orderBy: { term: "asc" } }),
  ]);
  return { statuses, tags, definitions };
}
export async function upsertDefinition(term: string, definition: string) {
  return db.definition.upsert({ where: { term }, update: { definition }, create: { term, definition } });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dictionary-service`
Expected: passing.

- [ ] **Step 5: Write the actions (admin-guarded)**

`src/actions/dictionary-actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import type { State } from "@prisma/client";
import { addStatus, toggleStatus, addTag, toggleTag, upsertDefinition } from "@/services/dictionary-service";

export async function addStatusAction(formData: FormData) {
  await requireRole("dictionary:manage");
  await addStatus(formData.get("state") as State, String(formData.get("label")));
  revalidatePath("/dictionary");
}
export async function toggleStatusAction(id: string) {
  await requireRole("dictionary:manage");
  await toggleStatus(id);
  revalidatePath("/dictionary");
}
export async function addTagAction(formData: FormData) {
  await requireRole("dictionary:manage");
  await addTag(formData.get("state") as State, String(formData.get("label")));
  revalidatePath("/dictionary");
}
export async function toggleTagAction(id: string) {
  await requireRole("dictionary:manage");
  await toggleTag(id);
  revalidatePath("/dictionary");
}
export async function upsertDefinitionAction(formData: FormData) {
  await requireRole("dictionary:manage");
  await upsertDefinition(String(formData.get("term")), String(formData.get("definition")));
  revalidatePath("/dictionary");
}
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: dictionary service and admin actions"
```

### Task 29: Dictionary page

**Files:**
- Create: `src/app/(app)/dictionary/page.tsx`

- [ ] **Step 1: Build the dictionary admin page**

`src/app/(app)/dictionary/page.tsx`:
```tsx
import { requireRole } from "@/lib/session";
import { listVocabularies } from "@/services/dictionary-service";
import { addStatusAction, toggleStatusAction, addTagAction, toggleTagAction, upsertDefinitionAction } from "@/actions/dictionary-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const STATES = ["PROSPECT", "SALES", "CONTRACT", "PROJECT"] as const;

export default async function DictionaryPage() {
  await requireRole("dictionary:manage");
  const { statuses, tags, definitions } = await listVocabularies();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">Dictionary</h1>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Statuses</h2>
        {STATES.map((s) => (
          <div key={s} className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase text-neutral-400">{s}</div>
            <div className="flex flex-wrap gap-2">
              {statuses.filter((x) => x.state === s).map((x) => (
                <form key={x.id} action={toggleStatusAction.bind(null, x.id)}>
                  <button type="submit"
                    className={`rounded-full px-2.5 py-0.5 text-xs ${x.isActive ? "bg-blue-50 text-blue-700" : "bg-neutral-100 text-neutral-400 line-through"}`}>{x.label}</button>
                </form>
              ))}
            </div>
            <form action={addStatusAction} className="mt-2 flex gap-2">
              <input type="hidden" name="state" value={s} />
              <input name="label" placeholder="New status" className="rounded-lg border border-neutral-300 px-2 py-1 text-xs" />
              <Button type="submit" variant="ghost">Add</Button>
            </form>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Tags</h2>
        {STATES.map((s) => (
          <div key={s} className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase text-neutral-400">{s}</div>
            <div className="flex flex-wrap gap-2">
              {tags.filter((x) => x.state === s).map((x) => (
                <form key={x.id} action={toggleTagAction.bind(null, x.id)}>
                  <button type="submit"
                    className={`rounded-full px-2.5 py-0.5 text-xs ${x.isActive ? "bg-neutral-100 text-neutral-700" : "bg-neutral-100 text-neutral-400 line-through"}`}>{x.label}</button>
                </form>
              ))}
            </div>
            <form action={addTagAction} className="mt-2 flex gap-2">
              <input type="hidden" name="state" value={s} />
              <input name="label" placeholder="New tag" className="rounded-lg border border-neutral-300 px-2 py-1 text-xs" />
              <Button type="submit" variant="ghost">Add</Button>
            </form>
          </div>
        ))}
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Definitions</h2>
        <ul className="mb-4 space-y-2">
          {definitions.map((d) => (
            <li key={d.id} className="text-sm"><span className="font-medium">{d.term}:</span> {d.definition}</li>
          ))}
        </ul>
        <form action={upsertDefinitionAction} className="flex gap-2">
          <input name="term" placeholder="Term" className="rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
          <input name="definition" placeholder="Definition" className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-sm" />
          <Button type="submit">Save</Button>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

Run `npm run dev` as admin, visit `/dictionary`, add a status/tag/definition and toggle one off.
Expected: changes persist; a non-admin visiting `/dictionary` gets an error (guarded).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: dictionary admin page"
```

### Task 30: User management

**Files:**
- Create: `src/schemas/user.ts`, `src/services/user-service.ts`, `src/actions/user-actions.ts`, `src/app/(app)/users/page.tsx`
- Test: `tests/integration/user-service.test.ts`

- [ ] **Step 1: Write the schema**

`src/schemas/user.ts`:
```ts
import { z } from "zod";
export const userCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER", "AGENT"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;
```

- [ ] **Step 2: Write the failing integration test**

`tests/integration/user-service.test.ts`:
```ts
import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { createUser, listUsers } from "@/services/user-service";

afterAll(async () => { await db.$disconnect(); });

describe("user-service", () => {
  it("creates a user with a hashed password", async () => {
    const email = `u${Date.now()}@x.com`;
    const u = await createUser({ name: "New", email, password: "password1", role: "MANAGER" });
    expect(u.role).toBe("MANAGER");
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.passwordHash).not.toBe("password1");
    expect(await bcrypt.compare("password1", row.passwordHash)).toBe(true);
    expect((await listUsers()).some((x) => x.id === u.id)).toBe(true);
    await db.user.delete({ where: { id: u.id } });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- user-service`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement the service**

`src/services/user-service.ts`:
```ts
import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import type { UserCreateInput } from "@/schemas/user";

export async function createUser(input: UserCreateInput) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  return db.user.create({ data: { name: input.name, email: input.email, role: input.role, passwordHash } });
}
export async function listUsers() {
  return db.user.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, role: true, createdAt: true } });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- user-service`
Expected: passing.

- [ ] **Step 6: Write the action**

`src/actions/user-actions.ts`:
```ts
"use server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { userCreateSchema } from "@/schemas/user";
import { createUser } from "@/services/user-service";

export async function createUserAction(_prev: unknown, formData: FormData) {
  await requireRole("users:manage");
  const parsed = userCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  await createUser(parsed.data);
  revalidatePath("/users");
  return { ok: true };
}
```

- [ ] **Step 7: Build the users page**

`src/app/(app)/users/page.tsx`:
```tsx
import { requireRole } from "@/lib/session";
import { listUsers } from "@/services/user-service";
import { createUserAction } from "@/actions/user-actions";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default async function UsersPage() {
  await requireRole("users:manage");
  const users = await listUsers();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-medium">Users</h1>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Add user</h2>
        <form action={createUserAction.bind(null, {})} className="grid max-w-2xl grid-cols-2 gap-3">
          <input name="name" placeholder="Name" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
          <input name="email" type="email" placeholder="Email" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
          <input name="password" type="password" placeholder="Temp password (min 8)" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" required />
          <select name="role" className="rounded-lg border border-neutral-300 px-3 py-2 text-sm" defaultValue="AGENT">
            <option value="AGENT">Agent</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
          </select>
          <Button type="submit">Create user</Button>
        </form>
      </Card>
      <Card className="p-0">
        <table className="w-full text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Role</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-neutral-100"><td className="p-4">{u.name}</td><td className="p-4">{u.email}</td><td className="p-4">{u.role}</td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: user management for admins"
```

---

## Phase 9 — Reports

### Task 31: Report aggregation service

**Files:**
- Create: `src/services/report-service.ts`
- Test: `tests/integration/report-service.test.ts`

- [ ] **Step 1: Write the failing integration test**

`tests/integration/report-service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createOpportunity } from "@/services/opportunity-service";
import { pipelineSummary } from "@/services/report-service";

let userId: string, accountId: string;

beforeAll(async () => {
  const u = await db.user.create({ data: { name: "T", email: `r${Date.now()}@x.com`, passwordHash: "x", role: "MANAGER" } });
  userId = u.id;
  accountId = (await db.account.create({ data: { name: "A", createdById: userId } })).id;
  await createOpportunity({ accountId, title: "X", ownerId: userId, revenue: 100000, marginPct: 30 }, userId);
});
afterAll(async () => {
  await db.activityLog.deleteMany(); await db.opportunity.deleteMany(); await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("report-service", () => {
  it("summarizes pipeline by state with revenue and gross profit", async () => {
    const summary = await pipelineSummary();
    const prospect = summary.find((s) => s.state === "PROSPECT");
    expect(prospect?.count).toBeGreaterThanOrEqual(1);
    expect(prospect?.revenue).toBeGreaterThanOrEqual(100000);
    expect(prospect?.grossProfit).toBeGreaterThanOrEqual(30000);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- report-service`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the service**

`src/services/report-service.ts`:
```ts
import "server-only";
import { db } from "@/lib/db";
import { ORDER } from "@/lib/domain/lifecycle";
import { grossProfit } from "@/lib/domain/finance";
import type { State } from "@prisma/client";

export interface StateSummary { state: State; count: number; revenue: number; grossProfit: number; }

export async function pipelineSummary(): Promise<StateSummary[]> {
  const opps = await db.opportunity.findMany({ where: { isCancelled: false }, select: { state: true, revenue: true, marginPct: true } });
  return ORDER.map((state) => {
    const rows = opps.filter((o) => o.state === state);
    const revenue = rows.reduce((sum, o) => sum + Number(o.revenue), 0);
    const grossProfitTotal = rows.reduce((sum, o) => sum + grossProfit(Number(o.revenue), Number(o.marginPct)), 0);
    return { state, count: rows.length, revenue, grossProfit: grossProfitTotal };
  });
}

export async function opportunitiesForExport() {
  return db.opportunity.findMany({
    include: { account: true, owner: true, status: true },
    orderBy: { createdAt: "desc" },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- report-service`
Expected: passing.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: report aggregation service"
```

### Task 32: Reports dashboard page

**Files:**
- Create: `src/app/(app)/reports/page.tsx`

- [ ] **Step 1: Build the dashboard**

`src/app/(app)/reports/page.tsx`:
```tsx
import { requireRole } from "@/lib/session";
import { pipelineSummary } from "@/services/report-service";
import { Card } from "@/components/ui/Card";
import { money } from "@/lib/format";

const LABEL: Record<string, string> = { PROSPECT: "Prospect", SALES: "Sales", CONTRACT: "Contract", PROJECT: "Project" };

export default async function ReportsPage() {
  await requireRole("reports:view");
  const summary = await pipelineSummary();
  const totalRevenue = summary.reduce((s, x) => s + x.revenue, 0);
  const totalGP = summary.reduce((s, x) => s + x.grossProfit, 0);
  const maxRevenue = Math.max(1, ...summary.map((s) => s.revenue));
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Reports</h1>
        <div className="flex gap-2">
          <a href="/reports/export?format=csv" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">Export CSV</a>
          <a href="/reports/export?format=pdf" className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">Export PDF</a>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Card><div className="text-sm text-neutral-500">Total pipeline revenue</div><div className="mt-1 text-2xl font-medium">{money(totalRevenue)}</div></Card>
        <Card><div className="text-sm text-neutral-500">Total gross profit</div><div className="mt-1 text-2xl font-medium">{money(totalGP)}</div></Card>
      </div>
      <Card>
        <h2 className="mb-4 text-sm font-medium text-neutral-500">Pipeline by state</h2>
        <div className="space-y-3">
          {summary.map((s) => (
            <div key={s.state} className="flex items-center gap-4">
              <div className="w-24 text-sm">{LABEL[s.state]}</div>
              <div className="h-6 flex-1 rounded bg-neutral-100">
                <div className="h-6 rounded bg-blue-500" style={{ width: `${(s.revenue / maxRevenue) * 100}%` }} />
              </div>
              <div className="w-40 text-right text-sm text-neutral-600">{s.count} · {money(s.revenue)}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Manually verify**

Run `npm run dev` as admin/manager, visit `/reports`.
Expected: summary cards and per-state bars render.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: reports dashboard"
```

### Task 33: CSV + PDF export

**Files:**
- Create: `src/app/(app)/reports/export/route.ts`, `src/lib/csv.ts`
- Test: `tests/unit/csv.test.ts`

- [ ] **Step 1: Write the failing CSV test**

`tests/unit/csv.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("renders headers and rows and escapes commas/quotes", () => {
    const csv = toCsv(["name", "note"], [["Acme, Inc", 'He said "hi"']]);
    expect(csv).toBe('name,note\n"Acme, Inc","He said ""hi"""');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- csv`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the CSV helper**

`src/lib/csv.ts`:
```ts
function escape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const head = headers.map(escape).join(",");
  const body = rows.map((r) => r.map(escape).join(",")).join("\n");
  return body ? `${head}\n${body}` : head;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- csv`
Expected: passing.

- [ ] **Step 5: Install the PDF library**

```bash
npm install pdf-lib
```

- [ ] **Step 6: Build the export route (CSV + PDF)**

`src/app/(app)/reports/export/route.ts`:
```ts
import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { requireRole } from "@/lib/session";
import { opportunitiesForExport, pipelineSummary } from "@/services/report-service";
import { grossProfit } from "@/lib/domain/finance";
import { toCsv } from "@/lib/csv";

export async function GET(req: Request) {
  await requireRole("reports:view");
  const format = new URL(req.url).searchParams.get("format") ?? "csv";
  const opps = await opportunitiesForExport();

  if (format === "csv") {
    const headers = ["Title", "Account", "State", "Status", "Owner", "Revenue", "Margin %", "Gross Profit", "Cancelled"];
    const rows = opps.map((o) => [
      o.title, o.account.name, o.state, o.status?.label ?? "", o.owner.name,
      Number(o.revenue), Number(o.marginPct), grossProfit(Number(o.revenue), Number(o.marginPct)), o.isCancelled ? "Yes" : "No",
    ]);
    return new NextResponse(toCsv(headers, rows), {
      headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="opportunities.csv"' },
    });
  }

  // PDF: pipeline summary
  const summary = await pipelineSummary();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawText("Saleswind — Pipeline Report", { x: 50, y: 790, size: 18, font: bold });
  let y = 740;
  page.drawText("State        Count     Revenue        Gross Profit", { x: 50, y, size: 12, font: bold });
  y -= 24;
  for (const s of summary) {
    page.drawText(`${s.state.padEnd(12)} ${String(s.count).padEnd(8)} ${s.revenue.toFixed(2).padEnd(14)} ${s.grossProfit.toFixed(2)}`, { x: 50, y, size: 11, font });
    y -= 20;
  }
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="pipeline-report.pdf"' },
  });
}
```

- [ ] **Step 7: Manually verify**

Run `npm run dev`, visit `/reports`, click Export CSV and Export PDF.
Expected: a CSV of opportunities and a PDF summary download.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: CSV and PDF report export"
```

---

## Phase 10 — End-to-End Smoke Test

### Task 34: Playwright smoke test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Install Playwright**

```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Configure Playwright**

`playwright.config.ts`:
```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120000 },
});
```

- [ ] **Step 3: Write the smoke test**

`tests/e2e/smoke.spec.ts`:
```ts
import { test, expect } from "@playwright/test";

test("core flow: login → create account → create opportunity → advance → comment", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@saleswind.local");
  await page.fill('input[name="password"]', "admin1234");
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/opportunities/);

  // Create account
  await page.goto("/accounts");
  await page.fill('input[name="name"]', "E2E Account");
  await page.click('button:has-text("Save account")');
  await expect(page.locator("h1")).toContainText("E2E Account");

  // Create opportunity
  await page.goto("/opportunities/new");
  await page.selectOption('select[name="accountId"]', { label: "E2E Account" });
  await page.fill('input[name="title"]', "E2E Opportunity");
  await page.selectOption('select[name="ownerId"]', { index: 1 });
  await page.fill('input[name="revenue"]', "100000");
  await page.fill('input[name="marginPct"]', "30");
  await page.click('button:has-text("Create opportunity")');
  await expect(page.locator("h1")).toContainText("E2E Opportunity");

  // Advance
  await page.click('button:has-text("Advance")');
  await expect(page.locator("text=Sales")).toBeVisible();

  // Comment
  await page.fill('input[name="body"]', "First comment");
  await page.click('button:has-text("Post")');
  await expect(page.locator("text=First comment")).toBeVisible();
});
```

- [ ] **Step 4: Add the e2e script and run it**

Add to `package.json` `"scripts"`: `"test:e2e": "playwright test"`.
Ensure the dev DB is seeded (`npx prisma db seed`), then run: `npm run test:e2e`
Expected: the smoke test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: end-to-end smoke test for core flow"
```

---

## Phase 11 — Deployment

### Task 35: Vercel deployment configuration

**Files:**
- Create: `vercel.json` (optional), README deployment notes
- Modify: `package.json` build script

- [ ] **Step 1: Ensure Prisma generates on build**

In `package.json`, set the build script:
```json
"build": "prisma generate && prisma migrate deploy && next build"
```

- [ ] **Step 2: Document required environment variables**

Create `README.md` deployment section listing: `DATABASE_URL` (Vercel Postgres or external), `AUTH_SECRET`. Note that `npx prisma db seed` must be run once against production to create the admin user and vocabularies.

- [ ] **Step 3: Deploy**

Connect the repo to Vercel, add a Postgres database, set env vars, and deploy. After first deploy, run the seed against the production database.
Expected: app reachable, login works with the seeded admin.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: production build and deployment config"
```

---

## Notes for the Implementer

- **Dependency versions (REQUIRED):** install the **latest stable** release of every framework, library, and tool — never pin to an older major. Always use `npm install <pkg>@latest` (and `create-next-app@latest`). Before installing, check the current stable with `npm view <pkg> version`; if a package's newest is a pre-release/`beta`/`rc`, install the latest non-prerelease stable with `npm view <pkg> dist-tags.latest`. Note: `next-auth` v5 is published under the `beta` tag and is the current line for the App Router — install `next-auth@latest`; if that resolves to a v4 stable, install `next-auth@beta` (v5) instead, since the split-config/middleware code in this plan targets v5. After install, run `npm view next @prisma/client react version` (etc.) is not needed, but do confirm the app builds against whatever latest resolves to and adjust any minor API drift.
- **Test database (Prisma 7 + Vitest):** Vitest auto-loads `.env.test` via the `tests/setup-env.ts` setup file (configured in `vitest.config.ts`), so integration tests run against `saleswind_test` automatically — just run `npm test` (no per-command env wrapper needed). Whenever the schema changes, re-apply migrations to the test DB with `npx dotenv-cli -e .env.test -- npx prisma migrate deploy`. Note: `prisma.config.ts` loads `.env` (dev) via `dotenv/config` with `override:false`, so the outer `dotenv-cli -e .env.test` wins for CLI commands.
- **Decimal handling:** Prisma returns `Decimal` for `revenue`/`marginPct`. Always wrap with `Number(...)` before passing to `grossProfit` or formatting.
- **Status reset on transition:** advancing or moving back clears `statusId` (each state has its own status vocabulary); the user picks a new status in the new state. This is intentional — see Task 18.
- **Auth in tests:** services take an explicit `userId`, so integration tests don't need a session. Permission enforcement is tested separately (Task 8) and applied in actions via `requireRole`.
- **Design polish:** apply the **superpowers:frontend-design** skill while building Phase 4 onward to refine the Google-like visual language beyond the structural styling shown here.
