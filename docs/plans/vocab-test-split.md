# Plan: tách app thành hai khu Vocab và Test

Chưa có code.

## Ghi chú về hiện trạng (đã đọc code, HEAD d211a64)

- Đã có `ModeSwitch`, cookie `wq_mode` (`src/lib/appMode.ts`), `TEST_NAV`, `TEST_ADMIN_NAV`, `/tests/**`, `/admin/tests`. Một `EnglishShell` duy nhất chọn nav theo `modeOfPath`. Layout `src/app/(app)/layout.tsx` luôn nạp overview, goals, avatar, kể cả ở khu Test.
- **"Khóa học" không còn trong code.** #77 đã xóa course/lesson/exam. Hiện chỉ có Môn học vocab (`EnVocabSubject`) và Môn kiểm tra (`EnTestSubject`, chứa `EnTestPaper`). Chủ sở hữu chốt: Khóa học (khu Test) = `EnTestSubject` đổi tên hiển thị, là nhóm có thứ tự các đề. Không đụng schema.
- Chưa có thư viện kéo-thả trong `package.json`.
- Admin Vocab (`/admin`: Nội dung, Môn học, Hòm thư, Công cụ test) và Admin Test (`/admin/tests`) đã là hai trang, nhưng dùng chung shell, `SubjectAdminControls`, `SubjectEnrollButton`.
- Quyết định của chủ sở hữu: Khóa học = nhóm có thứ tự các đề; kéo-thả là thẻ đề trong Admin Test; kéo-thả chỉ cần desktop; giữ `ModeSwitch`, tách shell rõ hơn.

## 1. Outcome

Học viên vào Vocab thấy hai chế độ ôn nổi bật ngay trang chủ: **Ôn luân phiên** và **Ôn theo bộ**, mỗi chế độ có một dòng mô tả. Vào Test thấy hai mục **Khóa học** và **Bài kiểm tra**; khóa học hiện tiến độ ("2/5 đề đạt") và nút "Làm tiếp" tới đề kế tiếp chưa đạt.

Admin có hai khu riêng: `/admin` chỉ cho vocab, `/admin/tests` chỉ cho khóa học và bài kiểm tra. Ở Admin Test, các đề là thẻ gọn có thể kéo-thả để sắp xếp trong khóa học hoặc chuyển sang khóa học khác.

## 2. Out of scope

- Không đổi schema, không migration. Không đổi tên bảng `EnTestSubject` / `EnTestPaper`.
- Không đổi logic SRS, guided review, XP, quest, thành tựu, tiến độ, `RewardCenter`, `OnboardingTour` (chỉ chuyển chúng vào shell Vocab).
- Không đổi URL hiện có (`/tests/subjects/[id]` giữ nguyên dù hiển thị "Khóa học"). Chỉ thêm `/tests/papers` và `/admin/tests/papers`.
- Không đổi nội dung `/admin` (4 tab) và `/store`, `/subjects/*`.
- Không đụng `docs/plans/en-course-exam-plan.md` (đã lỗi thời) và `docs/plans/en-light-settle-http-bench-plan.md`.
- Không kéo-thả trên điện thoại (xem State). Không gom/đổi tên bảng legacy `EnCourse`, `EnExam`.

## 3. Invariants touched

- **Ba chế độ học**: Vocab giữ nguyên `enDailyService` / `enGuidedReviewService`; chỉ thêm thẻ giao diện. Ôn theo bộ vẫn không ghi `EnWordState`. Luyện tập không đổi.
- **XP ledger bất biến** (`EnXpEvent`, `sourceKey`): không sửa service nào ghi XP. Khu Test không nạp `getGoalBoard` / `getTodayOverview` nên không có XP, ring hay quest (đúng như hiện tại).
- **Ngày Việt Nam**: ngày kết quả Test vẫn dùng `vnDayKey` (đang dùng trong `enTestService`); plan không thêm chỗ nào tính ngày. "Hôm nay"/streak ở trang chủ vẫn tính ở server.
- **Pitfall zero-noise**: không hiện "0/0 đề", "0 câu", chip rỗng (xem Exact copy và States).
- **Pitfall userId**: mọi service mới nhận `userId` từ `withAuth`, không từ body/query. Admin route dùng `withAdmin`, Zod `.strict()`.
- **Pitfall randomness**: không dùng `Math.random()` (plan không cần ngẫu nhiên).
- **Next 16**: `params`/`searchParams` là Promise; route nhóm `(vocab)` / `(test)` không đổi URL. Đọc `node_modules/next/dist/docs/` về route groups và nested layouts trước khi sửa.
- **HTML hợp lệ**: không đặt `div`/`Card` trong `p`. Không card trong card (mỗi thẻ đề là một mục phẳng trong cột).

