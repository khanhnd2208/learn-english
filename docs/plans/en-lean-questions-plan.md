# Kế hoạch: Tối giản dạng câu hỏi và schema nội dung (Learn English)

> Ngày 2026-10-28. Người thực hiện: Codex. Repo: `learn-english`.
> Bước đầu tiên: chép file này vào `docs/plans/en-lean-questions-plan.md` và commit cùng code.
> **Số dòng trong file này lấy từ code ngày 2026-10-28 và có thể đã lệch. Luôn `grep` theo tên, đừng dựa vào số dòng.**

## 0. Context: vì sao làm

Dữ liệu từ vựng do AI tạo nên có nhiều rủi ro sai: câu ví dụ có chỗ trống mà nhiều từ cùng điền được, nghĩa Việt ứng với nhiều từ Anh, gợi ý, cụm từ và quan hệ từ chưa ai soát kỹ. Khi những câu hỏi dựa trên dữ liệu này được dùng để tăng hoặc hạ box SRS, người học có thể **bị phạt oan**.

Mục tiêu (đã chốt với chủ repo):

1. **SRS chỉ có MỘT dạng câu hỏi:** hiện nghĩa tiếng Việt và từ loại, người học gõ từ tiếng Anh.
   - Box 0–2: có gợi ý chữ đầu và số chữ cái.
   - Box ≥ 3: không có gợi ý, ô nhập không lộ độ dài.

   Dạng này chỉ dựa vào `lemma` và `meaningVi`, là hai trường an toàn nhất.
2. **Mọi chế độ ngoài SRS** (Luyện bộ từ, Quiz, Ôn theo bộ / ôn luân phiên) chỉ dùng **3 dạng**:
   - Chọn nghĩa (`meaning_choice`).
   - Nghe → viết (`listen_type`). Hiện kèm nghĩa Việt để từ đồng âm hết mơ hồ.
   - Điền câu (`cloze_choice`). **Chỉ dùng câu ví dụ `role = grade`.**
3. **Các dạng còn lại bị xoá** (`listen_choice`, `match_pairs`, `spell_hinted` dạng riêng, `recall_type`, `speak_shadow`). Sau này sẽ làm lại thành phần Game riêng, không thuộc kế hoạch này.
4. **Schema nội dung tối giản:** bỏ 4 bảng, 8 enum và khoảng 35 cột. Thêm `EnSense.synonyms` để không phạt oan khi người học gõ từ đồng nghĩa, và `EnSense.noteVi` (một lưu ý ngắn).
5. **Xoá toàn bộ dữ liệu tiếng Anh hiện có** (bộ từ và tiến độ học). Chủ repo đã đồng ý rõ ràng: dữ liệu hiện tại không quan trọng.

Các quyết định đã chốt:
- Một giọng duy nhất là **Anh-Mỹ (US)**.
- **Giữ cả 4 chế độ**, chỉ thu gọn dạng câu.
- **Bỏ hẳn CEFR** (cả enum `EnCefr` và bộ lọc trình độ ở Thư viện).

---

## 1. Chuẩn bị

```bash
git switch main && git pull
git switch -c codex/lean-question-types
```

- Làm toàn bộ trên **một nhánh, một PR**, commit theo từng giai đoạn bên dưới (mỗi giai đoạn một commit trở lên).
- Đọc `node_modules/next/dist/docs/` trước khi đụng tới route hoặc framework, theo `AGENTS.md`.
- Không sửa khối "This is NOT the Next.js you know" trong `AGENTS.md`.

---

## 2. Giai đoạn A: Schema và migration

### A1. Sửa `prisma/schema.prisma`

**Xoá enum:** `EnCefr`, `EnEntryType`, `EnRegister`, `EnRegion`, `EnContentOrigin`, `EnHintKind`, `EnRelationKind`, `EnConfusableType`, `EnFamilyKind`.

**Xoá model:** `EnSenseHint`, `EnSenseRelation`, `EnWordFamily`, `EnWordFamilyMember`. Xoá luôn các back-relation `hints`, `relations`, `relatedFrom` trên `EnSense` và `familyLinks` trên `EnWord`.

**`EnWord` sau khi sửa:**
```prisma
model EnWord {
  id           String          @id @default(cuid())
  lemma        String
  lemmaKey     String          @unique
  partOfSpeech String          @default("")
  ipa          String          @default("")   // IPA giọng US
  audioPath    String          @default("")   // audio giọng US
  forms        String[]        @default([])   // các dạng chấp nhận khi chấm: decided, decides, colour...
  status       EnContentStatus @default(draft)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  senses       EnSense[]

  @@index([status])
  @@index([lemma])
}
```
Bỏ: `stress`, `entryType`, `ipaUk`, `ipaUs`, `syllables`, `stressIndex`, `inflections`, `frequencyRank`, `cefr`, `audioUkPath`, `audioUsPath`, cùng các index `cefr` và `frequencyRank`.

