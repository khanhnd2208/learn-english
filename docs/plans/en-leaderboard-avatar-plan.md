# Plan: Bảng xếp hạng XP + ảnh đại diện tự tải lên

> Sau khi được duyệt, lưu nguyên văn file này thành `docs/plans/en-leaderboard-avatar-plan.md` rồi giao cho Gemini. Branch: `feat/leaderboard-avatar` (tách từ `main`).

## Context

Người học hiện chỉ thấy XP của chính mình (`/progress`). Chủ sản phẩm muốn thêm động lực cạnh tranh: một bảng xếp hạng XP có bục vinh quang top 1–2–3, thấy ai đang học ngay lúc này, và cho người học tự đổi ảnh đại diện. Quyết định đã chốt với chủ sản phẩm:
- Ảnh đại diện: **tải ảnh lên** (không có bộ avatar dựng sẵn).
- Kỳ xếp hạng: **Tuần này** (đặt lại 00:00 thứ Hai giờ VN) và **Mọi lúc**.
- Hiển thị **tất cả** người có XP trong kỳ, gồm cả admin; **không** có tuỳ chọn ẩn.
- Vị trí: **tab thứ 4 “Xếp hạng” trong `/progress`**, không thêm mục điều hướng.

---

## 1. Outcome

Trong trang Tiến bộ có tab “Xếp hạng”: ba người dẫn đầu đứng trên bục (vàng – bạc – đồng, hạng 1 ở giữa và cao nhất), bên dưới là danh sách hạng 4–50 với ảnh, tên, cấp độ, XP; người đang học trong 10 phút gần nhất có chấm xanh “Đang học”. Dòng của chính mình luôn được tô nổi và luôn hiện, kể cả khi ngoài top 50. Từ menu tài khoản, người học chọn “Đổi ảnh đại diện”, tải ảnh JPG/PNG/WebP ≤ 2 MB; ảnh mới hiện ngay ở menu và trên bảng xếp hạng, và có thể quay về ảnh mặc định.

## 2. Out of scope

- Không đổi cách tính hay trao XP: không ghi `EnXpEvent`, không đổi `xp.ts`, `quests.ts`, `achievements.ts`, `enGoalService.ts`, `enDailyService.ts`, `enGuidedReviewService.ts`.
- Không thêm mục vào `src/config/navigation.ts`, không đổi `isNavActive`.
- Không đổi copy, nội dung hay bố cục của ba tab có sẵn (Nhiệm vụ, Thống kê, Thành tựu) và của header thẻ người chơi trong `ProgressHub`.
- Không sửa dữ liệu MongoDB (`users`): chỉ **đọc** `name`, `image`. Không đọc/trả `email` ra client.
- Không thêm tuỳ chọn ẩn khỏi bảng, không thêm bảng theo ngày, không có bộ avatar dựng sẵn.
- Không đổi `docker-compose.yml`, `Dockerfile`, `.env.example` (ảnh dùng chung volume audio, xem §7).
- Không reformat file, không đổi tên gì ngoài các thay đổi liệt kê ở §4.

## 3. Invariants touched

| Quy tắc | Giữ đúng thế nào |
|---|---|
| Ngày theo giờ VN | Tuần = `vnWeekDays(vnDayKey(now))` (`src/lib/english/gapRule.ts`), lọc bằng cột `EnXpEvent.day` đã là ngày VN. Không dùng `toISOString().slice(0,10)` hay `getDate()`. Nhãn “đặt lại sau” dùng `weekResetsIn` mà `progress/page.tsx` đã tính bằng `timeLeftLabel(board.week.resetsAt, now)`. |
| Tính “hôm nay”/trạng thái trên server | Cờ `active` (“Đang học”) và `rank` tính trên server trong service; client chỉ hiển thị, không gọi `new Date()` khi render. |
| Chỉ Ôn luân phiên ghi `EnWordState`/`EnReview` | Bảng xếp hạng chỉ **đọc** `EnXpEvent` và `EnReview`. Ảnh đại diện chỉ ghi `EnLearnerProfile`. |
| XP chỉ là các dòng `EnXpEvent`, không có bộ đếm riêng | XP trên bảng = `SUM(EnXpEvent.xp)` mỗi lần đọc. Không thêm cột/bảng lưu điểm. |
| `userId` chỉ lấy từ `withAuth` | Upload/xoá ảnh dùng `user.id` của `withAuth`. Route đọc ảnh `/api/avatar/[userId]` nhận `userId` trong path chỉ để **chọn ảnh cần xem** (công khai với mọi người đã đăng nhập, vì bảng xếp hạng công khai); nó không ghi gì và không trả dữ liệu khác. |
| Không `Math.random()` | Tên file tạm dùng `randomUUID()` từ `node:crypto` (không phải logic học). Thứ tự xếp hạng tất định: XP giảm dần, hoà thì `userId` tăng dần. |
| Zod `.strict()` cho payload | Query `period`, form-data `file` đều qua `z.object(...).strict()`. |
| Migration chỉ thêm, tên folder sau folder mới nhất | Folder `20261103000000_en_leaderboard_avatar` (mới nhất hiện tại: `20261102000000_en_study_day`). Nếu lúc làm đã có folder ≥ `20261103000000`, lấy timestamp folder mới nhất + `1000000`. Chạy `npx prisma generate` sau đó. |
| Không “0 noise” | Ẩn chip “n người đang học” khi n = 0; người chưa có XP không hiện “0 XP” mà hiện câu giải thích (§5). |
| UI 375px, HTML hợp lệ, primitives | Dùng `Avatar`, `Sheet`, `Button`, `EmptyState`, `ErrorState`, `Skeleton`, `Tabs` trong `src/components/ui/`; không đặt block trong `<p>`; không card lồng card; không inline style/hex — token mới khai báo trong `globals.css`. |
| `npm run quality` có `next build` | Route mới là Route Handler; component client có `'use client'`; service chỉ import ở server. |

