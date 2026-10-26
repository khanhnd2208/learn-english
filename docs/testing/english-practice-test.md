# Checklist QA — Tiếng Anh: Bộ từ, Luyện, Kiểm tra

## Chuẩn bị

- [ ] Chạy `npm run db:seed:english-samples`, đăng nhập tài khoản admin/test và mở `/english`.
- [ ] Kết quả mong đợi: thấy hai bộ mẫu, mỗi bộ 10 từ; bộ nháp (nếu có) mang nhãn **Nháp**.
- [ ] Lặp lại các bước quan trọng ở viewport desktop và 375px; không có nội dung tràn ngang hoặc CTA bị che bởi thanh điều hướng.

## 1. Trang Bộ từ và Theo học

- [ ] Mở `/english` khi chưa theo học bộ mẫu.
- [ ] Kết quả: card nằm trong **Bộ từ khác**, toàn card mở được chi tiết, hiện số từ và nút **Theo học**.
- [ ] Bấm **Theo học**.
- [ ] Kết quả: chuyển thẳng vào bộ; quay lại `/english` thấy bộ trong **Đang học**, có thanh tiến độ và CTA **Tiếp tục**.
- [ ] Mở `/english/sets/[id]` và kiểm tra nav **Bộ từ** vẫn sáng.

## 2. Tab Đọc

- [ ] Kiểm tra header có link quay lại, số từ, thanh tiến độ, số Đã nắm và số trong Sổ.
- [ ] Lần lượt chọn **Tất cả / Chưa nắm / Trong Sổ**.
- [ ] Kết quả: danh sách lọc đúng; mỗi từ có badge Mới/Đang luyện/Đã nắm và badge Trong Sổ khi phù hợp.
- [ ] Bấm **Che nghĩa**, chạm một dòng rồi bấm **Lật hết**.
- [ ] Kết quả: nghĩa bị che, từng dòng lật độc lập, Lật hết hiện toàn bộ.
- [ ] Mở thẻ từ và xem Cách nói, Phân biệt, Ví dụ, Tôi là ai?; bấm **Nghe mẫu**.
- [ ] Kết quả: nếu file thật không tồn tại, trình duyệt đọc từ bằng TTS thay vì hiện audio hỏng.

## 3. Mỗi dạng Luyện

- [ ] Tab Luyện hiển thị lưới thẻ có tên và mô tả; **Lộ trình** được đề xuất.
- [ ] Chạy lần lượt: nhìn từ–chọn nghĩa, nghe–chọn nghĩa, điền câu, ghép cặp, viết có gợi ý, tự nhớ, nghe–viết, nói nhại.
- [ ] Kết quả chung: ô gõ tự focus; mobile không tự viết hoa/sửa từ; phím 1–4 chọn đáp án.
- [ ] Trả lời đúng một câu chọn.
- [ ] Kết quả: đáp án đúng tô xanh, không bấm lại được và tự chuyển sau khoảng 0,9 giây.
- [ ] Trả lời sai.
- [ ] Kết quả: đáp án đã chọn tô đỏ, đáp án đúng tô xanh, dừng lại; **Tôi là ai?** mở gợi ý từng bước; Enter hoặc **Tiếp tục** đi tiếp.
- [ ] Ở Ghép cặp, bấm một cặp đã ghép để gỡ; cố ý ghép sai rồi chấm.
- [ ] Kết quả: gỡ được trước khi chấm; các cặp sai được đánh dấu.
- [ ] Ở Nói nhại, từ chối quyền micro rồi thử lại sau khi cấp quyền.
- [ ] Kết quả: khi từ chối có thông báo rõ; khi cấp quyền ghi/dừng/phát lại được, stream dừng khi rời bài.

## 4. Lộ trình, timer và kết thúc Luyện

- [ ] Chạy Lộ trình, cố ý sai ít nhất một lần, để tab không tương tác hơn 60 giây rồi hoàn thành.
- [ ] Kết quả: tiến độ hiện **Đã xong x/N từ**; màn tổng kết có số từ đã gặp, số lần sai và thời gian hoạt động; thời gian nghỉ quá 60 giây không được cộng tiếp.
- [ ] Ở màn tổng kết bấm **Kiểm tra bộ này**, **Luyện lại**, **Về bộ từ**.
- [ ] Kết quả: từng nút đến đúng nơi; header/trạng thái từ được làm mới; có ghi chú kiểm tra từ ngày mai.
- [ ] Ngắt mạng ngay lúc hoàn thành.
- [ ] Kết quả: không báo lưu thành công giả; hiện lỗi và nút **Thử lưu lại**.
- [ ] Rời/reload giữa phiên luyện.
- [ ] Kết quả: trình duyệt hỏi xác nhận; phần đã gặp được gửi lưu dự phòng khi rời trang.