## 4. Changes per file

### A. Tách shell và route (refactor thuần, không đổi hành vi)

1. `src/app/(app)/layout.tsx`: chỉ giữ `auth()` + redirect `/login` và `children`. Bỏ phần nạp overview/goals/avatar và `<EnglishShell>`.
2. Tạo `src/app/(app)/(vocab)/layout.tsx`: chuyển nguyên logic cũ của layout (nạp `getTodayOverview`, `getGoalBoard`, `getAvatarState`, dựng `ShellGoals`, `newLearner`) và render `<VocabShell>`.
3. Tạo `src/app/(app)/(test)/layout.tsx`: chỉ render `<TestShell avatarUrl hasUpload>`; lấy avatar bằng cùng hàm `getAvatarState` (không nạp overview, goals). `userId` từ `auth()`.
4. `git mv` (giữ nguyên `loading.tsx` / `error.tsx` đi cùng):
   - vào `(vocab)/`: `page.tsx`, `review/`, `sets/`, `store/`, `subjects/`, `progress/`, `quests/`, `mistakes/`, `admin/page.tsx`.
   - vào `(test)/`: `tests/`, `admin/tests/`.
   - `(app)/error.tsx` và `(app)/loading.tsx` giữ nguyên.
5. `src/components/english/EnglishShell.tsx` đổi thành `VocabShell.tsx` (git mv): bỏ nhánh `modeOfPath`, chỉ dùng `MAIN_NAV` + `ADMIN_NAV`, `adminHref="/admin"`; giữ focus mode cho `/sets/:id/(practice|test)`, `RewardCenter`, `OnboardingTour`, vòng mục tiêu.
6. Tạo `src/components/english/tests/TestShell.tsx`: sidebar + header mobile + bottom nav copy từ `VocabShell`, dùng `TEST_NAV` / `TEST_ADMIN_NAV`, `adminHref="/admin/tests"`, focus mode cho `/tests/papers/:id` (regex đúng một id, không khớp `/tests/papers` danh sách). Không có goal ring, chip XP, RewardCenter, OnboardingTour.
7. `ModeSwitch.tsx`: giữ nguyên, dùng ở cả hai shell. Đây và `AccountMenu` (nhận `adminHref` qua prop) là hai thành phần duy nhất dùng chung.
8. `src/config/navigation.ts`: tách thành hai file.
   - `navigation.ts` chỉ còn `MAIN_NAV`, `ADMIN_NAV` và `isNavActive` cho Vocab (bỏ `/tests`, `/admin/tests`, `TEST_NAV`, `TEST_ADMIN_NAV`).
   - Tạo `src/config/testNavigation.ts`: `TEST_NAV`, `TEST_ADMIN_NAV`, `isTestNavActive`.
   - Sửa import trong các nơi dùng (grep `TEST_NAV`, `TEST_ADMIN_NAV`).
   - Cập nhật `navAdventureIcons` trong `TestShell` cho icon mới (chọn từ icon đang có của `AdventureIcon`: `'map'` cho Khóa học, `'flag'` cho Bài kiểm tra; không icon nào rơi vào fallback).
9. `src/proxy.ts`: giữ nguyên matcher, `protectedPaths` đã có `/tests`. Không đổi.

### B. Vocab: làm nổi bật hai chế độ

