'use client';

import { useState } from 'react';
import type { WeekCell } from '../week-cells';

export function useSelectedDay(cells: WeekCell[]) {
  const [selectedId, select] = useState<string>();
  const selected = cells.find(cell => cell.id === selectedId) ?? cells.find(cell => !cell.rest) ?? cells[0];
  return { selected, select };
}