## 4. Changes per file

### 4.1 Schema & migration

**`prisma/schema.prisma`**
- `model EnLearnerProfile`: thêm sau `seenLevel`:
  ```prisma
  /// Uploaded avatar file under ENGLISH_AUDIO_ROOT, e.g. `avatars/<userId>.webp`. Null = default picture.
  avatarFile    String?
  /// Bumped on every avatar change so `/api/avatar/<id>?v=` busts caches.
  avatarVersion Int       @default(0)
  ```
- `model EnXpEvent`: thêm `@@index([day, userId])` và `@@index([at])`.
- `model EnReview`: thêm `@@index([at])`.

**`prisma/migrations/20261103000000_en_leaderboard_avatar/migration.sql`** (viết tay, đúng nội dung):
```sql
ALTER TABLE "EnLearnerProfile" ADD COLUMN "avatarFile" TEXT;
ALTER TABLE "EnLearnerProfile" ADD COLUMN "avatarVersion" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "EnXpEvent_day_userId_idx" ON "EnXpEvent"("day", "userId");
CREATE INDEX "EnXpEvent_at_idx" ON "EnXpEvent"("at");
CREATE INDEX "EnReview_at_idx" ON "EnReview"("at");
```
Không backfill. Sau đó `npx prisma generate`; kiểm bằng `npx prisma migrate diff --from-migrations prisma/migrations --to-schema-datamodel prisma/schema.prisma --script` → rỗng (cần shadow DB; nếu không có, `npx prisma validate` + `npm run test:db`).

### 4.2 Pure rules (không Prisma, không I/O)

**Mới `src/lib/english/leaderboard.ts`**
```ts
export type LeaderboardPeriod = 'week' | 'all';
export const LEADERBOARD_PERIODS = ['week', 'all'] as const;
export const LEADERBOARD_SIZE = 50;
export const ACTIVE_WINDOW_MS = 10 * 60_000;
export const FALLBACK_NAME = 'Học viên';
export type Score = { userId: string; xp: number };
export type RankedScore = Score & { rank: number };

/** Drops xp <= 0, sorts by xp desc then userId asc, gives standard competition ranks (1, 1, 3). */
export function rankScores(scores: Score[]): RankedScore[];
/** True when lastAt is within ACTIVE_WINDOW_MS before now (inclusive). Null → false. A lastAt after now → true. */
export function isActive(lastAt: Date | null, now: Date): boolean;
/** Trim, collapse whitespace, cut to 40 chars; empty/null → FALLBACK_NAME. */
export function displayName(name: string | null | undefined): string;
/** Uploaded avatar wins: `/api/avatar/<userId>?v=<version>`; else the Google image if it is https; else null. */
export function avatarUrl(userId: string, upload: { file: string | null; version: number } | null, image: string | null | undefined): string | null;
/** Visual podium order from the first three ranked rows: [2nd, 1st, 3rd], omitting missing ones. 1 row → [1st]; 2 rows → [2nd, 1st]. */
export function podiumOrder<T>(top: T[]): T[];
```

**Mới `src/lib/english/avatar.ts`**
```ts
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const AVATAR_PIXELS = 256;
export type AvatarProblem = 'empty' | 'too_big' | 'bad_type';
/** Mongo ObjectId hex. */
export function isUserId(value: string): boolean; // /^[a-f0-9]{24}$/
export function avatarFileName(userId: string): string; // `avatars/${userId}.webp`
export function checkAvatarUpload(file: { size: number; type: string }): AvatarProblem | null; // size 0 → empty; > MAX → too_big; type not in list → bad_type
export const AVATAR_PROBLEM_COPY: Record<AvatarProblem | 'unreadable' | 'unavailable', string>; // §5
```

### 4.3 Services

