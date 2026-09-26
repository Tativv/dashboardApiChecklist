'use client';
import { useEffect, useRef, useState } from 'react';
import { downloadPdf, getPdfPreviewUrl, GeneratedPdf } from '@/lib/pdf';

export function PdfPreviewModal({ pdf, onClose }: { pdf: GeneratedPdf; onClose: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const blobUrl = getPdfPreviewUrl(pdf.doc);
    setUrl(blobUrl);
    return () => URL.revokeObjectURL(blobUrl);
  }, [pdf]);

  function onPrint() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  }

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
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          width: '100%',
          maxWidth: 920,
          height: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            padding: '14px 18px',
            borderBottom: '1px solid var(--line)',
            flexWrap: 'wrap'
          }}
        >
          <b style={{ fontSize: 14 }}>{pdf.filename}</b>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-primary" onClick={() => downloadPdf(pdf)}>
              Baixar PDF
            </button>
            <button type="button" className="btn btn-secondary" onClick={onPrint} disabled={!url}>
              Imprimir
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
        <div style={{ flex: 1, background: '#f1f5f9' }}>
          {url && <iframe ref={iframeRef} src={url} title={pdf.filename} style={{ width: '100%', height: '100%', border: 'none' }} />}
        </div>
      </div>
    </div>
  );
}
