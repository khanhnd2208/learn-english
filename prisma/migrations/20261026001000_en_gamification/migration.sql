CREATE TYPE "EnXpKind" AS ENUM ('first_mastery', 'hold_7d', 'hold_30d');
CREATE TYPE "EnQuestKind" AS ENUM ('set_mastery', 'hold_words', 'clear_mistakes', 'study_days');
CREATE TYPE "EnQuestStatus" AS ENUM ('active', 'done', 'ended');
CREATE TYPE "EnLearnerGoal" AS ENUM ('communication', 'work', 'travel', 'exam', 'other');

CREATE TABLE "EnLearnerProfile" (
  "userId" TEXT NOT NULL, "avatarKey" TEXT NOT NULL DEFAULT 'default',
  "goal" "EnLearnerGoal" NOT NULL DEFAULT 'communication', "targetCefr" "EnCefr",
  "weeklyDaysGoal" INTEGER NOT NULL DEFAULT 4, "totalXp" INTEGER NOT NULL DEFAULT 0, "rescuedSenses" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnLearnerProfile_pkey" PRIMARY KEY ("userId")
);
CREATE TABLE "EnXpEvent" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "senseId" TEXT NOT NULL, "kind" "EnXpKind" NOT NULL,
  "amount" INTEGER NOT NULL, "attemptId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnXpEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnXpEvent_userId_senseId_kind_key" ON "EnXpEvent"("userId", "senseId", "kind");
CREATE INDEX "EnXpEvent_userId_createdAt_idx" ON "EnXpEvent"("userId", "createdAt");
ALTER TABLE "EnXpEvent" ADD CONSTRAINT "EnXpEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EnTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "EnTestWordResult_userId_senseId_createdAt_idx" ON "EnTestWordResult"("userId", "senseId", "createdAt");

CREATE TABLE "EnQuest" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "kind" "EnQuestKind" NOT NULL, "setId" TEXT,
  "target" INTEGER NOT NULL, "startDay" TEXT NOT NULL, "endDay" TEXT NOT NULL,
  "status" "EnQuestStatus" NOT NULL DEFAULT 'active', "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EnQuest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnQuest_userId_status_idx" ON "EnQuest"("userId", "status");
CREATE TABLE "EnReward" (
  "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "title" TEXT NOT NULL, "unlockLevel" INTEGER,
  "questId" TEXT, "unlockedAt" TIMESTAMP(3), "claimedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "EnReward_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnReward_userId_idx" ON "EnReward"("userId");
ALTER TABLE "EnReward" ADD CONSTRAINT "EnReward_questId_fkey" FOREIGN KEY ("questId") REFERENCES "EnQuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "EnDailyNote" (
  "userId" TEXT NOT NULL, "dayKey" TEXT NOT NULL, "note" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "EnDailyNote_pkey" PRIMARY KEY ("userId", "dayKey")
);
