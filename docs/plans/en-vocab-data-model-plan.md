# Kế hoạch mở rộng dữ liệu từ vựng tiếng Anh (En*)

> Tài liệu để giao cho Cursor triển khai. Phạm vi: **chỉ dữ liệu** (schema, gói import, validation, backfill). Các dạng bài tập mới **chưa làm** ở đợt này — nhưng mọi trường dưới đây được thiết kế để sau này sinh bài tập mà không phải đổi schema hay sinh lại nội dung.

## 0. Bối cảnh — repo đã có gì

Module tiếng Anh đã tồn tại (`prisma/schema.prisma` từ dòng ~420, `src/services/english/`, `src/lib/english/`):

| Đã có | Ở đâu |
|---|---|
| `EnWord` (lemma, ipa, stress, partOfSpeech, forms, audioPath) | schema |
| `EnSense` (meaningVi, collocations, pitfallVi, distractorMeanings, distractorLemmas) | schema |
| `EnExample` (english, meaningVi, target, role study/grade, alternatives, ambiguityNote) | schema |
| `EnPattern*`, `EnQuestion`, `EnSet*`, SRS `EnSenseSkill`, log, dispute | schema |
| Gói import JSON (zod) | `src/lib/english/contentValidation.ts` |
| Lưu và publish gói | `src/services/english/enContentService.ts` (`saveEnglishPack`, `publishEnglishSet`) |
| Sinh câu hỏi từ nội dung | `src/lib/english/questions.ts` |

**Thiếu so với yêu cầu sản phẩm:**

| Trường sản phẩm | Hiện trạng | Kế hoạch |
|---|---|---|
| Nghĩa tiếng Việt | ✅ `EnSense.meaningVi` | giữ |
| Nghĩa tiếng Anh | ❌ | `EnSense.definitionEn` (+ `definitionEnSimple`) |
| Ví dụ | ⚠️ có `target` nhưng không có vị trí, không có trình độ | thêm `targetStart/targetLength/targetTag/cefr/origin` |
| Phonetics | ⚠️ một IPA cho cả từ | thêm UK/US, âm tiết, IPA riêng theo nghĩa (record n./v.) |
| Từ cùng gốc và nghĩa | ❌ | bảng mới `EnWordFamily` + `EnWordFamilyMember` |
| Ghi chú dễ nhầm | ⚠️ `pitfallVi` (văn bản) + `distractorLemmas` (chuỗi rời) | giữ `pitfallVi`, thêm quan hệ có cấu trúc `EnSenseRelation(kind=confusable)` |
| Suggestions (gợi ý) | ❌ | bảng mới `EnSenseHint`, có thứ tự từ mơ hồ → rõ |
| Trình độ A0–C2 | ❌ | enum `EnCefr` trên word, sense, example, hint |

**Lỗi cấu trúc cần sửa trước:** `saveEnglishPack` luôn `create` một `EnWord` mới cho mỗi gói → cùng lemma bị nhân bản qua các gói. Họ từ và quan hệ dễ nhầm cần một bản ghi duy nhất cho mỗi từ, nên phải có `lemmaKey` duy nhất và import phải upsert.

---

## 1. Nguyên tắc thiết kế

