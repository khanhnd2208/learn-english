# Kế hoạch: Tối giản hệ thống học từ vựng (First principles + Pareto)

> Ngày: 2026-10-26. Trạng thái: **đã thống nhất; đang triển khai theo từng giai đoạn**.
> Liên quan: `en-practice-test-plan.md`, `en-gamification-plan.md`, `en-vocab-data-model-plan.md`.
> Bản này đề xuất thay một phần quyết định D1, D3, D5' của các spec trên. Mục 6 liệt kê các điểm cần chốt.

## 0. Hiện trạng (đo từ code, 2026-10-26)

| Hạng mục | Số lượng | Ghi chú |
|---|---|---|
| Prisma model | 32 | 18 model nội dung + cấu hình, 14 model dữ liệu người học |
| Enum | 21 | 6 enum chỉ để mô tả nội dung (register, region, hint kind, relation kind, confusable type, family kind) |
| Chế độ Luyện | 9 | "Lộ trình" + 8 dạng bài chọn tay |
| Luồng chạy | 5 | Luyện bộ từ, Luyện sổ từ sai, Test bộ từ, Test Tổng hợp, Quest |
| Trạng thái của một từ | 4 trục | `status` (new/practicing/mastered), `inMistakeBook`, mốc XP hold 7d/30d, luật cách ngày `counted` |
| Màn hình người học | 5 | Bộ từ, Tổng hợp, Sổ từ sai, Nhân vật, Quests |

**Phần chết (không có đường gọi từ UI người học):**

- `EnQuestion`: vẫn sinh khi import (`questionsFromContent`), nhưng Luyện và Test dùng `activities/registry.ts` + `EnTestItem`.
- `EnAnswerLog`, `EnAudioOpen`, `EnDispute`: chỉ dùng trong `enAnswerService.ts`. Không component nào gọi `/api/dispute` hay `/api/audio-open`.
- `EnPatternProgress`: không có chỗ nào đọc hoặc ghi.
- `EnPattern`, `EnPatternExample`, `EnPatternSense`: chỉ được import vào. D4 đã để ngoài phạm vi.
- Thư mục rỗng `src/app/api/answer/`, `src/app/api/session/`.
- `EnSense.imagePath`: không được hiển thị ở đâu.
- `register`, `region`, `topics`, `frequencyRank`, `inflections`: chỉ đi qua `senseBundle.ts`, không ảnh hưởng tới người học.

## 1. First principles: một từ được "học" khi nào?

Mục tiêu đã chốt: **khi cần, người học tự lôi ra được từ đó, sau một thời gian, đủ nhanh.**

Bỏ hết lớp vỏ thì việc nhớ một từ chỉ cần 4 thứ. Đây là các kết quả nghiên cứu vững nhất về trí nhớ:

| # | Yếu tố | Cơ chế | Hệ thống cần gì tối thiểu |
|---|---|---|---|
| P1 | **Mã hoá có nghĩa** | Gắn từ với nghĩa, âm thanh, và một câu thật | 1 thẻ từ: từ, IPA, audio, nghĩa Việt, 1–2 câu ví dụ, 1 lưu ý (nếu có) |
| P2 | **Truy hồi chủ động** | Tự lôi từ ra khỏi trí nhớ mới làm nó bền. Nhận ra (chọn đáp án) yếu hơn nhiều | Gõ lại từ khi nhìn nghĩa hoặc câu đục lỗ |
| P3 | **Giãn cách** | Ôn đúng lúc sắp quên thì hiệu quả nhất | Mỗi từ có `dueAt`, khoảng cách tăng dần khi nhớ được |
| P4 | **Phản hồi ngay khi sai** | Sửa sai lúc còn nhớ câu trả lời của mình | Hiện đáp án + thẻ từ, cho làm lại cuối phiên |

Ngoài 4 thứ này còn một điều kiện: **người học phải quay lại mỗi ngày**. Muốn vậy thì việc phải nghĩ "hôm nay làm gì" càng ít càng tốt.

