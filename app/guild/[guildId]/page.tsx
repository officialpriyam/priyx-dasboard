'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Activity, Bell, Bug, ChevronRight, Cog, UserRound, Users } from 'lucide-react';
import { DashboardShell, EmptyState, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import { useAuth, useGuild } from '@/lib/hooks';

export default function GuildDashboardPage() {
	const params = useParams<{ guildId: string }>();
	const { auth, loading: authLoading, error: authError } = useAuth();
	const { payload, loading, error } = useGuild(params.guildId);

	if (authLoading || loading) {
		return <LoadingScreen text="Loading server dashboard..." />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={authError ?? error ?? 'Could not load dashboard.'} />;
	}

	const activeModules = payload.modules.filter((module) => module.enabled);
	const suggested = payload.modules.filter((module) => !module.enabled).slice(0, 3);

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				title="Dashboard"
				subtitle="Manage your server settings, view statistics, and configure modules to enhance your community experience."
			/>

			<section className="notice-card">
				<div className="round-icon">
					<Bell size={22} />
				</div>
				<div>
					<strong>Notifications</strong>
					<p>Stay updated with your latest server alerts and activity.</p>
				</div>
				<button type="button">View All</button>
			</section>

			<div className="dashboard-grid">
				<section className="analytics-card">
					<div className="metric-row">
						<div>
							<Users size={28} />
							<strong>{payload.guild.memberCount}</strong>
							<span>Members</span>
						</div>
						<div>
							<Activity size={28} />
							<strong>...</strong>
							<span>Growth</span>
						</div>
					</div>
					<div className="chart-box">
						<span className="chart-point purple" />
						<span className="chart-point green" />
						<em>Jan</em>
					</div>
				</section>

				<section className="prefix-card">
					<Cog className="corner-icon" size={19} />
					<h2>Priyx</h2>
					<p>The default prefix is <strong>{payload.prefix}</strong></p>
					<hr />
					<span>A prefix is a character or set of characters used to trigger commands.</span>
				</section>

				<section className="audit-card">
					<h2>Audit Logs</h2>
					<ChevronRight />
					<EmptyState
						icon={<Activity size={42} />}
						text="Activity will appear here"
						title="No activity yet"
					/>
				</section>

				<section className="quick-actions">
					<h2>Quick Actions</h2>
					<p>Manage and configure essential features efficiently.</p>
					<div className="quick-grid">
						<Link href={`/guild/${params.guildId}/module/ticket`}>
							<Bug />
							<div>
								<strong>Bug Reports</strong>
								<span>Configure ticket support flows.</span>
							</div>
							<ChevronRight />
						</Link>
						<Link href={`/guild/${params.guildId}/module/welcomer`}>
							<UserRound />
							<div>
								<strong>Join Role</strong>
								<span>Auto-assign welcome settings.</span>
							</div>
							<ChevronRight />
						</Link>
					</div>
				</section>

				<section className="suggested-card">
					<h2>Suggested Modules</h2>
					<p>Turn these on to get more out of your server.</p>
					{suggested.length === 0 ? (
						<div className="small-muted">All primary modules are active.</div>
					) : (
						suggested.map((module) => (
							<Link href={`/guild/${params.guildId}/module/${module.name}`} key={module.name}>
								<span style={{ background: module.accent }} />
								<strong>{module.label}</strong>
								<em>Inactive</em>
							</Link>
						))
					)}
				</section>
			</div>

			<div className="module-strip">
				<strong>{activeModules.length}</strong>
				<span>active modules in this server</span>
				<Link href={`/guild/${params.guildId}/modules`}>Open modules</Link>
			</div>
		</DashboardShell>
	);
}