1. **Nghĩa (sense) là đơn vị học**, không phải từ. Mọi thứ phụ thuộc nghĩa (định nghĩa, CEFR, ví dụ, gợi ý, dễ nhầm, hình ảnh) gắn vào `EnSense`. `EnWord` chỉ giữ những gì chung cho mọi nghĩa (chính tả, phát âm mặc định, dạng biến đổi, tần suất).
2. **Chỉ thêm, không đổi tên, không xoá** ở migration đầu. Cột cũ (`ipa`, `forms`, `distractorLemmas`…) giữ nguyên vì `questions.ts` đang dùng. Dọn dẹp ở đợt sau.
3. **Mỗi trường mới có default** → gói JSON cũ vẫn import được, dữ liệu cũ vẫn chạy.
4. **Lưu dữ liệu, không lưu bài tập.** Gợi ý về chữ cái đầu, số chữ cái, số âm tiết… được *tính lúc chạy* từ `lemma`/`syllables`; chỉ lưu gợi ý ngữ nghĩa do người/AI viết.
5. **Ví dụ phải "cloze-ready"**: biết chính xác đoạn nào là từ đích và nó ở dạng gì, để sau này đục lỗ mà không cần sinh lại câu.
6. **Liên kết mềm**: họ từ và quan hệ lưu cả `lemma` (chuỗi) lẫn id tuỳ chọn (`wordId`/`targetSenseId`). Từ chưa có trong DB vẫn khai báo được, có từ rồi thì nối lại bằng script.

---

## 2. Schema đề xuất

### 2.1 Enum mới

```prisma
enum EnCefr {
  pre_a1   // dùng cho học viên A0
  a1
  a2
  b1
  b2
  c1
  c2
}

enum EnEntryType {
  word
  phrasal_verb   // give up
  idiom          // break the ice
  fixed_phrase   // as a matter of fact
}

enum EnRegister {
  neutral
  formal
  informal
  slang
  literary
  technical
  old_fashioned
  offensive
}

enum EnRegion {
  both
  uk
  us
}

enum EnContentOrigin {
  authored       // người viết
  ai_generated   // AI viết, người duyệt
  corpus         // trích từ nguồn thật (ghi nguồn ở sourceNote)
}

enum EnHintKind {
  category      // "Đây là một loại cảm xúc"
  function      // "Người ta dùng thứ này để..."
  context       // "Bạn hay nghe từ này ở sân bay"
  association   // "Nghĩ đến: mưa, ô, ướt"
  contrast      // "Ngược lại với khi bạn vui vẻ"
  morphology    // "Có gốc nghĩa là 'nhìn'"
}

enum EnRelationKind {
  synonym
  antonym
  broader      // hypernym: dog → animal
  narrower     // hyponym: animal → dog
  confusable   // dễ nhầm
}

enum EnConfusableType {
  spelling      // desert / dessert
  sound         // live /lɪv/ / leave
  meaning       // borrow / lend
  false_friend  // sensible ≠ nhạy cảm
  grammar       // economic / economical
  collocation   // make / do
}

enum EnFamilyKind {
  derivation   // decide, decision, decisive, indecisive
  root         // gốc Latin/Hy Lạp: spect → inspect, spectator, perspective
}
```

### 2.2 `EnWord` — thêm cột

```prisma
model EnWord {
  // ... cột hiện có giữ nguyên (lemma, ipa, stress, partOfSpeech, forms, audioPath, status...)
  lemmaKey      String?        // P1: nullable. P2: backfill + @unique. = lemma.trim().toLowerCase() gộp khoảng trắng
  entryType     EnEntryType    @default(word)
  ipaUk         String         @default("")
  ipaUs         String         @default("")
  syllables     String[]       @default([])   // ["pho","to","graph"]
  stressIndex   Int?                          // vị trí âm tiết nhấn chính (0-based) trong syllables
  inflections   Json           @default("[]") // [{ "form": "ran", "tag": "past" }]
  frequencyRank Int?                          // thứ hạng tần suất (1 = phổ biến nhất)
  cefr          EnCefr?                       // trình độ thấp nhất trong các nghĩa (tính khi publish)
  audioUkPath   String         @default("")
  audioUsPath   String         @default("")
  familyLinks   EnWordFamilyMember[]

  @@index([cefr])
  @@index([frequencyRank])
}
```

- `ipa` cũ = **IPA hiển thị mặc định** (đội nội dung tự chọn UK hoặc US). Khi import, nếu `ipa` trống thì lấy `ipaUk`, rồi đến `ipaUs`.
- `inflections` tag cố định: `base | plural | third_person | past | past_participle | ing | comparative | superlative`. Giữ `forms` cũ; khi import thì `forms` = tất cả `inflections[].form` nếu gói không gửi `forms`.
- `syllables` + `stressIndex` thay `stress` dạng chữ (`BOR-row`) cho máy đọc; `stress` cũ vẫn để hiển thị.

