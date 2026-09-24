'use client';
import { useEffect, useState } from 'react';

export function CommentFileThumb({
  commentId,
  fileName,
  fetchUrl
}: {
  commentId: string;
  fileName: string;
  fetchUrl: (commentId: string) => Promise<string>;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    fetchUrl(commentId).then((u) => {
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
  }, [commentId, fetchUrl]);

  if (!url) return <div className="evidence-thumb loading" />;
  return (
    <a href={url} download={fileName} className="evidence-thumb">
      <img src={url} alt={fileName} />
    </a>
  );
}
