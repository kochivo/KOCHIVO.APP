import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { addScan, deleteScan, prepareScanFile, scanUrl, validateScan } from './data/scans';
import { scanError } from './errors';

const fake = vi.hoisted(() => ({
  upload: vi.fn(), remove: vi.fn(), insert: vi.fn(), single: vi.fn(), signed: vi.fn(), compress: vi.fn(),
}));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'player' } }, error: null }) },
  storage: { from: () => ({ upload: fake.upload, remove: fake.remove, createSignedUrl: fake.signed }) },
  from: () => ({ insert: fake.insert, delete: () => ({ eq: () => ({ select: () => ({ single: fake.single }) }) }) }),
}) }));
vi.mock('@/lib/compress-image', () => ({ compressImage: fake.compress }));
const t = createT(messages, 'en');
const input = { scan_date: '2026-11-01', weight_kg: 80, muscle_kg: null, fat_pct: null };
const now = new Date('2026-11-02T12:00:00Z');
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true });
  fake.upload.mockResolvedValue({ error: null });
  fake.remove.mockResolvedValue({ error: null });
  fake.insert.mockReturnValue({ select: () => ({ single: fake.single }) });
  fake.single.mockResolvedValue({ data: { ...input, id: 'scan' }, error: null });
});
afterEach(() => vi.unstubAllGlobals());

describe('scan inputs', () => {
  it('translates unknown network errors and preserves translated validation errors', () => {
    expect(scanError(new Error('Failed to fetch'), t, 'saveError')).toBe(t('saveError'));
    expect(scanError(new Error(t('offline')), t, 'deleteError')).toBe(t('offline'));
  });
  it('requires a real nonfuture date and at least one finite, in-range number with one decimal', () => {
    expect(validateScan(input, '2026-11-02')).toBe(true);
    for (const scan_date of ['2026-11-03', '2026-02-30', 'invalid']) expect(validateScan({ ...input, scan_date }, '2026-11-02')).toBe(false);
    for (const weight_kg of [NaN, Infinity, 19.9, 400.1, 80.11, null]) expect(validateScan({ ...input, weight_kg }, '2026-11-02')).toBe(false);
    expect(validateScan({ ...input, weight_kg: null, muscle_kg: 5 }, '2026-11-02')).toBe(true);
    expect(validateScan({ ...input, muscle_kg: 150.1 }, '2026-11-02')).toBe(false);
    expect(validateScan({ ...input, fat_pct: 2.9 }, '2026-11-02')).toBe(false);
  });
  it('passes PDFs unchanged and rejects oversized or unsupported files', async () => {
    const pdf = new File(['scan'], 'scan.pdf', { type: 'application/pdf' });
    expect(await prepareScanFile(pdf, t)).toBe(pdf);
    await expect(prepareScanFile(new File([new Uint8Array(5242881)], 'large.pdf', { type: 'application/pdf' }), t)).rejects.toThrow(t('fileError'));
    await expect(prepareScanFile(new File(['x'], 'scan.svg', { type: 'image/svg+xml' }), t)).rejects.toThrow(t('fileError'));
    expect(fake.compress).not.toHaveBeenCalled();
  });
  it('falls back to strict JPEG compression when WebP encoding fails', async () => {
    const file = new File(['photo'], 'scan.jpg', { type: 'image/jpeg' });
    const jpeg = new Blob(['compressed'], { type: 'image/jpeg' });
    fake.compress.mockRejectedValueOnce(new Error('WebP unavailable')).mockResolvedValueOnce(jpeg);
    expect(await prepareScanFile(file, t)).toBe(jpeg);
    expect(fake.compress).toHaveBeenNthCalledWith(1, file, 2000, 0.85, t, true, 'image/webp');
    expect(fake.compress).toHaveBeenNthCalledWith(2, file, 2000, 0.85, t, true, 'image/jpeg');
  });
});

describe('network writes', () => {
  it('blocks writes offline before making requests', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    await expect(addScan(input, null, now, t)).rejects.toThrow(t('offline'));
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it('saves without a file and uploads PDFs to a fresh uuidv7 path', async () => {
    await addScan(input, null, now, t);
    expect(fake.upload).not.toHaveBeenCalled();
    await addScan(input, new File(['scan'], 'scan.pdf', { type: 'application/pdf' }), now, t);
    expect(fake.upload).toHaveBeenCalledWith(expect.stringMatching(/^player\/[0-9a-f-]{14}7[0-9a-f-]+\.pdf$/), expect.any(Blob),
      { contentType: 'application/pdf', upsert: false });
  });
  it('cleans up an upload when the row insert fails', async () => {
    fake.single.mockResolvedValueOnce({ error: { message: 'duplicate date' } });
    await expect(addScan(input, new File(['scan'], 'scan.pdf', { type: 'application/pdf' }), now, t)).rejects.toThrow(t('saveError'));
    expect(fake.remove).toHaveBeenCalledWith([fake.upload.mock.calls[0]?.[0]]);
  });
  it('does not insert after an upload fails', async () => {
    fake.upload.mockResolvedValueOnce({ error: { message: 'upload failed' } });
    await expect(addScan(input, new File(['scan'], 'scan.pdf', { type: 'application/pdf' }), now, t)).rejects.toThrow();
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it('retains the row for retry when file deletion fails', async () => {
    fake.remove.mockResolvedValueOnce({ error: { message: 'storage unavailable' } });
    await expect(deleteScan({ ...input, id: 'scan', player_id: 'player', created_at: '', file_path: 'player/scan.pdf' }, t)).rejects.toThrow(t('deleteError'));
    expect(fake.single).not.toHaveBeenCalled();
  });
  it('retries deletion when the row delete fails after storage cleanup', async () => {
    const row = { ...input, id: 'scan', player_id: 'player', created_at: '', file_path: 'player/scan.pdf' };
    fake.single.mockResolvedValueOnce({ error: { message: 'database unavailable' } });
    await expect(deleteScan(row, t)).rejects.toThrow(t('deleteError'));
    await deleteScan(row, t);
    expect(fake.remove).toHaveBeenCalledTimes(2);
    expect(fake.single).toHaveBeenCalledTimes(2);
  });
  it('signs private documents for 60 minutes', async () => {
    fake.signed.mockResolvedValueOnce({ data: { signedUrl: 'signed' }, error: null });
    expect(await scanUrl('player/scan.pdf')).toBe('signed');
    expect(fake.signed).toHaveBeenCalledWith('player/scan.pdf', 3600);
  });
});
