import type { Tables } from '@/types/database';
import type { Measurements } from './deltas';
import type { Translator } from '@/core/i18n/messages';
import type { messages } from './messages';

export type Scan = Tables<'body_scans'>;
export type ScanInput = Measurements & { scan_date: string };
export type ScanTranslator = Translator<typeof messages>;
