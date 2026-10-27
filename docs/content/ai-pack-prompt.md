# Prompt tạo bộ từ tiếng Anh bằng AI

Prompt nằm ngay trên trang **Admin → Nội dung → Bước 1**: nhập danh sách từ, bấm **Copy prompt**, dán vào ChatGPT hoặc Claude, rồi dán JSON AI trả về vào **Bước 2**.

Nội dung prompt và ví dụ mẫu *belonging* nằm trong `src/lib/english/aiPackPrompt.ts`. Sửa prompt ở đó. Test `enContentValidation.test.ts` giữ cho ví dụ mẫu luôn xuất bản được.

| Tab | Trường JSON | Số lượng |
|---|---|---|
| Cách nói | `chunks`, `grammarNoteVi` | Không giới hạn, ít nhất 1 (trần kỹ thuật 40) |
| Phân biệt | `commonErrors`, `pitfallVi`, `relations[kind=confusable]` | Không giới hạn (trần kỹ thuật 20 lỗi) |
| Ví dụ | `examples` | 3–5 câu, ít nhất 2 câu điền chấm được |
| Tôi là ai? | `hints` | Đúng 3 |
