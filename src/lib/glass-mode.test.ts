import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { glassBootScript, glassMode } from './glass-mode';

const cases = [
  [{}, 'blur'],
  [{ stored: null }, 'blur'],
  [{ stored: 'other' }, 'blur'],
  [{ stored: 'solid', deviceMemory: 8, hardwareConcurrency: 8 }, 'solid'],
  [{ stored: 'blur', saveData: true, deviceMemory: 1, hardwareConcurrency: 2 }, 'blur'],
  [{ saveData: true }, 'solid'],
  [{ saveData: false }, 'blur'],
  [{ deviceMemory: 1 }, 'solid'],
  [{ deviceMemory: 2, hardwareConcurrency: 8 }, 'solid'],
  [{ deviceMemory: 3 }, 'blur'],
  [{ hardwareConcurrency: 4 }, 'solid'],
  [{ hardwareConcurrency: 2, deviceMemory: 4 }, 'solid'],
  [{ hardwareConcurrency: 4, deviceMemory: 4 }, 'solid'],
  [{ hardwareConcurrency: 4, deviceMemory: 8 }, 'blur'],
  [{ hardwareConcurrency: 5, deviceMemory: 4 }, 'blur'],
  [{ hardwareConcurrency: 8, deviceMemory: 8 }, 'blur'],
] as const;

describe('glass mode', () => {
  it.each(cases)('selects %j → %s', (input, expected) => {
    expect(glassMode(input)).toBe(expected);
  });

  it.each(cases)('boots with the same decision for %j', (input, expected) => {
    const document = { documentElement: { dataset: { glass: '' } } };
    runInNewContext(glassBootScript, {
      document,
      navigator: { ...input, connection: { saveData: 'saveData' in input && input.saveData } },
      localStorage: { getItem: (key: string) => {
        expect(key).toBe('kochivo.glass');
        return 'stored' in input ? input.stored : null;
      } },
    });
    expect(document.documentElement.dataset.glass).toBe(expected);
  });

  it('boots even when storage is blocked and device hints are absent', () => {
    const document = { documentElement: { dataset: { glass: '' } } };
    runInNewContext(glassBootScript, {
      document, navigator: {},
      get localStorage() { throw new Error('blocked'); },
    });
    expect(document.documentElement.dataset.glass).toBe('blur');
  });
});
