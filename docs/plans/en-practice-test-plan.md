# Spec: Luyện – Kiểm tra – Sổ từ sai cho module tiếng Anh (En*)

> Tài liệu để giao cho Cursor/GPT triển khai. Khi duyệt, file này được lưu thành `docs/plans/en-practice-test-plan.md`. Claude không viết code.
> Liên quan: `docs/plans/en-vocab-data-model-plan.md` (mô hình nội dung đã làm xong).

## 0. Bối cảnh

App hướng tới người lớn học để **giao tiếp**. "Biết một từ" nghĩa là: khi cần thì tự lôi ra được từ đó, sau một thời gian, đủ nhanh.

Module English hiện chạy SRS do máy điều khiển: `EnSenseSkill` gồm `dueAt`, `intervalIdx`, `EnStage`, và chia skill meaning/sound/usage. Bản spec này thay cơ chế đó bằng vòng do người học tự lái:

```
Đọc (Che nghĩa) → Luyện → Kiểm tra → Sổ từ sai → Luyện → Kiểm tra lại hôm sau
                            Tổng hợp (Test toàn bộ, ưu tiên từ sắp quên) — mỗi tuần
```

**Các quyết định đã chốt:**

| # | Quyết định |
|---|---|
| D1 | Luật "cách ≥ 1 ngày" là **bắt buộc**. Chỉ Test có tính mới đổi trạng thái "Đã nắm" |
| D2 | "1 ngày" = **khác ngày lịch theo giờ `Asia/Ho_Chi_Minh`**, không phải đủ 24 giờ |
| D3 | **Tổng hợp chạy dạng Test**: có đo, có cập nhật Đã nắm, sai thì vào Sổ từ sai |
| D4 | `EnPattern*` / `EnPatternProgress` **ngoài phạm vi**: giữ nguyên, không xoá, không đưa vào Luyện/Test |
| D5 | Không có XP, bảng xếp hạng, chuỗi ngày, bậc 1–6 lên/xuống |
| D6 | Không chấm phát âm. Luyện nói = nghe mẫu, ghi âm, tự so. Không lưu bản ghi âm |

## 1. Nguyên tắc

1. **Nghĩa (`EnSense`) là đơn vị.** Trên giao diện gọi là "từ". Mọi trạng thái người học gắn với `(userId, senseId)`.
2. **Practice ≠ Test.**
   - Practice: có phản hồi, có gợi ý. Chỉ ghi thời gian và danh sách từ đã gặp. Không ghi đúng/sai từng câu.
   - Test: không gợi ý, không phản hồi giữa bài. Ghi từng câu: đúng/sai, thời gian trả lời.
3. **Điểm Test tính theo TỪ.** Mỗi từ có 1 câu *Nhận ra* và 1 câu *Tự nhớ*. Đúng cả hai thì từ **Đạt**. Báo "24/30 từ đạt", không báo theo câu.
4. **Chấm ở server.** Khi Test bắt đầu, server sinh câu và lưu đáp án. Client không bao giờ nhận đáp án trước khi nộp bài.
5. **Câu hỏi sinh lúc chạy** từ nội dung, không lưu sẵn trong `EnQuestion`. Riêng Test lưu bản chụp của câu đã sinh (`EnTestItem.prompt`) để chấm và xem lại.
6. **Migration đầu chỉ thêm.** Cột và bảng cũ chỉ xoá ở bước dọn dẹp cuối (Bước 7).
7. Chuẩn chung của repo: logic nằm ở `src/services/english/`, test ở `src/lib/__tests__/`, API trả `{ ok: true, ... }` hoặc `{ ok: false, error }` qua `src/lib/api.ts`, chỉ mock Prisma ở test tầng service.

---

## 2. Nội dung từ — thay đổi (Bước 1)

Hầu hết đã có trong `EnWord`, `EnSense`, `EnExample`, `EnSenseHint`, `EnSenseRelation`. Chỉ cần sửa những chỗ sau:

### 2.1 Schema

