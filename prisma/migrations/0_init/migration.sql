-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EnContentStatus" AS ENUM ('draft', 'published', 'suspended');

-- CreateEnum
CREATE TYPE "EnAnswerSkill" AS ENUM ('meaning', 'sound', 'usage', 'pattern');

-- CreateEnum
CREATE TYPE "EnWordStatus" AS ENUM ('new', 'practicing', 'mastered');

-- CreateEnum
CREATE TYPE "EnRunMode" AS ENUM ('set', 'mistakes', 'review');

-- CreateEnum
CREATE TYPE "EnTestStatus" AS ENUM ('in_progress', 'finished', 'abandoned');

-- CreateEnum
CREATE TYPE "EnQuestionKind" AS ENUM ('meaning_choice', 'meaning_confusable', 'listen_choice', 'listen_type', 'spell_type', 'usage_fill', 'pattern_order', 'pattern_fill');

-- CreateEnum
CREATE TYPE "EnGradeResult" AS ENUM ('target_correct', 'alternate_plausible', 'wrong', 'pending_review', 'skipped');

-- CreateEnum
CREATE TYPE "EnExampleRole" AS ENUM ('study', 'grade');

-- CreateEnum
CREATE TYPE "EnCefr" AS ENUM ('pre_a1', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2');

-- CreateEnum
CREATE TYPE "EnEntryType" AS ENUM ('word', 'phrasal_verb', 'idiom', 'fixed_phrase');

-- CreateEnum
CREATE TYPE "EnRegister" AS ENUM ('neutral', 'formal', 'informal', 'slang', 'literary', 'technical', 'old_fashioned', 'offensive');

-- CreateEnum
CREATE TYPE "EnRegion" AS ENUM ('both', 'uk', 'us');

-- CreateEnum
CREATE TYPE "EnContentOrigin" AS ENUM ('authored', 'ai_generated', 'corpus');

-- CreateEnum
CREATE TYPE "EnHintKind" AS ENUM ('category', 'function', 'context', 'association', 'contrast', 'morphology');

-- CreateEnum
CREATE TYPE "EnRelationKind" AS ENUM ('synonym', 'antonym', 'broader', 'narrower', 'confusable');

-- CreateEnum
CREATE TYPE "EnConfusableType" AS ENUM ('spelling', 'sound', 'meaning', 'false_friend', 'grammar', 'collocation');

-- CreateEnum
CREATE TYPE "EnFamilyKind" AS ENUM ('derivation', 'root');

-- CreateTable
CREATE TABLE "EnWord" (
    "id" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "ipa" TEXT NOT NULL DEFAULT '',
    "stress" TEXT NOT NULL DEFAULT '',
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "forms" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audioPath" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lemmaKey" TEXT NOT NULL,
    "entryType" "EnEntryType" NOT NULL DEFAULT 'word',
    "ipaUk" TEXT NOT NULL DEFAULT '',
    "ipaUs" TEXT NOT NULL DEFAULT '',
    "syllables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "stressIndex" INTEGER,
    "inflections" JSONB NOT NULL DEFAULT '[]',
    "frequencyRank" INTEGER,
    "cefr" "EnCefr",
    "audioUkPath" TEXT NOT NULL DEFAULT '',
    "audioUsPath" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EnWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSense" (
    "id" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "pitfallVi" TEXT NOT NULL DEFAULT '',
    "chunks" JSONB NOT NULL DEFAULT '[]',
    "commonErrors" JSONB NOT NULL DEFAULT '[]',
    "distractorMeanings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "distractorLemmas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "senseKey" TEXT,
    "definitionEn" TEXT NOT NULL DEFAULT '',
    "definitionEnSimple" TEXT NOT NULL DEFAULT '',
    "cefr" "EnCefr",
    "register" "EnRegister" NOT NULL DEFAULT 'neutral',
    "region" "EnRegion" NOT NULL DEFAULT 'both',
    "topics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grammarTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "grammarNoteVi" TEXT NOT NULL DEFAULT '',
    "ipaOverride" TEXT NOT NULL DEFAULT '',
    "stressIndexOverride" INTEGER,
    "imagePath" TEXT NOT NULL DEFAULT '',
    "imageAlt" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnSense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnExample" (
    "id" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "target" TEXT NOT NULL,
    "audioPath" TEXT NOT NULL DEFAULT '',
    "role" "EnExampleRole" NOT NULL DEFAULT 'study',
    "alternatives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ambiguityNote" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetStart" INTEGER,
    "targetLength" INTEGER,
    "targetTag" TEXT NOT NULL DEFAULT '',
    "cefr" "EnCefr",
    "origin" "EnContentOrigin" NOT NULL DEFAULT 'authored',
    "sourceNote" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSenseHint" (
    "id" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "kind" "EnHintKind" NOT NULL,
    "textEn" TEXT NOT NULL,
    "textVi" TEXT NOT NULL DEFAULT '',
    "cefr" "EnCefr",
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnSenseHint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSenseRelation" (
    "id" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "kind" "EnRelationKind" NOT NULL,
    "lemma" TEXT NOT NULL,
    "targetSenseId" TEXT,
    "confusableType" "EnConfusableType",
    "noteVi" TEXT NOT NULL DEFAULT '',
    "contrast" JSONB NOT NULL DEFAULT '[]',
    "mistake" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnSenseRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnWordFamily" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "EnFamilyKind" NOT NULL,
    "root" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "meaningEn" TEXT NOT NULL DEFAULT '',
    "originNote" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnWordFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnWordFamilyMember" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "lemma" TEXT NOT NULL,
    "wordId" TEXT,
    "partOfSpeech" TEXT NOT NULL DEFAULT '',
    "affixNote" TEXT NOT NULL DEFAULT '',
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnWordFamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPattern" (
    "id" TEXT NOT NULL,
    "purposeVi" TEXT NOT NULL,
    "frame" TEXT NOT NULL,
    "fixedParts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "slots" JSONB NOT NULL DEFAULT '[]',
    "pitfallVi" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPatternExample" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "english" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL DEFAULT '',
    "slotValues" JSONB NOT NULL DEFAULT '[]',
    "audioPath" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnPatternExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPatternSense" (
    "id" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,

    CONSTRAINT "EnPatternSense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnQuestion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" "EnQuestionKind" NOT NULL,
    "skill" "EnAnswerSkill" NOT NULL,
    "stage" TEXT NOT NULL,
    "senseId" TEXT,
    "patternId" TEXT,
    "exampleId" TEXT,
    "patternExampleId" TEXT,
    "prompt" JSONB NOT NULL,
    "answer" TEXT NOT NULL,
    "acceptedAnswers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "audioPath" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnSetItem" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "senseId" TEXT,
    "patternId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnSetItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnActivityType" (
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "inPractice" BOOLEAN NOT NULL DEFAULT true,
    "inTest" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnActivityType_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "EnTestBlueprint" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "recognizeKinds" TEXT[] DEFAULT ARRAY['meaning_choice', 'listen_choice', 'cloze_choice']::TEXT[],
    "recallKinds" TEXT[] DEFAULT ARRAY['recall_type', 'listen_type']::TEXT[],
    "maxWords" INTEGER NOT NULL DEFAULT 30,
    "reviewWords" INTEGER NOT NULL DEFAULT 20,
    "minGapDays" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnTestBlueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnWordState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "status" "EnWordStatus" NOT NULL DEFAULT 'new',
    "lastExposureAt" TIMESTAMP(3),
    "lastTestedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "inMistakeBook" BOOLEAN NOT NULL DEFAULT false,
    "mistakeAddedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnWordState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPracticeSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "EnRunMode" NOT NULL,
    "setId" TEXT,
    "activityKey" TEXT,
    "senseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "activeSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EnPracticeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnTestAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mode" "EnRunMode" NOT NULL,
    "setId" TEXT,
    "blueprint" JSONB NOT NULL,
    "status" "EnTestStatus" NOT NULL DEFAULT 'in_progress',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "wordCount" INTEGER NOT NULL,
    "passedCount" INTEGER,

    CONSTRAINT "EnTestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnTestItem" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "activityKey" TEXT NOT NULL,
    "prompt" JSONB NOT NULL,
    "answerKey" TEXT NOT NULL,
    "accepted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "answer" TEXT,
    "correct" BOOLEAN,
    "responseMs" INTEGER,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "EnTestItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnTestWordResult" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senseId" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "counted" BOOLEAN NOT NULL,
    "priorExposureAt" TIMESTAMP(3),
    "recallMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnTestWordResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnPatternProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "patternId" TEXT NOT NULL,
    "intervalIdx" INTEGER NOT NULL DEFAULT 0,
    "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "state" TEXT NOT NULL DEFAULT 'learning',
    "lastReviewedAt" TIMESTAMP(3),
    "introducedAt" TIMESTAMP(3),
    "credits" JSONB NOT NULL DEFAULT '[]',
    "lastExampleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnPatternProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnAnswerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "senseId" TEXT,
    "patternId" TEXT,
    "exampleId" TEXT,
    "skill" "EnAnswerSkill" NOT NULL,
    "clientAnswerId" TEXT NOT NULL,
    "answer" TEXT NOT NULL DEFAULT '',
    "result" "EnGradeResult" NOT NULL,
    "audioOpened" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnAnswerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnAudioOpen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "clientAnswerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnAudioOpen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnDispute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "clientAnswerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnDispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EnWord_lemmaKey_key" ON "EnWord"("lemmaKey");

-- CreateIndex
CREATE INDEX "EnWord_status_idx" ON "EnWord"("status");

-- CreateIndex
CREATE INDEX "EnWord_lemma_idx" ON "EnWord"("lemma");

-- CreateIndex
CREATE INDEX "EnWord_cefr_idx" ON "EnWord"("cefr");

-- CreateIndex
CREATE INDEX "EnWord_frequencyRank_idx" ON "EnWord"("frequencyRank");

-- CreateIndex
CREATE UNIQUE INDEX "EnSense_senseKey_key" ON "EnSense"("senseKey");

-- CreateIndex
CREATE INDEX "EnSense_wordId_idx" ON "EnSense"("wordId");

-- CreateIndex
CREATE INDEX "EnSense_status_idx" ON "EnSense"("status");

-- CreateIndex
CREATE INDEX "EnSense_cefr_idx" ON "EnSense"("cefr");

-- CreateIndex
CREATE INDEX "EnExample_senseId_status_role_idx" ON "EnExample"("senseId", "status", "role");

-- CreateIndex
CREATE INDEX "EnSenseHint_senseId_status_idx" ON "EnSenseHint"("senseId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnSenseHint_senseId_order_key" ON "EnSenseHint"("senseId", "order");

-- CreateIndex
CREATE INDEX "EnSenseRelation_targetSenseId_idx" ON "EnSenseRelation"("targetSenseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnSenseRelation_senseId_kind_lemma_key" ON "EnSenseRelation"("senseId", "kind", "lemma");

-- CreateIndex
CREATE UNIQUE INDEX "EnWordFamily_key_key" ON "EnWordFamily"("key");

-- CreateIndex
CREATE INDEX "EnWordFamilyMember_wordId_idx" ON "EnWordFamilyMember"("wordId");

-- CreateIndex
CREATE UNIQUE INDEX "EnWordFamilyMember_familyId_lemma_key" ON "EnWordFamilyMember"("familyId", "lemma");

-- CreateIndex
CREATE INDEX "EnPattern_status_idx" ON "EnPattern"("status");

-- CreateIndex
CREATE INDEX "EnPatternExample_patternId_status_idx" ON "EnPatternExample"("patternId", "status");

-- CreateIndex
CREATE INDEX "EnPatternSense_senseId_idx" ON "EnPatternSense"("senseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnPatternSense_patternId_senseId_key" ON "EnPatternSense"("patternId", "senseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnQuestion_key_key" ON "EnQuestion"("key");

-- CreateIndex
CREATE INDEX "EnQuestion_status_skill_stage_idx" ON "EnQuestion"("status", "skill", "stage");

-- CreateIndex
CREATE INDEX "EnQuestion_senseId_idx" ON "EnQuestion"("senseId");

-- CreateIndex
CREATE INDEX "EnQuestion_patternId_idx" ON "EnQuestion"("patternId");

-- CreateIndex
CREATE INDEX "EnQuestion_exampleId_idx" ON "EnQuestion"("exampleId");

-- CreateIndex
CREATE INDEX "EnSet_status_sortOrder_idx" ON "EnSet"("status", "sortOrder");

-- CreateIndex
CREATE INDEX "EnSetItem_setId_position_idx" ON "EnSetItem"("setId", "position");

-- CreateIndex
CREATE INDEX "EnSetItem_senseId_idx" ON "EnSetItem"("senseId");

-- CreateIndex
CREATE INDEX "EnSetItem_patternId_idx" ON "EnSetItem"("patternId");

-- CreateIndex
CREATE INDEX "EnEnrollment_userId_idx" ON "EnEnrollment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnEnrollment_userId_setId_key" ON "EnEnrollment"("userId", "setId");

-- CreateIndex
CREATE INDEX "EnWordState_userId_inMistakeBook_idx" ON "EnWordState"("userId", "inMistakeBook");

-- CreateIndex
CREATE INDEX "EnWordState_userId_lastExposureAt_idx" ON "EnWordState"("userId", "lastExposureAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnWordState_userId_senseId_key" ON "EnWordState"("userId", "senseId");

-- CreateIndex
CREATE INDEX "EnPracticeSession_userId_startedAt_idx" ON "EnPracticeSession"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "EnTestAttempt_userId_startedAt_idx" ON "EnTestAttempt"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "EnTestItem_attemptId_senseId_idx" ON "EnTestItem"("attemptId", "senseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnTestItem_attemptId_position_key" ON "EnTestItem"("attemptId", "position");

-- CreateIndex
CREATE INDEX "EnTestWordResult_userId_senseId_createdAt_idx" ON "EnTestWordResult"("userId", "senseId", "createdAt");

-- CreateIndex
CREATE INDEX "EnTestWordResult_userId_counted_createdAt_idx" ON "EnTestWordResult"("userId", "counted", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnTestWordResult_attemptId_senseId_key" ON "EnTestWordResult"("attemptId", "senseId");

-- CreateIndex
CREATE INDEX "EnPatternProgress_userId_dueAt_idx" ON "EnPatternProgress"("userId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnPatternProgress_userId_patternId_key" ON "EnPatternProgress"("userId", "patternId");

-- CreateIndex
CREATE INDEX "EnAnswerLog_userId_createdAt_idx" ON "EnAnswerLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "EnAnswerLog_userId_senseId_skill_idx" ON "EnAnswerLog"("userId", "senseId", "skill");

-- CreateIndex
CREATE INDEX "EnAnswerLog_userId_patternId_idx" ON "EnAnswerLog"("userId", "patternId");

-- CreateIndex
CREATE INDEX "EnAnswerLog_questionId_createdAt_idx" ON "EnAnswerLog"("questionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnAnswerLog_userId_clientAnswerId_key" ON "EnAnswerLog"("userId", "clientAnswerId");

-- CreateIndex
CREATE INDEX "EnAudioOpen_userId_questionId_idx" ON "EnAudioOpen"("userId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnAudioOpen_userId_clientAnswerId_key" ON "EnAudioOpen"("userId", "clientAnswerId");

-- CreateIndex
CREATE INDEX "EnDispute_status_createdAt_idx" ON "EnDispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "EnDispute_questionId_status_idx" ON "EnDispute"("questionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnDispute_userId_clientAnswerId_key" ON "EnDispute"("userId", "clientAnswerId");

-- AddForeignKey
ALTER TABLE "EnSense" ADD CONSTRAINT "EnSense_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "EnWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnExample" ADD CONSTRAINT "EnExample_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSenseHint" ADD CONSTRAINT "EnSenseHint_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSenseRelation" ADD CONSTRAINT "EnSenseRelation_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSenseRelation" ADD CONSTRAINT "EnSenseRelation_targetSenseId_fkey" FOREIGN KEY ("targetSenseId") REFERENCES "EnSense"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnWordFamilyMember" ADD CONSTRAINT "EnWordFamilyMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "EnWordFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnWordFamilyMember" ADD CONSTRAINT "EnWordFamilyMember_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "EnWord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternExample" ADD CONSTRAINT "EnPatternExample_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternSense" ADD CONSTRAINT "EnPatternSense_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternSense" ADD CONSTRAINT "EnPatternSense_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_exampleId_fkey" FOREIGN KEY ("exampleId") REFERENCES "EnExample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnQuestion" ADD CONSTRAINT "EnQuestion_patternExampleId_fkey" FOREIGN KEY ("patternExampleId") REFERENCES "EnPatternExample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSetItem" ADD CONSTRAINT "EnSetItem_setId_fkey" FOREIGN KEY ("setId") REFERENCES "EnSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSetItem" ADD CONSTRAINT "EnSetItem_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnSetItem" ADD CONSTRAINT "EnSetItem_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnEnrollment" ADD CONSTRAINT "EnEnrollment_setId_fkey" FOREIGN KEY ("setId") REFERENCES "EnSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnWordState" ADD CONSTRAINT "EnWordState_senseId_fkey" FOREIGN KEY ("senseId") REFERENCES "EnSense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnTestItem" ADD CONSTRAINT "EnTestItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EnTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnTestWordResult" ADD CONSTRAINT "EnTestWordResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EnTestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnPatternProgress" ADD CONSTRAINT "EnPatternProgress_patternId_fkey" FOREIGN KEY ("patternId") REFERENCES "EnPattern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnAnswerLog" ADD CONSTRAINT "EnAnswerLog_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnAudioOpen" ADD CONSTRAINT "EnAudioOpen_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnDispute" ADD CONSTRAINT "EnDispute_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EnQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
