export type Page = 'home' | 'inbox' | 'players' | 'player' | 'programs' | 'food' | 'assess' | 'money' | 'add';
export type PhoneTab = 'workout' | 'food' | 'coach' | 'me';
export const steps: readonly { page: Page; target?: string; event?: string; view?: 'captain' | 'player' }[] = [
  { page: 'home' }, { page: 'home', target: 'kpis' },
  { page: 'home', target: 'needs', event: 'nudge' },
  { page: 'home', target: 'review', event: 'go:assess' },
  { page: 'assess', target: 'approve', event: 'approve' },
  { page: 'inbox', target: 'composer', event: 'send' },
  { page: 'player', target: 'chart' },
  { page: 'programs', target: 'addex', event: 'addex' },
  { page: 'food', target: 'swap', event: 'swap' },
  { page: 'money', target: 'owed', event: 'pay' },
  { page: 'add', target: 'addform', event: 'invite' },
  { page: 'home', target: 'log', event: 'set', view: 'player' },
  { page: 'home', target: 'feed', view: 'captain' },
];