```prisma
model EnSense {
  // ...giữ nguyên các trường cũ...
  chunks        Json  @default("[]")  // [{ text: "happy with + N", vi: "hài lòng với cái gì" }]
  commonErrors  Json  @default("[]")  // [{ wrong: "I happy.", right: "I'm happy.", whyVi: "Tính từ cần am/is/are." }]
  // collocations: GIỮ, đánh dấu deprecated, chỉ còn đọc khi backfill
  // pitfallVi:    GIỮ, hiển thị như "Ghi chú" nếu commonErrors rỗng
}

model EnSenseRelation {
  // ...giữ nguyên...
  contrast  Json  @default("[]")  // đúng 2 phần tử khi có: [{ lemma, en, vi }, { lemma, en, vi }]
  mistake   Json?                 // { wrong, right } — tuỳ chọn
}
```

Migration tên `2026102xxxxxxx_en_sense_chunks_errors`. Backfill trong cùng migration (SQL) hoặc bằng script `scripts/en-backfill-chunks.ts`: `chunks = collocations.map(text => ({ text, vi: "" }))` cho các nghĩa có `chunks = []`.

### 2.2 Gói import (`src/lib/english/contentValidation.ts`)

- Thêm `chunks: z.array({ text: string.min(1), vi: string }).max(EN_MAX_COLLOCATIONS)`. Nếu gói chỉ có `collocations` thì tự chuyển sang `chunks` (vi rỗng). Mục đích: gói cũ vẫn import được.
- Thêm `commonErrors: z.array({ wrong, right, whyVi }).max(5).default([])`. Ràng buộc: `wrong !== right`.
- `relations[]` loại `confusable` nhận thêm `contrast` (0 hoặc 2 phần tử) và `mistake`.
- **Gợi ý "Tôi là ai?": đúng 3, order 1..3, từ mơ hồ đến rõ.**
  - Đổi `EN_HINTS_RECOMMENDED` thành `EN_HINTS_REQUIRED = 3` trong `src/lib/english/constants.ts`.
  - Gói mới: thiếu hoặc thừa gợi ý thì **lỗi** (hiện chỉ là cảnh báo, ở khoảng dòng 368).
  - Nội dung đã có trong DB: không chặn import, nhưng `publishEnglishSet` (`enContentService.ts`) báo lỗi liệt kê các nghĩa chưa đủ 3 gợi ý.
- Luật phương án nhiễu (đã có ý trong demo, cần kiểm tra lại trong `questions.ts`): `distractorLemmas` **không được** chứa từ dễ nhầm (`EnSenseRelation.kind = confusable`) hay từ cùng họ (`EnWordFamilyMember`). Gói vi phạm thì lỗi.

### 2.3 Đọc nội dung

- `src/lib/english/senseBundle.ts`: trả thêm `chunks`, `commonErrors`, `contrast`, `mistake`.
- `src/lib/english/packPreview.ts`: hiển thị các trường mới.
- `src/lib/english/samplePack.ts`: cập nhật gói mẫu theo đúng thẻ `happy` trong demo.

**Xong Bước 1 khi:**
- Gói cũ import không lỗi.
- Gói mới thiếu gợi ý thì báo lỗi.
- `enContentValidation.test.ts` và `enSenseBundle.test.ts` có case cho cả 3 trường mới.

---

## 3. Dạng bài (Bước 2)

### 3.1 Registry trong code: `src/lib/english/activities/`

Mỗi dạng là một module riêng, cùng một interface:

```ts
type ActivityRole = 'recognize' | 'recall' | 'none';
interface Activity {
  key: ActivityKey;
  role: ActivityRole;
  build(sense: SenseBundle, ctx: { pool: DistractorPool; rng: Rng }): ActivityItem | null; // null = thiếu nội dung (vd. không có audio)
  grade?(item: ActivityItem, answer: string): boolean;  // không có với role 'none'
}
```

