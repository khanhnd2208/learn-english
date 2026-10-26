import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { resolve } from 'path';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

import { ACTIVITIES } from '../src/lib/english/activities/registry';

expand(config({ path: resolve(process.cwd(), '.env.local') }));
expand(config({ path: resolve(process.cwd(), '.env') }));

const connectionString = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5433/learn_english';
const pool = new Pool({ connectionString });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function seedEnglishActivities() {
	for (const activity of ACTIVITIES) {
		await prisma.enActivityType.upsert({
			where: { key: activity.key },
			create: {
				key: activity.key,
				label: activity.label,
				role: activity.role,
				inPractice: activity.inPractice,
				inTest: activity.inTest,
				enabled: true,
				sortOrder: activity.sortOrder,
			},
			update: { label: activity.label, role: activity.role, sortOrder: activity.sortOrder },
		});
	}

	await prisma.enTestBlueprint.upsert({
		where: { id: 'default' },
		create: {
			id: 'default',
			recognizeKinds: ['meaning_choice', 'listen_choice', 'cloze_choice'],
			recallKinds: ['recall_type', 'listen_type'],
			maxWords: 30,
			reviewWords: 20,
			minGapDays: 1,
		},
		update: {},
	});
}

seedEnglishActivities()
	.then(() => console.log('English activity catalog seeded'))
	.catch((error) => {
		console.error(error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
		await pool.end();
	});
