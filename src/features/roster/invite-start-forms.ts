export function inviteGateState(formIds: string[], gate: boolean) {
  return { disabled: formIds.length === 0, checked: formIds.length > 0 && gate };
}
export function toggleInviteForm(formIds: string[], gate: boolean, id: string) {
  const next = formIds.includes(id) ? formIds.filter(value => value !== id) : formIds.length < 5 ? [...formIds, id] : formIds;
  return { formIds: next, gate: next.length > 0 && (formIds.length === 0 || gate) };
}
