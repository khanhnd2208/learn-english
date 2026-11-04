# Giao diện gọn và làm bài kiểm tra mượt

## 1. Outcome

Mọi màn có tiêu đề, danh sách gọn và một hành động chính. Chọn đáp án trong bài kiểm tra tự sang câu tiếp; máy tính luôn hiện danh sách câu, điện thoại mở danh sách từ đầu màn. Kết quả mở với câu sai trước.

## 2. Out of scope

Không đổi schema, migration, API, service, chấm điểm, SRS, XP, màu, font, điều hướng, admin (trừ chuyển `SubjectAdminControls` sang trang chi tiết). Không thêm phím tắt, đồng hồ, đánh dấu câu, vuốt. `StudySession` và `QuestionView` vẫn chờ phản hồi. Không đụng `docs/plans/en-course-exam-plan.md` và `docs/plans/en-light-settle-http-bench-plan.md`. Không merge hoặc deploy trước khi chủ dự án thử local.

## 3. Invariants touched

- `userId` vẫn chỉ từ `withAuth`; đáp án vẫn chấm ở server qua action `answer`/`finish` hiện có. Client không nhận đáp án trước khi nộp.
- Guided review và practice không ghi `EnWordState`; XP ledger, pacing và SRS không đổi.
- SRS giữ lượt tối đa 50, không giới hạn số lượt, `preview.round` và nút `Ôn N từ`.
- Không hiện số 0 vô nghĩa; số đến hạn, từ mới và phút vẫn còn khi khác 0.
- Danh sách dùng `li`, `Link`, `span`; không tạo card lồng card, kiểm tra 375px, không dùng hex thô. Chỉ dùng inline `style` cho độ rộng %.
- Ngày Việt Nam vẫn do server tính; không thêm ngày tính ở client. Không dùng random.

## 4. Changes per file

### PR 1 — `feat/en-lean-lists`

- `src/components/ui/PageHeader.tsx`: `title`, `action?`, không phụ đề; export trong `src/components/ui/index.ts`.
- `src/components/ui/ListRow.tsx`: `href?`, `title`, `meta?`, `leading?`, `trailing?`, `progress?`; toàn hàng là link khi có `href`, có chevron. `src/app/globals.css` thêm `.word-row-link` liền sau `.word-row`.
- `src/components/english/tests/TestScoreTrail.tsx`: hai dòng phần trăm và `Đạt`/`Chưa đạt`.
- `TestLibrary.tsx`, `Library.tsx`: `PageHeader`, ô tìm khi hơn 8 mục, `ListRow` thay card; bỏ nút đăng ký ở danh sách; nháp, khóa, tiến độ theo dữ liệu.
- `TestSubjectDetail.tsx`, `SubjectDetail.tsx`: bỏ `mode-card` ở đầu, mô tả chỉ khi chưa đăng ký; hàng đề/bộ dùng `ListRow`. `SubjectAdminControls` chuyển từ `Library` vào `details` trong `SubjectDetail`.
- `TestPaperList.tsx`, `TestResults.tsx`, `TestAttemptHistory.tsx`: dùng hàng link và `TestScoreTrail`; lịch sử là `details` đóng sẵn.
- `DESIGN.md`, `AGENTS.md`: thêm sáu quy tắc Lean UI.

### PR 2 — `feat/en-test-runner-flow`

- `src/lib/english/testPaper.ts`: thêm `testAutoAdvanceTarget`, `firstBlankPosition`, `testShowsSubmit`; `src/lib/english/constants.ts`: `EN_TEST_AUTO_ADVANCE_MS = 250`.
- `src/components/english/tests/TestQuestionGrid.tsx`: lưới câu 6 cột trong Sheet, 5 cột ở sidebar; trạng thái đã làm/hiện tại/chưa làm; `aria-label`, `aria-current`.
- `src/components/english/tests/TestRunner.tsx`: màn mở đầu có `BackLink` và chỉ các số chính; khi làm bài có header sticky, cột câu hỏi và sidebar từ `md`; chọn câu trống lưu trên UI và tự nhảy sau 250ms; sửa câu cũ không nhảy; câu cuối không nhảy. Lưu câu và vị trí tuần tự qua hàng đợi Promise không chặn UI; lỗi vào `unsaved`, có `Thử lại`; nộp và thoát gọi `flush`. Enter ở câu điền từ đi tiếp hoặc mở hộp nộp. Hỏi trước mọi lần nộp; thoát thẳng khi lưu thành công, hỏi khi lưu lỗi. Footer có nút trước/sau và nút nộp theo `testShowsSubmit`.
- `src/components/english/tests/TestResultView.tsx`: mặc định lọc câu sai, lưới câu chuyển bộ lọc trước khi cuộn; rút nhãn đáp án; `src/app/(app)/(test)/tests/results/[attemptId]/page.tsx` chỉ giữ ngày ở dòng phụ.

### PR 3 — `feat/en-lean-vocab`