## 5. Kiểm tra, khôi phục và câu bỏ trống

- [ ] Bắt đầu Kiểm tra.
- [ ] Kết quả: vào chế độ tập trung, không còn tab Đọc để xem đáp án; có luật ngắn, lưới câu và tiến độ theo số câu đã trả lời.
- [ ] Trả lời vài câu, dùng lưới nhảy qua lại rồi reload/đóng và mở lại trong 24 giờ.
- [ ] Kết quả: màn mở đầu báo bài đang làm dở; **Làm tiếp** khôi phục đáp án và đến câu trống đầu tiên; **Làm bài mới** bỏ bài cũ và tạo bài mới.
- [ ] Ngắt mạng khi lưu một câu.
- [ ] Kết quả: vẫn ở câu hiện tại, giữ nội dung và báo thử lại.
- [ ] Bỏ trống ít nhất ba câu rồi bấm **Nộp bài**.
- [ ] Kết quả: dialog báo đúng số câu trống và nói rõ chúng tính là sai.
- [ ] Bấm **Thoát** giữa bài.
- [ ] Kết quả: có xác nhận; lần mở lại vẫn làm tiếp được trong 24 giờ.

## 6. Kết quả, “vừa học” và Đã nắm

- [ ] Nộp bài ngay trong ngày vừa luyện.
- [ ] Kết quả: mỗi từ có Đạt/Chưa đạt và “vừa học” khi chưa đủ khoảng cách; giải thích “vừa học” xuất hiện một lần; từ sai vào Sổ.
- [ ] Mở rộng từng từ.
- [ ] Kết quả: thấy **Bạn trả lời** và **Đáp án** cho từng câu.
- [ ] Reload rồi mở tab `?tab=result`.
- [ ] Kết quả: kết quả gần nhất vẫn còn, không hiển thị trùng hai nơi.
- [ ] Vào Admin → **Công cụ test**, chọn bộ và bấm **Lùi thời gian 1 ngày**; kiểm tra lại và trả lời đúng cả hai câu của một từ.
- [ ] Kết quả: từ thành Đã nắm và rời Sổ từ sai.

## 7. Tổng hợp, Sổ từ sai, Tiến bộ

- [ ] Với tài khoản chưa luyện gì, mở `/english/review`.
- [ ] Kết quả: EmptyState yêu cầu luyện một bộ trước; không có nút bắt đầu bị lỗi muộn.
- [ ] Sau khi đã luyện, kiểm tra dải **Việc hôm nay** và Tổng hợp.
- [ ] Kết quả: Tổng hợp chỉ dùng từ đã gặp trong bộ đang theo học, ưu tiên từ trong Sổ.
- [ ] Mở Sổ từ sai.
- [ ] Kết quả: hai hành động Luyện/Kiểm tra ở đầu; từ gom theo bộ; chạm từ mở thẻ từ; cảnh báo ngày mai dựa trên lần luyện hôm nay.
- [ ] Mở Tiến bộ.
- [ ] Kết quả: biểu đồ có ngày đầu/cuối và giá trị hiện tại; tuần hiển thị dạng **Tuần dd/mm**; mỗi khối có câu giải thích.

## 8. Cấu hình admin, audio và reset

- [ ] Admin tắt `listen_choice` và bỏ dạng này khỏi cấu trúc Test; tạo bài mới.
- [ ] Kết quả: bài mới không còn `listen_choice`.
- [ ] Với bộ mẫu không có audio thật, chạy Luyện nghe rồi chạy Test.
- [ ] Kết quả: Luyện nghe dùng TTS; Test không dựng câu nghe và không lộ lemma trong prompt nghe.
- [ ] Admin → Công cụ test → **Xoá tiến độ của tôi** và xác nhận.
- [ ] Kết quả: chỉ tiến độ, phiên luyện và bài kiểm tra của admin hiện tại với bộ đã chọn bị xoá; enrollment và dữ liệu người khác giữ nguyên.
- [ ] Đặt production không có `ENGLISH_QA_TOOLS=1`, gọi route QA.
- [ ] Kết quả: route trả 403.
