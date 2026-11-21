import { messages as m } from './messages.ts';
import { brand, field, go, act, photo, heading } from './ui.mjs';

export function renderAuth(page, state) {
  let title = m.welcome, body = m.authBody, form;
  if (page.id === 'invite') {
    title = state.otp ? m.otpTitle : m.inviteHeading;
    body = state.otp ? m.otpBody : m.inviteBody;
    form = state.otp ? `${field(m.otpLabel, '', 'text', 'otp')}<button type="submit" class="k-button k-primary">${m.next}</button>` :
      `${act(m.google, 'google-player')}${field(m.email, m.playerEmail, 'email', 'email')}<button type="submit" class="k-button k-primary">${m.sendCode}</button>`;
  } else if (page.id === 'forgot') {
    title = m.forgotTitle; body = m.forgotBody;
    form = `${field(m.email, m.emailExample, 'email', 'email')}<button type="submit" class="k-button k-primary">${m.sendCode}</button>${go(m.back, 'login')}`;
  } else if (page.id === 'reset') {
    title = m.resetTitle; body = m.resetBody;
    form = `${field(m.newPassword, '', 'password', 'password')}${field(m.confirmPassword, '', 'password', 'confirm')}<button type="submit" class="k-button k-primary">${m.save}</button>`;
  } else {
    if (state.signup) { title = m.signup; body = m.signupBody; }
    form = `${act(m.google, 'google-coach')}<span class="k-or">${m.orEmail}</span>${state.signup ? field(m.name, '', 'text', 'name') : ''}${field(m.email, m.emailExample, 'email', 'email')}${field(m.password, '', 'password', 'password')}
      <div class="k-auth-link">${go(m.forgot, 'forgot')}</div><button type="submit" class="k-button k-primary">${state.signup ? m.startFree : m.signIn}</button>${act(state.signup ? m.signIn : m.newCoach, 'toggle-signup')}`;
  }
  return `<div class="k-auth-layout"><aside class="k-auth-editorial">${photo('k-editorial-image')}<div>${brand()}<h2>${m.authQuote}<br>${m.authQuoteTwo}</h2><p>${m.authFoot}</p></div></aside><section class="k-auth-main">${brand()}${heading(title, body)}<form data-form="${page.id}">${form}<p class="k-form-error" role="alert"></p></form><p class="k-small k-muted">${m.playerInviteHint}</p></section></div>`;
}