**Hệ quả:** "Đã học xong một từ" chỉ cần **một con số**: khoảng giãn cách hiện tại của từ đó. Nếu một từ đã được tự nhớ lại thành công sau ít nhất 7 ngày (lên hộp 4), thì từ đó là "nhớ lâu". Không cần thêm trạng thái nào.

## 2. Pareto: 20% nào tạo ra 80% hiệu quả?

| Thành phần | Đóng góp cho P1–P4 | Chi phí (code, nội dung, nhận thức người học) | Kết luận |
|---|---|---|---|
| Gõ lại từ (`recall_type`: nghĩa → từ, câu đục lỗ → từ) | P2 rất cao | Thấp | **Giữ, là trung tâm** |
| Lịch ôn giãn cách theo từng từ | P3 rất cao. **Hiện đang thiếu**: chỉ có luật "cách ≥ 1 ngày" và mốc XP 7d/30d | Thấp | **Thêm, thay 4 trục trạng thái** |
| Thẻ từ (nghĩa, audio, ví dụ, lưu ý) | P1 cao | Trung bình | **Giữ, rút gọn trường** |
| Phản hồi + làm lại cuối phiên (`practiceLoop`, `explain`) | P4 cao | Thấp | **Giữ** |
| Chọn nghĩa (`meaning_choice`) | P1 vừa. Đặt ngay sau thẻ từ thì chỉ đo trí nhớ vài giây | Thấp | **Bỏ khỏi "Hôm nay"**. Thay bằng cách gõ lại từ sau vài lượt (xem 3.1). Chỉ giữ trong Luyện tự do |
| Nghe → gõ (`listen_type`) | P2 cho kỹ năng nghe | Thấp | Giữ làm biến thể của bước gõ, không phải chế độ riêng |
| `listen_choice`, `cloze_choice`, `match_pairs`, `spell_hinted`, `speak_shadow` | Thấp. Trùng với các dạng trên, hoặc chỉ là nhận ra | Mỗi dạng = UI + chấm + phân phối | **Bỏ khỏi UI**. `spell_hinted` thành gợi ý "hiện chữ đầu" khi sai lần 1 |
| Chọn tay 1 trong 9 chế độ Luyện | Âm: người học phải tự quyết dạng bài | Cao | **Bỏ**. Hệ thống tự chọn |
| Tách Luyện / Test, khoá phần Tự nhớ, `leftPage`, `voidReason`, `counted` | Chống gian lận để giữ XP | Rất cao (`enTestService` 457 dòng) | **Gộp**: lượt ôn đến hạn chính là bài kiểm tra |
| Sổ từ sai (màn riêng + trường riêng) | P3/P4, nhưng trùng với hàng đợi ôn | Trung bình | **Gộp**: từ vừa quên về hộp 1 và được ôn đầu tiên vào ngày hôm sau. Sổ chỉ còn là một bộ lọc |
| Tổng hợp (màn riêng) | Trùng với hàng đợi ôn | Trung bình | **Gộp vào "Hôm nay"** |
| XP, Level, Quest, Reward, DailyNote, Avatar, Goal | Gián tiếp (động lực). Quest/Reward/Note không gắn với việc nhớ | Cao (7 bảng, 5 API, 4 component) | **Giữ 1 chỉ số**: số từ nhớ lâu, và chuỗi các ngày đã ôn hết từ đến hạn. Phần còn lại tạm ẩn |
| Hint 6 loại, Relation 5 loại, Word family, Register/Region/Topic, ảnh | P1 thấp. Người mới học thường bỏ qua | **Rất cao về soạn nội dung**: mỗi trường là thêm chi phí sinh nội dung và kiểm tra | Chỉ giữ `confusable` (để chọn đáp án nhiễu). Phần còn lại ngừng soạn |
| Pattern + Question bank + Dispute + AudioOpen | 0 (không có đường gọi) | Bảo trì, migration, test | **Xoá** |
| Activity admin + Test blueprint admin | 0 cho người học | Trung bình | **Thay bằng hằng số** trong `constants.ts` |