### 2.3 `EnSense` — thêm cột

```prisma
model EnSense {
  // ... cột hiện có giữ nguyên
  senseKey           String?        @unique  // "bank.n.finance" — để gói sau tham chiếu / cập nhật đúng nghĩa
  definitionEn       String         @default("")   // định nghĩa tiếng Anh chuẩn (kiểu learner's dictionary)
  definitionEnSimple String         @default("")   // bản ≤ 2000 từ phổ biến nhất, cho A2–B1
  cefr               EnCefr?
  register           EnRegister     @default(neutral)
  region             EnRegion       @default(both)
  topics             String[]       @default([])   // từ danh sách cố định trong src/lib/english/constants.ts
  grammarTags        String[]       @default([])   // countable, uncountable, transitive, intransitive, + to-inf, + -ing...
  grammarNoteVi      String         @default("")   // "decide + to V, không dùng decide + V-ing"
  ipaOverride        String         @default("")   // khi nghĩa này đọc khác: record (n) /ˈrekɔːd/
  stressIndexOverride Int?
  imagePath          String         @default("")
  imageAlt           String         @default("")
  sortOrder          Int            @default(0)    // thứ tự nghĩa trong một từ (0 = phổ biến nhất)
  hints              EnSenseHint[]
  relations          EnSenseRelation[] @relation("SenseRelationFrom")
  relatedFrom        EnSenseRelation[] @relation("SenseRelationTo")

  @@index([cefr])
}
```

- `pitfallVi` giữ nguyên = **ghi chú dễ nhầm dạng văn bản** cho người học đọc.
- `distractorLemmas` giữ nguyên (đang dùng trong `questions.ts:158`); được backfill sang `EnSenseRelation` ở P5.
- `collocations`: zod hiện giới hạn `.max(2)`. Nâng lên `.max(6)`. Kiểm tra `questions.ts` không giả định ≤ 2 trước khi đổi.

### 2.4 `EnExample` — thêm cột

```prisma
model EnExample {
  // ... cột hiện có giữ nguyên (english, meaningVi, target, role, alternatives...)
  targetStart  Int?                         // vị trí ký tự của target trong english
  targetLength Int?
  targetTag    String          @default("") // tag của inflection ("past") hoặc "derived" nếu là từ cùng họ
  cefr         EnCefr?
  origin       EnContentOrigin @default(authored)
  sourceNote   String          @default("") // nguồn nếu origin = corpus
  sortOrder    Int             @default(0)
}
```

Vì sao cần vị trí chứ không chỉ `target`: câu *"I can't lend you this, but I can lend you that"* có hai chỗ trùng. Có `targetStart` thì đục lỗ đúng một chỗ, và khi chấm vẫn biết đáp án là dạng `past` của lemma nào.

### 2.5 Bảng mới `EnSenseHint` — Suggestions

```prisma
model EnSenseHint {
  id        String          @id @default(cuid())
  senseId   String
  order     Int             // 1 = mơ hồ nhất ... n = rõ nhất. Bài "đoán dần" mở theo thứ tự này
  kind      EnHintKind
  textEn    String
  textVi    String          @default("")   // cho học viên A0–A2
  cefr      EnCefr?                        // trình độ ngôn ngữ của chính câu gợi ý
  status    EnContentStatus @default(draft)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt
  sense     EnSense         @relation(fields: [senseId], references: [id], onDelete: Cascade)

  @@unique([senseId, order])
  @@index([senseId, status])
}
```

Quy tắc nội dung (enforce ở validation, mục 4): gợi ý **không được chứa** lemma, bất kỳ inflection nào, bất kỳ thành viên cùng họ từ nào, và không được trùng nguyên văn `meaningVi`. Mỗi sense nên có 3–5 gợi ý, `kind` khác nhau.

