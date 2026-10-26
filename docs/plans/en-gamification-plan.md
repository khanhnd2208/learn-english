# Spec: Gamification "Hành trình từ vựng". Thưởng cho trí nhớ thật, không thưởng cho thao tác

> Kế hoạch để duyệt trước khi triển khai. Liên quan: `docs/plans/en-practice-test-plan.md`.
> Bản này **thay quyết định D5** của spec cũ ("Không có XP, bảng xếp hạng, chuỗi ngày") bằng **D5'** ở mục 0.

## 0. Mục tiêu và quyết định gốc

Người học tự lái lộ trình. Hệ thống phản hồi theo kiểu trò chơi (nhân vật, chỉ số, cấp, quest, phần thưởng) để **củng cố hành vi học tốt**. Không có hành vi gian lận hay cày điểm nào được lợi hơn việc học thật.

| # | Quyết định |
|---|---|
| D5' | Có XP và Level. **Không có** bảng xếp hạng và streak. XP **chỉ** sinh ra từ kết quả Test được chấm ở server, được tính, và đạt câu Tự nhớ |
| G1 | **XP đo trí nhớ, không đo công sức.** Thời gian học, số phiên luyện, quest, nhật ký: tất cả đều 0 XP |
| G2 | **Mỗi mốc của một từ chỉ thưởng 1 lần trong đời.** Làm sai cố ý, bỏ dở bài, làm lại nhiều lần đều không bao giờ được thêm XP |
| G3 | **Phần thưởng lớn nhất nằm ở việc nhớ lâu** (giữ được sau 7 ngày, sau 30 ngày). Kiểu thưởng này không thể có được bằng cách tra từ trong một lần làm bài |
| G4 | **Trung thực không bị thiệt.** Bấm "Tôi chưa nhớ" không bị thiệt hơn đoán bừa. Nghỉ học không mất gì |
| G5 | **Vá lỗ hổng trước, thêm phần thưởng sau.** Giai đoạn 0 là điều kiện bắt buộc |

---

## 1. Hành vi cần củng cố

Mỗi hành vi tốt có một tín hiệu đo được và một cách củng cố. Chỉ những tín hiệu **không giả được** mới gắn với XP.

| # | Hành vi tốt | Tín hiệu | Củng cố | Có XP? |
|---|---|---|---|---|
| B1 | **Tự nhớ** (lôi từ ra từ trí nhớ), không chỉ nhận ra | câu `recall` đúng, chấm ở server | điều kiện bắt buộc để có XP | ✓ |
| B2 | **Quay lại sau một khoảng giãn cách** | kết quả counted cách lần đạt trước ≥ 7 / ≥ 30 ngày | mốc "Giữ vững" | ✓ (phần lớn XP) |
| B3 | **Đối diện lỗi sai**: luyện Sổ từ sai, đọc giải thích | phiên luyện mode `mistakes`, từ ra khỏi Sổ | đếm "từ đã cứu", nhiệm vụ được đánh dấu xong, thông điệp ghi nhận | ✗ |
| B4 | **Trung thực**: thừa nhận chưa nhớ | nút "Tôi chưa nhớ" | không bị phạt thêm; lộ trình tự đẩy từ đó vào Sổ | ✗ |
| B5 | **Học đều, vừa sức** | số ngày có học trong tuần | ô ngày trong tuần so với mục tiêu tự đặt, không có ngọn lửa streak | ✗ |
| B6 | **Tự đặt mục tiêu, tự nhìn lại** | quest, nhật ký cuối ngày | tiến độ quest, phần thưởng đời thực do người học tự đặt | ✗ |
| B7 | **Học sâu** (cách nói, phân biệt, ví dụ) | — | không đo, không thưởng; hiện tự nhiên khi trả lời sai | ✗ |

Lý do B3–B7 không có XP: đây là các tín hiệu do client báo lên hoặc dễ làm giả (mở thẻ, để tab chạy). Gắn điểm vào đó sẽ biến chúng thành thao tác để cày. Các hành vi này vẫn được ghi nhận bằng phản hồi không phải điểm số.

---

## 2. Rà soát: lỗ hổng đang có trong luồng Test và Practice

Hiện tại các lỗ hổng chưa nguy hiểm vì chưa có phần thưởng. **Khi có XP, mỗi lỗ hổng thành một cách cày điểm.**

