export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

/** Main learner navigation. */
export const MAIN_NAV: NavLink[] = [
	{ href: '/', label: 'Bộ từ', icon: 'library_books', shortLabel: 'Bộ từ' },
	{ href: '/review', label: 'Tổng hợp', icon: 'history', shortLabel: 'Tổng hợp' },
	{ href: '/mistakes', label: 'Sổ từ sai', icon: 'menu_book', shortLabel: 'Sổ' },
	{ href: '/progress', label: 'Tiến bộ', icon: 'trending_up', shortLabel: 'Tiến bộ' },
];

export const BOTTOM_NAV = MAIN_NAV;

/** Admin navigation. */
export const ADMIN_NAV: NavLink[] = [
	{ href: '/admin', label: 'Nội dung', icon: 'edit_note', shortLabel: 'Nội dung' },
];

export const ENGLISH_NAV = MAIN_NAV;
export const ENGLISH_ADMIN_NAV = ADMIN_NAV;

export function isNavActive(pathname: string, href: string): boolean {
	if (href === '/') return pathname === '/' || pathname.startsWith('/sets/');
	if (href === '/admin') return pathname === '/admin';
	return pathname === href || pathname.startsWith(`${href}/`);
}