- `AppShell.tsx`: mobile chỉ GoalRing và avatar, xóa onboarding. Xóa `OnboardingTour.tsx`; `VocabShell.tsx` và `src/app/(app)/(vocab)/layout.tsx` bỏ `newLearner`, giữ overview cho GoalPicker.
- `HomeDashboard.tsx`, `src/app/(app)/(vocab)/page.tsx`: thẻ chính rộng hết, ngày ẩn dưới `sm`, thẻ guided và quest chỉ khi có bộ; bỏ `resetsIn`/`timeLeftLabel`.
- `home/TodayHero.tsx`: câu ngắn, bỏ nút xám disabled khi xong. `home/GuidedReviewCard.tsx`: một hàng link. `goals/QuestNote.tsx`: mobile một hàng link tiến độ, desktop giữ danh sách.
- `SetDetail.tsx`, `ReviewOverview.tsx`: bỏ card đầu và giải thích hiện sẵn, giữ `InfoHint`; hàng từ ẩn IPA/từ loại trên mobile; nút ẩn/hiện nghĩa chỉ icon trên mobile. Overview bỏ cuộn lồng, nút bắt đầu sticky.
- `progress/ProgressHub.tsx`, `GuidedReviewSession.tsx`, `quiz/PracticeRunner.tsx`: bỏ đúng các câu liệt kê ở mục 5; giữ số và gợi ý còn lại.

## 5. Exact copy

**Thêm mới (đúng chữ):**

| Nơi | Chữ |
|---|---|
| Danh sách câu, Sheet và sidebar | `Đã làm {a}/{n}` |
| Lỗi lưu | `Không lưu được câu trả lời.` · `Thử lại` |
| Hộp nộp, hết câu trống | `Nộp bài?` · `Xem lại` · `Nộp bài` |
| Hộp nộp, còn câu trống | `Còn {k} câu chưa làm` · `Câu chưa làm sẽ tính là sai.` · `Đến câu {m}` · `Nộp bài` |
| Hộp thoát khi lỗi lưu | `Chưa lưu được câu trả lời` · `Thoát bây giờ sẽ mất câu vừa làm.` · `Ở lại` · `Thoát` |
| Lịch sử và lọc kết quả | `Lịch sử làm bài ({total})` · `Câu sai ({n})` · `Tất cả` |
| Màn mở đầu | `Đạt từ {80}%` · `Cao nhất {x}/{y}` · `Đã làm {a}/{n}` |
| Nhóm thư viện kiểm tra | `Của bạn` thay `Khóa học của bạn` |
| Admin môn học | `Cài đặt môn học` |
| Trống | `Không tìm thấy khóa học` · `Không tìm thấy môn học` · `Chưa có đề` · `Xem khóa học` · `Chọn khóa học` |
| TodayHero | `{d} đến hạn · {m} từ mới · ~{p} phút`; ẩn phần có giá trị 0 |
| SetDetail | `Xem thử {x}/{y} từ` · `Bản nháp` · `Chưa thuộc môn học` |
| ReviewOverview | `Chọn ít nhất một bộ` |

**Bỏ ở Kiểm tra (đúng chữ):**

- `Chọn khóa học để làm bài kiểm tra.`, `Khóa nháp và khóa ẩn cũng hiện với quyền quản trị.`
- `Bạn chưa tham gia khóa học nào. Chọn một khóa ở mục Khám phá.`, `Đăng ký khóa học để làm bài kiểm tra.`
- `Bạn sẽ biết đáp án sau khi nộp bài.`, `Các lần nộp bài gần đây của bạn.`, `Thử từ khóa khác.`
- `Chưa có khóa học nào. Quay lại sau nhé.`, `Làm một bài kiểm tra để xem kết quả ở đây.`, `Thoát bài kiểm tra?` và mô tả cũ của hộp thoát.
- `Vào làm bài →`, `Xem khóa học →`, `Đã đăng ký`, `Chưa đạt · cần 80%`.
- `Bạn chọn`, `Đáp án đúng`, `Bạn chọn · Đáp án đúng`.

**Bỏ ở Từ vựng (đúng chữ):**

