import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/lib/auth.config';

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

	const protectedPaths = ['/', '/sets', '/review', '/mistakes', '/progress'];
	const isProtected = protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
	if (isProtected && !req.auth?.user) {
		return NextResponse.redirect(new URL('/login', req.url));
	}

	return NextResponse.next();
});

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
