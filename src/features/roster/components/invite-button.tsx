'use client';

import { useState } from 'react';
import { Button } from '@/ui';
import { InviteSheet } from './invite-sheet';

/** Opens the roster's invite sheet from other screens, so every invite goes through one server action. */
export function InviteButton({ captainFirstName, label, className }: { captainFirstName: string; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button data-tour="invite-player" className={className} onClick={() => setOpen(true)}>{label}</Button>
    {open && <InviteSheet captainFirstName={captainFirstName} onClose={() => setOpen(false)} />}
  </>;
}
