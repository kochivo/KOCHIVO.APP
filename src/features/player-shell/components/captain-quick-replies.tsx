import { Button } from '@/ui/button';

export function CaptainQuickReplies({ replies, sendText }: {
  replies: readonly string[];
  sendText: (body: string) => Promise<boolean>;
}) {
  return <div className="flex flex-wrap gap-inline">
    {replies.map(reply => <Button key={reply} type="button" variant="secondary" block={false}
      className="min-h-12 px-stack text-xs" onClick={() => void sendText(reply)}>{reply}</Button>)}
  </div>;
}
