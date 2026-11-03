import { whatsappUrl } from '@/lib/whatsapp';

export type RadarReason = 'no_activity' | 'never_started' | 'no_program';
export interface RadarPlayer {
  player_id: string;
  full_name: string;
  phone: string | null;
  reason: RadarReason;
  days: number;
}
export type RadarResult = { data: RadarPlayer[]; error?: never } | { error: string; data?: never };

export function radarReasonLabel(reason: RadarReason, days: number): string {
  const duration = `${days} ${days <= 10 ? 'أيام' : 'يوم'}`;
  switch (reason) {
    case 'no_activity': return `مسجّلش تمرين من ${duration}`;
    case 'never_started': return `لسه مبدأش من ${duration}`;
    case 'no_program': return 'من غير برنامج';
  }
}

export function radarMessage(name: string, reason: RadarReason): string {
  switch (reason) {
    case 'no_activity': return `يا ${name}، وحشتنا في التمرين. نرجع النهارده؟`;
    case 'never_started': return `يا ${name}، جاهز نبدأ أول تمرين؟ أنا معاك.`;
    case 'no_program': return `يا ${name}، هجهزلك برنامجك ونبدأ مع بعض.`;
  }
}

export function radarWhatsappUrl(player: Pick<RadarPlayer, 'phone' | 'full_name' | 'reason'>): string | null {
  if (!player.phone) return null;
  return whatsappUrl({ phone: player.phone, text: radarMessage(player.full_name, player.reason) });
}
