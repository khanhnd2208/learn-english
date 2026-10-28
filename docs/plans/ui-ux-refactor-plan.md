# Kế hoạch cải tiến & refactor UI/UX — WordQuest

> Ngày: 28/10/2026 · Phạm vi: toàn bộ giao diện người học, phong cách đồ họa **Pixel Parchment** hiện tại · Trạng thái: bản nháp chờ chủ sản phẩm duyệt các câu hỏi ở mục 11.

---

## 0. Tóm tắt

**Chẩn đoán:** app đã có đủ dữ liệu và tính năng tốt (SRS, Học & luyện, nhiệm vụ, XP, thành tựu, dự báo 7 ngày). Vấn đề nằm ở cách trình bày: **mọi thứ được hiển thị cùng một mức quan trọng, kèm luôn phần giải thích luật chơi**. Vì vậy người học phải tự đọc và tự suy ra mình nên làm gì.

**Hướng giải quyết, gói trong 5 thay đổi lớn:**

1. **Trang chủ = "Việc hôm nay".** Một thẻ hành động lớn nằm trên cùng, một dải tiến bộ gọn, phần còn lại thu lại.
2. **Gộp 4 chế độ học thành 2 khái niệm** người học cần nhớ: *Ôn hôm nay* (SRS) và *Học thêm* (Học & luyện / luyện theo bộ). Bài kiểm tra trở thành "thử thách" trong từng bộ.
3. **Chấm gợi ý `InfoHint` thay toàn bộ đoạn giải thích.** Các đoạn như "SRS · lặp lại ngắt quãng…", "Đúng → hẹn xa hơn…" hay công thức XP chỉ hiện khi người học chạm vào ⓘ.
4. **Một khung phiên học thống nhất.** Hiện có 3 khung khác nhau (`StudySession`, `GuidedReviewSession`, `FocusFrame`), cần gom về 1 khung + 1 kiểu phản hồi + 1 màn kết quả.
5. **Trang "Tiến bộ" thật sự.** Hiện `/progress` chỉ chuyển hướng về trang chủ. Dữ liệu `EnReview`, `EnXpEvent` đã có sẵn, đủ để vẽ biểu đồ tuần, số từ nhớ lâu theo thời gian và nhóm từ hay sai.

**Giữ nguyên phong cách đồ họa:** nền giấy kem, tím lavender làm màu nhấn, viền dày + bóng đổ "pixel" 3px, font pixel cho tiêu đề, bộ icon `AdventureIcon`. Chỉ **tiết chế** những chỗ đang dùng quá tay và **chuẩn hóa** thành token.

---

## 1. Phương pháp & giới hạn

- Tôi đã đọc toàn bộ code giao diện: `src/app/(app)/**`, `src/components/english/**`, `src/components/ui/**`, `src/app/globals.css`, `src/config/navigation.ts`.
- Tiêu chí đánh giá tổng hợp từ các guideline: `anthropics/skills · frontend-design`, `ui-ux-pro-max`, `taste-skill`, `impeccable`, `vercel web-design-guidelines`. Xem [ux-review-plan-chatgpt.md](../ux-review-plan-chatgpt.md).
- **Chưa chụp được ảnh màn hình thật.** Dev server đang chạy ở cổng 3002 báo lỗi `PrismaClientValidationError` tại `enLearnerProfile.findUnique` (`src/services/english/enGoalService.ts:109`). Nhiều khả năng Prisma client hoặc DB local chưa được generate/migrate theo schema mới. Ngoài ra đăng nhập chỉ qua Google nên tôi không tự vào app được. Vì vậy cần **một vòng xác minh bằng ảnh** trước khi code (bước P0-0 trong lộ trình).

---

## 2. Năm vấn đề gốc rễ (xuyên suốt mọi màn)

| # | Vấn đề | Biểu hiện trong code | Hậu quả với người học |
|---|---|---|---|
| R1 | **Không có phân cấp.** Mọi khối đều là `mode-card` cùng cỡ, cùng viền | Trang chủ có 7 khối ngang hàng: 4 ô số liệu, thẻ SRS, mức nhớ, danh sách bộ, nhiệm vụ, lịch 7 ngày | Không biết nhìn vào đâu trước. Trên mobile, nút hành động chính bị đẩy xuống dưới 4 ô số liệu |
| R2 | **Giải thích luật chơi ngay trên màn hình** | `SrsTodayCard` có 4 dòng giải thích (định nghĩa SRS, lưu ý từ mới, "Đúng → / Sai →", thang 1-3-7-21-60). `DailyGoalSheet` in nguyên công thức XP. `StageBar` in hint cho cả 4 mức | Màn hình dày chữ, nhìn như tài liệu hướng dẫn chứ không giống một sản phẩm |
| R3 | **Quá nhiều khái niệm ngang hàng** | Ôn theo lịch · Học & luyện · Luyện tập · Bài kiểm tra · Nhiệm vụ · XP · Level · Thành tựu · Rương tuần · Mức nhớ (4 mức) | Người mới phải hiểu khoảng 10 khái niệm mới dùng được trơn tru |
| R4 | **Không nhất quán giữa các màn** | 3 khung phiên học khác nhau. Nút được viết tay ở hơn 20 chỗ thay vì dùng `Button`. Thoát bài dùng `window.confirm` ở `FocusFrame` nhưng dùng `ConfirmExitDialog` ở chỗ khác. Thương hiệu "WordQuest" (shell) khác "Vocabulary Mastery / Học Tiếng Anh" (login) | Cảm giác "ghép từ nhiều bản", thiếu đẳng cấp |
| R5 | **Tiến bộ bị phân mảnh** | Streak ở trang chủ, level ở Nhiệm vụ (bị ẩn trên mobile ở trang chủ), mức nhớ ở trang chủ, nhớ lâu ở hero Nhiệm vụ. `/progress` và `/mistakes` chỉ redirect về `/` | Không có nơi nào trả lời được câu "tôi đang giỏi lên thế nào" |

