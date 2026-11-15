'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
const PlayerBudget = dynamic(() => import('./player-budget').then(m => m.PlayerBudget), { loading: () => <LoadingState /> });
export function PlayerBudgetEntry() { return <PlayerBudget />; }
