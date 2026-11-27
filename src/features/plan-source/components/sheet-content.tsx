import 'server-only';

import Link from 'next/link';
import { getT } from '@/core/i18n/server';
import type { Locale } from '@/core/i18n/locale';
import { Button, buttonClass } from '@/ui/button';
import { messages } from '../messages';
import type { WorkbookSource } from '../source-schema';

function cellText(text: string | undefined) {
  return text?.split('\n').map((part, index) => /^https:\/\/[^\s]+$/i.test(part) ?
    <a key={index} className="inline-flex min-h-12 items-center break-all font-semibold text-lime underline"
      href={part} target="_blank" rel="noopener noreferrer">{part}</a> : <span key={index}>{index > 0 && '\n'}{part}</span>);
}

export async function SheetContent({ source, locale, selected, search }: {
  source: WorkbookSource; locale: Locale; selected: number; search: string;
}) {
  const t = await getT(messages, locale);
  const sheet = source.sheets[selected];
  if (!sheet) return null;
  const query = search.trim().toLowerCase();
  const rows = sheet.rows.filter(row => row.some(cell => cell && (!query || cell.toLowerCase().includes(query))));
  const columns = Array.from({ length: Math.max(0, ...sheet.rows.map(row => row.length)) }, (_, index) => index)
    .filter(index => sheet.rows.some(row => Boolean(row[index])));
  return <div className="min-w-0 space-y-card-gap">
    {source.sheets.length > 1 && <nav aria-label={t('sheet')} className="flex flex-wrap gap-inline">
      {source.sheets.map((tab, index) => <Link key={index} href={`?tab=${index}`} prefetch={false}
        className={buttonClass({ variant: 'secondary', block: false, className: index === selected ? 'glass-strong font-bold' : '' })}
        aria-current={index === selected ? 'page' : undefined}>{tab.name}</Link>)}
    </nav>}
    <section className="glass min-w-0 space-y-card-gap rounded-card p-card" aria-labelledby="workbook-tab-title">
      <h2 className="text-title font-semibold" id="workbook-tab-title">{sheet.name}</h2>
      <form className="flex flex-wrap items-end gap-inline">
        <input type="hidden" name="tab" value={selected} />
        <label className="grid flex-1 gap-inline text-sm">{t('search')}
          <input type="search" name="q" maxLength={120} defaultValue={search}
            className="min-h-12 rounded-control border border-line bg-surface px-stack" />
        </label>
        <Button type="submit" variant="secondary" block={false}>{t('submit')}</Button>
      </form>
      {!rows.length ? <p role="status" className="text-muted">{t(query ? 'noMatches' : 'empty')}</p> :
        <div className="max-w-full overflow-x-auto rounded-control border border-line">
          <table aria-label={sheet.name} className="w-full border-collapse text-start text-row">
            <tbody>
              {rows.map((row, index) => {
                const nonempty = row.filter(Boolean);
                return nonempty.length === 1 && !query ? <tr key={index}>
                  <th scope="row" colSpan={columns.length}
                    className="whitespace-pre-wrap break-words border-b border-line bg-surface-raised p-stack text-start font-semibold">
                    <bdi>{cellText(nonempty[0])}</bdi>
                  </th>
                </tr> : <tr key={index} className="border-b border-line-soft last:border-b-0">
                  {columns.map(column => <td key={column} className="min-w-20 max-w-80 whitespace-pre-wrap break-words p-stack align-top"><bdi>{cellText(row[column])}</bdi></td>)}
                </tr>;
              })}
            </tbody>
          </table>
        </div>}
    </section>
  </div>;
}
