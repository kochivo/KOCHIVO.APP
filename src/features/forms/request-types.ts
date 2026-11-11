import type { Tables } from '@/types/database';
import type { Question } from './types';
export type FormRequest = Tables<'form_requests'>;
export type RequestData = { request: FormRequest; title: string; questions: Question[]; answers: Tables<'form_answers'>[] };
export type SendRequestInput = {id:string;form_id:string;player_id:string;due_at:string|null};
