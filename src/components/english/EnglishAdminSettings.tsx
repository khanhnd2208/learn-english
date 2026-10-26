'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { englishSend } from '@/components/english/englishApi';

interface ActivityRow {
	key: string;
	label: string;
	role: string;
	inPractice: boolean;
	inTest: boolean;
	enabled: boolean;
}

interface BlueprintRow {
	recognizeKinds: string[];
	recallKinds: string[];
	maxWords: number;
	reviewWords: number;
	minGapDays: number;
}

export default function EnglishAdminSettings({ panel }: { panel: 'activities' | 'blueprint' }) {
	const [activities, setActivities] = useState<ActivityRow[]>([]);
	const [blueprint, setBlueprint] = useState<BlueprintRow | null>(null);
	const [message, setMessage] = useState('');
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let cancelled = false;
		void (async () => {
			try {
				const [activityBody, blueprintBody] = await Promise.all([
					englishSend<{ activities: ActivityRow[] }>('/api/admin/activities', 'GET'),
					englishSend<{ blueprint: BlueprintRow }>('/api/admin/test-blueprint', 'GET'),
				]);
				if (cancelled) return;
				setActivities(activityBody.activities);
				setBlueprint(blueprintBody.blueprint);
			} catch (error) {
				if (!cancelled) setMessage(error instanceof Error ? error.message : 'Không tải được cấu hình');
			}
		})();
		return () => { cancelled = true; };
	}, []);

	async function patchActivity(row: ActivityRow, patch: Partial<ActivityRow>) {
		setBusy(true);
		setMessage('');
		try {
			const saved = await englishSend<{ activity: ActivityRow }>('/api/admin/activities', 'PATCH', { key: row.key, ...patch });
			setActivities((current) => current.map((item) => (item.key === row.key ? saved.activity : item)));
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không lưu được dạng bài');
		} finally {
			setBusy(false);
		}
	}

	async function saveBlueprint() {
		if (!blueprint) return;
		setBusy(true);
		setMessage('');
		try {
			const saved = await englishSend<{ blueprint: BlueprintRow }>('/api/admin/test-blueprint', 'PATCH', blueprint);
			setBlueprint(saved.blueprint);
			setMessage('Đã lưu cấu trúc bài kiểm tra.');
		} catch (error) {
			setMessage(error instanceof Error ? error.message : 'Không lưu được cấu trúc');
		} finally {
			setBusy(false);
		}
	}

	if (panel === 'activities') {
		return (
			<section className="space-y-3">
				{activities.map((activity) => (
					<Card key={activity.key}>
						<CardContent className="space-y-2">
							<p className="font-black">{activity.label}</p>
							<p className="text-xs text-muted">{activity.role}</p>
							<div className="flex flex-wrap gap-3 text-sm">
								<label className="flex items-center gap-2"><input type="checkbox" checked={activity.enabled} disabled={busy} onChange={(event) => void patchActivity(activity, { enabled: event.target.checked })} /> Bật</label>
								<label className="flex items-center gap-2"><input type="checkbox" checked={activity.inPractice} disabled={busy} onChange={(event) => void patchActivity(activity, { inPractice: event.target.checked })} /> Luyện</label>
								<label className="flex items-center gap-2"><input type="checkbox" checked={activity.inTest} disabled={busy} onChange={(event) => void patchActivity(activity, { inTest: event.target.checked })} /> Kiểm tra</label>
							</div>
						</CardContent>
					</Card>
				))}
				{message && <p className="text-sm text-error">{message}</p>}
			</section>
		);
	}

	if (!blueprint) return <p className="text-sm text-muted">{message || 'Đang tải cấu trúc.'}</p>;
	const toggle = (field: 'recognizeKinds' | 'recallKinds', key: string) => {
		setBlueprint((current) => {
			if (!current) return current;
			const has = current[field].includes(key);
			return { ...current, [field]: has ? current[field].filter((item) => item !== key) : [...current[field], key] };
		});
	};
	return (
		<section className="space-y-4">
			<Card>
				<CardContent className="space-y-3">
					<p className="font-black">Nhận ra</p>
					{activities.filter((activity) => activity.role === 'recognize' && activity.inTest && activity.enabled).map((activity) => (
						<label key={activity.key} className="flex items-center gap-2 text-sm">
							<input type="checkbox" checked={blueprint.recognizeKinds.includes(activity.key)} onChange={() => toggle('recognizeKinds', activity.key)} />
							{activity.label}
						</label>
					))}
					<p className="font-black">Tự nhớ</p>
					{activities.filter((activity) => activity.role === 'recall' && activity.inTest && activity.enabled).map((activity) => (
						<label key={activity.key} className="flex items-center gap-2 text-sm">
							<input type="checkbox" checked={blueprint.recallKinds.includes(activity.key)} onChange={() => toggle('recallKinds', activity.key)} />
							{activity.label}
						</label>
					))}
					<label className="block text-sm">Số từ tối đa
						<input type="number" min={1} value={blueprint.maxWords} onChange={(event) => setBlueprint({ ...blueprint, maxWords: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3" />
					</label>
					<label className="block text-sm">Số từ tổng hợp
						<input type="number" min={1} value={blueprint.reviewWords} onChange={(event) => setBlueprint({ ...blueprint, reviewWords: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3" />
					</label>
					<label className="block text-sm">Cách ngày tối thiểu
						<input type="number" min={1} value={blueprint.minGapDays} onChange={(event) => setBlueprint({ ...blueprint, minGapDays: Number(event.target.value) })} className="mt-1 h-10 w-full rounded-control border border-border bg-surface px-3" />
					</label>
					<Button type="button" disabled={busy} onClick={() => void saveBlueprint()}>Lưu cấu trúc</Button>
					{message && <p className="text-sm text-foreground">{message}</p>}
				</CardContent>
			</Card>
		</section>
	);
}
