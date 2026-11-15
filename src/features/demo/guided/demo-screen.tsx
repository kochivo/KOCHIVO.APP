import 'server-only';
import { content } from '@/features/marketing';
import { GuidedEntry } from './guided-entry';

export function DemoScreen() {
  return <GuidedEntry plans={content.plans.map(({ name, price, limit }) => ({ name, price, limit }))} />;
}