### 2.6 Bảng mới `EnSenseRelation` — đồng nghĩa, trái nghĩa, dễ nhầm

```prisma
model EnSenseRelation {
  id             String            @id @default(cuid())
  senseId        String
  kind           EnRelationKind
  lemma          String                         // luôn có, để hiển thị kể cả khi chưa có trong DB
  targetSenseId  String?                        // nối vào nghĩa cụ thể khi có
  confusableType EnConfusableType?              // chỉ dùng khi kind = confusable
  noteVi         String            @default("") // "borrow: mình nhận; lend: mình cho"
  sortOrder      Int               @default(0)
  createdAt      DateTime          @default(now())
  sense          EnSense           @relation("SenseRelationFrom", fields: [senseId], references: [id], onDelete: Cascade)
  targetSense    EnSense?          @relation("SenseRelationTo", fields: [targetSenseId], references: [id], onDelete: SetNull)

  @@unique([senseId, kind, lemma])
  @@index([targetSenseId])
}
```

- Quan hệ lưu **có hướng**. Import tự tạo chiều ngược cho `synonym`, `antonym`, `confusable` khi cả hai sense đều có trong DB; `broader`↔`narrower` thì đảo kind.
- Một bảng cho cả năm loại để chỉ phải viết logic nối id một lần.

### 2.7 Bảng mới `EnWordFamily` + `EnWordFamilyMember` — từ cùng gốc

```prisma
model EnWordFamily {
  id         String          @id @default(cuid())
  key        String          @unique   // "decide" (derivation) hoặc "root:spect" (root)
  kind       EnFamilyKind
  root       String                    // "decide" / "spect"
  meaningVi  String          @default("")  // nghĩa gốc: "nhìn"
  meaningEn  String          @default("")
  originNote String          @default("")  // "Latin specere = nhìn"
  status     EnContentStatus @default(draft)
  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  members    EnWordFamilyMember[]
}

model EnWordFamilyMember {
  id           String       @id @default(cuid())
  familyId     String
  lemma        String
  wordId       String?                    // nối khi từ có trong DB
  partOfSpeech String       @default("")
  affixNote    String       @default("")  // "+ -ion", "in- + ... + -ive"
  meaningVi    String       @default("")  // nghĩa ngắn, để dùng cả khi từ chưa có trong DB
  sortOrder    Int          @default(0)
  family       EnWordFamily @relation(fields: [familyId], references: [id], onDelete: Cascade)
  word         EnWord?      @relation(fields: [wordId], references: [id], onDelete: SetNull)

  @@unique([familyId, lemma])
  @@index([wordId])
}
```

- Một từ có thể thuộc **nhiều họ** (`photograph` ∈ `root:photo` và `root:graph`) → bảng nối nhiều-nhiều.
- Họ từ gắn vào **word**, không gắn vào sense, vì hình thái học là chuyện chính tả.
- `meaningVi` trên member cho phép bài "đoán nghĩa từ chưa học" (sau này) mà không cần từ đó có đầy đủ dữ liệu.

### 2.8 Sơ đồ quan hệ

```
EnWordFamily 1─* EnWordFamilyMember *─0..1 EnWord 1─* EnSense 1─* EnExample
                                                    │
                                                    ├─* EnSenseHint
                                                    ├─* EnSenseRelation ─0..1→ EnSense
                                                    └─  (hiện có) EnQuestion, EnSenseSkill, EnSetItem, EnPatternSense
```

---

## 3. Định dạng gói JSON (cập nhật `englishPackSchema`)

Mọi trường mới đều `.default(...)`, gói cũ vẫn hợp lệ. Ví dụ một từ đầy đủ:

