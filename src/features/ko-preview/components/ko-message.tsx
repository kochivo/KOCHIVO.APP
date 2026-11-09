import { KoAvatar } from './ko-avatar';

export function KoMessage({ speaker, text }: { speaker: 'ko' | 'user'; text: string }) {
  return <div className={`flex max-w-[90%] items-start gap-2 animate-[ko-rise_160ms_ease-out_both] motion-reduce:animate-none ${speaker === 'ko' ? 'self-start' : 'self-end'}`}>
    {speaker === 'ko' && <KoAvatar expression="welcome" className="size-6" />}
    <p dir="auto" className={`whitespace-pre-wrap break-words rounded-2xl px-3 py-2 leading-6 ${speaker === 'ko' ? 'glass' : 'bg-surface-raised'}`}>{text}</p>
  </div>;
}
