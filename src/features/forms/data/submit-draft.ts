export async function submitDraft(write:()=>Promise<{ok:boolean}>,clear:()=>void):Promise<boolean> {
  try {
    if (!(await write()).ok) return false;
    clear();return true;
  } catch {return false;}
}
