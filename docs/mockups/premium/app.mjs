import { messages as m } from './messages.ts';
import { pages, pageFor } from './model.mjs';
import { icon, field, act, go } from './ui.mjs';
import { renderPublic } from './public.mjs';
import { renderAuth } from './auth.mjs';
import { renderCaptain, captainShell, rosterTable } from './captain.mjs';
import { renderPlayer, playerShell } from './player.mjs';
import { renderSystem } from './system.mjs';

const root = document.getElementById('kochivo-premium');
const product = root.querySelector('#k-product');
const groupSelect = root.querySelector('#k-group');
const pageSelect = root.querySelector('#k-page');
const dialog = root.querySelector('#k-dialog');
const initial = () => ({ page: 'site', search: '', appearance: matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', weight: 60, reps: 10, set: 0, rest: false, eaten: [], water: 1.5, week: 4, day: 0, intakeStep: 0, intake: {}, inbox: 0, replied: false, swaps: {}, swapMeal: 0, extraExercises: [] });
const state = initial();
const remembered = window.openai?.widgetState?.modelContent;
if (remembered?.page) state.page = pageFor(remembered.page).id;
if (['light', 'dark'].includes(remembered?.appearance)) state.appearance = remembered.appearance;
const get = selector => root.querySelector(selector);
get('#k-concept-label').textContent = m.concept;
get('#k-concept-count').textContent = `${pages.length} ${m.page} · ${m.sample}`;
get('#k-group-label').textContent = m.allPages;
get('#k-page-label').textContent = m.page;
get('[data-close-dialog]').innerHTML = icon('x');
get('[data-close-dialog]').setAttribute('aria-label', m.close);
get('#k-appearance').setAttribute('aria-label', m.appearance);
groupSelect.innerHTML = Object.entries(m.groups).map(([id, label]) => `<option value="${id}">${label}</option>`).join('');

function syncIcons() { globalThis.lucide?.createIcons({ attrs: { width: 18, height: 18, 'stroke-width': 1.5 } }); }
function persist() {
  window.openai?.setWidgetState?.({ modelContent: { page: state.page, appearance: state.appearance }, privateContent: null }).catch(() => {});
}
function feedback(value = m.saved) { get('#k-feedback').textContent = value; }
function render() {
  const page = pageFor(state.page);
  root.dataset.appearance = state.appearance;
  get('#k-appearance').innerHTML = icon(state.appearance === 'dark' ? 'sun' : 'moon') + (state.appearance === 'dark' ? m.light : m.dark);
  groupSelect.value = page.group;
  pageSelect.innerHTML = pages.filter(item => item.group === page.group).map(item => `<option value="${item.id}">${item.title}</option>`).join('');
  pageSelect.value = page.id;
  let markup;
  if (page.group === 'public') markup = renderPublic(page);
  else if (page.group === 'auth') markup = renderAuth(page, state);
  else if (page.group === 'captain') markup = captainShell(page, renderCaptain(page, state));
  else if (page.group === 'player') markup = playerShell(page, renderPlayer(page, state));
  else markup = renderSystem(page);
  product.innerHTML = markup;
  product.dataset.page = page.id;
  syncIcons();
}
function navigate(id) {
  dialog.close();
  state.page = pageFor(id).id;
  feedback('');
  render();
  persist();
}
function showDialog(title, html) {
  get('#k-dialog-title').textContent = title;
  get('#k-dialog-content').innerHTML = html;
  dialog.showModal();
  syncIcons();
}
function finishDialog(message = m.saved) { dialog.close(); render(); feedback(message); }

function action(id) {
  if (id === 'toggle-signup') { state.signup = !state.signup; render(); }
  else if (id === 'appearance') { state.appearance = state.appearance === 'dark' ? 'light' : 'dark'; render(); persist(); }
  else if (id === 'coach-menu') showDialog(m.menu, `<div class="k-settings-nav">${['coach-home', 'roster', 'inbox', 'templates', 'leaderboard', 'billing', 'coach-settings'].map(id => go(pageFor(id).title, id)).join('')}</div>`);
  else if (id === 'google-player') navigate('onboarding');
  else if (id === 'google-coach') navigate('coach-home');
  else if (id === 'water') { state.water = Math.min(3, state.water + .25); render(); }
  else if (id === 'finish-set') { state.set = Math.min(2, state.set + 1); state.rest = true; render(); }
  else if (id === 'skip-rest') { state.rest = false; render(); }
  else if (id === 'intake-back') { state.intakeStep = Math.max(0, state.intakeStep - 1); render(); }
  else if (id === 'notifications') showDialog(m.notifications, `<p class="k-dialog-copy">${m.notificationText}</p>${go(m.inbox, pageFor(state.page).group === 'captain' ? 'inbox' : 'progress', true)}`);
  else if (id === 'readiness') showDialog(m.readiness, `<form data-form="dialog">${field(m.sleepQuestion, '7', 'number')}${field(m.sorenessQuestion, m.sorenessValue)}<button type="submit" class="k-button k-primary">${m.save}</button></form>`);
  else if (id === 'invite') showDialog(m.inviteTitle, `<p class="k-dialog-copy">${m.inviteHint}</p><form data-form="invitation">${field(m.name, m.clientName)}${field(m.email, m.playerEmail, 'email')}<button type="submit" class="k-button k-primary">${m.inviteButton}</button></form>`);
  else if (id === 'swap') showDialog(m.swapTitle, `<div class="k-list">${m.mealAlternatives[state.swapMeal].map(([name, amount], i) => `<button type="button" class="k-list-row" data-swap-choice="${i}"><span>${name}<small>${amount}</small></span>${icon('arrow-up-left')}</button>`).join('')}</div>`);
  else if (id === 'checkin') showDialog(m.checkin, `<form data-form="dialog">${field(m.weight, '80.4', 'number')}${field(m.checkinMetrics[1][1], '84', 'number')}<label class="k-field"><span>${m.athleteNotes}</span><textarea rows="3"></textarea></label><button type="submit" class="k-button k-primary">${m.save}</button></form>`);
  else if (id === 'inbody') showDialog(m.inbody, `<form data-form="dialog">${field(m.weight, '80.4', 'number')}${field(m.scanValues[0][1], '36.2', 'number')}${field(m.scanValues[1][1], '18.4', 'number')}<button type="submit" class="k-button k-primary">${m.save}</button></form>`);
  else if (id === 'form-review') showDialog(m.formButton, `<form data-form="dialog"><label class="k-field"><span>${m.formButton}</span><input type="file" accept="video/*"></label><p class="k-dialog-copy">${m.localOnly}</p><button class="k-button k-primary" type="submit">${m.next}</button></form>`);
  else if (id === 'exercise') showDialog(m.addExercise, `<div class="k-list">${m.exercises.map(([name], i) => `<button type="button" data-exercise="${i}" class="k-list-row">${name}${icon('plus')}</button>`).join('')}</div>`);
  else if (id === 'template') showDialog(m.createTemplate, `<form data-form="template">${field(m.name, m.planName)}<button type="submit" class="k-button k-primary">${m.next}</button></form>`);
  else if (id === 'contact-coach' || id === 'support') showDialog(m.contactCoach, `<p class="k-dialog-copy">${m.coachName}</p><p class="k-dialog-copy">${m.localOnly}</p>${go(m.captain, 'coach-site')}`);
  else if (id === 'join-ko') feedback(m.koDone);
  else if (id === 'renew') showDialog(m.renew, `<form data-form="dialog">${field(m.name, m.clientName)}${field(m.month, '1', 'number')}<button type="submit" class="k-button k-primary">${m.save}</button></form>`);
  else if (id === 'admin-review') showDialog(m.review, `<p class="k-dialog-copy">${m.adminRows[0][0]}</p><p class="k-dialog-copy">${m.localOnly}</p>${act(m.save, 'close-saved', true)}`);
  else if (id === 'close-saved') finishDialog();
  else feedback(m.saved);
}

groupSelect.addEventListener('change', () => navigate(pages.find(page => page.group === groupSelect.value).id));
pageSelect.addEventListener('change', () => navigate(pageSelect.value));
get('#k-appearance').addEventListener('click', () => { state.appearance = state.appearance === 'dark' ? 'light' : 'dark'; render(); persist(); });
root.addEventListener('click', event => {
  const target = event.target.closest('button');
  if (!target) return;
  if (target.hasAttribute('data-close-dialog')) { dialog.close(); return; }
  if (target.dataset.anchor) { if (!get(`#k-${target.dataset.anchor}`)) navigate('site'); get(`#k-${target.dataset.anchor}`)?.scrollIntoView({ block: 'start' }); return; }
  if (target.dataset.page) { navigate(target.dataset.page); return; }
  if (target.dataset.action) { action(target.dataset.action); return; }
  if (target.dataset.stepper) {
    const [kind, change] = target.dataset.stepper.split('-');
    state[kind] = Math.max(kind === 'weight' ? 0 : 1, state[kind] + (change === 'plus' ? 1 : -1) * (kind === 'weight' ? 2.5 : 1)); render();
  } else if (target.dataset.meal !== undefined) {
    const index = Number(target.dataset.meal); state.eaten = state.eaten.includes(index) ? state.eaten.filter(i => i !== index) : [...state.eaten, index]; render();
  } else if (target.dataset.swap !== undefined) { state.swapMeal = Number(target.dataset.swap); action('swap'); }
  else if (target.dataset.swapChoice !== undefined) { state.swaps[state.swapMeal] = m.mealAlternatives[state.swapMeal][Number(target.dataset.swapChoice)]; finishDialog(); }
  else if (target.dataset.exercise !== undefined) { state.extraExercises.push(m.exercises[Number(target.dataset.exercise)]); finishDialog(); }
  else if (target.dataset.week !== undefined) { state.week = Number(target.dataset.week); render(); }
  else if (target.dataset.day !== undefined) { state.day = Number(target.dataset.day); render(); }
  else if (target.dataset.inbox !== undefined) { state.inbox = Number(target.dataset.inbox); render(); }
  else if (target.dataset.settings !== undefined) showDialog(m.settingsGroups[Number(target.dataset.settings)], `<p class="k-dialog-copy">${m.localOnly}</p>${act(m.appearance, 'appearance')}<div class="k-form-grid">${field(m.language, m.arabic)}${field(m.units, m.metric)}</div>`);
});
root.addEventListener('input', event => {
  if (event.target.id !== 'k-roster-search') return;
  state.search = event.target.value;
  get('#k-roster-table').innerHTML = rosterTable(state.search);
  syncIcons();
});
root.addEventListener('submit', event => {
  const form = event.target.closest('form');
  if (!form) return;
  event.preventDefault();
  const type = form.dataset.form;
  if (type === 'login') { navigate('coach-home'); return; }
  if (type === 'invite') { if (!state.otp) { state.otp = true; render(); } else navigate('onboarding'); return; }
  if (type === 'forgot') { navigate('reset'); return; }
  if (type === 'reset') { navigate('login'); return; }
  if (type === 'onboarding') {
    state.intake = { ...state.intake, ...Object.fromEntries(new FormData(form)) };
    if (state.intakeStep === 3) { navigate('player-home'); feedback(m.intakeDone); }
    else { state.intakeStep += 1; render(); }
    return;
  }
  if (type === 'reply') { state.replied = true; render(); feedback(m.replySaved); return; }
  if (type === 'invitation') { showDialog(m.inviteReady, `<p class="k-dialog-copy">${m.localOnly}</p>${go(m.inviteHeading, 'invite', true)}`); return; }
  if (type === 'template') { navigate('program'); return; }
  if (type === 'dialog') { finishDialog(); return; }
  feedback();
});
window.addEventListener('openai:set_globals', event => {
  const saved = event.detail?.globals?.widgetState?.modelContent;
  if (saved?.page) { state.page = pageFor(saved.page).id; if (saved.appearance) state.appearance = saved.appearance; render(); }
});
render();
if (globalThis.Tweak) {
  const design = { radius: 14, spacious: true };
  const tweak = new Tweak({ container: root, onChange: () => { root.style.setProperty('--k-radius', `${design.radius}px`); root.style.setProperty('--k-space', design.spacious ? '32px' : '24px'); } });
  tweak.addSlider(design, 'radius', { label: m.radiusControl, min: 8, max: 20, step: 2, unit: 'px' });
  tweak.addToggle(design, 'spacious', { label: m.spaciousControl });
}
window.kochivoConcept = { pages, navigate, state, ready: true, reset() { Object.assign(state, initial()); render(); } };
