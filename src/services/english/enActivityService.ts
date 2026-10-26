import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/appError';
import { ACTIVITIES, activityByKey, isActivityKey, type ActivityKey } from '@/lib/english/activities';

export interface ActivityRow {
	key: string;
	label: string;
	role: string;
	inPractice: boolean;
	inTest: boolean;
	enabled: boolean;
	sortOrder: number;
}

export interface BlueprintRow {
	id: string;
	recognizeKinds: string[];
	recallKinds: string[];
	maxWords: number;
	reviewWords: number;
	minGapDays: number;
}

const DEFAULT_BLUEPRINT = {
	recognizeKinds: ['meaning_choice', 'listen_choice', 'cloze_choice'],
	recallKinds: ['recall_type', 'listen_type'],
	maxWords: 30,
	reviewWords: 20,
	minGapDays: 1,
};

export async function ensureEnglishActivityCatalog(): Promise<void> {
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
			update: {
				label: activity.label,
				role: activity.role,
				sortOrder: activity.sortOrder,
			},
		});
	}
	await prisma.enTestBlueprint.upsert({
		where: { id: 'default' },
		create: { id: 'default', ...DEFAULT_BLUEPRINT },
		update: {},
	});
}

export async function listEnglishActivities(): Promise<ActivityRow[]> {
	await ensureEnglishActivityCatalog();
	const rows = await prisma.enActivityType.findMany({ orderBy: { sortOrder: 'asc' } });
	return rows.map((row) => ({
		key: row.key,
		label: row.label,
		role: row.role,
		inPractice: row.inPractice,
		inTest: row.inTest,
		enabled: row.enabled,
		sortOrder: row.sortOrder,
	}));
}

export async function updateEnglishActivity(input: {
	key: string;
	inPractice?: boolean;
	inTest?: boolean;
	enabled?: boolean;
}): Promise<ActivityRow> {
	if (!isActivityKey(input.key)) throw new AppError('Dạng bài không có trong hệ thống', 400);
	await ensureEnglishActivityCatalog();
	const row = await prisma.enActivityType.update({
		where: { key: input.key },
		data: {
			...(input.inPractice !== undefined ? { inPractice: input.inPractice } : {}),
			...(input.inTest !== undefined ? { inTest: input.inTest } : {}),
			...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
		},
	});
	return {
		key: row.key,
		label: row.label,
		role: row.role,
		inPractice: row.inPractice,
		inTest: row.inTest,
		enabled: row.enabled,
		sortOrder: row.sortOrder,
	};
}

export function blueprintError(blueprint: BlueprintRow, activities: ActivityRow[]): string | null {
	if (blueprint.minGapDays < 1) return 'Khoảng cách ngày phải ít nhất là 1.';
	if (blueprint.maxWords < 1 || blueprint.reviewWords < 1) return 'Số từ trong bài phải ít nhất là 1.';
	const check = (keys: string[], role: 'recognize' | 'recall') => {
		if (keys.length < 1) return `Cần ít nhất một dạng ${role === 'recognize' ? 'nhận ra' : 'tự nhớ'}.`;
		for (const key of keys) {
			const activity = activities.find((item) => item.key === key);
			const code = activityByKey(key);
			if (!activity || !code || !activity.enabled || !activity.inTest || activity.role !== role || code.role !== role) {
				return `Dạng "${key}" không được dùng cho vai ${role}.`;
			}
		}
		return null;
	};
	return check(blueprint.recognizeKinds, 'recognize') ?? check(blueprint.recallKinds, 'recall');
}

export async function getEnglishBlueprint(): Promise<BlueprintRow> {
	await ensureEnglishActivityCatalog();
	const row = await prisma.enTestBlueprint.findUnique({ where: { id: 'default' } });
	if (!row) throw new AppError('Chưa có cấu trúc bài kiểm tra', 500);
	return {
		id: row.id,
		recognizeKinds: row.recognizeKinds,
		recallKinds: row.recallKinds,
		maxWords: row.maxWords,
		reviewWords: row.reviewWords,
		minGapDays: row.minGapDays,
	};
}

export async function updateEnglishBlueprint(input: Omit<BlueprintRow, 'id'>): Promise<BlueprintRow> {
	const activities = await listEnglishActivities();
	const next = { id: 'default', ...input };
	const error = blueprintError(next, activities);
	if (error) throw new AppError(error, 400);
	const row = await prisma.enTestBlueprint.update({
		where: { id: 'default' },
		data: {
			recognizeKinds: input.recognizeKinds,
			recallKinds: input.recallKinds,
			maxWords: input.maxWords,
			reviewWords: input.reviewWords,
			minGapDays: input.minGapDays,
		},
	});
	return {
		id: row.id,
		recognizeKinds: row.recognizeKinds,
		recallKinds: row.recallKinds,
		maxWords: row.maxWords,
		reviewWords: row.reviewWords,
		minGapDays: row.minGapDays,
	};
}

export function usableKinds(keys: string[], activities: ActivityRow[], role: 'recognize' | 'recall'): ActivityKey[] {
	return keys.filter((key): key is ActivityKey => {
		const activity = activities.find((item) => item.key === key);
		return Boolean(activity && isActivityKey(key) && activity.enabled && activity.inTest && activity.role === role);
	});
}
