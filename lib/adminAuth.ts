import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import {
	allAdminPermissions,
	authenticateStoredAdmin,
	hasPermission,
	type AdminPermission,
	type AdminSession,
} from '@/lib/adminStore';

export const adminCookieName = 'priyx_admin_session';

function secret(): string {
	return (
		process.env.PRIYX_ADMIN_SESSION_SECRET ||
		process.env.PRIYX_API_KEY ||
		'priyx-dashboard-dev-secret'
	);
}

function sign(payload: string): string {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	return (
		leftBuffer.length === rightBuffer.length &&
		timingSafeEqual(leftBuffer, rightBuffer)
	);
}

export function adminUsername(): string {
	return process.env.PRIYX_ADMIN_USERNAME || 'admin';
}

export async function authenticateAdminCredentials(
	username: string,
	password: string,
): Promise<AdminSession | null> {
	const expectedUsername = adminUsername();
	const expectedPassword = process.env.PRIYX_ADMIN_PASSWORD || '';
	const isRoot =
		safeEqual(username, expectedUsername) &&
		expectedPassword.length > 0 &&
		safeEqual(password, expectedPassword);
	if (isRoot) {
		return {
			username: expectedUsername,
			roleName: 'Main Admin',
			permissions: allAdminPermissions(),
			root: true,
		};
	}

	return authenticateStoredAdmin(username, password);
}

export function createAdminToken(admin: AdminSession): string {
	const payload = Buffer.from(
		JSON.stringify({
			username: admin.username,
			roleName: admin.roleName,
			permissions: admin.permissions,
			root: admin.root,
			exp: Date.now() + 24 * 60 * 60 * 1000,
		}),
	).toString('base64url');
	return `${payload}.${sign(payload)}`;
}

export function verifyAdminToken(token?: string): AdminSession | null {
	if (!token) {
		return null;
	}

	const [payload, signature] = token.split('.');
	if (!payload || !signature || !safeEqual(signature, sign(payload))) {
		return null;
	}

	try {
		const parsed = JSON.parse(
			Buffer.from(payload, 'base64url').toString('utf8'),
		) as {
			username?: string;
			roleName?: string;
			permissions?: unknown;
			root?: boolean;
			exp?: number;
		};
		if (
			typeof parsed.username !== 'string' ||
			typeof parsed.exp !== 'number' ||
			parsed.exp < Date.now()
		) {
			return null;
		}

		const permissions = Array.isArray(parsed.permissions)
			? parsed.permissions.filter((permission): permission is AdminPermission =>
					allAdminPermissions().includes(permission as AdminPermission),
				)
			: [];
		return {
			username: parsed.username,
			roleName: parsed.roleName ?? 'Admin',
			permissions,
			root: Boolean(parsed.root),
		};
	} catch {
		return null;
	}
}

export function verifyAdminRequest(request: NextRequest): AdminSession | null {
	return verifyAdminToken(request.cookies.get(adminCookieName)?.value);
}

export function requireAdminPermission(
	request: NextRequest,
	permission: AdminPermission,
): AdminSession | null {
	const admin = verifyAdminRequest(request);
	if (!admin || !hasPermission(admin, permission)) {
		return null;
	}

	return admin;
}
