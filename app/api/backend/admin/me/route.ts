import { NextResponse, type NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';

export async function GET(request: NextRequest) {
	const admin = verifyAdminRequest(request);
	if (!admin) {
		return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
	}

	return NextResponse.json({ admin });
}
