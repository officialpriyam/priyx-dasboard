import fs from 'node:fs/promises';
import path from 'node:path';

export type ContentPageKey = 'terms' | 'privacy' | 'license' | 'about';

export interface DashboardContent {
	terms: string;
	privacy: string;
	license: string;
	about: string;
}

const defaultContent: DashboardContent = {
	terms:
		'Priyx Dashboard Terms\n\nAdd your terms of service content from /backend/admin.',
	privacy:
		'Priyx Dashboard Privacy Policy\n\nAdd your privacy policy content from /backend/admin.',
	license:
		'Priyx Dashboard License\n\nAdd your license content from /backend/admin.',
	about:
		'About Priyx\n\nAdd your about page content from /backend/admin.',
};

function contentPath(): string {
	return path.resolve(process.cwd(), 'data', 'dashboard-content.json');
}

export async function readDashboardContent(): Promise<DashboardContent> {
	try {
		const raw = await fs.readFile(contentPath(), 'utf8');
		return { ...defaultContent, ...(JSON.parse(raw) as Partial<DashboardContent>) };
	} catch {
		return defaultContent;
	}
}

export async function writeDashboardContent(
	content: DashboardContent,
): Promise<DashboardContent> {
	await fs.mkdir(path.dirname(contentPath()), { recursive: true });
	await fs.writeFile(contentPath(), JSON.stringify(content, null, 2), 'utf8');
	return content;
}

export function contentTitle(key: ContentPageKey): string {
	const titles: Record<ContentPageKey, string> = {
		terms: 'Terms of Service',
		privacy: 'Privacy Policy',
		license: 'License',
		about: 'About Priyx',
	};
	return titles[key];
}
