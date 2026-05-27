'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Save, SlidersHorizontal } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { DashboardShell, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import { ModuleConfigForm, type ConfigRecord } from '@/components/ModuleConfigForm';
import { useAuth, useGuild } from '@/lib/hooks';

export default function ModuleEditorPage() {
	const params = useParams<{ guildId: string; moduleName: string }>();
	const { auth, loading: authLoading } = useAuth();
	const { payload, setPayload, loading, error } = useGuild(params.guildId);
	const moduleInfo = useMemo(
		() => payload?.modules.find((module) => module.name === params.moduleName),
		[payload, params.moduleName],
	);
	const [enabled, setEnabled] = useState(false);
	const [config, setConfig] = useState<ConfigRecord>({});
	const [message, setMessage] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	useEffect(() => {
		if (!moduleInfo) {
			return;
		}

		setEnabled(moduleInfo.enabled);
		const nextConfig = { ...moduleInfo.config };
		delete nextConfig.enabled;
		setConfig(nextConfig as ConfigRecord);
	}, [moduleInfo]);

	async function save() {
		if (!payload || !moduleInfo) {
			return;
		}

		setSaving(true);
		setMessage(null);
		try {
			const response = await apiFetch<{
				module: { enabled: boolean; config: Record<string, unknown> };
			}>(`/guilds/${params.guildId}/modules/${params.moduleName}`, {
				method: 'PATCH',
				body: JSON.stringify({ enabled, config }),
			});
			setPayload({
				...payload,
				modules: payload.modules.map((item) =>
					item.name === params.moduleName
						? {
								...item,
								enabled: response.module.enabled,
								config: response.module.config,
							}
					: item,
				),
			});
			const nextConfig = { ...response.module.config };
			delete nextConfig.enabled;
			setConfig(nextConfig as ConfigRecord);
			setEnabled(response.module.enabled);
			setMessage('Module saved.');
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Could not save module.');
		} finally {
			setSaving(false);
		}
	}

	if (authLoading || loading) {
		return <LoadingScreen text="Loading module editor..." />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={error ?? 'Could not load module editor.'} />;
	}

	if (!moduleInfo) {
		return <ErrorBox message="Unknown module." />;
	}

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				action={
					<Link className="ghost-button" href={`/guild/${params.guildId}/modules`}>
						<ArrowLeft size={18} />
						Back to modules
					</Link>
				}
				title={moduleInfo.label}
				subtitle={moduleInfo.description}
			/>

			<section className="editor-layout">
				<aside className="module-control-rail">
					<div className="module-state-panel">
						<div className="editor-header">
							<div>
								<h2>Module State</h2>
								<p>Enable or disable this module for only this server.</p>
							</div>
							<button
								className={`toggle large ${enabled ? 'on' : ''}`}
								onClick={() => setEnabled((value) => !value)}
								type="button"
							>
								<span />
							</button>
						</div>
						<div className="module-state">
							<SlidersHorizontal size={18} />
							<span>{enabled ? 'Active in this server' : 'Inactive in this server'}</span>
						</div>
					</div>
				</aside>

				<div className="editor-panel config-panel">
					<div className="editor-header">
						<div>
							<h2>Server Settings</h2>
							<p>Change this server's module settings with form controls.</p>
						</div>
						<button className="save-button" disabled={saving} onClick={save} type="button">
							<Save size={18} />
							{saving ? 'Saving...' : 'Save'}
						</button>
					</div>
					<ModuleConfigForm
						config={config}
						guild={payload.guild}
						moduleName={moduleInfo.name}
						onChange={setConfig}
					/>
					{message ? <div className="save-message">{message}</div> : null}
				</div>
			</section>
		</DashboardShell>
	);
}
