import { ModuleHubPage } from '@/components/ModuleHubPage';

export default function SuggestionsPage() {
	return (
		<ModuleHubPage
			moduleNames={['suggestion']}
			subtitle="Configure suggestion channels, voting buttons, review roles, and status colors."
			title="Suggestions"
		/>
	);
}
