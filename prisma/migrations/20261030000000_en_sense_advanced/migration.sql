-- Optional advanced reading (collocations, prepositions, patterns) per sense.
ALTER TABLE "EnSense" ADD COLUMN "advanced" JSONB NOT NULL DEFAULT '[]';
