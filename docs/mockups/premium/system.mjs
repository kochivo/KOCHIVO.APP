import { messages as m } from './messages.ts';
import { brand, heading, go, act, icon, table, tag, field } from './ui.mjs';
import { renderPublic } from './public.mjs';

export function renderSystem(page) {
  if (page.id === 'dev-ko') return renderPublic({ id: 'ko' });
  if (page.id === 'admin') return `<header class="k-site-nav">${brand()}${go(m.settings, 'coach-settings')}</header><main class="k-system-admin">${heading(m.adminTitle, m.adminSub)}${table([m.captain, m.inbox, m.review], m.adminRows.map(([name, request, status]) => [name, `${request} ${tag(status)}`, act(m.review, 'admin-review')]))}</main>`;
  if (page.id === 'dev-ui') return `<header class="k-site-nav">${brand()}</header><main class="k-system-admin">${heading(m.devTitle, m.devSub)}<div class="k-design-specimen"><h2>${m.siteLead}</h2><p>${m.siteBody}</p><div class="k-action-row">${act(m.devControls[0], 'saved', true)}${act(m.devControls[1], 'saved')}</div>${field(m.devControls[2], m.clientName)}${tag(m.devControls[3])}</div></main>`;
  const item = page.id === 'offline' ? ['wifi-off', m.offlineTitle, m.offlineBody] : page.id === 'suspended' ? ['shield-alert', m.suspendedTitle, m.suspendedBody] : ['clock-3', m.pendingTitle, m.pendingBody];
  return `<header class="k-site-nav">${brand()}</header><main class="k-status-page"><div class="k-status-symbol">${icon(item[0])}</div>${heading(item[1], item[2])}${page.id === 'offline' ? go(m.goHome, 'player-home', true) : act(m.support, 'support', true)}</main>`;
}
