import type { Entry } from '../hooks/use-ko-history';
import { saveKoLearningState } from '../hooks/use-ko-history';
import { KoFeedback } from './ko-feedback';
import { KoMemoryNote } from './ko-memory-note';

export function KoReplyLearning({ entry, previous, closeSignal, userId }: {
  entry: Entry; previous?: Entry; closeSignal: number; userId?: string;
}) {
  if (entry.speaker !== 'ko') return null;
  return <>
    {(entry.memory || entry.memoryRemoved) && <KoMemoryNote memory={entry.memory}
      onUndo={() => { if (userId) saveKoLearningState(userId, entry.id, { memoryRemoved: true }); }} />}
    {entry.feedbackIntent && !entry.actions?.length && !entry.upgrade && previous?.speaker === 'user' &&
      <KoFeedback id={entry.id} question={previous.contextText ?? previous.text} answer={entry.text} intent={entry.feedbackIntent}
        sources={entry.sources} closeSignal={closeSignal} initialRating={entry.rating}
        onRate={rating => { if (userId) saveKoLearningState(userId, entry.id, { rating }); }} />}
  </>;
}
