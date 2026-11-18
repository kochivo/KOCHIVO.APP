import { Button } from '@/ui/button';

export function CaptainQuickReplies({ replies, onChoose }: {
  replies: readonly string[];
  onChoose: (body: string) => void;
}) {
  return <div className="flex flex-wrap gap-inline">
    {replies.map(reply => <Button key={reply} type="button" variant="secondary" block={false}
      className="min-h-12 px-stack text-xs" onClick={() => onChoose(reply)}>{reply}</Button>)}
  </div>;
}
