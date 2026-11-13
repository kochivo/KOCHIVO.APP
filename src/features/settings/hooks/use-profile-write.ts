'use client';
import { createContext, useContext, useRef, useState } from 'react';
import { runProfileWrite } from '../profile-write';

type ProfileWrite = { pending: boolean; run: (operation: () => Promise<void>) => Promise<boolean> };
export const ProfileWriteContext = createContext<ProfileWrite | null>(null);

export function useProfileWriter(): ProfileWrite {
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  return { pending, run: operation => runProfileWrite(lock, setPending, operation) };
}

export function useProfileWrite() {
  const writer = useContext(ProfileWriteContext);
  if (!writer) throw new Error('PlayerAccount is required');
  return writer;
}
