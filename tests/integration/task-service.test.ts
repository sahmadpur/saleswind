import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { createTask, deleteTask, listTasks, listOpportunityTasks, setTaskStatus, updateTask } from "@/services/task-service";

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
    const open = await listTasks("open", me);
    expect(open.map((t) => t.title)).toEqual(["Sooner", "Later", "Undated"]);
    expect(open.every((t) => t.status === "TODO")).toBe(true);
    expect(open[0].dueDate?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect((await listOpportunityTasks(oppId)).map((t) => t.title)).toEqual(["Sooner"]);
  });

  it("moves through statuses, stamping doneAt only while done", async () => {
    const t = await createTask({ title: "Flow" }, me);
    let row = await setTaskStatus(t.id, "IN_PROGRESS", me, false);
    expect([row.status, row.doneAt]).toEqual(["IN_PROGRESS", null]);
    row = await setTaskStatus(t.id, "DONE", me, false);
    expect(row.status).toBe("DONE");
    expect(row.doneAt).toBeInstanceOf(Date);
    row = await setTaskStatus(t.id, "CANCELLED", me, false);
    expect([row.status, row.doneAt]).toEqual(["CANCELLED", null]);
    expect((await listTasks("cancelled", me)).map((x) => x.id)).toContain(t.id);
    expect((await listTasks("open", me)).map((x) => x.id)).not.toContain(t.id);
  });

  it("board shows open work plus recently finished tasks only", async () => {
    const recent = await createTask({ title: "Recent done" }, me);
    await setTaskStatus(recent.id, "DONE", me, false);
    const old = await createTask({ title: "Old cancelled" }, me);
    await setTaskStatus(old.id, "CANCELLED", me, false);
    await db.$executeRaw`UPDATE "Task" SET "updatedAt" = now() - interval '45 days' WHERE id = ${old.id}`;
    const board = (await listTasks("board", me)).map((x) => x.title);
    expect(board).toContain("Recent done");
    expect(board).toContain("Undated");
    expect(board).not.toContain("Old cancelled");
  });

  it("notifies someone else when assigned, and lets only assignee/creator/elevated edit", async () => {
    const t = await createTask({ title: "For other", assigneeId: other }, me);
    const n = await db.notification.findFirstOrThrow({ where: { userId: other, type: "task" } });
    expect(n.message).toBe('Task Me assigned you a task: "For other"');

    const stranger = (await db.user.create({ data: { name: "S", email: `s${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } })).id;
    await expect(setTaskStatus(t.id, "DONE", stranger, false)).rejects.toThrow("Forbidden");
    await setTaskStatus(t.id, "DONE", other, false);
    expect((await listTasks("done", other)).map((x) => x.id)).toEqual([t.id]);
    await setTaskStatus(t.id, "TODO", stranger, true);
    expect((await listTasks("open", other)).map((x) => x.id)).toEqual([t.id]);
    await deleteTask(t.id, me, false);
    expect(await db.task.count({ where: { id: t.id } })).toBe(0);
  });

  it("edits title, due date, assignee and opportunity, and notifies the new assignee", async () => {
    const t = await createTask({ title: "Before" }, me);
    const { task } = await updateTask(
      t.id,
      { title: "After", dueDate: "2027-03-04", assigneeId: other, opportunityId: oppId },
      me,
      false,
    );
    expect(task.title).toBe("After");
    expect(task.dueDate?.toISOString()).toBe("2027-03-04T00:00:00.000Z");
    expect(task.assigneeId).toBe(other);
    expect(task.opportunityId).toBe(oppId);
    expect(await db.notification.count({ where: { userId: other, message: { contains: '"After"' } } })).toBe(1);

    // Clearing the date and the opportunity link stores nulls, not empty strings.
    const cleared = await updateTask(t.id, { title: "After", dueDate: "", assigneeId: other, opportunityId: "" }, me, false);
    expect(cleared.task.dueDate).toBeNull();
    expect(cleared.task.opportunityId).toBeNull();
  });

  it("lets only assignee, creator or an elevated user edit", async () => {
    const t = await createTask({ title: "Guarded", assigneeId: other }, me);
    const stranger = (await db.user.create({ data: { name: "S2", email: `s2${Date.now()}@x.com`, passwordHash: "x", role: "AGENT" } })).id;
    const input = { title: "Hijacked", dueDate: "", assigneeId: other, opportunityId: "" };
    await expect(updateTask(t.id, input, stranger, false)).rejects.toThrow("Forbidden");
    // The same stranger as a manager or admin goes through.
    expect((await updateTask(t.id, input, stranger, true)).task.title).toBe("Hijacked");
  });
});
