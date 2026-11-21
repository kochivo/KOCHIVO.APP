import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeDataUrl } from './data-url.mjs';

test('preserves MP4 bytes when the MIME type contains audio and video codecs', () => {
  const bytes = Buffer.from([0, 0, 0, 32, 102, 116, 121, 112]);
  const url = `data:video/mp4;codecs=avc1.640028,mp4a.40.2;base64,${bytes.toString('base64')}`;
  assert.deepEqual(decodeDataUrl(url), bytes);
});

test('rejects a non-base64 response instead of silently writing a corrupt file', () => {
  assert.throws(() => decodeDataUrl('data:text/plain,invalid'));
});
