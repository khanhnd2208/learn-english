'use client';
import { ErrorState } from '@/components/english/ScreenState';
export default function Error({ retry }: { error: Error & { digest?: string }; retry: () => void }) { return <ErrorState retry={retry} />; }
