type Change<State, Result> = {
  apply: () => void;
  rollback: (previous: State) => void;
  reconcile?: (result: Result) => void;
};

/** Scope snapshots to the affected item so concurrent actions cannot undo each other. */
export async function applyOptimistic<State, Result>(
  state: State, change: Change<State, Result>, commit: () => Promise<Result>,
): Promise<Result> {
  change.apply();
  try {
    const result = await commit();
    change.reconcile?.(result);
    return result;
  } catch (error) {
    change.rollback(state);
    throw error;
  }
}
