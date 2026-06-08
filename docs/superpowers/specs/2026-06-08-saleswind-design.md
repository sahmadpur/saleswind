# Saleswind — Design Spec

**Date:** 2026-06-08
**Status:** Approved design, ready for implementation planning

## 1. Overview

Saleswind is a web-based sales pipeline (CRM) for tracking sales opportunities from
first contact through to a signed, delivered project. Sales agents and vendor managers
create **Accounts** (potential clients) and **Opportunities** (possible deals), then move
each opportunity through four lifecycle **states** — Prospect → Sales → Contract → Project —
recording statuses, tags, revenue/profit, comments, and a full activity history along the way.

This is a **full production system**: real authentication, roles and permissions,
in-app notifications, reporting, and audit logging.

## 2. Goals

- Single place to insert and track all sales-relevant transactions and their statuses.
- Clear, enforced opportunity lifecycle with an auditable history of every change.
- At-a-glance pipeline view with revenue and auto-calculated gross profit.
- Admin-configurable vocabularies (statuses, tags) and a definitions dictionary.
- Reporting with dashboard, CSV, and PDF export.

## 3. Users & Roles

Three roles, **shared visibility** (everyone can read all opportunities):

| Role | Capabilities |
|------|--------------|
| **Agent** | Create/edit accounts and opportunities, change states, attach/detach tags, comment. |
| **Manager** | Everything an Agent can do, plus full access to reports/dashboard. |
| **Admin** | Everything a Manager can do, plus manage the Dictionary (statuses, tags, glossary) and Users. |

Permission checks are enforced **server-side** (in server actions), not just hidden in the UI.

## 4. Technology

- **Framework:** Next.js (App Router) with React Server Components for data-heavy pages and
  **Server Actions** for mutations. Deployed on **Vercel**.
- **Database:** PostgreSQL via **Prisma** (schema file as source of truth, migrations, typed queries).
- **Auth:** **Auth.js (NextAuth)** Credentials provider — email/password, bcrypt-hashed,
  encrypted session cookie. Role stored on the user record. Admin creates/invites users.
- **Validation:** Zod schemas shared client/server.
- **Exports:** CSV streamed server-side; PDF rendered server-side (React-PDF or Puppeteer on a Vercel function).
- **Testing:** Vitest (unit/integration), Playwright (e2e smoke).

## 5. Design Language

Modern, minimalistic, **Google-like**:

- Persistent left navigation + top bar.
- System/Inter typography, generous whitespace, Material-ish restraint.
- Light neutral surfaces, one accent color, subtle shadows, rounded corners, restrained motion.
- Accessible (keyboard-friendly, sufficient contrast) and responsive.

> The **frontend-design skill** will be applied during implementation to build the UI to this standard.

## 6. Domain Model

### 6.1 Lifecycle

States are a **fixed enum**: `PROSPECT → SALES → CONTRACT → PROJECT`. The pipeline logic
depends on this order, so states are not user-configurable.

**Transition rules** (enforced server-side in a single `transitionOpportunity` action):

- **Advance**: forward exactly one step (no skipping).
- **Move back**: back exactly one step; **requires a reason**.
- **Cancel**: allowed from any state; **requires a reason**. Cancelled is a visibly distinct
  terminal condition.
- There is **no limit** on how many opportunities may reach the Project state (per account or globally).
- Every transition writes an ActivityLog row and fires notifications.

### 6.2 Statuses & Tags (admin-configurable vocabularies)

Per-state **statuses** and **tags** are stored as rows (not enums) so Admins can manage them
in the Dictionary (add / rename / activate / deactivate). They are **seeded** from the initial
business requirements (see Appendix A). On an opportunity, the user picks **one status** and
attaches/detaches any number of **tags** from the current state's vocabulary.

### 6.3 Financials

- User manually enters **Revenue** (decimal) and **Margin %** (decimal). Both adjustable any time.
- **Gross Profit = Revenue × Margin%**, **computed, never stored** (always correct, recalculates live in the UI).

### 6.4 Entities (Prisma models)

- **User** — id, name, email, passwordHash, role (`ADMIN|MANAGER|AGENT`), createdAt.
- **Account** — id (auto; human-friendly account number), name, industry, website,
  primaryContactName/Email/Phone, notes, createdById, timestamps. One account → many opportunities.
- **Opportunity** — id, accountId, title, description, ownerId, state (enum), statusId (FK),
  revenue (decimal), marginPct (decimal), meetingAt (nullable), isCancelled (flag) + cancel/back reason,
  createdById, createdAt, **lastModifiedAt**, **lastModifiedById**. (grossProfit derived, not stored.)
