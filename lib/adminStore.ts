import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const adminPermissions = [
	{
		key: 'view_status',
		label: 'View System Status',
		description: 'View bot health, database, Redis, Lavalink, and server status.',
	},
	{
		key: 'manage_dashboard_users',
		label: 'Manage Dashboard Users',
		description: 'Ban or unban Discord OAuth dashboard users.',
	},
	{
		key: 'view_servers',
		label: 'View Bot Servers',
		description: 'See servers where Priyx is connected.',
	},
	{
		key: 'manage_content',
		label: 'Manage Content Pages',
		description: 'Edit Terms, Privacy, License, and About Me pages.',
	},
	{
		key: 'manage_admins',
		label: 'Manage Admin Access',
		description: 'Create admin roles and admin users.',
	},
	{
		key: 'manage_modules',
		label: 'Manage Modules',
		description: 'Reserved for server module management from the dashboard.',
	},
] as const;

export type AdminPermission = (typeof adminPermissions)[number]['key'];

export interface AdminRole {
	id: string;
	name: string;
	permissions: AdminPermission[];
	createdAt: string;
	updatedAt: string;
}

export interface StoredAdminUser {
	id: string;
	username: string;
	passwordHash: string;
	passwordSalt: string;
	roleId: string;
	disabled: boolean;
	createdAt: string;
	updatedAt: string;
	lastLoginAt?: string;
}

interface AdminStore {
	version: 1;
	roles: AdminRole[];
	users: StoredAdminUser[];
}