### Nợ kỹ thuật giao diện (sửa trong lúc refactor)

- `globals.css` có nhiều lớp ghi đè class "nhầm tên": `.adventure-sidebar .text-white { color: var(--foreground) }`, `.text-emerald-100\/70` bị ép thành màu xám… Đây là dấu vết của theme cũ. Cần đổi sang tên class đúng nghĩa rồi xóa phần ghi đè.
- Token mâu thuẫn nhau: `--radius-pill: 9999px` nhưng `.rounded-pill { border-radius: 8px }`; `--radius-dialog: 20px` nhưng `.rounded-dialog { 14px }`.
- `@theme inline` có `--duration-instant: var(--duration-instant)`, tức là tham chiếu vòng. Cần kiểm tra lại.
- Hơn 40 mã màu hex viết cứng trong `globals.css` (`#347f54`, `#795a99`…). Cần gom về token.
- Còn sót class của app tiếng Trung: `.hanzi-display`, `.hanzi-lg`.
- Chữ quá nhỏ: 8px, 9px, 10px, 11px trong `GoalRing`, `EnglishShell`, bottom nav, `AchievementBadge`. Dưới mức đọc thoải mái và dưới chuẩn tối thiểu 12px.
- Có `ThemeToggle` nhưng không được dùng ở đâu, nên người dùng không tự đổi được giao diện sáng/tối.
- Chưa có component Tooltip/Popover.

---

## 3. Audit từng màn hình

Thang điểm 1–5 theo 8 tiêu chí: **A** hành động chính rõ · **B** phân cấp · **C** mật độ chữ · **D** hiển thị tiến bộ · **E** trạng thái (loading/empty/error) · **F** nhất quán · **G** mobile & a11y · **H** thẩm mỹ.

| Màn | A | B | C | D | E | F | G | H | TB |
|---|---|---|---|---|---|---|---|---|---|
| Khung app (`EnglishShell`) | 3 | 3 | 3 | 3 | – | 2 | 3 | 3 | 2.9 |
| Trang chủ `/` | 2 | 1 | 2 | 3 | 3 | 3 | 2 | 3 | 2.4 |
| Ôn tập `/review` | 3 | 3 | 2 | 2 | 3 | 3 | 3 | 3 | 2.8 |
| Phiên ôn theo lịch (`StudySession`) | 4 | 4 | 3 | 3 | 4 | 3 | 4 | 4 | 3.6 |
| Phiên Học & luyện (`GuidedReviewSession`) | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2.9 |
| Chi tiết bộ `/sets/[id]` | 2 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 2.8 |
| Luyện tập / Kiểm tra | 3 | 3 | 3 | 3 | 3 | 2 | 3 | 3 | 2.9 |
| Nhiệm vụ `/quests` | 4 | 3 | 3 | 4 | 3 | 3 | 3 | 4 | 3.4 |
| Cửa hàng `/store` | 3 | 3 | 3 | 1 | 3 | 3 | 3 | 3 | 2.8 |
| Đăng nhập `/login` | 4 | 3 | 4 | – | 3 | 1 | 4 | 2 | 3.0 |

### 3.1 Khung app — `EnglishShell.tsx`, `config/navigation.ts`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| Lớn | Điều hướng chưa có mục **"Bộ từ của tôi"**. `/sets` redirect sang `/store`, và vào chi tiết bộ thì menu lại sáng mục "Tổng quan" | Đổi IA, xem mục 5 |
| Lớn | Tên **"Cửa hàng"** gợi ý phải trả tiền, trong khi bộ từ miễn phí (chỉ một số bộ cần mật khẩu) | Đổi thành **"Thư viện"** hoặc **"Khám phá"** |
| Lớn | Trên mobile, nút **Đăng xuất** nằm ở header, sát vòng XP. Đây là hành động hiếm dùng nhưng lại chiếm chỗ nổi bật | Gom vào menu tài khoản (avatar) cùng chỗ đổi giao diện sáng/tối và mục tiêu ngày |
| Nhỏ | Thẻ trang trí "Mỗi từ là một vùng đất mới" ở sidebar không mang thông tin gì | Thay bằng mini streak + vòng mục tiêu ngày |
| Nhỏ | Nhãn bottom nav 10px, chấm "thành tựu mới" chỉ có màu, không có chữ | Nhãn 12px; badge số |

