-- CreateTable
CREATE TABLE "EnTestQuestion" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctIndex" INTEGER,
    "answers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchRules" TEXT[] DEFAULT ARRAY['ignore_case', 'collapse_spaces', 'ignore_hyphen', 'ignore_punctuation']::TEXT[],
    "explanationVi" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnTestPaperEntry" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "EnTestPaperEntry_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "EnTestPaperAttemptItem" ADD COLUMN "questionId" TEXT,
ADD COLUMN "matchRules" TEXT[] DEFAULT ARRAY['ignore_case', 'collapse_spaces', 'ignore_hyphen', 'ignore_punctuation']::TEXT[];

-- CreateIndex
CREATE INDEX "EnTestPaperEntry_questionId_idx" ON "EnTestPaperEntry"("questionId");
CREATE UNIQUE INDEX "EnTestPaperEntry_paperId_position_key" ON "EnTestPaperEntry"("paperId", "position");
CREATE UNIQUE INDEX "EnTestPaperEntry_paperId_questionId_key" ON "EnTestPaperEntry"("paperId", "questionId");
CREATE INDEX "EnTestPaperAttemptItem_questionId_idx" ON "EnTestPaperAttemptItem"("questionId");

-- AddForeignKey
ALTER TABLE "EnTestPaperEntry" ADD CONSTRAINT "EnTestPaperEntry_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "EnTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnTestPaperEntry" ADD CONSTRAINT "EnTestPaperEntry_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnTestQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EnTestPaperAttemptItem" ADD CONSTRAINT "EnTestPaperAttemptItem_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnTestQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every old question becomes its own bank question and one entry.
INSERT INTO "EnTestQuestion" ("id","type","prompt","options","correctIndex","answers","explanationVi","createdAt","updatedAt")
SELECT 'tq_' || q."id", q."type", q."prompt", q."options", q."correctIndex", q."answers", q."explanationVi", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "EnTestPaperQuestion" q;

INSERT INTO "EnTestPaperEntry" ("id","paperId","questionId","position")
SELECT 'tpe_' || q."id", q."paperId", 'tq_' || q."id", q."position"
FROM "EnTestPaperQuestion" q;
