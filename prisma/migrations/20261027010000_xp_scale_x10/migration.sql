-- XP scale x10: every stored event and the daily goal are multiplied, so totals and levels keep their meaning.
UPDATE "EnXpEvent" SET "xp" = "xp" * 10;

UPDATE "EnLearnerProfile" SET "dailyXpGoal" = "dailyXpGoal" * 10 WHERE "dailyXpGoal" <= 100;
ALTER TABLE "EnLearnerProfile" ALTER COLUMN "dailyXpGoal" SET DEFAULT 400;

-- Quest boards are rebuilt from the fixed quest rules; learning progress is not stored in them.
DELETE FROM "EnQuestBoard";
