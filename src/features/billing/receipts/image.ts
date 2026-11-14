export function validReceiptImage(file: Pick<File, 'type' | 'size'>): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size > 0 && file.size <= 5 * 1024 * 1024;
}
