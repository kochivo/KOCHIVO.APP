import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Inbox } from 'lucide-react';
import { expect, it } from 'vitest';
import { EmptyState } from './empty-state';

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
