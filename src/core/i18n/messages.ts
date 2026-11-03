import { intlLocale } from './locale';
import type { Locale } from './locale';

type Dictionary = Record<string, string>;
type ArabicPlural = 'zero' | 'two' | 'few' | 'many';
type EnglishKey<K> = K extends `${string}.${ArabicPlural}` ? never : K;
type English<A> = Record<EnglishKey<keyof A>, string>;
export type Messages = { ar: Dictionary; en: Dictionary };
type PluralBase<K> = K extends `${infer Base}.other` ? Base : never;
export type MessageKey<M extends Messages> = Extract<keyof M['ar'], string> | PluralBase<keyof M['ar']>;
export type Variables = Record<string, string | number>;
export type Translator<M extends Messages> = (key: MessageKey<M>, vars?: Variables) => string;

// Arabic-only plural categories are the sole exception to exact dictionary parity.
export function defineMessages<const A extends Dictionary, const E extends English<A>>(
  messages: { ar: A; en: E & Record<Exclude<keyof E, keyof English<A>>, never> },
): { ar: A; en: E } {
  return messages;
}

export function createT<M extends Messages>(messages: M, locale: Locale): Translator<M> {
  const dictionary: Dictionary = messages[locale];
  const plurals = new Intl.PluralRules(intlLocale(locale));
  return (key, vars = {}) => {
    const count = vars.n;
    const template = dictionary[key] ?? (typeof count === 'number'
      ? dictionary[`${key}.${plurals.select(count)}`] ?? dictionary[`${key}.other`]
      : undefined);
    if (template === undefined) throw new Error(`Missing message: ${String(key)} (${locale})`);
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      vars[name] === undefined ? placeholder : String(vars[name]));
  };
}
