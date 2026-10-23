import { PageHeader } from '../components/ui/PageHeader';
import { PlaceholderPanel } from '../components/ui/PlaceholderPanel';

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Settings"
        description="Workspace preferences, notification channels, and account settings will appear in later milestones."
      />
      <PlaceholderPanel title="Workspace settings">
        Authentication and workspace configuration are not implemented in Milestone 1.
      </PlaceholderPanel>
    </div>
  );
}
