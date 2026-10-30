# Trang chủ: giảm độ trễ HTTP khi 200 người học cùng hoạt động

## 1. Outcome

Khi lớp học 200 người cùng sử dụng app, trang chủ mở nhanh hơn và vẫn hiện đúng XP, nhiệm vụ, lịch ôn và các bộ đang học. Mục tiêu kiểm chứng là p95 của `GET /` dưới 1.000 ms trên VPS với kịch bản tăng dần 60 giây.

## 2. Out of scope

Không đổi giao diện, chuỗi chữ, thứ tự hiển thị, cách tính XP, nhiệm vụ, streak, lịch ôn, quyền truy cập bộ học, ba chế độ học, schema, migration hoặc payload API. Không đổi `PG_POOL_MAX`, PM2, cache liên request hoặc các endpoint Ôn theo bộ. Số `review/start` và `review/next` chậm trong phép đo VPS là vấn đề riêng; không xử lý trong plan trang chủ này.

## 3. Invariants touched

- **Vietnam calendar day:** `studiedDays` tiếp tục lấy ngày bằng `vnDayKey`/`shiftVnDay`/`vnDayStart`; không lấy ngày từ đồng hồ trình duyệt.
- **SRS, guided review and XP:** các hàm đọc trang chủ không ghi `EnWordState`/`EnReview` hoặc trả XP. `getGoalBoard` vẫn dùng ledger `EnXpEvent` và giao dịch trả thưởng hiện có; không cache qua các request.
- **User scope:** mọi truy vấn mới vẫn lọc theo `userId` từ `auth()`; không nhận `userId` từ client.
- **Content and audio:** không đổi câu học, câu quiz hay đường âm thanh.
- **Randomness:** không thêm nguồn ngẫu nhiên.
- **UI:** giữ nguyên mọi chỉ số và gợi ý, kể cả trạng thái không có bộ học và bố cục 375px; không tạo zero noise hay HTML lồng sai.
- **Prisma and Next.js 16:** chỉ dùng React `cache` trong một lượt render, theo `node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md` mục “Deduplicating requests”; không dùng cache liên request cho dữ liệu cá nhân đang thay đổi. Giữ `force-dynamic` của trang chủ và `src/proxy.ts`.
- **Dữ liệu thật:** mọi benchmark ghi câu trả lời chỉ chạy trên DB `_load`/`_test` và URL localhost; cần xác nhận của chủ app trước khi tạo instance và DB tạm trên VPS lần nữa.

## 4. Changes per file

1. `src/services/english/enOverviewQueries.ts`, hàm `studiedDays`: tách phần truy vấn thành `const cachedStudiedDays = cache((userId: string, fromDay: string) => ...)`, import `cache` từ `react`, rồi cho `studiedDays(userId, from)` gọi hàm đó với `vnDayKey(from)`. Giữ `Set<string>` đầu ra và điều kiện `day >= fromDay`. Khóa cache bằng chuỗi ngày để hai `Date` khác object nhưng cùng ngày của `computeTodayOverview` và `loadRewardState` dùng chung đúng một truy vấn trong render. `cache` chỉ có hiệu lực trong render; route handler và tác vụ khác vẫn đọc dữ liệu mới. Mẫu sẵn có: `getTodayOverview` trong `src/services/english/enDailyService.ts`.
2. `src/services/english/enCatalogService.ts`, `listEnglishSets`: thêm `enrolledOnly?: boolean` vào `opts`. Khi `true`, thêm điều kiện Prisma `enrollments: { some: { userId } }` vào `where` của `enSet.findMany`; giữ nguyên các phép đếm, `orderBy`, lọc status và cấu trúc `EnglishSetSummary`. Khi `false` hoặc bỏ trống, kết quả y hệt hiện tại. Mẫu truy vấn lọc theo người học: `enrollEnglishSet` trong cùng file.
3. `src/app/(app)/page.tsx`, `EnglishHomePage`: gọi `listEnglishSets(session.user.id, false, { enrolledOnly: true })`. `HomeDashboard` hiện chỉ dùng bộ đã tải: nó lọc `set.enrolled`, tính tổng các giai đoạn trên toàn bộ bộ đã tải, sắp theo `dueToday` và hiện tối đa ba bộ. Không sửa component hoặc thứ tự sắp xếp.
4. `src/lib/__dbtests__/catalog.dbtest.ts`: thêm các ca ở mục 8 để xác nhận tập bộ đã tải bằng phép lọc cũ trên dữ liệu thực tế của fixture.
5. `src/lib/__dbtests__/todayOverview.dbtest.ts`: thêm ca ở mục 8 để đối chiếu kết quả `studiedDays` trước/sau cách gọi với hai `Date` khác object cùng ngày; không mock Prisma.
6. `docs/testing/load-home-http.md`: ghi bảng trước/sau cùng một cấu hình 200 người, `think-ms 4000`, `ramp-ms 60000`, seed 42, số lỗi, p50/p95 `home`, throughput, RSS và CPU; ghi rõ release, pool size và thời điểm. Dòng trước là `home: N=400, p50=627.5 ms, p95=1522.4 ms, max=2314.6 ms, Errors=0` từ `docs/testing/load-http-vps.md`. Nếu môi trường khác, chạy lại baseline trên chính môi trường đó trước khi so.

