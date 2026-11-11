'use client';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import { LoadingState } from '@/ui/loading-state';
const Manager = dynamic(() => import('./request-manager').then(m => m.RequestManager),{loading:() => <LoadingState variant="detail" />});
export function RequestManagerEntry({playerId,locale}:{playerId:string;locale:Locale}) {return <Manager playerId={playerId} locale={locale} />;}
