# Plan: Tách app thành hai chế độ — Từ vựng và Kiểm tra

Plan này giao cho agent thực hiện. Làm **hai PR theo thứ tự**, mỗi PR một nhánh riêng tách từ `main`:

- **PR A — Môn học Từ vựng** (nhánh `claude/vocab-subjects`): thêm Môn học cho Từ vựng, gỡ toàn bộ khóa học và bài kiểm tra của #74/#75 khỏi phần Từ vựng.
- **PR B — Chế độ Kiểm tra** (nhánh `claude/test-mode`, tách từ `main` **sau khi** PR A đã merge): nút chuyển chế độ, môn học Kiểm tra, nhập đề Excel, làm bài, xem kết quả.
- **Bước C — Xóa bảng cũ** (không nằm trong PR A/B): chỉ làm khi chủ dự án đồng ý, xem mục 9.C.

Từ ngữ trong plan:

| Từ | Nghĩa |
|---|---|
| Môn học Từ vựng | Bảng mới `EnVocabSubject`. Gom nhiều bộ từ (`EnSet`). Học viên đăng ký cả môn. |
| Môn học Kiểm tra | Bảng mới `EnTestSubject`. Gom nhiều bài kiểm tra. Không liên quan gì tới `EnVocabSubject`. |
| Bài kiểm tra | Bảng mới `EnTestPaper` (gọi tắt "đề" trong code). Câu hỏi `EnTestPaperQuestion`, dạng `mcq` hoặc `fill`. |
| Lượt làm | `EnTestPaperAttempt` + bản chụp câu hỏi `EnTestPaperAttemptItem`. |
| Bảng cũ | `EnCourse`, `EnCourseEnrollment`, `EnSet.courseId`, `EnExam`, `EnExamQuestion`, `EnExamAttempt`, `EnExamAttemptItem`. Sau PR A không còn code nào đọc hay ghi chúng. |

---

## 1. Outcome

- **Học viên, chế độ Từ vựng:** mọi thứ như trước (Hôm nay, Ôn theo bộ, Tiến bộ, Luyện tập). Mục "Cửa hàng" hiện các **môn học**; bấm "Đăng ký" một môn là nhận mọi bộ từ của môn. Không còn tab hay nút bài kiểm tra nào trong phần Từ vựng.
- **Học viên, chế độ Kiểm tra:** trên thanh điều hướng có nút chuyển **Từ vựng ⇄ Kiểm tra**; app nhớ chế độ cho lần mở sau. Ở Kiểm tra, học viên xem các môn, đăng ký môn (nhập mật khẩu nếu có), làm bài trắc nghiệm và điền từ, nộp bài, xem điểm, đáp án và giải thích, làm lại bao nhiêu lần cũng được, và xem lại các lần đã làm ở trang "Kết quả".
- **Admin:** ở Từ vựng, tạo môn học và xếp bộ từ vào môn. Ở Kiểm tra, tạo môn học, tải file Excel mẫu, tải lên file đề, xem trước kèm lỗi theo từng dòng, rồi lưu nháp hoặc xuất bản vào một môn.

## 2. Out of scope

- Không đổi Ôn luân phiên: `enDailyService.ts`, `schedule.ts`, `grade.ts`, `srsPrompt.ts`, các route `/api/daily/*` giữ nguyên.
- Không đổi Ôn theo bộ (`enGuidedReviewService.ts`, `guidedReview.ts`, `GuidedReviewSession.tsx`), trừ đúng hai chuỗi copy trong `ReviewOverview.tsx` ở mục 5.
- Không đổi Luyện tập (`PracticeRunner`, `practiceLoop.ts`, `/sets/[setId]/practice`, redirect `/sets/[setId]/test`).
- Không đụng model cũ `EnTestAttempt`, `EnTestItem`, `EnPracticeSession`. Enum `EnTestStatus` và `EnContentStatus` được **dùng lại** làm kiểu cột (enum không phải khóa ngoại hay dữ liệu dùng chung).
- **Không xóa bảng, cột hay dòng nào** trong PR A/B. Bảng cũ vẫn nằm trong `prisma/schema.prisma` (thêm chú thích, mục 4) để `prisma migrate` không tự sinh lệnh DROP.
- Chế độ Kiểm tra **không** có XP, nhiệm vụ, chuỗi ngày, thành tích, bảng xếp hạng. Không ghi `EnWordState`, `EnReview`, `EnXpEvent`, `EnStudyDay`, `EnQuestBoard`, `EnAchievement`.
- Không có hẹn giờ, ngân hàng câu hỏi, xáo câu hay xáo đáp án: giữ đúng thứ tự trong file Excel (đơn giản, và admin muốn đề như mình soạn).
- Không còn ô dán đề dạng chữ của #75: Excel là cách nhập duy nhất.
- Không đổi định dạng pack từ vựng v4 và luồng `/api/admin/import`.
- Không có trang sắp xếp lại thứ tự bài kiểm tra: bài mới luôn nằm cuối môn.
- Không chuyển dữ liệu từ bảng cũ sang bảng mới (chủ dự án chọn làm lại từ đầu).

## 3. Invariants touched