```json
{
  "title": "Quyết định",
  "description": "",
  "audioFiles": ["decide.mp3", "decide-1.mp3"],
  "families": [
    {
      "key": "decide",
      "kind": "derivation",
      "root": "decide",
      "meaningVi": "quyết định",
      "originNote": "Latin decidere = cắt đứt",
      "members": [
        { "lemma": "decide", "partOfSpeech": "verb", "affixNote": "", "meaningVi": "quyết định" },
        { "lemma": "decision", "partOfSpeech": "noun", "affixNote": "+ -sion", "meaningVi": "sự quyết định" },
        { "lemma": "decisive", "partOfSpeech": "adjective", "affixNote": "+ -sive", "meaningVi": "dứt khoát" },
        { "lemma": "indecisive", "partOfSpeech": "adjective", "affixNote": "in- + -sive", "meaningVi": "do dự" }
      ]
    }
  ],
  "words": [
    {
      "lemma": "decide",
      "senseKey": "decide.v.choose",
      "entryType": "word",
      "partOfSpeech": "verb",
      "ipa": "/dɪˈsaɪd/",
      "ipaUk": "/dɪˈsaɪd/",
      "ipaUs": "/dɪˈsaɪd/",
      "syllables": ["de", "cide"],
      "stressIndex": 1,
      "stress": "de-CIDE",
      "inflections": [
        { "form": "decides", "tag": "third_person" },
        { "form": "decided", "tag": "past" },
        { "form": "decided", "tag": "past_participle" },
        { "form": "deciding", "tag": "ing" }
      ],
      "frequencyRank": 612,
      "cefr": "a2",
      "meaningVi": "quyết định",
      "definitionEn": "to choose something, especially after thinking about several possibilities",
      "definitionEnSimple": "to choose what you will do after thinking",
      "register": "neutral",
      "region": "both",
      "topics": ["daily_life", "work"],
      "grammarTags": ["transitive", "intransitive", "+to_inf", "+that_clause"],
      "grammarNoteVi": "decide + to V (decide to go), không nói decide going.",
      "collocations": ["decide to do something", "decide on something", "finally decide"],
      "pitfallVi": "decide là động từ, decision là danh từ. Nói make a decision, không nói do a decision.",
      "audioFile": "decide.mp3",
      "imageFile": "",
      "distractorMeanings": [],
      "distractorLemmas": [],
      "hints": [
        { "kind": "context", "textEn": "You do this at a restaurant when you look at the menu for a long time.", "textVi": "Bạn làm việc này ở nhà hàng khi nhìn thực đơn rất lâu." },
        { "kind": "function", "textEn": "It ends the time when you are not sure.", "textVi": "Nó chấm dứt lúc bạn còn phân vân." },
        { "kind": "contrast", "textEn": "The opposite of 'keep thinking and never choose'.", "textVi": "Ngược với cứ nghĩ mãi mà không chọn." }
      ],
      "relations": [
        { "kind": "synonym", "lemma": "choose", "noteVi": "choose nhấn vào việc chọn giữa các lựa chọn cụ thể" },
        { "kind": "confusable", "lemma": "decision", "confusableType": "grammar", "noteVi": "decision là danh từ" }
      ],
      "examples": [
        {
          "english": "We decided to stay at home because of the rain.",
          "meaningVi": "Chúng tôi quyết định ở nhà vì trời mưa.",
          "target": "decided",
          "targetStart": 3,
          "targetTag": "past",
          "cefr": "a2",
          "origin": "authored",
          "audioFile": "decide-1.mp3",
          "alternativesTried": ["chose", "wanted", "planned"],
          "stillPlausible": ["chose"]
        }
      ]
    }
  ],
  "patterns": []
}
```

Quy tắc import:
- `targetStart` không bắt buộc: nếu thiếu và `target` xuất hiện **đúng một lần** (không phân biệt hoa thường, theo ranh giới từ) thì tự tính; nếu xuất hiện 0 hoặc ≥ 2 lần thì báo lỗi. `targetLength` luôn = `target.length`.
- Nhiều nghĩa của cùng một từ = nhiều entry trong `words` có cùng `lemma`, khác `senseKey`. Import gộp chúng vào một `EnWord`.
- `families` ở cấp gói; `members[].lemma` tự nối `wordId` nếu lemma đó có trong DB (kể cả từ gói cũ).

