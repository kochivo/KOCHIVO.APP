import type { Template } from './types';
import type { Level } from './library-model';

export type LibraryTemplate = Template & { uses: number; level?: Level; minutes?: number;
  place?: 'gym' | 'dumbbells' | 'bodyweight'; protein?: number | null; split?: boolean; archived?: boolean };
