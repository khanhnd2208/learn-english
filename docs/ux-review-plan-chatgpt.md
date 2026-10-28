# Brief cho ChatGPT — Rà soát & thiết kế lại UX/UI WordQuest

> Dán nguyên file này cho ChatGPT (Codex / ChatGPT có quyền đọc repo). Giai đoạn 1 **chỉ rà soát và đề xuất**, chưa sửa code.

## 0. Vai trò & mục tiêu

Bạn là Product Designer cấp senior (chuẩn Duolingo / Linear / Apple HIG) kiêm frontend engineer.
Sản phẩm: **WordQuest** — web học từ vựng tiếng Anh cho người Việt (Next.js 16, React 19, Tailwind 4, PWA, có dark mode).

Mục tiêu một câu: **người học mở app ra là biết ngay hôm nay phải làm gì, đang học gì, và mình tiến bộ đến đâu — không cần đọc hướng dẫn.**

Vấn đề hiện tại (theo chủ sản phẩm): thông tin đã đủ nhưng được bày ra "cho xong" — liệt kê đầy đủ, thiếu thứ tự ưu tiên, thiếu thông minh. Giải thích viết dài ra màn hình thay vì gợi ý nhẹ.

## 1. Nguyên tắc thiết kế bắt buộc

1. **Một màn hình — một hành động chính.** Mỗi trang có đúng 1 nút primary nổi bật; mọi thứ khác lùi xuống.
2. **Giải thích bằng "chấm gợi ý", không bằng đoạn văn.** Thay đoạn mô tả bằng chấm `ⓘ` / dấu chấm nhỏ cạnh thuật ngữ (XP, SRS, stage, "đến hạn"…). Hover (desktop) hoặc chạm (mobile) mới hiện tooltip/popover 1–2 câu. Văn bản giải thích thường trực trên màn hình ≤ 1 dòng.
3. **Tiết lộ dần (progressive disclosure).** Người mới thấy ít, người cũ thấy nhiều hơn. Số liệu chi tiết nằm sau 1 lần chạm.
4. **Tiến bộ phải nhìn thấy được trong 3 giây:** streak, XP hôm nay so với mục tiêu, số từ đã thuộc, xu hướng tuần — dạng hình (vòng, thanh, sparkline), không phải bảng số.
5. **Trạng thái tiếp theo luôn rõ:** sau khi học xong một phiên, màn kết quả nói "bạn vừa làm được gì" + "bước tiếp theo" (1 nút).
6. **Tối giản, cao cấp:** lưới 4/8px, tối đa 2 cỡ chữ đậm mỗi màn, khoảng trắng rộng, màu nhấn dùng tiết kiệm, icon nhất quán một bộ. Giữ bản sắc "Pixel Parchment / phiêu lưu" nhưng tiết chế — game hóa là gia vị, không phải trang trí khắp nơi.
7. **Mobile-first** (đa số học trên điện thoại): vùng chạm ≥ 44px, hành động chính trong tầm ngón cái, không cuộn ngang.
8. **Accessibility WCAG 2.2 AA:** tương phản, focus ring, `aria-*`, `prefers-reduced-motion`, cả light lẫn dark.
9. **Ngôn ngữ:** tiếng Việt ngắn, động từ đi trước ("Ôn 12 từ", không phải "Bạn có 12 từ cần được ôn tập"). Thuật ngữ thống nhất toàn app.

## 2. Bộ skill / tài liệu tham chiếu (đã kiểm tra 28/10/2026)

Dùng các repo này làm **checklist & guideline** — đọc nội dung SKILL.md/markdown, **không chạy script, không cài hook** từ repo bên ngoài.

