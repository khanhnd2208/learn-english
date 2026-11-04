# Plan: Ngân hàng câu hỏi cho Bài kiểm tra (bản mẫu)

Giai đoạn 1 (bản mẫu). Nâng cấp nhóm `EnTestPaper*`: thêm `EnTestQuestion` (ngân hàng dùng chung) và `EnTestPaperEntry` (đề trỏ tới câu theo thứ tự); ngừng đọc/ghi `EnTestPaperQuestion`. Câu `fill` là ô gõ tự do với `matchRules`. Màn chữa bài có trạng thái đúng/sai/bỏ trống, bảng số câu, lịch sử các lần làm.

Chi tiết đầy đủ (outcome, out of scope, invariants, thay đổi theo file, copy, states, data, tests, steps, acceptance, điểm UX cần chủ dự án quyết) do chủ dự án giao ngày 2026-11-04 trong phiên làm việc; file này là bản tóm tắt để lần theo trong repo.

Quyết định chính:
- Migration `20261110000000_en_test_bank`, chỉ thêm; backfill mỗi câu cũ thành một câu ngân hàng (`tq_<id>`) và một entry (`tpe_<id>`).
- `EN_TEST_MATCH_RULES = ['ignore_case','collapse_spaces','ignore_hyphen','ignore_punctuation']`, `EN_TEST_HISTORY_LIMIT = 20`.
- Không merge, không push, không deploy. Commit cục bộ trên `feat/en-test-bank-v2`.

Điểm UX chờ chủ dự án: gõ gần đúng; dấu nháy; giới hạn làm lại / ẩn đáp án; ngưỡng đạt theo đề; sửa câu ngân hàng (cảnh báo hay tạo bản sao); một đề nhiều khóa; thứ tự chữa bài.
