'use client';

import { useId, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { Video } from 'lucide-react';
import { enqueueMedia, localDb } from '@/core/offline';
import { Button, TextField } from '@/ui';

const ALLOWED = ['video/mp4', 'video/quicktime', 'video/webm'];
const MAX_BYTES = 50 * 1024 * 1024;

export function FormCheckButton({ exerciseId, setLogId }: { exerciseId: string; setLogId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const sheet = useRef<HTMLDialogElement>(null);
  const saving = useRef(false);
  const titleId = useId();
  const [selection, setSelection] = useState<{ file: File; exerciseId: string; setLogId: string } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setSaved(false);
    setError(null);
    if (!ALLOWED.includes(file.type)) { setError('نوع الفيديو مش مدعوم'); return; }
    if (file.size > MAX_BYTES) { setError('الفيديو لازم يبقى أقل من 50 ميجا'); return; }
    setSelection({ file, exerciseId, setLogId });
    setNote('');
    sheet.current?.showModal();
  }

  async function save() {
    if (!selection || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await enqueueMedia(localDb(), { kind: 'form_check', blob: selection.file, mime: selection.file.type,
        exercise_id: selection.exerciseId, set_log_id: selection.setLogId, note: note.trim() || null }, Date.now());
      setSaved(true);
      setSelection(null);
      sheet.current?.close();
    } catch {
      setError('مش قادرين نحفظ الفيديو على الموبايل. جرّب تاني');
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  return <div className="space-y-2">
    <Button variant="ghost" className="min-h-12" aria-label="صوّر الفورم" onClick={() => input.current?.click()}>
      <Video aria-hidden />صوّر الفورم
    </Button>
    <input ref={input} type="file" accept="video/*" capture="environment" className="hidden"
      aria-label="اختار فيديو الفورم" onChange={select} />
    {saved && <p role="status" className="text-sm text-muted">اتحفظ. هيتبعت للكابتن لما النت يكون كويس</p>}
    {error && !selection && <p role="alert" className="text-sm text-danger">{error}</p>}
    <dialog ref={sheet} dir="rtl" aria-labelledby={titleId} onCancel={() => setSelection(null)}
      className="glass-strong m-auto w-full max-w-sm rounded-card p-5 text-ink">
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <h2 id={titleId} className="font-bold">فيديو الفورم</h2>
        <TextField label="ملاحظة للكابتن (اختياري)" value={note} maxLength={500}
          onChange={(event) => setNote(event.target.value)} disabled={busy} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="min-h-12" disabled={busy}>{busy ? 'بيتحفظ…' : 'ابعته للكابتن'}</Button>
          <Button variant="ghost" className="min-h-12" disabled={busy}
            onClick={() => { sheet.current?.close(); setSelection(null); }}>كمّل التمرين</Button>
        </div>
      </form>
    </dialog>
  </div>;
}