| # | Lỗ hổng | Chỗ trong code | Cách lợi dụng | Mức |
|---|---|---|---|---|
| H1 | Câu Tự nhớ có thể **sửa sau khi đã thấy câu Nhận ra** của cùng từ | `testBuild.ts:40` xếp mọi câu recall trước recognize; `publicItems` (`enTestService.ts:80`) gửi **toàn bộ** câu ngay lúc bắt đầu; `answerEnglishTest` (`:254`) cho sửa đến khi nộp; lưới số câu ở `EnglishTest.tsx:134` cho nhảy tới câu bất kỳ | Làm phần Nhận ra (đề hiện chữ tiếng Anh), rồi quay lại sửa câu Tự nhớ. **Chỉ cần dùng UI bình thường, không cần devtools** | **Cao** |
| H2 | **Xem trước rồi làm lại** để lách luật cách ngày | `restart` (`enTestService.ts:162`) chuyển bài cũ sang `abandoned`, không ghi lần gặp nào | Mở bài Test, đọc hết đề (nghĩa, chữ, phương án), bấm làm lại. Bài mới vẫn **được tính** vì `lastExposureAt` không đổi | **Cao** |
| H3 | Bỏ dở để **né bị hạ** từ Đã nắm | bài `abandoned` không ghi gì | Thấy sắp sai thì thoát, từ vẫn giữ `mastered` | Trung bình |
| H4 | `finishEnglishPractice` nhận `senseIds` bất kỳ | `enPracticeService.ts:108` | Đánh dấu "đã gặp" cho từ chưa từng luyện, kể cả từ ở bộ chưa đăng ký | Thấp |
| H5 | Dán vào ô gõ, tra từ ở tab khác | `EnglishTest.tsx:141` không chặn `paste`, không ghi lại việc rời trang | Tra từ điển hoặc hỏi AI rồi dán đáp án | Trung bình |
| H6 | `responseMs`, `activeSeconds` do client đo | `clampResponseMs`, `activeTimer.ts` | Khai sai thời gian | Thấp **nếu** không gắn XP vào thời gian (G1) |
| H7 | Practice gửi nguyên bundle có đáp án xuống client | `startEnglishPractice` | Đúng/sai trong Practice không kiểm chứng được | Theo thiết kế; vì vậy Practice = 0 XP |

---

## 3. Rà soát đề xuất XP bản trước: những chỗ tạo động cơ sai

| Đề xuất cũ | Động cơ sai tạo ra | Sửa |
|---|---|---|
| Luyện +2 XP/phút | Để tab chạy hoặc bấm bừa cho tính giờ | Bỏ hẳn. Thời gian chỉ dùng cho thống kê |
| "Cứu từ ra khỏi Sổ" +15 | **Cố tình làm sai** hôm nay để mai cứu: tổng XP cao hơn làm đúng ngay | Bỏ XP; chỉ đếm số từ đã cứu (B3) |
| Đạt *vừa học* +3 | Luyện xong Test ngay trong ngày để lấy điểm, đi ngược luật cách ngày | Bỏ. Chỉ kết quả **counted** mới có XP |
| Đạt và được tính +10, **mỗi ngày** | Ngày nào cũng Test lại từ đã nắm để cày, học dồn | Mỗi mốc 1 lần trong đời (G2) |
| Quest có XP, người học tự đặt chỉ tiêu | Đặt quest dễ để lấy điểm; một kết quả bị thưởng 2 lần | Quest = 0 XP. Thưởng bằng phần thưởng đời thực tự đặt |
| Xong Tổng hợp +20 | Làm bài cho xong, không cần đúng | Bỏ. Tổng hợp tự sinh ra mốc "Giữ vững" |
| Chỉ số Kỷ luật lấy theo ngày học | Mở app 1 phút mỗi ngày | "Ngày học" chỉ tính khi có Test nộp xong hoặc phiên luyện ≥ 5 phút; không có XP; chỉ hiện ô ngày |

---

## 4. Thiết kế mới

### 4.1 Điểm Ghi nhớ (XP): một nguồn duy nhất

XP **chỉ** sinh ra trong transaction của `finishEnglishTest`, từ `EnTestWordResult` có `passed && counted`.