### 3.2 Trang chủ — `HomeDashboard.tsx`, `SrsTodayCard.tsx`, `DueForecast.tsx`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| **Nghiêm trọng** | Trên mobile, 4 ô số liệu (Chuỗi, Tổng từ, Đã học, Đến hạn) chiếm cả màn đầu, còn nút "Bắt đầu ôn theo lịch" nằm dưới nếp gấp | **Hero "Việc hôm nay"** đưa lên đầu, nút chính hiện ngay ở màn đầu |
| **Nghiêm trọng** | Có 7 khối cùng trọng lượng, không có thứ tự đọc | Bố cục 3 tầng: Hành động → Tiến bộ → Bộ từ. Các khối khác thu gọn hoặc chuyển trang |
| Lớn | `SrsTodayCard` có 4 dòng giải thích | Giữ 1 dòng: "12 từ đến hạn · 5 từ mới · ~6 phút" + ⓘ |
| Lớn | "Tổng từ" và "Đã học x/y" là số liệu "kế toán", không trả lời được câu "tôi đang tiến bộ không" | Thay bằng: **Từ nhớ lâu** (+ chênh lệch so với tuần trước), **Streak**, **XP hôm nay/mục tiêu** |
| Lớn | Danh sách bộ từ nằm trong khung cuộn riêng (`max-h-72 overflow-y-auto`). Cuộn lồng trong cuộn trên mobile rất khó dùng | Hiện 3 bộ gần đây + "Xem tất cả" |
| Lớn | Nút **Gỡ bộ** (`RemoveSetButton`) nằm ngay trên trang chủ | Đưa vào menu "⋯" ở trang chi tiết bộ |
| Nhỏ | Level bar bị ẩn trên mobile (`hidden sm:block`) | Gộp vào dải tiến bộ |
| Nhỏ | Avatar chữ cái lặp lại với lời chào | Bỏ avatar ở đây, đưa avatar lên header (menu tài khoản) |

### 3.3 Ôn tập — `ReviewOverview.tsx`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| Lớn | Thẻ SRS bị **trùng** với trang chủ. Người học thấy cùng một việc ở 2 nơi, với 2 giao diện khác nhau | Trang chủ giữ SRS. Trang này chỉ còn **"Học thêm"** |
| Lớn | Nhãn "Bước 1 / Bước 2" + câu giải thích ở header + câu giải thích trong từng thẻ | Bỏ nhãn bước. Thứ tự được thể hiện bằng việc SRS nằm ở trang chủ |
| Lớn | Mỗi lần bấm chọn một bộ (chip) là gọi server, các chip bị khóa trong lúc chờ | Chọn ở client, chỉ lưu khi bấm Bắt đầu (hoặc debounce) |
| Nhỏ | Chip chọn bộ nằm trong vùng cuộn `max-h-32` | Bottom sheet "Chọn bộ" khi có > 6 bộ |

### 3.4 Phiên học — `StudySession`, `GuidedReviewSession`, `FocusFrame`, `QuestionView`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| **Nghiêm trọng** | 3 khung khác nhau: nút thoát là icon X / nút "Thoát" / "✕ Thoát"; thanh tiến độ là thanh liền / thanh liền + 2 dòng chữ / thanh chia đoạn; xác nhận thoát là dialog / dialog / `window.confirm` | **`SessionShell`** dùng chung: X bên trái, thanh tiến độ liền ở giữa, bộ đếm + XP bên phải |
| Lớn | Có 3 kiểu panel phản hồi đúng/sai khác nhau | **`AnswerFeedback`** dùng chung: viền màu, icon, từ + phát âm + nghĩa + 1 ví dụ, nút Tiếp tục (Enter) |
| Lớn | Có 4 màn kết quả khác nhau (`Summary`, chặng guided, practice, test) | **`SessionSummary`** dùng chung: điểm lớn, XP, "điều vừa đạt được" (từ lên Nhớ lâu, nhiệm vụ xong), từ cần xem lại, **1 nút chính** + 1 nút phụ |
| Lớn | Thanh tiến độ chia đoạn của `FocusFrame` tạo 1 đoạn cho mỗi từ. Bộ 100 từ thành 100 vạch mảnh không đọc được | Dùng thanh liền khi > 20 câu |
| Nhỏ | Câu "Đây là từ bạn chưa học. Đoán thử hoặc bấm 'Không biết'…" hiện lần nào cũng như nhau | Chỉ hiện ở lần đầu tiên (nhớ trong `localStorage`), sau đó dùng ⓘ |
| Nhỏ | Kết quả practice viết luật ra màn hình: "Luyện tập không đổi lịch ôn. Muốn tính nhiệm vụ ngày…" | Chuyển thành ⓘ cạnh tiêu đề |

