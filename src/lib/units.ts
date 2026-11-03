export type Units = 'metric' | 'imperial';

export function formatWeight(kg: number, units: Units = 'metric', locale = 'ar') {
  return new Intl.NumberFormat(locale, { style: 'unit', unit: units === 'imperial' ? 'pound' : 'kilogram',
    maximumFractionDigits: 1 }).format(units === 'imperial' ? kg * 2.2046226218 : kg);
}

export function formatLength(cm: number, units: Units = 'metric', locale = 'ar') {
  return new Intl.NumberFormat(locale, { style: 'unit', unit: units === 'imperial' ? 'inch' : 'centimeter',
    maximumFractionDigits: 1 }).format(units === 'imperial' ? cm / 2.54 : cm);
}
