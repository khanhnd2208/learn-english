export interface NavLink {
	href: string;
	label: string;
	/** Material Symbols name. */
	icon: string;
	shortLabel?: string;
}

/** Main learner navigation. */
export const MAIN_NAV: NavLink[] = [
 { href: '/', label: 'Hôm nay', icon: 'today', shortLabel: 'Hôm nay' },
 { href: '/review', label: 'Ôn theo bộ', icon: 'style', shortLabel: 'Ôn theo bộ' },
 { href: '/progress', label: 'Tiến bộ', icon: 'insights', shortLabel: 'Tiến bộ' },
 { href: '/store', label: 'Cửa hàng', icon: 'storefront', shortLabel: 'Cửa hàng' },
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
	if (href === '/store' && pathname.startsWith('/subjects/')) return true;
	if (href === '/admin') return pathname === '/admin';
	return pathname === href || pathname.startsWith(`${href}/`);
}
