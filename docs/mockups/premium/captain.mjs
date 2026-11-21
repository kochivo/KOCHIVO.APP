import { messages as m } from './messages.ts';
import { filterPlayers } from './model.mjs';
import { heading, go, act, stats, avatar, icon, list, table, sectionTitle, athleteTabs, profileSettings, esc, photo, tag } from './ui.mjs';

export function rosterTable(query = '', billing = false) {
  const roster = filterPlayers(m.roster, query);
  if (!roster.length) return `<div class="k-empty">${icon('search')}<h2>${m.noResults}</h2><p>${m.noResultsHint}</p></div>`;
  return table(m.rosterHeaders, roster.map(player => [
    `<button type="button" class="k-person" data-page="athlete">${avatar(player.initials)}<span><strong>${esc(player.name)}</strong><small>${esc(player.status)}</small></span></button>`,
    esc(player.activity), `<span dir="ltr">${player.adherence}</span>`, esc(player.subscription),
    billing ? act(m.renew, 'renew') : go(m.open, 'athlete', false, 'arrow-up-left'),
  ]));
}

function dashboard() {
  return `${heading(m.coachGreeting, m.coachSubtitle, act(m.invite, 'invite', true, 'plus'))}${stats(m.coachStats)}
    <section class="k-attention"><div>${tag(m.attention)}<h2>${m.attentionBody}</h2></div>${go(m.reviewNow, 'inbox', false, 'arrow-up-left')}</section>
    <div class="k-dashboard-columns"><section>${sectionTitle(m.activity, go(m.players, 'roster'))}${list(m.activityItems)}</section>
      <section class="k-week-section">${sectionTitle(m.weekly)}<div class="k-week">${m.weekDays.map((d, i) => `<div${i === 4 ? ' class="is-today"' : ''}><small>${d}</small><strong>${m.weekNumbers[i]}</strong><span>${i < 4 ? icon('check') : ''}</span></div>`).join('')}</div><p class="k-muted">${m.date}</p><div class="k-inline-note">${icon('calendar-days')}<span>${m.planName}<br><small>${m.planDetail}</small></span></div></section></div>`;
}

function athlete(page) {
  const intro = `${heading(m.clientName, m.athleteSubtitle, act(m.edit, 'saved'))}${athleteTabs(page.id)}`;
  if (page.id === 'athlete-programs') return `${intro}${sectionTitle(m.currentPlan, go(m.editPlan, 'program', true))}<div class="k-plan-list">${m.programDays.map((day, i) => `<button type="button" data-page="program"><span class="k-process-no">0${i + 1}</span><div><h2>${day}</h2><p>${m.playerWorkoutSub}</p></div>${icon('arrow-up-left')}</button>`).join('')}</div>`;
  if (page.id === 'athlete-nutrition') return `${intro}${stats(m.macros)}${sectionTitle(m.assignedFood, go(m.edit, 'meal-builder', true))}${list(m.meals.map(([name, title, , calories]) => [name, title, `${calories} ${m.kcal}`]))}`;
  if (page.id === 'athlete-preview') return `${intro}<div class="k-preview-header"><h2>${m.previewTitle}</h2><p>${m.previewSub}</p>${go(m.demoPlayer, 'player-home', true)}</div><div class="k-mini-workout"><small>${m.trainingDay}</small><h2>${m.playerWorkoutTitle}</h2><p>${m.playerWorkoutSub}</p>${go(m.startWorkout, 'workout', true)}</div>`;
  return `${intro}${stats(m.athleteStats)}<div class="k-two-columns"><section>${sectionTitle(m.currentPlan)}<div class="k-text-feature"><span>${icon('dumbbell')}</span><h2>${m.planName}</h2><p>${m.planDetail}</p>${go(m.editPlan, 'program', true)}</div></section>
    <section>${sectionTitle(m.assignedFood)}<div class="k-text-feature"><span>${icon('utensils')}</span><h2>${m.assignedFood}</h2><p>${m.foodPlanDetail}</p>${go(m.open, 'meal-builder')}</div></section></div>${sectionTitle(m.athleteNotes)}<p class="k-note-copy">${m.athleteNoteBody}</p>${sectionTitle(m.activity)}${list(m.activityItems.slice(0, 2))}`;
}

function programs(state) {
  return `${heading(m.programTitle, m.programSub, act(m.save, 'saved', true))}<nav class="k-tabs" aria-label="${m.training}">${m.programDays.map((day, i) => `<button type="button" data-day="${i}" aria-current="${state.day === i ? 'page' : 'false'}">${day}</button>`).join('')}</nav>
    ${table(m.exerciseHeaders, [...m.exercises, ...state.extraExercises].map(([name, sets, reps, rest]) => [`<span class="k-exercise-title">${icon('grip-vertical')}${esc(name)}</span>`, `<input class="k-cell-input" aria-label="${m.sets} ${esc(name)}" type="number" value="${sets}" min="1" max="10">`, `<span dir="ltr">${reps}</span>`, rest]))}
    <div class="k-builder-bottom">${act(m.addExercise, 'exercise', false, 'plus')}<span class="k-muted">${m.planDetail}</span></div>`;
}

