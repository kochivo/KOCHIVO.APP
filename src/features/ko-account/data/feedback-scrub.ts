import { latinDigits, privateContact } from './answer-guard';
import { uuidPattern } from './memory-validation';

function clean(value: string) {
  return latinDigits(value.normalize('NFKD').replace(/[\p{Cf}\p{M}\u0640]/gu, ''));
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function scrubFeedback(text: string, ownName: string, playerNames: readonly string[], limit: number) {
  const names = new Map<string, string>();
  for (const [name, replacement] of [[ownName, 'انا'] as const, ...playerNames.map(name => [name, 'لاعب'] as const)]) {
    const full = clean(name).trim().toLowerCase().replace(/\s+/g, ' ');
    if (!full) continue;
    for (const part of [full, ...full.split(' ')]) {
      if (!names.has(part)) names.set(part, replacement);
    }
  }
  const alternatives = [...names.keys()].sort((a, b) => b.length - a.length)
    .map(name => escapeRegex(name).replace(/ /g, '\\s+'));
  const safe = clean(text.replace(/^\s*\[(?:me|memory)\][^\r\n]*/gim, ''))
    .replace(uuidPattern, '').replace(privateContact, '');
  const redacted = alternatives.length ? safe.replace(
    new RegExp('(?<![\\p{L}\\p{N}])([وف]?[بكل]?)(' + alternatives.join('|') + ')(?![\\p{L}\\p{N}])', 'giu'),
    (_match, prefix: string, name: string) => prefix + names.get(name.toLowerCase().replace(/\s+/g, ' ')),
  ) : safe;
  return [...redacted.trim()].slice(0, limit).join('');
}
