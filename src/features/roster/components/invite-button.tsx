'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/ui';

// The sheet and its form load on first tap, so no captain route pays for them up front.
const InviteSheet = dynamic(() => import('./invite-sheet').then(module => module.InviteSheet));

/** Opens the roster's invite sheet from other screens, so every invite goes through one server action. */
export function InviteButton({ captainFirstName, label, className }: { captainFirstName: string; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button data-tour="invite-player" className={className} onClick={() => setOpen(true)}>{label}</Button>
    {open && <InviteSheet captainFirstName={captainFirstName} onClose={() => setOpen(false)} />}
  </>;
}