**Mới `src/services/english/enLeaderboardService.ts`**
```ts
export type LeaderboardRow = { userId: string; rank: number | null; name: string; avatarUrl: string | null; xp: number; level: number; active: boolean; me: boolean };
export type Leaderboard = { period: LeaderboardPeriod; rows: LeaderboardRow[]; me: LeaderboardRow; players: number; activeNow: number };
export async function getLeaderboard(userId: string, period: LeaderboardPeriod, now = new Date()): Promise<Leaderboard>;
```
Thuật toán (đúng thứ tự):
1. `where = period === 'week' ? { day: { in: vnWeekDays(vnDayKey(now)) } } : {}`.
2. `prisma.enXpEvent.groupBy({ by: ['userId'], where, _sum: { xp: true } })` → `rankScores(...)`. `players = ranked.length`.
3. `top = ranked.slice(0, LEADERBOARD_SIZE)`; `mine = ranked.find(r => r.userId === userId) ?? { userId, xp: 0, rank: null }`; `ids = unique([...top.map(r => r.userId), userId])`.
4. Chạy song song trong `Promise.all`:
   - Tổng XP mọi lúc cho cấp độ: nếu `period === 'all'` dùng luôn kết quả bước 2; nếu không, `groupBy({ by: ['userId'], where: { userId: { in: ids } }, _sum: { xp: true } })`. `level = levelFromXp(total).level` (`src/lib/english/xp.ts`).
   - `prisma.enLearnerProfile.findMany({ where: { userId: { in: ids } }, select: { userId: true, avatarFile: true, avatarVersion: true } })`.
   - Hoạt động gần đây (toàn hệ thống, không giới hạn `ids`): `since = new Date(now.getTime() - ACTIVE_WINDOW_MS)`; `enXpEvent.groupBy({ by: ['userId'], where: { at: { gte: since } }, _max: { at: true } })` và `enReview.groupBy({ by: ['userId'], where: { at: { gte: since } }, _max: { at: true } })`. Gộp thành `Map<userId, lastAt>` lấy max. `activeNow` = số userId có `isActive(lastAt, now)`.
   - `loadUserCards(ids)`: hàm nội bộ, `(await mongoClientPromise).db().collection('users').find({ _id: { $in: ids.filter(isUserId).map(id => new ObjectId(id)) } }, { projection: { name: 1, image: 1 } }).toArray()` → `Map<id, { name, image }>`. Bọc `try/catch`: lỗi Mongo → `console.error('[leaderboard] user lookup failed', error)` và trả Map rỗng (bảng vẫn hiện với tên `Học viên`).
5. Dựng row: `name = displayName(card?.name)`, `avatarUrl = avatarUrl(id, profile ? { file: profile.avatarFile, version: profile.avatarVersion } : null, card?.image)`, `active = isActive(lastAt ?? null, now)`, `me = id === userId`.
6. Trả `{ period, rows: top→rows, me: row của userId (rank null nếu chưa có XP kỳ này, xp = 0), players, activeNow }`.

**Mới `src/services/english/enAvatarService.ts`** (dùng `englishAudioRoot()` + `resolveAudioFile()` từ `src/lib/english/audioPath.ts`; `AppError` từ `src/lib/appError.ts`; `sharp`)
```ts
export async function saveAvatar(userId: string, file: File): Promise<{ avatarUrl: string }>;
export async function removeAvatar(userId: string): Promise<void>;
export async function readAvatar(targetUserId: string): Promise<{ file: string; size: number; etag: string }>;
export async function getAvatarState(userId: string, image: string | null | undefined): Promise<{ avatarUrl: string | null; hasUpload: boolean }>;
```
- `saveAvatar`: `checkAvatarUpload` → lỗi thì `throw new AppError(AVATAR_PROBLEM_COPY[problem], 400)`. Root null → `AppError(AVATAR_PROBLEM_COPY.unavailable, 503)`. `buffer = Buffer.from(await file.arrayBuffer())`; `out = await sharp(buffer, { limitInputPixels: 40_000_000 }).rotate().resize(AVATAR_PIXELS, AVATAR_PIXELS, { fit: 'cover' }).webp({ quality: 82 }).toBuffer()` (sharp mặc định bỏ EXIF/GPS); lỗi sharp → `AppError(AVATAR_PROBLEM_COPY.unreadable, 400)`. `target = resolveAudioFile(root, avatarFileName(userId))`; `mkdir(dirname(target), { recursive: true })`; ghi `${target}.${randomUUID()}.tmp` rồi `rename` sang `target`. Sau đó `prisma.enLearnerProfile.upsert({ where: { userId }, create: { userId, avatarFile: name, avatarVersion: 1 }, update: { avatarFile: name, avatarVersion: { increment: 1 } }, select: { avatarVersion: true } })`. Trả `{ avatarUrl: \`/api/avatar/${userId}?v=${version}\` }`.
- `removeAvatar`: `upsert` đặt `avatarFile: null`, `avatarVersion: { increment: 1 }` (create: `avatarVersion: 1`); rồi `unlink(target)`, bỏ qua lỗi `ENOENT`. Root null → chỉ cập nhật DB.
- `readAvatar`: `!isUserId(id)` → `AppError('Không tìm thấy ảnh', 404)`. Profile không có `avatarFile`, root null, `resolveAudioFile` null hoặc `stat` lỗi → cùng 404. `etag = \`"${id}-${avatarVersion}"\``.
- `getAvatarState`: đọc profile `select avatarFile, avatarVersion`; trả `{ avatarUrl: avatarUrl(userId, profile ? { file: profile.avatarFile, version: profile.avatarVersion } : null, image), hasUpload: !!profile?.avatarFile }`.

### 4.4 API routes (copy pattern `src/app/api/goals/daily-goal/route.ts` và `src/app/api/audio/route.ts`)

