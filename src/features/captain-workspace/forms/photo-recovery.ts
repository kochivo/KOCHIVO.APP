export function createPhotoRecovery() {
  let failedBatch: readonly string[] | undefined;
  return {
    failed(batch: readonly string[]): 'refresh' | 'ignore' | 'error' {
      if (batch === failedBatch) return 'ignore';
      if (failedBatch) return 'error';
      failedBatch = batch;
      return 'refresh';
    },
    reset() { failedBatch = undefined; },
  };
}
