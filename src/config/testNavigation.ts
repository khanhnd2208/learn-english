import type { NavLink } from '@/config/navigation';

/** Learner navigation of the Kiểm tra area. */
export const TEST_NAV: NavLink[] = [
	{ href: '/tests', label: 'Khóa học', icon: 'school', shortLabel: 'Khóa học' },
	{ href: '/tests/papers', label: 'Bài kiểm tra', icon: 'quiz', shortLabel: 'Bài kiểm tra' },
	{ href: '/tests/results', label: 'Kết quả', icon: 'emoji_events', shortLabel: 'Kết quả' },
];

/** Admin navigation of the Kiểm tra area. */
export const TEST_ADMIN_NAV: NavLink[] = [
	{ href: '/admin/tests', label: 'Khóa học', icon: 'school', shortLabel: 'Khóa học' },
	{ href: '/admin/tests/papers', label: 'Bài kiểm tra', icon: 'quiz', shortLabel: 'Bài kiểm tra' },
];

export function isTestNavActive(pathname: string, href: string): boolean {
	if (href === '/tests') return pathname === '/tests' || pathname.startsWith('/tests/subjects/');
	if (href === '/tests/results') return pathname === '/tests/results' || pathname.startsWith('/tests/results/');
	return pathname === href;
}
