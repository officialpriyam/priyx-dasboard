const defaultApiBase = '/api/priyx';

function publicApiBase(): string {
	const configured = process.env.NEXT_PUBLIC_PRIYX_API_URL?.trim();
	if (!configured) {
		return defaultApiBase;
	}

	if (
		typeof window !== 'undefined' &&
		/^https?:\/\//i.test(configured)
	) {
		try {
			const url = new URL(configured);
			if (url.origin !== window.location.origin) {
				return defaultApiBase;
			}
		} catch {
			return defaultApiBase;
		}
	}

	return configured;
}

export function apiPath(path: string): string {
	return `${publicApiBase().replace(/\/+$/, '')}${
		path.startsWith('/') ? path : `/${path}`
	}`;
}

export interface DashboardUser {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
}

export interface DashboardGuild {
	id: string;
	name: string;
	iconUrl?: string;
	owner: boolean;
	manageable: boolean;
	botInGuild: boolean;
	memberCount?: number;
}

export interface ModuleInfo {
	name: string;
	label: string;
	description: string;
	category: 'configuration' | 'safety' | 'engagement' | 'utility';
	icon: string;
	accent: string;
	enabled: boolean;
	config: Record<string, unknown>;
}

export interface GuildDetails {
	id: string;
	name: string;
	iconUrl?: string;
	memberCount: number;
	ownerId: string;
	channels: Array<{
		id: string;
		name: string;
		type: number;
		parentId: string | null;
		position: number;
	}>;
	categories: Array<{ id: string; name: string; position: number }>;
	roles: Array<{
		id: string;
		name: string;
		color: string;
		position: number;
		managed: boolean;
	}>;
}

export interface AuthPayload {
	user: DashboardUser;
	guilds: DashboardGuild[];
}

export interface GuildPayload {
	guild: GuildDetails;
	modules: ModuleInfo[];
	stats: { members: number; growth: number | null };
	prefix: string;
	notifications: unknown[];
}

export interface MusicTrack {
	index?: number;
	identifier: string | null;
	title: string;
	author: string;
	duration: number;
	durationLabel: string;
	isStream: boolean;
	uri: string | null;
	artworkUrl: string | null;
	requesterId: string | null;
}

export interface MusicPlayerPayload {
	connected: boolean;
	active: boolean;
	autoplay: boolean;
	filter: string;
	suggestions: Array<MusicTrack | null>;
	player: {
		voiceId: string | null;
		textId: string;
		playing: boolean;
		paused: boolean;
		volume: number;
		position: number;
		loop: 'none' | 'track' | 'queue';
		current: MusicTrack | null;
		queue: Array<MusicTrack | null>;
		previous: Array<MusicTrack | null>;
	} | null;
}

export interface MusicSearchPayload {
	type: string;
	playlistName: string | null;
	tracks: Array<MusicTrack | null>;
}

export interface MusicLyricLine {
	timeMs: number | null;
	text: string;
}

export interface MusicLyricsPayload {
	status: 'found' | 'finding' | 'not-found' | 'disabled' | 'no-track';
	provider: string;
	track: MusicTrack | null;
	position?: number;
	lines: MusicLyricLine[];
	synced: boolean;
	message: string | null;
}

export class ApiError extends Error {
	public constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
	}
}

export async function apiFetch<T>(
	path: string,
	options: RequestInit = {},
): Promise<T> {
	const response = await fetch(apiPath(path), {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(options.headers ?? {}),
		},
	});

	if (!response.ok) {
		let message = `Request failed with ${response.status}`;
		try {
			const data = (await response.json()) as { error?: string };
			message = data.error ?? message;
		} catch {
			// Keep the generic message.
		}
		throw new ApiError(message, response.status);
	}

	return (await response.json()) as T;
}

export function loginUrl(redirect = '/servers'): string {
	return `${apiPath('/auth/discord')}?redirect=${encodeURIComponent(redirect)}`;
}

export function inviteUrl(guildId?: string): string {
	return guildId
		? `${apiPath('/invite')}?guild_id=${encodeURIComponent(guildId)}`
		: apiPath('/invite');
}

export function iconFallback(name: string): string {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}
