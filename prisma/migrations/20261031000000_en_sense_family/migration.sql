-- Words of the same family (happy → happiness, happily, unhappy) per sense, shown on every card.
ALTER TABLE "EnSense" ADD COLUMN "family" JSONB NOT NULL DEFAULT '[]';
