-- Minimal core, phases 0–3 (docs/plans/en-minimal-core-plan.md §5).
-- Removes the question bank, disputes, patterns, the old Test engine and gamification.
-- EnTestAttempt/EnTestItem stay: graded quizzes (blueprint {"kind", "v": 2}) use them.

-- Set items that only pointed at a pattern have nothing left to show.
DELETE FROM "EnSetItem" WHERE "senseId" IS NULL;

-- A word state still in box 0 was never scheduled; having no row means the same thing.
DELETE FROM "EnWordState" WHERE "box" <= 0;

-- Attempts from the old Test engine (not v2 quizzes) cannot be read by the app any more.
DELETE FROM "EnTestAttempt" WHERE COALESCE("blueprint"->>'v', '') <> '2';

-- DropForeignKey
ALTER TABLE "EnPatternExample" DROP CONSTRAINT "EnPatternExample_patternId_fkey";

-- DropForeignKey
ALTER TABLE "EnPatternSense" DROP CONSTRAINT "EnPatternSense_patternId_fkey";

-- DropForeignKey
ALTER TABLE "EnPatternSense" DROP CONSTRAINT "EnPatternSense_senseId_fkey";

-- DropForeignKey
ALTER TABLE "EnQuestion" DROP CONSTRAINT "EnQuestion_senseId_fkey";

-- DropForeignKey
ALTER TABLE "EnQuestion" DROP CONSTRAINT "EnQuestion_patternId_fkey";

-- DropForeignKey
ALTER TABLE "EnQuestion" DROP CONSTRAINT "EnQuestion_exampleId_fkey";

-- DropForeignKey
ALTER TABLE "EnQuestion" DROP CONSTRAINT "EnQuestion_patternExampleId_fkey";

-- DropForeignKey
ALTER TABLE "EnSetItem" DROP CONSTRAINT "EnSetItem_patternId_fkey";

-- DropForeignKey
ALTER TABLE "EnXpEvent" DROP CONSTRAINT "EnXpEvent_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "EnReward" DROP CONSTRAINT "EnReward_questId_fkey";

-- DropForeignKey
ALTER TABLE "EnTestWordResult" DROP CONSTRAINT "EnTestWordResult_attemptId_fkey";

-- DropForeignKey
ALTER TABLE "EnPatternProgress" DROP CONSTRAINT "EnPatternProgress_patternId_fkey";

-- DropForeignKey
ALTER TABLE "EnAnswerLog" DROP CONSTRAINT "EnAnswerLog_questionId_fkey";

-- DropForeignKey
ALTER TABLE "EnAudioOpen" DROP CONSTRAINT "EnAudioOpen_questionId_fkey";

-- DropForeignKey
ALTER TABLE "EnDispute" DROP CONSTRAINT "EnDispute_questionId_fkey";

-- DropIndex
DROP INDEX "EnSetItem_patternId_idx";

-- DropIndex
DROP INDEX "EnWordState_userId_inMistakeBook_idx";

-- DropIndex
DROP INDEX "EnWordState_userId_lastExposureAt_idx";

-- AlterTable
ALTER TABLE "EnSetItem" DROP COLUMN "patternId";

-- AlterTable
ALTER TABLE "EnWordState" DROP COLUMN "inMistakeBook",
DROP COLUMN "lastExposureAt",
DROP COLUMN "lastTestedAt",
DROP COLUMN "masteredAt",
DROP COLUMN "mistakeAddedAt",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "EnTestAttempt" DROP COLUMN "recallLockedAt";

-- AlterTable
ALTER TABLE "EnLearnerProfile" DROP COLUMN "avatarKey",
DROP COLUMN "goal",
DROP COLUMN "rescuedSenses",
DROP COLUMN "targetCefr",
DROP COLUMN "totalXp";

-- AlterTable
ALTER TABLE "EnTestItem" DROP COLUMN "leftPage",
DROP COLUMN "servedAt";

-- DropTable
DROP TABLE "EnPattern";

-- DropTable
DROP TABLE "EnPatternExample";

-- DropTable
DROP TABLE "EnPatternSense";

-- DropTable
DROP TABLE "EnQuestion";

-- DropTable
DROP TABLE "EnActivityType";

-- DropTable
DROP TABLE "EnTestBlueprint";

-- DropTable
DROP TABLE "EnXpEvent";

-- DropTable
DROP TABLE "EnQuest";

-- DropTable
DROP TABLE "EnReward";

-- DropTable
DROP TABLE "EnDailyNote";

-- DropTable
DROP TABLE "EnTestWordResult";

-- DropTable
DROP TABLE "EnPatternProgress";

-- DropTable
DROP TABLE "EnAnswerLog";

-- DropTable
DROP TABLE "EnAudioOpen";

-- DropTable
DROP TABLE "EnDispute";

-- DropEnum
DROP TYPE "EnAnswerSkill";

-- DropEnum
DROP TYPE "EnWordStatus";

-- DropEnum
DROP TYPE "EnXpKind";

-- DropEnum
DROP TYPE "EnQuestKind";

-- DropEnum
DROP TYPE "EnQuestStatus";

-- DropEnum
DROP TYPE "EnLearnerGoal";

-- DropEnum
DROP TYPE "EnQuestionKind";

-- DropEnum
DROP TYPE "EnGradeResult";
