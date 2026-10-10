'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';

/**
 * Shows a saved lease agreement (Word file at `url`, for staff or the student) on the page, rendered with docx-preview
 * inside an iframe so it can be printed on its own. Download gives the original .docx.
 */
export function AgreementViewer({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        const { renderAsync } = await import('docx-preview');
        const doc = frame.current?.contentDocument;
        if (!doc || cancelled) return;
        doc.open();
        doc.write('<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#e5e7eb}@media print{body{background:none}}</style></head><body></body></html>');
        doc.close();
        await renderAsync(blob, doc.body, doc.head, { inWrapper: true, hideWrapperOnPrint: true, breakPages: true, renderHeaders: true, renderFooters: true });
        if (!cancelled) setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex h-full max-h-[calc(100dvh-2rem)] w-full max-w-5xl min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-gray-900">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold truncate">{title}</h2>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => frame.current?.contentWindow?.print()} disabled={state !== 'ready'}
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5 disabled:opacity-50">
              <Printer className="h-4 w-4" /> Print
            </button>
            <a href={`${url}?download=1`} download
              className="px-3 py-1.5 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Download .docx
            </a>
            <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          {state !== 'ready' && (
            <p className={`absolute inset-0 flex items-center justify-center text-sm ${state === 'error' ? 'text-red-600' : 'text-gray-500'}`}>
              {state === 'error' ? "Couldn't show the agreement. Use Download to open it in Word." : 'Loading agreement…'}
            </p>
          )}
          <iframe ref={frame} title={title} className={`w-full h-full rounded-b-lg ${state === 'ready' ? '' : 'invisible'}`} />
        </div>
      </div>
    </div>
  );
}
