'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, LogOut, Search, Server } from 'lucide-react';
import { apiPath, iconFallback, inviteUrl, type DashboardGuild } from '@/lib/api';
import { useAuth } from '@/lib/hooks';
import { ErrorBox, LoadingScreen } from '@/components/DashboardShell';

type Filter = 'all' | 'added' | 'missing';

export default function ServersPage() {
	const { auth, loading, error } = useAuth();
	const [query, setQuery] = useState('');
	const [filter, setFilter] = useState<Filter>('all');

	const guilds = useMemo(() => {
		const source = auth?.guilds ?? [];
		return source.filter((guild) => {
			const matches = guild.name.toLowerCase().includes(query.toLowerCase());
			const filtered =
				filter === 'all' ||
				(filter === 'added' && guild.botInGuild) ||
				(filter === 'missing' && !guild.botInGuild);
			return matches && filtered;
		});
	}, [auth, query, filter]);

	async function logout() {
		await fetch(apiPath('/auth/logout'), {
			method: 'POST',
			credentials: 'include',
		}).catch(() => undefined);
		window.location.href = '/login';
	}

	async function addBot(guild: DashboardGuild) {
		const response = await fetch(inviteUrl(guild.id), {
			credentials: 'include',
		});
		const payload = (await response.json()) as { url: string };
		window.open(payload.url, '_blank', 'noopener,noreferrer');
	}

	if (loading) {
		return <LoadingScreen text="Loading your servers..." />;
	}

	if (!auth) {
		return <LoadingScreen text="Redirecting to login..." />;
	}

	return (
		<main className="servers-page">
			<div className="servers-brand">
				<div className="brand-mark">
					<Bot size={22} />
				</div>
				<strong>Priyx Dashboard</strong>
			</div>

			<section className="servers-hero">
				<div>
					<h1>Choose Your Server</h1>
					<div className="server-stats">
						<div>
							<strong>{auth.guilds.length}</strong>
							<span>Managed</span>
						</div>
						<div>
							<strong>0</strong>
							<span>Premium</span>
						</div>
					</div>
				</div>

				<div className="profile-card">
					{auth.user.avatarUrl ? (
						<img src={auth.user.avatarUrl} alt="" />
					) : (
						<div className="avatar-fallback large">
							{iconFallback(auth.user.displayName)}
						</div>
					)}
					<h2>{auth.user.displayName}</h2>
					<div className="user-id">{auth.user.id}</div>
					<button onClick={logout} type="button">
						<LogOut size={16} />
						Log out
					</button>
				</div>
			</section>

			{error ? <ErrorBox message={error} /> : null}

			<section className="server-controls">
				<div className="search-input">
					<Search size={18} />
					<input
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search Servers..."
						value={query}
					/>
				</div>
				<div className="segmented">
					<button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')} type="button">
						All Servers
					</button>
					<button className={filter === 'added' ? 'active' : ''} onClick={() => setFilter('added')} type="button">
						Added
					</button>
					<button className={filter === 'missing' ? 'active' : ''} onClick={() => setFilter('missing')} type="button">
						Not Added
					</button>
				</div>
			</section>

			<section className="server-grid">
				{guilds.map((guild) => (
					<article className="server-card" key={guild.id}>
						{guild.iconUrl ? (
							<img src={guild.iconUrl} alt="" />
						) : (
							<div className="guild-icon-fallback">
								<Server size={44} />
								<span>{iconFallback(guild.name)}</span>
							</div>
						)}
						<h3>{guild.name}</h3>
						{guild.botInGuild ? (
							<Link className="server-action primary" href={`/guild/${guild.id}`}>
								Manage
							</Link>
						) : (
							<button className="server-action muted" onClick={() => addBot(guild)} type="button">
								Add Bot
							</button>
						)}
					</article>
				))}
			</section>
		</main>
	);
}
