export function ConversationAvatar({ name, url, phone = false }: { name: string; url?: string | null; phone?: boolean }) {
  return <span aria-hidden className={`grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-raised text-sm font-semibold${phone ? ' max-md:size-11 max-md:rounded-full max-md:border-0 max-md:text-title' : ''}`}>
    {/* Profile images come from the existing roster's public avatar URLs. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {url ? <img src={url} alt="" className="size-full object-cover" /> : name.trim().slice(0, 1)}
  </span>;
}
