import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';
import { APP_MODE_COOKIE, modeOfPath, modeRedirect } from '@/lib/appMode';

const { auth } = NextAuth(authConfig);

export default auth((req) => {
	const { pathname } = req.nextUrl;

	if (pathname === '/login') {
		return req.auth?.user
			? NextResponse.redirect(new URL('/', req.url))
			: NextResponse.next();
	}

	if (pathname.startsWith('/admin') && req.auth?.user?.role !== 'admin') {
		return NextResponse.redirect(new URL(req.auth?.user ? '/' : '/login', req.url));
	}

	if (pathname === '/courses' || pathname.startsWith('/courses/')) {
		return NextResponse.redirect(new URL('/store', req.url));
	}

	const protectedPaths = ['/', '/sets', '/review', '/store', '/subjects', '/tests', '/mistakes', '/progress'];
	const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
	if (isProtected && !req.auth?.user) {
		return NextResponse.redirect(new URL('/login', req.url));
	}

	if (req.auth?.user && (isProtected || pathname.startsWith('/admin'))) {
		const target = modeRedirect(pathname, req.nextUrl.searchParams.get('mode'), req.cookies.get(APP_MODE_COOKIE)?.value);
		const response = target ? NextResponse.redirect(new URL(target, req.url)) : NextResponse.next();
		response.cookies.set(APP_MODE_COOKIE, modeOfPath(target ?? pathname), { path: '/', maxAge: 31536000, sameSite: 'lax', httpOnly: true });
		return response;
	}

	return NextResponse.next();
});

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
