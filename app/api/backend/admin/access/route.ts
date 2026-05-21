import { NextResponse, type NextRequest } from 'next/server';
import { requireAdminPermission, verifyAdminRequest } from '@/lib/adminAuth';
import {
	createAdminRole,
	createAdminUser,
	deleteAdminRole,
	deleteAdminUser,
	readAdminAccess,
	setAdminUserDisabled,
	updateAdminRole,
} from '@/lib/adminStore';

function unauthorized() {
	return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
}

function forbidden() {
	return NextResponse.json(
		{ error: 'Missing manage_admins permission.' },
		{ status: 403 },
	);
}

export async function GET(request: NextRequest) {
	if (!verifyAdminRequest(request)) {
		return unauthorized();
	}

	return NextResponse.json({ access: await readAdminAccess() });
}

export async function POST(request: NextRequest) {
	if (!requireAdminPermission(request, 'manage_admins')) {
		return forbidden();
	}

	const body = (await request.json().catch(() => ({}))) as {
		type?: string;
		name?: unknown;
		username?: unknown;
		password?: unknown;
		roleId?: unknown;
		permissions?: unknown;
	};

	try {
		if (body.type === 'role') {
			return NextResponse.json({
				access: await createAdminRole({
					name: body.name,
					permissions: body.permissions,
				}),
			});
		}

		if (body.type === 'user') {
			return NextResponse.json({
				access: await createAdminUser({
					username: body.username,
					password: body.password,
					roleId: body.roleId,
				}),
			});
		}

		return NextResponse.json({ error: 'Unknown access type.' }, { status: 400 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Access update failed.' },
			{ status: 400 },
		);
	}
}

export async function PATCH(request: NextRequest) {
	if (!requireAdminPermission(request, 'manage_admins')) {
		return forbidden();
	}

	const body = (await request.json().catch(() => ({}))) as {
		action?: string;
		roleId?: unknown;
		userId?: unknown;
		name?: unknown;
		permissions?: unknown;
		disabled?: unknown;
	};

	try {
		if (body.action === 'update-role') {
			return NextResponse.json({
				access: await updateAdminRole({
					roleId: body.roleId,
					name: body.name,
					permissions: body.permissions,
				}),
			});
		}

		if (body.action === 'delete-role') {
			return NextResponse.json({
				access: await deleteAdminRole(body.roleId),
			});
		}

		if (body.action === 'set-user-disabled') {
			return NextResponse.json({
				access: await setAdminUserDisabled({
					userId: body.userId,
					disabled: body.disabled,
				}),
			});
		}

		if (body.action === 'delete-user') {
			return NextResponse.json({
				access: await deleteAdminUser(body.userId),
			});
		}

		return NextResponse.json({ error: 'Unknown access action.' }, { status: 400 });
	} catch (error) {
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : 'Access update failed.' },
			{ status: 400 },
		);
	}
}
