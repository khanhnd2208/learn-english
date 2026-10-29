import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

/** Fail closed before importing a client or invoking a migration. */
export function assertTestDatabase(value: string | undefined, testOnly = false): string {
	if (!value) throw new Error('A local test/load DATABASE_URL is required');
	const url = new URL(value);
	const database = decodeURIComponent(url.pathname.slice(1));
	if (!['postgres:', 'postgresql:'].includes(url.protocol) || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(url.hostname) || !(testOnly ? /_test$/ : /_(test|load)$/).test(database)) {
		throw new Error('Refusing database: expected localhost and a database ending in ' + (testOnly ? '_test' : '_test or _load'));
	}
	// Alternate connection options can redirect pg away from the validated host/database.
	if ([...url.searchParams.keys()].some((key) => !['sslmode', 'connection_limit', 'pool_timeout'].includes(key))) throw new Error('Unsupported database connection parameters');
	return value;
}

export async function resetEnTables(prisma: PrismaClient) {
	assertTestDatabase(process.env.DATABASE_URL);
	// Model names come from the generated schema, never from user input.
	const tables = Prisma.dmmf.datamodel.models.filter((model) => model.name.startsWith('En')).map((model) => Prisma.raw('"' + model.name + '"'));
	await prisma.$executeRaw(Prisma.sql`TRUNCATE TABLE ${Prisma.join(tables)} RESTART IDENTITY CASCADE`);
}
