import { intlLocale } from './locale';
import type { ArabicStyle, Locale } from './locale';
import { internationalEnabled } from '@/lib/international-enabled';

type Dictionary = Record<string, string>;
type ArabicPlural = 'zero' | 'two' | 'few' | 'many';
type EnglishKey<K> = K extends `${string}.${ArabicPlural}` ? never : K;
type English<A> = Record<EnglishKey<keyof A>, string>;
export type Messages = { ar: Dictionary; en: Dictionary; arStd?: Dictionary };
type Placeholders<S extends string> = S extends `${string}{${infer P}}${infer Rest}` ? P | Placeholders<Rest> : never;
type Standard<A extends Dictionary, S extends Partial<Record<keyof A, string>>> = {
  [K in keyof S]: K extends keyof A ? S[K] extends string
    ? [Placeholders<A[K]>] extends [Placeholders<S[K]>]
      ? [Placeholders<S[K]>] extends [Placeholders<A[K]>] ? S[K] : never : never
    : never : never;
};
type PluralBase<K> = K extends `${infer Base}.other` ? Base : never;
export type MessageKey<M extends Messages> = Extract<keyof M['ar'], string> | PluralBase<keyof M['ar']>;
export type Variables = Record<string, string | number>;
export type Translator<M extends Messages> = (key: MessageKey<M>, vars?: Variables) => string;

// Arabic-only plural categories are the sole exception to exact dictionary parity.
export function defineMessages<const A extends Dictionary, const E extends English<A>,
  const S extends Partial<Record<keyof A, string>> = Record<never, never>>(
  messages: { ar: A; en: E & Record<Exclude<keyof E, keyof English<A>>, never>; arStd?: S & Standard<A, S> },
): { ar: A; en: E; arStd?: S } {
  return messages;
}

export function createT<M extends Messages>(messages: M, locale: Locale, style: ArabicStyle = 'egyptian'): Translator<M> {
  const dictionary: Dictionary = locale === 'ar' && style === 'standard' && internationalEnabled()
    ? { ...messages.ar, ...messages.arStd } : messages[locale];
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