### 3.5 Chi tiết bộ — `SetDetail.tsx`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| Lớn | Hai nút "Luyện tập" và "Bài kiểm tra" đứng cạnh nhau, không nói rõ khác nhau ở đâu. Chọn dạng câu hỏi bị giấu trong `<details>` | Một nút chính **"Luyện bộ này"**, mở sheet chọn dạng (Trộn · Nghĩa · Nghe · Điền). "Thử thách" (= kiểm tra) là nút phụ, kèm ⓘ "tính vào nhiệm vụ ngày" |
| Lớn | Phần giới thiệu bộ bị giấu ở dưới tiêu đề danh sách từ | Đưa lên header, 2 dòng + "Xem thêm" |
| Lớn | Nhãn mức nhớ của từng từ bị ẩn trên mobile | Hiện dạng chấm màu 8px + tên mức trong thẻ từ |
| Nhỏ | Danh sách từ nằm trong khung cuộn riêng (`max-h-[60vh]`) | Cuộn theo trang, thanh tìm kiếm/lọc dính ở trên |
| Nhỏ | Nút Gỡ bộ đặt cạnh tiêu đề danh sách | Menu "⋯" ở header |

### 3.6 Nhiệm vụ — `QuestsView.tsx`, `DailyGoalSheet.tsx`, `RewardCenter.tsx`

Đây là màn tốt nhất hiện tại, chỉ cần tinh chỉnh.

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| Lớn | Sheet mục tiêu in nguyên công thức "Ôn theo lịch đúng +20, Học & luyện đúng +10, Nhớ lâu +100…" | Một dòng + ⓘ "XP tính thế nào?" |
| Nhỏ | Hero và tab "Hôm nay" đều có thông tin level/streak | Hero chỉ giữ level. Streak chuyển sang trang Tiến bộ |
| Nhỏ | Nhiệm vụ SRS trỏ tới `/#srs` (anchor) | Mở thẳng phiên ôn |

### 3.7 Cửa hàng → Thư viện — `store/page.tsx`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| Lớn | Thẻ bộ từ chỉ có tên, số từ và mô tả. Không có trình độ, chủ đề hay thời lượng, nên người học không biết bộ nào hợp với mình | Thêm nhãn trình độ (A1–C1), chủ đề, "~x phút/ngày"; mục "Gợi ý cho bạn" (*cần dữ liệu, xem câu hỏi Q4*) |
| Lớn | Không có tìm kiếm hay lọc | Thanh tìm + chip lọc theo trình độ/chủ đề |
| Nhỏ | Câu "Tiến độ học của bạn được lưu khi gỡ bộ" là thông tin phòng thủ, không thuộc chỗ này | Chuyển vào dialog gỡ bộ |

### 3.8 Đăng nhập — `login/page.tsx`

| Mức | Vấn đề | Đề xuất |
|---|---|---|
| Lớn | Tên thương hiệu khác với app ("Vocabulary Mastery" vs "WORDQUEST") | Thống nhất thương hiệu (*câu hỏi Q1*) |
| Lớn | Màn hình trống, không nói được giá trị sản phẩm | Hero minh họa phong cách pixel + 3 lợi ích (icon + 3–4 chữ mỗi cái) + nút Google |
| Nhỏ | Dòng "Hệ thống học độc lập" không có nghĩa với người dùng | Bỏ |

---

## 4. Định hướng thiết kế — "Pixel Parchment tinh gọn"

### Giữ lại (bản sắc)
- Nền giấy kem `--background #fbf0e5` + texture chấm pixel (giảm opacity từ .22 xuống ~.12).
- Màu nhấn tím `--accent #725195`, vàng `--gold` cho XP/thưởng, xanh `--success` cho "nhớ lâu".
- Font pixel **chỉ cho số lớn và tiêu đề H1** (`.game-number`, H1). H2 trở xuống dùng sans để dễ đọc.
- Bóng "pixel" 3px dưới thẻ (`0 3px 0`) là chữ ký thị giác, giữ nhưng **chỉ dùng cho phần tử bấm được** (nút, thẻ tương tác). Thẻ chỉ để đọc thì dùng viền 1px, không đổ bóng.
- Bộ icon `AdventureIcon` cho điều hướng, nhiệm vụ, thành tựu.

### Tiết chế
- **Nhấn bằng màu tối đa 1 chỗ mỗi màn hình** (thẻ hành động chính). Hiện viền `border-2 border-accent` + nền `accent-subtle` đang xuất hiện ở nhiều thẻ.
- Emoji (🔥 🧠 📖 ⏱ 🏆) thay bằng `AdventureIcon` để đồng bộ phong cách pixel.
- Gradient trên thẻ (`game-card-amber/lilac/rose`) chỉ dùng cho khoảnh khắc thưởng (thành tựu, level up, rương).

### Chuẩn hóa token (`globals.css`)
| Nhóm | Đề xuất |
|---|---|
| Thang chữ | 12 · 14 · 16 · 20 · 24 · 32 · 44 (số lớn). Không dùng dưới 12px |
| Khoảng cách | Giữ thang 4px hiện có. Khoảng giữa section = 24 (mobile) / 32 (desktop) |
| Bo góc | control 8 · card 12 · panel 16 · dialog 20 · pill 9999. Xóa các class ghi đè mâu thuẫn |
| Bóng | `--shadow-press: 0 3px 0 …` (tương tác) · `--shadow-overlay` (dialog). Bỏ bóng cho thẻ tĩnh |
| Màu | Gom toàn bộ hex trong `globals.css` thành token. Thêm `--xp` (gold), `--stage-new/learning/remembering/longterm` |
| Motion | 150ms cho hover/press · 220ms cho chuyển trạng thái · 320ms cho thưởng. Tôn trọng `prefers-reduced-motion` (đã có) |