## 3. Thiết kế tối giản

### 3.1 Một vòng học duy nhất: "Hôm nay"

```
Mở app → [Học hôm nay: 23 từ ôn · 10 từ mới] → 1 phiên ~10–15 phút → Xong (tóm tắt)
```

Thứ tự trong phiên:

1. **Từ đến hạn**: hộp thấp và quá hạn lâu ra trước.
2. **Từ mới** lấy từ các bộ đã đăng ký, theo thứ tự trong bộ. Mặc định 10 từ/ngày, người học chỉnh được. Không lấy từ mới nếu đang tồn hơn 50 từ đến hạn.

Mỗi từ đi qua các bước:

| Loại | Bước |
|---|---|
| Từ mới | Thẻ từ (audio tự phát) → **3 lượt sau** mới gõ lại từ (nhìn nghĩa). Cách vài lượt thì người học phải lôi từ ra khỏi trí nhớ, thay vì chép lại từ vừa nhìn thấy |
| Từ ôn | Gõ từ. Đề lấy ngẫu nhiên: nghĩa / câu đục lỗ / nghe, tuỳ nội dung có sẵn. Audio phát sau khi trả lời |
| Gõ gần đúng (sai 1 chữ; từ ≥ 8 chữ thì sai 2 chữ) | Chưa chấm. Báo "Gần đúng, kiểm tra chính tả" và cho sửa 1 lần. Lần sửa được chấm như bình thường |
| Sai | Hiện đáp án, so với chữ đã gõ, kèm thẻ từ. Người học tự bấm Enter để đi tiếp (không tự chuyển). Từ đó được làm lại cuối phiên, có gợi ý chữ đầu + số chữ |
| "Tôi chưa nhớ" | Xử lý như sai, không bị phạt thêm (giữ G4) |

Mỗi vòng có tối đa **30 từ ôn**. Nếu còn nhiều hơn, màn tổng kết có nút "Học tiếp". Người học không bao giờ phải nhìn một hàng đợi 200 từ.

Người học vẫn có thể **luyện thêm một bộ từ** (Luyện tự do). Luyện tự do không đổi lịch ôn, chỉ dùng phần chạy luyện có sẵn.

### 3.2 Một mô hình trạng thái: hộp Leitner

Bảng `EnWordState` có các trường `status`, `inMistakeBook`, `mistakeAddedAt`, `lastTestedAt`, `masteredAt`, được thay bằng:

```prisma
model EnWordState {
  userId         String
  senseId        String
  box            Int       @default(0)   // 0..5
  dueAt          DateTime
  lapses         Int       @default(0)
  introducedAt   DateTime  @default(now())
  lastReviewedAt DateTime?
  @@unique([userId, senseId])
  @@index([userId, dueAt])
}
```

- Khoảng cách theo hộp: `[0, 1, 3, 7, 21, 60]` ngày, tính theo ngày lịch `Asia/Ho_Chi_Minh` (dùng lại `gapRule.ts`). `dueAt` là **00:00 giờ Việt Nam** của ngày đến hạn, nên học lúc 6 giờ sáng vẫn thấy từ hôm nay.
- Từ mới: lượt gõ đầu tiên luôn đưa từ vào hộp 1 (ôn ngày mai), `lapses` giữ 0. Một từ vừa gặp lần đầu thì chưa thể "quên".
- Lượt ôn **đến hạn**, gõ đúng ngay lần đầu: `box+1`. Sai: `box = 1`, `lapses+1`, ôn lại ngày mai.
- Trả lời đúng **trước hạn** (luyện tự do, hoặc làm lại trong phiên) không đổi `box`. Nhờ vậy luật "cách ≥ 1 ngày" (D1) được giữ mà không cần `counted`/`voidReason`.
- Các khái niệm cũ suy ra từ trạng thái này:
  - Đang học = hộp 1–3.
  - **Nhớ lâu** = hộp ≥ 4, tức đã nhớ lại sau ít nhất 7 ngày. Thay cho "Đã nắm" và mốc hold 7d.
  - Sổ từ sai = `lapses > 0` và hộp ≤ 2. Đây là bộ lọc, không phải trường riêng.