| key | Tên hiển thị | Vai | Practice | Test | Ghi chú |
|---|---|---|---|---|---|
| `meaning_choice` | Nhìn từ → chọn nghĩa | recognize | ✓ | ✓ | 4 phương án |
| `listen_choice` | Nghe → chọn nghĩa | recognize | ✓ | ✓ | cần `audioPath` (hoặc TTS) |
| `cloze_choice` | Điền vào câu (chọn) | recognize | ✓ | ✓ | dùng `EnExample` có `targetStart/Length` |
| `match_pairs` | Ghép cặp | recognize | ✓ | – | 5 cặp/lượt |
| `spell_hinted` | Nhìn nghĩa → viết từ (có chữ đầu + số chữ) | recall | ✓ | – | gợi ý tính lúc chạy |
| `recall_type` | Nhìn nghĩa hoặc câu đục lỗ → viết từ | recall | ✓ | ✓ | |
| `listen_type` | Nghe → viết từ | recall | ✓ | ✓ | |
| `speak_shadow` | Nghe mẫu, ghi âm, tự so | none | ✓ | – | không chấm, không lưu |

- Dùng lại `src/lib/english/questions.ts` (`blankFixedParts`, các builder `meaning_choice`, `listen_choice`, `listen_type`, `spell_type`, `usage_fill`) và `gradeEnglishAnswer` trong `src/lib/english/grade.ts` cho câu tự gõ (`alternatives`, `acceptedAnswers`, chuẩn hoá dấu nháy và khoảng trắng). Không viết lại logic chấm.
- Phương án nhiễu: ưu tiên `distractorLemmas`. Thiếu thì lấy từ cùng loại từ, cùng bộ. Không bao giờ lấy từ dễ nhầm hay cùng họ. **Trong Test, ưu tiên từ nằm ngoài bài Test** để không lộ đáp án của câu Tự nhớ.

### 3.2 Bảng admin

```prisma
model EnActivityType {
  key        String   @id          // khớp ActivityKey trong code
  label      String
  role       String                // 'recognize' | 'recall' | 'none' — chỉ đọc, seed từ code
  inPractice Boolean  @default(true)
  inTest     Boolean  @default(false)
  enabled    Boolean  @default(true)
  sortOrder  Int      @default(0)
  updatedAt  DateTime @updatedAt
}

model EnTestBlueprint {
  id             String   @id @default("default")   // một bản ghi duy nhất
  recognizeKinds String[] @default(["meaning_choice", "listen_choice", "cloze_choice"])
  recallKinds    String[] @default(["recall_type", "listen_type"])
  maxWords       Int      @default(30)   // Test bộ
  reviewWords    Int      @default(20)   // Tổng hợp ≈ 15 phút
  minGapDays     Int      @default(1)    // D1/D2
  updatedAt      DateTime @updatedAt
}
```

- Seed: tạo các dòng `EnActivityType` từ registry, và 1 dòng `EnTestBlueprint`.
- Validation khi admin lưu blueprint:
  - mỗi danh sách có ít nhất 1 dạng,
  - dạng phải có `inTest = true`, đúng `role`, và `enabled`,
  - `minGapDays` ≥ 1.

---

## 4. Dữ liệu người học (Bước 3)

### 4.1 Schema

