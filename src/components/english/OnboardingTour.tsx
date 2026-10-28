'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

const STEPS = [
 { title: 'Chào mừng đến WordQuest', text: 'Chọn một bộ từ trong Thư viện để bắt đầu hành trình của bạn.' },
 { title: 'Ôn luân phiên', text: 'Mỗi ngày, mở trang Hôm nay để gặp lại các từ vào lúc phù hợp.' },
 { title: 'Ôn theo bộ và xem tiến bộ', text: 'Luyện thêm khi bạn muốn và theo dõi những gì mình đã ghi nhớ.' },
];
export default function OnboardingTour({ eligible }: { eligible: boolean }) {
 const [step, setStep] = useState(-1);
 useEffect(() => { if (!eligible) return; const timer = window.setTimeout(() => { if (!localStorage.getItem('wordquest:onboarding:v1')) setStep(0); }, 200); return () => clearTimeout(timer); }, [eligible]);
 function close() { localStorage.setItem('wordquest:onboarding:v1', 'done'); setStep(-1); }
 const current = STEPS[step];
 return <Dialog open={step >= 0} onClose={close} title={current?.title ?? 'WordQuest'}><p className="text-sm text-muted">{current?.text}</p><p className="mt-4 text-xs text-muted">{step + 1} / {STEPS.length}</p><div className="mt-4 flex items-center justify-between gap-3"><Button variant="ghost" onClick={close}>Bỏ qua</Button>{step < STEPS.length - 1 ? <Button onClick={() => setStep(step + 1)}>Tiếp tục</Button> : <Link href="/store" onClick={close} className="inline-flex min-h-11 items-center rounded-control bg-accent px-4 font-bold text-accent-foreground">Khám phá thư viện →</Link>}</div></Dialog>;
}