| Mốc (`EnXpKind`) | Điều kiện | XP | Số lần |
|---|---|---|---|
| `first_mastery` | Lần đầu tiên từ này Đạt và được tính | **5** | 1 lần trong đời mỗi nghĩa |
| `hold_7d` | Đạt và được tính; mốc bắt đầu chuỗi đạt liên tục (không có lần trượt counted xen giữa) cách hôm nay ≥ 7 ngày lịch VN | **10** | 1 lần trong đời |
| `hold_30d` | Như trên, ≥ 30 ngày | **20** | 1 lần trong đời |

- Mỗi nghĩa có trần **35 XP**. Muốn nhiều XP thì phải **nắm và giữ được nhiều từ hơn**. Không có cách nào khác.
- Một từ bị quên rồi học lại không nhận lại mốc đã nhận. Việc học lại được ghi nhận bằng bộ đếm "từ đã cứu", không phải XP. Nhờ vậy không ai có lý do để cố tình quên.
- Tổng hợp (`pickReviewSenses`) thêm một bậc ưu tiên sau Sổ từ sai: **từ đến hạn giữ** (đã nắm ≥ 7 hoặc ≥ 30 ngày, chưa nhận mốc tương ứng). Phần thưởng và lịch giãn cách nhờ đó cùng một hướng.

**Bất biến (viết thành test):**
- **I1** Chỉ `finishEnglishTest` ghi `EnXpEvent`. XP được tính từ kết quả chấm ở server. Client không bao giờ gửi XP lên.
- **I2** `@@unique([userId, senseId, kind])`: mỗi mốc tối đa một lần.
- **I3** Practice, thời gian, quest, nhật ký, phần thưởng: không đường nào ghi `EnXpEvent`.
- **I4** Với mọi chuỗi kết quả của một từ, chèn thêm lần trượt cố ý **không làm tổng XP tăng**. Kiểm bằng property test.
- **I5** Bỏ dở hoặc làm lại bài **không mở ra lần "tính" mới** trong cùng ngày (vá H2).
- **I6** Rời trang khi đang ở câu Tự nhớ thì từ đó **không được tính** ở lần này (vá H5, xem 4.7).
- **I7** Level không bao giờ giảm. Danh hiệu phản ánh số từ Đã nắm **hiện tại**.

### 4.2 Level và Danh hiệu: hai trục, hai ý nghĩa

- **Level**: tính từ tổng XP. Lên cấp n cần `100·n` XP. **Không bao giờ giảm** ("No level lost for bad days").
- **Danh hiệu**: tính từ số từ đang Đã nắm (50 / 150 / 300 / 600 / 1000 / 2000). **Có thể tụt** khi trượt Test được tính, vì đây là thước đo trung thực.
- Mỗi số trên giao diện đều có dòng giải thích ngắn: *"Level = trí nhớ bạn đã chứng minh. Danh hiệu = vốn từ bạn đang giữ."*

### 4.3 Nhân vật và Chỉ số (chỉ đọc, đo từ Test, 90 ngày gần nhất)

| Chỉ số | Nguồn |
|---|---|
| Hiểu nghĩa | tỷ lệ đúng `meaning_choice`, `cloze_choice` |
| Nghe | `listen_choice`, `listen_type` |
| Viết | `recall_type` |
| Phản xạ | trung vị `responseMs` của câu Tự nhớ làm đúng (`recallMedianByWeek`) |
| Trí nhớ | `retentionRate` |
| Nhịp học | số tuần đạt mục tiêu ngày học trên 8 tuần gần nhất |

- Chỉ số không có XP và không mở khoá gì. Chỉ số cần ít nhất 20 câu mới hiện, nếu chưa đủ thì ghi "Chưa đủ dữ liệu".
- Hồ sơ nhân vật (`EnLearnerProfile`): avatar, mục tiêu (giao tiếp, công việc, du lịch, thi cử), CEFR muốn đạt, số ngày học mỗi tuần (2–7, mặc định 4).

### 4.4 Quest: người học tự lái lộ trình

| Mẫu quest | Đo bằng | Ví dụ |
|---|---|---|
| `set_mastery` | số từ của bộ đang Đã nắm | Nắm 30 từ bộ Travel trong 10 ngày |
| `hold_words` | số mốc `hold_7d` nhận trong kỳ | Giữ vững 20 từ trong tháng này |
| `clear_mistakes` | Sổ từ sai về 0 (hoặc giảm N) | Dọn sạch Sổ trước Chủ nhật |
| `study_days` | số ngày học trong tuần | Học 4 ngày tuần này |