### 3.3 Một bảng log

`EnReview { userId, senseId, at, prompt('meaning'|'cloze'|'listen'), correct, responseMs, boxBefore, boxAfter }`.

Bảng này thay `EnTestAttempt` + `EnTestItem` + `EnTestWordResult` + `EnXpEvent`. `EnPracticeSession` được giữ làm phần đầu phiên: lưu danh sách từ của vòng và `activeSeconds`, nhờ đó server từ chối câu trả lời cho từ không thuộc vòng. Mọi thống kê đều tính được từ nó: số ngày học, độ chính xác, đường cong nhớ, từ hay sai. `activeSeconds` lấy bằng tổng `responseMs` của phiên.

### 3.4 Nội dung: chỉ những trường người học thật sự thấy

| Model | Giữ | Ngừng soạn (để trường, không bắt buộc) |
|---|---|---|
| `EnWord` | lemma, lemmaKey, ipa, audioPath, partOfSpeech, forms, cefr, status | ipaUk/Us, audioUk/Us, syllables, stressIndex, inflections, frequencyRank, entryType |
| `EnSense` | meaningVi, definitionEnSimple, pitfallVi, chunks, distractorLemmas, sortOrder, status | definitionEn, register, region, topics, grammarTags, grammarNoteVi, image*, commonErrors, distractorMeanings |
| `EnExample` | english, meaningVi, target, alternatives, audioPath | role, targetTag, origin, sourceNote, cefr |
| `EnSenseRelation` | chỉ `kind = confusable` (để chọn đáp án nhiễu và hiện "dễ nhầm với…") | synonym/antonym/broader/narrower |
| `EnSet`, `EnSetItem`, `EnEnrollment` | Giữ. Bỏ `EnSetItem.patternId` | |

Validator (`contentValidation.ts`) chỉ **bắt buộc** nhóm "Giữ". Các trường khác được cảnh báo, không chặn. Nhờ vậy chi phí soạn hoặc sinh bằng AI cho mỗi từ giảm khoảng một nửa.

### 3.5 Màn hình: từ 5 xuống 3

| Màn | Nội dung |
|---|---|
| **Hôm nay** (`/`) | Nút "Học hôm nay" với số từ ôn và số từ mới. Chuỗi ngày đã ôn hết từ đến hạn. Danh sách từ vừa quên |
| **Bộ từ** (`/sets`) | Đăng ký bộ, xem thẻ từ, Luyện tự do |
| **Tiến độ** (`/progress`) | Số từ theo hộp, số từ nhớ lâu, lịch 7 ngày tới (bao nhiêu từ đến hạn), từ hay quên |

Màn Admin giữ phần Import / Publish / QA. Bỏ tab Activities, Test blueprint, Disputes.

### 3.6 Động lực (thay D5')

Chỉ một chỉ số chính: **Số từ nhớ lâu** (hộp ≥ 4). Chỉ số này tự đúng theo G1–G3: không cày được, vì muốn tăng thì phải nhớ được qua ít nhất 7 ngày.

Phần phụ: **số ngày đã học trong tuần / mục tiêu tuần** (`EnLearnerProfile.weeklyDaysGoal`, mặc định 4), hiện thành 7 ô từ T2 đến CN. Không dùng streak: nghỉ một ngày không làm mất gì (giữ G4), và phần này tính được trực tiếp từ `EnReview` mà không cần lưu lịch sử "ngày có từ đến hạn". Nếu muốn giữ cảm giác RPG, có thể quy đổi Level = f(số từ nhớ lâu), không cần bảng XP.

Quest, Reward, DailyNote, Avatar, Goal: **ẩn khỏi UI, giữ bảng ở giai đoạn 1**. Sau 4 tuần, nếu không thấy thiếu thì xoá.

## 4. Kết quả sau khi tối giản

