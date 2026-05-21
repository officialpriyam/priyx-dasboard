'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	Ban,
	Bot,
	Database,
	FileText,
	KeyRound,
	LogOut,
	Music,
	Plus,
	RefreshCw,
	Save,
	Server,
	Shield,
	ShieldCheck,
	Trash2,
	UserPlus,
	Users,
	UserX,
	Wifi,
} from 'lucide-react';

type AdminPermission =
	| 'view_status'
	| 'manage_dashboard_users'
	| 'view_servers'
	| 'manage_content'
	| 'manage_admins'
	| 'manage_modules';

interface AdminSession {
	username: string;
	roleName: string;
	permissions: AdminPermission[];
	root: boolean;
}

interface AdminStatus {
	bot: {
		id?: string;
		name: string;
		tag?: string;
		avatarUrl?: string;
		version: string;
		wsPing: number;
		uptimeSeconds: number;
		nodeVersion: string;
		guildCount: number;
		commandCount: number;
	};
	database: {
		ok: boolean;
		dialect: string;
		latencyMs: number;
		error?: string;
	};
	redis: {
		ok: boolean;
		kind: string;
		latencyMs: number;
		error?: string;
	};
	lavalink: {
		configured: boolean;
		players: number;
		nodes: Array<{
			name: string;
			host: string;
			port: number;
			secure: boolean;
			online: boolean;
			players: number;
			playingPlayers: number;
			uptime: number;
		}>;
	};
	guilds: AdminGuild[];
	users: DashboardUser[];
	sessions: unknown[];
	bannedUserIds: string[];
	memory: NodeJS.MemoryUsage;
}

interface DashboardUser {
	id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	banned: boolean;
	sessionCount: number;
	guildCount: number;
	manageableGuildCount: number;
	lastSeenAt: string;
}

interface AdminGuild {
	id: string;
	name: string;
	iconUrl?: string;
	memberCount: number;
	ownerId: string;
	joinedAt: string | null;
}

interface DashboardContent {
	terms: string;
	privacy: string;
	license: string;
	about: string;
}

interface PermissionDefinition {
	key: AdminPermission;
	label: string;
	description: string;
}

interface AdminRole {
	id: string;
	name: string;
	permissions: AdminPermission[];
	createdAt: string;
	updatedAt: string;
}

interface ManagedAdminUser {
	id: string;
	username: string;
	roleId: string;
	roleName: string;
	permissions: AdminPermission[];
	disabled: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt?: string;
}

interface AdminAccess {
	permissions: readonly PermissionDefinition[];
	roles: AdminRole[];
	users: ManagedAdminUser[];
}

const contentLabels: Record<keyof DashboardContent, string> = {
	terms: 'Terms Page',
	privacy: 'Privacy Page',
	license: 'License Page',
	about: 'About Me Page',
};

