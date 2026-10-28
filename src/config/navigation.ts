export interface NavLink {
	href: string;
	label: string;
	icon: string;
	shortLabel?: string;
}

/** Main learner navigation. */
export const MAIN_NAV: NavLink[] = [
	{ href: '/', label: 'Tổng quan', icon: 'target', shortLabel: 'Tổng quan' },
	{ href: '/review', label: 'Học thêm', icon: 'explore', shortLabel: 'Học thêm' },
	{ href: '/quests', label: 'Nhiệm vụ', icon: 'flag', shortLabel: 'Nhiệm vụ' },
	{ href: '/store', label: 'Cửa hàng', icon: 'map', shortLabel: 'Cửa hàng' },
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
