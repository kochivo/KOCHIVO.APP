import type { ReactNode } from 'react';
import { foodPhotoUrl } from '@/core/storage/media-url';

export function V11FoodRowView({ name, photo, detail, children }: {
  name: string; photo: string | null; detail: string; children?: ReactNode;
}) {
  return <li className="flex min-w-0 flex-wrap items-center gap-inline border-t border-line-soft px-page-x py-stack text-xs">
    <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-surface">
      {/* Food storage hosts vary by deployment. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={foodPhotoUrl(photo)} alt="" width={36} height={36} loading="lazy" className="size-9 object-cover" />}
    </span>
    <div className="min-w-0 flex-1"><b>{name}</b><p className="mt-inline text-muted">{detail}</p></div>
    {children}
  </li>;
}
