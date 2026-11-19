import { Button } from '@/ui/button';

export function KoQuickButtons({ quick, disabled, send }: { quick: string[]; disabled: boolean; send: (text: string) => void }) {
  return <div className="flex flex-wrap gap-inline">
    {quick.map(text => <Button key={text} type="button" variant="secondary" block={false}
      className="min-h-12 px-page-x text-sm" disabled={disabled} onClick={() => send(text)}>{text}</Button>)}
  </div>;
}