- **Mới `src/app/api/leaderboard/route.ts`** — `GET = withAuth(...)`: `z.object({ period: z.enum(LEADERBOARD_PERIODS) }).strict().safeParse(Object.fromEntries(request.nextUrl.searchParams))`; sai → `apiError('Kỳ xếp hạng không hợp lệ', 400)`; đúng → `apiSuccess(await getLeaderboard(user.id, period))`.
- **Mới `src/app/api/profile/avatar/route.ts`**
  - `POST = withAuth(...)`: `form = await request.formData().catch(() => null)`; `z.object({ file: z.instanceof(File) }).strict().safeParse(form ? Object.fromEntries(form) : null)`; sai → `apiError(AVATAR_PROBLEM_COPY.empty, 400)`; đúng → `apiSuccess(await saveAvatar(user.id, file))`. `AppError` đi qua `withAuth` như các route khác.
  - `DELETE = withAuth(...)`: `await removeAvatar(user.id)`; `apiSuccess({ avatarUrl: avatarUrl(user.id, null, user.image) })`.
- **Mới `src/app/api/avatar/[userId]/route.ts`** — `GET = withAuth(async (request, _user, { params }) => ...)`: `const { userId } = await params`; `readAvatar(userId)`; nếu `if-none-match === etag` → 304; nếu không stream file như `audio/route.ts` với header `Content-Type: image/webp`, `Content-Length`, `ETag`, `Cache-Control: private, max-age=31536000, immutable`. Không hỗ trợ Range.

### 4.5 UI

**`src/components/ui/Avatar.tsx`**
- Thêm size `xl` (56px, `h-14 w-14 text-lg`) và `xxl` (72px, `h-18 w-18 text-xl`) vào `SIZE_MAP` và class.
- `<Image ... unoptimized={src.startsWith('/')} />` (ảnh `/api/avatar` cần cookie, không qua bộ tối ưu ảnh). Ảnh Google giữ tối ưu như cũ.
- Giữ thẻ ngoài là `<div>`; vì vậy không bao giờ đặt `Avatar` bên trong `<p>`.

**`src/app/globals.css`** — thêm token (khối `:root` cạnh `--gold`, và khối `.dark` dòng ~110):
- `:root`: `--silver: #a9adbd; --bronze: #c07a45; --live: #4c9a58;`
- `.dark`: `--silver: #c3c6d4; --bronze: #d38c56; --live: #6cc27a;`
- Ánh xạ trong `@theme` cạnh `--color-gold` (dòng ~203): `--color-silver: var(--silver); --color-bronze: var(--bronze); --color-live: var(--live);`
- Class mới (đặt sau `.stat-tile`, dòng ~484), cùng phong cách viền 2px + bóng `0 3px 0` của `.stat-tile`:
  ```css
  .podium { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); align-items: end; gap: 8px; }
  .podium-step { display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 4px; border: 2px solid var(--border); border-bottom: 0; border-radius: 12px 12px 0 0; background: var(--surface); box-shadow: 0 3px 0 var(--border); padding: 10px 6px 8px; }
  .podium-step[data-rank="1"] { min-height: 112px; border-color: var(--gold); background: color-mix(in srgb, var(--gold) 16%, var(--surface)); }
  .podium-step[data-rank="2"] { min-height: 88px; border-color: var(--silver); background: color-mix(in srgb, var(--silver) 16%, var(--surface)); }
  .podium-step[data-rank="3"] { min-height: 72px; border-color: var(--bronze); background: color-mix(in srgb, var(--bronze) 16%, var(--surface)); }
  .medal { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; border: 2px solid var(--pixel-outline); font-weight: 900; font-size: .8rem; color: var(--level-badge-fg); }
  .medal[data-rank="1"] { background: var(--gold); } .medal[data-rank="2"] { background: var(--silver); } .medal[data-rank="3"] { background: var(--bronze); }
  .avatar-ring-1 { box-shadow: 0 0 0 3px var(--gold); } .avatar-ring-2 { box-shadow: 0 0 0 3px var(--silver); } .avatar-ring-3 { box-shadow: 0 0 0 3px var(--bronze); }
  .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; background: var(--live); box-shadow: 0 0 0 0 color-mix(in srgb, var(--live) 60%, transparent); animation: live-pulse 1.8s ease-out infinite; }
  @keyframes live-pulse { to { box-shadow: 0 0 0 6px transparent; } }
  @media (prefers-reduced-motion: reduce) { .live-dot { animation: none; } }
  .rank-row-me { border-color: var(--accent); background: var(--accent-subtle); }
  ```

**Mới `src/components/english/progress/Podium.tsx`** (server-safe, không `'use client'` cần thiết nhưng được import từ client — không dùng hook)
- Props `{ rows: LeaderboardRow[] }` (tối đa 3). Render `<ol className="podium" aria-label="Top 3">`, mỗi mục theo `podiumOrder(rows)` là `<li>`: phía trên bước là `Avatar` (`xxl` cho hạng 1, `xl` cho hạng 2/3) với class `avatar-ring-{rank}`; với hạng 1 thêm `AdventureIcon name="trophy" size={20}` màu `text-gold` phía trên avatar; dưới avatar là `<div className="podium-step" data-rank={rank}>` chứa `<span className="medal" data-rank>{rank}</span>`, tên (`truncate max-w-full text-sm font-bold`), `<span className="xp-chip">{xp} XP</span>`, và nếu `active` thì `<span className="live-dot" aria-label="Đang học" />` cạnh tên. Dòng `me` thêm chip `Bạn` (`rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground`).
- Khi hoà hạng (hai người cùng rank 1), `data-rank` dùng `rank` thật (cả hai bước vàng) — `podiumOrder` vẫn xếp theo thứ tự đã sort.
- Khi chỉ có 1–2 người: grid vẫn 3 cột; dùng `col-start` để hạng 1 luôn ở cột giữa (`li` hạng 1: `col-start-2`; hạng 2: `col-start-1`; hạng 3: `col-start-3`; gán theo vị trí trong `podiumOrder` mảng đầy đủ [2,1,3]).

