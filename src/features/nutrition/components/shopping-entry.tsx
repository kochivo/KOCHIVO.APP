'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
const ShoppingScreen = dynamic(() => import('./shopping-screen').then(m => m.ShoppingScreen), { loading: () => <LoadingState /> });
export function ShoppingEntry() { return <ShoppingScreen />; }
