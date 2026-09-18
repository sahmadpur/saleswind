-- Cancellation is now expressed by a "Cancelled" status, not a pseudo-stage.
-- Make sure every stage has one.
INSERT INTO "Status" ("id", "stage", "label", "color", "isActive")
SELECT md5(random()::text || s.stage::text), s.stage, 'Cancelled', 'red', true
FROM (SELECT unnest(enum_range(NULL::"Stage")) AS stage) s
ON CONFLICT ("stage", "label") DO NOTHING;

-- Move cancelled opportunities onto their stage's Cancelled status.
UPDATE "Opportunity" o
SET "statusId" = s."id"
FROM "Status" s
WHERE o."isCancelled" AND s."stage" = o."stage" AND s."label" = 'Cancelled';

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "isCancelled";