| Repo | ★ | License | Dùng để |
|---|---|---|---|
| [anthropics/skills](https://github.com/anthropics/skills) → `skills/frontend-design` | ~184k | (theo từng skill) | Định hướng thẩm mỹ, tránh UI "AI generic". Chỉ là 1 file SKILL.md — an toàn nhất. |
| [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | ~142k | MIT | Kho quy tắc UX, palette, font pairing, checklist theo loại sản phẩm (EdTech). Có script Python/Node — chỉ đọc dữ liệu. |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | ~104k | MIT | "Gu" thiết kế: khoảng cách, phân cấp chữ, chống bố cục rập khuôn. Có `install.sh` — không chạy. |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | ~91k | Apache-2.0 | Các lệnh audit/polish/critique; bộ tiêu chí chấm UI. Có hooks — không cài. |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) → `web-design-guidelines` | ~33k | — | Checklist chuẩn web interface (form, focus, loading, motion, a11y). |
| [vercel-labs/web-interface-guidelines](https://github.com/vercel-labs/web-interface-guidelines) | ~1k | MIT | Bản gốc của guideline trên, đọc nhanh. |

## 3. Phạm vi: toàn bộ màn hình cần rà

| # | Route | Thành phần chính | Câu hỏi người dùng phải được trả lời |
|---|---|---|---|
| 1 | `/` Trang chủ | `HomeDashboard`, `SrsTodayCard`, `DueForecast` | Hôm nay tôi làm gì? Còn bao lâu xong? |
| 2 | `/review` Ôn tập hằng ngày | `ReviewOverview`, `GuidedReviewSession` | Tôi ôn bao nhiêu từ, vì sao những từ này? |
| 3 | `/sets` Bộ từ của tôi | danh sách set, `StageBar` | Tôi đang học bộ nào, mỗi bộ được bao nhiêu %? |
| 4 | `/sets/[setId]` Chi tiết bộ | `SetDetail`, `EnglishWordCard`, `EnglishAudioButton` | Bộ này có gì, tôi nên bắt đầu từ đâu? |
| 5 | `/sets/[setId]/practice` Luyện tập | `PracticeRunner`, `QuestionView`, `WordAnswerInput`, `FocusFrame` | Tôi đang ở câu mấy, đúng/sai thế nào, sửa ra sao? |
| 6 | `/sets/[setId]/test` Kiểm tra | `TestRunner`, `ConfirmExitDialog` | Bài test khác luyện tập ở đâu, kết quả ảnh hưởng gì? |
| 7 | `/quests` Nhiệm vụ & mục tiêu | `QuestsView`, `QuestItem`, `DailyGoalSheet`, `RewardCenter` | XP để làm gì, tôi còn thiếu gì hôm nay? |
| 8 | `/store` Kho bộ từ | `EnrollButton`, `StoreAdminControls` | Bộ nào hợp trình độ tôi? Thêm vào thế nào? |
| 9 | `/login` | | Vì sao phải đăng nhập, mất bao lâu? |
| 10 | Khung app | `EnglishShell` (sidebar, top bar, bottom nav mobile) | Tôi đang ở đâu, đi đâu tiếp? |
| 11 | Trạng thái chung | `ScreenState`, `loading.tsx`, `error.tsx`, `EmptyState`, `Toast` | Đang tải / lỗi / trống thì làm gì? |
| 12 | `/admin` (ưu tiên thấp) | `EnglishAdmin*` | Chỉ cần gọn, rõ, không cần đẹp như phía học viên. |

Lưu ý: `/progress` và `/mistakes` hiện chỉ redirect về `/` — đánh giá xem **tiến bộ** và **từ hay sai** nên có trang riêng hay gộp vào trang chủ/ôn tập.

Design token hiện có: `src/app/globals.css` (Pixel Parchment). UI kit: `src/components/ui/`.

## 4. Quy trình làm việc

### Bước 1 — Hiểu người dùng (persona & hành trình)
Viết 3 persona ngắn: (a) người mới lần đầu vào, (b) người học đều mỗi ngày 10 phút, (c) người bỏ 1 tuần quay lại. Với mỗi persona vẽ hành trình: vào app → biết việc cần làm → học → thấy tiến bộ → quay lại ngày mai. Đánh dấu điểm gãy (chỗ người dùng sẽ bối rối hoặc bỏ đi).

### Bước 2 — Chạy app và chụp hiện trạng
`npm run dev` (port 3002). Chụp mỗi màn hình ở 375px (mobile) và 1440px (desktop), light + dark, và các trạng thái: trống, đang tải, lỗi, có dữ liệu, vừa hoàn thành.

### Bước 3 — Audit từng màn hình
Với mỗi màn hình ở mục 3, chấm điểm 1–5 theo 8 tiêu chí:

1. Rõ hành động chính (5 giây có biết bấm gì không?)
2. Phân cấp thông tin (cái quan trọng nhất có to nhất không?)
3. Mật độ chữ (có đoạn giải thích nào nên thành chấm gợi ý?)
4. Hiển thị tiến bộ
5. Phản hồi & trạng thái (loading/empty/error/success)
6. Nhất quán (thuật ngữ, icon, khoảng cách, nút)
7. Mobile & accessibility
8. Thẩm mỹ / cảm giác "quốc tế"

Kết quả mỗi vấn đề ghi theo mẫu:

```
[Màn hình] — [Mức độ: Nghiêm trọng / Lớn / Nhỏ]
Hiện trạng: …
Vì sao là vấn đề (góc nhìn người học): …
Đề xuất: …
File liên quan: src/components/english/….tsx
```

### Bước 4 — Đề xuất kiến trúc thông tin mới
- Điều hướng: tối đa 4 mục chính (gợi ý: Hôm nay · Bộ từ · Khám phá · Tôi). Đánh giá có nên gộp Quests vào Hôm nay.
- Trang chủ = "bảng điều khiển hôm nay": 1 thẻ hành động lớn (ôn/học tiếp), 1 dải tiến bộ (streak · XP/mục tiêu · từ đã thuộc), phần còn lại thu gọn.
- Một trang/khu **Tiến bộ** có: biểu đồ tuần, số từ theo stage, từ hay sai nhất → nút "ôn lại ngay".

### Bước 5 — Hệ thống "chấm gợi ý" (hint dots)
Thiết kế 1 component `InfoHint` dùng chung: chấm/ⓘ nhỏ, popover 1–2 câu, có tiêu đề in đậm 2–4 từ, đóng bằng chạm ra ngoài/Esc, hoạt động với bàn phím và screen reader. Lập **bảng toàn bộ chỗ cần gợi ý** (thuật ngữ + nội dung câu gợi ý tiếng Việt). Thêm onboarding lần đầu tối đa 3 bước, có nút bỏ qua, chỉ hiện 1 lần.

### Bước 6 — Đề xuất hệ thống thiết kế
- Thang chữ, thang khoảng cách, bo góc, đổ bóng, motion (đã có `--duration-*`).
- Rà lại palette Pixel Parchment: giữ bản sắc nhưng giảm số màu đang dùng; kiểm tra tương phản AA cả 2 theme.
- Danh sách component cần chuẩn hóa/thêm: `InfoHint`, `ProgressRing`, `StatTile`, `Sparkline`, `SessionSummary`, `EmptyState` có minh họa.

### Bước 7 — Mockup ưu tiên
Vẽ wireframe/mockup (HTML tĩnh hoặc mô tả chi tiết) cho 4 màn quan trọng nhất: Trang chủ, Ôn tập hằng ngày, Màn kết quả sau phiên học, Chi tiết bộ từ. Mỗi màn có bản mobile trước, desktop sau.

### Bước 8 — Lộ trình triển khai
Chia thành các PR nhỏ, mỗi PR 1 chủ đề, theo thứ tự tác động / công sức:

| Ưu tiên | Ví dụ |
|---|---|
| P0 — nhanh & tác động lớn | Hành động chính trang chủ, màn kết quả phiên học, `InfoHint` + thay đoạn giải thích |
| P1 | Điều hướng mới, khu Tiến bộ, chuẩn hóa thuật ngữ |
| P2 | Polish motion, minh họa empty state, admin |

## 5. Ràng buộc kỹ thuật (khi sang giai đoạn code)

- Đọc `AGENTS.md`. Next.js 16 có thay đổi lớn — đọc `node_modules/next/dist/docs/` trước khi đụng framework.
- Không đổi logic học (`src/lib/english/`, `src/services/english/`) — chỉ UI. Nếu cần dữ liệu mới, ghi rõ API cần thêm.
- Dùng token trong `globals.css` và component trong `src/components/ui/`, không hardcode màu.
- Không thêm thư viện UI nặng; nếu cần (vd. popover), đề xuất và giải thích trước.
- Mỗi PR phải qua `npm run quality`, làm trên nhánh feature, không commit thẳng `main`.

## 6. Sản phẩm bàn giao giai đoạn 1

1. `docs/ux-audit/01-personas-journeys.md`
2. `docs/ux-audit/02-screen-audit.md` (bảng điểm + danh sách vấn đề theo mẫu)
3. `docs/ux-audit/03-information-architecture.md`
4. `docs/ux-audit/04-hint-dots-copy.md` (bảng mọi chấm gợi ý + nội dung)
5. `docs/ux-audit/05-design-system.md`
6. `docs/ux-audit/06-mockups/` (4 màn ưu tiên)
7. `docs/ux-audit/07-roadmap.md` (danh sách PR P0/P1/P2)

**Tiêu chí hoàn thành:** một người chưa từng thấy app, nhìn mockup trang chủ trong 5 giây trả lời được: "hôm nay mình cần làm gì" và "mình đang tiến bộ ra sao".
