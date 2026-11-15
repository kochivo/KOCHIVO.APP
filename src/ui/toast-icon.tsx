'use client';

import { Banknote, Check, ClipboardCheck, Copy, Dumbbell, MessageCircle, UserRoundPlus, Utensils } from 'lucide-react';
import type { ToastIconName } from './toast-icon-names';

const icons = { program: Dumbbell, meal: Utensils, player: UserRoundPlus, payment: Banknote, message: MessageCircle, form: ClipboardCheck, template: Copy, check: Check };

export default function ToastIcon({ name }: { name: ToastIconName }) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" className="size-5" />;
}
