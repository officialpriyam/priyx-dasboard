'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
	BadgeCheck,
	BellRing,
	Bot,
	Cake,
	ChartNoAxesColumn,
	Coins,
	Flame,
	Gift,
	Globe2,
	Grid2X2,
	Image,
	Map,
	MessageSquare,
	Music,
	PawPrint,
	Reply,
	Search,
	Settings,
	Shield,
	ShieldCheck,
	SmilePlus,
	Sparkles,
	Star,
	Ticket,
	UserRoundPlus,
	UserPlus,
	Volume2,
	Box,
} from 'lucide-react';
import { apiFetch, type ModuleInfo } from '@/lib/api';
import { DashboardShell, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import { useAuth, useGuild } from '@/lib/hooks';

const iconMap: Record<string, typeof Grid2X2> = {
	automod: Shield,
	ticket: Ticket,
	music: Music,
	suggestion: MessageSquare,
	welcomer: UserPlus,
	leveling: ChartNoAxesColumn,
	giveaway: Gift,
	'reaction-role': BadgeCheck,
	ai: Sparkles,
	economy: Coins,
	globalchat: Globe2,
	autoreact: SmilePlus,
	autoreply: Reply,
	'embed-builder': Box,
	birthday: Cake,
	image: Image,
	streak: Flame,
	'social-alerts': BellRing,
	adventure: Map,
	pet: PawPrint,
	fun: Star,
	tempvoice: Volume2,
	verification: ShieldCheck,
	invite: UserRoundPlus,
	core: Bot,
};

export default function ModulesPage() {
	const params = useParams<{ guildId: string }>();
	const searchParams = useSearchParams();
	const initialCategory = searchParams.get('category') ?? 'all';
	const { auth, loading: authLoading } = useAuth();
	const { payload, setPayload, loading, error } = useGuild(params.guildId);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState(initialCategory);
	const [saving, setSaving] = useState<string | null>(null);

	const modules = useMemo(() => {
		return (payload?.modules ?? []).filter((module) => {
			const matchesQuery =
				module.label.toLowerCase().includes(query.toLowerCase()) ||
				module.description.toLowerCase().includes(query.toLowerCase());
			const matchesCategory = category === 'all' || module.category === category;
			return matchesQuery && matchesCategory;
		});
	}, [payload, query, category]);

	async function toggle(module: ModuleInfo) {
		if (!payload) {
			return;
		}

		setSaving(module.name);
		try {
			const response = await apiFetch<{ module: { enabled: boolean; config: Record<string, unknown> } }>(
				`/guilds/${params.guildId}/modules/${module.name}`,
				{
					method: 'PATCH',
					body: JSON.stringify({ enabled: !module.enabled }),
				},
			);
			setPayload({
				...payload,
				modules: payload.modules.map((item) =>
					item.name === module.name
						? {
								...item,
								enabled: response.module.enabled,
								config: response.module.config,
							}
						: item,
				),
			});
		} finally {
			setSaving(null);
		}
	}

	if (authLoading || loading) {
		return <LoadingScreen text="Loading modules..." />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={error ?? 'Could not load modules.'} />;
	}

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				title="Modules"
				subtitle="Enable and configure modules to add functionality to your server."
			/>

			<div className="module-toolbar">
				<div className="search-input wide">
					<Search size={19} />
					<input
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search for Module"
						value={query}
					/>
				</div>
				<select onChange={(event) => setCategory(event.target.value)} value={category}>
					<option value="all">All</option>
					<option value="configuration">Configuration</option>
					<option value="safety">Safety</option>
					<option value="engagement">Engagement</option>
					<option value="utility">Utility</option>
				</select>
			</div>

			<section className="modules-grid">
				{modules.map((module) => {
					const Icon = iconMap[module.name] ?? Grid2X2;
					return (
						<article className="module-card" key={module.name}>
							<div className="module-top">
								<div className="module-icon" style={{ color: module.accent }}>
									<Icon size={27} />
								</div>
								<div>
									<h2>{module.label}</h2>
									<p>{module.description}</p>
								</div>
								<button
									aria-label={`Toggle ${module.label}`}
									className={`toggle ${module.enabled ? 'on' : ''}`}
									disabled={saving === module.name}
									onClick={() => toggle(module)}
									type="button"
								>
									<span />
								</button>
							</div>
							<div className="module-bottom">
								<span className={module.enabled ? 'status active' : 'status'}>
									{module.enabled ? 'Active' : 'Inactive'}
								</span>
								<Link href={`/guild/${params.guildId}/module/${module.name}`}>
									<Settings size={17} />
									Configure
								</Link>
							</div>
						</article>
					);
				})}
			</section>
		</DashboardShell>
	);
}
