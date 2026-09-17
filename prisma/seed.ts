import "dotenv/config";
import { PrismaClient, Stage } from "@prisma/client";
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

const STATUSES: Record<Stage, string[]> = {
  PROSPECT: ["Not Started", "Cancelled", "In Progress"],
  SALES: ["In Progress", "Cancelled", "Lost", "Pending"],
  CONTRACT: ["In Progress", "Cancelled", "Delayed", "Pending"],
  PROJECT: ["In Progress", "Cancelled"],
};

// Default colour per status label (admins can change them in the Dictionary).
const STATUS_COLOR: Record<string, string> = {
  "Not Started": "grey", "In Progress": "blue", Pending: "amber", Delayed: "amber", Cancelled: "red", Lost: "red",
};

const TAGS: Record<Stage, string[]> = {
  PROSPECT: ["Researching", "Initial Contract", "Mail sent", "Working with other partner", "Hard to get in", "Contact attempted", "Lead is not defined", "High Chance", "Low Chance"],
  SALES: ["Contact Attempted", "Presentation Sent", "Meeting Completed", "Qualification", "Unresponsive", "Waiting for response", "Mostly Negative", "Mostly Positive", "High Chances", "Demo", "Lead is defined"],
  CONTRACT: ["Contract Signed", "Implementation Planned", "Onboarding Started", "Closed Won", "Lost to Competitor", "Budget Unavailable", "No Decision", "Client Cancelled", "Requirements Changed", "Closed Lost", "Won", "Lost"],
  PROJECT: ["Delayed by Client", "Delayed Internally", "Budget Frozen", "Waiting for Future Opportunity"],
};

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

  for (const stage of Object.values(Stage)) {
    for (const label of STATUSES[stage]) {
      await db.status.upsert({ where: { stage_label: { stage, label } }, update: {}, create: { stage, label, color: STATUS_COLOR[label] ?? "grey" } });
    }
    for (const label of TAGS[stage]) {
      await db.tag.upsert({ where: { stage_label: { stage, label } }, update: {}, create: { stage, label } });
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
  const statusId = (stage: Stage, label: string) =>
    statuses.find((s) => s.stage === stage && s.label === label)?.id ?? null;
  const tagId = (stage: Stage, label: string) =>
    tags.find((t) => t.stage === stage && t.label === label)?.id ?? null;

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
    stage: Stage;
    status: string;
    revenue: number;
    marginPct: number;
    isCancelled?: boolean;
    lastReason?: string;
    tags: string[];
  };
  const oppSpecs: OppSpec[] = [
    // PROSPECT
    { account: 0, owner: 2, title: "Northwind — warehouse rollout", description: "Evaluating Saleswind for their distribution arm.", stage: "PROSPECT", status: "In Progress", revenue: 48000, marginPct: 35, tags: ["Researching", "High Chance"] },
    { account: 2, owner: 3, title: "Brightline — content team pilot", description: "Initial outreach to the editorial group.", stage: "PROSPECT", status: "Not Started", revenue: 22000, marginPct: 40, tags: ["Mail sent"] },
    { account: 6, owner: 4, title: "Vertex — developer tooling", description: "Inbound lead from the engineering org.", stage: "PROSPECT", status: "In Progress", revenue: 75000, marginPct: 45, tags: ["Initial Contract", "High Chance"] },
    { account: 10, owner: 1, title: "Polaris — campus license", description: "Exploring a campus-wide deployment.", stage: "PROSPECT", status: "Cancelled", revenue: 30000, marginPct: 30, isCancelled: true, lastReason: "Budget cycle closed for the year.", tags: ["Low Chance"] },
    // SALES
    { account: 1, owner: 2, title: "Helios — production line analytics", description: "Demo delivered to operations leadership.", stage: "SALES", status: "In Progress", revenue: 120000, marginPct: 38, tags: ["Demo", "Mostly Positive"] },
    { account: 4, owner: 3, title: "Quanta — compliance reporting", description: "Working through procurement requirements.", stage: "SALES", status: "Pending", revenue: 95000, marginPct: 42, tags: ["Waiting for response", "High Chances"] },
    { account: 8, owner: 4, title: "Orchard — store network rollout", description: "Multi-region expansion under discussion.", stage: "SALES", status: "In Progress", revenue: 64000, marginPct: 33, tags: ["Presentation Sent", "Qualification"] },
    { account: 5, owner: 1, title: "Atlas — fleet tracking", description: "Lost momentum after reorg.", stage: "SALES", status: "Lost", revenue: 40000, marginPct: 30, isCancelled: true, lastReason: "Chose an in-house build.", tags: ["Unresponsive"] },
    // CONTRACT
    { account: 3, owner: 2, title: "Cedar & Stone — annual platform", description: "Contract in legal review.", stage: "CONTRACT", status: "In Progress", revenue: 88000, marginPct: 36, tags: ["Contract Signed", "Implementation Planned"] },
    { account: 7, owner: 3, title: "Maple — enterprise agreement", description: "Closed won, onboarding scheduled.", stage: "CONTRACT", status: "In Progress", revenue: 156000, marginPct: 44, tags: ["Closed Won", "Onboarding Started"] },
    { account: 9, owner: 4, title: "BlueGrid — pilot to production", description: "Delayed pending security sign-off.", stage: "CONTRACT", status: "Delayed", revenue: 110000, marginPct: 41, tags: ["Requirements Changed"] },
    // PROJECT
    { account: 1, owner: 2, title: "Helios — phase 2 deployment", description: "Implementation underway across two plants.", stage: "PROJECT", status: "In Progress", revenue: 120000, marginPct: 38, tags: ["Delayed Internally"] },
    { account: 11, owner: 3, title: "Tidewater — rollout", description: "Project kickoff completed.", stage: "PROJECT", status: "In Progress", revenue: 72000, marginPct: 35, tags: ["Waiting for Future Opportunity"] },
    { account: 7, owner: 4, title: "Maple — onboarding project", description: "Onboarding the finance team.", stage: "PROJECT", status: "In Progress", revenue: 156000, marginPct: 44, tags: ["Budget Frozen"] },
  ];

  const opps = [];
  for (const o of oppSpecs) {
    const owner = owners[o.owner % owners.length];
    const opp = await db.opportunity.create({
      data: {
        accountId: accounts[o.account].id,
        title: o.title,
        description: o.description,
        accountableId: owner.id,
        stage: o.stage,
        statusId: statusId(o.stage, o.status),
        revenue: o.revenue,
        marginPct: o.marginPct,
        isCancelled: o.isCancelled ?? false,
        lastReason: o.lastReason ?? null,
        createdById: owner.id,
        lastModifiedById: owner.id,
      },
    });
    opps.push(opp);
    const tagIds = o.tags.map((label) => tagId(o.stage, label)).filter((id): id is string => !!id);
    if (tagIds.length) {
      await db.opportunityTag.createMany({ data: tagIds.map((tagId) => ({ opportunityId: opp.id, tagId })) });
    }
    await db.activityLog.create({
      data: { opportunityId: opp.id, userId: owner.id, actionType: "created", fieldChanged: "stage", oldValue: null, newValue: o.stage },
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
      { userId: owners[1].id, opportunityId: opps[8].id, type: "stage", message: "Cedar & Stone moved to Contract" },
      { userId: admin.id, opportunityId: opps[7].id, type: "cancelled", message: "Atlas — fleet tracking was cancelled" },
    ],
  });

  // Directories: numbered per kind.
  const directory: { kind: "VENDOR" | "STAFF" | "PARTNER"; name: string; contactName: string; email: string; phone: string }[] = [
    { kind: "VENDOR", name: "Dell Technologies", contactName: "Nigar Aliyeva", email: "nigar@dell.example", phone: "+994 12 555 0101" },
    { kind: "VENDOR", name: "HP Inc.", contactName: "Elvin Mammadov", email: "elvin@hp.example", phone: "+994 12 555 0102" },
    { kind: "STAFF", name: "Ruslan Sultanov", contactName: "Presales engineer", email: "ruslan@saleswind.local", phone: "+994 50 555 0103" },
    { kind: "STAFF", name: "Aysel Karimova", contactName: "Project manager", email: "aysel@saleswind.local", phone: "+994 50 555 0104" },
    { kind: "PARTNER", name: "Caspian Integrators", contactName: "Farid Huseynov", email: "farid@caspian.example", phone: "+994 12 555 0105" },
  ];
  const counters: Record<string, number> = {};
  for (const d of directory) {
    counters[d.kind] = (counters[d.kind] ?? 0) + 1;
    await db.directoryEntry.create({ data: { ...d, number: counters[d.kind], createdById: admin.id } });
  }

  // Tasks, one overdue, some linked to opportunities.
  const day = (offset: number) => new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + offset));
  await db.task.createMany({
    data: [
      { title: "Follow up on proposal", dueDate: day(-1), assigneeId: owners[2].id, createdById: owners[1].id, opportunityId: opps[0].id },
      { title: "Schedule security review", dueDate: day(0), assigneeId: owners[2].id, createdById: owners[2].id, opportunityId: opps[4].id },
      { title: "Prepare onboarding plan", dueDate: day(5), assigneeId: owners[3].id, createdById: owners[1].id, opportunityId: opps[9].id },
      { title: "Update Q4 forecast", dueDate: day(7), status: "IN_PROGRESS", assigneeId: admin.id, createdById: admin.id },
      { title: "Draft partner agreement", assigneeId: admin.id, createdById: admin.id, status: "CANCELLED" },
      { title: "Clean up stale prospects", assigneeId: owners[1].id, createdById: owners[1].id, status: "DONE", doneAt: new Date() },
    ],
  });
}

main().then(() => db.$disconnect()).catch((e) => { console.error(e); db.$disconnect(); process.exit(1); });