**`EnSense` sau khi sửa:**
```prisma
model EnSense {
  id           String          @id @default(cuid())
  wordId       String
  senseKey     String?         @unique
  meaningVi    String
  partOfSpeech String          @default("")
  /// Từ tiếng Anh gần nghĩa mà người học có thể gõ khi nhìn meaningVi. Gõ trúng: không thưởng, không phạt.
  synonyms     String[]        @default([])
  /// Một lưu ý ngắn tiếng Việt (bẫy hay gặp, ngữ pháp). Có thể để trống.
  noteVi       String          @default("")
  status       EnContentStatus @default(draft)
  sortOrder    Int             @default(0)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  word         EnWord          @relation(fields: [wordId], references: [id], onDelete: Cascade)
  examples     EnExample[]
  wordStates   EnWordState[]
  setItems     EnSetItem[]

  @@index([wordId])
  @@index([status])
}
```
Bỏ: `pitfallVi`, `chunks`, `commonErrors`, `distractorMeanings`, `distractorLemmas`, `isPrimary`, `definitionEn`, `definitionEnSimple`, `cefr`, `register`, `region`, `topics`, `grammarTags`, `grammarNoteVi`, `ipaOverride`, `stressIndexOverride`, `imagePath`, `imageAlt`.

**`EnExample` sau khi sửa:**
```prisma
model EnExample {
  id           String          @id @default(cuid())
  senseId      String
  english      String
  meaningVi    String          @default("")
  target       String
  targetStart  Int?
  targetLength Int?
  /// study = chỉ hiển thị trên thẻ từ; grade = được dùng cho dạng Điền câu.
  role         EnExampleRole   @default(study)
  status       EnContentStatus @default(draft)
  sortOrder    Int             @default(0)
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  sense        EnSense         @relation(fields: [senseId], references: [id], onDelete: Cascade)

  @@index([senseId, status, role])
}
```
Bỏ: `audioPath`, `alternatives`, `ambiguityNote`, `targetTag`, `cefr`, `origin`, `sourceNote`.

Giữ nguyên các bảng người học (`EnWordState`, `EnReview`, `EnPracticeSession`, `EnGuidedReview*`, `EnTestAttempt`, `EnTestItem`, `EnXpEvent`, `EnQuestBoard`, `EnAchievement`, `EnLearnerProfile`, `EnReviewPreference`, `EnSet`, `EnSetItem`, `EnEnrollment`). Chỉ xoá dữ liệu bên trong.

### A2. Tạo migration `prisma/migrations/20261029000000_en_lean_content/migration.sql`

1. Chạy `npx prisma migrate dev --create-only --name en_lean_content`, rồi đổi tên thư mục theo mẫu `YYYYMMDDhhmm00_snake_name` (`20261029000000_en_lean_content`).
2. **Chèn lên đầu file** (trước mọi lệnh `ALTER`/`DROP`), theo kiểu ghi chú của `20261026007000_drop_legacy_learning`:
   ```sql
   -- Lean content (docs/plans/en-lean-questions-plan.md).
   -- The owner approved wiping all English content and learner progress: start fresh with v3 packs.
   TRUNCATE TABLE
     "EnGuidedReviewQuestion", "EnGuidedReviewSession",
     "EnTestItem", "EnTestAttempt",
     "EnReview", "EnWordState", "EnPracticeSession",
     "EnXpEvent", "EnQuestBoard", "EnAchievement",
     "EnLearnerProfile", "EnReviewPreference",
     "EnEnrollment", "EnSetItem", "EnSet",
     "EnExample", "EnSenseHint", "EnSenseRelation",
     "EnWordFamilyMember", "EnWordFamily",
     "EnSense", "EnWord"
   CASCADE;
   ```
3. Kiểm tra phần SQL Prisma sinh ra:
   - drop FK, rồi drop bảng, drop cột, drop index;
   - `ADD COLUMN "synonyms" TEXT[] DEFAULT ARRAY[]::TEXT[]` và `"noteVi" TEXT NOT NULL DEFAULT ''`;
   - drop enum **sau** khi đã drop các cột dùng enum đó.
4. Chạy `npx prisma migrate dev` trên DB local, `npx prisma generate`, rồi `npm run db:migrate:status` phải sạch.

> Production tự chạy `prisma migrate deploy` khi khởi động (`docker-entrypoint.sh`). Xem mục 9 về sao lưu trước khi merge.

---

## 3. Giai đoạn B: Lớp dữ liệu (`senseBundle`, validator, prompt AI, import, publish)

### B1. `src/lib/english/senseBundle.ts`

- `BundleExample` = `{ id, english, meaningVi, target, targetStart, targetLength, role: 'study' | 'grade', sortOrder }`.
  - **Thêm `role`.**
  - Bỏ `targetTag`, `cefr`, `audioPath`.
- `SenseBundle.sense` = `{ id, senseKey, meaningVi, partOfSpeech, synonyms, noteVi }`.
- `SenseBundle.word` = `{ id, lemma, lemmaKey?, partOfSpeech, ipa, audioPath, forms }`. Giữ đúng các khoá hiện có mà UI vẫn cần.
- **Xoá khỏi `SenseBundle`:** `hints`, `relations`, `families`.
- **Xoá type và hàm:** `BundleHint`, `SenseChunk`, `SenseCommonError`, `SenseContrastSide`, `SenseMistake`, `BundleRelation`, `BundleFamilyMember`, `BundleFamily`, `asChunks`, `asCommonErrors`, `asContrast`, `asMistake`, `asInflections`, `RuntimeHint`, `runtimeHints`.
- `SenseBundleSource` và `toSenseBundle`: chỉ map các trường còn lại. Ví dụ vẫn lọc `status === 'published'` và sort theo `sortOrder`. Nhớ map thêm `role`.
- `clozeOf` và `exampleParts`: bỏ `targetTag` khỏi input. Bỏ `tag` khỏi `ClozeParts`.
- `enContentService.ts` → `senseBundleInclude`: bỏ include `familyLinks`, `hints`, `relations`.