function formatUptime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${minutes}m`;
}

function canAdmin(admin: AdminSession | null, permission: AdminPermission): boolean {
	return Boolean(admin && (admin.root || admin.permissions.includes(permission)));
}

function canReadStatus(admin: AdminSession | null): boolean {
	return (
		canAdmin(admin, 'view_status') ||
		canAdmin(admin, 'view_servers') ||
		canAdmin(admin, 'manage_dashboard_users')
	);
}

async function jsonFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(url, {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...(options.headers ?? {}),
		},
	});

	if (!response.ok) {
		const payload = (await response.json().catch(() => ({}))) as {
			error?: string;
		};
		throw new Error(payload.error ?? `Request failed with ${response.status}`);
	}

	return (await response.json()) as T;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		setLoading(true);
		setError(null);
		try {
			await jsonFetch('/api/backend/admin/login', {
				method: 'POST',
				body: JSON.stringify({ username, password }),
			});
			onLogin();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Login failed.');
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="admin-login-page">
			<form className="admin-login-card" onSubmit={submit}>
				<div className="brand admin-brand">
					<div className="brand-mark">
						<Bot size={23} />
					</div>
					<div>
						<strong>Priyx Dashboard</strong>
						<span>Backend Admin</span>
					</div>
				</div>
				<h1>Admin Login</h1>
				<label>
					Username
					<input
						autoComplete="username"
						onChange={(event) => setUsername(event.target.value)}
						value={username}
					/>
				</label>
				<label>
					Password
					<input
						autoComplete="current-password"
						onChange={(event) => setPassword(event.target.value)}
						type="password"
						value={password}
					/>
				</label>
				{error ? <div className="admin-error">{error}</div> : null}
				<button disabled={loading} type="submit">
					<Shield size={18} />
					{loading ? 'Checking...' : 'Login'}
				</button>
			</form>
		</main>
	);
}

export default function BackendAdminPage() {
	const [admin, setAdmin] = useState<AdminSession | null>(null);
	const [checking, setChecking] = useState(true);
	const [status, setStatus] = useState<AdminStatus | null>(null);
	const [content, setContent] = useState<DashboardContent | null>(null);
	const [access, setAccess] = useState<AdminAccess | null>(null);
	const [activeContent, setActiveContent] =
		useState<keyof DashboardContent>('terms');
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [roleName, setRoleName] = useState('');
	const [rolePermissions, setRolePermissions] = useState<AdminPermission[]>([]);
	const [newUsername, setNewUsername] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [newUserRoleId, setNewUserRoleId] = useState('');

	const sortedGuilds = useMemo(
		() =>
			[...(status?.guilds ?? [])].sort(
				(left, right) => right.memberCount - left.memberCount,
			),
		[status],
	);

	async function loadAll(currentAdmin = admin) {
		setLoading(true);
		setMessage(null);
		try {
			const [statusPayload, contentPayload, accessPayload] = await Promise.all([
				canReadStatus(currentAdmin)
					? jsonFetch<AdminStatus>('/api/priyx/admin/status')
					: Promise.resolve(null),
				canAdmin(currentAdmin, 'manage_content')
					? jsonFetch<{ content: DashboardContent }>('/api/backend/admin/content')
					: Promise.resolve(null),
				jsonFetch<{ access: AdminAccess }>('/api/backend/admin/access'),
			]);
			setStatus(statusPayload);
			setContent(contentPayload?.content ?? null);
			setAccess(accessPayload.access);
			if (!newUserRoleId && accessPayload.access.roles.length > 0) {
				setNewUserRoleId(accessPayload.access.roles[0].id);
			}
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Could not load admin data.');
		} finally {
			setLoading(false);
		}
	}

	async function checkAdmin() {
		try {
			const payload = await jsonFetch<{ admin: AdminSession }>(
				'/api/backend/admin/me',
			);
			setAdmin(payload.admin);
			await loadAll(payload.admin);
		} catch {
			setAdmin(null);
		} finally {
			setChecking(false);
		}
	}

	useEffect(() => {
		checkAdmin();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function logout() {
		await fetch('/api/backend/admin/logout', {
			method: 'POST',
			credentials: 'include',
		}).catch(() => undefined);
		setAdmin(null);
		setStatus(null);
		setContent(null);
		setAccess(null);
	}

	async function setBanned(user: DashboardUser, banned: boolean) {
		await jsonFetch('/api/priyx/admin/users/' + user.id + '/ban', {
			method: 'PATCH',
			body: JSON.stringify({ banned }),
		});
		await loadAll();
	}

	async function saveContent() {
		if (!content) {
			return;
		}

		const payload = await jsonFetch<{ content: DashboardContent }>(
			'/api/backend/admin/content',
			{
				method: 'PATCH',
				body: JSON.stringify({ content }),
			},
		);
		setContent(payload.content);
		setMessage('Content pages saved.');
	}

	function toggleRolePermission(permission: AdminPermission) {
		setRolePermissions((current) =>
			current.includes(permission)
				? current.filter((entry) => entry !== permission)
				: [...current, permission],
		);
	}

	async function createRole(event: React.FormEvent) {
		event.preventDefault();
		const payload = await jsonFetch<{ access: AdminAccess }>(
			'/api/backend/admin/access',
			{
				method: 'POST',
				body: JSON.stringify({
					type: 'role',
					name: roleName,
					permissions: rolePermissions,
				}),
			},
		);
		setAccess(payload.access);
		setRoleName('');
		setRolePermissions([]);
		setMessage('Admin role created.');
		if (!newUserRoleId && payload.access.roles.length > 0) {
			setNewUserRoleId(payload.access.roles[0].id);
		}
	}

	async function createUser(event: React.FormEvent) {
		event.preventDefault();
		const payload = await jsonFetch<{ access: AdminAccess }>(
			'/api/backend/admin/access',
			{
				method: 'POST',
				body: JSON.stringify({
					type: 'user',
					username: newUsername,
					password: newPassword,
					roleId: newUserRoleId,
				}),
			},
		);
		setAccess(payload.access);
		setNewUsername('');
		setNewPassword('');
		setMessage('Admin user created.');
	}

	async function setAdminDisabled(user: ManagedAdminUser, disabled: boolean) {
		const payload = await jsonFetch<{ access: AdminAccess }>(
			'/api/backend/admin/access',
			{
				method: 'PATCH',
				body: JSON.stringify({
					action: 'set-user-disabled',
					userId: user.id,
					disabled,
				}),
			},
		);
		setAccess(payload.access);
	}

	async function deleteManagedUser(user: ManagedAdminUser) {
		const payload = await jsonFetch<{ access: AdminAccess }>(
			'/api/backend/admin/access',
			{
				method: 'PATCH',
				body: JSON.stringify({
					action: 'delete-user',
					userId: user.id,
				}),
			},
		);
		setAccess(payload.access);
	}

	async function deleteRole(role: AdminRole) {
		const payload = await jsonFetch<{ access: AdminAccess }>(
			'/api/backend/admin/access',
			{
				method: 'PATCH',
				body: JSON.stringify({
					action: 'delete-role',
					roleId: role.id,
				}),
			},
		);
		setAccess(payload.access);
	}

	if (checking) {
		return (
			<div className="center-screen">
				<div className="loader" />
				<p>Checking admin session...</p>
			</div>
		);
	}

	if (!admin) {
		return <AdminLogin onLogin={checkAdmin} />;
	}

	const canManageAdmins = canAdmin(admin, 'manage_admins');
	const canManageContent = canAdmin(admin, 'manage_content');
	const canManageDashboardUsers = canAdmin(admin, 'manage_dashboard_users');
	const canViewServers = canAdmin(admin, 'view_servers');
	const canViewStatus = canAdmin(admin, 'view_status');

	return (
		<main className="admin-page">
			<header className="admin-header">
				<div className="brand">
					<div className="brand-mark">
						<Bot size={24} />
					</div>
					<div>
						<strong>Priyx Dashboard</strong>
						<span>
							{admin.username} - {admin.roleName}
							{admin.root ? ' - root' : ''}
						</span>
					</div>
				</div>
				<div className="admin-actions">
					<button disabled={loading} onClick={() => loadAll()} type="button">
						<RefreshCw size={17} />
						Refresh
					</button>
					<button onClick={logout} type="button">
						<LogOut size={17} />
						Log out
					</button>
				</div>
			</header>

			{message ? <div className="admin-message">{message}</div> : null}

			{canViewStatus ? (
				<section className="admin-grid">
					<article className="admin-card hero">
						<div className="admin-card-title">
							<Bot />
							<span>Bot Status</span>
						</div>
						<div className="bot-admin-row">
							{status?.bot.avatarUrl ? (
								<img src={status.bot.avatarUrl} alt="" />
							) : null}
							<div>
								<h1>{status?.bot.name ?? 'Priyx'}</h1>
								<p>{status?.bot.tag ?? 'Offline'}</p>
							</div>
						</div>
						<div className="admin-stat-grid">
							<div>
								<strong>{status?.bot.wsPing ?? 0}ms</strong>
								<span>Ping</span>
							</div>
							<div>
								<strong>{status?.bot.guildCount ?? 0}</strong>
								<span>Servers</span>
							</div>
							<div>
								<strong>{status?.bot.commandCount ?? 0}</strong>
								<span>Commands</span>
							</div>
							<div>
								<strong>{formatUptime(status?.bot.uptimeSeconds ?? 0)}</strong>
								<span>Uptime</span>
							</div>
						</div>
					</article>

					<article className="admin-card">
						<div className="admin-card-title">
							<Database />
							<span>Database</span>
						</div>
						<strong className={status?.database.ok ? 'ok-text' : 'bad-text'}>
							{status?.database.ok ? 'Online' : 'Problem'}
						</strong>
						<p>
							{status?.database.dialect} - {status?.database.latencyMs}ms
						</p>
						{status?.database.error ? <small>{status.database.error}</small> : null}
					</article>

					<article className="admin-card">
						<div className="admin-card-title">
							<Wifi />
							<span>Redis / Cache</span>
						</div>
						<strong className={status?.redis.ok ? 'ok-text' : 'bad-text'}>
							{status?.redis.kind ?? 'unknown'}
						</strong>
						<p>
							{status?.redis.ok ? 'Healthy' : 'Fallback or failed'} -{' '}
							{status?.redis.latencyMs ?? 0}ms
						</p>
					</article>

					<article className="admin-card">
						<div className="admin-card-title">
							<Music />
							<span>Lavalink</span>
						</div>
						<strong>
							{status?.lavalink.configured
								? `${status.lavalink.nodes.length} nodes`
								: 'Not configured'}
						</strong>
						<p>{status?.lavalink.players ?? 0} active players</p>
						<div className="node-list">
							{status?.lavalink.nodes.map((node) => (
								<span className={node.online ? 'online' : ''} key={node.name}>
									{node.name}: {node.online ? 'online' : 'offline'} (
									{node.playingPlayers}/{node.players})
								</span>
							))}
						</div>
					</article>
				</section>
			) : null}

			{canManageAdmins ? (
				<section className="admin-section">
					<div className="section-heading">
						<div>
							<h2>Admin Access</h2>
							<p>Create roles with permissions, then create admin users under those roles.</p>
						</div>
						<KeyRound />
					</div>

					<div className="access-grid">
						<form className="access-form" onSubmit={createRole}>
							<h3>New Role</h3>
							<label>
								Role Name
								<input
									onChange={(event) => setRoleName(event.target.value)}
									placeholder="Support Manager"
									value={roleName}
								/>
							</label>
							<div className="permission-grid">
								{access?.permissions.map((permission) => (
									<label key={permission.key}>
										<input
											checked={rolePermissions.includes(permission.key)}
											onChange={() => toggleRolePermission(permission.key)}
											type="checkbox"
										/>
										<span>
											<strong>{permission.label}</strong>
											<small>{permission.description}</small>
										</span>
									</label>
								))}
							</div>
							<button className="save-button" type="submit">
								<Plus size={17} />
								Create Role
							</button>
						</form>

						<form className="access-form" onSubmit={createUser}>
							<h3>New Admin User</h3>
							<label>
								Username
								<input
									autoComplete="off"
									onChange={(event) => setNewUsername(event.target.value)}
									placeholder="staff-admin"
									value={newUsername}
								/>
							</label>
							<label>
								Password
								<input
									autoComplete="new-password"
									onChange={(event) => setNewPassword(event.target.value)}
									type="password"
									value={newPassword}
								/>
							</label>
							<label>
								Role
								<select
									onChange={(event) => setNewUserRoleId(event.target.value)}
									value={newUserRoleId}
								>
									<option value="">Select role</option>
									{access?.roles.map((role) => (
										<option key={role.id} value={role.id}>
											{role.name}
										</option>
									))}
								</select>
							</label>
							<button className="save-button" type="submit">
								<UserPlus size={17} />
								Create User
							</button>
						</form>
					</div>

					<div className="access-lists">
						<div>
							<h3>Roles</h3>
							<div className="admin-table compact">
								{access?.roles.length ? (
									access.roles.map((role) => (
										<div className="admin-row access-row" key={role.id}>
											<div>
												<strong>{role.name}</strong>
												<small>{role.permissions.join(', ')}</small>
											</div>
											<button onClick={() => deleteRole(role)} type="button">
												<Trash2 size={16} />
												Delete
											</button>
										</div>
									))
								) : (
									<p className="empty-note">No roles yet.</p>
								)}
							</div>
						</div>

						<div>
							<h3>Admin Users</h3>
							<div className="admin-table compact">
								{access?.users.length ? (
									access.users.map((user) => (
										<div className="admin-row access-row" key={user.id}>
											<div>
												<strong>{user.username}</strong>
												<small>
													{user.roleName} - {user.disabled ? 'Disabled' : 'Active'}
												</small>
											</div>
											<button
												onClick={() => setAdminDisabled(user, !user.disabled)}
												type="button"
											>
												{user.disabled ? <ShieldCheck size={16} /> : <UserX size={16} />}
												{user.disabled ? 'Enable' : 'Disable'}
											</button>
											<button onClick={() => deleteManagedUser(user)} type="button">
												<Trash2 size={16} />
												Delete
											</button>
										</div>
									))
								) : (
									<p className="empty-note">No admin users yet.</p>
								)}
							</div>
						</div>
					</div>
				</section>
			) : null}

			{canManageDashboardUsers ? (
				<section className="admin-section">
					<div className="section-heading">
						<div>
							<h2>Dashboard Users</h2>
							<p>Users who logged in through Discord OAuth. Bans block future dashboard sessions.</p>
						</div>
						<Users />
					</div>
					<div className="admin-table">
						{status?.users.map((user) => (
							<div className="admin-row" key={user.id}>
								<div className="user-mini">
									{user.avatarUrl ? (
										<img src={user.avatarUrl} alt="" />
									) : (
										<span>{user.displayName[0]}</span>
									)}
									<div>
										<strong>{user.displayName}</strong>
										<small>{user.id}</small>
									</div>
								</div>
								<div>{user.sessionCount} sessions</div>
								<div>{user.manageableGuildCount} managed servers</div>
								<button
									className={user.banned ? 'unban' : 'ban'}
									onClick={() => setBanned(user, !user.banned)}
									type="button"
								>
									<Ban size={16} />
									{user.banned ? 'Unban' : 'Ban'}
								</button>
							</div>
						))}
					</div>
				</section>
			) : null}

			{canViewServers ? (
				<section className="admin-section">
					<div className="section-heading">
						<div>
							<h2>Bot Servers</h2>
							<p>Servers where Priyx is currently connected.</p>
						</div>
						<Server />
					</div>
					<div className="server-admin-grid">
						{sortedGuilds.map((guild) => (
							<article className="server-admin-card" key={guild.id}>
								{guild.iconUrl ? (
									<img src={guild.iconUrl} alt="" />
								) : (
									<span>{guild.name[0]}</span>
								)}
								<div>
									<strong>{guild.name}</strong>
									<small>{guild.memberCount} members</small>
									<small>{guild.id}</small>
								</div>
							</article>
						))}
					</div>
				</section>
			) : null}

			{canManageContent && content ? (
				<section className="admin-section">
					<div className="section-heading">
						<div>
							<h2>Content Pages</h2>
							<p>Edit dashboard Terms, Privacy, License, and About Me pages.</p>
						</div>
						<FileText />
					</div>
					<div className="content-editor">
						<div className="content-tabs">
							{(Object.keys(contentLabels) as Array<keyof DashboardContent>).map(
								(key) => (
									<button
										className={activeContent === key ? 'active' : ''}
										key={key}
										onClick={() => setActiveContent(key)}
										type="button"
									>
										{contentLabels[key]}
									</button>
								),
							)}
						</div>
						<textarea
							onChange={(event) =>
								setContent({ ...content, [activeContent]: event.target.value })
							}
							value={content[activeContent]}
						/>
						<button className="save-button" onClick={saveContent} type="button">
							<Save size={17} />
							Save Content
						</button>
					</div>
				</section>
			) : null}
		</main>
	);
}
