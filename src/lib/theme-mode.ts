type ThemeInput = { stored?: string | null; prefersDark: boolean };

export function themeMode({ stored, prefersDark }: ThemeInput): 'light' | 'dark' {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

// Serialize the tested decision for the blocking, pre-paint head script.
export const themeBootScript = `(()=>{
  const root=document.documentElement;
  const media=matchMedia('(prefers-color-scheme: dark)');
  let stored=null;
  try{stored=localStorage.getItem('kochivo.theme')}catch{}
  const apply=()=>{
    const mode=(${themeMode.toString()})({stored:root.dataset.themeMode,prefersDark:media.matches});
    root.dataset.theme=mode;
    root.style.colorScheme=mode;
  };
  root.dataset.themeMode=stored==='light'||stored==='dark'?stored:'system';
  apply();
  // A locale refresh reconciles html attributes without rerunning this head script.
  if(typeof MutationObserver!=='undefined')new MutationObserver(()=>{
    try{stored=localStorage.getItem('kochivo.theme')}catch{}
    root.dataset.themeMode=stored==='light'||stored==='dark'?stored:'system';
    apply();
    window.dispatchEvent(new Event('kochivo:theme-change'));
  }).observe(root,{attributes:true,attributeFilter:['lang','dir']});
  media.addEventListener('change',apply);
  window.addEventListener('kochivo:theme-change',apply);
  window.addEventListener('storage',event=>{
    if(event.key!==null&&event.key!=='kochivo.theme')return;
    root.dataset.themeMode=event.newValue==='light'||event.newValue==='dark'?event.newValue:'system';
    apply();
    window.dispatchEvent(new Event('kochivo:theme-change'));
  });
})()`;
