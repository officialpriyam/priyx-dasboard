import { NextResponse } from 'next/server';
import { adminCookieName } from '@/lib/adminAuth';

export async function POST() {
	const response = NextResponse.json({ ok: true });
	response.cookies.set(adminCookieName, '', {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 0,
	});
	return response;
}
