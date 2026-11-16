import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { ProfileRetry } from './components/profile-retry';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

it('offers a secondary retry that refreshes the server profile', () => {
  const button = ProfileRetry({ label: 'Retry' });
  expect(renderToStaticMarkup(createElement(ProfileRetry, { label: 'Retry' }))).toMatch(/control-secondary[^>]*>Retry<\/button>/);
  button.props.onClick();
  expect(refresh).toHaveBeenCalledOnce();
});
