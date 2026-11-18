export function readingProgress(scroll: number, height: number, viewport: number) {
  return height <= viewport ? 0 : Math.min(1, Math.max(0, scroll / (height - viewport)));
}

export function showStory(root: ParentNode, index: string) {
  root.querySelectorAll<HTMLElement>('[data-screen]').forEach(screen => { screen.hidden = screen.dataset.screen !== index; });
  root.querySelectorAll<HTMLElement>('[data-step], [data-rail]').forEach(item => {
    item.dataset.active = String((item.dataset.step ?? item.dataset.rail) === index);
  });
}

export function adjustPreviewWeight(weight: number, change: number) {
  return Math.max(0, Math.round((weight + change) * 10) / 10);
}

export function attachLandingMotion(doc: Document, win: Window, reduced: boolean) {
  const frames = new Set<number>();
  const observers: IntersectionObserver[] = [];
  let disposed = false;
  const frame = (callback: FrameRequestCallback) => {
    const id = win.requestAnimationFrame(time => { frames.delete(id); if (!disposed) callback(time); });
    frames.add(id);
  };
  const hero = doc.querySelector<HTMLElement>('[data-hero]');
  const active = () => !reduced && !doc.hidden && hero?.dataset.motionRunning === 'true';
  let scheduled = false;
  const scroll = () => {
    if (!active() || scheduled) return;
    scheduled = true;
    frame(() => {
      scheduled = false;
      if (active()) hero?.style.setProperty('--py', `${Math.min(Math.max(win.scrollY, 0), 900) * .18}px`);
    });
  };
  let pointerPending = false;
  const pointer = (event: PointerEvent) => {
    if (!active() || pointerPending) return;
    pointerPending = true;
    frame(() => {
      pointerPending = false;
      if (!active() || !hero) return;
      const bounds = hero.getBoundingClientRect();
      hero.style.setProperty('--mx', `${event.clientX - bounds.left}px`);
      hero.style.setProperty('--my', `${event.clientY - bounds.top}px`);
    });
  };
  const fit = () => {
    doc.querySelectorAll<HTMLElement>('[data-fit]').forEach(container => {
      const inner = container.firstElementChild;
      if (!(inner instanceof HTMLElement)) return;
      const scale = Math.min(1, container.clientWidth / 1120);
      container.style.height = `${inner.offsetHeight * scale}px`;
      container.style.setProperty('--preview-scale', String(scale));
    });
  };
  const click = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    const menu = event.target.closest('[data-section-menu] a')?.closest<HTMLDetailsElement>('details');
    if (menu) {
      menu.open = false;
      menu.querySelector('summary')?.focus();
    }
    const button = event.target.closest<HTMLElement>('[data-adjust], [data-preview-done]');
    const preview = button?.closest('[data-set-preview]');
    const weight = preview?.querySelector<HTMLElement>('[data-preview-weight]');
    if (!button || !weight) return;
    if (button.dataset.adjust) weight.textContent = String(adjustPreviewWeight(Number(weight.textContent), Number(button.dataset.adjust)));
    else {
      const set = preview?.querySelector<HTMLElement>('[data-preview-set]');
      if (set) set.textContent = String(Number(set.textContent) + 1);
      else {
        button.textContent = button.dataset.success ?? button.textContent;
        const record = preview?.querySelector<HTMLElement>('[data-preview-record]');
        if (record) record.textContent = record.dataset.previewRecord ?? '';
      }
    }
  };
  win.addEventListener('resize', fit);
  doc.addEventListener('click', click);
  fit();
  if (doc.fonts) void doc.fonts.ready.then(() => { if (!disposed) fit(); });
  const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(fit);
  doc.querySelectorAll('[data-fit]').forEach(container => resize?.observe(container));
  if (!reduced) {
    doc.body.dataset.landingMotion = '';
    win.addEventListener('scroll', scroll, { passive: true });
    hero?.addEventListener('pointermove', pointer);
    hero?.setAttribute('data-enter', '');
    hero?.querySelector('[data-slogan]')?.setAttribute('data-enter', '');
    const final = doc.querySelector<HTMLElement>('#final-slogan');
    if (final && typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) { final.dataset.enter = ''; observer.disconnect(); }
      }, { threshold: .4 });
      observer.observe(final);
      observers.push(observer);
    } else if (final) final.dataset.enter = '';
  }
  return () => {
    disposed = true;
    frames.forEach(id => win.cancelAnimationFrame(id));
    observers.forEach(observer => observer.disconnect());
    resize?.disconnect();
    win.removeEventListener('scroll', scroll);
    win.removeEventListener('resize', fit);
    doc.removeEventListener('click', click);
    hero?.removeEventListener('pointermove', pointer);
    delete doc.body.dataset.landingMotion;
    doc.querySelectorAll<HTMLElement>('[data-enter]').forEach(element => { delete element.dataset.enter; });
    for (const property of ['--mx', '--my', '--py']) hero?.style.removeProperty(property);
  };
}
