'use client';
import dynamic from 'next/dynamic';
const Choice = dynamic(() => import('./renewal-choice').then(m => m.RenewalChoice));
export function RenewalEntry() { return <Choice />; }
