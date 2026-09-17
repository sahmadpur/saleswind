-- Rename pipeline "state" to "stage" in place (no data loss).
ALTER TYPE "State" RENAME TO "Stage";

ALTER TABLE "Opportunity" RENAME COLUMN "state" TO "stage";
ALTER TABLE "Status" RENAME COLUMN "state" TO "stage";
ALTER TABLE "Tag" RENAME COLUMN "state" TO "stage";

ALTER INDEX "Status_state_label_key" RENAME TO "Status_stage_label_key";
ALTER INDEX "Tag_state_label_key" RENAME TO "Tag_stage_label_key";

UPDATE "ActivityLog" SET "fieldChanged" = 'stage' WHERE "fieldChanged" = 'state';
UPDATE "Notification" SET "type" = 'stage' WHERE "type" IN ('state', 'state_change');
