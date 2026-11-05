type Step = (signal: AbortSignal) => Promise<unknown>;
interface SignOutSteps { push: Step; sync: Step; auth: Step; cache: Step; close: Step }

async function bestEffort(step: Step) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([Promise.resolve().then(() => step(controller.signal)),
      new Promise<void>(resolve => { timer = setTimeout(resolve, 2000); })]);
  } catch { /* Device cleanup must never prevent sign-out. */ }
  finally { controller.abort(); clearTimeout(timer); }
}

export async function signOutDevice(steps: SignOutSteps) {
  await bestEffort(steps.push);
  await bestEffort(steps.sync);
  try { return await steps.auth(new AbortController().signal); }
  finally {
    await bestEffort(steps.cache);
    await bestEffort(steps.close);
  }
}
