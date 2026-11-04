interface Props {
  items: Array<{ position: number }>;
  answers: readonly (string | null)[];
  position: number;
  onSelect: (position: number) => void;
  mobile?: boolean;
}

export default function TestQuestionGrid({ items, answers, position, onSelect, mobile = false }: Props) {
  return <div className={`grid gap-2 overflow-y-auto ${mobile ? 'max-h-[60dvh] grid-cols-6' : 'max-h-[calc(100dvh-13rem)] grid-cols-5'}`}>
    {items.map((item, index) => {
      const done = Boolean(answers[index]?.trim());
      return <button key={item.position} type="button" onClick={() => onSelect(index)} aria-label={`Câu ${index + 1}, ${done ? 'đã làm' : 'chưa làm'}`} aria-current={index === position ? 'true' : undefined} className={`min-h-11 rounded-control border text-sm font-bold tabular-nums ${index === position ? 'border-accent ring-2 ring-accent' : 'border-border'} ${done ? 'bg-accent-subtle' : 'bg-surface'}`}>{index + 1}</button>;
    })}
  </div>;
}
