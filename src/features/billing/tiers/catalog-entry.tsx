'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
export const PackageCatalog = dynamic(() => import('./catalog-screen').then(module => module.CatalogScreen), {
  loading: () => <LoadingState variant="cards" />,
});
