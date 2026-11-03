CREATE TABLE "EnTestSubject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "listed" BOOLEAN NOT NULL DEFAULT true,
  "accessCode" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnTestSubject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnTestSubject_status_sortOrder_idx" ON "EnTestSubject"("status", "sortOrder");

CREATE TABLE "EnTestSubjectEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnTestSubjectEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestSubjectEnrollment_userId_subjectId_key" ON "EnTestSubjectEnrollment"("userId", "subjectId");
CREATE INDEX "EnTestSubjectEnrollment_userId_idx" ON "EnTestSubjectEnrollment"("userId");
ALTER TABLE "EnTestSubjectEnrollment" ADD CONSTRAINT "EnTestSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnTestSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaper" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnTestPaper_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnTestPaper_subjectId_status_sortOrder_idx" ON "EnTestPaper"("subjectId", "status", "sortOrder");
ALTER TABLE "EnTestPaper" ADD CONSTRAINT "EnTestPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnTestSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaperQuestion" (
  "id" TEXT NOT NULL,
  "paperId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctIndex" INTEGER,
  "answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "explanationVi" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "EnTestPaperQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestPaperQuestion_paperId_position_key" ON "EnTestPaperQuestion"("paperId", "position");
ALTER TABLE "EnTestPaperQuestion" ADD CONSTRAINT "EnTestPaperQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "EnTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaperAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paperId" TEXT NOT NULL,
  "activeKey" TEXT,
  "status" "EnTestStatus" NOT NULL DEFAULT 'in_progress',
  "position" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "score" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "EnTestPaperAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestPaperAttempt_activeKey_key" ON "EnTestPaperAttempt"("activeKey");
CREATE INDEX "EnTestPaperAttempt_userId_paperId_status_idx" ON "EnTestPaperAttempt"("userId", "paperId", "status");
CREATE INDEX "EnTestPaperAttempt_userId_finishedAt_idx" ON "EnTestPaperAttempt"("userId", "finishedAt");
ALTER TABLE "EnTestPaperAttempt" ADD CONSTRAINT "EnTestPaperAttempt_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "EnTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaperAttemptItem" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctIndex" INTEGER,
  "answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "explanationVi" TEXT NOT NULL DEFAULT '',
  "answer" TEXT,
  "correct" BOOLEAN,
  "answeredAt" TIMESTAMP(3),
  CONSTRAINT "EnTestPaperAttemptItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestPaperAttemptItem_attemptId_position_key" ON "EnTestPaperAttemptItem"("attemptId", "position");
ALTER TABLE "EnTestPaperAttemptItem" ADD CONSTRAINT "EnTestPaperAttemptItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EnTestPaperAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
