import type { Action, DemoState } from './state';
export type PaneProps = { state: DemoState; dispatch: (action: Action) => void; act: (event: string, text?: string) => void; now: () => number };
export type DemoPlan = { name: string; price: number; limit: number };
