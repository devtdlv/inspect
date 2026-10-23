import { PageHeader } from '../components/ui/PageHeader';
import { PlaceholderPanel } from '../components/ui/PlaceholderPanel';

export function IncidentsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Incidents"
        description="Incident detection, history, and recovery timelines arrive in Milestone 5."
      />
      <PlaceholderPanel title="Incident timeline">
        This view is a navigation placeholder. No fabricated incident data is shown.
      </PlaceholderPanel>
    </div>
  );
}
