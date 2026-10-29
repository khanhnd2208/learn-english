# Agent guide — Learn English

## Stack

- Next.js 16 App Router (`src/proxy.ts` for route protection, `params` / `searchParams` as `Promise`), React 19, TypeScript 5, Tailwind 4 (`src/app/globals.css`, `DESIGN.md`)
- PostgreSQL with Prisma 7 (`prisma/schema.prisma`, `@prisma/adapter-pg` in `src/lib/prisma.ts`) for all `En*` models: vocabulary content, SRS states/reviews, guided review sessions, XP ledger, quests, achievements, and answer appeals
- MongoDB (`src/lib/mongodbClient.ts`) for NextAuth v5 (`src/lib/auth.ts`, `src/lib/auth.config.ts`) users, roles (`admin` / `student`), and sessions
- Server-side Piper TTS synthesis with file caching (`src/services/english/enTtsService.ts`) and browser Web Speech fallback (`src/lib/useSpeech.ts`)
- `@/` maps to `src/`; local development uses port **3002**

## Domain map

| Domain | Entry points |
|---|---|
| Content, pack v4 & import/publish | `src/services/english/enContentService.ts`, `src/lib/english/contentValidation.ts`, `src/lib/english/senseBundle.ts`, `src/lib/english/advancedNotes.ts`, `src/lib/english/wordFamily.ts`, `src/lib/english/packPreview.ts`, `src/lib/english/lemmaMerge.ts`, AI prompt `src/lib/english/aiPackPrompt.ts`, APIs `src/app/api/admin/import/route.ts`, `src/app/api/admin/publish/route.ts`, `src/app/api/admin/sets/[setId]/route.ts` |
| Catalog, store & enrollments | `src/services/english/enCatalogService.ts`, pages `src/app/(app)/sets/page.tsx`, `src/app/(app)/sets/[setId]/page.tsx`, `src/app/(app)/store/page.tsx`, UI `src/components/english/Library.tsx`, `src/components/english/SetDetail.tsx`, APIs `src/app/api/enroll/route.ts`, `src/app/api/sets/[setId]/route.ts` |
| Daily SRS review (Ôn luân phiên) | `src/services/english/enDailyService.ts`, pure rules `src/lib/english/schedule.ts`, `src/lib/english/grade.ts`, `src/lib/english/srsPrompt.ts`, `src/lib/english/answerLayout.ts`, `src/lib/english/gapRule.ts`, `src/lib/english/streak.ts`, `src/lib/english/todayHero.ts`, `src/lib/english/reviewSummary.ts`, UI `src/components/english/StudySession.tsx`, APIs `src/app/api/daily/start/route.ts`, `src/app/api/daily/answer/route.ts`, `src/app/api/daily/finish/route.ts` |
| Guided set review (Ôn theo bộ) | `src/services/english/enGuidedReviewService.ts`, pure rules `src/lib/english/guidedReview.ts`, `src/lib/english/activities/` (`registry.ts`, `distractors.ts`, `rng.ts`, `testBuild.ts`), page `src/app/(app)/review/page.tsx`, UI `src/components/english/ReviewOverview.tsx`, `src/components/english/GuidedReviewSession.tsx`, API `src/app/api/review/route.ts` |
| Ungraded set practice (Luyện tập) | Pure rules `src/lib/english/quiz.ts`, `src/lib/english/practiceLoop.ts`, `src/lib/english/activities/`, page `src/app/(app)/sets/[setId]/practice/page.tsx`, UI `src/components/english/quiz/PracticeRunner.tsx`, `src/components/english/quiz/QuestionView.tsx` |
| SRS answer appeals (Khiếu nại) | `src/services/english/enAppealService.ts`, pure rules `src/lib/english/appeal.ts`, UI `src/components/english/session/AppealForm.tsx`, `src/components/english/EnglishAdminAppeals.tsx`, APIs `src/app/api/daily/appeal/route.ts`, `src/app/api/admin/appeals/route.ts` |
| Goals, XP, quests, achievements & progress | `src/services/english/enGoalService.ts`, `src/services/english/enProgressService.ts`, pure rules `src/lib/english/xp.ts`, `src/lib/english/quests.ts`, `src/lib/english/achievements.ts`, `src/lib/english/goalMetrics.ts`, `src/lib/english/progressHistory.ts`, `src/lib/english/progressStats.ts`, page `src/app/(app)/progress/page.tsx`, UI `src/components/english/progress/ProgressHub.tsx`, `src/components/english/goals/`, APIs `src/app/api/goals/route.ts`, `src/app/api/goals/daily-goal/route.ts`, `src/app/api/goals/seen/route.ts` |
| Audio & TTS | `src/services/english/enAudioService.ts`, `src/services/english/enTtsService.ts`, `src/lib/english/audioPath.ts`, `src/lib/english/audioPlayback.ts`, `src/lib/useServerTts.ts`, `src/lib/useSpeech.ts`, APIs `src/app/api/audio/route.ts`, `src/app/api/audio/status/route.ts` |
| Auth, admin & QA tools | `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/apiAuth.ts`, `src/lib/apiUtils.ts`, `src/proxy.ts`, `src/services/english/enQaService.ts`, page `src/app/(app)/admin/page.tsx`, UI `src/components/english/EnglishAdmin.tsx`, APIs `src/app/api/admin/qa/route.ts`, `src/app/api/health/route.ts` |

