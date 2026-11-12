'use client';
import dynamic from 'next/dynamic';
import type { PricingProps } from './pricing-cards';
const Cards = dynamic(() => import('./pricing-cards').then(m => m.PricingCards));
export function PricingEntry(props: PricingProps) { return <Cards {...props} />; }
