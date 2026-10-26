-- Phase 1 foundation: add the Leitner schedule alongside legacy state fields.
-- Legacy fields remain until learner services and screens have moved over.
ALTER TABLE "EnWordState"
  ADD COLUMN "box" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lapses" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "introducedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "lastReviewedAt" TIMESTAMP(3);

UPDATE "EnWordState"
SET "box" = 4,
    "dueAt" = (date_trunc('day', COALESCE("masteredAt", CURRENT_TIMESTAMP) AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + INTERVAL '21 days' + INTERVAL '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "introducedAt" = COALESCE("lastExposureAt", "masteredAt", CURRENT_TIMESTAMP),
    "lastReviewedAt" = "lastTestedAt"
WHERE "status" = 'mastered';

UPDATE "EnWordState"
SET "box" = 1,
    "dueAt" = (date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + INTERVAL '1 day' + INTERVAL '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "introducedAt" = COALESCE("lastExposureAt", CURRENT_TIMESTAMP),
    "lastReviewedAt" = "lastTestedAt"
WHERE "status" = 'practicing';

UPDATE "EnWordState"
SET "box" = 1,
    "lapses" = 1,
    "dueAt" = (date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + INTERVAL '1 day' + INTERVAL '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh',
    "introducedAt" = COALESCE("lastExposureAt", CURRENT_TIMESTAMP),
    "lastReviewedAt" = "lastTestedAt"
WHERE "inMistakeBook" = true;

CREATE INDEX "EnWordState_userId_dueAt_idx" ON "EnWordState"("userId", "dueAt");

CREATE TABLE "EnReview" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "senseId" TEXT NOT NULL,
  "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prompt" TEXT NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "responseMs" INTEGER NOT NULL DEFAULT 0,
  "boxBefore" INTEGER NOT NULL,
  "boxAfter" INTEGER NOT NULL,
  CONSTRAINT "EnReview_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnReview_userId_at_idx" ON "EnReview"("userId", "at");
CREATE INDEX "EnReview_userId_senseId_at_idx" ON "EnReview"("userId", "senseId", "at");
CREATE INDEX "EnReview_sessionId_idx" ON "EnReview"("sessionId");
