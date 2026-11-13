export function waterGlasses(ml: number, goalMl: number) {
  return { done: Math.floor(Math.max(0, ml) / 250), planned: Math.ceil(Math.max(0, goalMl) / 250) };
}
