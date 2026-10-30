export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

/** Main learner navigation. */
export const MAIN_NAV: NavLink[] = [
 { href: '/', label: 'Hôm nay', icon: 'target', shortLabel: 'Hôm nay' },
 { href: '/review', label: 'Ôn tập', icon: 'repeat', shortLabel: 'Ôn tập' },
 { href: '/progress', label: 'Tiến bộ', icon: 'flag', shortLabel: 'Tiến bộ' },
 { href: '/store', label: 'Thư viện', icon: 'auto_stories', shortLabel: 'Thư viện' },
];

export const BOTTOM_NAV = MAIN_NAV;

/** Admin navigation. */
export const ADMIN_NAV: NavLink[] = [
	{ href: '/admin', label: 'Nội dung', icon: 'edit_note', shortLabel: 'Nội dung' },
];

export const ENGLISH_NAV = MAIN_NAV;
export const ENGLISH_ADMIN_NAV = ADMIN_NAV;

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/';
	if (href === '/progress') return pathname === '/progress' || pathname === '/quests' || pathname === '/mistakes';
	if (href === '/review' && pathname.startsWith('/sets/')) return true;
	if (href === '/admin') return pathname === '/admin';
	return pathname === href || pathname.startsWith(`${href}/`);
}