### B2. Định dạng pack v3 (`src/lib/english/contentValidation.ts`)

Viết lại schema zod. **Định dạng duy nhất được chấp nhận:**
```jsonc
{
  "title": "Đồ ăn",
  "description": "",
  "packVersion": 3,
  "audioFiles": ["borrow.mp3"],
  "words": [
    {
      "lemma": "borrow",
      "senseKey": "borrow.v.take_temporarily",
      "partOfSpeech": "verb",
      "ipa": "/ˈbɑːroʊ/",                 // IPA giọng US, dạng /.../
      "audioFile": "borrow.mp3",
      "forms": ["borrows", "borrowed", "borrowing"],
      "meaningVi": "mượn",
      "synonyms": [],                     // từ Anh người học có thể gõ khi thấy "mượn"
      "noteVi": "borrow = mượn VỀ mình; lend = cho mượn.",
      "examples": [
        {
          "english": "Can I borrow your pen?",
          "meaningVi": "Mình mượn bút của bạn được không?",
          "target": "borrow",
          "targetStart": 6,               // không bắt buộc nếu target chỉ xuất hiện đúng 1 lần
          "gradable": true
        }
      ]
    }
  ]
}
```

- Pack có `packVersion !== 3`, hoặc có khoá không còn dùng (`hints`, `relations`, `families`, `chunks`, `ipaUk`…), sẽ bị **chặn** kèm thông báo: "Pack định dạng cũ. Hãy tạo lại theo prompt v3." Không viết phần chuyển đổi trong runtime.
- Dùng `.strict()` ở cấp word và example để AI không lén thêm trường.

**Luật chặn xuất bản (blocker):**

| Mã | Luật |
|---|---|
| `lemma` | không rỗng |
| `sense_key` | khớp `SENSE_KEY_RE` hiện có |
| `part_of_speech` | không rỗng |
| `meaning_vi` | không rỗng |
| `ipa` | khớp `IPA_RE` (`/.../`) |
| `audio` | `audioFile` có trong `audioFiles` (giữ helper `audioListed`) |
| `synonym_self` | `synonyms` không được chứa lemma hoặc một `forms` của nó (so bằng `lemmaKeyOf`) |
| `synonym_count` | tối đa `EN_MAX_SYNONYMS = 8` |
| `examples_count` | 1 đến `EN_MAX_EXAMPLES_PER_WORD` câu |
| `target_offset_mismatch` / `target_ambiguous` | giữ logic hiện có (`locateTarget`, `blankReport`) |
| `word_form` | `target` phải là lemma hoặc một `forms` (so bằng `lemmaKeyOf`) |
| `meaning_vi` (example) | câu `gradable` phải có `meaningVi` đầy đủ (`isFullVietnameseMeaning`) |
| `duplicate_sense_key` | giữ nếu đang có |

**Cảnh báo (không chặn):**
- `no_grade_example`: từ không có câu `gradable`. Dạng Điền câu sẽ bỏ qua từ này.
- `note_too_long`: `noteVi` dài hơn 200 ký tự.

**Xoá:** mọi luật về hints, relations, families, chunks, collocations, commonErrors, distractors, definition, cefr, topics, grammarTags, inflections, syllables, stress, alternatives, stillPlausible, adminCleared, cùng `wordMarksNewPack`, `packIsNew`, `familyLemmasFor` và các mã trong `OPTIONAL_FIELD_CODES` không còn dùng.

`normalizeEnglishPack`:
- trim mọi chuỗi;
- dedupe `forms` và `synonyms` bằng `uniqueTexts`;
- bỏ `synonyms` trùng lemma;
- sort ví dụ theo thứ tự trong pack.

**`role` của ví dụ:** `gradable === true` **và** không dính blocker nào thì là `grade`, còn lại là `study`. Không có cờ nào khác.

### B3. `src/lib/english/constants.ts`

- **Xoá:** `EN_ALTERNATIVES_REQUIRED`, `EN_MAX_COLLOCATIONS`, `EN_MAX_CHUNKS`, `EN_MAX_COMMON_ERRORS`, `EN_HINTS_REQUIRED`, `EN_CEFR_LEVELS`, `EN_TOPICS`, `EN_GRAMMAR_TAGS`, `EN_INFLECTION_TAGS`, `EN_USAGE_MIN_GRADE_EXAMPLES`.
- **Thêm:**
  ```ts
  /** Box cao nhất còn được gợi ý chữ đầu và số chữ cái khi ôn SRS. */
  export const EN_HINT_MAX_BOX = 2;
  export const EN_MAX_SYNONYMS = 8;
  ```
- **Xoá file** `src/lib/english/cefr.ts`.

### B4. Prompt AI: `src/lib/english/aiPackPrompt.ts` và `docs/content/ai-pack-prompt.md`

