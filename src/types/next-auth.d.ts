import type { DefaultSession } from 'next-auth';

export type UserRole = 'admin' | 'teacher' | 'student';

declare module 'next-auth' {
	interface User {
		role?: UserRole;
	}

	interface Session {
		user: {
			id: string;
			role: UserRole;
		} & DefaultSession['user'];
	}
}

declare module 'next-auth/jwt' {
	interface JWT {
		role?: UserRole;
	}
}
