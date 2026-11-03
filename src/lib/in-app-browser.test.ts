import { expect, it } from 'vitest';
import { detectInAppBrowser } from './in-app-browser';

const ios = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const android = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36';
it.each([
  [`${ios} Mobile/15E148 Instagram 322.0.0.20.95`, 'instagram'],
  [`${ios} Mobile/15E148 [FBAN/FBIOS;FBAV/450.0.0.32.109;FBBV/571119422;]`, 'facebook'],
  [`${android} [FB_IAB/FB4A;FBAV/450.0.0.0.1;]`, 'facebook'],
  [`${ios} Mobile/15E148 [FBAN/MessengerForiOS;FBAV/450.0.0.1;]`, 'messenger'],
  [`${android} musical_ly_2023508030 JsSdk/1.0 NetType/WIFI`, 'tiktok'],
  [`${android} BytedanceWebview/d8a21c6`, 'tiktok'],
  [`${ios} Mobile/15E148 Snapchat/12.80.0.35`, 'snapchat'],
  [`${ios} Version/17.4 Mobile/15E148 Safari/604.1`, null],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36', null],
  ['', null],
] as const)('detects %s', (ua, expected) => expect(detectInAppBrowser(ua)).toBe(expected));
