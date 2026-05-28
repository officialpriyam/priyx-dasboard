'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
	CirclePlus,
	GripVertical,
	Music,
	Pause,
	RefreshCw,
	Save,
	Shuffle,
	SkipBack,
	SkipForward,
	Square,
	Volume1,
	Volume2,
} from 'lucide-react';
import { DashboardShell, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import { apiFetch } from '@/lib/api';
import { useAuth, useGuild } from '@/lib/hooks';

type ConfigValue =
	| string
	| number
	| boolean
	| null
	| ConfigValue[]
	| { [key: string]: ConfigValue };
type ConfigRecord = Record<string, ConfigValue>;
type SongRequestTab = 'buttons' | 'display' | 'text';

const buttonOptions = [
	{ key: 'previous', label: 'Previous', icon: SkipBack },
	{ key: 'rewind', label: 'Rewind', icon: SkipBack },
	{ key: 'pause', label: 'Pause', icon: Pause },
	{ key: 'forward', label: 'Forward', icon: SkipForward },
	{ key: 'skip', label: 'Skip', icon: SkipForward },
	{ key: 'volumeDown', label: 'Volume-', icon: Volume1 },
	{ key: 'loop', label: 'Loop', icon: RefreshCw },
	{ key: 'stop', label: 'Stop', icon: Square },
	{ key: 'shuffle', label: 'Shuffle', icon: Shuffle },
	{ key: 'volumeUp', label: 'Volume+', icon: Volume2 },
];

const tabs: Array<{ key: SongRequestTab; label: string }> = [
	{ key: 'buttons', label: 'Buttons' },
	{ key: 'display', label: 'Display' },
	{ key: 'text', label: 'Text' },
];

function isRecord(value: ConfigValue | unknown): value is ConfigRecord {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function songRequests(config: ConfigRecord): ConfigRecord {
	return isRecord(config.songRequests) ? config.songRequests : {};
}

function buttonConfig(config: ConfigRecord): ConfigRecord {
	const requests = songRequests(config);
	return isRecord(requests.buttons) ? requests.buttons : {};
}

export default function SongRequestsPage() {
	const params = useParams<{ guildId: string }>();
	const { auth, loading: authLoading } = useAuth();
	const { payload, setPayload, loading, error } = useGuild(params.guildId);
	const moduleInfo = useMemo(
		() => payload?.modules.find((module) => module.name === 'music'),
		[payload],
	);
	const [config, setConfig] = useState<ConfigRecord>({});
	const [message, setMessage] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [activeTab, setActiveTab] = useState<SongRequestTab>('buttons');

	useEffect(() => {
		if (!moduleInfo) {
			return;
		}

		const nextConfig = { ...moduleInfo.config };
		delete nextConfig.enabled;
		setConfig(nextConfig as ConfigRecord);
	}, [moduleInfo]);

	const requests = songRequests(config);
	const buttons = buttonConfig(config);
	const channelId = String(requests.channel ?? '');
	const textChannels = payload?.guild.channels.filter((channel) => channel.type !== 2) ?? [];

	function updateSongRequests(next: ConfigRecord) {
		setConfig({ ...config, songRequests: { ...requests, ...next } });
	}

	function toggleButton(key: string) {
		updateSongRequests({
			buttons: {
				...buttons,
				[key]: buttons[key] === false,
			},
		});
	}

	async function save() {
		if (!payload) {
			return;
		}

		setSaving(true);
		setMessage(null);
		try {
			const response = await apiFetch<{
				module: { enabled: boolean; config: Record<string, unknown> };
			}>(`/guilds/${params.guildId}/modules/music`, {
				method: 'PATCH',
				body: JSON.stringify({ config }),
			});
			setPayload({
				...payload,
				modules: payload.modules.map((module) =>
					module.name === 'music'
						? { ...module, config: response.module.config, enabled: response.module.enabled }
						: module,
				),
			});
			const nextConfig = { ...response.module.config };
			delete nextConfig.enabled;
			setConfig(nextConfig as ConfigRecord);
			setMessage('Song request settings saved.');
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Could not save song request settings.');
		} finally {
			setSaving(false);
		}
	}

	async function createChannel() {
		if (!payload) {
			return;
		}

		setSaving(true);
		setMessage(null);
		try {
			const response = await apiFetch<{
				channel: { id: string; name: string };
				config: Record<string, unknown>;
			}>(`/guilds/${params.guildId}/music/song-requests/channel`, {
				method: 'POST',
				body: JSON.stringify({ channelName: requests.channelName ?? 'song-requests' }),
			});
			setPayload({
				...payload,
				modules: payload.modules.map((module) =>
					module.name === 'music' ? { ...module, config: response.config } : module,
				),
				guild: {
					...payload.guild,
					channels: [
						...payload.guild.channels,
						{
							id: response.channel.id,
							name: response.channel.name,
							type: 0,
							parentId: null,
							position: payload.guild.channels.length + 1,
						},
					],
				},
			});
			const nextConfig = { ...response.config };
			delete nextConfig.enabled;
			setConfig(nextConfig as ConfigRecord);
			setMessage(`#${response.channel.name} created and enabled.`);
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Could not create song request channel.');
		} finally {
			setSaving(false);
		}
	}

	if (authLoading || loading) {
		return <LoadingScreen text="Loading song requests..." />;
	}

	if (!auth || !payload || !moduleInfo) {
		return <ErrorBox message={error ?? 'Could not load song requests.'} />;
	}

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				title="Song Requests"
				subtitle="Create a dedicated channel where members can request songs by typing."
				action={
					<button className="save-button" disabled={saving} onClick={save} type="button">
						<Save size={18} />
						{saving ? 'Saving...' : 'Save'}
					</button>
				}
			/>

			<section className="song-requests-page">
				<div className="song-preview-panel">
					<div className="discord-preview">
						<div className="discord-channel"># {channelId ? textChannels.find((channel) => channel.id === channelId)?.name ?? 'song-requests' : 'song-requests'}</div>
						<div className="discord-message">
							<div className="disc-art">
								<Music size={18} />
							</div>
							<div className="discord-embed">
								<strong>{String(requests.idleTitle ?? 'Music Player')}</strong>
								<p>{String(requests.idleDescription ?? 'No music is currently playing. Join a voice channel and send a song name or link to start playing.')}</p>
								<div className="preview-artwork">priyx<br /><span>music for your discord</span></div>
								<div className="preview-buttons">
									{buttonOptions
										.filter((button) => buttons[button.key] !== false)
										.slice(0, 10)
										.map((button) => {
											const Icon = button.icon;
											return (
												<span key={button.key}>
													<Icon size={12} />
													{button.label}
												</span>
											);
										})}
								</div>
							</div>
						</div>
					</div>
					{!channelId ? (
						<div className="create-channel-overlay">
							<CirclePlus size={30} />
							<strong>Create Channel</strong>
							<span>Let members request songs by typing in chat.</span>
							<button className="save-button" disabled={saving} onClick={createChannel} type="button">
								<CirclePlus size={16} />
								Create Channel
							</button>
						</div>
					) : null}
				</div>

				<div className="song-settings-panel">
					<div className="song-tabs">
						{tabs.map((tab) => (
							<button
								className={activeTab === tab.key ? 'active' : ''}
								key={tab.key}
								onClick={() => setActiveTab(tab.key)}
								type="button"
							>
								{tab.label}
							</button>
						))}
					</div>

					{activeTab === 'buttons' ? (
						<div className="song-tab-panel">
							<div className="song-request-fields compact-fields">
								<label className="config-field inline">
									<div>
										<strong>Enabled</strong>
										<small>Allow typed song requests in the selected channel.</small>
									</div>
									<button
										className={`toggle ${requests.enabled === false ? '' : 'on'}`}
										onClick={() => updateSongRequests({ enabled: requests.enabled === false })}
										type="button"
									>
										<span />
									</button>
								</label>

								<label className="config-field">
									<div>
										<strong>Request Channel</strong>
									</div>
									<select
										onChange={(event) => updateSongRequests({ channel: event.target.value })}
										value={channelId}
									>
										<option value="">Not set</option>
										{textChannels.map((channel) => (
											<option key={channel.id} value={channel.id}>
												#{channel.name}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="song-button-list">
								{buttonOptions.map((button) => {
									const Icon = button.icon;
									const enabled = buttons[button.key] !== false;
									return (
										<div className="song-button-row" key={button.key}>
											<GripVertical size={16} />
											<Icon size={17} />
											<strong>{button.label}</strong>
											<button
												className={`toggle ${enabled ? 'on' : ''}`}
												onClick={() => toggleButton(button.key)}
												type="button"
											>
												<span />
											</button>
										</div>
									);
								})}
							</div>
						</div>
					) : null}

					{activeTab === 'display' ? (
						<div className="song-request-fields">
							<label className="config-field">
								<div>
									<strong>Channel Name</strong>
								</div>
								<input
									onChange={(event) => updateSongRequests({ channelName: event.target.value })}
									value={String(requests.channelName ?? 'song-requests')}
								/>
							</label>

							<label className="config-field">
								<div>
									<strong>Idle Title</strong>
								</div>
								<input
									onChange={(event) => updateSongRequests({ idleTitle: event.target.value })}
									value={String(requests.idleTitle ?? 'Music Player')}
								/>
							</label>

							<label className="config-field">
								<div>
									<strong>Playing Title</strong>
								</div>
								<input
									onChange={(event) => updateSongRequests({ playingTitle: event.target.value })}
									value={String(requests.playingTitle ?? 'Now Playing')}
								/>
							</label>
						</div>
					) : null}

					{activeTab === 'text' ? (
						<div className="song-request-fields text-fields">
							<label className="config-field">
								<div>
									<strong>Idle Description</strong>
								</div>
								<textarea
									onChange={(event) => updateSongRequests({ idleDescription: event.target.value })}
									value={String(requests.idleDescription ?? '')}
								/>
							</label>

							<label className="config-field">
								<div>
									<strong>Request Placeholder</strong>
								</div>
								<textarea
									onChange={(event) => updateSongRequests({ requestPlaceholder: event.target.value })}
									value={String(requests.requestPlaceholder ?? 'Type a song name or link in this channel.')}
								/>
							</label>
						</div>
					) : null}
				</div>
			</section>
			{message ? <div className="save-message">{message}</div> : null}
		</DashboardShell>
	);
}
