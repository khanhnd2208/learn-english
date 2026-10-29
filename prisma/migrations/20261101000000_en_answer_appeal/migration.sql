-- Learner appeals for wrong SRS answers ("my answer is also correct"), reviewed by an admin.
CREATE TABLE "EnAnswerAppeal" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL DEFAULT '',
    "userEmail" TEXT NOT NULL DEFAULT '',
    "senseId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "expected" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "restored" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,

    CONSTRAINT "EnAnswerAppeal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnAnswerAppeal_reviewId_key" ON "EnAnswerAppeal"("reviewId");
CREATE INDEX "EnAnswerAppeal_status_createdAt_idx" ON "EnAnswerAppeal"("status", "createdAt");
CREATE INDEX "EnAnswerAppeal_userId_createdAt_idx" ON "EnAnswerAppeal"("userId", "createdAt");
