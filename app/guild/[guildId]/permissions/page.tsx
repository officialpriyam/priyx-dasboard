'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { KeyRound, Settings, ShieldCheck, Users } from 'lucide-react';
import { DashboardShell, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import type { ModuleInfo } from '@/lib/api';
import { useAuth, useGuild } from '@/lib/hooks';

export default function PermissionsPage() {
	const params = useParams<{ guildId: string }>();
	const { auth, loading: authLoading } = useAuth();
	const { payload, loading, error } = useGuild(params.guildId);

	if (authLoading || loading) {
		return <LoadingScreen text="Loading permissions..." />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={error ?? 'Could not load permissions.'} />;
	}

	const permissionModules = ['core', 'reaction-role', 'verification']
		.map((name) => payload.modules.find((module) => module.name === name))
		.filter((module): module is ModuleInfo => Boolean(module));

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				title="Permissions"
				subtitle="Review server roles and configure modules that manage access."
			/>

			<section className="hub-grid compact">
				{permissionModules.map((module) => (
					<article className="hub-card" key={module.name}>
						<div className="hub-card-icon" style={{ color: module.accent }}>
							<ShieldCheck size={26} />
						</div>
						<div>
							<h2>{module.label}</h2>
							<p>{module.description}</p>
						</div>
						<div className="hub-card-footer">
							<span className={module.enabled ? 'status active' : 'status'}>
								{module.enabled ? 'Active' : 'Inactive'}
							</span>
							<Link href={`/guild/${params.guildId}/module/${module.name}`}>
								<Settings size={17} />
								Configure
							</Link>
						</div>
					</article>
				))}
			</section>

			<section className="admin-section dashboard-section">
				<div className="section-heading">
					<div>
						<h2>Server Roles</h2>
						<p>{payload.guild.roles.length} roles available to dashboard module settings.</p>
					</div>
					<Users />
				</div>
				<div className="roles-grid">
					{payload.guild.roles.map((role) => (
						<div className="role-card" key={role.id}>
							<span style={{ background: role.color === '#000000' ? '#6d6478' : role.color }} />
							<div>
								<strong>{role.name}</strong>
								<small>{role.managed ? 'Managed role' : 'Assignable role'}</small>
							</div>
							<KeyRound size={16} />
						</div>
					))}
				</div>
			</section>
		</DashboardShell>
	);
}
