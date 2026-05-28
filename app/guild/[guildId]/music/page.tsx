'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
	Disc3,
	Heart,
	ListMusic,
	Loader2,
	MicVocal,
	Pause,
	Play,
	RefreshCw,
	Search,
	Shuffle,
	SkipBack,
	SkipForward,
	Square,
	Volume2,
	X,
} from 'lucide-react';
import { DashboardShell, ErrorBox, LoadingScreen, PageTitle } from '@/components/DashboardShell';
import {
	apiFetch,
	type MusicLyricsPayload,
	type MusicPlayerPayload,
	type MusicSearchPayload,
	type MusicTrack,
} from '@/lib/api';
import { useAuth, useGuild } from '@/lib/hooks';

function presentTrack(track: MusicTrack | null): track is MusicTrack {
	return Boolean(track);
}

function trackKey(track: MusicTrack): string {
	return track.identifier ?? track.uri ?? `${track.title}-${track.author}`;
}

function formatDuration(ms: number): string {
	if (!Number.isFinite(ms) || ms <= 0) {
		return '0:00';
	}

	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function MusicPlayerPage() {
	const params = useParams<{ guildId: string }>();
	const { auth, loading: authLoading } = useAuth();
	const { payload, loading, error } = useGuild(params.guildId);
	const [status, setStatus] = useState<MusicPlayerPayload | null>(null);
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<MusicTrack[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [searching, setSearching] = useState(false);
	const [volume, setVolume] = useState(80);
	const [lyricsOpen, setLyricsOpen] = useState(false);
	const [lyrics, setLyrics] = useState<MusicLyricsPayload | null>(null);
	const [lyricsMessage, setLyricsMessage] = useState<string | null>(null);

	const current = status?.player?.current ?? null;
	const queue = useMemo(
		() => (status?.player?.queue ?? []).filter(presentTrack),
		[status],
	);
	const recommendations = useMemo(
		() => (status?.suggestions ?? []).filter(presentTrack),
		[status],
	);
	const progress =
		current && status?.player && current.duration > 0
			? Math.min(100, Math.max(0, (status.player.position / current.duration) * 100))
			: 0;
	const activeLyricIndex = useMemo(() => {
		if (!lyrics?.synced || !status?.player) {
			return -1;
		}

		let active = -1;
		for (let index = 0; index < lyrics.lines.length; index += 1) {
			const timeMs = lyrics.lines[index]?.timeMs;
			if (typeof timeMs === 'number' && timeMs <= status.player.position + 350) {
				active = index;
			}
		}
		return active;
	}, [lyrics, status?.player]);

	async function loadStatus() {
		const next = await apiFetch<MusicPlayerPayload>(`/guilds/${params.guildId}/music/player`);
		setStatus(next);
		if (next.player) {
			setVolume(next.player.volume);
		}
	}

	async function loadLyrics() {
		const next = await apiFetch<MusicLyricsPayload>(`/guilds/${params.guildId}/music/lyrics`);
		setLyrics(next);
		setLyricsMessage(null);
	}

	useEffect(() => {
		let active = true;
		loadStatus()
			.catch((err: unknown) => {
				if (active) {
					setMessage(err instanceof Error ? err.message : 'Could not load music player.');
				}
			});
		const timer = window.setInterval(() => {
			loadStatus().catch(() => undefined);
		}, 5000);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [params.guildId]);

	useEffect(() => {
		if (!lyricsOpen) {
			return;
		}

		let active = true;
		loadLyrics().catch((err: unknown) => {
			if (active) {
				setLyricsMessage(err instanceof Error ? err.message : 'Could not load lyrics.');
			}
		});
		const timer = window.setInterval(() => {
			loadLyrics().catch(() => undefined);
		}, 10_000);
		return () => {
			active = false;
			window.clearInterval(timer);
		};
	}, [lyricsOpen, params.guildId, current?.identifier]);

	async function control(action: string, extra: Record<string, unknown> = {}) {
		setBusy(true);
		setMessage(null);
		try {
			const next = await apiFetch<MusicPlayerPayload>(`/guilds/${params.guildId}/music/player`, {
				method: 'PATCH',
				body: JSON.stringify({ action, ...extra }),
			});
			setStatus(next);
			if (next.player) {
				setVolume(next.player.volume);
			}
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Music action failed.');
		} finally {
			setBusy(false);
		}
	}

	async function togglePause() {
		await control('pause', { paused: !(status?.player?.paused ?? false) });
	}

	async function search() {
		if (!query.trim()) {
			return;
		}

		setSearching(true);
		setMessage(null);
		setResults([]);
		try {
			const response = await apiFetch<MusicSearchPayload>(
				`/guilds/${params.guildId}/music/search?q=${encodeURIComponent(query.trim())}`,
			);
			const tracks = response.tracks.filter(presentTrack);
			setResults(tracks);
			if (tracks.length === 0) {
				setMessage('No search results found. Try another song name or link.');
			}
		} catch (err) {
			setMessage(err instanceof Error ? err.message : 'Search failed.');
		} finally {
			setSearching(false);
		}
	}

	async function addTrack(track: MusicTrack) {
		await control('add', { query: track.uri ?? track.title });
	}

	if (authLoading || loading) {
		return <LoadingScreen text="Loading music player..." />;
	}

	if (!auth || !payload) {
		return <ErrorBox message={error ?? 'Could not load music player.'} />;
	}

	return (
		<DashboardShell guild={payload.guild} user={auth.user}>
			<PageTitle
				title="Music Player"
				subtitle="Search, queue, and control this server's active Priyx music player."
			/>

			<section className="music-player-page">
				<div className="music-toolbar">
					<div className="music-toolbar-actions">
						<button
							className={`ghost-button compact-button ${status?.autoplay ? 'active-soft' : ''}`}
							disabled={busy || !status?.active}
							onClick={() => control('autoplay')}
							type="button"
						>
							<RefreshCw size={16} />
							Autoplay
						</button>
					</div>

					<form
						className="music-search"
						onSubmit={(event) => {
							event.preventDefault();
							void search();
						}}
					>
						<Search size={18} />
						<input
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Search for music..."
							value={query}
						/>
						<button disabled={searching} type="submit">
							{searching ? <Loader2 size={16} /> : 'Search'}
						</button>
					</form>

					<div className="music-connection">
						<span className={status?.connected ? 'online-dot' : 'offline-dot'} />
						{status?.connected ? 'Connected' : 'Disconnected'}
					</div>
					<button
						className="ghost-button compact-button"
						disabled={!current}
						onClick={() => setLyricsOpen(true)}
						type="button"
					>
						<MicVocal size={16} />
						Live Lyrics
					</button>
					<button
						className="danger-button compact-button"
						disabled={busy || !status?.active}
						onClick={() => control('stop')}
						type="button"
					>
						<Square size={15} />
						Stop Player
					</button>
				</div>

				{message ? <div className="save-message">{message}</div> : null}

				<div className="music-content-grid">
					<section className="music-main-stage">
						<div className="music-section-heading">
							<h2>Recommended for you</h2>
							<span>{recommendations.length} tracks</span>
						</div>
						{recommendations.length > 0 ? (
							<div className="recommendation-row">
								{recommendations.map((track) => (
									<button
										className="recommendation-card"
										key={trackKey(track)}
										onClick={() => void addTrack(track)}
										type="button"
									>
										{track.artworkUrl ? <img src={track.artworkUrl} alt="" /> : <Disc3 size={42} />}
										<strong>{track.title}</strong>
										<span>{track.author}</span>
									</button>
								))}
							</div>
						) : (
							<div className="music-empty-block">
								<Disc3 size={38} />
								<strong>
									{current ? 'Recommendations are still loading' : 'Start playing something to get recommendations'}
								</strong>
								<span>
									{current
										? 'Priyx is looking for tracks related to the current song.'
										: 'Priyx will suggest music based on the active track.'}
								</span>
							</div>
						)}

						<div className="music-section-heading queue-heading">
							<h2>Up Next</h2>
						</div>
						<div className="queue-panel">
							{queue.length > 0 ? (
								queue.map((track) => (
									<div className="queue-track" key={`${track.index}-${trackKey(track)}`}>
										<span>{track.index}</span>
										{track.artworkUrl ? <img src={track.artworkUrl} alt="" /> : <Disc3 size={22} />}
										<div>
											<strong>{track.title}</strong>
											<small>{track.author}</small>
										</div>
										<em>{track.durationLabel}</em>
									</div>
								))
							) : (
								<div className="music-empty-block compact">
									<ListMusic size={34} />
									<strong>Queue is empty</strong>
									<span>Add tracks to keep playback going.</span>
								</div>
							)}
						</div>
					</section>

					<aside className="music-search-results">
						<h2>Search Results</h2>
						{results.length > 0 ? (
							results.map((track) => (
								<div className="search-result-row" key={trackKey(track)}>
									{track.artworkUrl ? <img src={track.artworkUrl} alt="" /> : <Disc3 size={22} />}
									<div>
										<strong>{track.title}</strong>
										<small>{track.author}</small>
									</div>
									<span>{track.durationLabel}</span>
									<button onClick={() => void addTrack(track)} type="button">Add</button>
								</div>
							))
						) : searching ? (
							<p>Searching...</p>
						) : (
							<p>Search results appear here.</p>
						)}
					</aside>
				</div>

				<footer className="web-player-bar">
					<div className="now-track">
						{current?.artworkUrl ? <img src={current.artworkUrl} alt="" /> : <Disc3 size={24} />}
						<div>
							<strong>{current?.title ?? 'No track playing'}</strong>
							<span>{current?.author ?? 'Start a search to queue music'}</span>
						</div>
						<Heart size={18} />
					</div>

					<div className="player-controls">
						<div className="control-row">
							<button disabled={busy || !status?.active} onClick={() => control('shuffle')} type="button">
								<Shuffle size={18} />
							</button>
							<button disabled={busy || !status?.active} onClick={() => control('previous')} type="button">
								<SkipBack size={18} />
							</button>
							<button
								className="play-button"
								disabled={busy || !status?.active}
								onClick={() => void togglePause()}
								type="button"
							>
								{status?.player?.paused ? <Play size={22} /> : <Pause size={22} />}
							</button>
							<button disabled={busy || !status?.active} onClick={() => control('skip')} type="button">
								<SkipForward size={18} />
							</button>
							<button disabled={busy || !status?.active} onClick={() => control('loop')} type="button">
								<RefreshCw size={18} />
								<span>{status?.player?.loop ?? 'off'}</span>
							</button>
						</div>
						<div className="progress-row">
							<span>{formatDuration(status?.player?.position ?? 0)}</span>
							<div className="progress-track">
								<div style={{ width: `${progress}%` }} />
							</div>
							<span>{current?.durationLabel ?? '0:00'}</span>
						</div>
					</div>

					<div className="volume-control">
						<Volume2 size={18} />
						<input
							max={150}
							min={1}
							onChange={(event) => setVolume(Number(event.target.value))}
							onKeyUp={(event) => {
								if (event.key === 'Enter') {
									void control('volume', { volume });
								}
							}}
							onPointerUp={() => control('volume', { volume })}
							type="range"
							value={volume}
						/>
						<span>{volume}%</span>
					</div>
				</footer>
				{lyricsOpen ? (
					<div className="lyrics-overlay">
						<div
							className="lyrics-backdrop"
							style={{
								backgroundImage: current?.artworkUrl
									? `linear-gradient(90deg, rgba(75, 38, 20, 0.78), rgba(23, 34, 29, 0.82), rgba(12, 13, 13, 0.94)), url(${current.artworkUrl})`
									: undefined,
							}}
						/>
						<button
							aria-label="Close lyrics"
							className="lyrics-close"
							onClick={() => setLyricsOpen(false)}
							type="button"
						>
							<X size={20} />
						</button>
						<aside className="lyrics-mini-player">
							<div className="lyrics-art-shell">
								{current?.artworkUrl ? <img src={current.artworkUrl} alt="" /> : <Disc3 size={54} />}
							</div>
							<div className="lyrics-track-row">
								<strong>{current?.title ?? 'No track playing'}</strong>
								<span>{current?.author ?? 'Unknown artist'}</span>
								<button type="button">
									<Heart size={16} />
								</button>
							</div>
							<div className="lyrics-progress">
								<div className="lyrics-progress-track">
									<div style={{ width: `${progress}%` }} />
								</div>
								<div>
									<span>{formatDuration(status?.player?.position ?? 0)}</span>
									<span>{current?.durationLabel ?? '0:00'}</span>
								</div>
							</div>
							<div className="lyrics-control-row">
								<button onClick={() => control('shuffle')} type="button">
									<Shuffle size={18} />
								</button>
								<button onClick={() => control('previous')} type="button">
									<SkipBack size={20} />
								</button>
								<button className="lyrics-play" onClick={() => void togglePause()} type="button">
									{status?.player?.paused ? <Play size={24} /> : <Pause size={24} />}
								</button>
								<button onClick={() => control('skip')} type="button">
									<SkipForward size={20} />
								</button>
								<button onClick={() => control('loop')} type="button">
									<RefreshCw size={18} />
								</button>
							</div>
							<div className="lyrics-volume">
								<Volume2 size={16} />
								<input
									max={150}
									min={1}
									onChange={(event) => setVolume(Number(event.target.value))}
									onPointerUp={() => control('volume', { volume })}
									type="range"
									value={volume}
								/>
							</div>
						</aside>
						<main className="lyrics-stage">
							{lyrics?.lines.length ? (
								<div className={`lyrics-lines ${lyrics.synced ? 'synced' : ''}`}>
									{lyrics.lines.map((line, index) => (
										<p
											className={index === activeLyricIndex ? 'active' : ''}
											key={`${line.timeMs ?? index}-${line.text}`}
										>
											{line.text}
										</p>
									))}
								</div>
							) : (
								<div className="lyrics-loading">
									<div className="lyrics-bars">
										<span />
										<span />
										<span />
										<span />
										<span />
									</div>
									<strong>{lyricsMessage ?? lyrics?.message ?? 'Finding lyrics...'}</strong>
								</div>
							)}
						</main>
					</div>
				) : null}
			</section>
		</DashboardShell>
	);
}
