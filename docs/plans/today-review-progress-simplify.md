# Gọn giao diện: Hôm nay · Ôn theo bộ · Tiến bộ

## 1. Outcome

Hôm nay có một điểm bắt đầu Ôn luân phiên cho toàn bộ từ đang học, kèm Nhiệm vụ và dải Tiến bộ. Ôn theo bộ chỉ chọn bộ và bắt đầu guided review. Tiến bộ mở vào Xếp hạng và chỉ giữ Nhiệm vụ cùng Thống kê.

## 2. Out of scope

Không đổi luật SRS (lượt 50 từ, 60% đến hạn), guided review, practice, appeals, leaderboard, XP câu trả lời/quest/goal/rương tuần, `/store`, `/sets/[setId]` ngoài link quay lại, hoặc `/admin`. Không drop bảng `EnAchievement` hay cột Prisma.

## 3. Invariants touched

Ba chế độ vẫn tách biệt: chỉ `enDailyService` ghi `EnWordState`/`EnReview`; guided review và practice không ghi schedule. Hàng đợi SRS không có quota: giao diện hiện tổng hàng đợi, còn nút chỉ khởi động `min(total, 50)`. XP quest/goal/chest vẫn đi qua ledger idempotent; nhánh thành tựu bị gỡ. Mọi ngày/số liệu vẫn được server tính theo lịch Việt Nam. `liveStages` dùng sense duy nhất, không cộng các bộ trùng từ.

## 4. Changes per file

- `reviewSummary.ts`: `srsTodayPreview` trả tổng queue và preview của một lượt.
- `progressStats.ts`: `liveStages` tạo các stage từ overview đếm sense duy nhất.
- `TodayHero.tsx`, `HomeDashboard.tsx`, `page.tsx`: bỏ guided card/danh sách bộ trên Hôm nay.
- `navigation.ts`, `review/page.tsx`, `ReviewOverview.tsx`: đổi tên Ôn theo bộ, redirect `mode=luan-phien`, đưa dạng câu hỏi/nâng cao vào `Sheet`.
- `ProgressHub.tsx`, `progress/page.tsx`, `quests/page.tsx`: Xếp hạng là tab đầu, bỏ thành tựu, thêm chuỗi ngày ở Thống kê.
- `enGoalService.ts`, `xp.ts`, `RewardCenter.tsx`, `useRewardToasts.ts`, `EnglishShell.tsx`, `layout.tsx`, seen API: gỡ reward, state và UI thành tựu.
- `enProgressService.ts`: lấy state qua `liveCte` để lịch sử Nhớ lâu chỉ gồm các bộ đang học.

## 5. Exact copy

Hôm nay dùng: “Tất cả bộ đang học: {due} đến hạn · {new} từ mới”, “Mỗi lượt 50 từ · lượt này ~{minutes} phút”, “Ôn {round} từ →”, và “Mai chưa có từ đến hạn”. Ôn theo bộ dùng: “Ôn theo bộ”, “Cài đặt câu hỏi”, “Dạng câu hỏi”, “Bộ đang học”, “Bắt đầu học →”, “5 từ / chặng · {mode}”. Tiến bộ dùng các tab “Xếp hạng”, “Nhiệm vụ”, “Thống kê”, cùng “Chuỗi {current} ngày · kỷ lục {longest} ngày” hoặc “Kỷ lục {longest} ngày học liên tiếp”. Bỏ toàn bộ copy Thành tựu/Huy hiệu và “điểm phần trăm”.

## 6. States

Người mới chưa có bộ vẫn thấy “Chọn bộ từ đầu tiên”, QuestNote khóa và không có dải tiến bộ. Có bộ nhưng không có từ đến hạn thấy trạng thái xong; 1 từ hiển thị “Ôn 1 từ”; 420 từ hiển thị tổng 420 nhưng chỉ “Ôn 50 từ”. Ôn theo bộ không có bộ giữ trạng thái hiện có; trên 8 bộ có ô tìm; lỗi lưu/bắt đầu dùng `role=alert`; khi bắt đầu, nút là “Đang chuẩn bị…”. Tiến bộ `?tab=achievements` về Xếp hạng. Ở 375px, tiêu đề/icon và nhãn nút không xuống dòng.

## 7. Data

Migration additive `20261105000000_en_remove_achievement_xp` xóa `EnXpEvent.kind = 'achievement'` và `EnAchievement`, không đổi schema. `/api/goals/seen` nhận strict body `{ level: z.number().int().nonnegative().max(10_000) }`; reward API không còn `achievements`.

## 8. Tests

`enReviewSummary.test.ts`: 30+10 → total 40/round 40/8 phút; 120+300 → 420/50/10 phút; 0 → 0. `progressStats.test.ts`: 5,10,3,2 → stages 5,5,3,2. Goal tests xác nhận goal/chest chỉ có kind goal/chest và reward chỉ có `xp`, `quests`. DB test so sánh tuần cuối với overview live.

## 9. Steps

1. Tạo nhánh và lưu plan.
2. Thêm pure helpers cùng unit test.
3. Đơn giản Hôm nay, sau đó Ôn theo bộ và các link cũ.
4. Gỡ thành tựu/XP thành tựu và cập nhật API/UI/tests.
5. Cập nhật Tiến bộ và thống kê live state.
6. Thêm migration, generate Prisma, grep, quality/test/test:db.

## 10. Acceptance

`npm run quality`, `npm test` và `npm run test:db` phải chạy; DB tests chỉ được chấp nhận skip khi thiếu `TEST_DATABASE_URL`. Trên `/`, learner có hai bộ, từ chung và hơn 50 từ thấy duy nhất một SRS card tổng cùng “Mỗi lượt 50 từ”. `/review?mode=luan-phien` về `/`; Sheet đổi mode; `/progress` mở Xếp hạng, không có Thành tựu/Huy hiệu, và Nhớ lâu khớp overview. Trước deploy phải `pg_dump` database production, chạy migration, rồi xác nhận achievement XP bằng 0.
