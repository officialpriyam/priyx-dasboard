import { NextResponse, type NextRequest } from 'next/server';
import {
	requireAdminPermission,
	verifyAdminRequest,
} from '@/lib/adminAuth';
import {
	readDashboardContent,
	writeDashboardContent,
	type DashboardContent,
} from '@/lib/contentStore';

function requireAdmin(request: NextRequest) {
	const admin = verifyAdminRequest(request);
	if (!admin) {
		return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
	}
	return null;
}

export async function GET(request: NextRequest) {
	const rejected = requireAdmin(request);
	if (rejected) {
		return rejected;
	}

	return NextResponse.json({ content: await readDashboardContent() });
}

export async function PATCH(request: NextRequest) {
	if (!requireAdminPermission(request, 'manage_content')) {
		return NextResponse.json({ error: 'Missing manage_content permission.' }, { status: 403 });
	}

	const body = (await request.json().catch(() => ({}))) as {
		content?: Partial<DashboardContent>;
	};
	const current = await readDashboardContent();
	const next: DashboardContent = {
		terms: String(body.content?.terms ?? current.terms),
		privacy: String(body.content?.privacy ?? current.privacy),
		license: String(body.content?.license ?? current.license),
		about: String(body.content?.about ?? current.about),
	};

	return NextResponse.json({ content: await writeDashboardContent(next) });
}
