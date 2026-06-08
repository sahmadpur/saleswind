import "dotenv/config";
import { PrismaClient, State } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

// Encrypt to a self-signed cert without CA verification; strip sslmode so
// node-postgres doesn't force verify-full. Mirrors src/lib/pg-ssl.ts.
function pgConfig() {
  const raw = process.env.DATABASE_URL ?? "";
  if (!/[?&]sslmode=(require|prefer|verify-ca|verify-full|no-verify)/.test(raw)) {
    return { connectionString: raw || undefined };
  }
  const url = new URL(raw);
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { rejectUnauthorized: false } };
}
const adapter = new PrismaPg(pgConfig());
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

const DAY = 86_400_000;

async function main() {
  // Admin bootstrap credentials are env-configurable so deployments can set a
  // real password without editing this file. Falls back to the dev defaults.
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@saleswind.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin1234";
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { name: "Admin", email: adminEmail, passwordHash: await bcrypt.hash(adminPassword, 10), role: "ADMIN" },
  });

  // Demo team — idempotent on email so re-seeding is safe.
  const team = [
    { name: "Maya Chen", email: "manager@saleswind.local", role: "MANAGER" as const, password: "manager1234" },
    { name: "Liam Patel", email: "liam@saleswind.local", role: "AGENT" as const, password: "agent1234" },
    { name: "Sofia Rossi", email: "sofia@saleswind.local", role: "AGENT" as const, password: "agent1234" },
    { name: "Noah Kim", email: "noah@saleswind.local", role: "AGENT" as const, password: "agent1234" },
  ];
  const members = [];
  for (const m of team) {
    members.push(
      await db.user.upsert({
        where: { email: m.email },
        update: {},
        create: { name: m.name, email: m.email, role: m.role, passwordHash: await bcrypt.hash(m.password, 10) },
      }),
    );
  }
  // owners[0]=admin, [1]=manager, [2..]=agents — rotated across opportunities.
  const owners = [admin, ...members];

  for (const state of Object.values(State)) {
    for (const label of STATUSES[state]) {
      await db.status.upsert({ where: { state_label: { state, label } }, update: {}, create: { state, label } });
    }
    for (const label of TAGS[state]) {
      await db.tag.upsert({ where: { state_label: { state, label } }, update: {}, create: { state, label } });
    }
  }

  await db.definition.upsert({
    where: { term: "MRR" },
    update: {},
    create: { term: "MRR", definition: "Monthly Recurring Revenue — predictable revenue billed every month." },
  });
  await db.definition.upsert({
    where: { term: "Gross Profit" },
    update: {},
    create: { term: "Gross Profit", definition: "Revenue minus the cost of goods sold; here, revenue × margin %." },
  });

  // Volume data has no natural unique key. Gate on a demo marker account so the
  // demo set is created exactly once, without blocking on (or duplicating
  // alongside) any real data already in the database.
  const DEMO_MARKER = "Northwind Traders";
  if (await db.account.findFirst({ where: { name: DEMO_MARKER } })) return;

  const statuses = await db.status.findMany();
  const tags = await db.tag.findMany();
  const statusId = (state: State, label: string) =>
    statuses.find((s) => s.state === state && s.label === label)?.id ?? null;
  const tagId = (state: State, label: string) =>
    tags.find((t) => t.state === state && t.label === label)?.id ?? null;

  const accountSpecs = [
    { name: "Northwind Traders", industry: "Wholesale", website: "https://northwind.example", contact: "Pia Brandt", phone: "+49 30 1234 5670" },
    { name: "Helios Manufacturing", industry: "Manufacturing", website: "https://helios.example", contact: "Tomás Ferreira", phone: "+351 21 555 0102" },
    { name: "Brightline Media", industry: "Media", website: "https://brightline.example", contact: "Aisha Khan", phone: "+44 20 7946 0958" },
    { name: "Cedar & Stone", industry: "Construction", website: "https://cedarstone.example", contact: "Mark Olsen", phone: "+1 312 555 0143" },
    { name: "Quanta Health", industry: "Healthcare", website: "https://quantahealth.example", contact: "Dr. Lena Vogt", phone: "+49 89 555 0177" },
    { name: "Atlas Logistics", industry: "Logistics", website: "https://atlaslogistics.example", contact: "Rui Costa", phone: "+34 91 555 0188" },
    { name: "Vertex Software", industry: "Technology", website: "https://vertex.example", contact: "Hannah Berg", phone: "+1 415 555 0199" },
    { name: "Maple Financial", industry: "Finance", website: "https://maplefin.example", contact: "Daniel Roy", phone: "+1 416 555 0121" },
    { name: "Orchard Retail Group", industry: "Retail", website: "https://orchardretail.example", contact: "Sara Lind", phone: "+46 8 555 0166" },
    { name: "BlueGrid Energy", industry: "Energy", website: "https://bluegrid.example", contact: "Omar Haddad", phone: "+971 4 555 0133" },
    { name: "Polaris Education", industry: "Education", website: "https://polaris.example", contact: "Grace Müller", phone: "+49 40 555 0144" },
    { name: "Tidewater Foods", industry: "Food & Beverage", website: "https://tidewater.example", contact: "Carlos Mendes", phone: "+351 22 555 0155" },
  ];
  const accounts = [];
  for (const a of accountSpecs) {
    accounts.push(
      await db.account.create({
        data: {
          name: a.name,
          industry: a.industry,
          website: a.website,
          primaryContactName: a.contact,
          primaryContactEmail: `${a.contact.split(" ").pop()!.toLowerCase()}@${new URL(a.website).host.replace("www.", "")}`,
          primaryContactPhone: a.phone,
          notes: `Key account in ${a.industry.toLowerCase()}.`,
          createdById: admin.id,
        },
      }),
    );
  }

  type OppSpec = {
    account: number;
    owner: number;
    title: string;
    description: string;
    state: State;
    status: string;
    revenue: number;
    marginPct: number;
    meetingInDays?: number;
    isCancelled?: boolean;
    lastReason?: string;
    tags: string[];
  };
  const oppSpecs: OppSpec[] = [
    // PROSPECT
    { account: 0, owner: 2, title: "Northwind — warehouse rollout", description: "Evaluating Saleswind for their distribution arm.", state: "PROSPECT", status: "In Progress", revenue: 48000, marginPct: 35, meetingInDays: 4, tags: ["Researching", "High Chance"] },
    { account: 2, owner: 3, title: "Brightline — content team pilot", description: "Initial outreach to the editorial group.", state: "PROSPECT", status: "Not Started", revenue: 22000, marginPct: 40, tags: ["Mail sent"] },
    { account: 6, owner: 4, title: "Vertex — developer tooling", description: "Inbound lead from the engineering org.", state: "PROSPECT", status: "In Progress", revenue: 75000, marginPct: 45, meetingInDays: 9, tags: ["Initial Contract", "High Chance"] },
    { account: 10, owner: 1, title: "Polaris — campus license", description: "Exploring a campus-wide deployment.", state: "PROSPECT", status: "Cancelled", revenue: 30000, marginPct: 30, isCancelled: true, lastReason: "Budget cycle closed for the year.", tags: ["Low Chance"] },
    // SALES
    { account: 1, owner: 2, title: "Helios — production line analytics", description: "Demo delivered to operations leadership.", state: "SALES", status: "In Progress", revenue: 120000, marginPct: 38, meetingInDays: 3, tags: ["Demo", "Mostly Positive"] },
    { account: 4, owner: 3, title: "Quanta — compliance reporting", description: "Working through procurement requirements.", state: "SALES", status: "Pending", revenue: 95000, marginPct: 42, meetingInDays: 6, tags: ["Waiting for response", "High Chances"] },
    { account: 8, owner: 4, title: "Orchard — store network rollout", description: "Multi-region expansion under discussion.", state: "SALES", status: "In Progress", revenue: 64000, marginPct: 33, meetingInDays: 1, tags: ["Presentation Sent", "Qualification"] },
    { account: 5, owner: 1, title: "Atlas — fleet tracking", description: "Lost momentum after reorg.", state: "SALES", status: "Lost", revenue: 40000, marginPct: 30, isCancelled: true, lastReason: "Chose an in-house build.", tags: ["Unresponsive"] },
    // CONTRACT
    { account: 3, owner: 2, title: "Cedar & Stone — annual platform", description: "Contract in legal review.", state: "CONTRACT", status: "In Progress", revenue: 88000, marginPct: 36, meetingInDays: 5, tags: ["Contract Signed", "Implementation Planned"] },
    { account: 7, owner: 3, title: "Maple — enterprise agreement", description: "Closed won, onboarding scheduled.", state: "CONTRACT", status: "In Progress", revenue: 156000, marginPct: 44, tags: ["Closed Won", "Onboarding Started"] },
    { account: 9, owner: 4, title: "BlueGrid — pilot to production", description: "Delayed pending security sign-off.", state: "CONTRACT", status: "Delayed", revenue: 110000, marginPct: 41, meetingInDays: 12, tags: ["Requirements Changed"] },
    // PROJECT
    { account: 1, owner: 2, title: "Helios — phase 2 deployment", description: "Implementation underway across two plants.", state: "PROJECT", status: "In Progress", revenue: 120000, marginPct: 38, tags: ["Delayed Internally"] },
    { account: 11, owner: 3, title: "Tidewater — rollout", description: "Project kickoff completed.", state: "PROJECT", status: "In Progress", revenue: 72000, marginPct: 35, meetingInDays: 8, tags: ["Waiting for Future Opportunity"] },
    { account: 7, owner: 4, title: "Maple — onboarding project", description: "Onboarding the finance team.", state: "PROJECT", status: "In Progress", revenue: 156000, marginPct: 44, tags: ["Budget Frozen"] },
  ];

  const opps = [];
  for (const o of oppSpecs) {
    const owner = owners[o.owner % owners.length];
    const opp = await db.opportunity.create({
      data: {
        accountId: accounts[o.account].id,
        title: o.title,
        description: o.description,
        ownerId: owner.id,
        state: o.state,
        statusId: statusId(o.state, o.status),
        revenue: o.revenue,
        marginPct: o.marginPct,
        meetingAt: o.meetingInDays != null ? new Date(Date.now() + o.meetingInDays * DAY) : null,
        isCancelled: o.isCancelled ?? false,
        lastReason: o.lastReason ?? null,
        createdById: owner.id,
        lastModifiedById: owner.id,
      },
    });
    opps.push(opp);
    const tagIds = o.tags.map((label) => tagId(o.state, label)).filter((id): id is string => !!id);
    if (tagIds.length) {
      await db.opportunityTag.createMany({ data: tagIds.map((tagId) => ({ opportunityId: opp.id, tagId })) });
    }
    await db.activityLog.create({
      data: { opportunityId: opp.id, userId: owner.id, actionType: "created", fieldChanged: "state", oldValue: null, newValue: o.state },
    });
  }

  // A few comment threads.
  await db.comment.createMany({
    data: [
      { opportunityId: opps[0].id, authorId: owners[1].id, body: "Sent the proposal — following up Thursday." },
      { opportunityId: opps[0].id, authorId: owners[2].id, body: "Champion confirmed budget is approved." },
      { opportunityId: opps[4].id, authorId: owners[2].id, body: "Demo went well; ops wants a security review." },
      { opportunityId: opps[9].id, authorId: owners[3].id, body: "Contract signed 🎉 kicking off onboarding." },
    ],
  });

  // Unread notifications so the bell shows activity.
  await db.notification.createMany({
    data: [
      { userId: admin.id, opportunityId: opps[1].id, type: "assigned", message: `New opportunity created: ${opps[1].title}` },
      { userId: owners[1].id, opportunityId: opps[4].id, type: "comment", message: "New comment on Helios — production line analytics" },
      { userId: owners[1].id, opportunityId: opps[8].id, type: "state_change", message: "Cedar & Stone moved to Contract" },
      { userId: admin.id, opportunityId: opps[7].id, type: "cancelled", message: "Atlas — fleet tracking was cancelled" },
    ],
  });
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
