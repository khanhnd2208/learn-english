export type AppMode = 'vocab' | 'test';
export const APP_MODE_COOKIE = 'wq_mode';

export function modeOfPath(pathname: string): AppMode {
	return /^\/(admin\/)?tests(\/|$)/.test(pathname) ? 'test' : 'vocab';
}

/** Where `/` should send the visitor, or null to stay. */
export function modeRedirect(pathname: string, modeParam: string | null, cookie: string | undefined): string | null {
	if (pathname !== '/') return null;
	if (modeParam === 'vocab') return '/';
	if (modeParam === null && cookie === 'test') return '/tests';
	return null;
}
