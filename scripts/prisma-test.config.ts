import { defineConfig } from 'prisma/config';
import { assertTestDatabase } from './lib/test-database';

// Do not load .env.local: the normal Prisma config deliberately overrides env vars.
export default defineConfig({
	schema: '../prisma/schema.prisma',
	migrations: { path: '../prisma/migrations' },
	datasource: { url: assertTestDatabase(process.env.DATABASE_URL) },
});
