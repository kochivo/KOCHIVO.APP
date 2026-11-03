'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { pickRecorderType, recordedSeconds } from '../audio';
import { shouldStopVoiceRecording } from '@/lib/upload-guards';
import { useT } from '@/core/i18n/client';
import { useToast } from '@/ui/toast';
import { messages } from '../messages';

export type RecorderState =
  | { status: 'idle' }
  | { status: 'recording'; seconds: number }
  | { status: 'recorded'; blob: Blob; url: string; seconds: number }
  | { status: 'denied' }
  | { status: 'unsupported' };

export function useRecorder() {
  const t = useT(messages);
  const toast = useToast();
  const [state, setState] = useState<RecorderState>({ status: 'idle' });
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const preview = useRef<string | null>(null);

  const release = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);
  const clearPreview = () => {
    if (preview.current) URL.revokeObjectURL(preview.current);
    preview.current = null;
  };

  const stop = useCallback(() => {
    if (recorder.current?.state === 'recording') recorder.current.stop();
  }, []);

  const start = async () => {
    if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return setState({ status: 'unsupported' });
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return setState({ status: 'denied' }); }
    clearPreview();
    const mimeType = pickRecorderType((type) => MediaRecorder.isTypeSupported(type));
    const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const startedAt = performance.now();
    media.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    media.onstop = () => {
      release();
      const blob = new Blob(chunks, { type: media.mimeType || mimeType || 'audio/webm' });
      preview.current = URL.createObjectURL(blob);
      setState({ status: 'recorded', blob, url: preview.current, seconds: recordedSeconds(performance.now() - startedAt) });
    };
    recorder.current = media;
    media.start();
    setState({ status: 'recording', seconds: 0 });
    timer.current = setInterval(() => {
      const seconds = Math.floor((performance.now() - startedAt) / 1000);
      if (shouldStopVoiceRecording(performance.now() - startedAt)) {
        if (media.state === 'recording') { stop(); toast.success(t('recordingLimitReached')); }
      }
      else setState({ status: 'recording', seconds });
    }, 250);
  };

  const reset = () => { clearPreview(); setState({ status: 'idle' }); };

  useEffect(() => () => {
    release();
    if (recorder.current?.state === 'recording') {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    clearPreview();
  }, [release]);

  return { state, start, stop, reset };
}
