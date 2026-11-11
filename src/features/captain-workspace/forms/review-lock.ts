export function createReviewLock() {
  let pending = false;
  return {
    pending: () => pending,
    async run(commit: () => Promise<boolean>) {
      if (pending) return false;
      pending = true;
      try { return await commit(); }
      finally { pending = false; }
    },
  };
}
