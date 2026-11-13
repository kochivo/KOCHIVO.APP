export type InstalledWindow = { matchMedia: (query: string) => { matches: boolean }; navigator: Navigator | { standalone?: boolean } };

// True when KOCHIVO runs from the phone home screen (installed PWA), including iOS's legacy flag.
export function isInstalledApp(win: InstalledWindow): boolean {
  return win.matchMedia('(display-mode: standalone)').matches || ('standalone' in win.navigator && win.navigator.standalone === true);
}
