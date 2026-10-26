'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import type { FinishedEnglishTest } from '@/lib/english/testTypes';
import { englishSend } from '@/components/english/englishApi';

export default function EnglishTestResult({ result, onPracticeMistakes }: { result: FinishedEnglishTest; onPracticeMistakes?: () => void }) {
	const [open, setOpen] = useState<string[]>([]);
	const [points, setPoints] = useState<{ totalXp: number; level: number; earned: Array<{ kind: string; amount: number }> } | null>(null);
	const [rewards, setRewards] = useState<Array<{ id: string; title: string; unlockedAt: string | null; claimedAt: string | null }>>([]);
	const missed = result.words.filter((word) => !word.passed);
	useEffect(() => {
		let alive = true;
		void Promise.all([
			englishSend<NonNullable<typeof points>>(`/api/test/${result.attemptId}/xp`, 'GET'),
			englishSend<NonNullable<typeof rewards>>('/api/gamify/reward', 'GET'),
		]).then(([xp, rewardRows]) => { if (alive) { setPoints(xp); setRewards(rewardRows); } }).catch(() => undefined);
		return () => { alive = false; };
	}, [result.attemptId]);
	return <div className="space-y-4">
		<div><h2 className="text-3xl font-black">{result.passedCount}/{result.wordCount} từ đạt</h2>{points && <p className="xp-gain-note mt-2 rounded-card p-3 text-sm font-bold">+{points.earned.reduce((sum, event) => sum + event.amount, 0)} XP ghi nhớ · Cấp {points.level}{points.earned.length > 0 && <span className="mt-1 block text-xs font-normal text-muted">{points.earned.map((event) => `${event.kind === 'first_mastery' ? 'Nắm lần đầu' : event.kind === 'hold_7d' ? 'Giữ vững 7 ngày' : 'Giữ vững 30 ngày'} +${event.amount}`).join(' · ')}</span>}</p>}{rewards.filter((reward) => reward.unlockedAt && !reward.claimedAt).map((reward) => <div key={reward.id} className="reward-unlock-note mt-2 flex flex-wrap items-center justify-between gap-2 rounded-card p-3 text-sm"><span>🎁 Đã mở khoá: <strong>{reward.title}</strong></span><Button variant="secondary" onClick={() => { void fetch(`/api/gamify/reward/${reward.id}`, { method: 'PATCH' }).then(() => setRewards((items) => items.map((item) => item.id === reward.id ? { ...item, claimedAt: new Date().toISOString() } : item))); }}>Đã nhận</Button></div>)}{result.words.some((word) => !word.counted) && <p className="mt-2 text-sm text-warning">“Vừa học” nghĩa là kết quả được lưu nhưng chưa tính Đã nắm. Hãy kiểm tra lại từ ngày mai.</p>}</div>
		<ul className="space-y-2">{result.words.map((word) => {
			const expanded = open.includes(word.senseId);
			const label = word.passed && word.counted ? 'Đạt' : word.passed ? 'Đạt · vừa học' : word.counted ? 'Chưa đạt' : 'Chưa đạt · vừa học';
			return <li key={word.senseId} className="rounded-card border border-border bg-surface p-3">
				<button type="button" className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setOpen((ids) => expanded ? ids.filter((id) => id !== word.senseId) : [...ids, word.senseId])}><span><span className="block font-black">{word.lemma}</span><span className="block text-sm text-muted">{word.meaningVi}</span></span><Badge variant={word.passed && word.counted ? 'success' : word.passed ? 'warning' : 'error'}>{label}</Badge></button>
				{expanded && <ul className="mt-3 space-y-2 border-t border-border pt-3 text-sm">{word.items.map((item) => <li key={item.id} className="rounded-control bg-surface-container p-3"><p className="font-bold">{item.role === 'recognize' ? 'Nhận ra' : 'Tự nhớ'} · {item.correct ? 'Đúng' : 'Sai'}</p><p>Bạn trả lời: <span className="font-bold">{item.answer?.trim() || 'Bỏ trống'}</span></p><p>Đáp án: <span className="font-bold text-success">{item.answerKey}</span></p></li>)}</ul>}
			</li>;
		})}</ul>
		{missed.length > 0 && <div className="flex flex-wrap gap-2">{onPracticeMistakes ? <Button onClick={onPracticeMistakes}>Luyện các từ sai</Button> : <Link href="/mistakes"><Button>Luyện các từ sai</Button></Link>}<Link href="/mistakes"><Button variant="secondary">Xem Sổ từ sai</Button></Link></div>}
	</div>;
}
