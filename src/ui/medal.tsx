'use client';

import { useId } from 'react';
import type { ComponentProps } from 'react';
import { MedalArt } from './medal-art';

export function Medal(props: Omit<ComponentProps<typeof MedalArt>, 'id' | 'paints'>) {
  return <MedalArt {...props} id={useId()} />;
}
