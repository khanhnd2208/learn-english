CREATE TABLE "EnVocabSubject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "listed" BOOLEAN NOT NULL DEFAULT true,
  "accessCode" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnVocabSubject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnVocabSubject_status_sortOrder_idx" ON "EnVocabSubject"("status", "sortOrder");
CREATE TABLE "EnVocabSubjectEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnVocabSubjectEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnVocabSubjectEnrollment_userId_subjectId_key" ON "EnVocabSubjectEnrollment"("userId", "subjectId");
CREATE INDEX "EnVocabSubjectEnrollment_userId_idx" ON "EnVocabSubjectEnrollment"("userId");
ALTER TABLE "EnVocabSubjectEnrollment" ADD CONSTRAINT "EnVocabSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnVocabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnSet" ADD COLUMN "subjectId" TEXT;
CREATE INDEX "EnSet_subjectId_sortOrder_idx" ON "EnSet"("subjectId", "sortOrder");
ALTER TABLE "EnSet" ADD CONSTRAINT "EnSet_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnVocabSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
