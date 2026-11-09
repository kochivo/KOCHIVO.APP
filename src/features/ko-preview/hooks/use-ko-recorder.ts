'use client';

import { useEffect, useRef, useState } from 'react';
import { koMaxAudio, koRecordMs } from '../agent-limits';

type Capture = { stop: () => void; dispose: () => void };

export function useKoRecorder(onClip: (clip: Blob) => void, onError: () => void) {
  const [status, setStatus] = useState<'idle' | 'starting' | 'recording'>('idle');
  const sequence = useRef(0);
  const active = useRef<Capture | null>(null);
  useEffect(() => () => {
    sequence.current += 1;
    active.current?.dispose();
  }, []);

  async function start() {
    const id = ++sequence.current;
    setStatus('starting');
    let stream: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const microphone = stream;
      const release = () => microphone.getTracks().forEach(track => track.stop());
      if (id !== sequence.current) { release(); return; }
      const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(value => MediaRecorder.isTypeSupported(value));
      const recorder = new MediaRecorder(microphone, { mimeType: type, audioBitsPerSecond: 32_000 });
      const chunks: Blob[] = [];
      const stop = () => { if (recorder.state === 'recording') recorder.stop(); };
      const timer = window.setTimeout(stop, koRecordMs);
      const dispose = () => {
        window.clearTimeout(timer);
        recorder.onstop = null;
        recorder.ondataavailable = null;
        recorder.onerror = null;
        try { stop(); } finally { release(); }
      };
      active.current = { stop, dispose };
      const finish = (clip?: Blob) => {
        dispose();
        active.current = null;
        if (id !== sequence.current) return;
        setStatus('idle');
        if (clip && clip.size > 0 && clip.size <= koMaxAudio) onClip(clip);
        else onError();
      };
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => finish(new Blob(chunks, { type: recorder.mimeType || chunks[0]?.type }));
      recorder.onerror = () => finish();
      recorder.start();
      setStatus('recording');
    } catch {
      active.current?.dispose();
      active.current = null;
      stream?.getTracks().forEach(track => track.stop());
      if (id === sequence.current) {
        setStatus('idle');
        onError();
      }
    }
  }

  return { status, start, stop: () => active.current?.stop() };
}