| Quy tắc | Cách giữ đúng |
|---|---|
| Chỉ Ôn luân phiên ghi `EnWordState` / `EnReview` | Đăng ký môn Từ vựng chỉ thêm `EnVocabSubjectEnrollment` + `EnEnrollment` (như #74). Rời môn chỉ xóa hai loại dòng đó. Mọi code Kiểm tra chỉ ghi các bảng `EnTest*` mới. |
| Ba chế độ học tách biệt; Luyện tập không ghi gì | Không đổi file nào của Luyện tập. |
| XP chỉ qua `EnXpEvent` idempotent | Kiểm tra không thưởng XP nên không có `sourceKey` mới. Phần Từ vựng không đổi cách trả XP. |
| Hàng đợi SRS không hạn mức, vòng 50 từ, ≥60% đến hạn | Không đổi. Đăng ký một môn nhiều bộ chỉ làm có thêm từ mới, như #74. |
| Ngày theo giờ Việt Nam | Ngày trên trang Kết quả và "Lần gần nhất" tính ở server bằng `vnDayKey` (`src/lib/english/gapRule.ts`), rồi đổi `YYYY-MM-DD` thành `DD/MM/YYYY` bằng tách chuỗi. Không dùng `toISOString().slice`, `getDate()` hay `new Date()` khi client render. |
| Câu trên thẻ (`role: 'study'`) không vào quiz | Không liên quan: đề Kiểm tra do admin soạn, không đọc `EnExample`. |
| Chỉ lấy `userId` từ `withAuth` | Mọi API mới lấy `user.id` từ `withAuth` / `withAdmin`. Mọi query `EnTestPaperAttempt` và `EnVocabSubjectEnrollment` / `EnTestSubjectEnrollment` lọc theo `userId`. Trang Kết quả của admin cũng chỉ hiện lượt làm của chính admin. |
| Chấm ở server, không lộ đáp án khi đang làm | Payload lượt làm `in_progress` không có `correctIndex`, `answers`, `explanationVi`, `correct` (giữ cách `publicAttempt` của #75). Đáp án chỉ trả về sau `finish` hoặc khi xem lượt đã `finished`. |
| Ngẫu nhiên dùng `rng.ts` | Không có gì ngẫu nhiên. |
| Không có số 0 vô nghĩa | Ẩn "0 bộ", "0 học viên", "0 bài kiểm tra", chip điểm khi chưa làm; thay bằng câu có nghĩa ở mục 5. |
| Giữ mọi gợi ý và con số khi đổi chữ | Các thẻ môn giữ số bộ, số từ, "Cần mật khẩu", trạng thái đăng ký như thẻ khóa học #74. Trên điện thoại, chữ thương hiệu "WordQuest" ở header được thay bằng nút chuyển chế độ (cố ý, để vừa 375px; trang chủ vẫn mở được từ thanh dưới "Hôm nay"). |
| HTML hợp lệ, 375px, không card lồng card | Hàng bộ / hàng đề là `<li className="word-row">`. Form nhập đề trong thẻ môn là `<div className="border-t ...">`, không phải `Card`. Nút chuyển chế độ là hai `<Link>` trong một `<div role="group">`. |
| Build từ `src/components/ui/` và token | Dùng `Button`, `Dialog`, `Sheet`, `ProgressBar`, `EmptyState`, `Card`, `useToast`. Không style inline, không mã màu hex. |
| Migration chỉ thêm, tên folder sau folder mới nhất | PR A: `20261108000000_en_vocab_subject`. PR B: `20261109000000_en_test_mode`. Folder mới nhất hiện tại là `20261107000000_en_exam`. Không dùng ngày hôm nay. |
| `params` / `searchParams` là Promise; bảo vệ route ở `src/proxy.ts` | Mọi trang mới `await params`. Sửa `protectedPaths` trong `src/proxy.ts` (mục 4). Đọc `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md` trước khi sửa `proxy.ts`. |
| `npm run quality` gồm `next build` | Chạy đủ sau mỗi PR. |
| Chỉ sửa file cần thiết | Không đổi định dạng file, không đổi tên ngoài danh sách ở mục 4. |

### Quy tắc nghiệp vụ (đã chốt)

**Môn học Từ vựng** (giữ đúng logic #74, đổi bảng):
1. Học viên thấy một môn khi `status = 'published'`, `listed = true` và môn có ít nhất một bộ `published`; hoặc khi đã đăng ký môn đó. Admin thấy mọi môn.
2. Bộ có `subjectId = null` không hiện với học viên chưa có bộ đó. Ai đã có `EnEnrollment` của bộ thì vẫn học tiếp và vẫn mở được trang bộ. Admin thấy bộ đó với ghi chú "chưa thuộc môn học nào".
3. **Bất biến đăng ký:** có `EnVocabSubjectEnrollment(userId, subjectId)` thì luôn có `EnEnrollment(userId, setId)` cho mọi bộ `published` của môn. `syncSubjectEnrollments(tx, subjectId)` giữ bất biến bằng `createMany(..., skipDuplicates: true)`, gọi khi: học viên đăng ký môn; admin xuất bản một bộ có `subjectId` (cuối `publishEnglishSet`); admin thêm một bộ đã `published` vào môn.
4. Rời môn: xóa `EnVocabSubjectEnrollment` và mọi `EnEnrollment` của học viên cho các bộ **đang thuộc** môn. `EnWordState` giữ nguyên.
5. Gỡ bộ khỏi môn (admin): đặt `subjectId = null`, không xóa `EnEnrollment` của ai.
6. Xóa môn (admin): chỉ khi môn không còn bộ nào.
7. Gỡ một bộ lẻ (`DELETE /api/enroll`): bị chặn (400) khi bộ có `subjectId` **và** học viên đang đăng ký môn đó. Các trường hợp khác cho gỡ như cũ.
8. `POST /api/enroll` (tải từng bộ) bị **xóa**: không còn cách nào nhận một bộ ngoài đăng ký môn.
9. Mật khẩu và ẩn/hiện chỉ đặt ở cấp môn. Cột `EnSet.listed` / `EnSet.accessCode` không còn quyết định gì (giữ trong DB).

**Môn học Kiểm tra:**
1. Học viên thấy một môn khi `status = 'published'`, `listed = true` và môn có ít nhất một bài `published` có ít nhất một câu; hoặc khi đã đăng ký. Admin thấy mọi môn.
2. Đăng ký môn: như Từ vựng (mật khẩu so bằng `accessCodeMatches`, môn ẩn chặn người mới, người cũ vào lại không cần mật khẩu). Không có bước đồng bộ nào.
3. Chỉ học viên đã đăng ký (hoặc admin) mới bắt đầu, trả lời, nộp bài được.
4. Rời môn: chỉ xóa `EnTestSubjectEnrollment`. Lượt làm và kết quả cũ giữ nguyên và vẫn hiện ở trang Kết quả.
5. Xóa môn (admin): chỉ khi môn không còn bài kiểm tra nào. Xóa bài kiểm tra thì cascade xóa câu hỏi và mọi lượt làm.
6. Mỗi học viên có tối đa một lượt `in_progress` cho mỗi bài (`activeKey = "{userId}:{paperId}"`, như #75). Làm lại không giới hạn. Lưu điểm cao nhất (`pickBestAttempt`) và lần gần nhất. Đạt khi đúng từ 80%.
7. Thay đề (tải file mới cho bài đã có) thay toàn bộ câu hỏi. Lượt làm cũ giữ bản chụp câu hỏi nên không đổi.
8. Chấm điền từ: so sau `normalizeLearnerText` (`src/lib/english/text.ts`) với từng đáp án chấp nhận. Câu bỏ trống tính sai.

**Chế độ (Từ vựng / Kiểm tra):**
1. Chế độ suy ra từ đường dẫn: `/tests…` và `/admin/tests…` là Kiểm tra; mọi trang khác là Từ vựng.
2. `src/proxy.ts` ghi cookie `wq_mode` (`vocab` | `test`, `path: '/'`, `maxAge: 31536000`, `sameSite: 'lax'`, `httpOnly: true`) mỗi khi người đã đăng nhập mở một trang được bảo vệ hoặc trang `/admin…`.
3. Mở đúng `/` mà cookie là `test` và không có `?mode=` thì chuyển sang `/tests`. Nút "Từ vựng" trỏ tới `/?mode=vocab`: proxy ghi cookie `vocab` rồi chuyển về `/`. Nhờ vậy sau khi đăng nhập (NextAuth đưa về `/`) app mở đúng chế độ lần trước.

---

## 4. Changes per file

### PR A — Môn học Từ vựng, gỡ #74/#75 khỏi Từ vựng

**Schema & migration**
- `prisma/schema.prisma`:
  - Thêm model `EnVocabSubject` (cột giống hệt `EnCourse`: `id @default(cuid())`, `title`, `description @default("")`, `status EnContentStatus @default(draft)`, `listed Boolean @default(true)`, `accessCode String?`, `sortOrder Int @default(0)`, `createdAt @default(now())`, `updatedAt @updatedAt`; quan hệ `sets EnSet[]`, `enrollments EnVocabSubjectEnrollment[]`; `@@index([status, sortOrder])`).
  - Thêm model `EnVocabSubjectEnrollment` (`id`, `userId`, `subjectId`, `createdAt`; `subject EnVocabSubject @relation(fields: [subjectId], references: [id], onDelete: Cascade)`; `@@unique([userId, subjectId])`; `@@index([userId])`).
  - `EnSet`: thêm `subjectId String?`, `subject EnVocabSubject? @relation(fields: [subjectId], references: [id], onDelete: SetNull)`, `@@index([subjectId, sortOrder])`. Giữ nguyên `courseId`, `course`, `exams`.
  - Thêm dòng `/// Unused since docs/plans/en-vocab-test-split.md. Dropped only in the owner-approved step C.` ngay trên `model EnCourse`, `model EnCourseEnrollment`, `model EnExam`, `model EnExamQuestion`, `model EnExamAttempt`, `model EnExamAttemptItem`, và trên dòng `courseId String?` của `EnSet`. Không xóa model nào.
- `prisma/migrations/20261108000000_en_vocab_subject/migration.sql`: tạo folder bằng tay (không dùng `prisma migrate dev --name`, vì nó đặt tên theo ngày hôm nay). Nội dung đúng như mục 7.A. Sau đó chạy `npx prisma generate`, áp lên DB local bằng `npx prisma migrate dev`, rồi chạy `npx prisma migrate dev --create-only --name drift_check`: nếu Prisma sinh ra một folder mới thì SQL bằng tay đang lệch schema — xóa folder vừa sinh, sửa `migration.sql` cho khớp, chạy lại tới khi không sinh gì nữa.

**Hàm thuần dùng chung**
- Tạo `src/lib/accessCode.ts`: chuyển nguyên hàm `accessCodeMatches` từ `src/services/english/enCatalogService.ts` (dùng `createHash` / `timingSafeEqual` của `node:crypto` như hiện tại). Xóa hàm đó khỏi `enCatalogService.ts`.

**Services**
- Tạo `src/services/english/enVocabSubjectService.ts`: chép `src/services/english/enCourseService.ts` rồi sửa:
  - Đổi bảng: `enCourse` → `enVocabSubject`, `enCourseEnrollment` → `enVocabSubjectEnrollment`, `courseId` → `subjectId` (cả trong `$queryRaw`: `s."subjectId"`), `userId_courseId` → `userId_subjectId`.
  - Đổi tên: `CourseSummary` → `VocabSubjectSummary` (bỏ trường `exams`; đổi `lessons` → `sets`), `CourseLesson` → `VocabSubjectSet`, `CourseDetail` → `VocabSubjectDetail` (bỏ `exams`; đổi `lessons` → `sets`), `AdminCourse` → `AdminVocabSubject` (bỏ `examsList`; `lessonsList` → `setsList`), `AdminCoursesData` → `AdminVocabSubjectsData` (`courses` → `subjects`). Hàm: `syncCourseEnrollments` → `syncSubjectEnrollments`, `listCourses` → `listVocabSubjects`, `getCourseDetail` → `getVocabSubjectDetail`, `enrollCourse` → `enrollVocabSubject`, `leaveCourse` → `leaveVocabSubject`, `createCourse` → `createVocabSubject`, `updateCourse` → `updateVocabSubject`, `deleteCourse` → `deleteVocabSubject`, `addSetToCourse` → `addSetToSubject`, `removeSetFromCourse` → `removeSetFromSubject`, `moveLesson` → `moveSubjectSet`, `listAdminCourses` → `listAdminVocabSubjects`.
  - Bỏ hẳn: import `courseExamRows`, interface `CourseExamRow`, truy vấn `prisma.enExam` trong `listCourses`, `courseExamRows(...)` trong `getCourseDetail` và `listAdminCourses`, dòng `tx.enExam.updateMany` trong `removeSetFromCourse`.
  - Import `accessCodeMatches` từ `@/lib/accessCode`; vẫn import `listEnglishSets` từ `enCatalogService`.
  - Chuỗi lỗi: theo mục 5.
- Xóa `src/services/english/enCourseService.ts` và `src/services/english/enExamService.ts`.
- `src/services/english/enCatalogService.ts`:
  - `EnglishSetDetail`: đổi `courseId` → `subjectId`, `courseTitle` → `subjectTitle`; thêm `subjectEnrolled: boolean`.
  - Xóa `enrollEnglishSet` (quy tắc 8).
  - `unenrollEnglishSet`: đọc `{ subjectId }` của bộ; nếu `subjectId` khác null và có `EnVocabSubjectEnrollment` của `(userId, subjectId)` thì ném `AppError('Bộ này thuộc môn học bạn đã đăng ký. Hãy rời cả môn học.', 400)`; ngược lại xóa `EnEnrollment` như cũ.
  - `getEnglishSetDetail`: `include.course` → `include.subject: { select: { id, title, status, listed, accessCode, enrollments: { where: { userId }, select: { id: true } } } }`. Quy tắc cho người không phải admin và chưa có bộ: không có môn → 404; môn chưa `published` hoặc `listed = false` → 404. `previewOnly = !includeDrafts && !enrolled && set.subject?.accessCode != null`. `locked = set.subject ? set.subject.accessCode != null : false`. `listed = set.subject ? set.subject.listed : false` (bộ lẻ gỡ rồi không lấy lại được, nên `RemoveSetButton` hiện đúng cảnh báo). `subjectEnrolled = (set.subject?.enrollments.length ?? 0) > 0`.
- `src/services/english/enContentService.ts`: trong `publishEnglishSet` đổi dòng gọi `syncCourseEnrollments(tx, set.courseId!)` thành `syncSubjectEnrollments(tx, set.subjectId!)` với điều kiện `set.subjectId`; import từ `enVocabSubjectService`. Trong `listEnglishAdminSets`: `course: { select: { title: true } }` → `subject: { select: { title: true } }`, trả `subjectTitle` thay `courseTitle`.
- `src/lib/english/constants.ts`: xóa `EN_EXAM_PASS_PERCENT`, `EN_EXAM_MAX_QUESTIONS`, `EN_EXAM_MAX_OPTIONS`, `EN_EXAM_MAX_FILL_ANSWERS` (PR B thêm hằng mới).
- Xóa `src/lib/english/exam.ts` (PR B chép lại phần chấm điểm vào file mới).

**API**
- Xóa cả thư mục: `src/app/api/courses/`, `src/app/api/exams/`, `src/app/api/admin/courses/`, `src/app/api/admin/exams/`.
- Tạo `src/app/api/admin/subjects/route.ts`: chép `src/app/api/admin/courses/route.ts`, gọi `createVocabSubject`, lỗi Zod `'Dữ liệu môn học không hợp lệ'`.
- Tạo `src/app/api/admin/subjects/[subjectId]/route.ts`: chép `src/app/api/admin/courses/[courseId]/route.ts`; `context.params` lấy `subjectId`; gọi `updateVocabSubject`, `addSetToSubject`, `removeSetFromSubject`, `moveSubjectSet`, `deleteVocabSubject`; lỗi Zod `'Dữ liệu môn học không hợp lệ'`.
- Tạo `src/app/api/subjects/[subjectId]/enroll/route.ts`: chép `src/app/api/courses/[courseId]/enroll/route.ts`, gọi `enrollVocabSubject` / `leaveVocabSubject`.
- `src/app/api/enroll/route.ts`: xóa export `POST` và import `enrollEnglishSet`; giữ `DELETE`. Đổi `bodySchema` thành `z.object({ setId: z.string().min(1) }).strict()`.

**Trang**
- Xóa cả thư mục `src/app/(app)/courses/`.
- Tạo `src/app/(app)/subjects/[subjectId]/page.tsx` (chép `courses/[courseId]/page.tsx`, bỏ `searchParams` và `initialTab`, gọi `getVocabSubjectDetail`, render `<SubjectDetail detail isAdmin />`), `error.tsx` và `loading.tsx` (chép nguyên từ `courses/[courseId]/`).
- `src/app/(app)/store/page.tsx`: gọi `listVocabSubjects`, truyền `subjects` vào `Library`.
- `src/app/(app)/admin/page.tsx`: `listAdminCourses` → `listAdminVocabSubjects`, prop `courses` → `subjects`.

**Components**
- Xóa: `src/components/english/CourseDetail.tsx`, `src/components/english/EnglishAdminCourses.tsx`, `src/components/english/EnrollButton.tsx`, thư mục `src/components/english/exam/`. PR B lấy lại mọi file cũ cần chép bằng `git show c729009:<đường dẫn>` (ví dụ `git show c729009:src/components/english/exam/ExamRunner.tsx`).
- Đổi tên bằng `git mv` rồi sửa:
  - `CourseEnrollButton.tsx` → `SubjectEnrollButton.tsx`: props `{ enrollUrl: string; href: string; locked?: boolean }`; `fetch(enrollUrl, …)`; sau khi thành công `router.push(href)`. Copy theo mục 5. Dùng cho cả hai chế độ.
  - `CourseAdminControls.tsx` → `SubjectAdminControls.tsx`: props `{ apiUrl: string; title; status; listed; accessCode }`; `fetch(apiUrl, …)`. Copy theo mục 5. Dùng cho cả hai chế độ.
- Tạo `src/components/english/SubjectDetail.tsx` từ `CourseDetail.tsx`: bỏ `Tabs`, `examGroups`, `initialTab`, `changeTab` và toàn bộ phần bài kiểm tra; giữ header, `ProgressBar`, nút đăng ký, menu ⋯ rời môn và danh sách bộ (nội dung cũ của tab "words"). Link bộ vẫn là `/sets/${set.setId}`. API rời môn `/api/subjects/${detail.id}/enroll`. `SubjectEnrollButton enrollUrl={`/api/subjects/${detail.id}/enroll`} href={`/subjects/${detail.id}`}`.
- Tạo `src/components/english/EnglishAdminSubjects.tsx` từ `EnglishAdminCourses.tsx`: xóa `SAMPLE_EXAM` và `ExamAdminSection`; đổi API sang `/api/admin/subjects…`; dùng `AdminVocabSubjectsData`. Copy theo mục 5.
- `src/components/english/Library.tsx`: prop `courses: CourseSummary[]` → `subjects: VocabSubjectSummary[]`; link thẻ `/subjects/${id}`; `SubjectEnrollButton enrollUrl={`/api/subjects/${id}/enroll`} href={`/subjects/${id}`}`; `SubjectAdminControls apiUrl={`/api/admin/subjects/${id}`}`; bỏ phần `exams` trong dòng số liệu. Copy theo mục 5.
- `src/components/english/SetDetail.tsx`:
  - Link quay lại: `detail.subjectId ? `/subjects/${detail.subjectId}`` (nhãn `detail.subjectTitle`) `: detail.enrolled ? '/review'` (nhãn `Ôn theo bộ`) `: '/store'` (nhãn `Cửa hàng`).
  - Menu ⋯ (gỡ bộ) hiện khi `detail.enrolled && !detail.subjectEnrolled`.
  - Nhánh chưa có bộ: `draft` giữ nguyên; `detail.subjectId` → `<Link href={`/subjects/${detail.subjectId}`}>Xem môn học →</Link>`; còn lại (chỉ admin tới được) → `<p className="text-sm text-muted">` với copy mục 5. Bỏ import `EnrollButton`.
  - Hộp `previewOnly`: bỏ nhánh "Nhập mật khẩu để tải cả bộ.", luôn dùng copy mục 5.
- `src/components/english/EnglishAdmin.tsx`: prop `courses: AdminCoursesData` → `subjects: AdminVocabSubjectsData`; panel `'courses'` → `'subjects'`; render `<EnglishAdminSubjects data={subjects} />`; `SetRow.courseTitle` → `subjectTitle`; copy dòng bộ và nút theo mục 5.
- Chỉ đổi copy (mục 5): `OnboardingTour.tsx`, `ReviewOverview.tsx`, `goals/QuestNote.tsx`, `home/TodayHero.tsx`.
- `src/components/english/EnglishShell.tsx`: regex `focus` bỏ nhánh `|^\/courses\/[^/]+\/exams\/[^/]+$`.

**Điều hướng & proxy**
- `src/config/navigation.ts`: mục `/store` đổi `label` / `shortLabel` thành `Cửa hàng`; trong `isNavActive` đổi `'/courses/'` → `'/subjects/'`.
- `src/proxy.ts`: trong `protectedPaths` đổi `'/courses'` → `'/subjects'`. Thêm ngay trước khối `protectedPaths`: nếu `pathname === '/courses' || pathname.startsWith('/courses/')` thì `NextResponse.redirect(new URL('/store', req.url))` (link cũ không ra 404).

**Tests (chi tiết ở mục 8)**
- Xóa: `src/lib/__tests__/enCourseService.test.ts`, `enExamService.test.ts`, `exam.test.ts`, `src/lib/__dbtests__/course.dbtest.ts`, `exam.dbtest.ts`.
- Tạo: `src/lib/__tests__/enVocabSubjectService.test.ts`, `src/lib/__tests__/accessCode.test.ts`, `src/lib/__dbtests__/vocabSubject.dbtest.ts`.
- Sửa: `enCatalogEnroll.test.ts`, `enCatalogStoreAccess.test.ts`, `enPublishFlow.test.ts`, `src/lib/__dbtests__/setup.ts` (`resetEnTables` xóa thêm `EnVocabSubjectEnrollment`, đặt `EnSet.subjectId = null` trước khi xóa `EnSet`, xóa `EnVocabSubject`; theo đúng cách hàm đang xóa các bảng khác).

### PR B — Chế độ Kiểm tra

**Schema & migration**
- `prisma/schema.prisma`: thêm sáu model (đặt sau `EnVocabSubjectEnrollment`):
  - `EnTestSubject`: cột như `EnVocabSubject`; quan hệ `papers EnTestPaper[]`, `enrollments EnTestSubjectEnrollment[]`; `@@index([status, sortOrder])`.
  - `EnTestSubjectEnrollment`: như `EnVocabSubjectEnrollment` nhưng trỏ `EnTestSubject`; `@@unique([userId, subjectId])`, `@@index([userId])`.
  - `EnTestPaper`: `id`, `subjectId`, `title`, `description @default("")`, `status EnContentStatus @default(draft)`, `sortOrder Int @default(0)`, `createdAt`, `updatedAt`; `subject` Cascade; `questions EnTestPaperQuestion[]`, `attempts EnTestPaperAttempt[]`; `@@index([subjectId, status, sortOrder])`.
  - `EnTestPaperQuestion`: cột như `EnExamQuestion` (`paperId` thay `examId`); `@@unique([paperId, position])`.
  - `EnTestPaperAttempt`: cột như `EnExamAttempt` (`paperId` thay `examId`; `/// "{userId}:{paperId}" while in progress, null once finished.` trên `activeKey`); `@@index([userId, paperId, status])`, `@@index([userId, finishedAt])`.
  - `EnTestPaperAttemptItem`: cột như `EnExamAttemptItem` (`attemptId` trỏ `EnTestPaperAttempt`); `@@unique([attemptId, position])`.
  - Không model nào có quan hệ tới `EnSet`, `EnVocabSubject`, `EnCourse` hay `EnExam*`.
- `prisma/migrations/20261109000000_en_test_mode/migration.sql`: đúng mục 7.B; kiểm tra lệch schema như PR A.

**Hàm thuần**
- `src/lib/english/constants.ts`: thêm `EN_TEST_PASS_PERCENT = 80`, `EN_TEST_MAX_QUESTIONS = 100`, `EN_TEST_MAX_OPTIONS = 6`, `EN_TEST_MAX_FILL_ANSWERS = 10`, `EN_TEST_MAX_FILE_BYTES = 1_000_000`.
- Tạo `src/lib/english/testPaper.ts`: chép từ `src/lib/english/exam.ts` của commit `c729009` đúng các phần sau và đổi tên: `ExamQuestionInput` → `TestQuestionInput`, `gradeExamAnswer` → `gradeTestAnswer`, `isExamPassed` → `isTestPassed` (dùng `EN_TEST_PASS_PERCENT`), `examPercent` → `testPercent`, `pickBestAttempt` giữ tên. Thêm `formatVnDay(dayKey: string): string` trả `DD/MM/YYYY` từ `YYYY-MM-DD` bằng `split('-')`. Không chép `parseExamText` / `examToText`.
- Tạo `src/lib/english/testImport.ts` (thuần, không import exceljs):
  - `export const TEST_SHEET_NAME = 'Câu hỏi';`
  - `export const TEST_COLUMNS = ['Loại', 'Câu hỏi', 'A', 'B', 'C', 'D', 'E', 'F', 'Đáp án đúng', 'Giải thích'] as const;`
  - `export interface TestImportIssue { row: number; message: string }` (`row = 0` là lỗi của cả file).
  - `export function parseTestRows(rows: string[][]): { questions: TestQuestionInput[]; issues: TestImportIssue[] }`: `rows[0]` là dòng 1 của Excel. Quy tắc ở mục 7.C.
  - `export function testRowsOf(questions: TestQuestionInput[]): string[][]`: ngược lại của `parseTestRows` (dòng tiêu đề + mỗi câu một dòng; `mcq` ghi `Trắc nghiệm`, chữ cái đáp án; `fill` ghi `Điền từ`, đáp án nối bằng ` | `).
- Tạo `src/lib/appMode.ts`:
  ```ts
  export type AppMode = 'vocab' | 'test';
  export const APP_MODE_COOKIE = 'wq_mode';
  export function modeOfPath(pathname: string): AppMode { return /^\/(admin\/)?tests(\/|$)/.test(pathname) ? 'test' : 'vocab'; }
  /** Where `/` should send the visitor, or null to stay. */
  export function modeRedirect(pathname: string, modeParam: string | null, cookie: string | undefined): string | null {
    if (pathname !== '/') return null;
    if (modeParam === 'vocab') return '/';
    if (modeParam === null && cookie === 'test') return '/tests';
    return null;
  }
  ```

**Services** (không import gì từ `enVocabSubjectService`, `enCatalogService`, `enContentService`, `enGoalService`, `enDailyService`)
- Tạo `src/services/english/enTestWorkbookService.ts` (chỉ đọc/ghi file, dùng `exceljs` 4.4.0 đã có trong `package.json`):
  - `readTestWorkbook(data: ArrayBuffer): Promise<string[][]>`: `new ExcelJS.Workbook().xlsx.load(data)`; lấy worksheet tên `TEST_SHEET_NAME`; không có thì ném `AppError('Không thấy trang tính “Câu hỏi” trong file.', 400)`; file hỏng thì ném `AppError('Không đọc được file Excel.', 400)`. Trả mọi dòng từ 1 tới `worksheet.actualRowCount`, mỗi dòng đúng 10 ô (cột 1–10), giá trị ô là `cell.text.trim()`.
  - `buildTestWorkbook(questions: TestQuestionInput[]): Promise<Buffer>`: sheet `Câu hỏi` gồm `testRowsOf(questions)`, dòng 1 in đậm, cố định dòng 1 (`views: [{ state: 'frozen', ySplit: 1 }]`), độ rộng cột: Loại 14, Câu hỏi 60, A–F 18, Đáp án đúng 18, Giải thích 40; ô A2:A101 có data validation dạng list `"Trắc nghiệm,Điền từ"`. Sheet thứ hai `Hướng dẫn` gồm đúng các dòng ở mục 5 ("File mẫu").
- Tạo `src/services/english/enTestSubjectService.ts` theo khuôn `enVocabSubjectService.ts`, nhưng trên `enTestSubject` / `enTestSubjectEnrollment`:
  - Types: `TestSubjectSummary { id; title; description; status; listed; locked; enrolled; papers: number; accessCode?; learners? }`, `TestPaperRow { id; title; description?: string; status; questionCount; inProgress: boolean; best: { score; total; passed } | null; attempts: number }` (`description` chỉ có khi `isAdmin`), `TestSubjectDetail extends Omit<TestSubjectSummary, 'papers'> { papers: TestPaperRow[] }`, `AdminTestSubject extends TestSubjectSummary { papersList: TestPaperRow[] }`.
  - `listTestSubjects(userId, isAdmin)`: điều kiện thấy theo quy tắc Kiểm tra 1 (`papers: { some: { status: 'published', questions: { some: {} } } }`); `papers` = số bài `published` có câu hỏi.
  - `getTestSubjectDetail(userId, subjectId, isAdmin)`: 404 `'Không tìm thấy môn học'` theo cùng điều kiện; `papers` qua `testPaperRows`.
  - `testPaperRows(userId, subjectId, isAdmin)`: chép `courseExamRows` của `c729009` (bỏ phần `set` / `lessonNumber` / sắp xếp theo bài; sắp `sortOrder asc, title asc`).
  - `enrollTestSubject`, `leaveTestSubject` (chỉ xóa `EnTestSubjectEnrollment`), `createTestSubject`, `updateTestSubject`, `deleteTestSubject` (đếm `enTestPaper`, còn thì ném lỗi), `listAdminTestSubjects()` (mọi môn + `papersList` của admin với `userId = ''`).
- Tạo `src/services/english/enTestService.ts`: chép `src/services/english/enExamService.ts` của `c729009` rồi:
  - Đổi bảng `enExam*` → `enTestPaper*`, `examId` → `paperId`, `courseId` → `subjectId`, `course` → `subject`; đổi tên hàm `startExam` → `startTestPaper`, `answerExam` → `answerTestPaper`, `finishExam` → `finishTestPaper`, `getExamForLearner` → `getTestPaperForLearner`, `setExamStatus` → `setTestPaperStatus`, `deleteExam` → `deleteTestPaper`; types `PublicAttempt` → `PublicTestAttempt`, `ExamResult` → `TestResult` (trường `paperId`, `subjectId` thay `examId`, `courseId`).
  - Bỏ `previewExam`, `saveExam`, `getExamForAdmin`, `courseExamRows`, mọi chỗ dính `setId` / `set` / `lessonTitle`.
  - `accessiblePaper`: 404 khi không phải admin và (bài không `published` hoặc 0 câu hoặc môn không `published`); 403 `'Hãy đăng ký môn học để làm bài kiểm tra.'` khi không phải admin và chưa đăng ký môn.
  - Thêm `previewTestImport(data: ArrayBuffer)` = `parseTestRows(await readTestWorkbook(data))`.
  - Thêm `saveTestPaper(input: { subjectId; title; description; data: ArrayBuffer; publish: boolean; paperId?: string })`: parse; còn issue thì ném `AppError('File còn lỗi, hãy sửa rồi tải lên lại.', 400)`; trong một `prisma.$transaction`: kiểm môn tồn tại (404 `'Không tìm thấy môn học'`); có `paperId` thì `findFirst({ id: paperId, subjectId })` (404 `'Không tìm thấy bài kiểm tra'`), cập nhật tiêu đề/mô tả (+ `status: 'published'` nếu `publish`), `deleteMany` câu cũ; không có thì tạo bài với `sortOrder = last + 1`, `status` theo `publish`; rồi `createMany` câu hỏi (khuôn `saveExam` của `c729009`).
  - Thêm `exportTestPaper(paperId): Promise<{ fileName: string; data: Buffer }>`: đọc câu theo `position`, `buildTestWorkbook(questions)`, `fileName = 'bai-kiem-tra.xlsx'`.
  - `getTestPaperForLearner` trả `{ paper: { id, title, description, subjectId, subjectTitle, questionCount }, attempt, best, lastFinished: { attemptId, score, total, passed, day } | null }` với `day = formatVnDay(vnDayKey(finishedAt))`.
  - Thêm `listMyTestResults(userId): Promise<Array<{ attemptId; paperTitle; subjectTitle; score; total; percent; passed; day }>>`: lượt `finished` của `userId`, `orderBy: { finishedAt: 'desc' }`, `take: 100`.
  - Thêm `paperSubjectId(paperId): Promise<string | null>` = `(await prisma.enTestPaper.findUnique({ where: { id: paperId }, select: { subjectId: true } }))?.subjectId ?? null`.
  - Thêm `getTestResult(userId, attemptId): Promise<TestResult & { paperTitle: string; subjectTitle: string; day: string }>`: `findFirst({ id: attemptId, userId, status: 'finished' })`, không có thì 404 `'Không tìm thấy lượt làm bài'`; dùng `resultOf`.

**API**
- `src/app/api/tests/subjects/[subjectId]/enroll/route.ts`: khuôn `src/app/api/subjects/[subjectId]/enroll/route.ts` (PR A), gọi `enrollTestSubject` / `leaveTestSubject`.
- `src/app/api/tests/papers/[paperId]/route.ts`: khuôn `src/app/api/exams/[examId]/route.ts` của `c729009`, cùng schema `start` / `answer` / `finish`.
- `src/app/api/admin/tests/subjects/route.ts` và `src/app/api/admin/tests/subjects/[subjectId]/route.ts`: khuôn các route môn Từ vựng; schema PATCH chỉ có `action: 'update'` (không có `addSet` / `removeSet` / `move`); lỗi Zod `'Dữ liệu môn học không hợp lệ'`.
- `src/app/api/admin/tests/import/route.ts` (`POST`, multipart, khuôn `src/app/api/profile/avatar/route.ts`): schema ở mục 7; kiểm `file.name.toLowerCase().endsWith('.xlsx') && file.size <= EN_TEST_MAX_FILE_BYTES`, sai thì `apiError('File phải là .xlsx, tối đa 1 MB.', 400)`; `preview` → `apiSuccess(await previewTestImport(await file.arrayBuffer()))`; `save` → `apiSuccess(await saveTestPaper(...))`.
- `src/app/api/admin/tests/template/route.ts` (`GET`): `buildTestWorkbook([])`, trả `new NextResponse(data, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="mau-bai-kiem-tra.xlsx"' } })`.
- `src/app/api/admin/tests/papers/[paperId]/route.ts`: `GET` trả file của `exportTestPaper` (header như trên, `filename="bai-kiem-tra.xlsx"`); `PATCH` `{ status }` gọi `setTestPaperStatus`; `DELETE` gọi `deleteTestPaper`.

**Trang** (tất cả `export const dynamic = 'force-dynamic'`, `await auth()`, không có user thì `redirect('/login')`, khuôn `src/app/(app)/store/page.tsx`)
- `src/app/(app)/tests/page.tsx` → `<TestLibrary subjects isAdmin />`.
- `src/app/(app)/tests/subjects/[subjectId]/page.tsx` → `<TestSubjectDetail detail isAdmin />`; 404 → `notFound()`. Kèm `error.tsx`, `loading.tsx` (chép từ `subjects/[subjectId]/`).
- `src/app/(app)/tests/papers/[paperId]/page.tsx` → `<TestRunner initial />`; 404 → `notFound()`; 403 → `const subjectId = await paperSubjectId(paperId)` rồi `redirect(subjectId ? `/tests/subjects/${subjectId}` : '/tests')`. Kèm `error.tsx`, `loading.tsx`. (Khuôn: `src/app/(app)/courses/[courseId]/exams/[examId]/page.tsx` của `c729009`.)
- `src/app/(app)/tests/results/page.tsx` → `<TestResults rows />`.
- `src/app/(app)/tests/results/[attemptId]/page.tsx` → `<TestResultView result />` bọc trong `<div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">`; 404 → `notFound()`.
- `src/app/(app)/admin/tests/page.tsx`: khuôn `src/app/(app)/admin/page.tsx` (không phải admin thì `redirect('/tests')`), gọi `listAdminTestSubjects()`, render `<TestAdmin subjects />`.

**Components** (thư mục mới `src/components/english/tests/`)
- `TestLibrary.tsx`: khuôn `Library.tsx` (PR A); link thẻ `/tests/subjects/${id}`; `SubjectEnrollButton enrollUrl={`/api/tests/subjects/${id}/enroll`} href={`/tests/subjects/${id}`}`; không có `SubjectAdminControls` trên thẻ (admin chỉnh ở `/admin/tests`); nút admin "+ Thêm môn học" trỏ `/admin/tests`.
- `TestSubjectDetail.tsx`: khuôn `SubjectDetail.tsx`; thay danh sách bộ bằng danh sách bài (khuôn phần `TabsContent value="exams"` của `CourseDetail.tsx` ở `c729009`, bỏ nhóm theo bài); không có `ProgressBar`; API rời môn `/api/tests/subjects/${id}/enroll`; link làm bài `/tests/papers/${paper.id}`.
- `TestRunner.tsx`: chép `src/components/english/exam/ExamRunner.tsx` của `c729009`; API `/api/tests/papers/${initial.paper.id}`; `courseUrl` → `subjectUrl = `/tests/subjects/${initial.paper.subjectId}``; phần intro dòng nhỏ trên tiêu đề là `initial.paper.subjectTitle`; thêm link "Xem lại bài làm" tới `/tests/results/${initial.lastFinished.attemptId}` khi có `lastFinished`; phần `stage === 'result'` thay bằng `<TestResultView result={result} />` cộng hàng nút "Làm lại" / "Về môn học"; dùng hằng `EN_TEST_PASS_PERCENT` cho chữ "80%".
- `TestResultView.tsx`: phần hiển thị kết quả cắt ra từ `ExamRunner` (điểm, %, chip Đạt/Chưa đạt, nút lọc câu sai, danh sách câu). Props `{ result: TestResult }`. Giữ state `wrongOnly` bên trong.
- `TestResults.tsx`: danh sách `<li className="word-row">` mỗi lượt: tiêu đề bài, dòng phụ `${subjectTitle} · ${day}`, bên phải `${score}/${total} · ${percent}%` và chip Đạt/Chưa đạt (class như chip trong `ExamRunner`), cả hàng là `<Link href={`/tests/results/${attemptId}`}>`. Trống thì `EmptyState`.
- `TestAdmin.tsx`: khuôn `EnglishAdminSubjects.tsx` + phần `ExamAdminSection` của `EnglishAdminCourses.tsx` (`c729009`), thay `textarea` bằng `<input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet">`; state `file: File | null`; đổi file thì xóa `preview`; "Xem trước" và "Lưu…" gửi `FormData` (`action`, `file`, `subjectId`, `title`, `description`, `publish`, `paperId`) tới `/api/admin/tests/import`; nút lưu chỉ bật khi `preview` của đúng file hiện tại có `issues.length === 0`, `questions.length > 0` và `title.trim()`; mỗi thẻ môn có `SubjectAdminControls apiUrl={`/api/admin/tests/subjects/${id}`}`; "Thay đề" mở form với `paperId` và tiêu đề/mô tả cũ (lấy từ `papersList`); "Tải về" là `<a href={`/api/admin/tests/papers/${id}`} download>`; link "Tải file mẫu" là `<a href="/api/admin/tests/template" download>`.

**Chế độ & điều hướng**
- `src/config/navigation.ts`: thêm `TEST_NAV: NavLink[] = [{ href: '/tests', label: 'Môn học', icon: 'auto_stories', shortLabel: 'Môn học' }, { href: '/tests/results', label: 'Kết quả', icon: 'flag', shortLabel: 'Kết quả' }]` và `TEST_ADMIN_NAV: NavLink[] = [{ href: '/admin/tests', label: 'Bài kiểm tra', icon: 'edit_note', shortLabel: 'Bài kiểm tra' }]`. Trong `isNavActive` thêm, trước dòng `/admin`: `if (href === '/tests') return pathname === '/tests' || pathname.startsWith('/tests/subjects/');` và `if (href === '/admin/tests') return pathname === '/admin/tests';`.
- Tạo `src/components/english/ModeSwitch.tsx` (client): `const mode = modeOfPath(usePathname())`; `<div role="group" aria-label="Chế độ" className="inline-flex rounded-full border border-border bg-surface p-0.5">` chứa hai `<Link>`: "Từ vựng" (`href="/?mode=vocab"`) và "Kiểm tra" (`href="/tests"`); link đang chọn có `aria-current="page"` và class `bg-accent-subtle text-accent`, link kia `text-muted`; cả hai `inline-flex min-h-9 items-center rounded-full px-3 text-xs font-bold whitespace-nowrap`.
- `src/components/english/EnglishShell.tsx`:
  - `const mode = modeOfPath(pathname)`; `nav = mode === 'test' ? TEST_NAV : ENGLISH_NAV`; `adminNav = mode === 'test' ? TEST_ADMIN_NAV : ENGLISH_ADMIN_NAV`.
  - `focus` regex: `/\/sets\/[^/]+\/(practice|test)$|^\/tests\/papers\/[^/]+$/`.
  - Sidebar: thêm `<div className="px-5 pt-4"><ModeSwitch /></div>` ngay dưới khối thương hiệu.
  - Ẩn khi `mode === 'test'`: thẻ XP cuối sidebar (`Link href="/progress"` có `GoalRing`), khối XP ở header điện thoại, `<RewardCenter />`, `<OnboardingTour />`.
  - Header điện thoại: thay `<Link href="/" className="brand-wordmark …">…</Link>` bằng `<ModeSwitch />`.
  - Thanh dưới điện thoại và danh sách sidebar dùng `nav`; phần admin dùng `adminNav`.
  - Truyền `adminHref={mode === 'test' ? '/admin/tests' : '/admin'}` cho cả hai `AccountMenu`.
- `src/components/english/AccountMenu.tsx`: thêm prop `adminHref: string`, link "Quản trị" dùng `adminHref`.
- `src/proxy.ts`: thêm `'/tests'` vào `protectedPaths`. Sau khối chặn người chưa đăng nhập, khi `req.auth?.user` và (`isProtected` hoặc `pathname.startsWith('/admin')`): `const target = modeRedirect(pathname, req.nextUrl.searchParams.get('mode'), req.cookies.get(APP_MODE_COOKIE)?.value)`; `const response = target ? NextResponse.redirect(new URL(target, req.url)) : NextResponse.next()`; `response.cookies.set(APP_MODE_COOKIE, modeOfPath(target ?? pathname), { path: '/', maxAge: 31536000, sameSite: 'lax', httpOnly: true })`; `return response`.

**Tests (chi tiết ở mục 8)**
- Tạo: `src/lib/__tests__/testImport.test.ts`, `testPaper.test.ts`, `appMode.test.ts`, `enTestWorkbookService.test.ts`, `enTestService.test.ts`, `enTestSubjectService.test.ts`, `src/lib/__dbtests__/testPaper.dbtest.ts`.
- Sửa `src/lib/__dbtests__/setup.ts`: `resetEnTables` xóa thêm `EnTestPaperAttemptItem`, `EnTestPaperAttempt`, `EnTestPaperQuestion`, `EnTestPaper`, `EnTestSubjectEnrollment`, `EnTestSubject` theo thứ tự đó.

---

## 5. Exact copy

Chuỗi cũ bị thay ghi ở cột trái; "(mới)" là chuỗi chưa có.

### PR A — Từ vựng

| File / chỗ | Cũ | Mới |
|---|---|---|
| `navigation.ts` mục `/store` | `Khóa học` | `Cửa hàng` |
| `Library.tsx` h1 | `Khóa học` | `Cửa hàng` |
| `Library.tsx` phụ đề học viên | `Chọn khóa học phù hợp với bạn.` | `Chọn môn học phù hợp với bạn.` |
| `Library.tsx` phụ đề admin | `Khóa nháp và khóa ẩn cũng hiện với quyền quản trị.` | `Môn nháp và môn ẩn cũng hiện với quyền quản trị.` |
| `Library.tsx` nút admin | `+ Thêm khóa học` | `+ Thêm môn học` |
| `Library.tsx` ô tìm (placeholder + aria) | `Tìm khóa học…` | `Tìm môn học…` |
| `Library.tsx` nhóm | `Khóa của bạn` / `Khám phá` | `Môn của bạn` / `Khám phá` |
| `Library.tsx` số liệu | `{lessons} bài · {words} từ{ · n bài kiểm tra}` | `{sets} bộ · {words} từ`; khi `sets === 0` (chỉ admin thấy): `Chưa có bộ từ` |
| `Library.tsx` link | `Vào học →` / `Xem khóa học →` | `Vào học →` / `Xem môn học →` |
| `Library.tsx` trống | `Chưa có khóa học` / `Các khóa học sẽ xuất hiện khi được xuất bản.` | `Chưa có môn học` / `Các môn học sẽ xuất hiện khi được xuất bản.` |
| `Library.tsx` không khớp | `Không tìm thấy khóa học phù hợp` | `Không tìm thấy môn học phù hợp` |
| Giữ nguyên | `Cần mật khẩu`, `Đã đăng ký ✓`, `Bản nháp`, `Thử từ khóa khác.` | — |
| `SubjectEnrollButton` aria ô mật khẩu | `Mật khẩu khóa học` | `Mật khẩu môn học` |
| `SubjectEnrollButton` lỗi mặc định | `Không đăng ký được khóa học` | `Không đăng ký được môn học` |
| Giữ nguyên | `Đăng ký`, `Nhập mật khẩu`, `Mở khoá`, `Huỷ`, `Đã đăng ký` | — |
| `SubjectAdminControls` | `Ẩn khóa` / `Xuất bản` | `Ẩn môn` / `Xuất bản` |
| `SubjectAdminControls` | `Ẩn khỏi cửa hàng` / `Hiện lại` | `Ẩn khỏi danh sách` / `Hiện lại` |
| `SubjectAdminControls` lỗi mặc định | `Không cập nhật được khóa học` | `Không cập nhật được môn học` |
| Giữ nguyên | `Mật khẩu`, `Lưu`, `Xóa`, `Xóa “{title}”?`, `Huỷ` | — |
| `SubjectDetail` link quay lại | `← Khóa học` | `← Cửa hàng` |
| `SubjectDetail` số liệu | `{learned}/{words} từ đã học · {longTerm} nhớ lâu` / `Khóa chưa có bài nào.` | giữ dòng số liệu / `Môn chưa có bộ từ nào.` |
| `SubjectDetail` aria menu | `Tùy chọn khóa học` | `Tùy chọn môn học` |
| `SubjectDetail` menu | `Rời khóa học` | `Rời môn học` |
| `SubjectDetail` hàng bộ | `Bài {n} · {title}` | `{n}. {title}` |
| `SubjectDetail` danh sách trống | `Khóa này chưa có bài nào.` | `Môn này chưa có bộ từ nào.` |
| `SubjectDetail` dialog | `Rời khóa học?` / `Các bài của khóa sẽ rời khỏi lịch ôn. Tiến độ từ đã học vẫn được giữ nếu bạn đăng ký lại.` / `Ở lại` / `Rời khóa` | `Rời môn học?` / `Các bộ từ của môn sẽ rời khỏi lịch ôn. Tiến độ từ đã học vẫn được giữ nếu bạn đăng ký lại.` / `Ở lại` / `Rời môn` |
| `SubjectDetail` lỗi rời | `Không rời được khóa học` | `Không rời được môn học` |
| Bị xóa cùng tab Kiểm tra | `Từ vựng`, `Kiểm tra` (tab), `Đăng ký khóa học để làm bài kiểm tra.`, `Khóa này chưa có bài kiểm tra.`, `Ôn tổng hợp`, `Đang làm`, `Đạt · …`, `Cao nhất …`, `Làm tiếp`, `Làm lại`, `Làm bài` | — |
| `SetDetail` quay lại khi chưa có bộ, không có môn | `Thư viện` | `Cửa hàng` |
| `SetDetail` nút | `Xem khóa học →` | `Xem môn học →` |
| `SetDetail` bộ lẻ (admin) | (mới) | `Bộ này chưa thuộc môn học nào nên học viên chưa thấy.` |
| `SetDetail` hộp xem mẫu | `Đang xem {x}/{y} từ mẫu. Đăng ký khóa học để xem cả bài.` / `… Nhập mật khẩu để tải cả bộ.` | `Đang xem {x}/{y} từ mẫu. Đăng ký môn học để xem cả bộ.` |
| `EnglishAdmin` tab | `Khóa học` | `Môn học` |
| `EnglishAdmin` dòng bộ | `Khóa: {title}` / `Chưa xếp khóa` | `Môn: {title}` / `Chưa xếp môn` |
| `EnglishAdmin` nút | `Quản lý khóa học` | `Quản lý môn học` |
| `EnglishAdminSubjects` | `Tạo khóa học` (tiêu đề + nút) / `Tên khóa học` / `Đã tạo khóa học.` | `Tạo môn học` / `Tên môn học` / `Đã tạo môn học.` |
| `EnglishAdminSubjects` số liệu | `{n} bài · {learners} học viên` | `{n} bộ` (ẩn khi 0) `· {learners} học viên` (ẩn khi 0); cả dòng ẩn khi cả hai bằng 0 |
| `EnglishAdminSubjects` hàng | `Bài {i} · {title} · Bản nháp` | `{i}. {title} · Bản nháp` |
| `EnglishAdminSubjects` trống | `Chưa có bài. Thêm bài từ danh sách bên dưới.` | `Chưa có bộ. Thêm bộ từ danh sách bên dưới.` |
| `EnglishAdminSubjects` chọn | aria `Chọn bài để thêm`, `Chọn bài chưa xếp khóa…`, nút `Thêm bài` | aria `Chọn bộ để thêm`, `Chọn bộ chưa xếp môn…`, nút `Thêm bộ` |
| `EnglishAdminSubjects` lỗi mặc định | `Không cập nhật được khóa học` | `Không cập nhật được môn học` |
| `EnglishAdminSubjects` khi chưa có môn | (mới) | `Chưa có môn học. Tạo môn đầu tiên ở trên.` |
| Giữ nguyên | `Mô tả`, `Bản nháp`, `Tạm dừng`, `Đã xuất bản`, `Đưa {title} lên/xuống`, `↑`, `↓`, `Gỡ` | — |
| `OnboardingTour` | `Chọn một khóa học để bắt đầu hành trình của bạn.` / `Xem các khóa học →` | `Chọn một môn học để bắt đầu hành trình của bạn.` / `Xem các môn học →` |
| `ReviewOverview` | `Chọn khóa học →` / `+ Thêm khóa học` | `Chọn môn học →` / `+ Thêm môn học` |
| `QuestNote` | `Chọn khóa học để mở nhiệm vụ →` | `Chọn môn học để mở nhiệm vụ →` |
| `TodayHero` | `Chọn khóa học →` | `Chọn môn học →` |
| Lỗi service Từ vựng | `Không tìm thấy khóa học` / `Khóa học chưa xuất bản` / `Khóa học không còn mở đăng ký` / `Hãy gỡ hết bài khỏi khóa trước khi xóa.` / `Bài này đang thuộc khóa khác. Hãy gỡ khỏi khóa đó trước.` | `Không tìm thấy môn học` / `Môn học chưa xuất bản` / `Môn học không còn mở đăng ký` / `Hãy gỡ hết bộ từ khỏi môn trước khi xóa.` / `Bộ này đang thuộc môn khác. Hãy gỡ khỏi môn đó trước.` |
| Lỗi Zod route môn | `Dữ liệu khóa học không hợp lệ` | `Dữ liệu môn học không hợp lệ` |
| `unenrollEnglishSet` | `Bài này thuộc một khóa học. Hãy rời cả khóa học.` | `Bộ này thuộc môn học bạn đã đăng ký. Hãy rời cả môn học.` |
| Bị xóa | `Hãy đăng ký cả khóa học chứa bài này.` (cùng `enrollEnglishSet`) | — |
| Giữ nguyên | `Mật khẩu không đúng`, `Không tìm thấy bộ học`, `Thiếu bộ học` | — |

Trong `TodayHero`, giữ nguyên `Chọn bộ từ đầu tiên` và `Tải một bộ, app sẽ lên lịch ôn cho từng từ.`

### PR B — Kiểm tra

**Chuyển chế độ & điều hướng:** `Chế độ` (aria nhóm), `Từ vựng`, `Kiểm tra`, `Môn học`, `Kết quả`, `Bài kiểm tra` (nav admin).

**`TestLibrary`:** h1 `Môn học`; phụ đề học viên `Chọn môn học để làm bài kiểm tra.`; phụ đề admin `Môn nháp và môn ẩn cũng hiện với quyền quản trị.`; nút admin `+ Thêm môn học`; ô tìm `Tìm môn học…`; nhóm `Môn của bạn` / `Khám phá`; số liệu `{papers} bài kiểm tra`, khi `papers === 0` (chỉ admin): `Chưa có bài kiểm tra`; `Cần mật khẩu`; link `Vào làm bài →` (đã đăng ký) / `Xem môn học →`; `Đã đăng ký ✓`; `Bản nháp`; trống `Chưa có môn học` / `Các môn học sẽ xuất hiện khi được xuất bản.`; không khớp `Không tìm thấy môn học phù hợp` / `Thử từ khóa khác.`

**`TestSubjectDetail`:** quay lại `← Môn học`; dòng số liệu `{n} bài kiểm tra` (ẩn khi 0); `Tùy chọn môn học`; `Rời môn học`; khi chưa đăng ký và không phải admin, trên danh sách: `Đăng ký môn học để làm bài kiểm tra.`; hàng bài: `{questionCount} câu`, admin thêm ` · Bản nháp`; chip `Đang làm` / `Đạt · {score}/{total}` / `Cao nhất {score}/{total}`; nút `Làm tiếp` / `Làm lại` / `Làm bài`; trống `Môn này chưa có bài kiểm tra.`; dialog `Rời môn học?` / `Bạn sẽ không làm bài được nữa cho tới khi đăng ký lại. Kết quả cũ vẫn được giữ.` / `Ở lại` / `Rời môn`; lỗi `Không rời được môn học`.

**`TestRunner`:** giữ nguyên mọi chuỗi của `ExamRunner` (`c729009`): `{n} câu · Đạt khi đúng từ 80%`, `Lần gần nhất: …`, `Cao nhất: …`, `Làm tiếp`, `Bắt đầu`, `Bạn sẽ biết đáp án sau khi nộp bài.`, `Thoát bài kiểm tra`, `Câu {i}/{n}`, `{a}/{n} đã làm`, `Nhập đáp án`, `Đáp án câu {i}`, `← Câu trước`, `Câu tiếp →`, `Nộp bài`, `Danh sách câu`, `Còn {k} câu chưa làm`, `Câu chưa làm sẽ tính là sai.`, `Thoát bài kiểm tra?`, `Câu trả lời đã được lưu. Lần sau bạn có thể làm tiếp.`, `Thoát`, `Làm lại`, `Không lưu được câu trả lời. Thử lại nhé.`, `Yêu cầu không hợp lệ`. Đổi: dòng trên tiêu đề `{lessonTitle ?? 'Ôn tổng hợp'}` → `{subjectTitle}`; `Về khóa học` → `Về môn học`. Mới: link `Xem lại bài làm` cạnh dòng `Lần gần nhất`, và `Lần gần nhất: {score}/{total} ({percent}%) · {day}` (thêm ngày).

**`TestResultView`:** giữ `{score}/{total}`, `{percent}%`, `Đạt`, `Chưa đạt · cần 80%`, `Chỉ câu sai` / `Tất cả câu`, `Câu {i} · {prompt}`, `Bạn chọn:` / `Bạn điền:`, `Chưa trả lời`, `Đáp án: …`, `Giải thích: …`, `Bạn không sai câu nào.`. Ở trang `/tests/results/[attemptId]` thêm trên cùng: link `← Kết quả` và dòng `{paperTitle} · {subjectTitle} · {day}`.

**`TestResults`:** h1 `Kết quả`; phụ đề `Các lần nộp bài gần đây của bạn.`; hàng `{paperTitle}` / `{subjectTitle} · {day}` / `{score}/{total} · {percent}%` / chip `Đạt` hoặc `Chưa đạt`; trống `Chưa có kết quả` / `Làm một bài kiểm tra để xem kết quả ở đây.` cùng link `Chọn môn học →` (`/tests`).

**`TestAdmin`:** h1 `Quản lý bài kiểm tra`; thẻ tạo `Tạo môn học` / `Tên môn học` / `Mô tả` / nút `Tạo môn học` / toast `Đã tạo môn học.`; khi chưa có môn `Chưa có môn học. Tạo môn đầu tiên ở trên.`; chip trạng thái `Bản nháp` / `Tạm dừng` / `Đã xuất bản`; số liệu `{n} bài kiểm tra` (ẩn khi 0) `· {learners} học viên` (ẩn khi 0); mục `Bài kiểm tra`; nút `+ Nhập bài kiểm tra`; hàng bài `{questionCount} câu · Đã xuất bản|Bản nháp`; nút `Tải về`, `Thay đề`, `Ẩn` / `Xuất bản`, `Xóa`; trống `Chưa có bài kiểm tra.`; form: `Tên bài`, `Mô tả`, `File Excel (.xlsx)`, link `Tải file mẫu`, gợi ý `Mỗi dòng là một câu. Cột Loại ghi “Trắc nghiệm” hoặc “Điền từ”. Xem trang tính “Hướng dẫn” trong file mẫu.`, khi thay đề `File mới sẽ thay toàn bộ câu hỏi. Kết quả cũ của học viên vẫn giữ nguyên.`, nút `Xem trước`, `Lưu nháp`, `Lưu & xuất bản`, `Huỷ`; xem trước `Xem trước · {n} câu`, `Trắc nghiệm` / `Điền từ`, `Đáp án: {a / b}`, `Giải thích: …`, khi có lỗi thêm dòng `File còn {k} lỗi. Sửa trong Excel rồi chọn lại file.`; toast `Đã lưu bản nháp.` / `Đã lưu và xuất bản.` / `Đã ẩn bài kiểm tra.` / `Đã xóa bài kiểm tra.`; dialog `Xóa bài kiểm tra?` / `Lịch sử làm bài của học viên cũng bị xóa.`; lỗi mặc định `Dữ liệu bài kiểm tra không hợp lệ`.

**Lỗi service / API Kiểm tra:** `Không tìm thấy môn học`, `Môn học chưa xuất bản`, `Môn học không còn mở đăng ký`, `Mật khẩu không đúng`, `Hãy xóa hết bài kiểm tra của môn trước khi xóa.`, `Không tìm thấy bài kiểm tra`, `Hãy đăng ký môn học để làm bài kiểm tra.`, `Bài kiểm tra chưa có câu hỏi.`, `Không tìm thấy lượt làm bài`, `Câu trả lời không hợp lệ`, `File phải là .xlsx, tối đa 1 MB.`, `Không đọc được file Excel.`, `Không thấy trang tính “Câu hỏi” trong file.`, `File còn lỗi, hãy sửa rồi tải lên lại.`, `Dữ liệu môn học không hợp lệ`, `Dữ liệu bài kiểm tra không hợp lệ`, `Yêu cầu không hợp lệ`.

**Lỗi theo dòng của `parseTestRows`** (tiền tố luôn là `Dòng {r}: `, `r` là số dòng Excel):
- `tiêu đề cột phải là: Loại, Câu hỏi, A, B, C, D, E, F, Đáp án đúng, Giải thích.` (chỉ dòng 1)
- `cột Loại phải là “Trắc nghiệm” hoặc “Điền từ”.`
- `thiếu câu hỏi.`
- `câu hỏi dài quá 500 ký tự.`
- `giải thích dài quá 500 ký tự.`
- `các lựa chọn phải điền liền nhau từ cột A.`
- `câu trắc nghiệm cần ít nhất 2 lựa chọn (cột A và B).`
- `lựa chọn dài quá 200 ký tự.`
- `có hai lựa chọn giống nhau.`
- `cột Đáp án đúng phải là một chữ từ A đến F.`
- `đáp án đúng trỏ vào một lựa chọn trống.`
- `câu điền từ cần đúng một chỗ trống ___.`
- `câu điền từ để trống các cột A–F.`
- `câu điền từ cần từ 1 đến 10 đáp án, cách nhau bằng dấu |.`
- `đáp án dài quá 200 ký tự.`
- Lỗi cả file (`row = 0`, không có tiền tố): `File chưa có câu hỏi nào.` và `Một bài có tối đa 100 câu.`

**File mẫu — trang tính `Hướng dẫn`** (mỗi gạch là một dòng, cột A):
- `Cách điền trang tính “Câu hỏi”`
- `Mỗi dòng là một câu. Không đổi dòng tiêu đề. Dòng trống được bỏ qua.`
- `Loại: ghi “Trắc nghiệm” hoặc “Điền từ”.`
- `Trắc nghiệm: điền các lựa chọn vào cột A, B, C… liền nhau (2 đến 6 lựa chọn). Cột “Đáp án đúng” ghi một chữ, ví dụ B.`
- `Điền từ: trong câu hỏi viết ___ (ba dấu gạch dưới) ở chỗ trống. Để trống các cột A–F. Cột “Đáp án đúng” ghi đáp án; nhiều đáp án chấp nhận thì cách nhau bằng dấu |, ví dụ: since | from.`
- `Giải thích: không bắt buộc, hiện cho học viên sau khi nộp bài.`
- `Ví dụ:`
- rồi ba dòng ví dụ ghi ở cột A–J đúng khuôn trang “Câu hỏi”:
  - `Trắc nghiệm | She ___ to school every day. | go | goes | going | gone | | | B | Chủ ngữ số ít ở thì hiện tại đơn thêm -s.`
  - `Điền từ | I have lived here ___ 2010. | | | | | | | since | “since” + mốc thời gian.`
  - `Trắc nghiệm | Từ nào nghĩa là “hài lòng”? | angry | pleased | tired | | | | B |`

---

## 6. States

### PR A

| Màn hình | Trạng thái |
|---|---|
| `/store` (`Library`) | Đang tải: `ScreenSkeleton` của `(app)/loading.tsx`. Lỗi: `error.tsx` sẵn có. Học viên mới / chưa có môn nào được xuất bản: `EmptyState` "Chưa có môn học". Ngay sau deploy PR A, mọi học viên đều thấy trạng thái này cho tới khi admin tạo môn (đã được chủ dự án chấp nhận). Một môn: một thẻ trong nhóm "Khám phá". Nhiều môn: hai nhóm, lưới 1/2/3 cột. Admin: thấy cả môn nháp/ẩn và `SubjectAdminControls` trên thẻ. 375px: một cột, nút "Đăng ký" và ô mật khẩu xuống dòng gọn trong thẻ. |
| `/subjects/[id]` | Tải: `loading.tsx`. 404: môn không thấy được. Chưa đăng ký: nút "Đăng ký" trong header, danh sách bộ vẫn xem được, bấm bộ mở trang bộ (môn có mật khẩu thì bộ chỉ hiện từ mẫu). Đã đăng ký: menu ⋯ "Rời môn học". Môn không có bộ (chỉ admin thấy): "Môn chưa có bộ từ nào." ở header và trong danh sách; không có `ProgressBar`. 375px: tên bộ `truncate`. |
| `/sets/[id]` | Học viên có bộ lẻ (không môn): như cũ, có menu gỡ bộ với cảnh báo "đã ẩn khỏi cửa hàng". Học viên có bộ thuộc môn đã đăng ký: không có menu gỡ. Học viên chưa có bộ, bộ thuộc môn: nút "Xem môn học →". Admin, bộ lẻ đã xuất bản: dòng "Bộ này chưa thuộc môn học nào nên học viên chưa thấy." |
| `/admin` tab "Môn học" | Chưa có môn: thẻ tạo môn + "Chưa có môn học. Tạo môn đầu tiên ở trên.". Có môn chưa có bộ: "Chưa có bộ. Thêm bộ từ danh sách bên dưới.". Không còn bộ chưa xếp môn: ẩn ô chọn. 375px: ô chọn và nút "Thêm bộ" xuống dòng (`flex-wrap`). |
| `/review`, `/` | Không đổi gì ngoài copy. Học viên giữ mọi bộ đã có (dòng `EnEnrollment` không bị xóa). |

### PR B

| Màn hình | Trạng thái |
|---|---|
| Thanh điều hướng | Từ vựng: như PR A + nút chuyển chế độ (sidebar dưới thương hiệu; điện thoại thay chữ thương hiệu). Kiểm tra: menu "Môn học", "Kết quả"; admin thêm "Bài kiểm tra"; không có vòng XP, `RewardCenter`, `OnboardingTour`. 375px: header gồm nút chuyển chế độ (trái) và vòng XP + tài khoản (phải, chỉ ở Từ vựng) trên một dòng, không xuống dòng. |
| `/tests` | Tải: `(app)/loading.tsx`. Chưa có môn: "Chưa có môn học". Một/nhiều môn: như `Library`. Học viên mới chưa có bộ từ nào: vẫn thấy môn Kiểm tra bình thường (không phụ thuộc Từ vựng). Admin: thấy môn nháp, môn chưa có bài ghi "Chưa có bài kiểm tra". |
| `/tests/subjects/[id]` | Tải: `loading.tsx`. 404 khi không thấy được. Chưa đăng ký: nút "Đăng ký", câu "Đăng ký môn học để làm bài kiểm tra.", nút "Làm bài" xám không bấm được. Đã đăng ký, chưa làm bài nào: nút "Làm bài", không có chip. Đang làm dở: chip "Đang làm" + "Làm tiếp". Đã làm: chip điểm + "Làm lại". Không có bài: "Môn này chưa có bài kiểm tra.". Admin: thấy bài nháp với " · Bản nháp" và bấm làm được. 375px: chip + nút nằm bên phải hàng, tên bài `truncate`. |
| `/tests/papers/[id]` | Màn hình tập trung (không có thanh điều hướng). Intro: lần đầu "Bắt đầu"; đang dở "Làm tiếp"; đã làm thì hiện "Lần gần nhất … · ngày", "Cao nhất" khi khác lần gần nhất, link "Xem lại bài làm". Đang làm: như #75. Lỗi mạng khi lưu: `role="alert"` "Không lưu được câu trả lời. Thử lại nhé." và ở lại câu đó. Chưa đăng ký: chuyển về trang môn. 375px: footer hai nút chia đôi, chữ `text-xs`, không xuống dòng. |
| `/tests/results` | Chưa có lượt nào: `EmptyState` "Chưa có kết quả" + link. Một/nhiều: danh sách mới nhất trước, tối đa 100. Admin: chỉ lượt của chính mình. 375px: tên bài `truncate`, điểm và chip bên phải. |
| `/tests/results/[id]` | 404 khi không phải của mình hoặc chưa nộp. Bài đã bị xóa: 404 (cascade). |
| `/admin/tests` | Học viên mở: chuyển về `/tests` (proxy chặn `/admin…` trước). Chưa có môn: thẻ tạo môn + câu "Chưa có môn học…". Form nhập: chưa chọn file thì "Xem trước" tắt; xem trước có lỗi thì liệt kê lỗi bằng `text-error`, "Lưu…" tắt; không lỗi thì hiện câu hỏi và bật "Lưu…"; đổi file thì xóa xem trước. File sai đuôi/quá 1 MB hoặc hỏng: lỗi đỏ dưới form. 375px: hàng nút bài kiểm tra xuống dòng (`flex-wrap`), form một cột. |

---

## 7. Data

### 7.A Migration `prisma/migrations/20261108000000_en_vocab_subject/migration.sql`

```sql
CREATE TABLE "EnVocabSubject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "listed" BOOLEAN NOT NULL DEFAULT true,
  "accessCode" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnVocabSubject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnVocabSubject_status_sortOrder_idx" ON "EnVocabSubject"("status", "sortOrder");
CREATE TABLE "EnVocabSubjectEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnVocabSubjectEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnVocabSubjectEnrollment_userId_subjectId_key" ON "EnVocabSubjectEnrollment"("userId", "subjectId");
CREATE INDEX "EnVocabSubjectEnrollment_userId_idx" ON "EnVocabSubjectEnrollment"("userId");
ALTER TABLE "EnVocabSubjectEnrollment" ADD CONSTRAINT "EnVocabSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnVocabSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EnSet" ADD COLUMN "subjectId" TEXT;
CREATE INDEX "EnSet_subjectId_sortOrder_idx" ON "EnSet"("subjectId", "sortOrder");
ALTER TABLE "EnSet" ADD CONSTRAINT "EnSet_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnVocabSubject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

Không backfill: bảng mới bắt đầu trống, mọi bộ có `subjectId = null`.

### 7.B Migration `prisma/migrations/20261109000000_en_test_mode/migration.sql`

```sql
CREATE TABLE "EnTestSubject" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "listed" BOOLEAN NOT NULL DEFAULT true,
  "accessCode" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnTestSubject_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnTestSubject_status_sortOrder_idx" ON "EnTestSubject"("status", "sortOrder");

CREATE TABLE "EnTestSubjectEnrollment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnTestSubjectEnrollment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestSubjectEnrollment_userId_subjectId_key" ON "EnTestSubjectEnrollment"("userId", "subjectId");
CREATE INDEX "EnTestSubjectEnrollment_userId_idx" ON "EnTestSubjectEnrollment"("userId");
ALTER TABLE "EnTestSubjectEnrollment" ADD CONSTRAINT "EnTestSubjectEnrollment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnTestSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaper" (
  "id" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "EnContentStatus" NOT NULL DEFAULT 'draft',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EnTestPaper_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EnTestPaper_subjectId_status_sortOrder_idx" ON "EnTestPaper"("subjectId", "status", "sortOrder");
ALTER TABLE "EnTestPaper" ADD CONSTRAINT "EnTestPaper_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EnTestSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaperQuestion" (
  "id" TEXT NOT NULL,
  "paperId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctIndex" INTEGER,
  "answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "explanationVi" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "EnTestPaperQuestion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestPaperQuestion_paperId_position_key" ON "EnTestPaperQuestion"("paperId", "position");
ALTER TABLE "EnTestPaperQuestion" ADD CONSTRAINT "EnTestPaperQuestion_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "EnTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaperAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "paperId" TEXT NOT NULL,
  "activeKey" TEXT,
  "status" "EnTestStatus" NOT NULL DEFAULT 'in_progress',
  "position" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL,
  "score" INTEGER,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  CONSTRAINT "EnTestPaperAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestPaperAttempt_activeKey_key" ON "EnTestPaperAttempt"("activeKey");
CREATE INDEX "EnTestPaperAttempt_userId_paperId_status_idx" ON "EnTestPaperAttempt"("userId", "paperId", "status");
CREATE INDEX "EnTestPaperAttempt_userId_finishedAt_idx" ON "EnTestPaperAttempt"("userId", "finishedAt");
ALTER TABLE "EnTestPaperAttempt" ADD CONSTRAINT "EnTestPaperAttempt_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "EnTestPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnTestPaperAttemptItem" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "prompt" TEXT NOT NULL,
  "options" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "correctIndex" INTEGER,
  "answers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "explanationVi" TEXT NOT NULL DEFAULT '',
  "answer" TEXT,
  "correct" BOOLEAN,
  "answeredAt" TIMESTAMP(3),
  CONSTRAINT "EnTestPaperAttemptItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EnTestPaperAttemptItem_attemptId_position_key" ON "EnTestPaperAttemptItem"("attemptId", "position");
ALTER TABLE "EnTestPaperAttemptItem" ADD CONSTRAINT "EnTestPaperAttemptItem_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "EnTestPaperAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### 7.C Định dạng file Excel (.xlsx)

- File `.xlsx`, tối đa 1 MB. Chỉ đọc trang tính tên đúng **`Câu hỏi`**; các trang khác (ví dụ `Hướng dẫn`) bị bỏ qua.
- Dòng 1 là tiêu đề, đúng 10 cột theo thứ tự (so sau `trim()`, không phân biệt hoa thường):

| Cột | Tiêu đề | Trắc nghiệm | Điền từ |
|---|---|---|---|
| A | `Loại` | `Trắc nghiệm` | `Điền từ` |
| B | `Câu hỏi` | bắt buộc, ≤ 500 ký tự | bắt buộc, ≤ 500 ký tự, đúng một chỗ trống `___` (3 dấu `_` trở lên được gom thành `___`) |
| C–H | `A` … `F` | lựa chọn, điền liền từ cột `A`, 2–6 lựa chọn, mỗi cái ≤ 200 ký tự, không trùng nhau (so sau `normalizeLearnerText`) | phải để trống |
| I | `Đáp án đúng` | một chữ `A`–`F` (không phân biệt hoa thường), trỏ vào lựa chọn có nội dung | 1–10 đáp án, cách nhau bằng `|`, mỗi cái ≤ 200 ký tự |
| J | `Giải thích` | không bắt buộc, ≤ 500 ký tự | như bên trái |

- Giá trị ô lấy bằng `cell.text.trim()` (số và công thức thành chữ). Dòng mà cả 10 ô trống bị bỏ qua. Cột từ K trở đi bị bỏ qua.
- Thứ tự câu = thứ tự dòng. `position` bắt đầu từ 0.
- So khớp cột `Loại`: `value.trim().toLocaleLowerCase('vi')` bằng `trắc nghiệm` hoặc `điền từ`.
- Tiêu đề sai: chỉ trả đúng một lỗi dòng 1 và không đọc tiếp.
- Một dòng có thể có nhiều lỗi; câu có lỗi không vào `questions`. `questions` chỉ dùng khi `issues` rỗng.
- Kết quả `mcq`: `{ type: 'mcq', prompt, options, correctIndex, explanationVi }`; `fill`: `{ type: 'fill', prompt, answers, explanationVi }`.

### 7.D API

**PR A**

| Route | Method | Zod (`.strict()`) | Trả về |
|---|---|---|---|
| `/api/admin/subjects` | POST | `{ title: z.string().trim().min(1).max(120), description: z.string().max(500).default('') }` | `EnVocabSubject`, 201 |
| `/api/admin/subjects/[subjectId]` | PATCH | `discriminatedUnion('action')`: `update { title?, description?, listed?: boolean, accessCode?: z.string().max(64), status?: z.enum(['draft','published']) }`, `addSet { setId }`, `removeSet { setId }`, `move { setId, direction: z.enum(['up','down']) }` | như #74 |
| `/api/admin/subjects/[subjectId]` | DELETE | — | `{ deleted: true }` |
| `/api/subjects/[subjectId]/enroll` | POST | `{ accessCode: z.string().max(64).optional() }` | `{ enrolled: true }` |
| `/api/subjects/[subjectId]/enroll` | DELETE | `{}` | `{ enrolled: false }` |
| `/api/enroll` | DELETE | `{ setId: z.string().min(1) }` | `{ enrolled: false }` |
| `/api/enroll` | POST | **xóa** | — |

**PR B**

| Route | Method | Zod / body | Trả về |
|---|---|---|---|
| `/api/tests/subjects/[subjectId]/enroll` | POST / DELETE | như route môn Từ vựng | `{ enrolled }` |
| `/api/tests/papers/[paperId]` | POST | `discriminatedUnion('action')`: `start {}`, `answer { attemptId: z.string().min(1), position: z.number().int().min(0), answer: z.string().max(200) }`, `finish { attemptId }` | `PublicTestAttempt` / `{ saved: true }` / `TestResult` |
| `/api/admin/tests/subjects` | POST | như `/api/admin/subjects` | `EnTestSubject`, 201 |
| `/api/admin/tests/subjects/[subjectId]` | PATCH | `discriminatedUnion('action')` chỉ có `update { … }` như trên | `EnTestSubject` |
| `/api/admin/tests/subjects/[subjectId]` | DELETE | — | `{ deleted: true }` |
| `/api/admin/tests/import` | POST multipart | `Object.fromEntries(form)` qua `z.discriminatedUnion('action', [z.object({ action: z.literal('preview'), file: z.instanceof(File) }).strict(), z.object({ action: z.literal('save'), file: z.instanceof(File), subjectId: z.string().min(1), title: z.string().trim().min(1).max(120), description: z.string().max(500).default(''), publish: z.enum(['true', 'false']), paperId: z.string().min(1).optional() }).strict()])` | preview: `{ questions: TestQuestionInput[]; issues: TestImportIssue[] }`; save: `EnTestPaper` |
| `/api/admin/tests/template` | GET | — | file `.xlsx` |
| `/api/admin/tests/papers/[paperId]` | GET | — | file `.xlsx` |
| `/api/admin/tests/papers/[paperId]` | PATCH | `{ status: z.enum(['draft','published']) }` | `EnTestPaper` (xuất bản bài 0 câu → 400 `Bài kiểm tra chưa có câu hỏi.`) |
| `/api/admin/tests/papers/[paperId]` | DELETE | — | `{ deleted: true }` |

`PublicTestAttempt = { id; position; total; items: Array<{ position; type; prompt; options; answer }> }` (không có đáp án). `TestResult = { attemptId; paperId; subjectId; score; total; percent; passed; items: Array<{ position; type; prompt; options; answer; correct; correctText; explanationVi }> }`.

---

## 8. Tests

Hàm thuần test không mock. Test service mock `@/lib/prisma` theo khuôn `src/lib/__tests__/enCourseService.test.ts` (bản ở `c729009`).

### PR A

`src/lib/__tests__/accessCode.test.ts`
- `accessCodeMatches('Open-Sesame', '  open-sesame ')` → `true`
- `accessCodeMatches('Open-Sesame', 'wrong')` → `false`

`src/lib/__tests__/enVocabSubjectService.test.ts` (chép 5 case của `enCourseService.test.ts`, đổi bảng/tên; mock `@/lib/accessCode` thay vì `enCatalogService.accessCodeMatches`)
- `enrollVocabSubject('user','subject')`, môn `published`, `listed`, không mật khẩu, 2 bộ `published` → `enVocabSubjectEnrollment.upsert` với `create: { userId: 'user', subjectId: 'subject' }`; `enEnrollment.createMany({ data: [{ userId: 'user', setId: 'set-1' }, { userId: 'user', setId: 'set-2' }], skipDuplicates: true })`.
- Môn có `accessCode: 'secret'`, gửi `'wrong'` → reject `{ status: 403, code: 'ACCESS_CODE' }`, không gọi `upsert`.
- Môn `listed: false`, chưa đăng ký → reject `{ status: 404, message: 'Môn học không còn mở đăng ký' }`.
- `leaveVocabSubject('user','subject')` → gọi `enVocabSubjectEnrollment.deleteMany` và `enEnrollment.deleteMany({ where: { userId: 'user', setId: { in: ['set-1','set-2'] } } })`; không gọi `enWordState.deleteMany`.
- `deleteVocabSubject('subject')` khi `enSet.count` = 1 → reject `{ message: 'Hãy gỡ hết bộ từ khỏi môn trước khi xóa.' }`, không gọi `delete`.
- `addSetToSubject('subject','set-1')` khi bộ đang có `subjectId: 'other'` → reject `{ message: 'Bộ này đang thuộc môn khác. Hãy gỡ khỏi môn đó trước.' }`.
- `moveSubjectSet('subject','set-2','up')` với thứ tự `[set-1, set-2]` → `enSet.update` gọi với `{ where: { id: 'set-2' }, data: { sortOrder: 0 } }` và `{ where: { id: 'set-1' }, data: { sortOrder: 1 } }`.

`src/lib/__tests__/enCatalogEnroll.test.ts` (viết lại)
- Xóa case "rejects direct enrollment".
- `unenrollEnglishSet('user','set')`, bộ `{ subjectId: 'subject' }`, có `EnVocabSubjectEnrollment` → reject `{ status: 400, message: 'Bộ này thuộc môn học bạn đã đăng ký. Hãy rời cả môn học.' }`; không gọi `enEnrollment.deleteMany`.
- Bộ `{ subjectId: 'subject' }`, không có `EnVocabSubjectEnrollment` → `enEnrollment.deleteMany({ where: { userId: 'user', setId: 'set' } })`.
- Bộ `{ subjectId: null }` → `enEnrollment.deleteMany` được gọi.

`src/lib/__tests__/enCatalogStoreAccess.test.ts`
- Xóa 5 case dùng `enrollEnglishSet` (mật khẩu đã được test ở `enVocabSubjectService.test.ts`) và import của nó.
- Đổi `setRow`: `courseId` → `subjectId`, `course` → `subject` (thêm `enrollments: []`). Các case `getEnglishSetDetail` giữ ý: môn có mật khẩu → `previewOnly: true`; môn `listed: false` và học viên chưa có bộ → 404.
- Thêm: bộ `subjectId: null`, học viên chưa có → 404. Bộ `subjectId: null`, học viên đã có (`enrollments: [{ id }]`) → trả chi tiết với `listed: false`, `subjectEnrolled: false`.

`src/lib/__tests__/enPublishFlow.test.ts`
- Bỏ import `enrollEnglishSet` và hai dòng `await expect(enrollEnglishSet(...))`. Đổi tên case đầu thành `'publishes a saved pack even without mp3 files'`. Các `expect` còn lại giữ nguyên.

`src/lib/__dbtests__/vocabSubject.dbtest.ts` (chép `course.dbtest.ts`, đổi bảng/tên)
- Môn có 3 bộ (2 `published`, 1 `draft`) → đăng ký → học viên có 2 `EnEnrollment`; xuất bản bộ nháp rồi `syncSubjectEnrollments` → 3; rời môn → 0 và số `EnWordState` không đổi.
- Môn `published`, `listed: false` → không có trong `listVocabSubjects(user,false)`; tạo `EnVocabSubjectEnrollment` → có.
- Mới: `publishEnglishSet` một bộ thuộc môn có học viên đã đăng ký → học viên có thêm `EnEnrollment` của bộ đó.

### PR B

`src/lib/__tests__/testImport.test.ts` (không mock). Gọi `H = [...TEST_COLUMNS]`.
- `parseTestRows([H, ['Trắc nghiệm','She ___ to school.','go','goes','going','','','','B','Thêm -s.']])` → `questions: [{ type: 'mcq', prompt: 'She ___ to school.', options: ['go','goes','going'], correctIndex: 1, explanationVi: 'Thêm -s.' }]`, `issues: []`.
- `[H, ['điền từ','I lived here ____ 2010.','','','','','','','since | from','']]` → `[{ type: 'fill', prompt: 'I lived here ___ 2010.', answers: ['since','from'], explanationVi: '' }]`.
- Tiêu đề `loại` viết thường, có khoảng trắng thừa → chấp nhận.
- `[['Type','Question'], …]` → `issues: [{ row: 1, message: 'Dòng 1: tiêu đề cột phải là: Loại, Câu hỏi, A, B, C, D, E, F, Đáp án đúng, Giải thích.' }]`, `questions: []`.
- `[H]` → `[{ row: 0, message: 'File chưa có câu hỏi nào.' }]`.
- `[H, 10 ô trống, ['Trắc nghiệm','Q','a','b','','','','','A','']]` → một câu, không lỗi (dòng trống bỏ qua).
- `[H, ['Tự luận','Q', …]]` → `{ row: 2, message: 'Dòng 2: cột Loại phải là “Trắc nghiệm” hoặc “Điền từ”.' }`.
- MCQ thiếu câu hỏi → `Dòng 2: thiếu câu hỏi.`
- MCQ `A='a', B='', C='c'` → `Dòng 2: các lựa chọn phải điền liền nhau từ cột A.`
- MCQ chỉ `A` → `Dòng 2: câu trắc nghiệm cần ít nhất 2 lựa chọn (cột A và B).`
- MCQ `A='Go', B='go '` → `Dòng 2: có hai lựa chọn giống nhau.`
- MCQ đáp án `'2'` → `Dòng 2: cột Đáp án đúng phải là một chữ từ A đến F.`; đáp án `'b'` → chấp nhận, `correctIndex: 1`.
- MCQ có A,B, đáp án `'C'` → `Dòng 2: đáp án đúng trỏ vào một lựa chọn trống.`
- Điền từ không có `___` → `Dòng 2: câu điền từ cần đúng một chỗ trống ___.`; có hai chỗ → cùng lỗi.
- Điền từ có cột `A` → `Dòng 2: câu điền từ để trống các cột A–F.`
- Điền từ đáp án `' | '` → `Dòng 2: câu điền từ cần từ 1 đến 10 đáp án, cách nhau bằng dấu |.`; 11 đáp án → cùng lỗi.
- Câu hỏi 501 ký tự → `Dòng 2: câu hỏi dài quá 500 ký tự.`; lựa chọn 201 ký tự → `Dòng 2: lựa chọn dài quá 200 ký tự.`; giải thích 501 → `Dòng 2: giải thích dài quá 500 ký tự.`; đáp án điền từ 201 → `Dòng 2: đáp án dài quá 200 ký tự.`
- 101 dòng MCQ hợp lệ → có `{ row: 0, message: 'Một bài có tối đa 100 câu.' }`.
- Một dòng sai ở dòng 3, dòng 2 đúng → `issues` chỉ có lỗi `row: 3`.
- Khứ hồi: `parseTestRows(testRowsOf(q)).questions` → bằng `q` với `q` = hai câu ở hai case đầu.

`src/lib/__tests__/testPaper.test.ts` (chép các case chấm điểm của `exam.test.ts` `c729009`, đổi tên)
- `gradeTestAnswer({ type: 'mcq', correctIndex: 1, answers: [] }, '1')` → `true`; `'0'` → `false`; `null` → `false`.
- `gradeTestAnswer({ type: 'fill', correctIndex: null, answers: ['since','from'] }, '  Since ')` → `true`; `'for'` → `false`; `''` → `false`.
- `isTestPassed(8, 10)` → `true`; `isTestPassed(7, 10)` → `false`; `isTestPassed(0, 0)` → `false`.
- `testPercent(2, 3)` → `67`; `testPercent(0, 0)` → `0`.
- `pickBestAttempt([{ score: 8, total: 10, finishedAt: d1 }, { score: 4, total: 5, finishedAt: d2 }])` với `d2 > d1` → phần tử thứ hai (cùng tỉ lệ, mới hơn).
- `formatVnDay('2026-11-03')` → `'03/11/2026'`.

`src/lib/__tests__/appMode.test.ts`
- `modeOfPath('/tests')` → `'test'`; `'/tests/results/abc'` → `'test'`; `'/admin/tests'` → `'test'`; `'/'` → `'vocab'`; `'/admin'` → `'vocab'`; `'/sets/x/test'` → `'vocab'`; `'/testsx'` → `'vocab'`.
- `modeRedirect('/', null, 'test')` → `'/tests'`; `('/', 'vocab', 'test')` → `'/'`; `('/', null, 'vocab')` → `null`; `('/', null, undefined)` → `null`; `('/review', null, 'test')` → `null`.

`src/lib/__tests__/enTestWorkbookService.test.ts` (exceljs thật, không mock)
- `readTestWorkbook(await buildTestWorkbook([]))` → `[[...TEST_COLUMNS]]`; `parseTestRows` của nó → lỗi `File chưa có câu hỏi nào.`
- Khứ hồi với hai câu (mcq + fill) → `parseTestRows(await readTestWorkbook(await buildTestWorkbook(q))).questions` bằng `q`.
- Workbook chỉ có sheet `Sheet1` (tạo bằng exceljs trong test) → reject `{ message: 'Không thấy trang tính “Câu hỏi” trong file.' }`.
- `readTestWorkbook(new TextEncoder().encode('not a zip').buffer)` → reject `{ message: 'Không đọc được file Excel.' }`.

`src/lib/__tests__/enTestSubjectService.test.ts`
- `enrollTestSubject` mật khẩu sai → 403 `ACCESS_CODE`; đúng mật khẩu khác hoa thường → `upsert` một lần; môn `listed: false`, chưa đăng ký → 404 `Môn học không còn mở đăng ký`.
- `enrollTestSubject` không gọi `enEnrollment`, `enVocabSubjectEnrollment` hay bất kỳ model nào ngoài `enTestSubject`, `enTestSubjectEnrollment` (mock chỉ khai báo hai model này; gọi model khác sẽ ném lỗi).
- `leaveTestSubject` → chỉ `enTestSubjectEnrollment.deleteMany({ where: { userId, subjectId } })`.
- `deleteTestSubject` khi `enTestPaper.count` = 2 → reject `Hãy xóa hết bài kiểm tra của môn trước khi xóa.`

`src/lib/__tests__/enTestService.test.ts` (chép ý các case của `enExamService.test.ts` `c729009`)
- `startTestPaper` khi học viên chưa đăng ký → reject `{ status: 403, message: 'Hãy đăng ký môn học để làm bài kiểm tra.' }`.
- `startTestPaper` khi đã có lượt dở → trả lượt đó, không `create`.
- Payload `startTestPaper` → `items[0]` không có khóa `correctIndex`, `answers`, `explanationVi`, `correct`.
- `answerTestPaper` MCQ với `'7'` khi có 3 lựa chọn → 400 `Câu trả lời không hợp lệ`.
- `answerTestPaper` của `userId` khác → 404 `Không tìm thấy lượt làm bài` (query lọc theo `userId`).
- `finishTestPaper` hai lần → lần hai trả cùng kết quả, `update` chỉ gọi một lần.
- `finishTestPaper` với 2 câu đúng / 1 bỏ trống / 1 sai → `score: 2`, `percent: 50`, `passed: false`.
- `saveTestPaper` với file có lỗi (mock `readTestWorkbook` trả dòng sai) → reject `File còn lỗi, hãy sửa rồi tải lên lại.`, không mở transaction.
- Không test nào gọi tới `enXpEvent`, `enWordState`, `enReview`, `enStudyDay` (mock không có các model đó).

`src/lib/__dbtests__/testPaper.dbtest.ts` (chép `exam.dbtest.ts`, đổi sang bảng mới, file tạo bằng `buildTestWorkbook`)
- Hai `startTestPaper` song song → cùng `id`, đúng 1 lượt `in_progress`.
- Thay đề khi có lượt dở → lượt cũ vẫn 1 câu với prompt cũ; nộp xong, lượt mới có 2 câu.
- Nộp bài → số dòng `EnXpEvent`, `EnWordState`, `EnReview`, `EnStudyDay` của học viên không đổi.
- `listMyTestResults` → mới nhất trước, chỉ của `userId` đó.
- `deleteTestPaper` → lượt làm của bài đó bị xóa.

---

## 9. Steps

### PR A (nhánh `claude/vocab-subjects`)
1. Đọc `AGENTS.md`, `DESIGN.md`, file này. Tạo nhánh từ `main`.
2. Sửa `prisma/schema.prisma` (mục 4), tạo migration 7.A, chạy `npx prisma generate`, `npx prisma migrate dev`, kiểm tra lệch schema. Kiểm: `npm run typecheck` chỉ báo lỗi ở các file sẽ sửa ở bước sau.
3. Tạo `src/lib/accessCode.ts` + `accessCode.test.ts`; sửa import trong `enCatalogService.ts`. Kiểm: `npm test -- accessCode`.
4. Tạo `enVocabSubjectService.ts` + test. Kiểm: `npm test -- enVocabSubjectService`.
5. Sửa `enCatalogService.ts`, `enContentService.ts`, `constants.ts`; xóa `enCourseService.ts`, `enExamService.ts`, `src/lib/english/exam.ts`; sửa/xóa test liên quan. Kiểm: `npm test`.
6. Xóa và tạo các API route (mục 4). Kiểm: `npm run typecheck` sạch phần API.
7. Đổi tên/tạo/xóa components, trang, sửa copy, `navigation.ts`, `proxy.ts`, `EnglishShell.tsx`. Kiểm: `npm run typecheck` sạch; `grep -rn "enCourse\|enExam\|courseId\|/courses\|khóa học\|Khóa học" src` chỉ còn khớp ở `prisma` client sinh ra và dòng redirect `/courses` trong `proxy.ts`.
8. Sửa `setup.ts`, tạo `vocabSubject.dbtest.ts`, xóa dbtest cũ. Kiểm: `npm run test:db`.
9. `npm run quality`. Kiểm thủ công theo mục 10.A. Commit, push, mở PR (ghi mọi chỗ lệch plan trong mô tả PR), merge, deploy theo `AGENTS.md`.

### PR B (nhánh `claude/test-mode`, tách từ `main` sau khi PR A merge)
1. Schema + migration 7.B, generate, migrate, kiểm lệch schema.
2. `constants.ts`, `testPaper.ts`, `testImport.ts`, `appMode.ts` + ba file test thuần. Kiểm: `npm test -- testImport testPaper appMode`.
3. `enTestWorkbookService.ts` + test. Kiểm: `npm test -- enTestWorkbookService`.
4. `enTestSubjectService.ts`, `enTestService.ts` + test. Kiểm: `npm test`.
5. Toàn bộ API route PR B. Kiểm: `npm run typecheck`.
6. `ModeSwitch.tsx`, `navigation.ts`, `AccountMenu.tsx`, `EnglishShell.tsx`, `proxy.ts`. Kiểm: mở `/` và `/tests` trên dev server, cookie `wq_mode` đổi đúng.
7. Trang và component `tests/`, trang `/admin/tests`. Kiểm: `npm run typecheck`.
8. `setup.ts` + `testPaper.dbtest.ts`. Kiểm: `npm run test:db`.
9. `npm run quality`. Kiểm thủ công theo mục 10.B. Commit, push, PR, merge, deploy.

### Bước C — Xóa bảng cũ (KHÔNG tự làm, phải hỏi chủ dự án trước)
Chỉ bắt đầu khi chủ dự án trả lời đồng ý trong chat.
1. Trên server thật: `pg_dump --format=custom --file=backup-before-drop-course-exam-$(date +%Y%m%d%H%M).dump "$DATABASE_URL"`; kiểm file khác rỗng bằng `pg_restore --list`.
2. Migration `prisma/migrations/20261110000000_en_drop_course_exam/migration.sql` (hoặc timestamp sau folder mới nhất lúc đó): `DROP TABLE "EnExamAttemptItem"; DROP TABLE "EnExamAttempt"; DROP TABLE "EnExamQuestion"; DROP TABLE "EnExam"; DROP TABLE "EnCourseEnrollment"; ALTER TABLE "EnSet" DROP CONSTRAINT "EnSet_courseId_fkey"; DROP INDEX "EnSet_courseId_sortOrder_idx"; ALTER TABLE "EnSet" DROP COLUMN "courseId"; DROP TABLE "EnCourse";`
3. Xóa các model đó, cột `courseId`, quan hệ `course` / `exams` khỏi `EnSet` trong `schema.prisma`; `npx prisma generate`; `npm run quality`; PR riêng.

---

## 10. Acceptance

`npm run quality` và `npm run test:db` đều qua cho mỗi PR. Rồi kiểm thủ công trên `http://localhost:3002`, mỗi màn hình kiểm cả bề rộng desktop và 375px (`resize_window` preset `mobile`).

### 10.A PR A
1. Học viên có bộ từ từ trước (tài khoản seed có `EnEnrollment`): `/review` và `/` vẫn hiện các bộ và số từ đến hạn như trước khi deploy.
2. Học viên đó mở `/store` → "Chưa có môn học" (chưa có môn nào).
3. Admin mở `/admin` → tab "Môn học" → tạo "IELTS 5.5" → thêm hai bộ đã xuất bản → trên `/store` (admin) bấm "Xuất bản" trên thẻ môn.
4. Học viên mới (tài khoản không có bộ nào) mở `/store` → thấy "IELTS 5.5 · 2 bộ · N từ" → "Đăng ký" → về `/subjects/[id]`; `/review` có đủ hai bộ.
5. Admin đặt mật khẩu cho môn; học viên thứ ba mở `/subjects/[id]` → bấm một bộ → chỉ thấy từ mẫu và câu "Đăng ký môn học để xem cả bộ."; nhập sai mật khẩu → "Mật khẩu không đúng"; nhập đúng → đăng ký được.
6. Học viên mới "Rời môn học" → `/review` không còn hai bộ; `EnWordState` của học viên không đổi (`npx prisma studio`).
7. Mở `/courses/abc` → chuyển về `/store`. Không còn tab "Kiểm tra" hay chữ "khóa học" ở bất kỳ màn hình học viên nào.
8. Trang `/sets/[id]` của một bộ lẻ: admin thấy "Bộ này chưa thuộc môn học nào nên học viên chưa thấy."; học viên chưa có bộ đó mở link → 404.

### 10.B PR B
1. Học viên mở `/` → bấm "Kiểm tra" → `/tests`; tắt tab, mở lại `http://localhost:3002/` → tự vào `/tests`. Bấm "Từ vựng" → `/`, mở lại `/` → ở lại `/`.
2. Ở chế độ Kiểm tra không có vòng XP, menu chỉ có "Môn học", "Kết quả" (admin thêm "Bài kiểm tra"). Ở 375px header một dòng, thanh dưới hai mục.
3. Admin `/admin/tests` → tạo môn "Ngữ pháp A2" → "+ Nhập bài kiểm tra" → "Tải file mẫu" → mở file thấy hai trang tính "Câu hỏi" (chỉ dòng tiêu đề) và "Hướng dẫn".
4. Chép ba dòng ví dụ từ "Hướng dẫn" sang "Câu hỏi", sửa dòng 3 thành đáp án "Z" → "Xem trước" → thấy "Dòng 3: cột Đáp án đúng phải là một chữ từ A đến F." và nút lưu tắt. Sửa lại, chọn lại file → xem trước 3 câu, không lỗi → "Lưu & xuất bản". Xuất bản môn bằng `SubjectAdminControls`.
5. Học viên mở `/tests` → thấy môn → "Đăng ký" → "Làm bài" → làm 2 câu, thoát, mở lại → "Làm tiếp" ở đúng câu → nộp → thấy điểm, đáp án, giải thích; câu điền từ chấp nhận cả `since` và ` Since `.
6. `/tests/results` có lượt vừa nộp, ngày đúng giờ Việt Nam (kiểm lúc 00:00–07:00 bằng cách đặt `finishedAt` trong DB local về `2026-11-02T18:30:00Z` → hiện `03/11/2026`). Bấm vào → xem lại đúng bài.
7. Sau khi nộp, đếm `EnXpEvent`, `EnStudyDay`, `EnWordState` của học viên bằng `npx prisma studio`: không đổi so với trước khi làm bài.
8. Admin "Thay đề" bằng file 4 câu → học viên "Làm lại" → 4 câu; lượt cũ ở `/tests/results` vẫn 3 câu.
9. Admin "Tải về" bài → mở file thấy đúng 4 câu, tải lên lại không lỗi.
10. Học viên chưa đăng ký mở thẳng `/tests/papers/[id]` → chuyển về `/tests/subjects/[id]`.
