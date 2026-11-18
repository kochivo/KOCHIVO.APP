import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { SuspendedScreen } from './components/suspended-screen';

const config = vi.hoisted(() => ({ ownerWhatsapp: '' }));
vi.mock('@/lib/public-config', () => ({ publicConfig: config }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock('./data/sign-out', () => ({ signOut() {} }));

it.each([['201100539306', 'https://wa.me/201100539306'], ['', 'mailto:support@kochivo.site']])(
  'gives the support action a primary link when the configured number is %j', async (phone, href) => {
    config.ownerWhatsapp = phone;
    const html = renderToStaticMarkup(await SuspendedScreen());
    expect(html).toMatch(new RegExp(`control-primary[^"]*" href="${href}"`));
    expect(html).toMatch(/<button[^>]*control-secondary/);
  },
);
