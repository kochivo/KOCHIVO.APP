export function balance(anterior: number, posterior: number) {
  const total = anterior + posterior;
  const push = total === 0 ? 0 : Math.round(anterior / total * 100);
  return {
    push, pull: total === 0 ? 0 : 100 - push,
    imbalanced: total > 0 && Math.max(anterior, posterior) / total > 0.6,
  };
}
