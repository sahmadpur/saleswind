-- Rename owner -> accountable, preserving all data
ALTER TABLE "Opportunity" RENAME COLUMN "ownerId" TO "accountableId";
ALTER TABLE "Opportunity" RENAME CONSTRAINT "Opportunity_ownerId_fkey" TO "Opportunity_accountableId_fkey";

-- Remove the meeting feature
ALTER TABLE "Opportunity" DROP COLUMN "meetingAt";
