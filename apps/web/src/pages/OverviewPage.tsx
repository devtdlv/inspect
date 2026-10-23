import { ApiStatusCard } from '../components/ApiStatusCard';
import { PageHeader } from '../components/ui/PageHeader';
import { PlaceholderPanel } from '../components/ui/PlaceholderPanel';

export function OverviewPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Overview"
        description="Foundation shell for Inspect. Live API status is shown below. Monitoring analytics arrive in later milestones."
      />

      <ApiStatusCard />

      <PlaceholderPanel title="Dashboard summary">
        Uptime percentages, latency charts, and monitor counts are intentionally omitted in
        Milestone 1. This panel is a layout placeholder only.
      </PlaceholderPanel>
    </div>
  );
}
