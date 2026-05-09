import { useState, useEffect, useCallback } from 'react';

export type ViewId =
  | 'map'
  | 'us'
  | 'litigation'
  | 'platforms'
  | 'timeline'
  | 'battlegrounds'
  | 'stakeholders'
  | 'risk';

export const VIEW_LABELS: Record<ViewId, string> = {
  map: 'Global Map',
  us: 'US Landscape',
  litigation: 'Litigation & Legislation',
  platforms: 'Platform Comparison',
  timeline: 'Timeline',
  battlegrounds: 'Battlegrounds',
  stakeholders: 'Stakeholders',
  risk: 'Risk & Opportunity',
};

function getHashView(): ViewId {
  const hash = window.location.hash.slice(1);
  if (hash in VIEW_LABELS) return hash as ViewId;
  return 'map';
}

export function useViewNavigation() {
  const [activeView, setActiveView] = useState<ViewId>(getHashView);

  useEffect(() => {
    const onHash = () => setActiveView(getHashView());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((view: ViewId) => {
    window.location.hash = view;
    setActiveView(view);
  }, []);

  return { activeView, navigate };
}
