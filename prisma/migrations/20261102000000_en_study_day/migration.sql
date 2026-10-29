CREATE TABLE "EnStudyDay" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    CONSTRAINT "EnStudyDay_pkey" PRIMARY KEY ("userId", "day")
);

INSERT INTO "EnStudyDay" ("userId", "day")
SELECT DISTINCT "userId", to_char("at" + INTERVAL '7 hours', 'YYYY-MM-DD') FROM "EnReview"
UNION
SELECT s."userId", to_char(q."answeredAt" + INTERVAL '7 hours', 'YYYY-MM-DD')
FROM "EnGuidedReviewQuestion" q JOIN "EnGuidedReviewSession" s ON s."id" = q."sessionId"
WHERE q."kind" = 'main' AND q."answeredAt" IS NOT NULL
ON CONFLICT DO NOTHING;
