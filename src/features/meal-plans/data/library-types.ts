import type { Food } from '../types';

export type FoodSegment = 'all' | 'mine' | 'global';
export interface LibraryFood extends Food { uses: number; alternativeUses?: number }
export interface LibraryPage {
  foods: LibraryFood[];
  cursor: string | null;
  counts: Record<FoodSegment, number>;
}