10. Tạo `src/components/english/home/GuidedReviewCard.tsx` (mẫu: cấu trúc `TodayHero.tsx`): thẻ "Ôn theo bộ" với mô tả, nút tới `/review`; nếu `enrolledSets === 0` thì nút tới `/store`.
11. `src/components/english/home/TodayHero.tsx`: thêm dòng mô tả dưới tiêu đề "Ôn luân phiên" ở cả ba state; không đổi `todayHeroState`, `id="srs"`, nút, XP chip, chi tiết due/new.
12. `src/components/english/HomeDashboard.tsx`: thứ tự mới: `TodayHero`, `GuidedReviewCard`, `ProgressStrip`, `QuestNote`. Desktop (lg): `TodayHero` và `GuidedReviewCard` hai cột ngang hàng trên cùng, `ProgressStrip` / `QuestNote` bên dưới (giữ lưới 3 cột hiện có cho phần còn lại).
13. `src/components/english/ReviewOverview.tsx`: thêm một dòng mô tả dưới `<h1>`. Giữ mọi nội dung và số liệu cũ.

### C. Test: logic thuần và service

14. Tạo `src/lib/english/testCourse.ts` (mẫu: `testPaper.ts`):
    - `courseProgress(papers: { id: string; bestPercent: number | null }[], passPercent: number): { passed: number; total: number; nextId: string | null }`. `papers` đã sắp theo thứ tự. `passed` đếm đề có `bestPercent >= passPercent`; `nextId` là id đề đầu tiên chưa đạt, `null` nếu tất cả đã đạt hoặc không có đề.
    - `reorderColumns(columns, move)` hoặc tương đương **không cần**; việc di chuyển tính ở client bằng `arrayMove` của dnd-kit.
15. `src/services/english/enTestSubjectService.ts`:
    - `getTestSubjectDetail`: trả thêm `progress` (gọi `courseProgress` với `bestPercent` từng đề; dùng `pickBestAttempt` đã có để lấy điểm tốt nhất, xem `testPaperRows`).
    - `listTestSubjects`: trả thêm `passed` và `total` cho khóa đã tham gia.
    - `listAdminTestSubjects`: mỗi đề trả thêm `questionCount` (nếu chưa có) và `status`.
16. `src/services/english/enTestService.ts`:
    - Thêm `listMyTestPapers(userId)`: các đề `published` thuộc khóa học `published` mà người dùng đã tham gia, kèm tên khóa, `bestPercent`, theo thứ tự khóa rồi `sortOrder`.
    - Thêm `reorderTestPapers(columns: { subjectId: string; paperIds: string[] }[])`: trong một `prisma.$transaction`, kiểm tra mọi `subjectId` và `paperId` tồn tại và không trùng giữa các cột (lỗi nếu trùng), rồi `update` từng đề với `{ subjectId, sortOrder: index }`. Chạy hai lần cho kết quả giống nhau (idempotent). Đề không nằm trong request giữ nguyên.
    - Không đổi `getTestResult` / `listMyTestResults`. Đề chuyển khóa: lịch sử làm bài giữ nguyên; kiểm tra `getTestResult` chỉ lọc theo `userId`. Nếu nó đang gọi `accessiblePaper` (đòi đang tham gia khóa), **dừng và báo lại** thay vì tự sửa.

### D. Test: API

17. Tạo `src/app/api/admin/tests/papers/reorder/route.ts`: `POST`, `withAdmin` + `withErrorHandling`, Zod `.strict()`: `{ columns: z.array(z.object({ subjectId: z.string().min(1), paperIds: z.array(z.string().min(1)).max(200) }).strict()).min(1).max(50) }`. Gọi `reorderTestPapers`, trả `apiSuccess({ ok: true })`. Mẫu: `src/app/api/admin/tests/subjects/route.ts`.

### E. Test: giao diện học viên

