'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

type PlayerState = NonNullable<MusicPlayerPayload['player']>;
type LoopMode = PlayerState['loop'];

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

function indexedQueue(tracks: MusicTrack[]): MusicTrack[] {
	return tracks.map((track, index) => ({ ...track, index: index + 1 }));
}

function queueTrack(track: MusicTrack): MusicTrack {
	const { index: _index, ...rest } = track;
	return rest;
}

function trackQuery(track: MusicTrack): string {
	if (track.uri) {
		return track.uri;
	}

	if (track.identifier && /^[a-zA-Z0-9_-]{11}$/.test(track.identifier)) {
		return `https://www.youtube.com/watch?v=${track.identifier}`;
	}

	return `${track.author} ${track.title}`.trim();
}

function nextLoopMode(mode: LoopMode): LoopMode {
	if (mode === 'none') {
		return 'track';
	}

	if (mode === 'track') {
		return 'queue';
	}

	return 'none';
}

function shuffledTracks(tracks: MusicTrack[]): MusicTrack[] {
	const next = [...tracks];
	for (let index = next.length - 1; index > 0; index -= 1) {
		const swap = Math.floor(Math.random() * (index + 1));
		[next[index], next[swap]] = [next[swap], next[index]];
	}
	return next;
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
	const optimisticUntilRef = useRef(0);
	const lyricLineRefs = useRef<Array<HTMLParagraphElement | null>>([]);

	const current = status?.player?.current ?? null;
	const queue = useMemo(
		() => (status?.player?.queue ?? []).filter(presentTrack),
		[status],
	);
	const recommendations = useMemo(
		() => (status?.suggestions ?? []).filter(presentTrack),
		[status],
	);
	const playerPosition = status?.player?.position ?? lyrics?.position ?? 0;
	const progress =
		current && current.duration > 0
			? Math.min(100, Math.max(0, (playerPosition / current.duration) * 100))
			: 0;
	const activeLyricIndex = useMemo(() => {
		if (!lyrics?.synced) {
			return -1;
		}

		let active = -1;
		for (let index = 0; index < lyrics.lines.length; index += 1) {
			const timeMs = lyrics.lines[index]?.timeMs;
			if (typeof timeMs === 'number' && timeMs <= playerPosition + 600) {
				active = index;
			}
		}
		return active;
	}, [lyrics, playerPosition]);

	async function loadStatus(options: { background?: boolean } = {}) {
		const next = await apiFetch<MusicPlayerPayload>(`/guilds/${params.guildId}/music/player`);
		if (options.background && Date.now() < optimisticUntilRef.current) {
			return;
		}
		setStatus(next);
		if (next.player) {
			setVolume(next.player.volume);
		}
	}

	async function loadLyrics() {
		const next = await apiFetch<MusicLyricsPayload>(`/guilds/${params.guildId}/music/lyrics`);
		setLyrics(next);
		setLyricsMessage(null);
		if (typeof next.position === 'number') {
			setStatus((previous) => {
				const player = previous?.player;
				if (!previous || !player) {
					return previous;
				}

				const sameTrack =
					!next.track?.identifier ||
					next.track.identifier === player.current?.identifier ||
					next.track.uri === player.current?.uri;
				if (!sameTrack) {
					return previous;
				}

				return { ...previous, player: { ...player, position: next.position ?? player.position } };
			});
		}
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
			loadStatus({ background: true }).catch(() => undefined);
		}, 2500);
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

	useEffect(() => {
		const timer = window.setInterval(() => {
			setStatus((previous) => {
				const player = previous?.player;
				const currentTrack = player?.current;
				if (
					!previous ||
					!player ||
					!currentTrack ||
					currentTrack.isStream ||
					player.paused ||
					!player.playing
				) {
					return previous;
				}

				return {
					...previous,
					player: {
						...player,
						position: Math.min(currentTrack.duration, player.position + 1000),
					},
				};
			});
		}, 1000);
		return () => window.clearInterval(timer);
	}, []);

	useEffect(() => {
		lyricLineRefs.current = [];
	}, [lyrics?.track?.identifier, lyrics?.track?.uri]);

	useEffect(() => {
		if (!lyricsOpen || activeLyricIndex < 0) {
			return;
		}

		lyricLineRefs.current[activeLyricIndex]?.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});
	}, [activeLyricIndex, lyricsOpen]);

	function updateOptimistic(mutator: (payload: MusicPlayerPayload) => MusicPlayerPayload) {
		setStatus((previous) => (previous ? mutator(previous) : previous));
	}

	function optimisticAddTrack(track: MusicTrack) {
		updateOptimistic((payload) => {
			const player = payload.player;
			if (!player || !player.current) {
				return {
					...payload,
					active: true,
					player: {
						voiceId: player?.voiceId ?? null,
						textId: player?.textId ?? '',
						playing: true,
						paused: false,
						volume: player?.volume ?? volume,
						position: 0,
						loop: player?.loop ?? 'none',
						current: queueTrack(track),
						queue: [],
						previous: player?.previous ?? [],
					},
				};
			}

			return {
				...payload,
				active: true,
				player: {
					...player,
					queue: indexedQueue([...player.queue.filter(presentTrack), queueTrack(track)]),
				},
			};
		});
	}

	function optimisticControl(action: string, extra: Record<string, unknown> = {}) {
		updateOptimistic((payload) => {
			if (action === 'stop') {
				return { ...payload, active: false, suggestions: [], player: null };
			}

			if (action === 'autoplay') {
				return {
					...payload,
					autoplay: typeof extra.enabled === 'boolean' ? extra.enabled : !payload.autoplay,
				};
			}

			const player = payload.player;
			if (!player) {
				return payload;
			}

			if (action === 'pause') {
				const paused = typeof extra.paused === 'boolean' ? extra.paused : !player.paused;
				return {
					...payload,
					player: { ...player, paused, playing: !paused },
				};
			}

			if (action === 'volume') {
				const nextVolume = Math.min(150, Math.max(1, Number(extra.volume ?? player.volume)));
				return { ...payload, player: { ...player, volume: nextVolume } };
			}

			if (action === 'loop') {
				return { ...payload, player: { ...player, loop: nextLoopMode(player.loop) } };
			}

			if (action === 'shuffle') {
				return {
					...payload,
					player: { ...player, queue: indexedQueue(shuffledTracks(player.queue.filter(presentTrack))) },
				};
			}

			if (action === 'skip') {
				const [nextTrack, ...rest] = player.queue.filter(presentTrack);
				if (!nextTrack) {
					return {
						...payload,
						player: { ...player, current: null, queue: [], playing: false, paused: true, position: 0 },
					};
				}

				return {
					...payload,
					player: {
						...player,
						current: queueTrack(nextTrack),
						queue: indexedQueue(rest),
						previous: player.current
							? [...player.previous.filter(presentTrack), queueTrack(player.current)].slice(-10)
							: player.previous,
						position: 0,
						playing: true,
						paused: false,
					},
				};
			}

			if (action === 'previous') {
				const previous = player.previous.filter(presentTrack);
				const previousTrack = previous.at(-1);
				if (!previousTrack) {
					return payload;
				}

				return {
					...payload,
					player: {
						...player,
						current: queueTrack(previousTrack),
						queue: player.current
							? indexedQueue([queueTrack(player.current), ...player.queue.filter(presentTrack)])
							: player.queue,
						previous: previous.slice(0, -1),
						position: 0,
						playing: true,
						paused: false,
					},
				};
			}

			return payload;
		});
	}

	async function control(
		action: string,
		extra: Record<string, unknown> = {},
		optimistic?: () => void,
	) {
		const previous = status;
		const keepOptimistic = Boolean(optimistic) && ['previous', 'skip', 'stop'].includes(action);
		if (keepOptimistic) {
			optimisticUntilRef.current = Date.now() + 1800;
		}
		optimistic?.();
		setBusy(true);
		setMessage(null);
		try {
			const next = await apiFetch<MusicPlayerPayload>(`/guilds/${params.guildId}/music/player`, {
				method: 'PATCH',
				body: JSON.stringify({ action, ...extra }),
			});
			if (!keepOptimistic) {
				setStatus(next);
			}
			if (!keepOptimistic && next.player) {
				setVolume(next.player.volume);
			}
		} catch (err) {
			optimisticUntilRef.current = 0;
			setStatus(previous);
			setMessage(err instanceof Error ? err.message : 'Music action failed.');
		} finally {
			setBusy(false);
			window.setTimeout(() => {
				loadStatus().catch(() => undefined);
			}, keepOptimistic ? 1800 : 700);
		}
	}

	async function togglePause() {
		const paused = !(status?.player?.paused ?? false);
		await control('pause', { paused }, () => optimisticControl('pause', { paused }));
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
		await control('add', { query: trackQuery(track) }, () => optimisticAddTrack(track));
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
							onClick={() => control('autoplay', {}, () => optimisticControl('autoplay'))}
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
						onClick={() => control('stop', {}, () => optimisticControl('stop'))}
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
							<button disabled={busy || !status?.active} onClick={() => control('shuffle', {}, () => optimisticControl('shuffle'))} type="button">
								<Shuffle size={18} />
							</button>
							<button disabled={busy || !status?.active} onClick={() => control('previous', {}, () => optimisticControl('previous'))} type="button">
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
							<button disabled={busy || !status?.active} onClick={() => control('skip', {}, () => optimisticControl('skip'))} type="button">
								<SkipForward size={18} />
							</button>
							<button disabled={busy || !status?.active} onClick={() => control('loop', {}, () => optimisticControl('loop'))} type="button">
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
							onPointerUp={() => control('volume', { volume }, () => optimisticControl('volume', { volume }))}
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
									<span>{formatDuration(playerPosition)}</span>
									<span>{current?.durationLabel ?? '0:00'}</span>
								</div>
							</div>
							<div className="lyrics-control-row">
								<button onClick={() => control('shuffle', {}, () => optimisticControl('shuffle'))} type="button">
									<Shuffle size={18} />
								</button>
								<button onClick={() => control('previous', {}, () => optimisticControl('previous'))} type="button">
									<SkipBack size={20} />
								</button>
								<button className="lyrics-play" onClick={() => void togglePause()} type="button">
									{status?.player?.paused ? <Play size={24} /> : <Pause size={24} />}
								</button>
								<button onClick={() => control('skip', {}, () => optimisticControl('skip'))} type="button">
									<SkipForward size={20} />
								</button>
								<button onClick={() => control('loop', {}, () => optimisticControl('loop'))} type="button">
									<RefreshCw size={18} />
								</button>
							</div>
							<div className="lyrics-volume">
								<Volume2 size={16} />
								<input
									max={150}
									min={1}
									onChange={(event) => setVolume(Number(event.target.value))}
									onPointerUp={() => control('volume', { volume }, () => optimisticControl('volume', { volume }))}
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
											ref={(node) => {
												lyricLineRefs.current[index] = node;
											}}
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
