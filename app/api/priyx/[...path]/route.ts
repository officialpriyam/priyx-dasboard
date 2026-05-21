import type { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/adminAuth';
import { hasPermission } from '@/lib/adminStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function apiBaseUrl(): string {
	return (process.env.PRIYX_API_URL ?? 'http://localhost:8787/api').replace(
		/\/+$/,
		'',
	);
}

function apiKey(): string {
	return process.env.PRIYX_API_KEY ?? '';
}

function discordClientId(): string {
	return process.env.PRIYX_DISCORD_CLIENT_ID ?? '';
}

function discordClientSecret(): string {
	return process.env.PRIYX_DISCORD_CLIENT_SECRET ?? '';
}

function targetUrl(request: NextRequest): string {
	const suffix = request.nextUrl.pathname
		.replace(/^\/api\/priyx\/?/, '')
		.replace(/^\/+/, '');
	const url = new URL(`${apiBaseUrl()}/${suffix}`);
	url.search = request.nextUrl.search;
	return url.toString();
}

async function proxy(request: NextRequest): Promise<Response> {
	const suffix = request.nextUrl.pathname
		.replace(/^\/api\/priyx\/?/, '')
		.replace(/^\/+/, '');
	if (suffix.startsWith('admin')) {
		const admin = verifyAdminRequest(request);
		if (!admin) {
			return Response.json({ error: 'Admin login required.' }, { status: 401 });
		}
		const canReadAdminStatus =
			hasPermission(admin, 'view_status') ||
			hasPermission(admin, 'view_servers') ||
			hasPermission(admin, 'manage_dashboard_users');
		if (suffix.startsWith('admin/status') && !canReadAdminStatus) {
			return Response.json(
				{ error: 'Missing admin status permission.' },
				{ status: 403 },
			);
		}
		if (
			suffix.startsWith('admin/users') &&
			!hasPermission(admin, 'manage_dashboard_users')
		) {
			return Response.json(
				{ error: 'Missing manage_dashboard_users permission.' },
				{ status: 403 },
			);
		}
	}

	const headers = new Headers();
	const contentType = request.headers.get('content-type');
	const cookie = request.headers.get('cookie');
	const key = apiKey();
	const oauthClientId = discordClientId();
	const oauthClientSecret = discordClientSecret();

	if (contentType) {
		headers.set('content-type', contentType);
	}
	if (cookie) {
		headers.set('cookie', cookie);
	}
	if (key) {
		headers.set('x-priyx-api-key', key);
	}
	if (oauthClientId) {
		headers.set('x-priyx-discord-client-id', oauthClientId);
	}
	if (oauthClientSecret) {
		headers.set('x-priyx-discord-client-secret', oauthClientSecret);
	}

	const body =
		request.method === 'GET' || request.method === 'HEAD'
			? undefined
			: await request.arrayBuffer();

	const response = await fetch(targetUrl(request), {
		method: request.method,
		headers,
		body,
		redirect: 'manual',
		cache: 'no-store',
	});

	const responseHeaders = new Headers();
	for (const header of ['content-type', 'set-cookie', 'location']) {
		const value = response.headers.get(header);
		if (value) {
			responseHeaders.set(header, value);
		}
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
}

export const GET = proxy;
export const POST = proxy;
export const PATCH = proxy;
export const OPTIONS = proxy;
