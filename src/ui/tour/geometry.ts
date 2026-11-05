export function visibleTarget(id: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('[data-tour]')).find(element => {
    if (element.dataset.tour !== id || element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    const style = getComputedStyle(element);
    return element.getClientRects().length > 0 && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
  });
}

export function tourGeometry(rect: DOMRect, width: number, height: number, rtl: boolean, cardHeight = 300) {
  const start = rtl ? width - rect.right : rect.left;
  const cardWidth = 352;
  const beside = start + rect.width + 16;
  const cardStart = beside + cardWidth <= width - 16 ? beside : Math.max(16, start - cardWidth - 16);
  return {
    ring: { insetInlineStart: start - 4, insetBlockStart: rect.top - 4, width: rect.width + 8, height: rect.height + 8 },
    cardStart: Math.min(cardStart, Math.max(16, width - cardWidth - 16)),
    cardTop: Math.max(16, Math.min(rect.top, height - cardHeight - 16)),
    cardBottom: rect.top > height * 0.65 ? Math.max(16, height - rect.top + 16) : 16,
  };
}
