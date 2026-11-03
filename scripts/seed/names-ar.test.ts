import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface Exercise {
  dataset_id: string;
  name_en: string;
  name_ar?: string | null;
}
interface Proposal {
  dataset_id: string;
  name_en: string;
  name_ar: string;
  confidence: string;
  note?: string;
}

const source = new URL('../../supabase/seed/source/', import.meta.url);
const exercises: Exercise[] = JSON.parse(readFileSync(new URL('exercises-gif.json', source), 'utf8'));
const proposalText = readFileSync(new URL('exercise-names-ar.proposed.json', source), 'utf8');
const proposals: Proposal[] = JSON.parse(proposalText);

describe('Arabic exercise name proposals', () => {
  it('is a UTF-8 JSON array without a BOM and is sorted by dataset id', () => {
    expect(proposalText.charCodeAt(0)).not.toBe(0xfeff);
    expect(Array.isArray(proposals)).toBe(true);
    const ids = proposals.map((entry) => entry.dataset_id);
    expect(ids).toEqual([...ids].sort());
  });

  it('covers every missing id exactly once, without existing names or unknown ids', () => {
    const missingIds = exercises.filter((entry) => !entry.name_ar).map((entry) => entry.dataset_id);
    const ids = proposals.map((entry) => entry.dataset_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(missingIds.sort());
  });

  it('keeps the original English names for review', () => {
    const byId = new Map(exercises.map((entry) => [entry.dataset_id, entry]));
    for (const proposal of proposals) {
      expect(proposal.name_en, proposal.dataset_id).toBe(byId.get(proposal.dataset_id)?.name_en);
    }
  });

  it('has short Arabic names without Latin letters and valid confidence levels', () => {
    for (const proposal of proposals) {
      expect(proposal.name_ar.trim(), proposal.dataset_id).not.toBe('');
      expect(proposal.name_ar.length, proposal.dataset_id).toBeLessThanOrEqual(60);
      expect(proposal.name_ar, proposal.dataset_id).toMatch(/[\u0621-\u064a]/u);
      expect(proposal.name_ar, proposal.dataset_id).not.toMatch(/\p{Script=Latin}/u);
      expect(['high', 'medium', 'low'], proposal.dataset_id).toContain(proposal.confidence);
      if (proposal.confidence !== 'high') {
        expect(proposal.note?.trim(), proposal.dataset_id).toBeTruthy();
      }
    }
  });
});
