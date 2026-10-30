ALTER TABLE "EnLearnerProfile" ADD COLUMN "avatarFile" TEXT;
ALTER TABLE "EnLearnerProfile" ADD COLUMN "avatarVersion" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "EnXpEvent_day_userId_idx" ON "EnXpEvent"("day", "userId");
CREATE INDEX "EnXpEvent_at_idx" ON "EnXpEvent"("at");
CREATE INDEX "EnReview_at_idx" ON "EnReview"("at");