```prisma
enum EnWordStatus { new practicing mastered }
enum EnRunMode    { set mistakes review }   // review = Tổng hợp
enum EnTestStatus { in_progress finished abandoned }

model EnWordState {                 // thay EnSenseSkill
  id              String       @id @default(cuid())
  userId          String
  senseId         String
  status          EnWordStatus @default(new)
  lastExposureAt  DateTime?    // lần gặp gần nhất: kết thúc Practice có từ này, hoặc nộp Test có từ này
  lastTestedAt    DateTime?
  masteredAt      DateTime?
  inMistakeBook   Boolean      @default(false)
  mistakeAddedAt  DateTime?
  updatedAt       DateTime     @updatedAt
  sense           EnSense      @relation(fields: [senseId], references: [id], onDelete: Cascade)
  @@unique([userId, senseId])
  @@index([userId, inMistakeBook])
  @@index([userId, lastExposureAt])
}

model EnPracticeSession {
  id            String     @id @default(cuid())
  userId        String
  mode          EnRunMode
  setId         String?
  activityKey   String?    // null = "lộ trình"
  senseIds      String[]   @default([])   // các từ đã gặp, gửi lên lúc kết thúc
  startedAt     DateTime   @default(now())
  endedAt       DateTime?
  activeSeconds Int        @default(0)    // client gửi, server kẹp ≤ endedAt − startedAt
  @@index([userId, startedAt])
}

model EnTestAttempt {
  id          String       @id @default(cuid())
  userId      String
  mode        EnRunMode
  setId       String?
  blueprint   Json         // bản chụp EnTestBlueprint lúc bắt đầu
  status      EnTestStatus @default(in_progress)
  startedAt   DateTime     @default(now())
  finishedAt  DateTime?
  wordCount   Int
  passedCount Int?
  items       EnTestItem[]
  words       EnTestWordResult[]
  @@index([userId, startedAt])
}

model EnTestItem {
  id          String        @id @default(cuid())
  attemptId   String
  senseId     String
  position    Int
  role        String        // recognize | recall
  activityKey String
  prompt      Json          // những gì client thấy (KHÔNG có đáp án)
  answerKey   String
  accepted    String[]      @default([])
  answer      String?
  correct     Boolean?
  responseMs  Int?          // client đo, server kẹp vào [0, 120000]
  answeredAt  DateTime?
  attempt     EnTestAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  @@unique([attemptId, position])
  @@index([attemptId, senseId])
}

model EnTestWordResult {
  id              String        @id @default(cuid())
  attemptId       String
  userId          String
  senseId         String
  passed          Boolean       // đúng cả 2 câu
  counted         Boolean       // thoả luật cách ngày
  priorExposureAt DateTime?     // chụp lúc bắt đầu Test, dùng để tính counted
  recallMs        Int?          // responseMs của câu Tự nhớ nếu đúng
  createdAt       DateTime      @default(now())
  attempt         EnTestAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  @@unique([attemptId, senseId])
  @@index([userId, senseId, createdAt])
  @@index([userId, counted, createdAt])
}
```

### 4.2 Luật (đặt trong `src/lib/english/` dưới dạng hàm thuần, dễ test)

**`vnDayKey(date)`**: trả `YYYY-MM-DD` theo `Asia/Ho_Chi_Minh` (dùng `Intl.DateTimeFormat`).

**`isCounted(priorExposureAt, testStartedAt, minGapDays)`**:
- Nếu `priorExposureAt` là null (chưa từng gặp) thì `true`.
- Ngược lại, `true` khi số ngày lịch VN giữa `vnDayKey(prior)` và `vnDayKey(start)` ≥ `minGapDays`.
- Ví dụ: luyện 23:30 ngày 1, Test 00:10 ngày 2 → **tính**. Luyện 08:00, Test 22:00 cùng ngày → **không tính**.

**Chuyển trạng thái khi nộp Test** (`applyTestResult(state, result, now)`):

| Kết quả | counted | Hệ quả |
|---|---|---|
| Đạt | có | `status = mastered`, `masteredAt = now`, `inMistakeBook = false` |
| Đạt | không | giữ `status`, nhãn "vừa học"; nếu đang trong Sổ thì **vẫn giữ trong Sổ** |
| Không đạt | có | `status = practicing`, `masteredAt = null`, `inMistakeBook = true`, `mistakeAddedAt ??= now` |
| Không đạt | không | `inMistakeBook = true`, `mistakeAddedAt ??= now`, giữ `status` |

Sau mọi trường hợp: `lastExposureAt = now`, `lastTestedAt = now`. Ngoài ra, `status` đang `new` thì chuyển thành `practicing`.

**Kết thúc Practice:** với mỗi `senseId` trong `senseIds`, đặt `lastExposureAt = now`. Nếu `status = new` thì chuyển thành `practicing`.

**Chấm từ:** `passed = recognize.correct && recall.correct`. Câu không trả lời tính là sai.

### 4.3 Sinh bài Test (`buildTest`)

1. Chọn từ:
   - **set**: các nghĩa trong bộ, theo `position`, cắt ở `maxWords`.
   - **mistakes**: các từ có `inMistakeBook`, cũ nhất trước, cắt ở `maxWords`.
   - **review**: xem 4.4.