| | Trước | Sau |
|---|---|---|
| Model | 32 | **12**: Word, Sense, Example, SenseRelation, Set, SetItem, Enrollment, WordState, Review, LearnerProfile (rút gọn) + 2 bảng gamify tạm giữ |
| Enum | 21 | ~6 |
| Chế độ người học phải chọn | 9 dạng bài + 5 luồng | **1 nút** (+ Luyện tự do) |
| Trục trạng thái của một từ | 4 | **1** (box) |
| Màn hình | 5 | 3 |
| Dạng bài trong "Hôm nay" | 8 | **1** (gõ từ), với 3 kiểu đề: nghĩa, câu đục lỗ, nghe |

## 5. Lộ trình triển khai

Nguyên tắc: **ẩn trước, xoá sau**. Mỗi giai đoạn tự đứng được, qua `npm run quality` và `npm test`.

### Giai đoạn 0: Dọn phần chết (rủi ro gần 0, ~0.5 ngày)
- Xoá `EnQuestion`, `EnAnswerLog`, `EnAudioOpen`, `EnDispute`, `EnPatternProgress`, `EnPattern*`, `EnSetItem.patternId`.
- Xoá `enAnswerService.ts`, `questions.ts`, `suspend.ts`, các route `dispute`, `audio-open`, `admin/disputes`, các thư mục API rỗng, cùng test liên quan.
- Bỏ bước `questionsFromContent` / `draftsForAssessedPack` khi import.
- Migration: `DROP TABLE`. Trước khi chạy, `pg_dump` các bảng này.

### Giai đoạn 1: Lịch ôn + "Hôm nay" (lõi giá trị, ~3–4 ngày)
- `src/lib/english/schedule.ts` (thuần, có unit test): `nextBox`, `dueAt`, `isDue`, `buildDailyQueue(states, newPool, limits)`.
- Migration `EnWordState`: thêm `box`, `dueAt`, `lapses`, `introducedAt`, `lastReviewedAt`. Backfill:
  - `mastered` → box 4, `dueAt = masteredAt + 21d`
  - `practicing` → box 1, `dueAt = ngày mai`
  - `inMistakeBook` → box 1, `lapses = 1`
  - `new` → xoá dòng (chưa học)
- Thêm bảng `EnReview` và service `enDailyService.ts`: `startToday`, `answer`, `finish`. Dùng lại `registry.ts` (meaning_choice, recall_type, listen_type), `grade.ts`, `practiceLoop.ts`.
- Màn `/` mới = Hôm nay. Nav còn 3 mục.

### Giai đoạn 2: Ẩn phần thừa (~1–2 ngày)
- Ẩn Test, Tổng hợp, Sổ từ sai, Quests, chọn dạng bài. `/review` và `/mistakes` redirect về `/`.
- Thay `EnActivityType` và `EnTestBlueprint` bằng hằng số.
- Tiến độ đọc từ `EnWordState` + `EnReview`.
- Validator: hạ các trường "Ngừng soạn" thành cảnh báo.

### Giai đoạn 3: Xoá hẳn (sau 4 tuần dùng thật)
- Xoá `EnTestAttempt`, `EnTestItem`, `EnTestWordResult`, `EnPracticeSession`, `EnXpEvent`, `EnQuest`, `EnReward`, `EnDailyNote`, `enTestService.ts`, `gamify/*`.
- Xoá các trường cũ của `EnWordState` và các trường nội dung không còn dùng.

## 6. Các điểm cần chốt

1. **Bỏ Test riêng, lượt ôn đến hạn chính là kiểm tra?** Đề xuất: Có. Người học tự học, không có bảng xếp hạng, nên gian lận chỉ làm hại chính họ. Bộ máy chống gian lận tốn nhiều hơn giá trị nó mang lại.
2. **Gamification vừa làm xong (chưa commit) thì xử lý sao?** Đề xuất: commit để giữ lịch sử, rồi ẩn ở giai đoạn 2. Không cố giữ chỉ vì đã tốn công làm (sunk cost).
3. **Có giữ Pattern cho sau này không?** Đề xuất: Xoá. Git đã giữ lịch sử, khi cần thì làm lại theo mô hình mới.
4. **Số từ mới mỗi ngày mặc định:** 10. Ngưỡng tồn để dừng lấy từ mới: 50.
5. **Khoảng giãn cách:** `[0, 1, 3, 7, 21, 60]` ngày, Leitner đơn giản. Nếu sau này có đủ dữ liệu `EnReview` thì nâng lên FSRS. Không làm FSRS ngay.

