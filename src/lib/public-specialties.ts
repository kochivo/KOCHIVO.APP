// Mirrors public.valid_public_specialties (migration 0103) so the editor and the page agree with the database.
export function validSpecialties(items: string[]): boolean {
  return items.length <= 6 && items.every(item => {
    const length = Array.from(item.trim()).length;
    return length >= 2 && length <= 30;
  });
}