**Mới `src/components/english/progress/LeaderboardTab.tsx`** (`'use client'`)
- Props `{ weekResetsIn: string }`.
- State: `period: LeaderboardPeriod` (mặc định `'week'`), `data: Partial<Record<LeaderboardPeriod, Leaderboard>>`, `error: boolean`. Effect theo `period`: nếu `data[period]` chưa có → `englishSend<Leaderboard>(\`/api/leaderboard?period=${period}\`, 'GET')`; thành công ghi vào `data`; lỗi → `error = true`. Nút “Thử lại” xoá lỗi và gọi lại.
- Bố cục từ trên xuống:
  1. Hàng điều khiển: nhóm 2 nút dạng segmented (`role="radiogroup"`, mỗi nút `role="radio" aria-checked`, `min-h-10 rounded-control px-3 text-sm font-bold`, chọn = `bg-accent text-accent-foreground`, không chọn = `bg-surface border border-border`) “Tuần này” / “Mọi lúc”. Bên phải: chip `activeNow` (`live-dot` + text) — ẩn khi `activeNow === 0`. Khi `period === 'week'`, dòng phụ `text-xs text-muted` bên dưới: “Bảng tuần đặt lại sau {weekResetsIn}”.
  2. `section.mode-card` chứa `Podium` với `rows.slice(0, 3)`. (Podium không phải card con bên trong card khác; `.podium-step` là bậc bục, không phải card.)
  3. Danh sách `rows.slice(3)`: `<ol className="space-y-2">`, mỗi `<li className="word-row flex items-center gap-3 px-3 py-2">` (thêm `rank-row-me` nếu `me`): ô hạng `w-8 text-center font-black tabular-nums text-muted` (`{rank}`), `Avatar size="md"`, khối tên `min-w-0 flex-1` (tên `truncate font-bold`, dòng dưới `text-xs text-muted`: `Lv {level}` + nếu active ` · ` + `live-dot` + “Đang học”), XP bên phải `shrink-0 text-sm font-bold tabular-nums` “{xp} XP”, chip “Bạn” nếu `me`.
  4. Dòng ghim của mình: hiện khi `!rows.some(r => r.me)`. Nếu `me.rank !== null`: cùng kiểu dòng ở bước 3 với `rank-row-me`, ô hạng hiện `{me.rank}`, đặt sau một dòng `text-center text-xs text-muted` “…”. Nếu `me.rank === null`: một `p.text-sm.text-muted` trong `mode-card` với câu ở §5 và `Link` “Ôn ngay” → `/`.
  5. Chân: `text-xs text-muted` “{players} người trong bảng” (ẩn khi `players === 0`).

**`src/components/english/progress/ProgressHub.tsx`**
- `ProgressTab` thêm `'leaderboard'`.
- Thêm `<TabsTrigger value="leaderboard">Xếp hạng</TabsTrigger>` **sau** “Thành tựu”, và `<TabsContent value="leaderboard" className="pt-5"><LeaderboardTab weekResetsIn={weekResetsIn} /></TabsContent>`.
- Không đổi gì khác.

**`src/app/(app)/progress/page.tsx`**: `TABS` thêm `'leaderboard'`. (Leaderboard tải bằng API khi mở tab, không làm chậm trang.)

**Mới `src/components/english/AvatarSheet.tsx`** (`'use client'`, copy cấu trúc `src/components/english/goals/DailyGoalSheet.tsx`: `Sheet` + `useRouter().refresh()`)
- Props `{ open: boolean; onClose: () => void; name: string; avatarUrl: string | null; hasUpload: boolean }`.
- State: `file: File | null`, `preview: string | null` (`URL.createObjectURL`, thu hồi khi đổi/đóng), `busy`, `error`.
- Nội dung: `Avatar size="xxl"` (preview ?? avatarUrl, `name`), câu gợi ý §5, `<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" id=...>` kèm `<label>` dạng nút “Chọn ảnh”. Khi chọn: chạy `checkAvatarUpload` ở client, lỗi → `error = AVATAR_PROBLEM_COPY[problem]`, không đặt `file`.
- Nút “Lưu ảnh” (primary, disabled khi `!file || busy`): `fetch('/api/profile/avatar', { method: 'POST', body: formData })`, đọc `{ ok, error }`; ok → `onClose()` + `router.refresh()`; lỗi → `error = payload.error ?? AVATAR_PROBLEM_COPY.failed`.
- Nút “Dùng ảnh mặc định” (chỉ khi `hasUpload`, kiểu ghost): `englishSend('/api/profile/avatar', 'DELETE')` rồi `onClose()` + `router.refresh()`.
- Nút “Huỷ” → `onClose()`.
- Footer nút: `flex flex-col gap-2 sm:flex-row` để không tràn ở 375px.
- Lỗi hiện `<p role="alert" className="text-sm text-error">`.