### Quyết định triển khai đã thống nhất

- Các điểm 1–5 ở trên được chốt theo phương án đề xuất.
- Giai đoạn 1 dùng migration cộng thêm để giữ khả năng chạy song song trong lúc chuyển service. Không xóa trạng thái cũ trước khi mọi luồng đọc/ghi đã chuyển sang `box`.
- Pattern content/admin được giữ trong lúc chuyển đổi vì còn phụ thuộc import/publish; việc bỏ Pattern khỏi phạm vi người học không đồng nghĩa xóa dữ liệu nội dung ở cùng migration.
- Trước khi áp dụng migration lên DB có dữ liệu, cần tạo bản sao lưu theo quy trình triển khai (`pg_dump`).

### Tiến độ triển khai

- Đã có lịch Leitner thuần, migration cộng thêm/backfill, bảng `EnReview`, API và luồng UI “Hôm nay”; nav còn “Hôm nay / Bộ từ / Tiến độ”, các trang `/review` và `/mistakes` redirect về `/`.
- Trạng thái cũ vẫn được giữ song song trong schema và DB để các luồng Test/Practice/Gamification hiện hữu chưa bị gãy. Chưa xóa Question bank, Pattern, gamification, Test hay các route admin/API tương ứng.
- Rà soát lần 2 (mục 7) đã sửa xong B1–B7. Có thêm 2 migration: `20261026005000_due_at_day_start` (đổi `dueAt` về 00:00 giờ VN) và `20261026006000_review_scheduled` (thêm cột `EnReview.scheduled`, để độ chính xác không tính các lượt làm lại).
- UI theo mục 8 đã làm xong: Hôm nay (`TodayHome`), phiên học tập trung (`StudySession`) có tổng kết, Tiến độ, Bộ từ (tiến độ từng bộ; trang bộ từ chỉ còn Danh sách từ + Luyện tự do). `/quests` chuyển hướng về `/`.
- Còn lại: bỏ các API/màn Test và gamification khỏi code (giai đoạn 2), hạ validator theo trường được giữ, rồi xoá bảng/cột cũ (giai đoạn 3). Giai đoạn 0 (xoá Question bank, Dispute, AudioOpen, Pattern) vẫn chưa chạy vì cần `DROP TABLE` trên DB có dữ liệu.

## 7. Rà soát lần 2: lỗi trong bản cài đặt đầu của giai đoạn 1

Đối chiếu `schedule.ts`, `enDailyService.ts` và `TodayStudy.tsx` với mục 3:

| # | Lỗi | Hậu quả với người học | Sửa |
|---|---|---|---|
| B1 | `dueAt` đặt lúc 12:00 trưa, `isDue` so sánh theo giờ | Học buổi sáng thì không thấy từ đến hạn hôm nay | `dueAt` = 00:00 giờ VN. Migration lùi các giá trị cũ 12 giờ |
| B2 | Giới hạn từ mới tính theo **từng lần bấm**, không theo ngày | Bấm "Học" lần hai lại có thêm 10 từ mới. Hàng đợi ôn phình rất nhanh | Quota = 10 − số từ có `introducedAt` hôm nay |
| B3 | Từ ôn chỉ lấy từ các bộ **đang đăng ký** | Huỷ đăng ký một bộ thì các từ đã học trong bộ đó không bao giờ được ôn lại, trong khi Tiến độ vẫn đếm chúng | Ôn mọi từ đã học. Bộ đăng ký chỉ quyết định từ mới |
| B4 | Từ mới gõ sai lần đầu thì `lapses = 1` | Từ vừa gặp đã nằm trong "Từ hay quên" | Lượt đầu của từ mới luôn vào hộp 1, `lapses = 0` |
| B5 | Câu đục lỗ chỉ chấp nhận `lemma` và `forms` | Gõ đúng dạng trong câu (ví dụ "went" thay cho "go") có thể bị chấm sai | Chấp nhận thêm `target` của câu ví dụ |
| B6 | Không giới hạn số từ ôn trong một vòng | Nghỉ 1 tuần thì quay lại gặp một phiên 200 từ | Mỗi vòng tối đa 30 từ ôn, có nút "Học tiếp" |
| B7 | Tự chuyển câu sau 0.7 / 1.5 giây | Không kịp đọc đáp án khi sai | Sai thì đứng lại cho đến khi bấm Enter |

