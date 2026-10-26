-- Daily goal, XP ledger, quest boards and achievements.
ALTER TABLE "EnLearnerProfile" ADD COLUMN "dailyXpGoal" INTEGER NOT NULL DEFAULT 40;
ALTER TABLE "EnLearnerProfile" ADD COLUMN "dailyGoalChosenAt" TIMESTAMP(3);
ALTER TABLE "EnLearnerProfile" ADD COLUMN "seenLevel" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "EnXpEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnXpEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnXpEvent_userId_sourceKey_key" ON "EnXpEvent"("userId", "sourceKey");
CREATE INDEX "EnXpEvent_userId_day_idx" ON "EnXpEvent"("userId", "day");
CREATE INDEX "EnXpEvent_userId_kind_idx" ON "EnXpEvent"("userId", "kind");

CREATE TABLE "EnQuestBoard" (
    "userId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "quests" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EnQuestBoard_pkey" PRIMARY KEY ("userId", "period", "periodKey")
);

CREATE TABLE "EnAchievement" (
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "seenAt" TIMESTAMP(3),
    CONSTRAINT "EnAchievement_pkey" PRIMARY KEY ("userId", "key")
);