**`src/components/english/AccountMenu.tsx`**
- Props thêm `avatarUrl: string | null; hasUpload: boolean`.
- `<summary>` thay chữ cái đầu bằng `<Avatar src={avatarUrl} name={name} size="md" />` (giữ `aria-label="Menu tài khoản"`, bỏ class chữ của summary nhưng giữ `min-h-10 min-w-10 rounded-full focus-visible:ring-2`).
- Thêm nút menu “Đổi ảnh đại diện” ngay **trên** “Mục tiêu ngày”, cùng class nút đó; bấm thì `closeMenu()` rồi mở `AvatarSheet` (render cạnh `DailyGoalSheet`).

**`src/components/english/EnglishShell.tsx`**: props thêm `avatarUrl: string | null; hasUpload: boolean`, truyền vào cả hai `<AccountMenu>`.

**`src/app/(app)/layout.tsx`**: thêm `getAvatarState(session.user.id, session.user.image)` vào `Promise.all`; truyền `avatarUrl`, `hasUpload` vào `EnglishShell`.

### 4.6 Dependency
- `npm install sharp@0.35.5` (đúng bản đang có trong `node_modules` qua `next`), để thành dependency trực tiếp trong `package.json` → `next build` standalone và `npm ci --omit=dev` trong `Dockerfile` đều có sharp.

## 5. Exact copy

Thêm (không xoá chuỗi nào cũ):

| Chỗ | Chuỗi |
|---|---|
| Tab | `Xếp hạng` |
| Nút kỳ | `Tuần này` · `Mọi lúc` |
| Nhãn reset (tuần) | `Bảng tuần đặt lại sau {weekResetsIn}` |
| Chip hoạt động | `{n} người đang học` |
| Nhãn đang học (dòng & aria) | `Đang học` |
| Chip mình | `Bạn` |
| XP | `{xp} XP` |
| Cấp | `Lv {level}` |
| Chân bảng | `{players} người trong bảng` |
| Mình chưa có XP (tuần) | `Bạn chưa có XP tuần này. Trả lời vài câu để vào bảng.` |
| Mình chưa có XP (mọi lúc) | `Bạn chưa có XP. Trả lời vài câu để vào bảng.` |
| Link | `Ôn ngay` |
| Trống — tiêu đề | `Bảng xếp hạng còn trống` |
| Trống — mô tả tuần | `Tuần này chưa ai có XP. Ôn vài từ để giành hạng 1!` |
| Trống — mô tả mọi lúc | `Chưa ai có XP. Ôn vài từ để giành hạng 1!` |
| Lỗi tải | tiêu đề `Không tải được bảng xếp hạng`, mô tả `Kiểm tra mạng rồi thử lại.`, nút (ErrorState `onRetry`) mặc định của ErrorState |
| aria podium | `Top 3` |
| Tên dự phòng | `Học viên` |
| Menu | `Đổi ảnh đại diện` |
| Sheet tiêu đề | `Ảnh đại diện` |
| Sheet gợi ý | `Ảnh JPG, PNG hoặc WebP, tối đa 2 MB. Ảnh sẽ được cắt vuông.` |
| Nút | `Chọn ảnh` · `Lưu ảnh` · `Đang lưu…` (khi busy) · `Dùng ảnh mặc định` · `Huỷ` |
| `AVATAR_PROBLEM_COPY.empty` | `Hãy chọn một ảnh.` |
| `.too_big` | `Ảnh lớn hơn 2 MB.` |
| `.bad_type` | `Chỉ nhận ảnh JPG, PNG hoặc WebP.` |
| `.unreadable` | `Không đọc được ảnh này. Hãy thử ảnh khác.` |
| `.unavailable` | `Chưa thể lưu ảnh lúc này.` |
| `.failed` | `Chưa lưu được ảnh. Hãy thử lại.` |
| API query sai | `Kỳ xếp hạng không hợp lệ` |
| Ảnh không có | `Không tìm thấy ảnh` |

Kiểu `AVATAR_PROBLEM_COPY: Record<AvatarProblem | 'unreadable' | 'unavailable' | 'failed', string>`.

## 6. States

**Tab Xếp hạng**
- Loading (chưa có `data[period]`, chưa lỗi): `mode-card` chứa 3 khối `Skeleton` tròn cạnh nhau (podium) + `Skeleton lines={5}`. Nút kỳ vẫn bấm được.
- Error: `ErrorState` với copy §5 và `onRetry`. Chuyển kỳ khác vẫn thử tải kỳ đó.
- Empty (`rows.length === 0`): `EmptyState icon="trophy"` tiêu đề + mô tả theo kỳ, `action={{ label: 'Ôn ngay', href: '/' }}`. Không hiện podium, không hiện dòng ghim (câu “Bạn chưa có XP” đã nằm trong ý của EmptyState), ẩn chân bảng. Chip “đang học” vẫn hiện nếu `activeNow > 0`.
- 1 người: podium chỉ bậc giữa (hạng 1), không có danh sách.
- 2–3 người: podium 2–3 bậc, không có danh sách.
- Nhiều (≥ 4): podium + danh sách hạng 4..50.
- Mình ngoài top 50: dòng “…” + dòng ghim với hạng thật.
- Mình chưa có XP kỳ này (người học mới, chưa tải bộ nào): bảng của người khác + `mode-card` câu “Bạn chưa có XP…” + `Ôn ngay`.
- Hoà điểm: cùng số hạng (1, 1, 3); thứ tự trong cùng hạng theo `userId`.
- Admin vs student: giống hệt; admin cũng được xếp hạng.
- 375px: nút kỳ + chip trên một hàng (`flex flex-wrap items-center justify-between gap-2`); tên trên podium `truncate`; XP `xp-chip` `whitespace-nowrap`; 4 tab trong `TabsList` cuộn ngang được (đã có `overflow-x-auto`); nhãn nút không xuống dòng (`whitespace-nowrap`).

