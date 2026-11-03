'use client';

import { useState } from 'react';
import { Button } from '@/ui';
import { exportMyData } from '../data/settings';
import { buildExport, exportFileName } from '../export';

export function ExportCard() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function download() {
    setPending(true); setMessage('');
    try {
      const result = await exportMyData();
      if (result.error || !result.data) { setMessage(result.error ?? 'جرّب تاني'); return; }
      const now = new Date();
      const blob = new Blob([JSON.stringify(buildExport(result.data, now), null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      try {
        anchor.href = url; anchor.download = exportFileName(now);
        document.body.append(anchor); anchor.click();
        setMessage('ملف بياناتك جاهز');
      } finally { anchor.remove(); URL.revokeObjectURL(url); }
    } catch { setMessage('التنزيل متعملش. جرّب تاني'); }
    finally { setPending(false); }
  }
  return <section className="glass space-y-4 rounded-card p-6">
    <h2 className="text-lg font-bold">نزّل بياناتك</h2>
    <p className="text-sm text-muted">ملف واحد فيه بياناتك. الصور والفيديوهات بتظهر كمسارات بس.</p>
    <Button variant="ghost" className="min-h-12" disabled={pending} onClick={() => void download()}>
      {pending ? 'بنجهّز بياناتك...' : 'نزّل بياناتك'}
    </Button>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}
