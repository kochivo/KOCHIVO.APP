export function openGeneratorWhenReady(root: HTMLElement) {
  let opened = false;
  let observer: MutationObserver | undefined;
  const open = () => {
    const button = root.querySelector<HTMLButtonElement>('#generator-entry');
    if (!button || opened) return;
    opened = true;
    observer?.disconnect();
    button.click();
  };
  open();
  if (!opened) {
    observer = new MutationObserver(open);
    observer.observe(root, { childList: true, subtree: true });
  }
  return () => observer?.disconnect();
}
