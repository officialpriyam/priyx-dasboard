import { redirect } from 'next/navigation';

export default async function EmbedBuilderPage({
	params,
}: {
	params: Promise<{ guildId: string }>;
}) {
	const { guildId } = await params;
	redirect(`/guild/${guildId}/module/embed-builder`);
}
