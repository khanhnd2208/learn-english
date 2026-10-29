import { EN_LEITNER_INTERVALS } from '@/lib/english/constants';
import { XP } from '@/lib/english/xp';

const ladder = EN_LEITNER_INTERVALS.filter((days) => days > 0).join(' → ');

/** Short explanations shown behind an ⓘ, so screens can stay one line long. */
export const HINTS = {
	srs: {
		title: 'Vì sao những từ này?',
		body: `App hỏi lại mỗi từ đúng lúc bạn sắp quên. Đúng thì từ được hẹn xa hơn (${ladder} ngày), sai thì gặp lại sớm.`,
	},
	newWords: {
		title: 'Từ mới',
		body: `Lần đầu gặp, cứ đoán thử. Sai là bình thường, bạn sẽ gặp lại sau ${EN_LEITNER_INTERVALS[1]} ngày.`,
	},
	guided: {
		title: 'Ôn theo bộ',
		body: 'Mỗi chặng lấy ngẫu nhiên 5 từ trong các bộ đã chọn, ưu tiên từ bạn hay sai ở Ôn luân phiên. Không ảnh hưởng lịch ôn; thoát giữa chừng thì lần sau bắt đầu lại từ đầu.',
	},
	stages: {
		title: '4 mức nhớ',
		body: `Chưa ôn · Mới học (${EN_LEITNER_INTERVALS[1]} ngày) · Đang nhớ (${EN_LEITNER_INTERVALS[2]}–${EN_LEITNER_INTERVALS[3]} ngày) · Nhớ lâu (${EN_LEITNER_INTERVALS[4]}+ ngày): khoảng cách tới lần ôn sau.`,
	},
	xp: {
		title: 'XP tính thế nào?',
		body: `Ôn luân phiên: mỗi từ đến hạn đúng +${XP.srs}, từ lên Nhớ lâu +${XP.longTerm}. Ôn theo bộ: mỗi câu đúng +${XP.review} (tối đa ${XP.reviewDailyCap} XP/ngày). Mỗi nhiệm vụ ngày +${XP.dailyQuest}, đạt mục tiêu ngày +${XP.dailyGoal}, rương tuần +${XP.weeklyChest}. Câu sai không bị trừ XP.`,
	},
} as const;