## 8. Trải nghiệm học (UI/UX)

Người dùng mục tiêu: sinh viên kỹ tính. Họ ghét bị phí thời gian, ghét thao tác thừa, và muốn thấy rõ mình đang tiến bộ.

**Nguyên tắc:**
1. **Một quyết định mỗi ngày.** Mở app là thấy ngay: hôm nay mất bao nhiêu phút, có một nút bắt đầu.
2. **Bàn phím trước.** Enter để trả lời và đi tiếp. Nút "Tôi chưa nhớ" luôn có sẵn. Ô gõ tắt autocorrect và viết hoa tự động.
3. **Không phạt vì gõ nhầm.** Gõ gần đúng thì được sửa một lần. Gõ sai thì thấy rõ chữ nào sai.
4. **Âm thanh có sẵn.** Thẻ từ mới tự đọc từ đó. Sau mỗi câu trả lời cũng tự đọc.
5. **Thấy tiến bộ thật.** Tổng kết cuối vòng cho biết: số từ nhớ được, số từ vừa lên "Nhớ lâu", số từ đến hạn ngày mai.
6. **Không dùng thuật ngữ nội bộ.** Người học thấy "Ôn lại sau 3 ngày", không thấy "Hộp 2".

| Màn | Nội dung |
|---|---|
| Hôm nay | Lời chào theo buổi; thẻ chính hiện số từ ôn, số từ mới, ước lượng số phút, nút Bắt đầu; 7 ô ngày trong tuần so với mục tiêu; số từ nhớ lâu; các từ vừa quên. Trạng thái rỗng: chưa đăng ký bộ nào → dẫn tới Bộ từ. Đã xong hôm nay → báo số từ đến hạn ngày mai |
| Phiên học | Chế độ tập trung: thanh tiến độ, nút Thoát, một thẻ ở giữa. Ô gõ lớn. Khi làm lại có ô gợi ý chữ đầu. Phản hồi nằm ngay dưới ô gõ |
| Tổng kết | Độ chính xác, số từ nhớ được / quên, từ lên Nhớ lâu, các từ cần chú ý, số từ ngày mai; nút "Học tiếp" nếu còn từ đến hạn |
| Tiến độ | Số từ nhớ lâu (số lớn); thanh 3 giai đoạn: Mới học / Đang nhớ / Nhớ lâu; biểu đồ cột số từ đến hạn trong 7 ngày; độ chính xác 30 ngày; các từ hay quên |
| Bộ từ | Mỗi bộ có thanh tiến độ: đã học / nhớ lâu / tổng. Trang bộ từ chỉ còn 2 tab: Đọc và Luyện tự do. Nhãn trạng thái của từ dùng giai đoạn mới |

## 9. Cách đo hiệu quả (sau giai đoạn 1)

- **Tỉ lệ nhớ khi đến hạn**, theo từng hộp (từ `EnReview`). Mục tiêu khoảng 85–90%. Nếu thấp hơn thì rút ngắn khoảng cách; nếu cao hơn thì giãn ra.
- **Số từ nhớ lâu / tuần**: chỉ số North Star.
- **Tỉ lệ ngày ôn hết từ đến hạn**: thói quen.
