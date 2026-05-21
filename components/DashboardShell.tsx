'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
	BarChart3,
	Bell,
	Bot,
	Box,
	Crown,
	FileText,
	Grid2X2,
	Home,
	Lock,
	LogOut,
	MessageSquare,
	Search,
	Server,
	Shield,
	SlidersHorizontal,
	Tags,
	Users,
} from 'lucide-react';
import type { DashboardUser, GuildDetails } from '@/lib/api';
import { apiBase, iconFallback } from '@/lib/api';

const primaryLinks = [
	{ href: '', label: 'Dashboard', icon: Home },
	{ href: '/modules', label: 'Modules', icon: Grid2X2 },
	{ href: '/permissions', label: 'Permissions', icon: Users },
	{ href: '/tags', label: 'Tags & Triggers', icon: Tags },
	{ href: '/suggestions', label: 'Suggestions', icon: MessageSquare },
	{ href: '/module/embed-builder', label: 'Embed Builder', icon: Box },
];

const safetyLinks = [
	{ href: '/modules?category=safety', label: 'AutoMod', icon: Shield },
	{ href: '/audit-logs', label: 'Logging', icon: BarChart3 },
	{ href: '/moderation', label: 'Moderation', icon: Lock },
];

const engagementLinks = [
	{ href: '/module/welcomer', label: 'Welcome', icon: Bell },
	{ href: '/module/tempvoice', label: 'Voice Rooms', icon: Server },
];

export function DashboardShell({
	children,
	user,
	guild,
}: {
	children: React.ReactNode;
	user: DashboardUser;
	guild: GuildDetails;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const base = `/guild/${guild.id}`;

	async function logout() {
		await fetch(`${apiBase}/auth/logout`, {
			method: 'POST',
			credentials: 'include',
		}).catch(() => undefined);
		router.replace('/login');
	}

	function renderLinks(
		links: Array<{
			href: string;
			label: string;
			icon: typeof Home;
		}>,
	) {
		return links.map((item) => {
			const Icon = item.icon;
			const href = `${base}${item.href}`;
			const active =
				item.href === ''
					? pathname === base
					: pathname.startsWith(href.split('?')[0]);
			return (
				<Link className={`nav-link ${active ? 'active' : ''}`} href={href} key={item.label}>
					<Icon size={18} />
					<span>{item.label}</span>
				</Link>
			);
		});
	}

	return (
		<div className="app-shell">
			<aside className="sidebar">
				<div className="brand">
					<div className="brand-mark">
						<Bot size={24} />
					</div>
					<div className="brand-name">Priyx Dashboard</div>
					<span className="beta">beta</span>
				</div>

				<Link className="server-switch" href="/servers">
					{guild.iconUrl ? (
						<img src={guild.iconUrl} alt="" />
					) : (
						<div className="avatar-fallback small">{iconFallback(guild.name)}</div>
					)}
					<strong>{guild.name}</strong>
					<span>Switch</span>
				</Link>

				<nav className="nav-block">{renderLinks(primaryLinks)}</nav>

				<div className="nav-title">Safety</div>
				<nav className="nav-block">{renderLinks(safetyLinks)}</nav>

				<div className="nav-title">Engagement</div>
				<nav className="nav-block">{renderLinks(engagementLinks)}</nav>

				<div className="sidebar-footer">
					<div className="plan-pill">
						<Crown size={15} />
						<span>Free Plan</span>
						<a>Upgrade</a>
					</div>
					<div className="account">
						{user.avatarUrl ? (
							<img src={user.avatarUrl} alt="" />
						) : (
							<div className="avatar-fallback small">{iconFallback(user.displayName)}</div>
						)}
						<div>
							<strong>{user.displayName}</strong>
							<span>Manage Account</span>
						</div>
						<button onClick={logout} title="Log out" type="button">
							<LogOut size={16} />
						</button>
					</div>
				</div>
			</aside>

			<main className="main">
				<header className="topbar">
					<div className="command-search">
						<Search size={18} />
						<span>Search pages, actions...</span>
						<kbd>CTRL K</kbd>
					</div>
					<button className="icon-button" type="button">
						<Bell size={20} />
					</button>
				</header>
				{children}
			</main>
		</div>
	);
}

export function PageTitle({
	title,
	subtitle,
	action,
}: {
	title: string;
	subtitle: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="page-title">
			<div>
				<h1>{title}</h1>
				<p>{subtitle}</p>
			</div>
			{action}
		</div>
	);
}

export function EmptyState({
	icon,
	title,
	text,
	action,
}: {
	icon?: React.ReactNode;
	title: string;
	text: string;
	action?: React.ReactNode;
}) {
	return (
		<div className="empty-state">
			<div className="empty-icon">{icon ?? <FileText size={36} />}</div>
			<h2>{title}</h2>
			<p>{text}</p>
			{action}
		</div>
	);
}

export function LoadingScreen({ text = 'Loading dashboard...' }: { text?: string }) {
	return (
		<div className="center-screen">
			<div className="loader" />
			<p>{text}</p>
		</div>
	);
}

export function ErrorBox({ message }: { message: string }) {
	return (
		<div className="error-box">
			<SlidersHorizontal size={18} />
			<span>{message}</span>
		</div>
	);
}
