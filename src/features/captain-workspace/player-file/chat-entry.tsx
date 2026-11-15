'use client';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/ui/loading-state';
import type { ComponentProps } from 'react';
import type { CaptainChat } from '@/features/chat';

const Chat = dynamic(() => import('@/features/chat').then(module => module.CaptainChat), {
  ssr: false, loading: () => <LoadingState variant="detail" />,
});

export function FileChatEntry(props: ComponentProps<typeof CaptainChat>) {
  return <div className="glass flex min-h-[470px] min-w-0 flex-col rounded-card border border-line-soft p-stack min-[760px]:p-card [&>section]:flex [&>section]:flex-1 [&>section]:flex-col [&>section>div:last-child]:static [&>section>div:last-child]:mx-0 [&>section>div:last-child]:mt-auto [&>section>div:last-child]:max-w-none">
    <Chat {...props} />
  </div>;
}
