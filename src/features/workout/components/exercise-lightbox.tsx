'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useRef } from 'react';
import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';
import { Button } from '@/ui/button';

// A native dialog gives focus trapping, Escape/back-gesture closing and a top layer above the bottom nav for free.
export function ExerciseLightbox({ src, name, large = false, thumbnail = false, focus = false }: {
  src: string; name: string; large?: boolean; thumbnail?: boolean; focus?: boolean;
}) {
  const t = useT(messages);
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();
  return <>
    <button type="button" aria-label={t('enlargeExerciseImage', { name })} onClick={() => dialog.current?.showModal()}
      className={focus ? 'relative block h-[210px] w-full overflow-hidden rounded-[28px] bg-exercise-media motion-reduce:hidden' : thumbnail ? 'relative block size-16 overflow-hidden rounded-2xl bg-exercise-media motion-reduce:hidden' : large ? 'relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-card bg-ink motion-reduce:hidden' : 'relative block shrink-0 cursor-pointer rounded-control transition-transform hover:scale-105 motion-reduce:hidden motion-reduce:transition-none'}>
      <Image src={src} alt="" width={large || focus ? 480 : 84} height={large || focus ? 300 : 84} unoptimized loading="eager" decoding="async" className={large || thumbnail || focus ? 'size-full object-contain' : 'rounded-control'} />
      <span aria-hidden className="absolute bottom-1 end-1 grid size-6 place-items-center rounded-full bg-bg/75 text-ink">
        <Maximize2 className="size-3.5" />
      </span>
    </button>
    <dialog ref={dialog} aria-label={name} onClick={event => { if (event.target === event.currentTarget) close(); }}
      className="m-0 h-dvh max-h-none w-dvw max-w-none bg-bg/80 p-card text-ink backdrop-blur-md open:flex open:items-center open:justify-center open:animate-[surface-in_200ms_ease-out] motion-reduce:open:animate-none backdrop:bg-transparent">
      <Button type="button" aria-label={t('closeImage')} onClick={close}
        variant={'secondary'} block={false} className={"absolute end-[max(1rem,var(--safe-end))] top-[max(1rem,var(--safe-top))] grid size-12 place-items-center"}>
        <X aria-hidden className="size-6" />
      </Button>
      <Image src={src} alt={name} width={480} height={480} unoptimized decoding="async"
        className="h-auto max-h-[80vh] w-auto max-w-full rounded-card border border-line object-contain" />
    </dialog>
  </>;
}
