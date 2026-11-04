# Báo cáo rà soát UX/UI (Giai đoạn 1)

Ngày: 2026-11-04. Chưa sửa code nào. Chờ duyệt trước khi sang Giai đoạn 2.

## Phạm vi đã kiểm chứng và chưa kiểm chứng

**Đã xem trực tiếp (trình duyệt trong app, tài khoản student, người học mới chưa tải bộ nào):**
375px: `/` (vocab), `/review`, `/store`, `/progress`, `/tests`, `/tests/papers`, `/tests/results`.
1280px: `/review` (sidebar desktop).
Đọc code: `VocabShell`, `TestShell`, `ModeSwitch`, `AccountMenu`, `src/config/navigation.ts`, `src/config/testNavigation.ts`, `MaterialIcon`, các lần dùng `AdventureIcon`.

**Chưa kiểm chứng, cần bạn biết:**
- **Admin**: phiên đăng nhập trong trình duyệt là student (`/admin` và `/admin/tests` tự chuyển về `/tests`). Tôi không có tài khoản admin và không nhập mật khẩu hộ. Mục admin chỉ được đánh giá qua code. Cần bạn đăng nhập admin trong khung trình duyệt nếu muốn chụp thật.
- **Tablet 768px** và phần lớn 1280px: chưa chụp. Máy chủ dev trên cổng 3002 chết một lần giữa chừng (do phiên khác dùng chung cổng), sau đó trang tải lại liên tục nên các phép đo tự động bằng JS (vùng chạm, cuộn ngang, lỗi hydration) không chạy được. Số liệu vùng chạm bên dưới lấy từ class Tailwind trong code, chưa đo pixel thật.
- **Chưa xem**: `/sets/[setId]`, practice, phiên làm bài (`TestRunner`), kết quả chi tiết, trang đăng nhập, bàn phím ảo che ô nhập, kiểm tra tương phản bằng công cụ, tab/focus bằng bàn phím, console hydration.
- Thông báo `ERR_CONNECTION_REFUSED` trong console là do máy chủ dev chết, không phải lỗi app.
- Không có ảnh trước/sau lưu trong repo ở bước này; ảnh sẽ chụp lại ở Giai đoạn 2.

## Bảng vấn đề

