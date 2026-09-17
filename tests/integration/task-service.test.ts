import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createTask, deleteTask, listMyTasks, listOpportunityTasks, setTaskDone } from "@/services/task-service";

let me: string, other: string, oppId: string;

beforeAll(async () => {
  me = (await db.user.create({ data: { name: "Task Me", email: `tm${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } })).id;
  other = (await db.user.create({ data: { name: "Task Other", email: `to${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } })).id;
  const acc = await db.account.create({ data: { name: "Task Acc", createdById: me } });
  oppId = (await db.opportunity.create({ data: { title: "Task Opp", accountId: acc.id, accountableId: me, createdById: me, lastModifiedById: me } })).id;
});
afterAll(async () => {
  await db.task.deleteMany(); await db.notification.deleteMany(); await db.opportunity.deleteMany();
  await db.account.deleteMany(); await db.user.deleteMany(); await db.$disconnect();
});

describe("task-service", () => {
  it("defaults the assignee to the creator and orders open tasks by due date, undated last", async () => {
    await createTask({ title: "Undated" }, me);
    await createTask({ title: "Later", dueDate: "2026-12-01" }, me);
    await createTask({ title: "Sooner", dueDate: "2026-10-01", opportunityId: oppId }, me);
    const open = await listMyTasks(me, "open");
    expect(open.map((t) => t.title)).toEqual(["Sooner", "Later", "Undated"]);
    expect(open[0].dueDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect((await listOpportunityTasks(oppId)).map((t) => t.title)).toEqual(["Sooner"]);
  });

  it("notifies someone else when assigned, and lets only assignee/creator/elevated edit", async () => {
    const t = await createTask({ title: "For other", assigneeId: other }, me);
    const n = await db.notification.findFirstOrThrow({ where: { userId: other, type: "task" } });
    expect(n.message).toBe('Task Me assigned you a task: "For other"');

    const stranger = (await db.user.create({ data: { name: "S", email: `s${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } })).id;
    await expect(setTaskDone(t.id, true, stranger, false)).rejects.toThrow("Forbidden");
    await setTaskDone(t.id, true, other, false);
    expect((await listMyTasks(other, "done")).map((x) => x.id)).toEqual([t.id]);
    await setTaskDone(t.id, false, stranger, true);
    expect((await listMyTasks(other, "open")).map((x) => x.id)).toEqual([t.id]);
    await deleteTask(t.id, me, false);
    expect(await db.task.count({ where: { id: t.id } })).toBe(0);
  });
});
