import 'server-only';
import { themeMode } from './theme-mode';

// Serialize the tested decision for the blocking, pre-paint head script.
export const themeBootScript = `(()=>{
  const root=document.documentElement;
  const media=matchMedia('(prefers-color-scheme: dark)');
  let stored=null;
  try{stored=localStorage.getItem('kochivo.theme')}catch{}
  const apply=()=>{
    const mode=(${themeMode.toString()})({stored:root.dataset.themeMode,prefersDark:media.matches,
      pathname:window.location?.pathname,workspace:${process.env.NEXT_PUBLIC_CAPTAIN_WORKSPACE === '1'}});
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
  // Next navigation uses the History API; reconcile before the destination paints.
  if(window.history)for(const name of ['pushState','replaceState']){
    const original=window.history[name];
    window.history[name]=function(...args){const result=original.apply(this,args);apply();return result};
  }
  window.addEventListener('popstate',apply);
  window.addEventListener('kochivo:theme-change',apply);
  window.addEventListener('storage',event=>{
    if(event.key!==null&&event.key!=='kochivo.theme')return;
    root.dataset.themeMode=event.newValue==='light'||event.newValue==='dark'?event.newValue:'system';
    apply();
    window.dispatchEvent(new Event('kochivo:theme-change'));
  });
})()`;
