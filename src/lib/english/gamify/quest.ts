export interface QuestSnapshot { kind: 'set_mastery' | 'hold_words' | 'clear_mistakes' | 'study_days'; target: number; startDay: string; endDay: string; }
export interface QuestFacts { masteredInSet: number; heldWords: number; mistakeCount: number; studyDays: number; }

export function questProgress(quest: QuestSnapshot, facts: QuestFacts): { current: number; target: number; done: boolean } {
	const current = quest.kind === 'set_mastery' ? facts.masteredInSet
		: quest.kind === 'hold_words' ? facts.heldWords
		: quest.kind === 'clear_mistakes' ? Math.max(0, quest.target - facts.mistakeCount)
				: facts.studyDays;
	return { current: Math.min(quest.target, current), target: quest.target, done: current >= quest.target };
}

export function missionsForSetQuest(mastered: number, target: number, practiced: boolean, mistakeCount: number) {
	return [
		{ key: 'read', label: 'Mở bộ từ và làm quen', done: false },
		{ key: 'practice', label: 'Luyện theo lộ trình', done: practiced },
		{ key: 'test', label: 'Kiểm tra lại vào ngày phù hợp', done: mastered >= target },
		{ key: 'mistakes', label: 'Dọn Sổ từ sai trong bộ', done: mistakeCount === 0 },
	];
}
