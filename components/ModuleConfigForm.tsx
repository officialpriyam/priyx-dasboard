'use client';

import { FileUp, Plus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { GuildDetails } from '@/lib/api';

export type ConfigValue =
	| string
	| number
	| boolean
	| null
	| ConfigValue[]
	| { [key: string]: ConfigValue };

export type ConfigRecord = Record<string, ConfigValue>;

interface ModuleConfigFormProps {
	config: ConfigRecord;
	guild: GuildDetails;
	moduleName?: string;
	onChange: (config: ConfigRecord) => void;
}

const styleOptions = ['PRIMARY', 'SECONDARY', 'SUCCESS', 'DANGER'];
const actionOptions = ['delete', 'warn', 'mute', 'kick', 'ban', 'none'];
const matchTypeOptions = ['contains', 'startsWith', 'endsWith', 'exact', 'regex'];
const panelStyleOptions = ['button', 'select'];
const verificationTypeOptions = ['button', 'captcha', 'reaction'];
const searchEngineOptions = ['youtube', 'youtube_music', 'soundcloud', 'spotify'];
const providerOptions = ['rainlink'];
const artworkOptions = ['thumbnail', 'banner'];
const statusOptions = ['online', 'idle', 'dnd', 'invisible'];
const activityTypeOptions = ['message', 'voice', 'daily'];
const messageModeOptions = ['plain', 'embed', 'both'];
const embedBuilderModeOptions = ['plain', 'embed', 'v2'];
const cardLayoutOptions = ['modern', 'classic', 'compact'];
const avatarShapeOptions = ['circle', 'square', 'rounded'];
const geminiModelOptions = [
	'gemini-2.5-flash-lite',
	'gemini-2.5-flash',
	'gemini-3.5-flash',
];
const aiManagedKeys = new Set(['supportChannel', 'knowledgeBase', 'knowledgeDocuments']);

function isRecord(value: ConfigValue): value is ConfigRecord {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function labelFor(key: string): string {
	return key
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[_-]+/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function descriptionFor(path: string[]): string {
	const key = path.join('.');
	const descriptions: Record<string, string> = {
		channel: 'Channel used by this feature. Leave blank to let commands choose per server.',
		supportChannel: 'Channel where Priyx answers member messages with AI support.',
		logChannel: 'Channel where moderation or feature logs are posted.',
		errorChannel: 'Channel where bot errors are reported.',
		announceChannel: 'Channel for public announcements from this module.',
		transcriptChannel: 'Channel where ticket transcripts are posted.',
		category: 'Discord category where this module creates channels.',
		supportRoles: 'Roles that can manage or answer tickets.',
		djRole: 'Role allowed to use DJ controls without extra checks.',
		role: 'Role assigned or checked by this module.',
		enabled: 'Turns this setting on or off.',
		maxOpenPerUser: 'Maximum open tickets a member can have at the same time.',
		defaultVolume: 'Default player volume for new music sessions.',
		maxQueueSize: 'Maximum tracks allowed in the music queue.',
		leaveOnEmptyDelay: 'Seconds to wait before leaving an empty voice channel.',
		sessionTtl: 'Dashboard login session length in seconds.',
		messageType: 'Choose whether this output is a plain message, embed message, or both.',
		defaultMode: 'Default message type used by new embed builder templates.',
		deleteAfter: 'Seconds before Priyx deletes this message. Use 0 to keep it.',
		assignRoles: 'Roles automatically assigned to a new member.',
		previewChannel: 'Channel used for testing and previewing saved embeds.',
		allowedMentions: 'Controls which mentions are allowed in sent messages.',
		defaultMessage: 'Default content, embed, and components for new builder messages.',
		templates: 'Reusable message templates available to server admins.',
		fields: 'Embed fields shown under the main description.',
		buttons: 'Buttons attached to the message.',
		selectMenus: 'Dropdown menus attached to the message.',
		timestamp: 'Show the current timestamp on the embed.',
		mentionUser: 'Mention the member in the configured welcome output.',
		knowledgeBase: 'Pinned server information included as context before every AI answer.',
		knowledgeDocuments: 'Dashboard-fed PDF, text, or markdown sources available to AI.',
		content: 'Text content used by this item.',
		source: 'Original file name or source label.',
	};
	return descriptions[path[path.length - 1]] ?? descriptions[key] ?? '';
}

function cloneValue(value: ConfigValue): ConfigValue {
	if (Array.isArray(value)) {
		return value.map(cloneValue);
	}
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]),
		);
	}
	return value;
}