---

## 4. Quy tắc validation (`contentValidation.ts`)

Theo cơ chế hiện có (`issue(path, code, message, blocksGrade)`):

| Code | Mức | Điều kiện |
|---|---|---|
| `hint_leaks_lemma` | chặn publish | `textEn`/`textVi` chứa lemma, một inflection, hoặc một thành viên cùng họ (ranh giới từ, không phân biệt hoa thường) |
| `hint_equals_meaning` | chặn publish | `textVi` trùng `meaningVi` sau khi chuẩn hoá |
| `hint_order_gap` | cảnh báo | `order` không liên tục 1..n |
| `hint_too_few` | cảnh báo | < 3 gợi ý |
| `definition_mentions_lemma` | cảnh báo | `definitionEn` chứa lemma (làm hỏng bài đoán từ qua định nghĩa) |
| `definition_missing` | chặn publish (gói mới) | `definitionEn` trống |
| `cefr_missing` | chặn publish (gói mới) | sense không có `cefr` |
| `target_offset_mismatch` | chặn grade | `english.slice(start, start+len) !== target` |
| `target_ambiguous` | chặn grade | thiếu `targetStart` và target xuất hiện ≠ 1 lần |
| `target_form_unknown` | cảnh báo | `target` không là lemma, không có trong `inflections`, không là thành viên cùng họ |
| `relation_self` | chặn | `relations[].lemma` = chính lemma |
| `confusable_type_missing` | cảnh báo | kind = confusable mà không có `confusableType` |
| `ipa_format` | cảnh báo | IPA không nằm trong `/.../` |
| `syllables_mismatch` | cảnh báo | `syllables.join('')` ≠ lemma (bỏ qua với phrasal verb/idiom) |
| `stress_index_range` | chặn | `stressIndex` ≥ `syllables.length` |
| `sense_key_format` | chặn | không khớp `^[a-z0-9' -]+\.[a-z]+\.[a-z0-9_]+$` |

"Gói mới" = gói có ít nhất một trường mới. Gói cũ không bị chặn vì thiếu `definitionEn`/`cefr`, chỉ cảnh báo. Có thể dùng một cờ `packVersion: 2`.

---

## 5. Kế hoạch triển khai (theo phase, mỗi phase một commit)

> Cursor: đọc `AGENTS.md`. Mock Prisma chỉ ở test tầng service (`vi.mock('@/lib/prisma')`); test để ở `src/lib/__tests__/`. Dùng `npx prisma migrate dev --create-only`, đọc SQL trước khi apply. Không sửa model `Cn*`.

### P1 — Migration chỉ thêm
- Thêm toàn bộ enum, cột, bảng ở mục 2. `EnWord.lemmaKey` **nullable, chưa unique**.
- Migration tên `YYYYMMDDHHMMSS_en_vocab_data_model`.
- `npm run typecheck` phải qua (chưa đổi code nào khác).
- **Xong khi:** `prisma migrate dev` chạy sạch trên DB có sẵn dữ liệu En.

### P2 — Danh tính từ (`lemmaKey`) + gộp từ trùng
- Hàm thuần `lemmaKeyOf(lemma)` trong `src/lib/english/text.ts`: trim, lowercase, gộp nhiều khoảng trắng; giữ dấu gạch nối và khoảng trắng (phrasal verb).
- Script `scripts/en-backfill-lemma-key.ts` có `--dry-run` (mặc định) và `--apply`:
  1. Điền `lemmaKey` cho mọi `EnWord`.
  2. Với mỗi nhóm cùng `lemmaKey`: giữ bản ghi cũ nhất làm chuẩn, chuyển mọi `EnSense.wordId` sang nó, gộp `forms` (union), lấy `ipa`/`audioPath` không rỗng đầu tiên, rồi xoá các `EnWord` thừa. Chạy trong một transaction cho mỗi nhóm.
  3. In báo cáo: số nhóm, số sense đã chuyển.
  - SRS (`EnSenseSkill`), log, set item đều theo `senseId`, nên **không bị ảnh hưởng**.
