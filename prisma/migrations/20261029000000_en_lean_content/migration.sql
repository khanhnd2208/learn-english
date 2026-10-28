-- Lean content (docs/plans/en-lean-questions-plan.md).
-- The owner approved wiping all English content and learner progress: start fresh with v3 packs.
TRUNCATE TABLE
  "EnGuidedReviewQuestion", "EnGuidedReviewSession",
  "EnTestItem", "EnTestAttempt",
  "EnReview", "EnWordState", "EnPracticeSession",
  "EnXpEvent", "EnQuestBoard", "EnAchievement",
  "EnLearnerProfile", "EnReviewPreference",
  "EnEnrollment", "EnSetItem", "EnSet",
  "EnExample", "EnSenseHint", "EnSenseRelation",
  "EnWordFamilyMember", "EnWordFamily",
  "EnSense", "EnWord"
CASCADE;

-- DropForeignKey
ALTER TABLE "EnSenseHint" DROP CONSTRAINT "EnSenseHint_senseId_fkey";

-- DropForeignKey
ALTER TABLE "EnSenseRelation" DROP CONSTRAINT "EnSenseRelation_senseId_fkey";

-- DropForeignKey
ALTER TABLE "EnSenseRelation" DROP CONSTRAINT "EnSenseRelation_targetSenseId_fkey";

-- DropForeignKey
ALTER TABLE "EnWordFamilyMember" DROP CONSTRAINT "EnWordFamilyMember_familyId_fkey";

-- DropForeignKey
ALTER TABLE "EnWordFamilyMember" DROP CONSTRAINT "EnWordFamilyMember_wordId_fkey";

-- DropIndex
DROP INDEX "EnWord_cefr_idx";

-- DropIndex
DROP INDEX "EnWord_frequencyRank_idx";

-- DropIndex
DROP INDEX "EnSense_cefr_idx";

-- AlterTable
ALTER TABLE "EnWord" DROP COLUMN "audioUkPath",
DROP COLUMN "audioUsPath",
DROP COLUMN "cefr",
DROP COLUMN "entryType",
DROP COLUMN "frequencyRank",
DROP COLUMN "inflections",
DROP COLUMN "ipaUk",
DROP COLUMN "ipaUs",
DROP COLUMN "stress",
DROP COLUMN "stressIndex",
DROP COLUMN "syllables";

-- AlterTable
ALTER TABLE "EnSense" DROP COLUMN "cefr",
DROP COLUMN "chunks",
DROP COLUMN "commonErrors",
DROP COLUMN "definitionEn",
DROP COLUMN "definitionEnSimple",
DROP COLUMN "distractorLemmas",
DROP COLUMN "distractorMeanings",
DROP COLUMN "grammarNoteVi",
DROP COLUMN "grammarTags",
DROP COLUMN "imageAlt",
DROP COLUMN "imagePath",
DROP COLUMN "ipaOverride",
DROP COLUMN "isPrimary",
DROP COLUMN "pitfallVi",
DROP COLUMN "region",
DROP COLUMN "register",
DROP COLUMN "stressIndexOverride",
DROP COLUMN "topics",
ADD COLUMN     "noteVi" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "EnExample" DROP COLUMN "alternatives",
DROP COLUMN "ambiguityNote",
DROP COLUMN "audioPath",
DROP COLUMN "cefr",
DROP COLUMN "origin",
DROP COLUMN "sourceNote",
DROP COLUMN "targetTag";

-- DropTable
DROP TABLE "EnSenseHint";

-- DropTable
DROP TABLE "EnSenseRelation";

-- DropTable
DROP TABLE "EnWordFamily";

-- DropTable
DROP TABLE "EnWordFamilyMember";

-- DropEnum
DROP TYPE "EnCefr";

-- DropEnum
DROP TYPE "EnEntryType";

-- DropEnum
DROP TYPE "EnRegister";

-- DropEnum
DROP TYPE "EnRegion";

-- DropEnum
DROP TYPE "EnContentOrigin";

-- DropEnum
DROP TYPE "EnHintKind";

-- DropEnum
DROP TYPE "EnRelationKind";

-- DropEnum
DROP TYPE "EnConfusableType";

-- DropEnum
DROP TYPE "EnFamilyKind";