2. Với mỗi từ, chọn ngẫu nhiên 1 dạng trong `recognizeKinds` và 1 dạng trong `recallKinds` mà `build` không trả null. Nếu không dựng được câu cho một vai thì **bỏ từ đó khỏi bài** và ghi log cảnh báo cho admin.
3. Sắp thứ tự:
   - trộn ngẫu nhiên,
   - với cùng một từ, **câu Tự nhớ đứng trước câu Nhận ra** (câu Nhận ra hiện chữ, nên sẽ lộ đáp án),
   - hai câu của cùng một từ không đứng liền nhau.
4. Chụp `priorExposureAt` của từng từ **lúc bắt đầu**, lưu vào `EnTestWordResult` khi nộp bài (có thể tạm giữ trong `EnTestAttempt.blueprint.prior`).
5. Bài đang `in_progress` quá 24 giờ thì chuyển `abandoned` khi người dùng mở Test mới. Bài `abandoned` không đổi trạng thái từ nào.

### 4.4 Chọn từ cho Tổng hợp

- Nhóm từ đủ điều kiện: mọi `EnWordState` của user có `status ≠ new`, thuộc bộ đã enroll, và nghĩa đang `published`.
- Thứ tự ưu tiên, lấy đủ `reviewWords` thì dừng:
  1. `inMistakeBook`, `mistakeAddedAt` cũ nhất trước;
  2. `lastExposureAt` cũ nhất trước (từ lâu chưa gặp);
  3. còn thiếu thì lấy ngẫu nhiên.
- Hàm thuần `pickReviewSenses(states, n, rng)`.

### 4.5 Luyện (Practice)

- Server trả bundle nội dung cho các từ (`senseBundle`), và vòng luyện chạy ở client.
- **Chế độ:**
  - chọn 1 dạng bài, hoặc
  - **lộ trình**: `meaning_choice` → `cloze_choice` → `spell_hinted` → `recall_type`; mỗi từ đúng ở một dạng thì sang dạng sau.
- **Khi sai:**
  - hiện đáp án đúng và lời giải thích (`commonErrors` hoặc `contrast` nếu có),
  - nút **"Tôi là ai?"** mở lần lượt gợi ý 1 → 3,
  - từ đó quay lại sau 3 câu.
- **Kết thúc:** khi mọi từ đã qua đủ, hoặc người học bấm Dừng. Client gửi `activeSeconds` (không tính lúc rảnh quá 60 giây) và `senseIds` đã gặp.
- Có nút "Luyện từ sai trong Sổ" (mode `mistakes`).

---

## 5. Theo dõi tiến bộ (Bước 6) — `src/services/english/enProgressService.ts`

| Chỉ số | Cách tính |
|---|---|
| **Số từ Đã nắm theo thời gian** (chỉ số chính) | Lấy các `EnTestWordResult` có `counted` của user, xếp theo thời gian, cộng dồn theo từng nghĩa (đạt thì +1, rớt thì −1). Trả chuỗi theo ngày VN trong 90 ngày gần nhất |
| **Tỷ lệ giữ** | Xét các cặp (kết quả counted đã **đạt**, kết quả counted **kế tiếp** của cùng nghĩa). Tỷ lệ = số cặp mà lần sau vẫn đạt / tổng số cặp, trong 90 ngày |
| **Thời gian trả lời** | Trung vị `responseMs` của các câu **Tự nhớ** làm đúng, theo tuần (8 tuần gần nhất) |
| **Thời gian học** | Tổng `activeSeconds` của Practice cộng `finishedAt − startedAt` của Test, theo tuần |

Viết các hàm tính thuần, tách khỏi phần truy vấn, để test được.

---

## 6. API (Bước 4) — `src/app/api/english/...`

Mọi route đều kiểm tra đăng nhập theo mẫu route hiện có, kiểm tra input bằng zod, và trả kết quả qua helper trong `src/lib/api.ts`. Trước khi viết route, đọc `node_modules/next/dist/docs/` (Next 16).