- Migration thứ hai: `lemmaKey` NOT NULL + `@unique`.
- Thêm bước vào `docs/DEPLOY.md` (theo mẫu các bước backfill đã có): chạy dry-run → apply → migrate.
- **Xong khi:** test cho `lemmaKeyOf` và logic gộp (hàm gộp viết thuần, nhận list và trả kế hoạch, để test không cần DB).

### P3 — Gói JSON + validation
- Mở rộng `englishPackSchema` theo mục 3 (word: các trường mới, `hints`, `relations`, example: `targetStart`, `targetTag`, `cefr`, `origin`, `sourceNote`; gói: `families`, `packVersion`).
- Hằng số trong `src/lib/english/constants.ts`: `EN_TOPICS`, `EN_GRAMMAR_TAGS`, `EN_INFLECTION_TAGS`. Validation báo `unknown_topic`/`unknown_grammar_tag`.
- Thêm các rule ở mục 4 vào `assessWord`/`assessPack`.
- Hàm thuần `locateTarget(english, target): { start, length } | 'missing' | 'ambiguous'` trong `text.ts`.
- Cập nhật `samplePack.ts`: ít nhất một từ có đủ mọi trường mới, có một họ từ, có một cặp confusable (borrow/lend sẵn có là ví dụ tốt).
- **Xong khi:** test cho từng code validation (có case đúng và case sai), `locateTarget` (0 / 1 / 2 lần xuất hiện, hoa thường, ranh giới từ: `lend` không khớp trong `lender`).

### P4 — Lưu và publish
- `saveEnglishPack`:
  - `EnWord`: **upsert theo `lemmaKey`**. Trường từ gói chỉ ghi đè khi không rỗng (không xoá IPA đã có bằng chuỗi rỗng).
  - `EnSense`: nếu có `senseKey` và đã tồn tại → cập nhật sense đó (không tạo mới) và thêm vào set; nếu không → tạo mới.
  - Ghi `EnSenseHint` (`order` = vị trí trong mảng + 1), `EnSenseRelation` (nối `targetSenseId` nếu tìm thấy sense theo lemma; nếu lemma có nhiều sense thì chỉ nối khi trùng `partOfSpeech`, không thì để null), `EnWordFamily` (upsert theo `key`), `EnWordFamilyMember` (upsert theo `familyId+lemma`, nối `wordId` theo `lemmaKey`).
  - Ghi `targetStart/targetLength` đã tính ở P3.
  - Khi cập nhật sense đã có: hint/relation của sense đó được **thay hẳn** bằng bản trong gói (xoá rồi tạo lại), ví dụ thì giữ hành vi hiện tại (xem commit `ba525c7` về giữ ví dụ đã retire).
- `publishEnglishSet`: publish luôn hint và family của các sense trong set; tính `EnWord.cefr` = mức thấp nhất trong các sense đã publish.
- **Xong khi:** test service (mock Prisma) cho: import lần hai cùng lemma không tạo thêm `EnWord`; `senseKey` trùng thì cập nhật; quan hệ tự tạo chiều ngược khi cả hai sense tồn tại; member nối `wordId` khi từ đã có.

### P5 — Backfill dữ liệu cũ
- Script `scripts/en-backfill-relations.ts` (`--dry-run`/`--apply`): mỗi `distractorLemmas[i]` của sense → `EnSenseRelation(kind=confusable, confusableType=null, lemma)`, bỏ qua nếu đã có.
- Script nối lại liên kết mềm (chạy lại được nhiều lần): điền `targetSenseId` và `EnWordFamilyMember.wordId` còn null khi lemma giờ đã có trong DB.
- Ví dụ cũ: điền `targetStart/targetLength` bằng `locateTarget`; câu nào ambiguous/missing thì liệt kê ra file báo cáo để người sửa, không đoán.
- Thêm vào `docs/DEPLOY.md`.