---

## 5. Kiến trúc thông tin mới

### Mô hình tư duy cho người học (chỉ còn 3 ý)

> **Hôm nay** ôn những từ sắp quên → **Học thêm** từ mới khi còn sức → **Xem mình tiến bộ**.

| Khái niệm hiện tại | Khái niệm mới (nhãn hiển thị) |
|---|---|
| Ôn theo lịch (SRS) | **Ôn hôm nay** |
| Học & luyện (guided) | **Học thêm** |
| Luyện tập theo bộ | **Luyện bộ này** (trong chi tiết bộ) |
| Bài kiểm tra | **Thử thách** (trong chi tiết bộ, tính vào nhiệm vụ) |
| 4 mức nhớ | Giữ nguyên, hiển thị bằng màu + ⓘ |

### Điều hướng (4 mục)

| Mobile (bottom nav) | Desktop (sidebar) | Route | Nội dung |
|---|---|---|---|
| **Hôm nay** | Hôm nay | `/` | Hero việc hôm nay, dải tiến bộ, nhiệm vụ ngày (gọn), bộ đang học |
| **Bộ từ** | Bộ từ của tôi | `/sets` (hiện đang redirect) | Danh sách bộ đã tải + nút "Thêm bộ" mở Thư viện |
| **Tiến bộ** | Tiến bộ | `/progress` (hiện đang redirect) | Biểu đồ, mức nhớ, từ hay sai, thành tựu, level |
| **Khám phá** | Thư viện | `/store` (giữ route, đổi nhãn) | Tìm và tải bộ từ |

- **"Học thêm"** (`/review`) là nút phụ trong hero trang chủ và trong trang Bộ từ, không cần nằm ở menu.
- **Nhiệm vụ** gộp vào trang chủ (rút gọn) và trang Tiến bộ (đầy đủ: tuần, rương, thành tựu). `/quests` vẫn giữ để link cũ không gãy (*câu hỏi Q2*).
- **Menu tài khoản** (avatar ở header): tên, mục tiêu ngày, giao diện Sáng/Tối/Tự động, Đăng xuất. Admin có thêm mục Quản trị.

---

## 6. Thiết kế lại các màn chính (wireframe mobile 375px)

### 6.1 Trang chủ — "Hôm nay"

```
┌─────────────────────────────────┐
│ ◆ WORDQUEST            (◔ 60%) (K) │  ← vòng XP ngày + avatar menu
├─────────────────────────────────┤
│ Chào buổi tối, Khánh             │  H1 pixel, 1 dòng
│                                  │
│ ╔═════════════════════════════╗ │
│ ║ ÔN HÔM NAY               ⓘ ║ │  ← thẻ hero duy nhất có màu nhấn
│ ║ 12 từ sắp quên · 5 từ mới   ║ │
│ ║ ~6 phút · +240 XP           ║ │
│ ║ [   Bắt đầu ôn  →        ]  ║ │  ← nút primary, luôn trong màn đầu
│ ╚═════════════════════════════╝ │
│   Học thêm từ mới →              │  ← link phụ
│                                  │
│ 🔥 7 ngày   ◆ 84 nhớ lâu ↑12   Lv4│ ← dải tiến bộ 1 hàng, chạm → /progress
│ ▓▓▓▓▓▓▓░░░ 340/500 XP hôm nay    │
│                                  │
│ Nhiệm vụ hôm nay        2/3  ⓘ  │
│ ✓ Ôn 10 từ theo lịch             │
│ ○ Luyện 20 câu         8/20  →   │
│                                  │
│ Đang học                Xem hết →│
│ ▸ IELTS Core 1  ▓▓▓▓░  3 đến hạn │
│ ▸ Business 500  ▓▓░░░            │
└─────────────────────────────────┘
```

Thẻ hero có **4 trạng thái**, mỗi trạng thái chỉ có 1 nút chính:

| Trạng thái | Tiêu đề | Nút chính |
|---|---|---|
| Chưa có bộ từ | "Chọn bộ từ đầu tiên" | Khám phá thư viện |
| Có từ đến hạn | "Ôn hôm nay · 12 từ" | Bắt đầu ôn |
| Ôn xong, còn sức | "✓ Xong việc chính. Mai có 8 từ" | Học thêm 10 từ |
| Đạt mục tiêu ngày | "Hoàn thành mục tiêu hôm nay 🎉" | (nút phụ) Học thêm |

Dự báo 7 ngày và biểu đồ mức nhớ **chuyển sang trang Tiến bộ**.

### 6.2 Phiên học — `SessionShell` chung

