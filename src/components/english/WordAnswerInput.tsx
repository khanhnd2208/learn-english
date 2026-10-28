'use client';

import { useId, useRef, useState, type ChangeEvent, type ClipboardEvent, type KeyboardEvent } from 'react';
import { answerLetters, completeAnswer, isAnswerComplete, type AnswerLayout } from '@/lib/english/answerLayout';

type Props = { layout?: AnswerLayout; value: string; onChange: (value: string) => void; disabled?: boolean; firstLetter?: string; inputRef?: (node: HTMLInputElement | null) => void; autoFocus?: boolean; freeText?: boolean };
export default function WordAnswerInput({ layout, value, onChange, disabled, firstLetter, inputRef, autoFocus, freeText }: Props) {
 if (freeText) return <input ref={inputRef} autoFocus={autoFocus} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} aria-label="Gõ từ tiếng Anh" className="w-full rounded-panel border-2 border-border bg-background p-3 text-center text-lg focus:border-accent" />;
 if (!layout) return null;
 return <SlottedInput layout={layout} value={value} onChange={onChange} disabled={disabled} firstLetter={firstLetter} inputRef={inputRef} autoFocus={autoFocus} />;
}
function SlottedInput({ layout, value, onChange, disabled = false, firstLetter, inputRef, autoFocus = false }: Props & { layout: AnswerLayout }) {
	const ownRef = useRef<HTMLInputElement | null>(null);
	const [message, setMessage] = useState('');
	const [cursor, setCursor] = useState(0);
	const [focused, setFocused] = useState(false);
	const id = useId();
	const letters = [...value];
	const complete = isAnswerComplete(layout, value);
	const groups: Array<Array<{ slot: AnswerLayout['slots'][number]; index: number }>> = [[]];
	layout.slots.forEach((slot, index) => {
		if (slot.kind === 'fixed' && slot.value === ' ') groups.push([]);
		else groups[groups.length - 1]!.push({ slot, index });
	});

	function assignRef(node: HTMLInputElement | null) {
		ownRef.current = node;
		inputRef?.(node);
	}

	function update(raw: string, cursor: number) {
		const next = answerLetters(raw);
		if ([...next].length > layout.letterCount) {
			setMessage(`Chỉ có ${layout.letterCount} ô chữ. Hãy kiểm tra nội dung vừa nhập.`);
			return;
		}
		onChange(next);
		setMessage('');
		const nextCursor = [...answerLetters(raw.slice(0, cursor))].length;
		requestAnimationFrame(() => { ownRef.current?.setSelectionRange(nextCursor, nextCursor); setCursor(nextCursor); });
	}

	function change(event: ChangeEvent<HTMLInputElement>) {
		if ((event.nativeEvent as InputEvent).isComposing) return;
		update(event.target.value, event.target.selectionStart ?? event.target.value.length);
	}

	function paste(event: ClipboardEvent<HTMLInputElement>) {
		event.preventDefault();
		const input = ownRef.current;
		if (!input) return;
		const start = input.selectionStart ?? value.length;
		const end = input.selectionEnd ?? start;
		const inserted = answerLetters(event.clipboardData.getData('text'));
		const raw = value.slice(0, start) + inserted + value.slice(end);
		update(raw, start + inserted.length);
	}

	function keyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing && event.key === 'Enter') event.preventDefault();
		if (!event.nativeEvent.isComposing && event.key.length === 1 && /[\p{L}\p{M}\p{N}]/u.test(event.key) && complete) {
			const input = ownRef.current;
			if (input && input.selectionStart === input.selectionEnd && input.selectionStart !== null && input.selectionStart < value.length) {
				input.setSelectionRange(input.selectionStart, input.selectionStart + 1);
			}
		}
		if (event.key === 'Enter' && !event.nativeEvent.isComposing && !complete) {
			event.preventDefault();
			const firstEmpty = [...value].length;
			ownRef.current?.setSelectionRange(firstEmpty, firstEmpty);
			setCursor(firstEmpty);
			setMessage('Điền đủ các ô rồi kiểm tra.');
		}
		if (event.key === 'Home') { event.preventDefault(); ownRef.current?.setSelectionRange(0, 0); }
		if (event.key === 'End') { event.preventDefault(); ownRef.current?.setSelectionRange(value.length, value.length); }
	}

	let letterIndex = 0;
	return <div className="space-y-2">
		<div className={`relative rounded-panel border-2 bg-background p-3 focus-within:border-accent ${disabled ? 'border-border opacity-65' : 'border-border'}`} onClick={(event) => {
			if (disabled) return;
			const target = event.target as HTMLElement;
			const slot = target.closest<HTMLElement>('[data-letter-index]');
			const index = slot ? Number(slot.dataset.letterIndex) : value.length;
			ownRef.current?.focus();
			ownRef.current?.setSelectionRange(index, letters[index] ? index + 1 : index);
			setCursor(index);
		}}>
			<input
				ref={assignRef} autoFocus={autoFocus} value={value} onChange={change} onCompositionEnd={(event) => update(event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)} onPaste={paste} onKeyDown={keyDown} onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? 0)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
				readOnly={disabled} aria-disabled={disabled} aria-label={`Gõ từ tiếng Anh, ${layout.letterCount} chữ cái`} aria-describedby={`${id}-help ${id}-message`} aria-invalid={Boolean(message)}
				autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="done"
				className="pointer-events-none absolute h-px w-px opacity-0"
			/>
			<div aria-hidden="true" className="flex flex-wrap justify-center gap-x-3 gap-y-2">
				{groups.map((group, groupIndex) => <span key={groupIndex} className="flex max-w-full flex-wrap justify-center gap-1">
					{group.map(({ slot, index }) => {
						if (slot.kind === 'fixed') return <span key={index} className="flex h-10 w-3 items-center justify-center text-lg font-bold">{slot.value}</span>;
						const at = letterIndex++;
						return <span key={index} data-letter-index={at} className={`flex size-10 shrink-0 items-center justify-center rounded-md border-2 text-lg font-bold uppercase ${focused && !disabled && cursor === at ? 'border-accent bg-accent-subtle ring-2 ring-accent/30' : letters[at] ? 'border-accent/60 bg-accent-subtle text-foreground' : 'border-border bg-surface text-muted'}`}>
							{letters[at] ?? (at === 0 && firstLetter ? <span className="opacity-50">{firstLetter}</span> : '')}
						</span>;
					})}
				</span>)}
			</div>
		</div>
		<p id={`${id}-help`} className="text-center text-xs text-muted">{letters.length}/{layout.letterCount} chữ · Dấu cách và dấu câu đã có sẵn.</p>
		<p id={`${id}-message`} role="status" className="min-h-5 text-center text-sm text-warning">{message || (!complete && letters.length > 0 ? 'Điền đủ các ô rồi kiểm tra.' : '')}</p>
	</div>;
}

export { completeAnswer, isAnswerComplete };