- `AI_PACK_PROMPT_EXAMPLE`: thay bằng **một** từ v3 hoàn chỉnh (ví dụ `belonging`, 2–3 câu ví dụ, ít nhất 1 câu `gradable: true`). Đây là dữ liệu mẫu để test, phải xuất bản được.
- `RULES`: viết lại ngắn gọn bằng tiếng Việt, gồm:
  1. Mỗi mục `words` là **một nghĩa**. `meaningVi` ngắn, đúng nghĩa đó, không liệt kê nhiều nghĩa.
  2. `ipa` và `audioFile` theo **giọng Mỹ**. `forms` liệt kê mọi dạng biến đổi, kèm biến thể chính tả Anh (colour) nếu có.
  3. **`synonyms` quan trọng nhất:** liệt kê **mọi** từ tiếng Anh mà một người Việt có thể gõ khi chỉ nhìn `meaningVi` và từ loại. Thà thừa còn hơn thiếu.
  4. `noteVi`: tối đa 1 câu, chỉ khi có bẫy thật. Không thì để `""`.
  5. Ví dụ: 2–3 câu tự nhiên, ngắn, trình độ phổ thông. `target` là đúng chuỗi xuất hiện trong câu.
  6. `gradable: true` **chỉ khi** nhìn câu tiếng Anh có chỗ trống kèm bản dịch Việt thì **chỉ một từ duy nhất** điền được tự nhiên. Phân vân thì để `false`.
  7. Không thêm bất kỳ trường nào ngoài mẫu.
- Cập nhật `docs/content/ai-pack-prompt.md` cho khớp (bảng tab cũ không còn nữa).

### B5. `src/lib/english/samplePack.ts` và các pack JSON

- `samplePack.ts`: viết lại 4 từ (borrow, lend, return, keep) theo v3. Xoá helper `gradeExample` và `hints`.
- Chuyển các pack JSON sang v3:
  - `docs/testing/english-sample-packs/*.json` (daily-life-15, school-15, work-15, food, travel);
  - `docs/content/english-packs/motivation-leadership.json`.

  Viết **script tạm** ở thư mục scratch (không commit) theo mapping:

  | v3 | Lấy từ dữ liệu cũ |
  |---|---|
  | `ipa` | `ipaUs` hoặc `ipa` |
  | `audioFile` | giữ nguyên |
  | `forms` | `forms` ∪ các form trong `inflections` |
  | `synonyms` | các `relations` có `kind = 'synonym'` (lấy `lemma`) |
  | `noteVi` | `pitfallVi`, nếu trống thì `grammarNoteVi` |
  | `examples[].gradable` | `stillPlausible` rỗng **và** `alternativesTried.length >= 5` (đúng luật cũ) |

  Bỏ mọi khoá khác, đặt `packVersion: 3`. Chạy `assessEnglishPack` trên từng file sau khi chuyển: không được có blocker.

### B6. `src/services/english/enContentService.ts`

- `wordCreate` / `wordPatch`: chỉ ghi `lemma`, `lemmaKey`, `partOfSpeech`, `ipa`, `audioPath`, `forms`, `status`.
- `senseCreate` / `sensePatch`: chỉ ghi `meaningVi`, `partOfSpeech`, `senseKey`, `synonyms`, `noteVi`, `status`, `sortOrder`.
- `exampleWrite`: ghi `english`, `meaningVi`, `target`, `targetStart`, `targetLength`, `role`, `sortOrder`.
- `saveEnglishPack`: **xoá** toàn bộ phần hints, relations (gồm `resolveTargetSenseId` và reverse relations), families và members. Xoá `reverseKind`.
- `publishEnglishSet`:
  - bỏ include `familyLinks`, `hints`, `relations`;
  - kiểm tra audio chỉ còn audio của từ;
  - phần dựng lại pack để đánh giá trước khi publish chuyển sang v3 (role `grade` thành `gradable: true`);
  - **xoá đoạn tính `word.cefr = lowestCefr(...)`**;
  - bỏ publish hints và families.
- Bỏ import `lowestCefr`, `asChunks`, `asCommonErrors`, `asContrast`, `asMistake`.

### B7. Các service và lib khác

- `src/lib/english/packPreview.ts`: DTO preview chỉ còn các trường v3. Thêm danh sách **"Câu dùng để chấm"**: các ví dụ có `gradable`, in đậm, để admin đọc kỹ trước khi Lưu hoặc Xuất bản. Đây là bước soát thủ công duy nhất cần làm.
- `src/services/english/enCatalogService.ts`: bỏ `levels` và `topics` khỏi `EnglishSetSummary` và khỏi select.
- `src/services/english/enAudioService.ts`:
  - audio của từ chỉ dùng `audioPath`;
  - audio của câu ví dụ (`/api/audio?exampleId=`) luôn dùng TTS của `english`, bỏ việc đọc `EnExample.audioPath`.
- **Xoá file:** `src/lib/english/relationBackfill.ts`, `scripts/en-backfill-relations.ts`.
- `scripts/seed-english-sample-sets.ts` và `scripts/import-english-pack.ts`: bỏ ghi `distractorMeanings`/`distractorLemmas`, `audioUkPath`/`audioUsPath` và `audioPath` của ví dụ.
- `scripts/verify-english-transfer.ts` và `docs/migration.md`: bỏ 4 bảng đã xoá (và các bảng `EnPattern*`/`EnQuestion` đã cũ) khỏi danh sách bảng.

---

## 4. Giai đoạn C: SRS hằng ngày, một dạng duy nhất

### C1. `src/services/english/enDailyService.ts`