| # | Màn hình | Vấn đề | Mức | Đề xuất sửa |
|---|---|---|---|---|
| 1 | Điều hướng, mọi màn | Trùng biểu tượng, sai nghĩa. "Tiến bộ" (vocab) và "Kết quả" (test) cùng dùng cúp. "Bài kiểm tra" (test) và "Nội dung" (admin) cùng dùng cờ. "Cửa hàng" dùng biểu tượng sách/tài liệu. "Ôn theo bộ" dùng mũi tên lặp. Map `navAdventureIcons` bị chép y hệt ở hai shell, ánh xạ từ tên Material sang tên Adventure khá tuỳ tiện (`flag`→cúp, `edit_note`→cờ). | Cao | Mỗi mục một biểu tượng riêng đúng nghĩa: Hôm nay (lịch/mục tiêu), Ôn theo bộ (thẻ/lặp), Tiến bộ (biểu đồ), Cửa hàng (túi/cửa hàng), Khóa học (sách), Bài kiểm tra (bài/clipboard), Kết quả (cúp hoặc tích). Đặt icon thẳng vào `NavLink`, bỏ bảng ánh xạ. |
| 2 | Điều hướng, mọi màn | Hai bộ biểu tượng cùng tồn tại: `AdventureIcon` (SVG riêng, 7 tên, dùng ở 7 file) và `MaterialIcon` (font, dùng ở 23 file, nhiều tên). Thêm ký tự chữ thay biểu tượng: `✕` (nút thoát `TestRunner`), `✓`, `→`, `←`, 💌 và 💗 trong `UserMessageModal`. | Cao | Chọn một bộ cho điều hướng và hành động (đề xuất giữ `MaterialIcon` cho toàn app, `AdventureIcon` chỉ cho logo/minh hoạ). Thay `✕`, `←` bằng icon `close`, `arrow_back` cùng cỡ. Bỏ emoji. |
| 3 | Chuyển khu vực (Từ vựng / Kiểm tra) | Công tắc là hai nút nhỏ (`min-h-9`, 36px) trong viên thuốc, dưới 44px. Chuyển khu vực mất ngữ cảnh: "Từ vựng" luôn về `/?mode=vocab`, "Kiểm tra" luôn về `/tests`. Khu Kiểm tra trên điện thoại chỉ có công tắc + avatar, không có tiêu đề khu vực. | Cao | Nâng vùng chạm lên ≥44px (tăng padding dọc, không đổi hình dáng). Nhớ trang gần nhất của mỗi khu vực khi chuyển. Giữ `aria-current` như hiện tại. |
| 4 | Thanh điều hướng dưới (mobile) | Nhãn 11px (`text-[11px]`), trùng 12 chỗ cỡ 9–11px trong app. Vùng chạm 48px là ổn. Vocab có 4 mục, test có 3, số mục hợp lý. | Vừa | Nâng nhãn lên 12px, kiểm tra không xuống dòng ở 375px ("Bài kiểm tra", "Ôn theo bộ" đang vừa một dòng). |
| 5 | Vocab shell, tiêu đề mobile | Vùng chạm liên kết mục tiêu ngày chỉ `min-h-10` (40px). Hiện cả vòng, "0/400" và "Lv 1" cho người mới có 0 XP: số 0 thừa, vòng rỗng. | Vừa | Vùng chạm 44px. Khi 0 XP chỉ hiện "Lv 1" hoặc vòng kèm chữ "Mục tiêu 400 XP". Theo quy tắc "không hiện số 0 thừa". |
| 6 | `/` (vocab, người mới) | Ba nút chính dẫn cùng một nơi: "Chọn môn học →", "Chọn bộ từ đầu tiên →", "Chọn môn học để mở nhiệm vụ →". Hai thẻ tím liền nhau cùng cấp, người dùng khó biết đâu là bước đầu. Thẻ "Nhiệm vụ hôm nay" hiện "0/1", "0/400" và hai dòng khoá. | Cao | Mỗi màn một CTA chính. Với người mới: giữ một thẻ "Bắt đầu", ẩn thẻ "Ôn theo bộ" và "Nhiệm vụ" cho đến khi có bộ từ (hoặc gộp thành dòng nhỏ không có nút). Đã có hướng này ở commit 2383b5d, cần giữ mọi gợi ý hiện có. |
| 7 | `/review` | Biểu tượng chỉnh (`tune`) ở góc phải tiêu đề không có chữ đi kèm. Thẻ trạng thái rỗng có tiêu đề "Chưa có bộ từ" và nút "Chọn môn học →" ổn, nhưng nút rộng ít hơn các màn khác. | Vừa | Xác nhận `aria-label` của nút `tune` (đọc code `ReviewOverview`), thêm `title`. Giữ trạng thái rỗng, đồng nhất độ rộng nút với `/store`. |
| 8 | Quay lại / breadcrumb | Đường quay lại là liên kết chữ `← Tên` viết tay ở từng trang (`SetDetail`, `SubjectDetail`, `TestSubjectDetail`, kết quả chi tiết), mỗi nơi một kiểu (`min-h-10`, ký tự `←`). `SetDetail` đổi nhãn theo ngữ cảnh ("Ôn theo bộ" / "Cửa hàng" / tên môn học), hay nhưng không phải thành phần dùng chung. Không có breadcrumb ở trang sâu 3 cấp (môn học → bộ → luyện tập). | Vừa | Tạo một thành phần `BackLink` (icon `arrow_back`, vùng chạm 44px) trong `src/components/ui/` và dùng ở các trang trên. Không thêm breadcrumb. |
| 9 | `/tests/results` và `/tests/papers` | Thẻ kết quả: tiêu đề và tên khoá cắt "…" ổn. "4/6 · 67%" và nhãn "Chưa đạt" cùng nằm hàng, vừa ở 375px nhưng sát. Thẻ danh sách đề: "Chưa đạt · 67%" và nút "Làm lại" cùng hàng, tên khoá bị cắt thành "Mẫu: Ngân hàng câu h…". | Thấp | Cho tên khoá xuống dòng thứ hai (`line-clamp-2`) thay vì cắt một dòng. |
| 10 | `/tests` thư viện khoá | Mỗi khoá có hai hành động cùng cấp ("Vào làm bài →" và nhãn "Đã đăng ký ✓" cùng hàng), nhãn trạng thái trông như nút. Thanh tiến độ chỉ cao 6px. Tiêu đề "Khóa học của bạn" gồm cả khoá mẫu. Thẻ khoá dùng `rounded-panel border bg-surface` viết tay, không qua `Card`. | Vừa | Dùng `Card` và `Badge` từ `ui/`. "Đã đăng ký" thành `Badge` không thể nhấp. |
| 11 | `/tests`, `TestLibrary` | Trạng thái "chưa tham gia khoá nào" ghi "Chọn một khoá ở mục Khám phá" nhưng không có mục "Khám phá" nào trong menu. | Cao | Sửa copy trỏ đúng nơi (hoặc thêm nút dẫn tới danh sách khoá). Cần bạn xác nhận ý muốn, vì đổi ý nghĩa copy nằm ngoài phạm vi mặc định. |
| 12 | Nhất quán, token | Còn 17 chỗ `style={{` (6 ở `progress/charts.tsx`; còn lại là độ rộng thanh tiến độ ở `ProgressBar`, `LevelBar`, `QuestItem`, `TestLibrary`, `CourseBoard`…). Màu hex thô: `AdventureIcon.tsx` (≈10 màu minh hoạ), logo Google (4 màu thương hiệu, hợp lệ), `themeColor` ở `app/layout.tsx`. Độ rộng động qua `style` là chấp nhận được; màu hex trong `AdventureIcon` nên đi qua biến. | Thấp | Chỉ sửa `AdventureIcon` và `charts.tsx` nếu giữ cả hai bộ icon. Để lại các `style` chỉ đặt `width: n%`. |
| 13 | Nhất quán, mã | `VocabShell` và `TestShell` lặp ≈80% mã (sidebar, header, nav dưới, map biểu tượng). Một chỗ sửa nav phải sửa hai nơi, nguyên nhân của #1. | Vừa | Rút thành một `AppShell` nhận danh sách mục và phần đặc thù (mục tiêu ngày chỉ có ở vocab). Chỉ làm nếu duyệt; kích thước thay đổi vừa phải. |
| 14 | Thương hiệu / copy | Khu Kiểm tra vẫn ghi dưới logo "Học từ vựng tiếng Anh". Mục "Khóa học" xuất hiện cả ở nav học viên và nav admin Kiểm tra. | Thấp | Đổi dòng phụ theo khu vực: "Học từ vựng tiếng Anh" / "Luyện đề kiểm tra". (Đổi copy, cần duyệt.) |
| 15 | Copy tiếng Anh | "XP" và "Lv 1" hiển thị cho người học (`VocabShell`, `RewardCenter`, `LeaderboardTab`, `LevelBar`, `ProgressHub`). Với ứng dụng này "XP" là thuật ngữ cố định trong quy tắc dự án nên có thể giữ, nhưng "Lv" nên là "Cấp". | Thấp | Đổi "Lv" thành "Cấp" ở 6 chỗ nếu bạn muốn. Hỏi trước vì là đổi copy. |
| 16 | Phiên làm bài (`TestRunner`) | Nút thoát là ký tự `✕` trong ô viền (đã có `aria-label` và `min-h-11 min-w-11`, tốt). Chân trang dính đáy dùng `pb-[max(0.75rem,env(safe-area-inset-bottom))]` (tốt). Hai nút ở chân dùng `text-xs sm:text-sm` để khỏi xuống dòng, có thể nhỏ khó đọc. Cả `TestRunner` lẫn `TestResultView` viết trong một dòng rất dài (không đọc nổi khi sửa). | Vừa | Chưa xem trên thiết bị thật. Giai đoạn 2: kiểm tra ở 375px và khi bàn phím ảo mở; nâng chữ nút lên 14px nếu vừa. Không tách file nếu không cần. |
| 17 | Xác nhận thao tác phá huỷ | Chỉ thấy một chỗ có xác nhận: `window.confirm` ở `EnglishAdminQaTools` (đặt lại tiến độ). `RemoveSetButton`, nút xoá ở admin chưa kiểm tra. `window.confirm` khác phong cách app. | Vừa | Rà `RemoveSetButton` và các nút `delete` ở admin; dùng `Dialog` trong `ui/` thay `window.confirm`. |
| 18 | Tiếp cận | Có `prefers-reduced-motion` (2 chỗ trong `globals.css`) và `aria-label="Điều hướng chính"` ở nav dưới, `aria-current` ở nav và công tắc khu vực. `nav` sidebar desktop không có `aria-label` (khi đo trên trang trước, một `nav` có nhãn null). `focus-visible` chỉ có ở 2 chỗ trong `globals.css`, phần lớn là class rời trên từng phần tử. Biểu tượng `MaterialIcon` luôn `aria-hidden`, nên nút chỉ có icon phải tự có `aria-label` (nút `tune`, `photo_camera` chưa kiểm). Tương phản chưa đo. | Vừa | Thêm `aria-label` cho `nav` sidebar. Thêm một quy tắc `:focus-visible` toàn cục thay vì rải class. Đo tương phản chữ `text-muted` trên nền kem bằng công cụ trước khi kết luận. |
| 19 | Responsive desktop | Ở 1280px nội dung (`/review`) nằm lệch trái trong một cột hẹp, bên phải trống lớn. Không lỗi, nhưng thấy trống ở trang ít nội dung. | Thấp | Để nguyên; xem lại khi có nhiều bộ từ. |
| 20 | Điều hướng, quyền | Student vào `/admin` bị chuyển lặng lẽ về `/tests` (khu vực đang nhớ), không có thông báo. | Thấp | Chuyển về trang chủ của khu vực hiện tại kèm thông báo "Bạn không có quyền vào trang này" (đổi hành vi nhẹ, cần duyệt). |
| 21 | Phiên đăng nhập / môi trường | Trong lúc chạy, tên tài khoản đổi từ "S" (sample-learner) sang "TK" do phiên khác dùng chung cookie. Không phải lỗi app. | Thấp | Không cần sửa. Ghi lại để lần chụp sau dùng một tài khoản cố định. |

## Việc đã thấy ổn (giữ nguyên)

- Nav dưới mobile 48px, có `aria-current`, `aria-label`, safe-area.
- Trạng thái rỗng của `/store`, `/review`, bảng xếp hạng có tiêu đề, mô tả và nút rõ.
- Không có cuộn ngang ở các màn đã chụp (375px).
- Nút thoát bài kiểm tra có `aria-label` và vùng chạm 44px.

## Đề xuất thứ tự làm (chờ bạn chọn)

1. **Navigation**: #3, #4, #5, #8, #14 (nếu duyệt copy).
2. **Icon**: #1, #2, #16 (phần `✕`/`←`).
3. **Mức cao còn lại**: #6, #11.
4. **Mức vừa**: #7, #10, #13, #17, #18.
5. **Thấp** (tuỳ chọn): #9, #12, #15, #19, #20.

Mỗi nhóm một commit nhỏ trên nhánh riêng (không commit lên `main`). Các mục #11, #14, #15, #20 đụng copy hoặc hành vi nên cần bạn duyệt từng mục.
