import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pages, pageFor, filterPlayers } from './model.mjs';

test('the concept covers every current route, including nested player details', () => {
  const root = path.resolve('src/app');
  const routes = fs.readdirSync(root, { recursive: true, encoding: 'utf8' })
    .filter(file => path.basename(file) === 'page.tsx')
    .map(file => '/' + path.dirname(file).split(path.sep).filter(segment => segment !== '[locale]' && !segment.startsWith('(')).join('/'))
    .map(route => route === '/.' ? '/' : route);
  for (const route of routes) assert.ok(pages.some(page => page.route === route), `Missing concept for ${route}`);
  assert.equal(new Set(pages.map(page => page.id)).size, pages.length);
});

test('unknown pages fall back to the public homepage and every renderer has a group', () => {
  assert.equal(pageFor('missing').id, 'site');
  assert.ok(pages.every(page => ['public', 'auth', 'captain', 'player', 'system'].includes(page.group)));
});

test('player search supports names and phone numbers without mutating the roster', () => {
  const roster = [{ name: 'عمر حسن', phone: '01012345678' }, { name: 'سارة أحمد', phone: '01187654321' }];
  assert.deepEqual(filterPlayers(roster, '  عمر '), [roster[0]]);
  assert.deepEqual(filterPlayers(roster, '011'), [roster[1]]);
  assert.equal(filterPlayers(roster, '').length, 2);
  assert.equal(filterPlayers(roster, 'nobody').length, 0);
  assert.equal(roster.length, 2);
});