- Tiến độ quest **tính từ dữ liệu**, người học không tự tick. Quest có **0 XP**. Phần thưởng gắn kèm là phần thưởng đời thực do người học tự đặt (4.5).
- Quest `set_mastery` tự tách thành nhiệm vụ con: Đọc → Luyện lộ trình → **Kiểm tra từ ngày mai** → Dọn Sổ.
- Quest hết hạn mà chưa xong thì đổi trạng thái `ended`, không phạt gì, kèm gợi ý "Đặt lại với mục tiêu vừa sức hơn?".
- **Quest ngày mai**: từ đã luyện hôm nay hiện thành "Mai kiểm tra N từ này để chúng được tính". Đây là móc kéo người học quay lại, thay cho streak.

### 4.5 Phần thưởng và huy hiệu

- **Phần thưởng tự đặt** (`EnReward`): "Xem 1 tập phim khi lên Level 5", "Ăn bánh khi xong quest Travel". App chỉ báo "Đã mở khoá" và người học bấm "Đã nhận". Vì không có giá trị trong app, không có gì để gian lận.
- **Huy hiệu** tính từ dữ liệu, không cần bảng riêng: *Giữ vững 10 / 50 / 100 từ*, *Cứu 20 từ*, *4 tuần đạt nhịp học*, *Hoàn thành bộ đầu tiên*. Huy hiệu chỉ để ghi nhận, không cộng XP.

### 4.6 Nhịp tuần thay streak; nghỉ không bị phạt

- Hiện 7 ô ngày của tuần và vạch mục tiêu tự đặt. Không có ngọn lửa, không có "mất chuỗi".
- Ngày học = có Test nộp xong, **hoặc** phiên luyện có `activeSeconds ≥ 300` mà `senseIds` hợp lệ (đã vá H4).
- Nhật ký cuối ngày (tuỳ chọn): xem các mục trong ô *Today's Summary* ở mục 6. Không có XP.

### 4.7 Giữ bài Test sạch: minh bạch, không trừng phạt

Báo trước ở màn mở đầu Test:

> Phần 1 · Tự nhớ: bạn có thể sửa câu trả lời trong phần này. Khi sang Phần 2, phần 1 sẽ khoá. Ô gõ không nhận dán. Nếu rời trang khi đang làm Phần 1, các từ đó sẽ **không được tính lần này** và được kiểm tra lại sau. Bạn không mất gì.

| Biện pháp | Vá | Cách làm |
|---|---|---|
| **Test hai phần** | H1 | Lúc bắt đầu, server chỉ gửi câu `recall`. `POST /test/lock-recall` đặt `recallLockedAt`, rồi mới trả câu `recognize`. Sau khi khoá, `answerEnglishTest` từ chối sửa câu recall. Lưới số câu chỉ hiện các câu của phần đang làm |
| **Bỏ dở = đã gặp** | H2, H3 | Khi bài chuyển `abandoned` (do làm lại hoặc quá 24 giờ), áp `applyPracticeExposure` cho mọi từ **đã được gửi xuống client**. Bài làm lại trong cùng ngày vì vậy không được tính. Từ đã nắm không bị hạ, nhưng cũng không có XP và mốc giữ bị lùi lại |
| **Kiểm tra `senseIds` khi kết thúc luyện** | H4 | `startEnglishPractice` lưu `senseIds` của phiên. Lúc kết thúc chỉ chấp nhận tập con của danh sách đó |
| **Chặn dán, ghi lại việc rời trang** | H5 | `onPaste` bị chặn ở ô gõ. Sự kiện `visibilitychange` hoặc `blur` khi đang ở câu recall thì gửi `leftPage: true` kèm câu trả lời. Khi nộp bài, từ có `leftPage` nhận `counted = false`, `voidReason = 'left_page'` |
| **Nút "Tôi chưa nhớ"** | B4 | Ghi `answer = ''`, chấm như câu bỏ trống: sai, vào Sổ từ sai. Kết quả giống đoán sai, nhưng dữ liệu sạch hơn |
| **Thời gian không ảnh hưởng điểm** | H6 | `responseMs` chỉ dùng cho chỉ số Phản xạ |

---

## 5. Schema (migration chỉ thêm)

