'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { englishSend } from '@/components/english/englishApi';

interface Profile { goal: string; targetCefr: string | null; weeklyDaysGoal: number; avatarKey: string; }
const initial: Profile = { goal: 'communication', targetCefr: null, weeklyDaysGoal: 4, avatarKey: 'default' };
export default function LearnerProfileForm() {
	const [profile, setProfile] = useState(initial);
	const [saved, setSaved] = useState(false);
	useEffect(() => { void englishSend<Profile>('/api/gamify/profile', 'GET').then(setProfile).catch(() => undefined); }, []);
	async function save() { await fetch('/api/gamify/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }); setSaved(true); window.setTimeout(() => setSaved(false), 2000); }
	return <Card><CardContent className="space-y-4"><div><p className="label-caps">Hồ sơ nhân vật</p><p className="mt-1 text-sm text-muted">Mục tiêu giúp cá nhân hoá hành trình; không ảnh hưởng XP.</p></div><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-muted">Mục tiêu<Select value={profile.goal} onChange={(event) => setProfile({ ...profile, goal: event.target.value })}><option value="communication">Giao tiếp</option><option value="work">Công việc</option><option value="travel">Du lịch</option><option value="exam">Thi cử</option><option value="other">Khác</option></Select></label><label className="text-xs font-bold text-muted">CEFR mục tiêu<Select value={profile.targetCefr ?? ''} onChange={(event) => setProfile({ ...profile, targetCefr: event.target.value || null })}><option value="">Chưa chọn</option>{['pre_a1','a1','a2','b1','b2','c1','c2'].map((level) => <option key={level} value={level}>{level.toUpperCase().replace('_', ' ')}</option>)}</Select></label><label className="text-xs font-bold text-muted">Ngày học mỗi tuần<Select value={profile.weeklyDaysGoal} onChange={(event) => setProfile({ ...profile, weeklyDaysGoal: Number(event.target.value) })}>{[2,3,4,5,6,7].map((n) => <option key={n} value={n}>{n} ngày</option>)}</Select></label></div><Button onClick={() => void save()}>{saved ? 'Đã lưu' : 'Lưu hồ sơ'}</Button></CardContent></Card>;
}