| Method | Route | Body / trả về |
|---|---|---|
| GET | `/sets/[setId]` | bundle các từ trong bộ, trạng thái từng từ, tóm tắt "x/y đã nắm" |
| POST | `/practice/start` | `{ mode, setId?, activityKey? }` → `{ sessionId, bundles }` |
| POST | `/practice/finish` | `{ sessionId, activeSeconds, senseIds }` → `{ ok }` |
| POST | `/test/start` | `{ mode, setId? }` → `{ attemptId, items: [{ id, position, activityKey, prompt }] }` (không có đáp án) |
| POST | `/test/answer` | `{ attemptId, itemId, answer, responseMs }` → `{ ok }` (**không** trả đúng/sai). Có thể gửi lại để sửa trước khi nộp |
| POST | `/test/finish` | `{ attemptId }` → `{ passedCount, wordCount, words: [{ senseId, passed, counted, items }] }` |
| GET | `/test/[attemptId]` | xem lại kết quả |
| GET | `/mistakes` | danh sách Sổ từ sai |
| GET | `/progress` | 4 chỉ số ở mục 5 |
| GET/PATCH | `/admin/activities` | bật/tắt dạng bài |
| GET/PATCH | `/admin/test-blueprint` | cấu trúc Test |

`/test/finish` chạy trong `prisma.$transaction`: chấm từng câu, ghi `EnTestWordResult`, áp `applyTestResult` cho từng `EnWordState`, rồi đặt `status = finished`. Gọi lại lần hai thì trả kết quả cũ (idempotent).

---

## 7. Giao diện (Bước 5) — `src/app/(english)/english/`

```
Trang chủ /english: danh sách Bộ từ, mỗi bộ hiện "Chưa học" | "Đang luyện" | "24/30 đã nắm"
  └─ /english/sets/[setId]  tab: Đọc · Luyện · Kiểm tra · Kết quả
Thanh dưới (EnglishShell): Bộ từ · Tổng hợp · Sổ từ sai · Tiến bộ
```

- **Đọc:** danh sách từ (lemma, phát âm, nghĩa). Nút **Che nghĩa** che toàn bộ nghĩa, chạm từng dòng để lật. Bấm vào từ thì mở thẻ đầy đủ, gồm các tab Cách nói, Phân biệt, Ví dụ, Tôi là ai? (bố cục theo demo).
- **Luyện:** chọn dạng hoặc "Lộ trình". Có phản hồi ngay và gợi ý như mục 4.5.
- **Kiểm tra:**
  - Màn mở đầu nói rõ: "30 từ · 60 câu · ~12 phút".
  - Nếu có từ luyện hôm nay: "Các từ luyện hôm nay sẽ được ghi là *vừa học*, không tính Đã nắm. Làm lại từ ngày mai để được tính."
  - Trong bài: không phản hồi; có thanh tiến độ; có nút quay lại câu trước.
- **Kết quả:**
  - "24/30 từ đạt".
  - Danh sách từ với nhãn Đạt / Chưa đạt / *vừa học*.
  - Từ chưa đạt có ghi "đã vào Sổ từ sai", kèm nút "Luyện các từ sai".
- **Tổng hợp:** một nút "Ôn tổng hợp (~15 phút)", chạy Test mode `review`.
- **Sổ từ sai:** danh sách, nút Luyện, nút Kiểm tra (mode `mistakes`). Từ được Kiểm tra trong ngày thì hiện "Kiểm tra lại từ ngày mai để được tính".
- **Tiến bộ:** 4 khối theo thứ tự mục 5. Biểu đồ chính là số từ Đã nắm.
- **Admin** (`EnglishAdmin.tsx`): thêm 2 tab Dạng bài và Cấu trúc Test.
- Không hiện XP, streak hay leaderboard trong layout `(english)`.
- Ghi âm (`speak_shadow`): dùng `MediaRecorder`, giữ trong bộ nhớ, phát lại ngay cạnh audio mẫu, không upload.
- Token màu và kiểu chữ: theo `DESIGN.md` và `.cursor/rules/ui-components.mdc`.

---

## 8. Thứ tự triển khai (mỗi bước một PR)

