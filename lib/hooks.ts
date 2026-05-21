'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
	ApiError,
	apiFetch,
	type AuthPayload,
	type GuildPayload,
} from '@/lib/api';

export function useAuth(required = true) {
	const router = useRouter();
	const [auth, setAuth] = useState<AuthPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		apiFetch<AuthPayload>('/auth/me')
			.then((payload) => {
				if (!active) {
					return;
				}
				setAuth(payload);
				setError(null);
			})
			.catch((err: unknown) => {
				if (!active) {
					return;
				}
				if (err instanceof ApiError && err.status === 401) {
					if (required) {
						router.replace('/login');
					}
					setAuth(null);
					return;
				}
				setError(err instanceof Error ? err.message : 'Could not load session.');
			})
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [router, required]);

	return { auth, loading, error };
}

export function useGuild(guildId: string) {
	const router = useRouter();
	const [payload, setPayload] = useState<GuildPayload | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		apiFetch<GuildPayload>(`/guilds/${guildId}`)
			.then((data) => {
				if (!active) {
					return;
				}
				setPayload(data);
				setError(null);
			})
			.catch((err: unknown) => {
				if (!active) {
					return;
				}
				if (err instanceof ApiError && err.status === 401) {
					router.replace('/login');
					return;
				}
				setError(err instanceof Error ? err.message : 'Could not load server.');
			})
			.finally(() => {
				if (active) {
					setLoading(false);
				}
			});

		return () => {
			active = false;
		};
	}, [guildId, router]);

	return { payload, setPayload, loading, error };
}
