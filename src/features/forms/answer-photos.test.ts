import { afterEach, expect, it, vi } from 'vitest';
import { uploadAnswerPhotos } from './data/answer-photos';

const { upload } = vi.hoisted(() => ({ upload: vi.fn(async () => ({ error: null })) }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ storage: { from: () => ({ upload }) } }) }));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '00000000-0000-7000-8000-000000000001' }));
const files = (file: File) => [file] as unknown as FileList;
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it('resizes a 7 MB photo before upload and uses the encoded MIME type and extension', async () => {
  const blob = new Blob(['compressed'], { type: 'image/jpeg' });
  const dimensions: number[][] = [];
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', async () => ({ width: 4000, height: 3000, close }));
  vi.stubGlobal('OffscreenCanvas', class {
    constructor(width: number, height: number) { dimensions.push([width, height]); }
    getContext() { return { drawImage: () => {} }; }
    async convertToBlob() { return blob; }
  });
  const result = await uploadAnswerPhotos('player', 'request', files(new File([new Uint8Array(7 * 1024 * 1024)], 'photo.png', { type: 'image/png' })));
  expect(dimensions).toEqual([[1600, 1200]]);
  expect(upload).toHaveBeenCalledWith(result[0], blob, { contentType: 'image/jpeg' });
  expect(result[0]).toMatch(/\.jpg$/);
  expect(close).toHaveBeenCalledOnce();
});

it('rejects an image that cannot fit without uploading it', async () => {
  vi.stubGlobal('createImageBitmap', undefined);
  await expect(uploadAnswerPhotos('player', 'request', files(new File([new Uint8Array(7 * 1024 * 1024)], 'photo.jpg', { type: 'image/jpeg' }))))
    .rejects.toThrow('photo cannot fit');
  expect(upload).not.toHaveBeenCalled();
});

it('keeps a small supported original when image decoding is unavailable', async () => {
  vi.stubGlobal('createImageBitmap', undefined);
  const file = new File(['photo'], 'photo.png', { type: 'image/png' });
  const result = await uploadAnswerPhotos('player', 'request', files(file));
  expect(upload).toHaveBeenCalledWith(result[0], file, { contentType: 'image/png' });
  expect(result[0]).toMatch(/\.png$/);
});

it('rejects encoded output above the bucket limit', async () => {
  vi.stubGlobal('createImageBitmap', async () => ({ width: 1600, height: 1200, close: () => {} }));
  vi.stubGlobal('OffscreenCanvas', class {
    getContext() { return { drawImage: () => {} }; }
    async convertToBlob() { return new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' }); }
  });
  await expect(uploadAnswerPhotos('p', 'r', files(new File([new Uint8Array(7 * 1024 * 1024)], 'a.jpg', { type: 'image/jpeg' }))))
    .rejects.toThrow('photo cannot fit');
  expect(upload).not.toHaveBeenCalled();
});
