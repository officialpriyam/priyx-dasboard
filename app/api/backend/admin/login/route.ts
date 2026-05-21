import { NextResponse, type NextRequest } from 'next/server';
import {
	adminCookieName,
	authenticateAdminCredentials,
	createAdminToken,
} from '@/lib/adminAuth';

export async function POST(request: NextRequest) {
	const body = (await request.json().catch(() => ({}))) as {
		username?: string;
		password?: string;
	};

	const admin = await authenticateAdminCredentials(
		String(body.username ?? ''),
		String(body.password ?? ''),
	);

	if (!admin) {
		return NextResponse.json(
			{ error: 'Invalid admin username or password.' },
			{ status: 401 },
		);
	}

	const response = NextResponse.json({
		ok: true,
		admin,
	});
	response.cookies.set(adminCookieName, createAdminToken(admin), {
		httpOnly: true,
		sameSite: 'lax',
		path: '/',
		maxAge: 24 * 60 * 60,
	});
	return response;
}
