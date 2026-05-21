import { ModuleHubPage } from '@/components/ModuleHubPage';

export default function AuditLogsPage() {
	return (
		<ModuleHubPage
			moduleNames={['core', 'automod', 'ticket', 'invite']}
			subtitle="Configure channels and modules that write moderation, ticket, and invite activity."
			title="Logging"
		/>
	);
}
