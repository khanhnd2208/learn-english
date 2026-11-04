# Lean UX — kiểm tra giao diện local

Ảnh chụp tại viewport 375 × 812 và 1280 × 812, cùng tài khoản admin đã đăng nhập. `before-*` là `origin/main` trên localhost:3004; `after-*` là nhánh PR 3 trên localhost:3002. Ảnh lưu theo mẫu `<before|after>-<mobile|desktop>-<screen>.jpg`.

| Screen | URL | Ảnh |
|---|---|---|
| Khóa học | `/tests` | `tests` |
| Chi tiết khóa | `/tests/subjects/sample_test_subject_general` | `subject-test` |
| Mở đầu bài | `/tests/papers/sample_test_paper_general_1` | `paper` |
| Làm bài | cùng URL sau Bắt đầu/Làm tiếp | `runner` |
| Danh sách kết quả | `/tests/results` | `results` |
| Chi tiết kết quả | `/tests/results/<attemptId>` | `result-detail` |
| Hôm nay | `/?mode=vocab` | `home` |
| Cửa hàng | `/store` | `store` |
| Ôn theo bộ | `/review` | `review` |
| Tiến bộ | `/progress` | `progress` |
| Thống kê | `/progress?tab=stats` | `progress-stats` |
| Chi tiết bộ | `/sets/cmvtj8czh001prk8orx5tkdv9` | `set` |

Kiểm tra tương tác: chọn câu trắc nghiệm chưa làm tự sang câu sau; sửa câu đã làm không tự sang; Sheet mobile nhảy tới câu 8; sidebar desktop luôn hiện; Enter ở câu điền từ sang câu kế; reload giữ câu và đáp án; hộp nộp đưa tới câu trống đầu; kết quả mặc định lọc câu sai/bỏ trống, bấm câu đúng đổi sang Tất cả. Ở 375px, `document.documentElement.scrollWidth <= window.innerWidth` trên 10 URL chính. Không tìm thấy lỗi hydration trong console.

Thử lỗi lưu bằng proxy local trả HTTP 503 cho action `answer`: vẫn đổi/chọn câu, hiện `Không lưu được câu trả lời.` và `Thử lại`; nộp không hoàn tất; thoát mở cảnh báo. Ảnh `after-mobile-save-error.jpg` ghi lại trạng thái này.

Rà soát sau khi GPT hoàn thành, kiểm tra bằng Chromium headless trên localhost:3002 với dữ liệu tạm (đã xóa sau khi thử):

- Đề 1 câu: nút trước disabled, có Nộp bài, chọn đáp án không tự nhảy, toàn đúng thì ẩn bộ lọc.
- Đề 100 câu: lưới cuộn trong Sheet và sidebar, câu hiện tại luôn trong tầm nhìn; câu rất dài không che sidebar.
- Lỗi lưu khi nộp: hộp nộp đóng, hiện `Không lưu được câu trả lời.` và `Thử lại`, bài chưa nộp. Đổi đáp án trong lúc `Thử lại` đang chạy: server giữ đáp án mới nhất.
- Người mới chưa có bộ: trang chủ chỉ có `Chọn bộ từ đầu tiên`, Ôn theo bộ có `Chọn môn học →`, Kết quả và Bài kiểm tra có đường sang khóa học.
- Admin: mở được `Cài đặt môn học` ở trang chi tiết môn, không có thẻ lồng thẻ. Không có lỗi console hoặc hydration, không cuộn ngang ở 375px.
