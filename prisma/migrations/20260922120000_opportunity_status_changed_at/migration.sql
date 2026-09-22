-- The dashboard buckets opportunities by the month their status changed.
ALTER TABLE "Opportunity" ADD COLUMN "statusChangedAt" TIMESTAMP(3);

-- Backfill from the activity log, which already records every statusId change.
-- Opportunities that never changed status fall back to when they were last touched.
UPDATE "Opportunity" o
SET "statusChangedAt" = COALESCE(
  (SELECT MAX(a."createdAt") FROM "ActivityLog" a WHERE a."opportunityId" = o.id AND a."fieldChanged" = 'statusId'),
  o."lastModifiedAt"
);

CREATE INDEX "Opportunity_stage_idx" ON "Opportunity"("stage");
CREATE INDEX "Opportunity_statusId_idx" ON "Opportunity"("statusId");
CREATE INDEX "Opportunity_accountableId_idx" ON "Opportunity"("accountableId");
CREATE INDEX "Opportunity_statusChangedAt_idx" ON "Opportunity"("statusChangedAt");

-- The dashboard's monthly report groups by this label, which the dictionary was missing.
-- Ids are literal so this needs no uuid extension and stays idempotent on re-run.
INSERT INTO "Status" ("id", "stage", "label", "color", "isActive")
VALUES
  ('sts_implemented_contract', 'CONTRACT', 'Implemented', 'green', true),
  ('sts_implemented_project',  'PROJECT',  'Implemented', 'green', true)
ON CONFLICT ("stage", "label") DO NOTHING;
