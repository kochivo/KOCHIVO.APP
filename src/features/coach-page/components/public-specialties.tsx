export function PublicSpecialties({ items }: { items: string[] }) {
  if (!items.length) return null;
  return <ul className="flex flex-wrap gap-3">{items.map((item, index) =>
    <li key={`${index}-${item}`} className="glass -skew-x-6 px-4 py-2 text-sm"><span className="inline-block skew-x-6">{item}</span></li>)}</ul>;
}
