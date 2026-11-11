import { actionTimezone } from '@/core/timezone/action-timezone';
import { readPlayerTimezone } from '@/core/timezone/player-timezone';
import { internationalEnabled } from '@/lib/international-enabled';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { signedMediaUrl } from '@/core/storage/private-media';
import { compressImage } from '@/lib/compress-image';
import { localDate } from '@/lib/dates';
import type { Scan, ScanInput, ScanTranslator } from '../types';

const bucketName = 'body-scans';
const maxSize = 5 * 1024 * 1024;

export async function listScans(playerId?: string) {
  const client = await loadSupabaseBrowser();
  let owner = playerId;
  if (!owner) {
    const auth = await client.auth.getUser();
    if (auth.error || !auth.data.user) throw new Error('Authentication failed');
    owner = auth.data.user.id;
  }
  const [rows, intake] = await Promise.all([
    client.from('body_scans').select('*').eq('player_id', owner).order('scan_date'),
    client.from('player_intake').select('target_weight_kg').eq('player_id', owner).maybeSingle(),
  ]);
  if (rows.error || intake.error) throw new Error('Loading scans failed');
  return { scans: rows.data, target: intake.data?.target_weight_kg ?? null,
    ...(internationalEnabled() ? { timezone: await readPlayerTimezone(client, owner) } : {}) };
}

export function validateScan(input: ScanInput, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.scan_date) || input.scan_date > today) return false;
  const date = new Date(`${input.scan_date}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || localDate(date, 'UTC') !== input.scan_date) return false;
  const values = [[input.weight_kg, 20, 400], [input.muscle_kg, 5, 150], [input.fat_pct, 3, 70]] as const;
  return values.some(([value]) => value != null) && values.every(([value, min, max]) =>
    value == null || (Number.isFinite(value) && value >= min && value <= max && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8));
}

export async function prepareScanFile(file: File, t: ScanTranslator): Promise<Blob> {
  if (!['application/pdf', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error(t('fileError'));
  if (file.type === 'application/pdf') {
    if (file.size > maxSize) throw new Error(t('fileError'));
    return file;
  }
  return compressImage(file, 2000, 0.85, t, true, 'image/webp')
    .catch(() => compressImage(file, 2000, 0.85, t, true, 'image/jpeg'));
}

export async function addScan(input: ScanInput, file: File | null, now: Date, t: ScanTranslator): Promise<Scan> {
  if (!navigator.onLine) throw new Error(t('offline'));
  if (!validateScan(input, localDate(now, actionTimezone()))) throw new Error(t('invalid'));
  const blob = file ? await prepareScanFile(file, t) : null;
  const client = await loadSupabaseBrowser();
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data.user) throw new Error(t('saveError'));
  const playerId = auth.data.user.id;
  const bucket = client.storage.from(bucketName);
  let path: string | null = null;
  if (blob) {
    const ext = blob.type === 'application/pdf' ? 'pdf' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    path = `${playerId}/${uuidv7()}.${ext}`;
    const upload = await bucket.upload(path, blob, { contentType: blob.type, upsert: false });
    if (upload.error) throw new Error(t('saveError'));
  }
  try {
    const result = await client.from('body_scans').insert({ ...input, id: uuidv7(), player_id: playerId, file_path: path }).select().single();
    if (result.error) throw new Error(t('saveError'));
    return result.data;
  } catch (error) {
    if (path) await bucket.remove([path]).catch(() => undefined);
    throw error;
  }
}

export async function deleteScan(scan: Scan, t: ScanTranslator) {
  if (!navigator.onLine) throw new Error(t('offline'));
  const client = await loadSupabaseBrowser();
  // Keep the row available for retry if storage deletion fails.
  if (scan.file_path) {
    const removed = await client.storage.from(bucketName).remove([scan.file_path]);
    if (removed.error) throw new Error(t('deleteError'));
  }
  const result = await client.from('body_scans').delete().eq('id', scan.id).select('id').single();
  if (result.error) throw new Error(t('deleteError'));
}

export async function scanUrl(path: string) {
  return signedMediaUrl(await loadSupabaseBrowser(), bucketName, path, 3600);
}
