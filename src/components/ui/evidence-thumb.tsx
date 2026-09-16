'use client';
import { useEffect, useState } from 'react';
import { fetchEvidenceBlobUrl } from '@/features/checklist-instances/api';

export function EvidenceThumb({ evidenceId, fileName }: { evidenceId: string; fileName: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchEvidenceBlobUrl(evidenceId).then((u) => {
      if (cancelled) {
        URL.revokeObjectURL(u);
        return;
      }
      objectUrl = u;
      setUrl(u);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [evidenceId]);

  if (!url) return <div className="evidence-thumb loading" />;
  return (
    <a href={url} download={fileName} className="evidence-thumb">
      <img src={url} alt={fileName} />
    </a>
  );
}