| Bước | Nội dung | Xong khi |
|---|---|---|
| 1 | Nội dung: `chunks`, `commonErrors`, `contrast`/`mistake`, đúng 3 gợi ý, luật phương án nhiễu (mục 2) | Gói cũ vẫn import được; test validation và bundle pass |
| 2 | Registry dạng bài, `EnActivityType`, `EnTestBlueprint`, seed (mục 3) | Mỗi dạng có test `build` trả null khi thiếu nội dung; chấm dùng `grade.ts` |
| 3 | Bảng người học, luật thuần, các service `enPracticeService`, `enTestService`, `enWordStateService` (mục 4) | Các test ở mục 9 pass |
| 4 | API (mục 6) | Gọi tay qua curl ở localhost:3001 theo đúng luồng |
| 5 | Giao diện (mục 7) | Chạy hết luồng QA ở mục 9 trên trình duyệt |
| 6 | Tiến bộ (mục 5) | Test hàm tính thuần pass; trang hiển thị đúng với dữ liệu mẫu |
| 7 | Dọn dẹp | Xem chi tiết bên dưới |

**Bước 7 gồm:**
- Xoá `EnSenseSkill`, `EnStage` và cột `intervalIdxBefore`.
- Xoá các route và trang `session`, `answer`, `review` (cũ), `weak`, `learn` cùng `sessionPlan.ts`, `stage.ts`, `progress.ts`, sau khi kiểm tra không còn import nào.
- Xoá cột `collocations`.
- Giữ `EnQuestion`, `EnAnswerLog`, `EnDispute` nếu admin còn dùng màn tranh chấp. Nếu không thì để PR riêng.

**Xong Bước 7 khi:** `npm run quality` xanh và không còn tham chiếu nào tới các phần đã xoá.

---

## 9. Kiểm thử

**Unit (Vitest, `src/lib/__tests__/`):**
- `enGapRule.test.ts`: `vnDayKey` ở mốc 23:59/00:00 giờ VN; `isCounted` với prior null, cùng ngày, khác ngày, `minGapDays = 2`.
- `enWordState.test.ts`: đủ 4 dòng của bảng chuyển trạng thái; `new` thành `practicing`; Sổ từ sai giữ nguyên khi đạt nhưng không được tính.
- `enTestBuild.test.ts`:
  - mỗi từ đúng 1 câu recognize và 1 câu recall,
  - recall đứng trước recognize, không liền nhau,
  - bỏ từ khi không dựng được câu,
  - phương án nhiễu không chứa từ dễ nhầm hay cùng họ, ưu tiên từ ngoài bài,
  - `prompt` không chứa `answerKey`.
- `enTestScoring.test.ts`: chỉ đạt khi đúng cả hai câu; câu bỏ trống tính sai; `finish` gọi lại vẫn ra kết quả cũ.
- `enReviewPick.test.ts`: thứ tự Sổ từ sai → lâu chưa gặp → ngẫu nhiên; lấy đủ `n`.
- `enProgressMetrics.test.ts`: chuỗi Đã nắm cộng dồn (có từ rớt); tỷ lệ giữ chỉ tính cặp counted; trung vị thời gian chỉ lấy câu recall làm đúng.
- Test service mock `@/lib/prisma` theo mẫu `enAnswerService.test.ts`.

**QA thủ công** (thêm `docs/testing/english-practice-test.md`):
1. Import gói mẫu, publish, enroll.
2. Đọc với Che nghĩa → Luyện lộ trình, cố ý sai để thấy gợi ý "Tôi là ai?".
3. Kiểm tra ngay trong ngày: kết quả có nhãn *vừa học*, số Đã nắm không đổi, từ sai vào Sổ.
4. Đổi giờ hệ thống hoặc sửa `lastExposureAt` trong DB sang hôm qua, rồi Kiểm tra lại: từ đạt thành Đã nắm và ra khỏi Sổ.
5. Tổng hợp: từ trong Sổ xuất hiện trước.
6. Trang Tiến bộ hiện đủ 4 chỉ số.
7. Admin tắt `listen_choice` và bỏ khỏi blueprint: Test mới không còn dạng này.

**Lệnh:** `npm run typecheck`, `npm test`, `npm run quality`.