- **Xoá** type `DailyPrompt` và `DailyCloze`, hàm `promptFor` và `hasAudio` (nếu chỉ phục vụ `promptFor`).
- `DailyItem` thành:
  ```ts
  export type DailyItem = {
    senseId: string;
    kind: 'review' | 'new';
    box: number;                                              // 0 cho từ mới
    hint: { firstLetter: string; letterCount: number } | null; // null khi box > EN_HINT_MAX_BOX
    layout: AnswerLayout;                                     // answerLayout(lemma), dùng khi có hint
    bundle: SenseBundle;
  };
  ```
- `startToday`:
  - `box = item.kind === 'new' ? 0 : item.state.box`;
  - `hint = box <= EN_HINT_MAX_BOX ? hintFor(lemma) : null`. Cách tính `firstLetter` và `letterCount` giống hàm `spellHinted` cũ trong registry: bỏ khoảng trắng và gạch nối khi đếm, `firstLetter` là chữ cái đầu;
  - đặt `hintFor` trong `src/lib/english/` (ví dụ `srsPrompt.ts`) để test được;
  - `EnPracticeSession.activityKey`: ghi `'srs_type'`.
- `acceptedAnswers(bundle)`: **chỉ còn `bundle.word.forms`**, bỏ `examples.target` vì SRS không còn hỏi bằng câu.
- `answerToday`:
  - input bỏ `prompt` (route vẫn nhận `prompt` không bắt buộc và bỏ qua nó, để client cũ không bị lỗi 400);
  - thứ tự xử lý:
    1. `giveUp` → sai.
    2. Đúng (lemma hoặc `forms`, qua `gradeEnglishAnswer`) → như hiện tại.
    3. **Mới:** nếu `normalizeLearnerText(answer)` khớp một `synonyms` (đã normalize) → trả về `{ result: 'synonym', expected: '', boxBefore, boxAfter: boxBefore, scheduled: false, ... }`. **Không ghi `EnWordState`, `EnReview` hay XP.** Không giới hạn số lần.
    4. Gần đúng (`isNearMiss`, chưa `typoChecked`) → `'near'`, như hiện tại.
    5. Còn lại → sai, chạy `scheduleMove` như hiện tại.
  - `DailyAnswerResult.result`: thêm `'synonym'`.
  - `EnReview.prompt`: ghi `'hinted'` nếu box lúc hỏi ≤ `EN_HINT_MAX_BOX`, ngược lại `'free'`. Tính lại box từ `state` ở server, không tin client.
- `src/app/api/daily/answer/route.ts`:
  - zod: `prompt: z.string().max(20).optional()` (bỏ qua giá trị);
  - `reward: null` khi `result` là `'near'` **hoặc** `'synonym'`.

### C2. `src/components/english/StudySession.tsx`

- **Xoá:** nhánh listen (audio tự phát, nút "Không nghe được?", state `listenFallback`), nhánh cloze, `ipaOf`, `hasAudio` cũ.
- Màn câu hỏi chỉ còn: `meaningVi` cỡ lớn, `(partOfSpeech)`, banner "từ mới" giữ nguyên với `kind === 'new'`, và ô nhập:
  - có `step.hint`: `WordAnswerInput layout={step.layout} firstLetter={step.hint.firstLetter}` kèm dòng "Bắt đầu bằng **d** · 6 chữ cái";
  - không có hint: `WordAnswerInput freeText` (xem C3).
- Kết quả `synonym`: giữ ô nhập, xoá chữ đã gõ, hiện thông báo trung lập (màu info, không phải đỏ): "**{answer}** cũng đúng nghĩa, nhưng từ cần ôn là một từ khác. Thử lại nhé." Có hint thì nhắc thêm chữ đầu. Không đổi điểm, không đổi tiến độ.
- Kết quả sai: hiện đáp án như hiện tại, rồi **bắt gõ lại đúng từ một lần** (chỉ ở client, không gửi lên server) thì nút "Tiếp" mới bật. Dùng lại `WordAnswerInput` với layout của lemma. Gõ lại đúng `normalizeLearnerText(lemma)` hoặc một form là được.
- `WordDetails` (phần phản hồi): `meaningVi`, tối đa 2 câu ví dụ (mọi role), `noteVi` (nếu có) trong khung cảnh báo như `pitfallVi` cũ. Bỏ `definitionEnSimple`.

### C3. `src/components/english/WordAnswerInput.tsx`

- Thêm prop `freeText?: boolean`. Khi `true`, render một `<input>` văn bản thường: không ô chữ, không đếm "x/N chữ", không giới hạn độ dài theo layout. `layout` thành không bắt buộc khi `freeText`.
- Giữ nguyên `autoFocus`, `inputRef`, `disabled`, Enter để gửi, và style/token đang dùng trong file.
- Luôn tắt `autocomplete`, `autocorrect`, `spellcheck`.

---

## 5. Giai đoạn D: Ba dạng cho mọi chế độ ngoài SRS

### D1. `src/lib/english/activities/`

- `types.ts`:
  - `ACTIVITY_KEYS = ['meaning_choice', 'listen_type', 'cloze_choice'] as const`;
  - `ActivityRole = 'recognize' | 'recall'`;
  - `ActivityContext` bỏ `recallPrompt`;
  - `ActivityDefinition` bỏ `inPractice`, `inTest`, `sortOrder` (không ai đọc) và làm `grade` bắt buộc.