**Avatar / menu**
- Chưa tải ảnh, có ảnh Google: hiện ảnh Google; không có nút “Dùng ảnh mặc định”.
- Chưa tải ảnh, không có ảnh Google: chữ cái đầu (hành vi `Avatar` cũ).
- Đã tải ảnh: hiện ảnh tải lên; có nút “Dùng ảnh mặc định”.
- Đang lưu: nút “Lưu ảnh” thành “Đang lưu…”, các nút disabled.
- Lỗi client/server: `role="alert"` với copy §5; sheet vẫn mở.
- `ENGLISH_AUDIO_ROOT` trống (dev): POST trả 503 “Chưa thể lưu ảnh lúc này.”; bảng vẫn dùng ảnh Google/chữ cái.
- 375px: sheet footer xếp dọc, avatar 72px giữa.

## 7. Data

- Schema: §4.1. Lưu file: `${ENGLISH_AUDIO_ROOT}/avatars/<userId>.webp` — dùng chung volume `english_audio:/data/audio` đã có trong `docker-compose.yml`, nên không đổi deploy.
- `GET /api/leaderboard?period=week|all` — query `z.object({ period: z.enum(['week','all']) }).strict()` → `{ ok: true, data: Leaderboard }`:
  ```ts
  { period: 'week' | 'all'; rows: LeaderboardRow[] /* ≤ 50 */; me: LeaderboardRow; players: number; activeNow: number }
  LeaderboardRow = { userId: string; rank: number | null; name: string; avatarUrl: string | null; xp: number; level: number; active: boolean; me: boolean }
  ```
  Không có `email`.
- `POST /api/profile/avatar` — `multipart/form-data`, `z.object({ file: z.instanceof(File) }).strict()` → `{ ok: true, data: { avatarUrl: string } }`; lỗi 400/503 `{ ok: false, error }`.
- `DELETE /api/profile/avatar` → `{ ok: true, data: { avatarUrl: string | null } }`.
- `GET /api/avatar/[userId]?v=<n>` → `image/webp` hoặc 304/404.

## 8. Tests

**Mới `src/lib/__tests__/enLeaderboard.test.ts`** (thuần, không mock)
- `rankScores([{u:'b',xp:50},{u:'a',xp:50},{u:'c',xp:80},{u:'d',xp:0}])` → `[c rank1 80, a rank2 50, b rank2 50]` (d bị loại, a trước b).
- `rankScores([{a,10},{b,10},{c,5}])` → ranks `[1,1,3]`.
- `rankScores([])` → `[]`.
- `isActive(new Date(now - 10*60_000), now)` → `true`; `now - 10*60_000 - 1` → `false`; `null` → `false`.
- `displayName('  Nguyễn   Văn  A ')` → `'Nguyễn Văn A'`; `''`/`null` → `'Học viên'`; chuỗi 60 ký tự → 40 ký tự.
- `avatarUrl('6532…(24 hex)', { file: 'avatars/x.webp', version: 3 }, 'https://lh3…')` → `'/api/avatar/<id>?v=3'`; `{ file: null, version: 2 }` + ảnh https → ảnh Google; ảnh `http://…` → `null`; không gì → `null`.
- `podiumOrder([A,B,C])` → `[B,A,C]`; `[A,B]` → `[B,A]`; `[A]` → `[A]`; `[]` → `[]`.

**Mới `src/lib/__tests__/enAvatar.test.ts`** (thuần)
- `isUserId('a'.repeat(24))` → true; `'A'.repeat(24)`, `'a'.repeat(23)`, `'../x'` → false.
- `avatarFileName('abc…')` → `'avatars/abc….webp'`.
- `checkAvatarUpload({size:0,type:'image/png'})` → `'empty'`; `{size: 2*1024*1024, type:'image/png'}` → `null`; `{size: 2*1024*1024+1, ...}` → `'too_big'`; `{size:100,type:'image/gif'}` → `'bad_type'`.

