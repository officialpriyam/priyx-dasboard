'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Settings, ShieldCheck } from 'lucide-react';
import { DashboardShell, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import type { ModuleInfo } from '@/lib/api';
import { useAuth, useGuild } from '@/lib/hooks';

interface ModuleHubPageProps {
	title: string;
	subtitle: string;
	moduleNames: string[];
}

export function ModuleHubPage({ title, subtitle, moduleNames }: ModuleHubPageProps) {
	const params = useParams<{ guildId: string }>();
	const { auth, loading: authLoading } = useAuth();
	const { payload, loading, error } = useGuild(params.guildId);

	if (authLoading || loading) {
		return <LoadingScreen text={`Loading ${title.toLowerCase()}...`} />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={error ?? `Could not load ${title.toLowerCase()}.`} />;
	}

	const modules = moduleNames
		.map((name) => payload.modules.find((module) => module.name === name))
		.filter((module): module is ModuleInfo => Boolean(module));

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle title={title} subtitle={subtitle} />

			<section className="hub-grid">
				{modules.map((module) => (
					<article className="hub-card" key={module.name}>
						<div className="hub-card-icon" style={{ color: module.accent }}>
							<ShieldCheck size={28} />
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
		</DashboardShell>
	);
}
