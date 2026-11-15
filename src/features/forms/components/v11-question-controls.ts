import { Hash, Image, List, Star, Type } from 'lucide-react';

export const questionIcons = { number: Hash, text: Type, choice: List, multi: List, yesno: List, scale: Star, photos: Image };
export const questionTypes = ['number', 'text', 'choice', 'scale', 'photos', 'multi', 'yesno'] as const;
export const editorButton = 'glass press inline-flex min-h-12 min-w-12 cursor-pointer items-center justify-center gap-2 rounded-full border border-line px-3 text-xs hover:bg-surface-raised focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-default disabled:opacity-40';
