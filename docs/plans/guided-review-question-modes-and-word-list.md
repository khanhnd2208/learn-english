# Ôn theo bộ: dạng câu hỏi và sổ từ

## Outcome
Người học chọn Trộn lẫn, Chọn nghĩa, Điền câu hoặc Nghe viết trong Ôn theo bộ, bật Nâng cao cho thẻ học và xem từ của từng bộ trong sổ dạng popup. Tab Bộ từ của tôi biến mất; `/sets` chuyển đến Ôn theo bộ.

## Out of scope
Không sửa SRS, Luyện tập, nội dung, audio, XP hay trang chi tiết bộ. Điền câu giữ bốn đáp án. Dạng câu hỏi không được lưu giữa các lần mở trang. Giữ nguyên `docs/plans/en-light-settle-http-bench-plan.md`.

## Invariants touched
Guided Review không ghi `EnWordState` hoặc `EnReview`; Practice không ghi dữ liệu. Chặng tối đa năm từ, vẫn đi qua study, quiz, retry, summary. XP giữ transaction, sourceKey, skipDuplicates và pacing máy chủ. Ngày tính theo Việt Nam. Điền câu chỉ dùng câu grade. RNG phiên dùng randomRng; kiểm tra điều kiện dùng mulberry32 riêng. Thiếu mp3 vẫn có TTS. Mọi truy vấn dùng userId từ withAuth. SRS luôn ẩn cụm nâng cao.

## Changes per file
- `src/lib/english/guidedReview.ts`: type mode, builder dạng cố định, helper eligibility; giữ nguyên mix và retry mix.
- `src/services/english/enGuidedReviewService.ts`: lọc sense theo dạng bằng các lô 100, lưu mode và số bỏ qua, giữ pool đáp án nhiễu riêng, xây câu trước transaction thay phiên. Retry và next đọc mode từ session.
- `src/app/api/review/route.ts`: start nhận `questionMode` enum strict, default mix.
- `prisma/schema.prisma` và `prisma/migrations/20261104000000_en_guided_question_mode/migration.sql`: thêm questionMode, excludedWordCount, distractorSenseIds; không backfill riêng.
- `src/services/english/enCatalogService.ts` và `src/app/api/review/sets/[setId]/words/route.ts`: chỉ trả từ published thuộc bộ published đã tải; DTO tối giản, không trả examples.
- `src/lib/english/setWordList.ts`, `src/components/english/SetWordListDialog.tsx`: lọc không dấu, nhãn từ loại Việt, popup có tìm kiếm, nghe và phân trang 30 từ.
- `src/components/english/ReviewOverview.tsx`: bốn radio, công tắc Nâng cao trong Guided Review, nút sổ cạnh mỗi bộ.
- `src/components/english/GuidedReviewSession.tsx`, `EnglishWordCard.tsx`, `WordCardParts.tsx`, `advanced/AdvancedNotes.tsx`, `advanced/AdvancedToggle.tsx`: mode và số bỏ qua trong phiên; chỉ thẻ Guided Review nhận Nâng cao.
- `src/config/navigation.ts`, `src/app/(app)/sets/page.tsx`, `src/components/english/HomeDashboard.tsx`, `SetDetail.tsx`: bỏ tab, redirect, đổi liên kết về Ôn theo bộ.

## Exact copy
Chọn dạng: “Dạng câu hỏi”, “Trộn lẫn”, “Chọn nghĩa”, “Điền câu”, “Nghe viết”. Hints: “Kết hợp chọn nghĩa, điền câu và nghe viết.”, “Nhìn từ tiếng Anh và chọn nghĩa đúng.”, “Chọn từ đúng để điền vào câu.”, “Nghe phát âm và gõ từ bạn nghe được.” Công tắc: “Nâng cao”, “Hiện thêm cụm từ và cách dùng trên thẻ học.” Trạng thái: “Chọn ít nhất một bộ để bắt đầu.”, “Đang chuẩn bị…”, “Dạng câu hỏi: {tên dạng}”, “Ôn {N} từ phù hợp. Bỏ qua {M} từ chưa đủ dữ liệu cho dạng này.”, “Các bộ đã chọn chưa có từ phù hợp với dạng này. Hãy chọn dạng khác hoặc thêm bộ từ.”, “Một phiên khác vừa được mở. Hãy thử bắt đầu lại.”, “Nội dung bộ từ đã thay đổi nên chưa thể tạo đủ câu hỏi. Hãy kết thúc phiên và bắt đầu lại.”

Sổ từ: “Xem từ trong bộ”, “Xem từ trong bộ {tên bộ}”, “Đang tải danh sách từ…”, “Tìm từ hoặc nghĩa…”, “Tìm từ hoặc nghĩa”, “{N} từ”, “{N} kết quả”, “Bộ này chưa có từ để hiển thị.”, “Không tìm thấy từ phù hợp.”, “Không tải được danh sách từ. Hãy thử lại.”, “Bộ từ này không còn khả dụng.”, “Thử lại”, “Yêu cầu xem bộ từ không hợp lệ”. Backlink “← Bộ từ” đổi thành “← Ôn theo bộ”. Bỏ nav “Bộ từ của tôi”/“Bộ từ”.

## States
Không có bộ: hiện lời mời tải, ẩn điều khiển. Chưa chọn bộ: báo chọn và khóa bắt đầu nhưng vẫn xem sổ. Một/nhiều bộ: nút sổ độc lập checkbox; giữ tìm bộ hiện có. Đang lưu/bắt đầu: khóa bắt đầu và cấu hình; lỗi giữ lựa chọn. Phiên một từ: một thẻ, một câu. Sổ loading/lỗi/rỗng/không kết quả: hiện thông báo tương ứng; nhiều từ phân trang 30. Thiếu IPA thì ẩn IPA. Admin dùng cùng điều kiện enrollment. 375px: radio 2×2, không tràn ngang, popup cuộn trong 90dvh. SRS không hiện điều khiển mới.

## Data
Session: `questionMode String @default("mix")`, `excludedWordCount Int @default(0)`, `distractorSenseIds String[] @default([])`. POST start nhận mode enum, default mix. GET `/api/review/sets/[setId]/words` trả `{id,title,words:[{senseId,lemma,ipa,partOfSpeech,meaningVi,recordedAudioAvailable}]}`. Không trả distractor IDs cho client.

## Tests
`enGuidedReview.test.ts`: mix regression, dạng cố định, retry, thiếu grade/distractors, thiếu mp3. `setWordList.test.ts`: tìm không dấu và nhãn từ loại. `englishLearning.test.ts`: bốn nav items và active detail. DB: kiểm tra lọc mode, session cũ, quyền xem sổ, không ghi SRS/XP khi đọc, transaction rollback, retry/next và phân quyền. Manual: kiểm tra hai tab, bốn dạng, popup, 375px, `/sets` redirect, console.

## Steps
Tạo branch; sửa pure rules; thêm migration và generate; sửa service/API; thêm popup/API; sửa UI/nav; chạy DB tests và quality; kiểm tra giao diện; commit/push/PR/merge/deploy khi checks xanh.

## Acceptance
`npm run quality` và `npm run test:db` pass khi có TEST_DATABASE_URL. Bốn dạng giữ đúng qua next/retry; mở trang mới là mix. SRS không đổi. Popup không đổi checkbox, tìm/nghe/đóng được. Không còn tab Bộ từ; `/sets` redirect, detail/practice còn chạy. Không có hydration error. Sau deploy kiểm tra health, một phiên và một popup.