## 5. Exact copy

Không thêm, sửa hoặc xóa chuỗi tiếng Việt trên giao diện. Tất cả chữ trong `HomeDashboard`, `TodayHero`, `QuestNote`, `ProgressStrip` và shell giữ nguyên từng chữ.

## 6. States

| Trạng thái | Kết quả phải giữ nguyên |
|---|---|
| Loading | Trang dùng trạng thái tải hiện có; không thêm spinner hoặc đổi thứ tự xuất hiện. |
| Error | Lỗi auth chuyển `/login`; lỗi DB theo cơ chế hiện có. |
| Rỗng/zero; người mới chưa tải bộ | Không có mục “Đang học”; lời mời chọn bộ và các số liệu zero hiện như trước. |
| Một bộ đã tải | Hiện đúng bộ đó, số từ và tiến độ của nó. |
| Nhiều bộ đã tải | Đếm và cộng tiến độ trên **tất cả** bộ đã tải; hiện ba bộ có `dueToday` cao nhất, giữ thứ tự cũ khi bằng nhau. |
| Admin/student | Cùng trang chủ theo `auth()` và cùng danh sách bộ đã tải của chính tài khoản; không lộ bộ của người khác. |
| Điện thoại 375px | Nhãn nút và footer không xuống dòng, không có card lồng card, không tràn ngang. |

## 7. Data

Không đổi schema hoặc migration, không backfill. Không thêm hoặc đổi API, Zod shape, session cookie. `enrolledOnly` là tùy chọn nội bộ của service, mặc định `false`; chỉ trang chủ truyền `true`.

## 8. Tests

- `src/lib/__dbtests__/catalog.dbtest.ts`: một người có 0 bộ đã tải và catalog có ít nhất 1 bộ published → `listEnglishSets(user, false, { enrolledOnly: true })` trả `[]`; `listEnglishSets(user, false)` vẫn trả catalog đầy đủ.
- Cùng file: người có 1 bộ đã tải, 1 bộ chưa tải → kết quả `enrolledOnly: true` bằng `listEnglishSets(user, false).filter(set => set.enrolled)` theo toàn bộ object; không có bộ chưa tải.
- Cùng file: người có nhiều bộ đã tải, gồm bộ ẩn khỏi store nhưng vẫn published → kết quả bằng phép lọc cũ, đúng `stages`, `dueToday`, `words` và thứ tự cũ.
- `src/lib/__dbtests__/todayOverview.dbtest.ts`: gọi `studiedDays(user, new Date('2026-10-29T17:00:00Z'))` và `studiedDays(user, new Date('2026-10-29T17:00:00Z'))` với hai object khác nhau → cùng tập ngày; ngày trước 2026-10-30 bị loại, ngày 2026-10-30 được giữ. Gọi sau một write ở request độc lập → nhìn thấy ngày mới, chứng minh không cache liên request.
- Chạy `npm run test:db`, `npm run quality`. Kiểm tra tay `/` với tài khoản student mới và tài khoản có nhiều bộ; kiểm tra admin và khung 375px.

## 9. Steps

1. Tạo nhánh feature từ `main`, giữ các công việc khác nguyên trạng.
2. Sửa `studiedDays`, chạy `npm run typecheck` và DB test liên quan.
3. Sửa `listEnglishSets` và trang chủ, chạy DB test catalog và `npm run quality`.
4. Trên DB `_load`, seed `--truncate --users 200 --sets 2 --words 30 --days 30 --seed 42`; đo HTTP với `--think-ms 4000 --ramp-ms 60000`. Đối chiếu baseline trên cùng VPS/cấu hình; không dùng dòng `overview+goals` của service benchmark làm mốc.
5. Ghi báo cáo `docs/testing/load-home-http.md`. Nếu p95 `home` còn từ 1.000 ms trở lên hoặc có lỗi HTTP, dừng merge và báo số đo cùng điểm nghẽn còn lại để lập thay đổi tiếp theo.
6. Kiểm tra các trạng thái mục 6, chạy `npm run quality` và `npm run test:db`, sau đó commit/push/PR/merge/deploy theo quyền đã giao.

## 10. Acceptance

- `npm run quality` và `npm run test:db` pass; DB test chứng minh dữ liệu bộ học và ngày học không đổi.
- Trên VPS với 200 user, seed 42, `think-ms 4000`, `ramp-ms 60000`, `GET /` có Errors=0 và p95 dưới 1.000 ms. Báo cáo ghi cả bảng trước/sau và tài nguyên server.
- Kiểm tra `http://localhost:3002/`: student chưa tải bộ, student tải một/nhiều bộ, admin; XP, nhiệm vụ, streak, tổng tiến độ và ba bộ đầu giống baseline; màn 375px không tràn hoặc ngắt nhãn.
