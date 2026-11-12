export function createSaveQueue<T, R>(write: (value: T) => Promise<R>) {
  let tail: Promise<unknown> = Promise.resolve();
  return { save(value: T): Promise<R> {
    const next = tail.then(() => write(value));
    tail = next.catch(() => undefined);
    return next;
  } };
}
