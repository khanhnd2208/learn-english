CREATE TABLE "EnExam" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "setId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnExam_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnExam_courseId_status_sortOrder_idx" ON "EnExam"("courseId", "status", "sortOrder");
ALTER TABLE "EnExam" ADD CONSTRAINT "EnExam_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EnCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnExam" ADD CONSTRAINT "EnExam_setId_fkey" FOREIGN KEY ("setId") REFERENCES "EnSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EnExamQuestion" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctIndex" INTEGER,
  "answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "explanationVi" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "EnExamQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnExamQuestion_examId_position_key" ON "EnExamQuestion"("examId", "position");
ALTER TABLE "EnExamQuestion" ADD CONSTRAINT "EnExamQuestion_examId_fkey" FOREIGN KEY ("examId") REFERENCES "EnExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnExamAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "activeKey" TEXT,
  "status" "EnTestStatus" NOT NULL DEFAULT 'in_progress',
  "position" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "score" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "EnExamAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnExamAttempt_activeKey_key" ON "EnExamAttempt"("activeKey");
CREATE INDEX "EnExamAttempt_userId_examId_status_idx" ON "EnExamAttempt"("userId", "examId", "status");
ALTER TABLE "EnExamAttempt" ADD CONSTRAINT "EnExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "EnExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnExamAttemptItem" (
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
  CONSTRAINT "EnExamAttemptItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnExamAttemptItem_attemptId_position_key" ON "EnExamAttemptItem"("attemptId", "position");
ALTER TABLE "EnExamAttemptItem" ADD CONSTRAINT "EnExamAttemptItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EnExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
