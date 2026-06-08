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
