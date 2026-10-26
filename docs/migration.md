# Migration from Learn Chinese

Back up both databases before importing or deleting data. Apply `prisma/migrations/0_init` to the new empty PostgreSQL database first.

## Content tables

Copy these tables with `pg_dump --data-only --table='EnWord' ...` and restore with `psql`:

`EnWord`, `EnSense`, `EnExample`, `EnSenseHint`, `EnSenseRelation`, `EnWordFamily`, `EnWordFamilyMember`, `EnPattern`, `EnPatternExample`, `EnPatternSense`, `EnQuestion`, `EnSet`, `EnSetItem`, `EnActivityType`, `EnTestBlueprint`.

Use dependency order when importing, or produce one dump containing all listed tables so PostgreSQL preserves the dump's ordering.

## Learner data

Do not copy learner tables by default. Their `userId` values reference MongoDB IDs. To preserve them, first copy the matching `users` and `accounts` documents with unchanged `_id` values, then copy `EnEnrollment`, `EnWordState`, `EnPracticeSession`, `EnTestAttempt`, `EnTestItem`, `EnTestWordResult`, `EnPatternProgress`, `EnAnswerLog`, `EnAudioOpen`, and `EnDispute`.

Verify row counts with:

```bash
SOURCE_DATABASE_URL=postgresql://... TARGET_DATABASE_URL=postgresql://... npm run db:verify-transfer
```

Only after the new app is live, its OAuth callback works, and content counts match should the English schema be dropped from `learn-chinese`.