### P6 — Đọc dữ liệu cho bài tập tương lai
- `src/lib/english/senseBundle.ts`: kiểu `SenseBundle` (word + sense + examples đã publish + hints + relations + families kèm members) và hàm thuần `toSenseBundle(row)`.
- `enContentService.getSenseBundles(senseIds)`: một query có `include` (không N+1).
- Hàm thuần `runtimeHints(bundle)`: sinh gợi ý tính lúc chạy (chữ cái đầu, số chữ cái, số âm tiết, IPA che bớt) — chưa dùng ở UI, chỉ để chốt API.
- Hàm thuần `clozeOf(example)`: trả `{ before, answer, after, tag }` từ `targetStart/targetLength`.
- Trang xem trước gói ở admin: hiển thị các trường mới (chỉ đọc). Đọc `.cursor/rules/ui-components.mdc` và `DESIGN.md` trước khi sửa UI.
- **Xong khi:** test cho `toSenseBundle`, `runtimeHints`, `clozeOf`.

### P7 — Chốt
- `npm run quality` qua hết.
- Cập nhật `AGENTS.md` (bảng Domain map) thêm dòng **English content** trỏ tới `enContentService.ts`, `contentValidation.ts`, tài liệu này.

---

## 6. Ngoài phạm vi đợt này
- Thêm `EnQuestionKind` mới hoặc đổi `questions.ts` (trừ việc giữ nó chạy được).
- UI bài tập mới, chấm phát âm, AI chấm câu tự viết.
- Xoá cột cũ (`distractorLemmas`, `stress` dạng chữ, `forms`) — làm sau khi `questions.ts` chuyển sang dùng dữ liệu mới.
- CMS sửa từng trường trong admin (đợt này chỉ import JSON + xem trước).

## 7. Trường nào mở khoá bài tập nào (để thấy vì sao cần lưu từ bây giờ)

| Trường | Bài tập sau này |
|---|---|
| `meaningVi`, `definitionEn`, `definitionEnSimple` | chọn nghĩa, gõ từ theo nghĩa, chuyển dần Việt → Anh theo trình độ |
| `EnExample.targetStart/targetTag` | điền từ, điền đúng dạng từ, tìm lỗi sai, nghe chép câu |
| `inflections` | chấm đáp án ở dạng chia, bài chia dạng từ |
| `syllables`, `stressIndex`, `ipaUk/Us`, `ipaOverride` | chọn trọng âm, đọc IPA đoán từ, cặp âm tối thiểu |
| `EnWordFamily*` | cây họ từ, word formation, đoán nghĩa từ chưa học qua gốc |
| `EnSenseRelation(confusable)` + `confusableType` | chọn giữa hai từ dễ nhầm, bẫy theo lịch SRS, câu nhiễu thông minh |
| `EnSenseRelation(synonym/antonym)` | thay từ đồng nghĩa, tìm từ trái nghĩa, nét nghĩa C1–C2 |
| `EnSenseHint` (+ `runtimeHints`) | đoán từ qua gợi ý lũy tiến, từ của ngày, ô chữ |
| `cefr` (sense/example/hint) | chọn đúng ví dụ và gợi ý vừa trình độ học viên A0 → C2 |
| `register`, `region`, `grammarTags`, `collocations` | bài văn phong trang trọng/thân mật, ghép kết hợp từ, sửa lỗi ngữ pháp |
| `imagePath`, `audioUk/UsPath` | bài cho A0 không cần đọc chữ |
| `frequencyRank`, `topics` | xếp thứ tự học, bộ từ theo chủ đề |