function mealsBuilder() {
  return `${heading(m.assignedFood, m.mealSub, act(m.save, 'saved', true))}${stats(m.macros)}<div class="k-meal-editor">${m.meals.map(([name, title, amount, kcal], i) => `<section>${sectionTitle(`${String(i + 1).padStart(2, '0')} / ${name}`, act(m.edit, 'saved'))}<h3>${title}</h3><p>${amount}</p><div class="k-meal-bottom"><span>${kcal} ${m.kcal}</span>${act(m.add, 'food', false, 'plus')}</div></section>`).join('')}</div>`;
}

function inbox(state) {
  const selected = state.inbox ?? 0;
  return `${heading(m.inboxTitle, m.inboxSub)}<div class="k-inbox-layout"><nav class="k-inbox-list">${m.inboxNames.map(([name, type, time], i) => `<button type="button" data-inbox="${i}" aria-pressed="${selected === i}"><strong>${name}</strong><span>${type}</span><small>${time}</small></button>`).join('')}</nav>
    <section class="k-review">${sectionTitle(m.inboxNames[selected][0], tag(state.replied ? m.completed : m.pending))}${selected === 1 ? `<div class="k-video-placeholder">${photo('k-editorial-image')}${icon('play')}</div>` : stats(m.checkinMetrics)}<p class="k-note-copy">${m.checkinText}</p>
    <form data-form="reply"><label class="k-field"><span>${m.replyLabel}</span><textarea rows="4" placeholder="${m.replyHint}"></textarea></label><div class="k-action-row">${act(m.formButton, 'saved', false, 'mic')}<button type="submit" class="k-button k-primary">${m.replyButton}</button></div></form></section></div>`;
}

function leaderboard() {
  return `${heading(m.boardTitle, m.boardSub)}<div class="k-month-line"><span>${m.monthName}</span>${tag(m.crown)}</div><div class="k-crown-feature">${icon('crown')}<div><small>${m.crownHint}</small><h2>${m.roster[4].name}</h2></div><strong dir="ltr">96<span>%</span></strong></div>
    ${table(m.boardColumns, m.boardRows.map(row => row.map((value, i) => `<span${i === 0 || i > 1 ? ' dir="ltr"' : ''}>${value}</span>`)))}`;
}

export function renderCaptain(page, state) {
  if (page.id === 'coach-home') return dashboard();
  if (page.id === 'roster') return `${heading(m.rosterTitle, m.rosterSubtitle, act(m.invite, 'invite', true, 'plus'))}<label class="k-search">${icon('search')}<input id="k-roster-search" type="search" placeholder="${m.search}" aria-label="${m.search}" value="${esc(state.search)}"></label><div id="k-roster-table">${rosterTable(state.search)}</div>`;
  if (page.id.startsWith('athlete')) return athlete(page);
  if (page.id === 'program') return programs(state);
  if (page.id === 'meal-builder') return mealsBuilder();
  if (page.id === 'inbox') return inbox(state);
  if (page.id === 'leaderboard') return leaderboard();
  if (page.id === 'templates') return `${heading(m.templateTitle, m.templateSubtitle, act(m.createTemplate, 'template', true, 'plus'))}<div class="k-library">${m.templateNames.map(([name, kind, detail], i) => `<button type="button" data-page="${i === 2 ? 'meal-builder' : 'program'}"><span class="k-library-index" dir="ltr">0${i + 1}</span><div><small>${kind}</small><h2>${name}</h2><p>${detail}</p></div>${icon('arrow-up-left')}</button>`).join('')}</div>`;
  if (page.id === 'billing') return `${heading(m.billingTitle, m.billingSub)}${stats(m.billingStats)}<div class="k-subscription-line"><div><h2>${m.subscriptionLabel}</h2><p>${m.nextRenewal}</p></div>${act(m.edit, 'saved')}</div>${rosterTable('', true)}`;
  return profileSettings(false);
}

export function captainShell(page, body) {
  const menu = [['coach-home', 'house', m.home], ['roster', 'users-round', m.players], ['inbox', 'inbox', m.inbox], ['templates', 'layers-2', m.templates], ['leaderboard', 'trophy', m.leaderboard], ['billing', 'credit-card', m.billing], ['coach-settings', 'settings-2', m.settings]];
  const selected = page.id.startsWith('athlete') ? 'roster' : ['program', 'meal-builder'].includes(page.id) ? 'templates' : page.id;
  return `<div class="k-captain-shell"><aside class="k-sidebar"><div class="k-sidebar-brand">${go(m.brand, 'site')}</div><nav>${menu.map(([id, glyph, title]) => `<button data-page="${id}" type="button" aria-current="${selected === id ? 'page' : 'false'}">${icon(glyph)}<span>${title}</span>${id === 'inbox' ? '<small>3</small>' : ''}</button>`).join('')}</nav><div class="k-coach-id">${avatar(m.coachInitials)}<div><strong>${m.coachName}</strong><small>${m.coachRole}</small></div></div></aside><div class="k-workspace"><div class="k-workspace-bar"><span>${m.date}</span><span class="k-coach-mobile-menu">${act(m.menu, 'coach-menu', false, 'menu')}</span>${act(m.notifications, 'notifications', false, 'bell')}</div><main class="k-workspace-content">${body}</main></div></div>`;
}
