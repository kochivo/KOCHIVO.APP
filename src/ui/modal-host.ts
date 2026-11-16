// Older browsers (Chrome < 105, Safari < 15.6) reject the :modal selector and throw.
export function topModalDialog(root: Pick<Document, 'querySelectorAll'>): Element | undefined {
  try {
    return Array.from(root.querySelectorAll('dialog:modal')).at(-1);
  } catch {
    return Array.from(root.querySelectorAll('dialog[open]')).at(-1);
  }
}
