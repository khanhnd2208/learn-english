CREATE TABLE "EnReviewPreference" (
    "userId" TEXT NOT NULL,
    "selectedSetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "initializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EnReviewPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "EnGuidedReviewSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activeKey" TEXT,
    "selectedSetIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "poolSenseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "remainingSenseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currentChunkSenseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "chunkNumber" INTEGER NOT NULL DEFAULT 1,
    "phase" TEXT NOT NULL DEFAULT 'study',
    "studyPosition" INTEGER NOT NULL DEFAULT 0,
    "questionPosition" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EnGuidedReviewSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EnGuidedReviewQuestion" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "chunkNumber" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'main',
    "position" INTEGER NOT NULL,
    "senseId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "activityKey" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "answerKey" TEXT NOT NULL,
    "accepted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "layout" JSONB,
    "answer" TEXT,
    "correct" BOOLEAN,
    "responseMs" INTEGER,
    "answeredAt" TIMESTAMP(3),
    CONSTRAINT "EnGuidedReviewQuestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnGuidedReviewSession_activeKey_key" ON "EnGuidedReviewSession"("activeKey");
CREATE INDEX "EnGuidedReviewSession_userId_startedAt_idx" ON "EnGuidedReviewSession"("userId", "startedAt");
CREATE UNIQUE INDEX "EnGuidedReviewQuestion_sessionId_chunkNumber_kind_position_key" ON "EnGuidedReviewQuestion"("sessionId", "chunkNumber", "kind", "position");
CREATE UNIQUE INDEX "EnGuidedReviewQuestion_sessionId_chunkNumber_kind_senseId_key" ON "EnGuidedReviewQuestion"("sessionId", "chunkNumber", "kind", "senseId");
CREATE INDEX "EnGuidedReviewQuestion_sessionId_chunkNumber_kind_idx" ON "EnGuidedReviewQuestion"("sessionId", "chunkNumber", "kind");
CREATE INDEX "EnGuidedReviewQuestion_sessionId_senseId_idx" ON "EnGuidedReviewQuestion"("sessionId", "senseId");
ALTER TABLE "EnGuidedReviewQuestion" ADD CONSTRAINT "EnGuidedReviewQuestion_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EnGuidedReviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
