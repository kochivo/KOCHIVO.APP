export function readingProgress(scroll: number, height: number, viewport: number) {
  return height <= viewport ? 0 : Math.min(1, Math.max(0, scroll / (height - viewport)));
}

export function showStory(root: ParentNode, index: string) {
  root.querySelectorAll<HTMLElement>('[data-screen]').forEach(screen => { screen.hidden = screen.dataset.screen !== index; });
  root.querySelectorAll<HTMLElement>('[data-step], [data-rail]').forEach(item => {
    item.dataset.active = String((item.dataset.step ?? item.dataset.rail) === index);
  });
}

export function attachLandingMotion(doc: Document, win: Window, reduced: boolean) {
  const frames = new Set<number>();
  const observers: IntersectionObserver[] = [];
  const counters = new Map<HTMLElement, string>();
  const frame = (callback: FrameRequestCallback) => {
    const id = win.requestAnimationFrame(time => { frames.delete(id); callback(time); });
    frames.add(id);
  };
  const observe = (selector: string, callback: (el: HTMLElement) => void, once = true, rootMargin = '0px') => {
    if (!('IntersectionObserver' in win)) return;
    const observer = new IntersectionObserver(entries => entries.filter(entry => entry.isIntersecting).forEach(entry => {
      callback(entry.target as HTMLElement);
      if (once) observer.unobserve(entry.target);
    }), { rootMargin });
    doc.querySelectorAll(selector).forEach(el => observer.observe(el));
    observers.push(observer);
  };
  const header = doc.querySelector<HTMLElement>('[data-landing-header]');
  const hero = doc.querySelector<HTMLElement>('[data-hero]');
  const progress = doc.querySelector<HTMLElement>('[data-reading]');
  let scheduled = false;
  const scroll = () => {
    if (scheduled) return;
    scheduled = true;
    frame(() => {
      scheduled = false;
      progress?.style.setProperty('--reading', String(readingProgress(win.scrollY, doc.documentElement.scrollHeight, win.innerHeight)));
      if (header) header.dataset.slim = String((hero?.getBoundingClientRect().bottom ?? 0) <= (header.offsetHeight || 80));
    });
  };
  win.addEventListener('scroll', scroll, { passive: true });
  win.addEventListener('resize', scroll);
  scroll();
  observe('[data-step]', el => showStory(doc, el.dataset.step ?? '0'), false, '-40% 0px -40% 0px');
  let pointer: ((event: PointerEvent) => void) | undefined;
  const devices = doc.querySelector<HTMLElement>('[data-devices]');
  if (!reduced) {
    doc.body.dataset.landingMotion = '';
    observe('[data-tick], [data-toast], [data-slash]', el => {
      if (el.hasAttribute('data-tick')) el.style.setProperty('--delay', `${Array.from(el.parentElement?.children ?? []).indexOf(el) * 120}ms`);
      if (el.hasAttribute('data-toast')) el.style.setProperty('--delay', `${el === doc.querySelector('[data-toast]') ? 300 : 650}ms`);
      el.dataset.enter = '';
    });
    observe('[data-count]', el => {
      const original = el.textContent ?? '';
      counters.set(el, original);
      const target = Number(el.dataset.count);
      const start = win.performance.now();
      const tick = (time: number) => {
        const ratio = Math.min(1, (time - start) / 900);
        el.textContent = original.replace(/[\d,]+/, Math.round(target * (1 - (1 - ratio) ** 3)).toLocaleString('en-US'));
        if (ratio < 1) frame(tick);
      };
      frame(tick);
    });
    const weight = doc.querySelector<HTMLElement>('[data-weight]');
    if (weight) {
      weight.textContent = weight.dataset.from ?? '';
      const start = win.performance.now();
      const tick = (time: number) => {
        if (time - start < 1500) frame(tick);
        else { weight.textContent = weight.dataset.to ?? ''; weight.dataset.enter = ''; }
      };
      frame(tick);
    }
    if (win.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      let pending = false;
      pointer = event => {
        if (pending) return;
        pending = true;
        frame(() => {
          pending = false;
          devices?.style.setProperty('--mx', `${(event.clientX / win.innerWidth - .5) * 8}px`);
          devices?.style.setProperty('--my', `${(event.clientY / win.innerHeight - .5) * 8}px`);
        });
      };
      hero?.addEventListener('pointermove', pointer);
    }
  }
  return () => {
    frames.forEach(id => win.cancelAnimationFrame(id));
    observers.forEach(observer => observer.disconnect());
    counters.forEach((text, el) => { el.textContent = text; });
    win.removeEventListener('scroll', scroll);
    win.removeEventListener('resize', scroll);
    if (pointer) hero?.removeEventListener('pointermove', pointer);
    delete doc.body.dataset.landingMotion;
    doc.querySelectorAll<HTMLElement>('[data-enter]').forEach(el => { delete el.dataset.enter; });
    const weight = doc.querySelector<HTMLElement>('[data-weight]');
    if (weight) weight.textContent = weight.dataset.to ?? '';
    devices?.style.removeProperty('--mx');
    devices?.style.removeProperty('--my');
  };
}