- `Chọn môn học phù hợp với bạn.`, `Môn nháp và môn ẩn cũng hiện với quyền quản trị.`, `Các môn học sẽ xuất hiện khi được xuất bản.`
- `Gõ lại từ để nhớ lâu. Từ đến hạn quay lại đúng lúc, bạn không phải tự nhớ lịch.`, `Tất cả bộ đang học:`, `Mỗi lượt 50 từ · lượt này`.
- `Tải một bộ, app sẽ lên lịch ôn cho từng từ.`, nhãn `Bắt đầu` trên thẻ.
- `Mỗi lượt 5 từ: xem thẻ, làm quiz, rồi làm lại câu sai. Không đổi lịch ôn luân phiên.`, `Mở sau khi bạn tải bộ từ đầu tiên.`, `Nhiệm vụ mở sau khi bạn tải bộ từ đầu tiên.`, `Làm mới sau …` ở trang chủ.
- `Chọn một bộ, ôn từng lượt 5 từ.`, `{5} từ / chặng · …`, `Tải một bộ để có từ học thêm.`.
- `Kết hợp chọn nghĩa, điền câu và nghe viết.`, `Nhìn từ tiếng Anh và chọn nghĩa đúng.`, `Chọn từ đúng để điền vào câu.`, `Nghe phát âm và gõ từ bạn nghe được.`, `Hiện thêm cụm từ và cách dùng trên thẻ học.`
- `Dạng câu hỏi: …`, `Đã đi x/y từ trong các bộ đã chọn.`, `Từ này sẽ quay lại sau vài câu.`
- `Đang xem x/y từ mẫu. Đăng ký môn học để xem cả bộ.`
- `Bộ này còn là bản nháp: học viên chưa thấy và chưa tải được.` thay bằng `Bản nháp`.
- `Bộ này chưa thuộc môn học nào nên học viên chưa thấy.` thay bằng `Chưa thuộc môn học`.

**Bỏ ở Tiến bộ (đúng chữ):**

- `Từ càng ôn đúng nhiều lần thì lịch ôn càng giãn ra và lên mức cao hơn.`
- `Mỗi cột là số từ đến hạn trong một ngày.`, `Mỗi cột là một ngày.`, `Mỗi cột là một tuần, bắt đầu từ ngày ghi bên dưới.` ở cả hai chỗ.
- `Số từ … ước tính cuối mỗi tuần.`

Xóa toàn bộ ba bước tour onboarding. Các chuỗi khác giữ nguyên; không thêm chữ tiếng Anh cho học viên.

## 6. States

- Thư viện trống chỉ `EmptyState` tiêu đề; người mới chỉ thấy Khám phá; admin có thêm nút tạo và nháp; điện thoại một cột, từ `sm` hai, từ `lg` ba.
- Chi tiết chưa đăng ký có mô tả, nút đăng ký, hàng đề tĩnh; đã đăng ký có tiến độ, Làm tiếp; không đề ghi `Chưa có đề`; hoàn thành ghi `✓ Hoàn thành khóa học`.
- `start` có loading; chuyển câu không có loading. Một câu: nút trước disabled, cuối có Nộp bài. Đề 100 câu: lưới tự cuộn trong Sheet/sidebar. Lỗi mạng: UI vẫn sửa/đổi câu, hiện Thử lại, chặn nộp, hỏi khi thoát. Resume hiện Đã làm và mở đúng câu lưu.
- Kết quả có sai/trống mặc định lọc sai; toàn đúng hiện toàn bộ và ẩn lọc.
- Trang chủ người mới chỉ có chọn bộ; có bộ có thẻ chính, guided, tiến bộ, nhiệm vụ; xong hôm nay không có nút disabled. Review chưa có bộ có đường chọn môn; chưa chọn bộ vô hiệu nút bắt đầu.
- 375px: không cuộn ngang, không footer xuống dòng, không card lồng card. Trạng thái loading/error/empty và admin/student dùng cùng cấu trúc gọn.

## 7. Data

Không có migration, đổi schema, API payload hay Zod.

## 8. Tests

`src/lib/__tests__/testPaper.test.ts`: `testAutoAdvanceTarget(0,3,true) → 1`, `(0,3,false) → null`, `(2,3,true) → null`; `firstBlankPosition(['1', null, ' ', '2']) → 1`, `(['1','2']) → null`; `testShowsSubmit(2,3,['1',null,null]) → true`, `(0,3,['1','a','2']) → true`, `(0,3,['1',null,'2']) → false`. `src/lib/__tests__/enTestService.test.ts` vẫn pass.

## 9. Steps

Tạo ba PR xếp chồng từ `origin/main`, lần lượt: (1) lưu kế hoạch, nền UI, danh sách, tài liệu, quality; (2) hàm thuần và test, runner/grid/result, quality; (3) shell/trang chủ/từ vựng/tiến bộ, quality, ảnh 375px và 1280px. Không merge/deploy trước khi chủ dự án thử local.

## 10. Acceptance

`npm run quality` pass ở cả ba PR. Dữ liệu mẫu: `npm run db:seed:test-sample`; không cần `npm run test:db` vì không đổi truy vấn. Kiểm tra tại localhost:3002, 375px và 1280px: thư viện và chi tiết bấm cả hàng, không nút tím từng hàng; runner có BackLink, tự nhảy 250ms khi chọn câu trống, sửa không nhảy, lưới mobile/desktop, Enter cho điền từ, reload giữ đáp án, offline có Thử lại và chặn nộp, hộp nộp đưa tới câu trống đầu; kết quả mở câu sai và cuộn tới câu đúng sau khi đổi lọc; trang chủ/store/review/progress/sets gọn nhưng đủ số; admin mở Cài đặt môn học; console không lỗi hydration.
