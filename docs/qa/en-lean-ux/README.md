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

Chưa kiểm tra trực tiếp màn một câu, lưới 100 câu và tài khoản chưa có bộ; các nhánh này được kiểm tra qua quy tắc thuần, cấu trúc CSS và code. Trang Cửa hàng local không có môn từ vựng nên chưa mở được `Cài đặt môn học` bằng UI; component đã qua typecheck/build.
