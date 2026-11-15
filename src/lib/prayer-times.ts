import { DEFAULT_TIMEZONE } from './dates';
export type PrayerCity = { code: string; lat: number; lng: number; timezone: string };

const egypt = [
  ['cairo', 30.0444, 31.2357], ['alexandria', 31.2001, 29.9187],
  ['giza', 30.0131, 31.2089], ['banha', 30.4667, 31.1833], ['tanta', 30.7865, 31.0004],
  ['mansoura', 31.0409, 31.3785], ['zagazig', 30.5877, 31.502], ['damanhur', 31.0341, 30.4682],
  ['shebin-el-kom', 30.5595, 31.009], ['kafr-el-sheikh', 31.1107, 30.9388],
  ['damietta', 31.4175, 31.8144], ['port-said', 31.2653, 32.3019], ['ismailia', 30.5965, 32.2715],
  ['suez', 29.9668, 32.5498], ['arish', 31.1321, 33.8033], ['el-tor', 28.2417, 33.6222],
  ['hurghada', 27.2579, 33.8116], ['marsa-matruh', 31.3543, 27.2373],
  ['faiyum', 29.3084, 30.8428], ['beni-suef', 29.0661, 31.0994], ['minya', 28.1099, 30.7503],
  ['asyut', 27.1809, 31.1837], ['sohag', 26.5569, 31.6948], ['qena', 26.1551, 32.716],
  ['luxor', 25.6872, 32.6396], ['aswan', 24.0889, 32.8998], ['kharga', 25.439, 30.5586],
] as const;
export const PRAYER_CITIES: readonly PrayerCity[] = [
  ...egypt.map(([code, lat, lng]) => ({ code, lat, lng, timezone: DEFAULT_TIMEZONE })),
  { code: 'riyadh', lat: 24.7136, lng: 46.6753, timezone: 'Asia/Riyadh' },
  { code: 'jeddah', lat: 21.4858, lng: 39.1925, timezone: 'Asia/Riyadh' },
  { code: 'dubai', lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai' },
  { code: 'kuwait', lat: 29.3759, lng: 47.9774, timezone: 'Asia/Kuwait' },
  { code: 'doha', lat: 25.2854, lng: 51.531, timezone: 'Asia/Qatar' },
  { code: 'amman', lat: 31.9454, lng: 35.9284, timezone: 'Asia/Amman' },
  { code: 'london', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
];
const cairo: PrayerCity = { code: 'cairo', lat: 30.0444, lng: 31.2357, timezone: DEFAULT_TIMEZONE };
export function defaultCityForTimezone(timezone: string): PrayerCity {
  return PRAYER_CITIES.find(city => city.timezone === timezone) ?? cairo;
}

// NOAA fractional-year approximation, evaluated at solar noon in UTC.
function solar(date: string) {
  const midnight = Date.parse(`${date}T00:00:00Z`);
  const year = new Date(midnight).getUTCFullYear();
  const day = (midnight - Date.UTC(year, 0, 1)) / 86400000 + 1;
  const gamma = 2 * Math.PI / 365 * (day - 1);
  const equation = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  return { midnight, equation, declination };
}
export function sunsetAndFajr(date: string, city: PrayerCity): { maghrib: Date; fajr: Date } {
  const { midnight, equation, declination } = solar(date);
  const radians = Math.PI / 180, latitude = city.lat * radians;
  const angle = (zenith: number) => Math.acos((Math.cos(zenith * radians) / Math.cos(latitude)
    - Math.tan(latitude) * Math.sin(declination)) / Math.cos(declination)) / radians;
  const noon = 720 - 4 * city.lng - equation;
  return {
    maghrib: new Date(midnight + (noon + 4 * angle(90.833) + 1) * 60000),
    fajr: new Date(midnight + (noon - 4 * angle(109.5)) * 60000),
  };
}