```prisma
enum EnXpKind { first_mastery hold_7d hold_30d }
enum EnQuestKind { set_mastery hold_words clear_mistakes study_days }
enum EnQuestStatus { active done ended }
enum EnLearnerGoal { communication work travel exam other }

model EnLearnerProfile {
  userId         String         @id
  avatarKey      String         @default("default")
  goal           EnLearnerGoal  @default(communication)
  targetCefr     EnCefr?
  weeklyDaysGoal Int            @default(4)   // 2..7
  totalXp        Int            @default(0)   // cache, cập nhật cùng transaction với EnXpEvent
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model EnXpEvent {
  id        String   @id @default(cuid())
  userId    String
  senseId   String
  kind      EnXpKind
  amount    Int
  attemptId String
  createdAt DateTime @default(now())
  @@unique([userId, senseId, kind])
  @@index([userId, createdAt])
}

model EnQuest {
  id          String        @id @default(cuid())
  userId      String
  kind        EnQuestKind
  setId       String?
  target      Int
  startDay    String        // YYYY-MM-DD giờ VN
  endDay      String
  status      EnQuestStatus @default(active)
  completedAt DateTime?
  createdAt   DateTime      @default(now())
  rewards     EnReward[]
  @@index([userId, status])
}

model EnReward {
  id          String    @id @default(cuid())
  userId      String
  title       String
  unlockLevel Int?      // hoặc gắn với quest
  questId     String?
  unlockedAt  DateTime?
  claimedAt   DateTime?
  createdAt   DateTime  @default(now())
  quest       EnQuest?  @relation(fields: [questId], references: [id], onDelete: SetNull)
  @@index([userId])
}

model EnDailyNote {               // Giai đoạn 4, tuỳ chọn
  userId String
  dayKey String
  note   String @default("")
  @@id([userId, dayKey])
}

// Thêm cột vào bảng có sẵn
model EnTestAttempt    { recallLockedAt DateTime? }
model EnTestItem       { servedAt DateTime?  leftPage Boolean @default(false) }
model EnTestWordResult { voidReason String? }   // 'left_page'
```

`EnPracticeSession.senseIds` đã có sẵn; đổi sang ghi lúc **bắt đầu** phiên thay vì lúc kết thúc.

---

## 6. Hàm thuần (`src/lib/english/gamify/`) và test

| File | Hàm |
|---|---|
| `xp.ts` | `xpEventsForResult(history, current, earned)` trả về danh sách mốc mới; `holdSince(history)` |
| `level.ts` | `levelFromXp(xp)`, `xpToNextLevel(xp)`, `titleFromMastered(n)` |
| `stats.ts` | `learnerStats(items, results, days, weeklyGoal, now)`, có ngưỡng ≥ 20 câu |
| `quest.ts` | `questProgress(quest, facts)`, `missionsForSetQuest(...)` |
| `week.ts` | `studyDaysThisWeek(sessions, attempts, now)` |

**Test (`src/lib/__tests__/`):**
- `enXp.test.ts`: từng mốc; trần 35 XP; quên rồi học lại không có lại mốc; property test I4 (chèn lần trượt không làm XP tăng); kết quả không counted thì 0 XP; mốc giữ đứt khi có lần trượt counted.
- `enTestLock.test.ts` (service, mock Prisma): không sửa được câu recall sau khi khoá; không lấy được câu recognize trước khi khoá.
- `enAbandonExposure.test.ts`: làm lại trong cùng ngày thì bài mới `counted = false`.
- `enLeftPage.test.ts`: `leftPage` dẫn tới `counted = false` và có `voidReason`.
- `enPracticeFinish.test.ts`: bỏ qua `senseIds` không thuộc phiên.
- `enLevel.test.ts`, `enQuest.test.ts`, `enStats.test.ts`.

---

## 7. Giao diện