18. `TestLibrary.tsx` (`/tests`): đổi tiêu đề thành "Khóa học". Hai nhóm: "Khóa học của bạn" (kèm tiến độ `passed/total`, thanh tiến độ) và "Khám phá". Giữ ô mã truy cập hiện có.
19. `TestSubjectDetail.tsx` (`/tests/subjects/[id]`): đầu trang có tên khóa, thanh tiến độ, nút chính "Làm tiếp: {tên đề}" (tới `/tests/papers/{nextId}`). Danh sách đề dạng hàng gọn: số thứ tự, tên, số câu, điểm tốt nhất, chip "Đạt" / "Chưa đạt" (không chip nếu chưa làm). Mọi đề đều mở được (không khóa theo thứ tự).
20. Tạo `src/components/english/tests/CourseEnrollButton.tsx` và `CourseAdminControls.tsx`: bản sao của `SubjectEnrollButton` / `SubjectAdminControls` đổi copy sang "khóa học"; dùng ở khu Test. Bản vocab giữ nguyên, không sửa. Hai bản độc lập.
21. Tạo `src/app/(app)/(test)/tests/papers/page.tsx` + `src/components/english/tests/TestPaperList.tsx`: danh sách phẳng "Bài kiểm tra" từ `listMyTestPapers`; mỗi hàng: tên đề, tên khóa, điểm tốt nhất, nút "Làm bài" / "Làm lại".
22. `src/config/testNavigation.ts` `TEST_NAV`: "Khóa học" `/tests`, "Bài kiểm tra" `/tests/papers`, "Kết quả" `/tests/results`. `isTestNavActive`: `/tests` chỉ active với `/tests` và `/tests/subjects/*`; `/tests/papers` active với đúng `/tests/papers`; `/tests/results` với `/tests/results*`.

### F. Admin Test (kéo-thả)

