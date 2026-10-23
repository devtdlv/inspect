import { PageHeader } from '../components/ui/PageHeader';
import { PlaceholderPanel } from '../components/ui/PlaceholderPanel';

export function MonitorsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Monitors"
        description="HTTP/HTTPS endpoint monitors will be managed here starting in Milestone 2."
      />
      <PlaceholderPanel title="Monitor list">
        No monitors exist yet. CRUD, scheduling, and probe configuration are out of scope for
        Milestone 1.
      </PlaceholderPanel>
    </div>
  );
}