```
┌─────────────────────────────────┐
│ ✕  ▓▓▓▓▓▓▓░░░░░░░░   7/17  +20XP│
├─────────────────────────────────┤
│        TỪ MỚI · Câu 7            │  ← nhãn nhỏ, ⓘ chỉ ở lần đầu
│                                  │
│   Từ tiếng Anh nào có nghĩa là   │
│      "kiên trì, bền bỉ"          │
│                                  │
│   [ p _ _ _ _ _ _ _ _ _ _ ]      │
│                                  │
│   [ Không biết ]  [ Kiểm tra ]   │  ← nút chính trong tầm ngón cái
└─────────────────────────────────┘
```

Panel phản hồi (`AnswerFeedback`) trượt lên từ dưới (bottom sheet trên mobile): ✓/✕ · từ + IPA + 🔊 · nghĩa · 1 ví dụ · "⬆ 3 → 7 ngày" (có ⓘ) · nút **Tiếp tục (Enter)**.

### 6.3 Màn kết quả — `SessionSummary` chung

```
┌─────────────────────────────────┐
│            ◆ (icon pixel)        │
│         15/17 đúng               │  ← số lớn pixel
│          +320 XP                 │
│                                  │
│  Vừa đạt được                    │
│  ◆ 3 từ lên Nhớ lâu: grit · …    │
│  ✓ Nhiệm vụ "Ôn 10 từ" +50 XP    │
│                                  │
│  Cần xem lại (2)            ▾    │  ← thu gọn mặc định
│                                  │
│  [   Học thêm 10 từ  →        ]  │  ← 1 nút chính theo ngữ cảnh
│        Về trang chủ              │
└─────────────────────────────────┘
```

### 6.4 Chi tiết bộ

```
← Bộ từ                          ⋯   ← menu: Gỡ bộ, Chia sẻ…
IELTS Core 1
120 từ · B2 · Học thuật              2 dòng mô tả… Xem thêm
▓▓▓▓▓▓▓▓░░░░ 64 nhớ lâu · 30 đang nhớ ⓘ
[  Luyện bộ này  ▾ ]  [ Thử thách ⓘ ]
───────────────────────────────────
[🔍 Tìm từ…      ] (Tất cả)(Chưa ôn)(Hay quên)  👁
● grit        /ɡrɪt/  n.  sự bền bỉ       🔊
● ubiquitous  …                           🔊
```

### 6.5 Trang Tiến bộ (mới)

```
Tiến bộ
┌ Tuần này ──────────────────────┐
│ T2 T3 T4 T5 T6 T7 CN            │  ← lịch tuần (WeekStrip có sẵn)
│ ■  ■  ■  □  ■  ·  ·    🔥 7 ngày│
└────────────────────────────────┘
┌ Từ nhớ lâu ────────────────────┐
│ 84  ↑12 so với tuần trước       │
│ ╱‾‾╲__╱‾‾‾  (sparkline 8 tuần)  │  ← cần query EnReview
└────────────────────────────────┘
Mức nhớ   ▓▓▓▓░░░░  (StageBar + ⓘ)
7 ngày tới ▁▃▅▂▁▁▂  (DueForecast)
Từ hay sai  grit · ubiquitous · …  [Ôn ngay]
Level 4 · Thành tựu 12/40 →
```

---

## 7. Component cần tạo / chuẩn hóa

| Component | Vị trí | Mô tả | Thay thế cho |
|---|---|---|---|
| `InfoHint` | `ui/InfoHint.tsx` | Chấm ⓘ 20px (vùng chạm 44px), popover 1–2 câu + tiêu đề 2–4 chữ, đóng khi chạm ra ngoài hoặc Esc, `aria-describedby`, có bàn phím. Dùng Popover API gốc của trình duyệt, **không thêm thư viện** | Mọi đoạn giải thích |
| `SessionShell` | `english/session/SessionShell.tsx` | Khung toàn màn: thoát (dùng `ConfirmExitDialog`), thanh tiến độ, đếm, XP pop | Header trong `StudySession`, `GuidedReviewSession`, `FocusFrame` |
| `AnswerFeedback` | `english/session/AnswerFeedback.tsx` | Panel đúng/sai thống nhất | 3 panel hiện tại |
| `SessionSummary` | `english/session/SessionSummary.tsx` | Màn kết quả thống nhất | 4 màn kết quả |
| `TodayHero` | `english/home/TodayHero.tsx` | Thẻ hành động chính có 4 trạng thái | `SrsTodayCard` + empty state trang chủ |
| `ProgressStrip` | `english/home/ProgressStrip.tsx` | Streak · nhớ lâu · level · XP ngày trong 1 hàng | 4 ô stat + LevelBar |
| `StatTile`, `Sparkline` | `ui/` | Dùng ở trang Tiến bộ | – |
| `AccountMenu` | `english/AccountMenu.tsx` | Avatar → mục tiêu, giao diện, đăng xuất | Nút đăng xuất + `ThemeToggle` chưa dùng |
| `Button` (đã có) | `ui/Button.tsx` | **Bắt buộc dùng.** Xóa hơn 20 chuỗi class nút viết tay | `solidButton`, `outlineButton`, `linkButton`… |
| `OnboardingTour` | `english/OnboardingTour.tsx` | 3 bước, có nút Bỏ qua, chỉ hiện 1 lần (lưu server ở `EnLearnerProfile` hoặc `localStorage`) | – |

---