- `registry.ts`:
  - **xoá** `listenChoice`, `matchPairs`, `pairKey`, `gradePairs`, `spellHinted`, `recallType`, `speakShadow`, `lemmaOptions` (nếu chỉ còn cloze dùng thì giữ);
  - `hasAudio(sense)` = `Boolean(sense.word.audioPath.trim())`;
  - `meaningChoice`: `ipa: sense.word.ipa`;
  - `clozeExamples(sense)`: **chỉ `example.role === 'grade'`**;
  - `listenType`: thêm `meaningVi: sense.sense.meaningVi` vào `prompt`;
  - `ACTIVITIES` còn 3 mục:

    | key | label | role |
    |---|---|---|
    | `meaning_choice` | Nhìn từ → chọn nghĩa | recognize |
    | `listen_type` | Nghe → viết từ | recall |
    | `cloze_choice` | Điền vào câu | recognize |

  - xoá `isActivityKey` (không có ai dùng).
- `distractors.ts`:
  - `PoolEntry` thêm `synonymKeys: string[]` (lấy `lemmaKeyOf` từ `bundle.sense.synonyms`);
  - `blockedLemmas(sense)` = các `lemmaKeyOf` trong `sense.sense.synonyms`. Bỏ relations và families;
  - trong `chooseDistractors`, loại thêm entry nào có `synonymKeys` chứa `lemmaKeyOf(sense.word.lemma)` (chặn hai chiều);
  - **loại thêm entry có `normalizeLearnerText(meaningVi)` trùng nghĩa của từ đang hỏi**, để không ra hai đáp án giống nhau;
  - `rank`: bỏ phần `preferred` (distractorLemmas), giữ điểm cùng từ loại và cùng set;
  - `poolFromBundles`: map `synonymKeys`.
- **Xoá file** `src/lib/english/quizPublic.ts` (code chết) và test của nó.

### D2. Quiz và Luyện bộ từ: `src/lib/english/quiz.ts`, `PracticeRunner.tsx`, `SetDetail.tsx`

- Giữ **khoá** `QUIZ_KINDS = ['mcq', 'fill', 'listen']` để route `?type=` và achievement `triple` không phải đổi. Đổi nghĩa và nhãn:

  | kind | builder | label | hint |
  |---|---|---|---|
  | `mcq` | `meaning_choice` (không còn dự phòng bằng cloze) | Chọn nghĩa | Nhìn từ, chọn nghĩa đúng |
  | `fill` | `cloze_choice` | Điền câu | Chọn từ hợp với câu |
  | `listen` | `listen_type` với `allowSyntheticAudio: true` | Nghe-viết | Nghe rồi gõ lại |

- `quizItemFor` trả về `null` khi từ thiếu dữ liệu. Ví dụ: `fill` mà từ không có câu `grade`, hoặc `mcq` mà set có ít hơn 4 nghĩa khác nhau.
- `PracticeRunner.tsx`:
  - chế độ mix xoay vòng mcq → fill → listen; dạng nào ra `null` thì thử dạng tiếp theo theo vòng;
  - với một `type` cố định, từ nào ra `null` thì bỏ qua;
  - nếu không tạo được câu nào, hiện "Bộ từ này chưa có câu cho dạng này" và nút quay lại bộ từ;
  - audio dùng `word.audioPath`.
- Xoá `pickQuizSenses` nếu vẫn chỉ có test gọi tới (kiểm tra lại bằng `grep`).
- `SetDetail.tsx`: cập nhật nhãn trong sheet chọn dạng, cờ audio dùng `audioPath`.

### D3. `src/components/english/quiz/QuestionView.tsx`

- **Xoá** nhánh `listen_choice` và `spell_hinted`, và nhánh default `recall_type`.
- Còn 3 nhánh:
  - `listen_type`: nút audio tự phát, "Nghe và gõ lại", và **`meaningVi` chữ nhỏ bên dưới**;
  - `cloze_choice`: như hiện tại;
  - `meaning_choice`: như hiện tại.
- Gặp `activityKey` lạ thì render "Câu hỏi này không còn được hỗ trợ" thay vì đoán.
- `isChoice` = `meaning_choice` hoặc `cloze_choice`.
- `questionAudio`: giữ, cập nhật test.

### D4. Ôn theo bộ / ôn luân phiên: `src/lib/english/guidedReview.ts`, `enGuidedReviewService.ts`, `GuidedReviewSession.tsx`

> Main đã có commit #34 "Tách ôn theo bộ và ôn luân phiên". Đọc code mới nhất trên main trước khi sửa, và giữ nguyên cách tách chế độ.

- `guidedReview.ts`:
  - bỏ `TYPED_KEYS` và `CHOICE_KEYS`; thay bằng `REVIEW_KEYS: ActivityKey[] = ['meaning_choice', 'cloze_choice', 'listen_type']`;
  - `buildGuidedQuestions`: mỗi từ một câu. Xoay vòng qua `REVIEW_KEYS`, bắt đầu từ vị trí ngẫu nhiên, để một đợt (5 từ) có đủ các dạng mà dữ liệu cho phép. Dạng nào ra `null` thì thử dạng kế tiếp. Ưu tiên ít nhất 1 câu `listen_type` mỗi đợt;
  - `buildOne`: `allowSyntheticAudio: true` (giống Luyện), bỏ `recallPrompt`. Chỉ `listen_type` có `layout = answerLayout(answerKey)`, các dạng chọn có `layout = null`;
  - `buildRetryQuestion`: ưu tiên một dạng khác dạng vừa sai, dạng nào cũng được nếu chỉ còn một dạng tạo được;
  - giữ nguyên `weightedOrder`, `reviewWeight` và luật đổi chỗ câu đầu với từ vừa học.
