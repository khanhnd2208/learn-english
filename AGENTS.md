# Agent guide — Learn English

## Stack

- Next.js 16 App Router, React 19, TypeScript 5, Tailwind 4
- PostgreSQL with Prisma 7 for English content, practice, tests, and reports
- MongoDB for NextAuth users and sessions
- `@/` maps to `src/`; local development uses port **3002**

## Domain map

| Domain | Entry points |
|---|---|
| Content and import | `src/services/english/enContentService.ts`, `src/lib/english/contentValidation.ts` |
| Practice | `src/services/english/enPracticeService.ts`, `src/lib/english/activities/` |
| Tests and mastery | `src/services/english/enTestService.ts`, `src/lib/english/wordState.ts` |
| Progress and mistakes | `src/services/english/enProgressService.ts`, `src/services/english/enCatalogService.ts` |
| Auth and admin | `src/lib/auth.ts`, `src/app/api/admin/` |

## Quality commands

```bash
npm run quality
npm test
npm run typecheck
```

## Conventions

- Business logic belongs in `src/services/english/`.
- Pure learning rules belong in `src/lib/english/`.
- Unit tests live in `src/lib/__tests__/`; mock Prisma only in service-layer tests.
- API responses use helpers in `src/lib/apiUtils.ts`.
- Read the relevant Next.js 16 guide in `node_modules/next/dist/docs/` before changing framework behavior.

## Git and deploy (standing permission from the owner)

- After a change passes `npm run quality`, commit, push, open or update the PR, merge it, and deploy without asking again.
- Work on a feature branch; never commit straight to `main`.
- Ask first only when it is truly needed: destructive data changes on a database with real learner data (DROP, deleting progress), new secrets, domains or DNS, or a failure you cannot fix safely.
- Back up a database with `pg_dump` before running a destructive migration on it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