## 8. Nội dung chấm gợi ý (InfoHint)

| Vị trí | Tiêu đề | Nội dung |
|---|---|---|
| Hero "Ôn hôm nay" | Vì sao những từ này? | App hỏi lại mỗi từ đúng lúc bạn sắp quên. Trả lời đúng thì từ được hẹn xa hơn, sai thì gặp lại sớm. |
| "5 từ mới" | Từ mới | Lần đầu gặp, cứ đoán. Sai là bình thường, bạn sẽ gặp lại sau 1 ngày. |
| "⬆ 3 → 7 ngày" | Lịch ôn | Khoảng cách ôn: 1 → 3 → 7 → 21 → 60 ngày. |
| Mức nhớ (StageBar) | 4 mức nhớ | Chưa ôn · Mới học (1 ngày) · Đang nhớ (3–7 ngày) · Nhớ lâu (21+ ngày). |
| XP / vòng mục tiêu | XP tính thế nào? | Ôn đúng +20 · Học thêm đúng +10 · Từ lên Nhớ lâu +100. Câu sai không mất điểm. |
| Nút "Thử thách" | Thử thách khác luyện tập? | Không hiện đáp án đến khi nộp bài. Kết quả được tính vào nhiệm vụ ngày. |
| "Học thêm" | Học thêm | Xem thẻ 10 từ rồi luyện ngay. Không ảnh hưởng lịch ôn. |
| Rương tuần | Rương tuần | Hoàn thành mọi nhiệm vụ tuần để mở, nhận +x XP. |
| Streak | Chuỗi ngày | Mỗi ngày học ít nhất 1 lượt là giữ được chuỗi. |

Quy tắc viết: **động từ đi trước, tối đa 2 câu, không dùng thuật ngữ (SRS, Leitner, box).**

---

## 9. Lộ trình triển khai

Mỗi mục là **1 PR nhỏ**, làm trên nhánh feature, phải qua `npm run quality`, không đổi logic trong `src/lib/english/` và `src/services/english/`, trừ chỗ có ghi **[data]**.

### P0 — Nền móng & thắng nhanh (khoảng 1 tuần)

| PR | Nội dung | File chính | Nghiệm thu |
|---|---|---|---|
| P0-0 | Sửa lỗi dev local (Prisma generate/migrate). Chụp ảnh hiện trạng 375px + 1440px, sáng + tối, lưu `docs/ux-audit/before/` | — | Có đủ ảnh 10 màn × 4 biến thể |
| P0-1 | **Dọn token**: gom hex thành biến, sửa radius mâu thuẫn và vòng `--duration`, xóa class ghi đè sai tên + `.hanzi-*`, sàn chữ 12px | `globals.css`, `EnglishShell.tsx` | Không còn hex trong component; chữ không dưới 12px; giao diện nhìn như cũ (không đổi thị giác) |
| P0-2 | **`InfoHint`** + thay các đoạn giải thích ở `SrsTodayCard`, `ReviewOverview`, `StageBar`, `DailyGoalSheet`, `PracticeRunner` | `ui/InfoHint.tsx` + 5 file | Không còn đoạn giải thích dài quá 1 dòng; dùng được bằng bàn phím và screen reader |
| P0-3 | **Trang chủ mới**: `TodayHero` (4 trạng thái) + `ProgressStrip`; bỏ 4 ô stat, khung cuộn lồng, nút gỡ bộ | `HomeDashboard.tsx`, `home/*` | Ở 375px nút chính hiện trong màn đầu; test 5 giây đạt |
| P0-4 | **Bỏ phần SRS trùng** ở `/review`, đổi nhãn thành "Học thêm"; chọn bộ ở client | `ReviewOverview.tsx` | Một việc chỉ xuất hiện ở một nơi |

### P1 — Thống nhất trải nghiệm học (khoảng 1–2 tuần)

| PR | Nội dung | File chính |
|---|---|---|
| P1-1 | `SessionShell` + `AnswerFeedback` dùng cho cả 3 luồng; bỏ `window.confirm` | `StudySession`, `GuidedReviewSession`, `FocusFrame`, `PracticeRunner`, `TestRunner` |
| P1-2 | `SessionSummary` dùng chung, có khối "Vừa đạt được" + 1 nút chính theo ngữ cảnh | như trên |
| P1-3 | Chi tiết bộ: header mới, nút "Luyện bộ này" mở sheet chọn dạng, "Thử thách", menu ⋯, cuộn theo trang | `SetDetail.tsx` |
| P1-4 | Chuẩn hóa nút: thay mọi nút viết tay bằng `Button` | toàn bộ `components/english` |

### P2 — Kiến trúc thông tin & Tiến bộ (khoảng 1–2 tuần)

