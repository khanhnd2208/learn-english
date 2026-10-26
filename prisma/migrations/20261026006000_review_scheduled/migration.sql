-- Separate on-schedule answers from in-session retries so retention accuracy is honest.
ALTER TABLE "EnReview" ADD COLUMN "scheduled" BOOLEAN NOT NULL DEFAULT true;

-- Earlier retries left the box unchanged after a first sighting already moved it.
UPDATE "EnReview" r
SET "scheduled" = false
WHERE r."boxBefore" = r."boxAfter"
  AND EXISTS (
    SELECT 1 FROM "EnReview" prior
    WHERE prior."sessionId" = r."sessionId" AND prior."senseId" = r."senseId" AND prior."at" < r."at"
  );