## Learning model invariants

- **Three distinct study modes**:
  1. **Ôn luân phiên (Daily SRS)**: Server-graded typed recall (`enDailyService`). Updates `EnWordState` across 6 Leitner boxes (`EN_LEITNER_INTERVALS = [0, 1, 3, 7, 21, 60]` days; `box >= 4` is `long_term`), writes `EnReview`, and awards SRS (`review`), `longterm`, or `extra` XP. Accepts near-synonyms without moving the schedule (`result: 'synonym'`) and gives one typo retry (`result: 'near'`) via Damerau-Levenshtein check. The queue has **no caps**: every due word, then every unscheduled word of every downloaded set (one word per set in turn, `interleaveNewWords`); a learner who stops partway continues next time.
  2. **Ôn theo bộ (Guided Review)**: Server-persisted 5-word chunks (`EnGuidedReviewSession` / `EnGuidedReviewQuestion`) with `study -> quiz -> retry -> summary` phases (`enGuidedReviewService`). Awards `extra` XP (sharing the daily `reviewDailyCap = 300` with unscheduled SRS reviews) and does **not** modify `EnWordState`.
  3. **Luyện tập (Set Practice)**: Browser-only ungraded practice (`PracticeRunner` + `practiceLoop.ts`) with `mcq`, `fill`, `listen`, or `mix`. Saves nothing to the database and awards no XP.
- **Vietnam calendar day (`Asia/Ho_Chi_Minh`, `+07:00`)**: All day keys (`vnDayKey`), due dates (`vnDayStart`), streaks (`streak.ts`), and daily/weekly quest boards (`enGoalService.ts`) are anchored to Vietnam midnight.
- **Pack v4 content separation**: Each sense has one card sentence (`cardExample`, stored with `role: 'study'`) shown on cards and hidden quiz sentences (`quizExamples`, stored with `role: 'grade'`) used only for cloze questions so a quiz never repeats the card sentence.
- **Idempotent XP ledger & server-side pacing**: Every XP award is stored in `EnXpEvent` with a deterministic `@@unique([userId, sourceKey])` and `skipDuplicates: true`. Anti-spam pacing (`pacedEnough >= 3000ms`) is computed from server timestamps inside transactions, never from client `responseMs`.

## Quality commands

```bash
npm run quality
npm test
npm run typecheck
```

## Conventions

- Business logic and Prisma queries belong in `src/services/english/`.
- Pure, deterministic learning rules belong in `src/lib/english/`.
- Unit tests live in `src/lib/__tests__/`; mock Prisma only in service-layer tests.
- API routes use `withAuth`, `withAdmin`, `withErrorHandling`, `apiSuccess`, and `apiError` in `src/lib/apiUtils.ts`, and validate request payloads with Zod `.strict()`.
- Use root-level routes (`/`, `/sets`, `/review`, `/store`, `/progress`, `/admin`, `/api/...`); never reintroduce `/english` or `/api/english` prefixes.
- Follow UI design tokens in `DESIGN.md` and primitives in `src/components/ui/`; user-facing copy is in Vietnamese.
- Read the relevant Next.js 16 guide in `node_modules/next/dist/docs/` before changing framework behavior.

## Git and deploy (standing permission from the owner)

- After a change passes `npm run quality`, commit, push, open or update the PR, merge it, and deploy without asking again.
- Work on a feature branch; never commit straight to `main`.
- Ask first only when it is truly needed: destructive data changes on a database with real learner data (DROP, deleting progress), new secrets, domains or DNS, or a failure you cannot fix safely.
- Back up a database with `pg_dump` before running a destructive migration on it.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
