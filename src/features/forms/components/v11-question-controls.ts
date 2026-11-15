import { Hash, Image, List, Star, Type } from 'lucide-react';
import { buttonClass, clickableClass } from '@/ui/button';

export const questionIcons = { number: Hash, text: Type, choice: List, multi: List, yesno: List, scale: Star, photos: Image };
export const questionTypes = ['number', 'text', 'choice', 'scale', 'photos', 'multi', 'yesno'] as const;
export const editorButton = buttonClass({ variant: 'secondary', block: false, className: `${clickableClass} min-w-12 rounded-full px-3 text-xs disabled:opacity-40` });
