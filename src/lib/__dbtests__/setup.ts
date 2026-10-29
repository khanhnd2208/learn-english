import { afterAll } from 'vitest';
import { assertTestDatabase } from '../../../scripts/lib/test-database';
export { resetEnTables } from '../../../scripts/lib/test-database';

process.env.DATABASE_URL = assertTestDatabase(process.env.TEST_DATABASE_URL, true);
// Dynamic import is essential: the adapter reads DATABASE_URL at import time.
const { prisma } = await import('@/lib/prisma');
afterAll(() => prisma.$disconnect());
