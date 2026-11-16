import { notFound } from 'next/navigation';

// Keep unmatched URLs inside the locale root layout, including unprefixed proxy rewrites.
export default function MissingPage() {
  notFound();
}
