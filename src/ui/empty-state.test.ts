import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Inbox } from 'lucide-react';
import { expect, it } from 'vitest';
import { EmptyState } from './empty-state';
import { secondaryButtonClass } from './secondary-button-class';

it('renders link actions as accessible links, including secondary actions', () => {
  const html = renderToStaticMarkup(createElement(EmptyState, {
    icon: Inbox, title: 'Ready for your first player', body: 'Invite a player to begin',
    action: { label: 'Invite player', href: '/captain/players?invite=1' },
    secondary: { label: 'Templates', href: '/captain/templates' },
  }));
  expect(html).toContain('href="/captain/players?invite=1"');
  expect(html).toContain('>Invite player</a>');
  expect(html).toContain('href="/captain/templates"');
  expect(html).not.toContain('<button');
});

it('keeps callback actions as buttons', () => {
  const html = renderToStaticMarkup(createElement(EmptyState, {
    icon: Inbox, title: 'No matches', body: 'Try another search',
    action: { label: 'Clear search', onClick() {} },
  }));
  expect(html).toContain('>Clear search</button>');
  expect(html).not.toContain('<a ');
});

it('gives secondary links a persistent surface and a full touch target', () => {
  const html = renderToStaticMarkup(createElement(EmptyState, {
    icon: Inbox, title: 'No matches', body: 'Try again', secondary: { label: 'Help', href: '/help' },
  }));
  expect(html).toContain('href="/help"');
  expect(html).toContain(`class="${secondaryButtonClass}"`);
  expect(html).toContain('glass');
  expect(html).toContain('min-h-12');
  expect(html).not.toContain('bg-transparent');
});

it.each(['link', 'button'])('surfaces the secondary %s action', kind => {
  const html = renderToStaticMarkup(createElement(EmptyState, {
    icon: Inbox, title: 'No matches', body: 'Try again',
    secondary: kind === 'link' ? { label: 'Help', href: '/help' } : { label: 'Help', onClick() {} },
  }));
  const control = html.match(/<(?:a|button)[^>]*>Help<\/(?:a|button)>/)?.[0];
  expect(control).toContain('glass');
  expect(control).not.toContain('bg-transparent');
});