- `enGuidedReviewService.ts`: không cần nhánh tương thích cho key cũ, vì migration đã xoá hết phiên cũ. Nếu `activityByKey` trả về `null` thì chấm sai và log cảnh báo, không throw.
- `GuidedReviewSession.tsx`: cờ audio dùng `audioPath`, IPA dùng `word.ipa`.

---

## 6. Giai đoạn E: Giao diện nội dung

- **`src/components/english/EnglishWordCard.tsx`**: bỏ tab. Còn **một khối** gồm, theo thứ tự:
  1. lemma, IPA (`word.ipa`), nút nghe (`audioPath`), `(partOfSpeech)`;
  2. `meaningVi` cỡ lớn;
  3. `noteVi` (nếu có) trong khung cảnh báo, giống `pitfallVi` cũ;
  4. dòng "Gần nghĩa: a, b" từ `synonyms` (nếu có);
  5. danh sách câu ví dụ (mọi role) kèm nghĩa Việt, mỗi câu có nút nghe (TTS qua `/api/audio?exampleId=`);
  6. trạng thái rỗng "Chưa có ví dụ."

  Xoá các tab "Cách nói", "Phân biệt", "Tôi là ai?".
- **`src/components/english/Library.tsx`**: xoá bộ lọc và chip trình độ (CEFR) và chủ đề. Giữ tìm kiếm và các bộ lọc khác đang có.
- **`src/components/english/EnglishAdmin.tsx`**:
  - preview chỉ hiện các trường v3 cùng khối "Câu dùng để chấm" (B7);
  - nút "Điền gói mẫu" dùng `samplePack.ts` mới;
  - xoá phần hiển thị families, hints, relations, definition, cefr, syllables, `targetTag`.
- `PracticeRunner.tsx`, `SetDetail.tsx`, `GuidedReviewSession.tsx`, `StudySession.tsx`: mọi chỗ `audioUkPath`/`audioUsPath`/`ipaUk`/`ipaUs`/`ipaOverride` đổi thành `audioPath`/`ipa`.
- Sau giai đoạn này, lệnh sau phải **không còn kết quả nào** (ngoại trừ `docs/plans/` cũ và các file migration cũ):
  ```bash
  grep -rnwE "ipaUk|ipaUs|audioUkPath|audioUsPath|ipaOverride|definitionEn|definitionEnSimple|pitfallVi|grammarNoteVi|chunks|commonErrors|distractorMeanings|distractorLemmas|hints|relations|families|familyLinks|cefr|topics|grammarTags|inflections|syllables|stressIndex|targetTag|alternatives|ambiguityNote|spell_hinted|recall_type|listen_choice|match_pairs|speak_shadow" src scripts
  ```
  Chú ý: `chunks` trong `guidedReview`, `quests` và `goalMetrics` là "đợt ôn", không liên quan. Được giữ, nhưng phải kiểm tra từng kết quả.

---

## 7. Giai đoạn F: Test (`src/lib/__tests__/`)

Cập nhật fixture bundle ở **một chỗ dùng chung** nếu được (ví dụ `src/lib/__tests__/fixtures/bundle.ts`), thay cho fixture viết tay lặp lại trong nhiều file.

**Xoá hoặc viết lại:**
- `enRelationBackfill.test.ts`: **xoá**.
- `enSenseBundle.test.ts`: fixture v3; bỏ phần `runtimeHints`, hints, relations, families, chunks; thêm test `role` được map; `clozeOf` không còn `targetTag`.
- `enContentValidation.test.ts`: viết lại theo luật B2. Phải có test cho:
  - pack v3 mẫu (`samplePack` và `AI_PACK_PROMPT_EXAMPLE`) không có blocker;
  - pack cũ (có `hints` hoặc `packVersion: 2`) bị chặn;
  - `synonym_self`;
  - `gradable` mà `target` không phải dạng của từ thì bị chặn;
  - `gradable` mà nghĩa Việt quá ngắn thì bị chặn;
  - không có câu `gradable` thì chỉ cảnh báo;
  - `role` = `grade` chỉ khi `gradable` và hợp lệ.
- `enContentService.test.ts`: bỏ mock 4 bảng đã xoá, test `lowestCefr` và test reverse relation; thêm test `saveEnglishPack` ghi `synonyms`, `noteVi` và `role`.
- `englishLearning.test.ts` và `englishSamplePacks.test.ts`: chạy mọi pack JSON (B5) qua `assessEnglishPack`, kỳ vọng không có blocker.
- `enExampleParts.test.ts`: bỏ `targetTag`.

**Activity và chế độ:**
- `enActivities.test.ts`:
  - chỉ còn 3 key;
  - `cloze_choice` trả về `null` khi chỉ có ví dụ `study`, và tạo được câu khi có ví dụ `grade`;
  - `listen_type` có `meaningVi` trong `prompt`;
  - phương án nhiễu không chứa từ đồng nghĩa (theo cả hai chiều) và không có nghĩa trùng.
- `enQuiz.test.ts`: `mcq` không còn dự phòng bằng cloze; `fill` ra `cloze_choice` hoặc `null`; xoá test `publicQuizItems` và `pickQuizSenses` nếu đã xoá hàm.
- `enGuidedReview.test.ts`: thay assert "2 câu gõ, ít nhất 3 dạng" bằng:
  - mỗi câu thuộc `REVIEW_KEYS`;
  - đủ dữ liệu thì 5 từ có đủ 3 dạng;
  - không có câu `grade` thì không có `cloze_choice`;
  - câu làm lại ưu tiên dạng khác.
