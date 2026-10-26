-- Due dates move from 12:00 to 00:00 Asia/Ho_Chi_Minh so words due today are
-- available all day. Values are UTC-naive: 12:00 VN is 05:00, 00:00 VN is 17:00 the day before.
UPDATE "EnWordState"
SET "dueAt" = "dueAt" - INTERVAL '12 hours'
WHERE "dueAt"::time = TIME '05:00:00';
