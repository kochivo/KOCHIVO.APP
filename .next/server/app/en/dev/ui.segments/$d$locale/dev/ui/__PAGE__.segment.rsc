1:"$Sreact.fragment"
2:"/_next/static/chunks/421c_el12128q.js"
3:I[339756,["$2"],"default"]
4:I[837457,["$2"],"default"]
16:"ViewportBoundary"
17:I[897367,["$2"],"$16"]
18:"MetadataBoundary"
19:I[897367,["$2"],"$18"]
1a:"$Sreact.suspense"
1b:I[27201,["$2"],"IconMark"]
:HL["/_next/static/chunks/0ifhoarl3a6kg.css","style"]
6:X
6:C
7:X
9:T74d,(()=>{
  const root=document.documentElement;
  const media=matchMedia('(prefers-color-scheme: dark)');
  let stored=null;
  try{stored=localStorage.getItem('kochivo.theme')}catch{}
  const apply=()=>{
    const mode=(function({stored:a,prefersDark:b}){return"light"===a||"dark"===a?a:b?"dark":"light"})({stored:root.dataset.themeMode,prefersDark:media.matches});
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
})();(()=>{
  let stored=null;
  try{stored=localStorage.getItem('kochivo.glass')}catch{}
  document.documentElement.dataset.glass=(function(a){return"solid"===a.stored||"blur"===a.stored?a.stored:a.saveData||void 0!==a.deviceMemory&&a.deviceMemory<=2||void 0!==a.hardwareConcurrency&&a.hardwareConcurrency<=4&&(void 0===a.deviceMemory||a.deviceMemory<=4)?"solid":"blur"})({
    stored,deviceMemory:navigator.deviceMemory,
    hardwareConcurrency:navigator.hardwareConcurrency,saveData:navigator.connection?.saveData
  });
})()13:[["children",{"s":"__PAGE__","h":160,"d":{"r":"$L14","p":"$@15","v":null,"s":"$7"}}]]
10:[["children",{"s":"ui","h":96,"d":{"r":"$L11","p":"$@12","v":"$6","s":"$7"},"c":"$Q13"}]]
d:[["children",{"s":"dev","h":96,"d":{"r":"$Le","p":"$@f","v":"$6","s":"$7"},"c":"$Q10"}]]
8:[["children",{"s":{"n":"locale","t":"d","k":"en","s":[]},"h":65648,"d":{"r":["$","$1","c",{"children":[[["$","link","0",{"rel":"stylesheet","href":"/_next/static/chunks/0ifhoarl3a6kg.css","precedence":"next"}],["$","script","script-0",{"src":"/_next/static/chunks/0bucpydo27zkp.js","async":true}]],["$","html",null,{"lang":"en","dir":"ltr","suppressHydrationWarning":true,"className":"hJlnFq_variable _9jpQ5a_variable _5nBW7q_variable","children":[["$","head",null,{"children":["$","script",null,{"dangerouslySetInnerHTML":{"__html":"$9"}}]}],["$","body",null,{"className":"min-h-dvh","children":[["$","div",null,{"aria-hidden":"true","className":"theme-dark-only bg-aurora","children":"$La"}],"$Lb"]}]]}]]}],"p":"$@c","v":null,"s":"$7"},"c":"$Qd"}]]
0:{"t":{"t":{"s":"","h":131152,"d":{"r":["$","$1","c",{"children":[null,["$","$L3",null,{"parallelRouterKey":"children","template":["$","$L4",null,{}],"notFound":[[["$","title",null,{"children":"404: This page could not be found."}],["$","div",null,{"style":{"fontFamily":"system-ui,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif,\"Apple Color Emoji\",\"Segoe UI Emoji\"","height":"100vh","textAlign":"center","display":"flex","flexDirection":"column","alignItems":"center","justifyContent":"center"},"children":["$","div",null,{"children":[["$","style",null,{"dangerouslySetInnerHTML":{"__html":"body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}"}}],["$","h1",null,{"className":"next-error-h1","style":{"display":"inline-block","margin":"0 20px 0 0","padding":"0 23px 0 0","fontSize":24,"fontWeight":500,"verticalAlign":"top","lineHeight":"49px"},"children":404}],["$","div",null,{"style":{"display":"inline-block"},"children":["$","h2",null,{"style":{"fontSize":14,"fontWeight":400,"lineHeight":"49px","margin":0},"children":"This page could not be found."}]}]]}]}]],[]]}]]}],"p":"$@5","v":"$6","s":"$7"},"c":"$Q8"},"h":{"r":["$","$1","h",{"children":[null,["$","$L17",null,{"children":[["$","meta","0",{"charSet":"utf-8"}],["$","meta","1",{"name":"viewport","content":"width=device-width, initial-scale=1, viewport-fit=cover"}],["$","meta","2",{"name":"theme-color","content":"#f6f7f4","media":"(prefers-color-scheme: light)"}],["$","meta","3",{"name":"theme-color","content":"#101418","media":"(prefers-color-scheme: dark)"}],["$","meta","4",{"name":"color-scheme","content":"light dark"}]]}],["$","$L19",null,{"children":[["$","div",null,{"hidden":true,"children":["$","$1a",null,{"name":"Next.Metadata","children":[["$","title","0",{"children":"KOCHIVO — All your players in one place"}],["$","meta","1",{"name":"description","content":"Training, meals and follow-up for every player in one place. Players can log offline."}],["$","meta","2",{"name":"application-name","content":"KOCHIVO"}],["$","link","3",{"rel":"manifest","href":"/manifest.webmanifest"}],["$","meta","4",{"name":"robots","content":"noindex"}],["$","meta","5",{"name":"mobile-web-app-capable","content":"yes"}],["$","meta","6",{"name":"apple-mobile-web-app-title","content":"KOCHIVO"}],["$","meta","7",{"name":"apple-mobile-web-app-status-bar-style","content":"black-translucent"}],["$","meta","8",{"property":"og:title","content":"KOCHIVO — All your players in one place"}],["$","meta","9",{"property":"og:description","content":"Training, meals and follow-up for every player in one place. Players can log offline."}],["$","meta","10",{"property":"og:site_name","content":"KOCHIVO"}],["$","meta","11",{"property":"og:locale","content":"en_GB"}],["$","meta","12",{"property":"og:image","content":"https://kochivo.site/opengraph-image"}],["$","meta","13",{"property":"og:image:width","content":"1200"}],["$","meta","14",{"property":"og:image:height","content":"630"}],["$","meta","15",{"property":"og:type","content":"website"}],["$","meta","16",{"name":"twitter:card","content":"summary_large_image"}],["$","meta","17",{"name":"twitter:title","content":"KOCHIVO — All your players in one place"}],["$","meta","18",{"name":"twitter:description","content":"Training, meals and follow-up for every player in one place. Players can log offline."}],["$","meta","19",{"name":"twitter:image","content":"https://kochivo.site/opengraph-image"}],["$","link","20",{"rel":"icon","href":"/icons/favicon-32.png"}],["$","link","21",{"rel":"apple-touch-icon","href":"/icons/icon-192.png"}],["$","$L1b","22",{}]]}]}],null]}],["$","meta",null,{"name":"next-size-adjust","content":""}]]}],"p":"$@1c","v":null,"s":"$7"}},"a":"$@1d","u":"$@1e","b":"47MYazeD4-YpdIan6vDRz"}
1f:"/_next/static/chunks/0bucpydo27zkp.js"
20:I[469893,["$1f"],"LocaleProvider"]
21:I[742054,["$1f"],"ToastProvider"]
22:"InAppBrowserWarning"
23:I[592321,["$1f"],"$22"]
24:I[900060,["$1f"],"MobileViewport"]
25:"RegisterServiceWorker"
26:I[234312,["$1f"],"$25"]
27:"/_next/static/chunks/2chdv7cvyi6i1.js"
28:"/_next/static/chunks/2gbgrs5inxx0j.js"
29:I[953020,["$1f","$27","$28"],"UiDemo"]
2a:I[897367,["$2"],"OutletBoundary"]
a:["$","svg",null,{"width":"0","height":"0","focusable":"false","children":["$","defs",null,{"children":["$","linearGradient",null,{"id":"kochivo-progress-lime","x1":"0%","y1":"100%","x2":"100%","y2":"0%","children":[["$","stop",null,{"offset":"0%","className":"progress-start"}],["$","stop",null,{"offset":"100%","className":"progress-end"}]]}]}]}]
b:["$","$L20",null,{"locale":"en","children":[["$","$L21",null,{"children":[["$","$L23",null,{}],["$","$L3",null,{"parallelRouterKey":"children","template":["$","div",null,{"className":"enter","children":["$","$L4",null,{}]}],"templateStyles":[],"templateScripts":null}]]}],["$","$L24",null,{}],["$","$L26",null,{}]]}]
e:["$","$1","c",{"children":[null,["$","$L3",null,{"parallelRouterKey":"children","template":["$","$L4",null,{}]}]]}]
11:["$","$1","c",{"children":[null,["$","$L3",null,{"parallelRouterKey":"children","template":["$","$L4",null,{}]}]]}]
14:["$","$1","c",{"children":[["$","main",null,{"className":"mx-auto max-w-3xl space-y-6 px-4 pt-8 pb-32","children":[["$","p",null,{"className":"text-sm text-warn","children":"دي صفحة تطوير لعرض مكونات الواجهة"}],["$","h1",null,{"className":"text-3xl font-extrabold","children":"مكونات كوتشيفو"}],["$","$L29",null,{}]]}],[["$","script","script-0",{"src":"/_next/static/chunks/2chdv7cvyi6i1.js","async":true}],["$","script","script-1",{"src":"/_next/static/chunks/2gbgrs5inxx0j.js","async":true}]],["$","$L2a",null,{"children":["$","$1a",null,{"name":"Next.MetadataOutlet","children":"$@2b"}]}]]}]
7:300
2b:null
1e:true
7:C
1d:0
12:"$undefined"
f:"$undefined"
c:"$undefined"
5:"$undefined"
1c:"$undefined"
15:"$undefined"