- `enQuestionAudio.test.ts`: cập nhật theo QuestionView mới.

**SRS (mới, trong `enXpPacing.test.ts` hoặc file mới `enDailySrs.test.ts`, mock Prisma ở tầng service theo `AGENTS.md`):**
- `hintFor('ice cream')` → `{ firstLetter: 'i', letterCount: 8 }`; `hintFor('well-known')` đếm bỏ gạch nối.
- `startToday`: từ mới và box ≤ 2 có `hint`; box 3 trở lên có `hint === null`. Không item nào còn trường `prompt` hoặc `cloze`.
- `answerToday`:
  - gõ đúng một từ đồng nghĩa → `result: 'synonym'`, **không** gọi `enWordState.upsert`, `enReview.create` hay ghi XP;
  - gõ một form → đúng;
  - gõ `target` của câu ví dụ mà không phải form → **sai** (đổi so với trước).
  - `EnReview.prompt` là `'hinted'` hoặc `'free'` theo box ở server.
- Route `daily/answer`: client cũ gửi `prompt: 'cloze'` vẫn được nhận.

---

## 8. Kiểm tra end-to-end trên máy (bắt buộc trước khi mở PR)

1. `npx prisma migrate dev`, rồi `npm run db:migrate:status` sạch. Kiểm tra trong `npm run db:studio` rằng các bảng `En*` đã trống, các bảng và cột đã xoá không còn.
2. `npm run db:seed:samples`: seed được các pack v3 mẫu mà không lỗi.
3. `npm run quality` xanh (test, lint, typecheck, build).
4. Chạy `npm run dev` (cổng 3002), đăng nhập bằng tài khoản dev, rồi kiểm tra:
   - **Admin:** "Điền gói mẫu" → preview có khối "Câu dùng để chấm" → Lưu → Xuất bản. Dán pack v2 cũ thì bị chặn với thông báo định dạng cũ. Import `motivation-leadership.json` v3 thành công.
   - **Thư viện:** không còn bộ lọc trình độ và chủ đề; ghi danh một bộ từ được.
   - **SRS "Hôm nay":** từ mới có ô chữ và gợi ý chữ đầu. Gõ một từ trong `synonyms` thì ra thông báo trung lập và box không đổi (xem `EnWordState` trong Studio). Gõ sai thì hiện đáp án và phải gõ lại mới bấm Tiếp được. Đặt tay một `EnWordState` lên box 3 với `dueAt` là hôm nay, rồi kiểm tra ô nhập không lộ độ dài. Không bao giờ xuất hiện câu nghe hoặc câu có chỗ trống.
   - **Luyện bộ từ:** `?type=mcq`, `?type=fill`, `?type=listen` và chế độ mix. Câu nghe có nghĩa Việt nhỏ bên dưới. `fill` chỉ ra câu từ ví dụ `grade`.
   - **Ôn theo bộ và ôn luân phiên:** học thẻ, trả lời đủ 3 dạng, làm lại câu sai, sang đợt tiếp.
   - **Thẻ từ:** một khối duy nhất, không còn tab.
   - Console trình duyệt và log server không có lỗi.
5. Chụp màn hình SRS (có gợi ý / không gợi ý / trả lời đồng nghĩa) và thẻ từ, đính vào PR.

---

## 9. PR, sao lưu, merge, deploy

1. Push nhánh, mở PR "Tối giản dạng câu hỏi và schema nội dung". Mô tả gồm:
   - mục 0 của file này;
   - danh sách bảng và cột đã xoá;
   - ghi chú **migration xoá toàn bộ dữ liệu tiếng Anh trên production** (đã được chủ repo đồng ý);
   - ảnh chụp màn hình;
   - kết quả `npm run quality`.
2. **Dừng ở đây và chờ chủ repo xác nhận** đã thử trên máy rồi mới merge, theo memory "local first before merge" vì đây là thay đổi lớn và có xoá dữ liệu.
3. Trước khi merge: `pg_dump` database production của learn-english (trên VPS) ra file sao lưu có ngày trong tên, theo `AGENTS.md`. Không có quyền truy cập VPS thì báo chủ repo tự chạy, không merge khi chưa có bản sao lưu.
4. Merge và để workflow Deploy chạy (`prisma migrate deploy` chạy khi container khởi động). Sau khi deploy: kiểm tra `/api/health`, rồi import lại pack v3 trên admin production nếu chủ repo muốn.

---

## 10. Ngoài phạm vi (không làm trong PR này)

- Phần Game (ghép cặp, xếp chữ, đoán từ qua gợi ý, ảnh, cụm từ, phân biệt từ dễ nhầm, sửa câu sai, dạng từ, nói theo mẫu).
- Nút "Câu này có vấn đề", tự gắn cờ câu ví dụ có tỉ lệ sai bất thường, lưu `exampleId` trong `EnReview`.
- Theo dõi điểm riêng theo kỹ năng (nghĩa, chính tả, nghe).
- Không gửi bundle chứa lemma xuống client trước khi trả lời (chống gian lận).
- Dọn `EnTestAttempt`/`EnTestItem` và các achievement đang không đạt được (`perfect_score`, `triple`).