| PR | Nội dung | File chính |
|---|---|---|
| P2-1 | Điều hướng mới (Hôm nay · Bộ từ · Tiến bộ · Khám phá) + `AccountMenu` (giao diện sáng/tối, mục tiêu, đăng xuất) | `navigation.ts`, `EnglishShell.tsx` |
| P2-2 | Trang `/sets` "Bộ từ của tôi" (bỏ redirect) | `app/(app)/sets/page.tsx` |
| P2-3 | Trang `/progress`. **[data]** Thêm service tổng hợp từ `EnReview`/`EnXpEvent`: số từ nhớ lâu theo tuần, độ chính xác theo tuần, top từ hay sai | `services/english/enProgressService.ts` (mới), `app/(app)/progress/page.tsx` |
| P2-4 | Gộp Nhiệm vụ vào Hôm nay + Tiến bộ; `/quests` vẫn chạy | `QuestsView.tsx` |
| P2-5 | Thư viện: đổi tên, tìm kiếm, lọc, nhãn trình độ/chủ đề **[data nếu chưa có trường]** | `store/page.tsx` |

### P3 — Đánh bóng (khoảng 1 tuần)

- Onboarding 3 bước cho người mới.
- Trang đăng nhập mới với thương hiệu thống nhất.
- Motion: chuyển cảnh giữa các câu, ăn mừng nhớ lâu/level (tôn trọng reduced-motion).
- Empty state có minh họa pixel cho mọi danh sách.
- Kiểm tra WCAG AA cả 2 theme (tương phản, focus, `aria-live` cho phản hồi).
- Chụp ảnh sau khi làm, lưu `docs/ux-audit/after/`, so sánh với trước.

---

## 10. Đo lường thành công

| Chỉ số | Cách đo | Mục tiêu |
|---|---|---|
| Test 5 giây | 3–5 người chưa dùng app nhìn trang chủ 5 giây, rồi hỏi "hôm nay cần làm gì?" | ≥ 80% trả lời đúng |
| Thời gian tới hành động đầu | Từ lúc mở app đến lúc bấm Bắt đầu ôn | < 5 giây |
| Tỉ lệ hoàn thành ôn hôm nay | % ngày có từ đến hạn và người học ôn xong (đã có dữ liệu) | Tăng so với trước refactor |
| Retention D7 / streak trung bình | Từ `EnLearnerProfile` / `EnXpEvent` | Tăng |
| Lượng chữ trên trang chủ | Đếm từ hiển thị | Giảm ≥ 50% |

---

## 11. Quyết định & câu hỏi còn mở

### Đã chốt (28/10/2026)

| Chủ đề | Quyết định |
|---|---|
| Điều hướng (Q2) | **Hôm nay · Bộ từ · Tiến bộ · Khám phá.** Nhiệm vụ gộp vào Hôm nay + Tiến bộ |
| Thuật ngữ (Q6) | **Đổi tên:** Ôn hôm nay · Học thêm · Thử thách · Thư viện/Khám phá |
| Game hóa (Q3) | **Giữ hết, nhưng ít nổi bật:** trang chủ chỉ hiện XP ngày + streak; level, thành tựu, rương nằm ở Tiến bộ |
| Thực hiện (Q8) | **Claude code trực tiếp** theo từng PR P0 → P3 |

### Còn mở

Phần trong ngoặc là đề xuất mặc định nếu không có ý kiến khác.

1. **Q1 — Thương hiệu:** tên chính thức là "WordQuest" hay "Vocabulary Mastery / Học Tiếng Anh"? Có logo riêng không? *(Mặc định: WordQuest, giữ icon la bàn pixel.)*
2. **Q2 — Điều hướng:** đồng ý gộp Nhiệm vụ vào Hôm nay + Tiến bộ và thay bằng "Bộ từ" + "Tiến bộ" trong menu? *(Mặc định: đồng ý.)*
3. **Q3 — Mức độ game hóa:** giữ đủ XP + level + nhiệm vụ + thành tựu + rương tuần, hay giảm bớt (ví dụ ẩn rương/thành tựu vào trang Tiến bộ)? *(Mặc định: giữ hết, nhưng chỉ hiện nổi bật XP ngày + streak.)*
4. **Q4 — Thư viện:** bộ từ đã có thông tin trình độ (A1–C1) và chủ đề trong DB chưa? Nếu chưa, có muốn thêm trường này (cần migration + nhập lại trong admin) không? *(Mặc định: thêm, làm ở P2-5.)*
5. **Q5 — Người dùng chính:** đa số học trên điện thoại hay máy tính? Độ tuổi/trình độ? Có học viên thật đang dùng không (ảnh hưởng mức độ thận trọng khi đổi điều hướng)?
6. **Q6 — "Thử thách":** đồng ý đổi tên "Bài kiểm tra" thành "Thử thách" và đổi "Ôn theo lịch / Học & luyện" thành "Ôn hôm nay / Học thêm"?
7. **Q7 — Onboarding:** lưu trạng thái "đã xem hướng dẫn" trên server (cần thêm cột trong `EnLearnerProfile`) hay chỉ trên trình duyệt?
8. **Q8 — Ai làm:** giao cho ChatGPT/Codex theo từng PR ở mục 9, hay để Claude làm trực tiếp? Có cần duyệt mockup trước khi code không?
9. **Q9 — Ảnh hiện trạng:** bạn có thể sửa lỗi Prisma ở dev server (hoặc cho phép tôi chạy `prisma generate` / migrate trên DB local) và đăng nhập sẵn trong trình duyệt nội bộ để tôi chụp hiện trạng không?
