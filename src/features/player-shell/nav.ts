import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { Home, MessageCircle, TrendingUp, Utensils } from 'lucide-react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { KoHome } from '@/ui/icons/ko-home';
import { KoPlayerFood } from '@/ui/icons/ko-player-food';
import { KoProgress } from '@/ui/icons/ko-progress';
import { KoForms } from '@/ui/icons/ko-forms';
import { KoCaptainChat } from '@/ui/icons/ko-captain-chat';
import type { NavIcon } from '@/ui/icons/ko-icon';

function navItems(t: Translator<typeof messages>, presentation: 'v4' | 'embedded'): { href: string; label: string; icon: NavIcon; engraved?: boolean }[] {
  const v6 = captainWorkspaceEnabled();
  const assessments = v6 && presentation === 'v4';
  return [
    { href: '/player', label: t(v6 ? 'v6Today' : 'home'), icon: v6 ? KoHome : Home },
    { href: '/player/nutrition', label: t(v6 ? 'v6Food' : 'nutrition'), icon: v6 ? KoPlayerFood : Utensils },
    { href: '/player/progress', label: t(v6 ? 'v6Progress' : 'progress'), icon: v6 ? KoProgress : TrendingUp },
    { href: assessments ? '/player/assessments' : '/player/captain', label: t(assessments ? 'v4Assessments' : 'coach'), icon: v6 ? assessments ? KoForms : KoCaptainChat : MessageCircle },
  ].map(item => v6 ? { ...item, engraved: true } : item);
}

export function playerNav(pathname: string, locale: Locale = 'ar', style?: ArabicStyle, presentation: 'v4' | 'embedded' = 'v4') {
  const items = navItems(createT(messages, locale, style), presentation);
  const active = items.filter(({ href }) => pathname === href ||
    (href !== '/player' && pathname.startsWith(`${href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return items.map((item) => ({ ...item, active: item.href === active }));
}

// The v3 chat composer sits where the floating feedback button would, covering the mic.
export function showsFeedback(pathname: string, v6: boolean) {
  return showsNav(pathname) && !(v6 && pathname === '/player/captain');
}

export function showsNav(pathname: string) {
  return pathname !== '/player/onboarding' && !pathname.startsWith('/player/onboarding/') &&
    pathname !== '/player/workout' && !pathname.startsWith('/player/workout/');
}