| Màn | Nội dung |
|---|---|
| **Hôm nay** (trang chủ) | Thẻ nhân vật (Level + thanh XP + Danh hiệu). **Việc nên làm**: Sổ từ sai · từ luyện hôm qua đã sẵn sàng kiểm tra · từ đến hạn giữ. Nhịp tuần (7 ô). Quest đang chạy. Bộ từ đang học |
| **Kết quả Test** | "24/30 từ đạt". XP hiện **theo từng lý do**: "Giữ vững 7 ngày ×3 = +30". Từ không được tính có giải thích ("Luyện hôm nay" / "Bạn rời trang") kèm ngày kiểm tra lại. Khi lên cấp: hiệu ứng ngắn và phần thưởng tự đặt đã mở khoá |
| **Nhân vật** (thay trang Tiến bộ) | 6 chỉ số, mỗi chỉ số có tooltip "đo từ đâu". Biểu đồ số từ Đã nắm. Huy hiệu. Phần thưởng tự đặt |
| **Quest** | Tạo từ mẫu (chọn bộ, chỉ tiêu, hạn). Tiến độ và nhiệm vụ con |
| **Tổng kết hôm nay** | Đã giữ được từ nào · XP hôm nay · Chỉ số nào tăng · Quest ngày mai. Ghi chú tuỳ chọn |
| **Test** | Màn mở đầu có thông báo ở 4.7. Thanh tiến độ hiện hai phần. Nút "Tôi chưa nhớ" |

- **Thông điệp**: luôn gắn điểm với trí nhớ, không gắn với thao tác. Viết "Bạn giữ được 12 từ sau 7 ngày", không viết "Bạn kiếm được 120 điểm!".
- **Phong cách**: chỉ lớp trò chơi (XP, level, quest, rương thưởng, huy hiệu) dùng font và icon pixel (ví dụ *Pixelify Sans* cho con số). Thẻ từ và bài Test giữ kiểu chữ dễ đọc. Đổi tên `DESIGN.md` (đang ghi "Learn Chinese") cho bản tiếng Anh.

---

## 8. Thứ tự triển khai (mỗi bước một PR)

| GĐ | Nội dung | Xong khi |
|---|---|---|
| **0** | **Vá nền**: Test hai phần (H1), bỏ dở = đã gặp (H2, H3), kiểm tra `senseIds` (H4), chặn dán và ghi `leftPage` (H5), nút "Tôi chưa nhớ" | Test ở mục 6 cho H1–H5 pass; chạy tay luồng "xem trước → làm lại" và "sửa recall sau khi thấy recognize" đều bị chặn |
| 1 | `EnXpEvent`, `EnLearnerProfile`, XP trong `finishEnglishTest`, Level, màn Kết quả có XP, thẻ Hôm nay, `reviewPick` ưu tiên từ đến hạn giữ | `enXp.test.ts` (gồm I4) pass; idempotent khi nộp bài 2 lần |
| 2 | Nhân vật, 6 chỉ số, Danh hiệu, huy hiệu | `enStats.test.ts` pass; dữ liệu mẫu hiện đúng |
| 3 | Quest, nhiệm vụ con, Quest ngày mai, nhịp tuần | `enQuest.test.ts` pass |
| 4 | Phần thưởng tự đặt, Tổng kết hôm nay, ghi chú | QA trên trình duyệt |
| 5 | Màn admin theo dõi tín hiệu (mục 9), chỉnh số XP qua `EnTestBlueprint` hoặc bảng cấu hình | Admin xem được 4 tín hiệu |

---

## 9. Tín hiệu để biết hệ thống có đang thưởng đúng không (admin)

| Tín hiệu | Cảnh báo khi |
|---|---|
| XP/tuần so với tỷ lệ giữ | XP tăng nhưng tỷ lệ giữ giảm: điểm đang lệch khỏi trí nhớ |
| Tỷ lệ bài bỏ dở hoặc làm lại | > 20%: đề quá khó, hoặc người học đang dò đề |
| Tỷ lệ `left_page` của mỗi user | Tăng đột biến: có thể đang tra từ; hoặc trên mobile hay bị gián đoạn, khi đó cân nhắc nới luật |
| Tỷ lệ trượt ở mốc `hold_7d` so với `first_mastery` | Chênh lớn: lần đạt đầu có thể là nhớ tạm hoặc gian lận |

---

## 10. Cần chốt

1. **Luật `left_page`** (4.7): khuyến nghị áp dụng chặt (không tính lần này) và báo trước rõ ràng. Phương án nhẹ hơn là chỉ ghi lại để theo dõi, không ảnh hưởng gì.
2. **Số XP** 5 / 10 / 20 và mốc 7 / 30 ngày: có thêm mốc 90 ngày không?
3. **Trọng số theo CEFR** (từ C1 nhiều XP hơn A1): khuyến nghị **chưa làm**, để tránh việc chọn bộ chỉ để kiếm điểm.
4. **Nhịp tuần mặc định** 4 ngày.
