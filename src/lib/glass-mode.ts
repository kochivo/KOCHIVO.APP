type GlassInput = {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  saveData?: boolean;
  stored?: string | null;
};

export function glassMode(input: GlassInput): 'solid' | 'blur' {
  if (input.stored === 'solid' || input.stored === 'blur') return input.stored;
  if (input.saveData || (input.deviceMemory !== undefined && input.deviceMemory <= 2) ||
    (input.hardwareConcurrency !== undefined && input.hardwareConcurrency <= 4 &&
      (input.deviceMemory === undefined || input.deviceMemory <= 4))) return 'solid';
  return 'blur';
}

// Serialise the pure function so the pre-paint decision cannot drift from the tested thresholds.
export const glassBootScript = `(()=>{
  let stored=null;
  try{stored=localStorage.getItem('kochivo.glass')}catch{}
  document.documentElement.dataset.glass=(${glassMode.toString()})({
    stored,deviceMemory:navigator.deviceMemory,
    hardwareConcurrency:navigator.hardwareConcurrency,saveData:navigator.connection?.saveData
  });
})()`;
