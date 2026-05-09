import { ExternalLink } from 'lucide-react';
import type { Citation } from '@/types';

export function SourceLink({ citation }: { citation: Citation | null }) {
  if (!citation?.url) return null;
  return (
    <a
      href={citation.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-secondary hover:text-primary transition-colors"
      title={`${citation.description}${citation.date ? ` (${citation.date})` : ''}`}
    >
      <ExternalLink size={11} />
      <span className="underline underline-offset-2">{citation.date || 'Source'}</span>
    </a>
  );
}
