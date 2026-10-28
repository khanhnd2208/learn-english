'use client';

import type { ReactNode } from 'react';
import MaterialIcon from '@/components/ui/MaterialIcon';

/** Consistent, announced result panel; each learning mode supplies its own details. */
export default function AnswerFeedback({ correct, children }: { correct: boolean; children: ReactNode }) {
 return <div role="status" className={`space-y-4 rounded-panel border-2 p-4 ${correct ? 'border-success/40 bg-success-subtle' : 'border-error/30 bg-error/5'}`}>
  <p className={`flex items-center gap-2 font-black ${correct ? 'text-success' : 'text-error'}`}><MaterialIcon name={correct ? 'check_circle' : 'cancel'} filled size={22} />{correct ? 'Chính xác' : 'Chưa đúng'}</p>
  {children}
 </div>;
}
