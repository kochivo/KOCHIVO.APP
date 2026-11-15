interface PortionDraft { meals: { id: string; timeOfDay?: string | null; items: { id: string; food: { id: string }; unit?: string | null }[] }[] }

export function portionPayload(draft: PortionDraft) {
  return draft.meals.map(meal => ({ id: meal.id, timeOfDay: meal.timeOfDay ?? null,
    items: meal.items.map(item => ({ id: item.id, foodId: item.food.id, unit: item.unit ?? null })),
  }));
}
export function portionsChanged(draft: PortionDraft, meals: { id: string; time_of_day?: string | null }[], items: { id: string; unit?: string | null }[]) {
  return portionPayload(draft).some(meal => {
    const stored = meals.find(row => row.id === meal.id);
    return (meal.timeOfDay?.slice(0, 5) ?? null) !== (stored?.time_of_day?.slice(0, 5) ?? null) ||
      meal.items.some(item => item.unit !== (items.find(row => row.id === item.id)?.unit ?? null));
  });
}