export interface PublicAdminUser {
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

export interface AdminAccessPayload {
	permissions: typeof adminPermissions;
	roles: AdminRole[];
	users: PublicAdminUser[];
}

export interface AdminSession {
	username: string;
	roleName: string;
	permissions: AdminPermission[];
	root: boolean;
}

const allPermissionKeys = adminPermissions.map((permission) => permission.key);

function dataPath(): string {
	return path.join(process.cwd(), 'data', 'dashboard-admin.json');
}

function now(): string {
	return new Date().toISOString();
}

function cleanName(value: unknown): string {
	return String(value ?? '').trim();
}

function normalizePermissions(values: unknown): AdminPermission[] {
	if (!Array.isArray(values)) {
		return [];
	}

	const unique = new Set<AdminPermission>();
	for (const value of values) {
		if (allPermissionKeys.includes(value as AdminPermission)) {
			unique.add(value as AdminPermission);
		}
	}

	return [...unique];
}

function defaultStore(): AdminStore {
	return {
		version: 1,
		roles: [],
		users: [],
	};
}

async function readStore(): Promise<AdminStore> {
	try {
		const raw = await fs.readFile(dataPath(), 'utf8');
		const parsed = JSON.parse(raw) as Partial<AdminStore>;
		return {
			version: 1,
			roles: Array.isArray(parsed.roles) ? parsed.roles : [],
			users: Array.isArray(parsed.users) ? parsed.users : [],
		};
	} catch (error) {
		const code = (error as NodeJS.ErrnoException).code;
		if (code === 'ENOENT') {
			return defaultStore();
		}
		throw error;
	}
}

async function writeStore(store: AdminStore): Promise<AdminStore> {
	await fs.mkdir(path.dirname(dataPath()), { recursive: true });
	await fs.writeFile(dataPath(), `${JSON.stringify(store, null, 2)}\n`, 'utf8');
	return store;
}

function hashPassword(password: string, salt = randomBytes(18).toString('base64url')) {
	const hash = scryptSync(password, salt, 64).toString('base64url');
	return { hash, salt };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
	const actual = Buffer.from(hashPassword(password, salt).hash);
	const expected = Buffer.from(expectedHash);
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function publicUser(user: StoredAdminUser, roles: AdminRole[]): PublicAdminUser {
	const role = roles.find((entry) => entry.id === user.roleId);
	return {
		id: user.id,
		username: user.username,
		roleId: user.roleId,
		roleName: role?.name ?? 'Missing role',
		permissions: role?.permissions ?? [],
		disabled: user.disabled,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		lastLoginAt: user.lastLoginAt,
	};
}

export function allAdminPermissions(): AdminPermission[] {
	return [...allPermissionKeys];
}

export function hasPermission(
	admin: Pick<AdminSession, 'permissions' | 'root'>,
	permission: AdminPermission,
): boolean {
	return admin.root || admin.permissions.includes(permission);
}

export async function readAdminAccess(): Promise<AdminAccessPayload> {
	const store = await readStore();
	return {
		permissions: adminPermissions,
		roles: [...store.roles].sort((left, right) =>
			left.name.localeCompare(right.name),
		),
		users: store.users
			.map((user) => publicUser(user, store.roles))
			.sort((left, right) => left.username.localeCompare(right.username)),
	};
}

export async function createAdminRole(input: {
	name: unknown;
	permissions: unknown;
}): Promise<AdminAccessPayload> {
	const name = cleanName(input.name);
	const permissions = normalizePermissions(input.permissions);
	if (name.length < 2 || name.length > 40) {
		throw new Error('Role name must be 2 to 40 characters.');
	}
	if (permissions.length === 0) {
		throw new Error('Select at least one permission for this role.');
	}

	const store = await readStore();
	if (store.roles.some((role) => role.name.toLowerCase() === name.toLowerCase())) {
		throw new Error('An admin role with that name already exists.');
	}

	const timestamp = now();
	store.roles.push({
		id: randomBytes(10).toString('base64url'),
		name,
		permissions,
		createdAt: timestamp,
		updatedAt: timestamp,
	});
	await writeStore(store);
	return readAdminAccess();
}

export async function updateAdminRole(input: {
	roleId: unknown;
	name?: unknown;
	permissions?: unknown;
}): Promise<AdminAccessPayload> {
	const roleId = cleanName(input.roleId);
	const store = await readStore();
	const role = store.roles.find((entry) => entry.id === roleId);
	if (!role) {
		throw new Error('Admin role was not found.');
	}

	const nextName = input.name === undefined ? role.name : cleanName(input.name);
	const nextPermissions =
		input.permissions === undefined
			? role.permissions
			: normalizePermissions(input.permissions);
	if (nextName.length < 2 || nextName.length > 40) {
		throw new Error('Role name must be 2 to 40 characters.');
	}
	if (nextPermissions.length === 0) {
		throw new Error('Select at least one permission for this role.');
	}
	if (
		store.roles.some(
			(entry) =>
				entry.id !== role.id &&
				entry.name.toLowerCase() === nextName.toLowerCase(),
		)
	) {
		throw new Error('An admin role with that name already exists.');
	}

	role.name = nextName;
	role.permissions = nextPermissions;
	role.updatedAt = now();
	await writeStore(store);
	return readAdminAccess();
}

export async function deleteAdminRole(roleId: unknown): Promise<AdminAccessPayload> {
	const id = cleanName(roleId);
	const store = await readStore();
	if (store.users.some((user) => user.roleId === id)) {
		throw new Error('Move users out of this role before deleting it.');
	}
	store.roles = store.roles.filter((role) => role.id !== id);
	await writeStore(store);
	return readAdminAccess();
}

export async function createAdminUser(input: {
	username: unknown;
	password: unknown;
	roleId: unknown;
}): Promise<AdminAccessPayload> {
	const username = cleanName(input.username);
	const password = String(input.password ?? '');
	const roleId = cleanName(input.roleId);
	if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
		throw new Error('Username must be 3 to 32 characters and use letters, numbers, dots, underscores, or dashes.');
	}
	if (password.length < 8) {
		throw new Error('Password must be at least 8 characters.');
	}

	const store = await readStore();
	if (!store.roles.some((role) => role.id === roleId)) {
		throw new Error('Select a valid admin role.');
	}
	if (
		store.users.some(
			(user) => user.username.toLowerCase() === username.toLowerCase(),
		)
	) {
		throw new Error('An admin user with that username already exists.');
	}

	const { hash, salt } = hashPassword(password);
	const timestamp = now();
	store.users.push({
		id: randomBytes(10).toString('base64url'),
		username,
		passwordHash: hash,
		passwordSalt: salt,
		roleId,
		disabled: false,
		createdAt: timestamp,
		updatedAt: timestamp,
	});
	await writeStore(store);
	return readAdminAccess();
}

export async function setAdminUserDisabled(input: {
	userId: unknown;
	disabled: unknown;
}): Promise<AdminAccessPayload> {
	const userId = cleanName(input.userId);
	const store = await readStore();
	const user = store.users.find((entry) => entry.id === userId);
	if (!user) {
		throw new Error('Admin user was not found.');
	}

	user.disabled = Boolean(input.disabled);
	user.updatedAt = now();
	await writeStore(store);
	return readAdminAccess();
}

export async function deleteAdminUser(userId: unknown): Promise<AdminAccessPayload> {
	const id = cleanName(userId);
	const store = await readStore();
	store.users = store.users.filter((user) => user.id !== id);
	await writeStore(store);
	return readAdminAccess();
}

export async function authenticateStoredAdmin(
	username: string,
	password: string,
): Promise<AdminSession | null> {
	const store = await readStore();
	const user = store.users.find(
		(entry) => entry.username.toLowerCase() === username.toLowerCase(),
	);
	if (!user || user.disabled) {
		return null;
	}

	const role = store.roles.find((entry) => entry.id === user.roleId);
	if (!role || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
		return null;
	}

	user.lastLoginAt = now();
	await writeStore(store);
	return {
		username: user.username,
		roleName: role.name,
		permissions: role.permissions,
		root: false,
	};
}