function defaultArrayItem(items: ConfigValue[], path: string[]): ConfigValue {
	const key = path[path.length - 1].toLowerCase();
	if (items.length > 0) {
		const first = items[0];
		if (isRecord(first)) {
			return Object.fromEntries(
				Object.entries(first).map(([entryKey, entryValue]) => [
					entryKey,
					typeof entryValue === 'number'
						? 0
						: typeof entryValue === 'boolean'
							? false
							: Array.isArray(entryValue)
								? []
								: isRecord(entryValue)
									? {}
									: '',
				]),
			);
		}
		return typeof first === 'number' ? 0 : typeof first === 'boolean' ? false : '';
	}

	if (key === 'nodes') {
		return {
			name: '',
			host: '',
			port: 443,
			auth: '',
			secure: true,
			driver: 'lavalink/v4/koinu',
		};
	}
	if (key === 'categories') {
		return {
			id: '',
			label: '',
			emoji: '',
			description: '',
			channelId: '',
		};
	}
	if (key === 'fields') {
		return { name: '', value: '', inline: false };
	}
	if (key === 'buttons') {
		return { id: '', label: '', emoji: '', style: 'PRIMARY', url: '' };
	}
	if (key === 'selectmenus') {
		return {
			id: '',
			placeholder: '',
			minValues: 1,
			maxValues: 1,
			options: [{ label: '', value: '', description: '', emoji: '' }],
		};
	}
	if (key === 'options') {
		return { label: '', value: '', description: '', emoji: '' };
	}
	if (key === 'templates') {
		return {
			id: '',
			name: '',
			type: 'embed',
			content: '',
			embed: {
				title: '',
				description: '',
				color: '#6C63FF',
				footer: '',
				timestamp: true,
				fields: [],
			},
		};
	}
	if (key === 'knowledgedocuments') {
		return {
			title: '',
			source: 'dashboard',
			enabled: true,
			content: '',
		};
	}
	return '';
}

function isKnowledgeDocument(value: ConfigValue): value is ConfigRecord {
	return isRecord(value) && typeof value.content === 'string';
}

function knowledgeDocuments(value: ConfigValue): ConfigRecord[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.filter(isKnowledgeDocument);
}

function fileTitle(name: string): string {
	return name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || name;
}

function primitiveKind(path: string[], value: ConfigValue) {
	const key = path[path.length - 1].toLowerCase();
	if (typeof value === 'boolean') {
		return 'boolean';
	}
	if (typeof value === 'number') {
		return 'number';
	}
	if (key.includes('color') || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value))) {
		return 'color';
	}
	if (key.includes('role')) {
		return 'role';
	}
	if (key.includes('category')) {
		return 'category';
	}
	if (key.includes('channel')) {
		return 'channel';
	}
	if (key === 'style') {
		return 'style';
	}
	if (key === 'action') {
		return 'action';
	}
	if (key === 'matchtype') {
		return 'matchType';
	}
	if (key === 'panelstyle') {
		return 'panelStyle';
	}
	if (key === 'messagetype') {
		return 'messageMode';
	}
	if (key === 'defaultmode') {
		return 'embedBuilderMode';
	}
	if (key === 'layout') {
		return 'cardLayout';
	}
	if (key === 'avatarshape') {
		return 'avatarShape';
	}
	if (key === 'type' && path.some((part) => part.toLowerCase() === 'captcha')) {
		return 'text';
	}
	if (
		key === 'type' &&
		path.some((part) =>
			['defaultmessage', 'templates'].includes(part.toLowerCase()),
		)
	) {
		return 'embedBuilderMode';
	}
	if (key === 'type') {
		return 'verificationType';
	}
	if (key === 'searchengine') {
		return 'searchEngine';
	}
	if (key === 'provider') {
		return 'provider';
	}
	if (key === 'artworkstyle') {
		return 'artwork';
	}
	if (key === 'status') {
		return 'status';
	}
	if (key === 'activitytype') {
		return 'activityType';
	}
	if (key === 'model') {
		return 'aiModel';
	}
	if (
		key.includes('message') ||
		key.includes('prompt') ||
		key.includes('knowledge') ||
		key.includes('template') ||
		key.includes('description') ||
		key === 'content' ||
		String(value ?? '').length > 90
	) {
		return 'textarea';
	}
	return 'text';
}

function SectionTitle({ path }: { path: string[] }) {
	return (
		<div className="config-section-title">
			<h3>{labelFor(path[path.length - 1])}</h3>
			{descriptionFor(path) ? <p>{descriptionFor(path)}</p> : null}
		</div>
	);
}