- **Status** — id, state, label, isActive. Admin-managed per-state vocabulary.
- **Tag** — id, state, label, isActive. Admin-managed per-state vocabulary.
- **OpportunityTag** — join (opportunityId, tagId): tags currently attached to an opportunity.
- **Comment** — id, opportunityId, authorId, body, createdAt, **deletedAt** (soft delete preserves history).
- **ActivityLog** — id, opportunityId, userId, actionType, fieldChanged, oldValue, newValue, createdAt. Append-only.
- **Notification** — id, userId (recipient), opportunityId, type, message, readAt, createdAt.
- **Definition** — id, term, definition. Admin-editable glossary.

**Deliberate choices:** gross profit is computed; comments and activity log are append-only / soft-delete
so history survives; statuses/tags are rows for admin configurability; states stay a fixed enum.

## 7. Pages & UX

- **Login** — centered card, email/password.
- **Opportunities (main page)** — airy table/list: title, account, state (pill), status, tags (chips),
  revenue, margin %, **gross profit (auto)**, owner, **last modified** (relative time + who).
  Sorting, filtering (state/owner/account), search, prominent "New opportunity".
  Toggle to a **Kanban board** view with the four states as columns.
- **Opportunity detail** — header with title/account/owner and a **state stepper** showing progress;
  editable revenue/margin (gross profit live-recalculates), status dropdown, meeting time, tag add/remove;
  tabbed lower area for **Comments** (author + timestamp, soft-delete) and **Activity history** (full audit log).
  State controls: **Advance / Move back / Cancel**, with a reason prompt on back and cancel.
- **Accounts** — list + create/edit (the "separate space" for accounts); account detail lists its opportunities.
  Opportunity creation picks an account from a dropdown.
- **Reports / Dashboard** — pipeline summary cards (count + total revenue/profit per state), conversion funnel,
  simple charts, date/owner filters, **CSV + PDF export**.
- **Dictionary (Admin)** — manage per-state statuses and tags (add/rename/activate/deactivate) and the glossary.
- **Users (Admin)** — invite/create users, set roles.
- **Notifications** — bell in the top nav with a dropdown list and unread badge.

## 8. Cross-cutting Mechanics

- **Activity logging** — all opportunity mutations pass through a thin service layer that diffs
  old vs. new, appends ActivityLog rows, and stamps lastModifiedAt/By. Consistent and impossible to forget.
- **Notifications** — created in the same transaction as the triggering event for the relevant
  recipients. Triggers (in-app only): an opportunity you own changes state; someone comments on your
  opportunity; you are assigned an opportunity. Surfaced via the bell; marked read on view.
- **Reports** — server-side aggregation queries with filters; CSV streamed directly; PDF rendered
  server-side from the same data.
- **Error handling** — server actions return typed success/error results; forms show inline validation
  (shared Zod schemas); optimistic UI where safe (e.g. attaching a tag) with rollback on failure.

## 9. Testing Strategy

- **Unit (Vitest):** gross-profit calc, transition rules, permission checks, activity diffing.
- **Integration:** server actions against a test Postgres.
- **E2E (Playwright) smoke:** create account → create opportunity → advance through states → comment → export report.

## 10. Out of Scope (first version)

- Email/push notifications (in-app only for now).
- Time-based reminders / "no activity in N days" nudges.
- Multi-tenant / organization separation beyond the single deployment.
- Hard limit on opportunities reaching the Project state.

## Appendix A — Seed vocabularies (from business requirements)

**Prospect** — Statuses: Not Started, Cancelled, In Progress.
Tags: Researching, Initial Contract, Mail sent, Working with other partner, Hard to get in,
Contact attempted, Lead is not defined, High Chance, Low Chance.

**Sales** — Statuses: In Progress, Cancelled, Lost, Pending.
Tags: Contact Attempted, Presentation Sent, Meeting Completed, Qualification, Unresponsive,
Waiting for response, Mostly Negative, Mostly Positive, High Chances, Demo, Lead is defined.

**Contract** — Statuses: In Progress, Cancelled, Delayed, Pending.
Tags: Contract Signed, Implementation Planned, Onboarding Started, Closed Won, Lost to Competitor,
Budget Unavailable, No Decision, Client Cancelled, Requirements Changed, Closed Lost, Won, Lost.

**Project** — Statuses: In Progress, Cancelled.
Tags: Delayed by Client, Delayed Internally, Budget Frozen, Waiting for Future Opportunity.
