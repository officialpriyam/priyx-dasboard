import Link from 'next/link';
import { Bot } from 'lucide-react';
import {
	contentTitle,
	readDashboardContent,
	type ContentPageKey,
} from '@/lib/contentStore';

export async function ContentPage({ pageKey }: { pageKey: ContentPageKey }) {
	const content = await readDashboardContent();
	return (
		<main className="content-page">
			<Link className="content-brand" href="/login">
				<div className="brand-mark">
					<Bot size={22} />
				</div>
				<strong>Priyx Dashboard</strong>
			</Link>
			<article className="content-document">
				<h1>{contentTitle(pageKey)}</h1>
				<pre>{content[pageKey]}</pre>
			</article>
		</main>
	);
}
