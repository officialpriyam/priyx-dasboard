'use client';

import { useParams } from 'next/navigation';
import { Plus, Tag } from 'lucide-react';
import { DashboardShell, EmptyState, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import { useAuth, useGuild } from '@/lib/hooks';

export default function TagsPage() {
	const params = useParams<{ guildId: string }>();
	const { auth, loading: authLoading } = useAuth();
	const { payload, loading, error } = useGuild(params.guildId);

	if (authLoading || loading) {
		return <LoadingScreen text="Loading tags..." />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={error ?? 'Could not load tags.'} />;
	}

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				action={
					<button className="primary-small" type="button">
						<Plus size={18} />
						New Tag
					</button>
				}
				title="Tags & Triggers"
				subtitle="Manage custom commands and auto-responses powered by Priyx."
			/>

			<div className="tags-tabs">
				<button className="active" type="button">
					<Tag size={16} />
					Tags <span>0</span>
				</button>
				<button type="button">Triggers <span>0</span></button>
			</div>

			<div className="info-line">
				Tags are invoked with /use name or by typing the tag name. Triggers fire automatically when a message contains the keyword.
			</div>

			<div className="search-input full">
				<input placeholder="Search 0 tags..." />
			</div>

			<section className="tag-empty-card">
				<EmptyState
					action={
						<button className="primary-small" type="button">
							<Plus size={17} />
							Create your first tag
						</button>
					}
					icon={<Tag size={40} />}
					text="Create your first tag using the button above or via /tag create in Discord."
					title="No tags yet"
				/>
			</section>
		</DashboardShell>
	);
}