**Mới `src/lib/__tests__/enLeaderboardService.test.ts`** (mock `@/lib/prisma` và `@/lib/mongodbClient` theo kiểu `enGoalService.test.ts`)
- Tuần tại `now = 2026-10-29T17:00:00Z` (00:00 thứ Sáu 30/10 giờ VN): `groupBy` lần đầu được gọi với `where.day.in` = `['2026-10-26',…,'2026-11-01']`. Tại `2026-10-25T16:59:59Z` (23:59:59 CN 25/10 VN) → tuần `2026-10-19…2026-10-25`.
- 3 user (XP 300, 200, 100), me = user thứ 2 → `rows.length 3`, `rows[1].me === true`, `me.rank === 2`.
- 55 user, me hạng 53 → `rows.length 50`, `me.rank === 53`, `rows.some(r => r.me) === false`.
- Me không có XP tuần → `me = { rank: null, xp: 0, … }`.
- Hoạt động: `enXpEvent.groupBy` (at) trả user A lúc `now-5m`, `enReview.groupBy` trả user B lúc `now-9m`, user C lúc `now-11m` → `activeNow === 2`, A/B `active` true, C false.
- Mongo `find` throw → tên mọi dòng `'Học viên'`, hàm không throw.
- Period `'all'`: `groupBy` không có `day` trong `where`, và không gọi groupBy tổng thứ hai.
- Payload không có khoá `email` (`JSON.stringify(result)` không chứa `"email"`).

**Mới `src/lib/__tests__/enAvatarService.test.ts`** (thư mục tạm `fs.mkdtemp(os.tmpdir())` làm `ENGLISH_AUDIO_ROOT`, mock `@/lib/prisma`; ảnh nguồn tạo bằng `sharp({ create: { width: 600, height: 400, channels: 3, background: '#f00' } }).png().toBuffer()`)
- `saveAvatar(id, new File([png], 'a.png', { type: 'image/png' }))` → file `avatars/<id>.webp` tồn tại, `sharp(file).metadata()` = `{ width: 256, height: 256, format: 'webp' }`; upsert gọi với `avatarVersion: { increment: 1 }`; trả `avatarUrl` `/api/avatar/<id>?v=<version>`.
- File 3 MB → `AppError` 400 `'Ảnh lớn hơn 2 MB.'`, không ghi file.
- File `image/png` nhưng nội dung là text → `AppError` 400 `'Không đọc được ảnh này. Hãy thử ảnh khác.'`.
- Root rỗng → `AppError` 503.
- `removeAvatar` khi chưa có file → không throw; upsert `avatarFile: null`.
- `readAvatar('../etc')` → 404; profile không có file → 404.

## 9. Steps

1. Branch `feat/leaderboard-avatar` từ `main`; `npm install sharp@0.35.5`.
2. Schema + migration §4.1; `npx prisma generate`; `npm run typecheck`.
3. `src/lib/english/leaderboard.ts`, `avatar.ts` + 2 test thuần; `npm test`.
4. `enLeaderboardService.ts` + test; `npm test`.
5. `enAvatarService.ts` + test; `npm test`.
6. 3 route API §4.4; `npm run typecheck`.
7. Token + class CSS §4.5; `Avatar.tsx` size/unoptimized.
8. `Podium.tsx`, `LeaderboardTab.tsx`; gắn tab vào `ProgressHub.tsx` và `progress/page.tsx`.
9. `AvatarSheet.tsx`; `AccountMenu.tsx`, `EnglishShell.tsx`, `layout.tsx`.
10. `npm run quality`; `npm run test:db` (đổi query/schema); kiểm tay §10.
11. Commit, push, PR (body liệt kê mọi chỗ lệch plan), merge, deploy theo `AGENTS.md`. Migration chỉ thêm → không cần `pg_dump`.

## 10. Acceptance

- `npm run quality` pass; `npm run test:db` pass.
- Dev `http://localhost:3002`, `.env` có `ENGLISH_AUDIO_ROOT` trỏ thư mục ghi được:
  1. Tài khoản student có XP tuần này + ít nhất 3 tài khoản khác có XP (seed bằng cách trả lời vài câu ở `/`): mở `/progress?tab=leaderboard` → podium 3 bậc, hạng 1 ở giữa cao nhất có cúp; dòng mình tô tím có chip “Bạn”.
  2. Vừa trả lời một câu ở `/` rồi quay lại → mình có chấm xanh “Đang học”, chip “1 người đang học” (hoặc nhiều hơn).
  3. Đổi “Mọi lúc” → thấy skeleton rồi dữ liệu; không có nhãn “đặt lại sau”; bấm lại “Tuần này” không tải lại.
  4. Tài khoản mới chưa tải bộ nào → thấy bảng người khác + “Bạn chưa có XP tuần này…”; trên DB trống → EmptyState.
  5. Menu tài khoản → “Đổi ảnh đại diện” → chọn ảnh JPG 1 MB → “Lưu ảnh” → avatar ở menu và trên bảng đổi ngay; thử GIF và ảnh 3 MB → đúng câu lỗi; “Dùng ảnh mặc định” → quay về ảnh Google/chữ cái.
  6. Admin xem cùng bảng, admin có tên trong bảng nếu có XP.
  7. DevTools 375px: không tràn ngang, nhãn nút một dòng, không lỗi hydration trong console, dark mode màu vàng/bạc/đồng đọc rõ.
  8. Network: payload `/api/leaderboard` không có `email`; `/api/avatar/<id>?v=n` trả `image/webp` với `Cache-Control: private, max-age=31536000, immutable`.
- Reviewer: `git diff main...HEAD` đối chiếu plan + danh sách *Pitfalls* trong `AGENTS.md`.
