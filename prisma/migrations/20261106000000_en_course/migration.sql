CREATE TABLE "EnCourse" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "listed" BOOLEAN NOT NULL DEFAULT true,
  "accessCode" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnCourse_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnCourse_status_sortOrder_idx" ON "EnCourse"("status", "sortOrder");
CREATE TABLE "EnCourseEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnCourseEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnCourseEnrollment_userId_courseId_key" ON "EnCourseEnrollment"("userId", "courseId");
CREATE INDEX "EnCourseEnrollment_userId_idx" ON "EnCourseEnrollment"("userId");
ALTER TABLE "EnCourseEnrollment" ADD CONSTRAINT "EnCourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EnCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnSet" ADD COLUMN "courseId" TEXT;
CREATE INDEX "EnSet_courseId_sortOrder_idx" ON "EnSet"("courseId", "sortOrder");
ALTER TABLE "EnSet" ADD CONSTRAINT "EnSet_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "EnCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "EnCourse" ("id","title","description","status","listed","accessCode","sortOrder","createdAt","updatedAt")
SELECT 'course_' || s."id", s."title", s."description", s."status", s."listed", s."accessCode", s."sortOrder", s."createdAt", CURRENT_TIMESTAMP
FROM "EnSet" s;

UPDATE "EnSet" SET "courseId" = 'course_' || "id";

INSERT INTO "EnCourseEnrollment" ("id","userId","courseId","createdAt")
SELECT 'ce_' || e."id", e."userId", 'course_' || e."setId", e."createdAt"
FROM "EnEnrollment" e;
