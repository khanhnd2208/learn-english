'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { placeHint } from '@/lib/hintPosition';

/**
 * A small ⓘ that opens a one-or-two sentence explanation. Uses the native popover, so it sits in
 * the top layer (never clipped by a card) and closes on Esc or a tap outside without extra code.
 */
export default function InfoHint({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
	const id = useId();
	const buttonRef = useRef<HTMLButtonElement>(null);
	const bubbleRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const bubble = bubbleRef.current;
		const button = buttonRef.current;
		if (!bubble || !button) return;
		const close = () => bubble.hidePopover();
		const onToggle = (event: Event) => {
			if ((event as ToggleEvent).newState !== 'open') {
				window.removeEventListener('scroll', close, true);
				window.removeEventListener('resize', close);
				return;
			}
			const spot = placeHint(button.getBoundingClientRect(), bubble.offsetHeight, { width: window.innerWidth, height: window.innerHeight });
			bubble.style.top = `${spot.top}px`;
			bubble.style.left = `${spot.left}px`;
			bubble.style.width = `${spot.width}px`;
			// A hint pinned to a spot that scrolled away is worse than no hint.
			window.addEventListener('scroll', close, true);
			window.addEventListener('resize', close);
		};
		bubble.addEventListener('toggle', onToggle);
		return () => {
			bubble.removeEventListener('toggle', onToggle);
			window.removeEventListener('scroll', close, true);
			window.removeEventListener('resize', close);
		};
	}, []);

	return <>
		<button
			ref={buttonRef}
			type="button"
			popoverTarget={id}
			aria-label={`Giải thích: ${title}`}
			aria-describedby={id}
			className={`relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-current/40 align-middle font-sans text-xs leading-none font-bold text-muted normal-case tracking-normal hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent after:absolute after:-inset-3 after:content-[''] ${className}`}
		>i</button>
		<div ref={bubbleRef} id={id} popover="auto" role="note" className="fixed inset-auto m-0 rounded-card border-2 border-border bg-surface p-3 text-left font-sans text-sm leading-snug font-normal text-foreground normal-case tracking-normal shadow-overlay">
			<p className="font-bold">{title}</p>
			<div className="mt-1 text-foreground-secondary">{children}</div>
		</div>
	</>;
}