23. `package.json`: thêm `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (ghim đúng phiên bản ổn định mới nhất khi cài; chạy `npm install` để cập nhật lockfile).
24. `src/app/(app)/(test)/admin/tests/page.tsx` → trang **Khóa học** (bảng kéo-thả). Tạo `src/components/english/tests/CourseBoard.tsx`: mỗi khóa học là một cột; trong cột là danh sách thẻ đề có thể sắp xếp; kéo thẻ sang cột khác thì chuyển khóa. Dùng `DndContext` + `SortableContext` (chiến lược dọc), `PointerSensor` có `activationConstraint: { distance: 6 }` và `KeyboardSensor`. Khi thả: tính thứ tự mới ở client, cập nhật lạc quan, gọi `POST /api/admin/tests/papers/reorder` với **mọi cột bị ảnh hưởng**; lỗi thì hoàn lại thứ tự cũ và hiện thông báo.
25. Tạo `src/components/english/tests/PaperCard.tsx`: thẻ đề gọn (một hàng): tay cầm kéo (chỉ từ `md`), tên đề (cắt dòng), "{n} câu", chip trạng thái (Nháp/Đã xuất bản), nút ↑ ↓ (chỉ dưới `md`, gọi cùng endpoint reorder với thứ tự đã đổi trong cột). Không card lồng card; thẻ nằm phẳng trong cột. Dùng `src/components/ui/` và token `DESIGN.md`.
26. Tạo `src/app/(app)/(test)/admin/tests/papers/page.tsx` + `src/components/english/tests/PaperAdmin.tsx`: trang **Bài kiểm tra** của admin: phần tải xlsx (chuyển nguyên `PaperAdminSection` từ `TestAdmin.tsx`: tải mẫu, upload, xem trước, lỗi, lưu nháp / xuất bản), chọn khóa học đích bằng select; bên dưới là danh sách đề dạng `PaperCard` (không kéo-thả ở trang này) với xuất bản, xóa, tải xuống. `TestAdmin.tsx` xóa, nội dung tách sang `CourseBoard.tsx` và `PaperAdmin.tsx`; phần tạo khóa học và `CourseAdminControls` nằm ở `CourseBoard`.
27. `src/config/testNavigation.ts` `TEST_ADMIN_NAV`: "Khóa học" `/admin/tests`, "Bài kiểm tra" `/admin/tests/papers`. `isTestNavActive` dùng khớp chính xác cho hai mục này.

### G. Admin Vocab

28. `/admin` và `EnglishAdmin.tsx` giữ nguyên bốn tab. Nhãn nav `ADMIN_NAV` giữ "Nội dung". Không import gì từ `tests/` (kiểm tra bằng grep sau khi xong). Quyền: `src/proxy.ts` giữ chặn `/admin*` cho non-admin.

## 5. Exact copy

Mới (Vocab):
- `TodayHero` dưới tiêu đề "Ôn luân phiên": **"Gõ lại từ để nhớ lâu. Từ đến hạn quay lại đúng lúc, bạn không phải tự nhớ lịch."**
- `GuidedReviewCard` tiêu đề: **"Ôn theo bộ"**. Mô tả: **"Mỗi lượt 5 từ: xem thẻ, làm quiz, rồi làm lại câu sai. Không đổi lịch ôn luân phiên."**. Nút (đã tham gia ít nhất một bộ): **"Chọn bộ để ôn →"**. Nút (chưa tham gia bộ nào): **"Chọn bộ từ đầu tiên →"**.
- `ReviewOverview` dưới `<h1>`: **"Chọn một bộ, ôn từng lượt 5 từ."** (giữ nguyên `<h1>` và mọi dòng cũ).

Mới (Test, học viên):
- `TestLibrary` `<h1>`: **"Khóa học"**; nhóm: **"Khóa học của bạn"**, **"Khám phá"**; tiến độ: **"{passed}/{total} đề đạt"** (ẩn khi `total` = 0).
- Chưa có khóa nào đã tham gia: **"Bạn chưa tham gia khóa học nào. Chọn một khóa ở mục Khám phá."**
- Không có khóa nào đang mở: **"Chưa có khóa học nào. Quay lại sau nhé."**
- `TestSubjectDetail`: nút chính **"Làm tiếp: {tên đề}"**; khi tất cả đã đạt (và có đề) hiện **"✓ Hoàn thành khóa học"**; khóa chưa có đề xuất bản: **"Khóa học này chưa có đề."**; chip **"Đạt"**, **"Chưa đạt"**; số câu **"{n} câu"**; điểm **"{p}%"**.
- `/tests/papers` `<h1>`: **"Bài kiểm tra"**; nút **"Làm bài"** (chưa làm) / **"Làm lại"** (đã làm); rỗng: **"Bạn chưa tham gia khóa học nào."** kèm liên kết **"Xem khóa học"** tới `/tests`; có khóa nhưng chưa có đề: **"Các khóa của bạn chưa có đề."**
- Nav: **"Khóa học"**, **"Bài kiểm tra"**, **"Kết quả"** (shortLabel giống nhãn).
- `CourseEnrollButton` / `CourseAdminControls`: thay mọi chữ "môn học" bằng "khóa học" (giữ cấu trúc câu của bản gốc; không thêm chữ tiếng Anh).

Mới (Admin Test):
- Tiêu đề trang `/admin/tests`: **"Khóa học"**; trang `/admin/tests/papers`: **"Bài kiểm tra"**.
- Cột rỗng: **"Kéo đề vào đây"**; nút tạo khóa: **"Tạo khóa học"**.
- Chip: **"Nháp"**, **"Đã xuất bản"**.
- Lỗi lưu thứ tự: **"Không lưu được thứ tự. Đã khôi phục."**
- Nhãn truy cập cho tay cầm kéo (`aria-label`): **"Kéo để sắp xếp"**; nút ↑ ↓: **"Đưa lên"**, **"Đưa xuống"**.
- Select khóa đích khi nhập xlsx: nhãn **"Khóa học"**.

Bị loại: mọi chữ "Môn học" / "môn" trong khu Test (`TestLibrary`, `TestSubjectDetail`, `TestAdmin`, `TEST_NAV`, `TEST_ADMIN_NAV`). Các chuỗi khác của Vocab ("Môn học" ở `/store`, `/subjects`, tab admin) **giữ nguyên**.

## 6. States

| Màn | Loading | Lỗi | Rỗng / 0 | 1 mục | Nhiều mục | Học viên mới | Admin vs học viên | 375px |
|---|---|---|---|---|---|---|---|---|
| Home Vocab | giữ `loading.tsx` | giữ `error.tsx` | `GuidedReviewCard` nút tới `/store`; ẩn mọi số "0" | như nhiều | như nhiều | cả hai thẻ dẫn tới `/store`/chọn bộ | như nhau | hai thẻ xếp dọc, nút một dòng |
| `/review` | giữ | giữ | giữ | giữ | giữ | giữ | như nhau | dòng mô tả tối đa 2 dòng |
| `/tests` | thêm `loading.tsx` | `error.tsx` của `(app)` | hai câu rỗng ở Exact copy | một thẻ | lưới thẻ | "Bạn chưa tham gia…" | như nhau | thẻ một cột |
| `/tests/subjects/[id]` | giữ | giữ | "Khóa học này chưa có đề." | nút "Làm tiếp" | danh sách hàng gọn | không có điểm, không chip | như nhau | hàng không xuống dòng, tên cắt `truncate` |
| `/tests/papers` | thêm `loading.tsx` | `error.tsx` | hai câu rỗng | một hàng | danh sách | rỗng "chưa tham gia" | như nhau | nút "Làm bài" không xuống dòng |
| Admin Khóa học | thêm `loading.tsx` | thông báo lỗi lưu | cột "Kéo đề vào đây" | một thẻ | nhiều cột, nhiều thẻ | n/a | chỉ admin (proxy + page redirect) | xếp cột dọc; ẩn tay cầm kéo; dùng ↑ ↓; admin dùng chính xác như desktop không bắt buộc |
| Admin Bài kiểm tra | thêm `loading.tsx` | lỗi import hiện sẵn | danh sách trống: không hiện "0 đề" | một thẻ | danh sách | n/a | chỉ admin | thẻ cắt dòng, nút gọn |

Học viên (non-admin) không thấy mục Quản trị ở khu nào. Khu Test không hiện XP, ring, quest.

## 7. Data

- **Schema**: không đổi, không migration, không `prisma generate`.
- **Payload mới**: `POST /api/admin/tests/papers/reorder` với `{ columns: { subjectId: string; paperIds: string[] }[] }` (Zod `.strict()`, tối đa 50 cột, 200 đề mỗi cột) → `{ ok: true }`. Lỗi 400 nếu trùng `paperId`, hoặc id không tồn tại.
- **Payload mở rộng (đọc)**: `getTestSubjectDetail` thêm `progress: { passed, total, nextId }`; `listTestSubjects` thêm `passed`, `total`; `listAdminTestSubjects` thêm `questionCount`, `status` mỗi đề (chỉ thêm nếu chưa có).

## 8. Tests

Pure, không mock (`src/lib/__tests__/testCourse.test.ts`):
- `courseProgress([], 80)` → `{ passed: 0, total: 0, nextId: null }`.
- `courseProgress([{id:'a',bestPercent:90},{id:'b',bestPercent:50},{id:'c',bestPercent:null}], 80)` → `{ passed: 1, total: 3, nextId: 'b' }`.
- `courseProgress([{id:'a',bestPercent:80}], 80)` → `{ passed: 1, total: 1, nextId: null }` (đúng ngưỡng).
- Tất cả `null` → `{ passed: 0, total: n, nextId: <id đầu tiên> }`.

Service, mock Prisma (`src/lib/__tests__/enTestReorder.test.ts`, mẫu `enTestService.test.ts`):
- `reorderTestPapers` hai cột `[{subjectId:'s1',paperIds:['p2','p1']},{subjectId:'s2',paperIds:['p3']}]` → ba `update`: p2 `{s1,0}`, p1 `{s1,1}`, p3 `{s2,0}`, trong một `$transaction`.
- `paperIds` trùng giữa hai cột → ném lỗi, không `update`.
- `paperId` không tồn tại → ném lỗi, không `update`.
- `listMyTestPapers`: khóa nháp và đề nháp không có trong kết quả; thứ tự theo khóa rồi `sortOrder`.

Điều hướng (`src/lib/__tests__/testNavigation.test.ts`):
- `isTestNavActive('/tests/papers/abc', '/tests')` → `false`; `('/tests/subjects/x', '/tests')` → `true`; `('/tests/papers', '/tests/papers')` → `true`; `('/admin/tests/papers', '/admin/tests')` → `false`.
- `modeOfPath('/admin/tests/papers')` → `'test'` (thêm vào `appMode.test.ts`).

DB (`src/lib/__dbtests__/testPaper.dbtest.ts`): thêm ca reorder thật: chuyển `p1` từ `s1` sang `s2` → `subjectId` và `sortOrder` đúng; chạy lần hai cho kết quả không đổi. Chạy `npm run test:db` (đổi truy vấn DB).

## 9. Steps

1. Nhánh `feat/vocab-test-split` từ `main`. Đọc docs Next 16 về route groups, nested layouts.
2. Mục A: tách layout, `git mv`, `VocabShell`, `TestShell`, tách navigation. Chạy `npm run typecheck` rồi `npm run dev` kiểm tra: mọi URL cũ vẫn mở, không đổi hành vi. Commit riêng.
3. Mục B: thẻ Vocab. Commit.
4. Mục C + D: `testCourse.ts`, service, API reorder, kèm test (mục 8). Commit.
5. Mục E: giao diện học viên Test, `CourseEnrollButton`, `/tests/papers`. Commit.
6. Mục F: cài dnd-kit, `CourseBoard`, `PaperCard`, `PaperAdmin`, nav admin. Commit.
7. Mục G: grep chứng minh Vocab admin không import từ `components/english/tests/` và ngược lại (ngoại trừ `ModeSwitch`, `AccountMenu`). Commit.
8. `npm run quality` và `npm run test:db`.

## 10. Acceptance

- `npm run quality` và `npm run test:db` đạt.
- Thủ công (`http://localhost:3002`, đăng nhập bằng tài khoản dev):
  - Học viên mới, chưa tham gia gì: `/` thấy hai thẻ chế độ, nút dẫn `/store`; `/tests` thấy câu rỗng.
  - Học viên đã có từ đến hạn: `/` hiện "Ôn N từ", thẻ Ôn theo bộ nút "Chọn bộ để ôn →"; `/review` mở bình thường; không có số "0".
  - Học viên đã làm một đề đạt: `/tests` hiện "1/N đề đạt"; trang khóa hiện nút "Làm tiếp: …" đúng đề kế tiếp; `/tests/papers` liệt kê đề.
  - Khu Test: DevTools Network không gọi nạp goals/overview; không có XP ring, không `RewardCenter`.
  - Admin: `/admin` chỉ có bốn tab vocab, không có chữ "Khóa học"/"Bài kiểm tra"; `/admin/tests` kéo thẻ đề trong cột và sang cột khác, tải lại thấy thứ tự được giữ; `/admin/tests/papers` nhập xlsx và xuất bản được.
  - Non-admin gõ `/admin` hoặc `/admin/tests`: bị chuyển về `/`.
  - Cửa sổ 375px: chỉ kiểm tra nhìn: không cuộn ngang, nút một dòng, bottom nav đủ 3 mục (Test) / 4 mục (Vocab), admin có ↑ ↓ thay tay cầm kéo.
- Báo mọi sai khác so với plan trong thân PR.

## Câu hỏi còn mở (đã tự quyết, báo lại nếu sai)

- Khóa học không khóa theo thứ tự; "Làm tiếp" chỉ là gợi ý.
- Một đề luôn thuộc đúng một khóa (không có "đề chưa xếp"); chuyển đề giữa khóa bằng kéo-thả.
- Chuyển một đề sang khóa mà học viên chưa tham gia: lịch sử làm bài của họ giữ nguyên, nhưng họ không làm lại được đề đó.
