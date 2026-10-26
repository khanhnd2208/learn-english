export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

/** Main learner navigation. */
export const MAIN_NAV: NavLink[] = [
	{ href: '/', label: 'Bộ từ', icon: 'map', shortLabel: 'Bộ từ' },
	{ href: '/review', label: 'Tổng hợp', icon: 'target', shortLabel: 'Tổng hợp' },
	{ href: '/mistakes', label: 'Sổ từ sai', icon: 'auto_stories', shortLabel: 'Sổ' },
	{ href: '/progress', label: 'Nhân vật', icon: 'explore', shortLabel: 'Nhân vật' },
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
