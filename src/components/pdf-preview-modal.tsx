'use client';
import { useEffect, useState } from 'react';
import { getPdfPreviewUrl, GeneratedPdf } from '@/lib/pdf';

export function PdfPreviewModal({ pdf, onClose }: { pdf: GeneratedPdf; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const blobUrl = getPdfPreviewUrl(pdf.doc);
    setUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [pdf]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          background: '#fff',
          borderRadius: 10,
          width: '100%',
          maxWidth: '1400px',
          height: '96vh',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          title="Fechar"
          aria-label="Fechar"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 1,
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(15, 23, 42, 0.7)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            lineHeight: 1
          }}
        >
          ✕
        </button>
        <div style={{ width: '100%', height: '100%', background: '#f1f5f9' }}>
          {url && <iframe src={url} title={pdf.filename} style={{ width: '100%', height: '100%', border: 'none' }} />}
        </div>
      </div>
    </div>
  );
}
