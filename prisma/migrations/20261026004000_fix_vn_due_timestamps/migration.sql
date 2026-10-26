-- Prisma stores DateTime values in TIMESTAMP WITHOUT TIME ZONE columns as UTC
-- clock values. Convert the Vietnam-local due date back to a UTC-naive value.
UPDATE "EnWordState"
SET "dueAt" = CASE
  WHEN "inMistakeBook" = true THEN
    (((date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + INTERVAL '1 day' + INTERVAL '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'UTC')
  WHEN "status" = 'mastered' THEN
    (((date_trunc('day', COALESCE("masteredAt" AT TIME ZONE 'UTC', CURRENT_TIMESTAMP) AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + INTERVAL '21 days' + INTERVAL '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'UTC')
  WHEN "status" = 'practicing' THEN
    (((date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')
      + INTERVAL '1 day' + INTERVAL '12 hours') AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'UTC')
  ELSE "dueAt"
END
WHERE "status" IN ('mastered', 'practicing') OR "inMistakeBook" = true;
