export function canSubmitKoDraft(text: string, voice: Blob | null, photo: Blob | null): boolean {
  return voice ? !text.trim() && !photo : Boolean(text.trim() || photo);
}
