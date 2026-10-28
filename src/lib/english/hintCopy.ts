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
		title: 'Học thêm',
		body: 'Xem thẻ vài từ rồi luyện ngay. Không ảnh hưởng lịch ôn, chọn bộ nào cũng được, bỏ chọn không xoá tiến độ.',
	},
	stages: {
		title: '4 mức nhớ',
		body: `Chưa ôn · Mới học (${EN_LEITNER_INTERVALS[1]} ngày) · Đang nhớ (${EN_LEITNER_INTERVALS[2]}–${EN_LEITNER_INTERVALS[3]} ngày) · Nhớ lâu (${EN_LEITNER_INTERVALS[4]}+ ngày): khoảng cách tới lần ôn sau.`,
	},
	xp: {
		title: 'XP tính thế nào?',
		body: `Ôn hôm nay đúng +${XP.srs} · Học thêm đúng +${XP.review} · Từ lên Nhớ lâu +${XP.longTerm}. Câu sai không mất điểm.`,
	},
	practice: {
		title: 'Luyện tập khác kiểm tra?',
		body: 'Luyện tập không đổi lịch ôn và không tính nhiệm vụ. Bài kiểm tra giấu đáp án đến khi nộp và được tính vào nhiệm vụ ngày.',
	},
} as const;
