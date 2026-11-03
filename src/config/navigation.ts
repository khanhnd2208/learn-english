export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

/** Main learner navigation. */
export const MAIN_NAV: NavLink[] = [
 { href: '/', label: 'Hôm nay', icon: 'target', shortLabel: 'Hôm nay' },
 { href: '/review', label: 'Ôn theo bộ', icon: 'repeat', shortLabel: 'Ôn theo bộ' },
 { href: '/progress', label: 'Tiến bộ', icon: 'flag', shortLabel: 'Tiến bộ' },
 { href: '/store', label: 'Cửa hàng', icon: 'auto_stories', shortLabel: 'Cửa hàng' },
];

export const BOTTOM_NAV = MAIN_NAV;

/** Admin navigation. */
export const ADMIN_NAV: NavLink[] = [
	{ href: '/admin', label: 'Nội dung', icon: 'edit_note', shortLabel: 'Nội dung' },
];

/** Test mode navigation. */
export const TEST_NAV: NavLink[] = [
	{ href: '/tests', label: 'Môn học', icon: 'auto_stories', shortLabel: 'Môn học' },
	{ href: '/tests/results', label: 'Kết quả', icon: 'flag', shortLabel: 'Kết quả' },
];
export const TEST_ADMIN_NAV: NavLink[] = [
	{ href: '/admin/tests', label: 'Bài kiểm tra', icon: 'edit_note', shortLabel: 'Bài kiểm tra' },
];

export const ENGLISH_NAV = MAIN_NAV;
export const ENGLISH_ADMIN_NAV = ADMIN_NAV;

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	if (href === '/progress') return pathname === '/progress' || pathname === '/quests' || pathname === '/mistakes';
	if (href === '/review' && pathname.startsWith('/sets/')) return true;
	if (href === '/store' && pathname.startsWith('/subjects/')) return true;
	if (href === '/tests') return pathname === '/tests' || pathname.startsWith('/tests/subjects/');
	if (href === '/admin/tests') return pathname === '/admin/tests';
	if (href === '/admin') return pathname === '/admin';
	return pathname === href || pathname.startsWith(`${href}/`);
}
