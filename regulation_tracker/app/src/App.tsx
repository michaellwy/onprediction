import { DashboardShell } from '@/components/layout/DashboardShell';
import { useViewNavigation } from '@/hooks/useViewNavigation';
import { GlobalMapView } from '@/components/views/GlobalMap';
import { USLandscapeView } from '@/components/views/USLandscape';
import { LitigationTrackerView } from '@/components/views/LitigationTracker';
import { PlatformComparisonView } from '@/components/views/PlatformComparison';
import { TimelineView } from '@/components/views/Timeline';
import { BattlegroundAnalysisView } from '@/components/views/BattlegroundAnalysis';
import { StakeholderMapView } from '@/components/views/StakeholderMap';
import { RiskOpportunityView } from '@/components/views/RiskOpportunity';

function ViewContent({ view }: { view: string }) {
  switch (view) {
    case 'map': return <GlobalMapView />;
    case 'us': return <USLandscapeView />;
    case 'litigation': return <LitigationTrackerView />;
    case 'platforms': return <PlatformComparisonView />;
    case 'timeline': return <TimelineView />;
    case 'battlegrounds': return <BattlegroundAnalysisView />;
    case 'stakeholders': return <StakeholderMapView />;
    case 'risk': return <RiskOpportunityView />;
    default: return <GlobalMapView />;
  }
}

export default function App() {
  const { activeView, navigate } = useViewNavigation();

  return (
    <DashboardShell activeView={activeView} onNavigate={navigate}>
      <ViewContent view={activeView} />
    </DashboardShell>
  );
}