export function ModuleConfigForm({
	config,
	guild,
	moduleName,
	onChange,
}: ModuleConfigFormProps) {
	function update(path: string[], value: ConfigValue) {
		function visit(current: ConfigValue, depth: number): ConfigValue {
			if (depth === path.length) {
				return value;
			}

			const key = path[depth];
			if (Array.isArray(current)) {
				const next = [...current];
				next[Number(key)] = visit(next[Number(key)], depth + 1);
				return next;
			}

			const record = isRecord(current) ? current : {};
			return {
				...record,
				[key]: visit(record[key], depth + 1),
			};
		}

		onChange(visit(config, 0) as ConfigRecord);
	}

	function removeArrayItem(path: string[], index: number) {
		const items = getValue(path);
		if (!Array.isArray(items)) {
			return;
		}
		update(path, items.filter((_, itemIndex) => itemIndex !== index));
	}

	function addArrayItem(path: string[]) {
		const items = getValue(path);
		if (!Array.isArray(items)) {
			return;
		}
		update(path, [...items, defaultArrayItem(items, path)]);
	}

	function updateKnowledgeDocuments(documents: ConfigRecord[]) {
		update(['knowledgeDocuments'], documents);
	}

	function getValue(path: string[]): ConfigValue {
		return path.reduce<ConfigValue>((current, key) => {
			if (Array.isArray(current)) {
				return current[Number(key)] ?? '';
			}
			if (isRecord(current)) {
				return current[key] ?? '';
			}
			return '';
		}, config);
	}

	function renderSelect(
		path: string[],
		value: ConfigValue,
		options: Array<{ value: string; label: string }>,
		includeBlank = true,
	) {
		return (
			<select
				onChange={(event) => update(path, event.target.value)}
				value={String(value ?? '')}
			>
				{includeBlank ? <option value="">Not set</option> : null}
				{options.map((option) => (
					<option key={option.value} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		);
	}

	function renderPrimitive(path: string[], value: ConfigValue) {
		const key = path[path.length - 1];
		const kind = primitiveKind(path, value);
		const channelOptions = guild.channels.map((channel) => ({
			value: channel.id,
			label: `#${channel.name}`,
		}));
		const categoryOptions = guild.categories.map((category) => ({
			value: category.id,
			label: category.name,
		}));
		const roleOptions = guild.roles
			.filter((role) => !role.managed)
			.map((role) => ({ value: role.id, label: role.name }));

		let control: React.ReactNode;
		if (kind === 'boolean') {
			control = (
				<button
					className={`toggle ${value ? 'on' : ''}`}
					onClick={() => update(path, !value)}
					type="button"
				>
					<span />
				</button>
			);
		} else if (kind === 'number') {
			control = (
				<input
					onChange={(event) => update(path, Number(event.target.value))}
					type="number"
					value={Number(value ?? 0)}
				/>
			);
		} else if (kind === 'color') {
			control = (
				<div className="color-control">
					<input
						onChange={(event) => update(path, event.target.value)}
						type="color"
						value={String(value || '#6C63FF')}
					/>
					<input
						onChange={(event) => update(path, event.target.value)}
						value={String(value ?? '')}
					/>
				</div>
			);
		} else if (kind === 'channel') {
			control = renderSelect(path, value, channelOptions);
		} else if (kind === 'category') {
			control = renderSelect(path, value, categoryOptions);
		} else if (kind === 'role') {
			control = renderSelect(path, value, roleOptions);
		} else if (kind === 'style') {
			control = renderSelect(
				path,
				value,
				styleOptions.map((option) => ({ value: option, label: option })),
				false,
			);
		} else if (kind === 'action') {
			control = renderSelect(
				path,
				value,
				actionOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'matchType') {
			control = renderSelect(
				path,
				value,
				matchTypeOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'panelStyle') {
			control = renderSelect(
				path,
				value,
				panelStyleOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'messageMode') {
			control = renderSelect(
				path,
				value,
				messageModeOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'embedBuilderMode') {
			control = renderSelect(
				path,
				value,
				embedBuilderModeOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'cardLayout') {
			control = renderSelect(
				path,
				value,
				cardLayoutOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'avatarShape') {
			control = renderSelect(
				path,
				value,
				avatarShapeOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'verificationType') {
			control = renderSelect(
				path,
				value,
				verificationTypeOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'searchEngine') {
			control = renderSelect(
				path,
				value,
				searchEngineOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'provider') {
			control = renderSelect(
				path,
				value,
				providerOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'artwork') {
			control = renderSelect(
				path,
				value,
				artworkOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'status') {
			control = renderSelect(
				path,
				value,
				statusOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'activityType') {
			control = renderSelect(
				path,
				value,
				activityTypeOptions.map((option) => ({ value: option, label: labelFor(option) })),
				false,
			);
		} else if (kind === 'aiModel') {
			control = renderSelect(
				path,
				value,
				geminiModelOptions.map((option) => ({ value: option, label: option })),
				false,
			);
		} else if (kind === 'textarea') {
			control = (
				<textarea
					onChange={(event) => update(path, event.target.value)}
					value={String(value ?? '')}
				/>
			);
		} else {
			control = (
				<input
					onChange={(event) => update(path, event.target.value)}
					value={String(value ?? '')}
				/>
			);
		}

		return (
			<label className={`config-field ${kind === 'boolean' ? 'inline' : ''}`} key={path.join('.')}>
				<div>
					<strong>{labelFor(key)}</strong>
					{descriptionFor(path) ? <small>{descriptionFor(path)}</small> : null}
				</div>
				{control}
			</label>
		);
	}

	function renderPrimitiveArray(path: string[], items: ConfigValue[]) {
		const key = path[path.length - 1];
		const kind = primitiveKind(path, '');
		const roleOptions = guild.roles
			.filter((role) => !role.managed)
			.map((role) => ({ value: role.id, label: role.name }));
		const channelOptions = guild.channels.map((channel) => ({
			value: channel.id,
			label: `#${channel.name}`,
		}));
		const categoryOptions = guild.categories.map((category) => ({
			value: category.id,
			label: category.name,
		}));
		const options =
			kind === 'role'
				? roleOptions
				: kind === 'channel'
					? channelOptions
					: kind === 'category'
						? categoryOptions
						: null;

		return (
			<div className="config-section" key={path.join('.')}>
				<SectionTitle path={path} />
				<div className="array-list">
					{items.map((item, index) => (
						<div className="array-row" key={`${path.join('.')}-${index}`}>
							{options ? (
								renderSelect([...path, String(index)], item, options)
							) : (
								<input
									onChange={(event) =>
										update([...path, String(index)], event.target.value)
									}
									value={String(item ?? '')}
								/>
							)}
							<button onClick={() => removeArrayItem(path, index)} type="button">
								<Trash2 size={16} />
							</button>
						</div>
					))}
					<button className="ghost-button compact-button" onClick={() => addArrayItem(path)} type="button">
						<Plus size={16} />
						Add {labelFor(key)}
					</button>
				</div>
			</div>
		);
	}

	function renderArray(path: string[], items: ConfigValue[]) {
		if (items.every((item) => !isRecord(item) && !Array.isArray(item))) {
			return renderPrimitiveArray(path, items);
		}

		return (
			<div className="config-section wide" key={path.join('.')}>
				<SectionTitle path={path} />
				<div className="object-array">
					{items.map((item, index) => (
						<div className="object-array-card" key={`${path.join('.')}-${index}`}>
							<div className="object-array-header">
								<strong>{labelFor(path[path.length - 1])} {index + 1}</strong>
								<button onClick={() => removeArrayItem(path, index)} type="button">
									<Trash2 size={16} />
								</button>
							</div>
							{renderValue([...path, String(index)], item)}
						</div>
					))}
					<button className="ghost-button compact-button" onClick={() => addArrayItem(path)} type="button">
						<Plus size={16} />
						Add {labelFor(path[path.length - 1])}
					</button>
				</div>
			</div>
		);
	}

	function renderRecord(path: string[], record: ConfigRecord) {
		const entries = Object.entries(record).filter(
			([key]) =>
				key !== 'enabled' &&
				!(moduleName === 'ai' && path.length === 0 && aiManagedKeys.has(key)),
		);
		return (
			<div className={path.length === 0 ? 'config-form-grid' : 'nested-grid'} key={path.join('.')}>
				{path.length > 0 ? <SectionTitle path={path} /> : null}
				{entries.map(([key, value]) => renderValue([...path, key], value))}
			</div>
		);
	}

	function renderAiSettings() {
		const documents = knowledgeDocuments(config.knowledgeDocuments);
		return (
			<section className="ai-config-panel">
				<div className="config-section-title">
					<h3>AI Chat Support</h3>
					<p>Pick the support channel and add server knowledge for AI answers.</p>
				</div>
				<div className="ai-support-grid">
					{renderPrimitive(['supportChannel'], config.supportChannel ?? '')}
					{renderPrimitive(['knowledgeBase'], config.knowledgeBase ?? '')}
				</div>
				<AiKnowledgeDocuments
					documents={documents}
					onChange={updateKnowledgeDocuments}
				/>
			</section>
		);
	}

	function renderValue(path: string[], value: ConfigValue): React.ReactNode {
		if (Array.isArray(value)) {
			return renderArray(path, value);
		}
		if (isRecord(value)) {
			return (
				<div className="config-section" key={path.join('.')}>
					{renderRecord(path, value)}
				</div>
			);
		}
		return renderPrimitive(path, value);
	}

	return (
		<div className="module-config-form">
			{moduleName === 'ai' ? renderAiSettings() : null}
			{renderRecord([], cloneValue(config) as ConfigRecord)}
		</div>
	);
}

function AiKnowledgeDocuments({
	documents,
	onChange,
}: {
	documents: ConfigRecord[];
	onChange: (documents: ConfigRecord[]) => void;
}) {
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	function updateDocument(index: number, key: string, value: ConfigValue) {
		onChange(
			documents.map((document, documentIndex) =>
				documentIndex === index ? { ...document, [key]: value } : document,
			),
		);
	}

	function removeDocument(index: number) {
		onChange(documents.filter((_, documentIndex) => documentIndex !== index));
	}

	function addBlankDocument() {
		onChange([
			...documents,
			{
				title: '',
				source: 'dashboard',
				enabled: true,
				content: '',
			},
		]);
	}

	async function uploadFiles(files: FileList | null) {
		if (!files?.length) {
			return;
		}

		setBusy(true);
		setMessage(null);
		const nextDocuments = [...documents];
		const errors: string[] = [];

		for (const file of Array.from(files)) {
			const body = new FormData();
			body.set('file', file);

			try {
				const response = await fetch('/api/backend/extract-text', {
					method: 'POST',
					body,
				});
				const payload = (await response.json().catch(() => ({}))) as {
					title?: string;
					source?: string;
					content?: string;
					error?: string;
				};

				if (!response.ok || !payload.content) {
					errors.push(`${file.name}: ${payload.error ?? 'Could not extract text.'}`);
					continue;
				}

				nextDocuments.push({
					title: payload.title ?? fileTitle(file.name),
					source: payload.source ?? file.name,
					enabled: true,
					content: payload.content,
				});
			} catch (error) {
				errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed.'}`);
			}
		}

		onChange(nextDocuments);
		setBusy(false);
		setMessage(
			errors.length
				? errors.join(' ')
				: `Added ${nextDocuments.length - documents.length} source${
						nextDocuments.length - documents.length === 1 ? '' : 's'
					}.`,
		);
		if (inputRef.current) {
			inputRef.current.value = '';
		}
	}

	return (
		<div className="ai-knowledge">
			<div className="ai-knowledge-toolbar">
				<div>
					<strong>Knowledge Sources</strong>
					<span>{documents.length} configured</span>
				</div>
				<div className="ai-knowledge-actions">
					<input
						accept=".pdf,.txt,.md,.markdown,text/plain,text/markdown,application/pdf"
						multiple
						onChange={(event) => void uploadFiles(event.target.files)}
						ref={inputRef}
						type="file"
					/>
					<button
						className="ghost-button compact-button"
						disabled={busy}
						onClick={() => inputRef.current?.click()}
						type="button"
					>
						<FileUp size={16} />
						{busy ? 'Reading...' : 'Upload'}
					</button>
					<button className="ghost-button compact-button" onClick={addBlankDocument} type="button">
						<Plus size={16} />
						Add Note
					</button>
				</div>
			</div>
			<div className="knowledge-document-list">
				{documents.map((document, index) => (
					<div className="knowledge-document" key={`${document.source ?? 'source'}-${index}`}>
						<div className="knowledge-document-header">
							<label className="config-field inline">
								<div>
									<strong>Enabled</strong>
								</div>
								<button
									className={`toggle ${document.enabled === false ? '' : 'on'}`}
									onClick={() => updateDocument(index, 'enabled', document.enabled === false)}
									type="button"
								>
									<span />
								</button>
							</label>
							<button onClick={() => removeDocument(index)} type="button">
								<Trash2 size={16} />
							</button>
						</div>
						<label className="config-field">
							<div>
								<strong>Title</strong>
							</div>
							<input
								onChange={(event) => updateDocument(index, 'title', event.target.value)}
								value={String(document.title ?? '')}
							/>
						</label>
						<label className="config-field">
							<div>
								<strong>Source</strong>
							</div>
							<input
								onChange={(event) => updateDocument(index, 'source', event.target.value)}
								value={String(document.source ?? '')}
							/>
						</label>
						<label className="config-field">
							<div>
								<strong>Content</strong>
							</div>
							<textarea
								onChange={(event) => updateDocument(index, 'content', event.target.value)}
								value={String(document.content ?? '')}
							/>
						</label>
					</div>
				))}
			</div>
			{message ? <div className="save-message">{message}</div> : null}
		</div>
	);
}
