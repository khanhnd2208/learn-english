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
