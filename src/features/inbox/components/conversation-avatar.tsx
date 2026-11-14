export function ConversationAvatar({ name, url }: { name: string; url?: string | null }) {
  return <span aria-hidden className="grid size-[38px] shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-raised text-sm font-semibold">
    {/* Profile images come from the existing roster's public avatar URLs. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {url ? <img src={url} alt="" className="size-full object-cover" /> : name.trim().slice(0, 1)}
  </span>;
}
