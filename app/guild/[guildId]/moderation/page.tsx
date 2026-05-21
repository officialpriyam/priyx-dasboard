import { ModuleHubPage } from '@/components/ModuleHubPage';

export default function ModerationPage() {
	return (
		<ModuleHubPage
			moduleNames={['core', 'automod', 'verification', 'invite']}
			subtitle="Control moderation commands, automated filters, verification, and invite safety."
			title="Moderation"
		/>
	);
}
