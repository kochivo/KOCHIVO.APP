import { messages as m } from './messages.ts';
import { heading, go, act, stats, icon, photo, sectionTitle, list, avatar, field, tag, profileSettings, weightChart } from './ui.mjs';

function playerHome(state) {
  return `${heading(m.playerGreeting, m.playerSubtitle)}<div class="k-player-status"><span>${icon('check')}${m.synced}</span>${go(m.rankName, 'rank')}</div>
    <section class="k-workout-feature">${photo('k-editorial-image')}<div><small>${m.trainingDay}</small><h2>${m.playerWorkoutTitle}</h2><p>${m.playerWorkoutSub}</p>${go(m.startWorkout, 'workout', true, 'arrow-up-left')}</div></section>
    <section class="k-player-week">${sectionTitle(m.weekProgress, `<span class="k-muted">${m.weekDone}</span>`)}<div class="k-week">${m.weekDays.map((day, i) => `<button type="button" data-week="${i}" aria-pressed="${state.week === i}"><small>${day}</small><span>${[0, 2].includes(i) ? icon('check') : m.weekNumbers[i]}</span></button>`).join('')}</div></section>
    <div class="k-two-columns"><section class="k-readiness">${sectionTitle(m.readiness, act(m.edit, 'readiness'))}<p>${m.readinessSub}</p><div class="k-readiness-values"><span>${m.sleepValue}</span><span>${m.sorenessValue}</span></div></section>
    <section class="k-water">${sectionTitle(m.water)}<p class="k-water-number glass-strong"><strong dir="ltr">${state.water.toFixed(2).replace(/0$/, '')}</strong><span>${m.waterGoal}</span></p>${act(m.addWater, 'water', false, 'plus')}</section></div>
    ${sectionTitle(m.nextMeal, go(m.nutrition, 'nutrition'))}<div class="k-next-meal"><div><h3>${m.nextMealTitle}</h3><p>${m.mealHint}</p></div>${icon('utensils')}</div>`;
}

function workout(state) {
  if (state.rest) return `<section class="k-focus-workout">${go(m.back, 'player-home', false, 'arrow-right')}<p class="k-eyebrow">${m.setDone}</p><h1>${m.restTitle}</h1><p>${m.restSub}</p><strong class="k-rest-time glass-strong" dir="ltr">01:30</strong><div class="k-rest-progress"><span></span></div>${act(m.skipRest, 'skip-rest', true)}</section>`;
  const stepper = (label, value, unit, kind) => `<section class="k-stepper"><p>${label} <small>${unit}</small></p><div><button type="button" aria-label="${m.decrease} ${label}" data-stepper="${kind}-minus">${icon('minus')}</button><strong class="glass-strong" dir="ltr">${value}</strong><button type="button" aria-label="${m.increase} ${label}" data-stepper="${kind}-plus">${icon('plus')}</button></div></section>`;
  return `${go(m.back, 'player-home', false, 'arrow-right')}<div class="k-workout-topline"><span>${m.training}</span><span dir="ltr">${state.set + 1} / 3</span></div>${heading(m.workoutTitle, m.workoutProgress.replace('{set}', String(state.set + 1)))}
    <div class="k-exercise-media">${photo('k-editorial-image')}<span>${m.trainingDay}</span></div><p class="k-last-performance">${m.lastPerformance}</p>
    <div class="k-two-columns">${stepper(m.weightLabel, state.weight, m.kg, 'weight')}${stepper(m.repsLabel, state.reps, m.reps, 'reps')}</div>${act(m.finishSet, 'finish-set', true, 'check')}<div class="k-form-link">${act(m.formButton, 'form-review', false, 'video')}</div>`;
}

function nutrition(state) {
  return `${heading(m.mealTitle, m.mealSub)}${stats(m.macros)}<div class="k-meals">${m.meals.map(([name, title, amount, calories], i) => `<section class="k-meal"><div class="k-meal-index" dir="ltr">0${i + 1}</div><div class="k-meal-info"><div class="k-meal-heading"><small>${name}</small><span>${calories} ${m.kcal}</span></div><h2>${state.swaps[i]?.[0] ?? title}</h2><p>${state.swaps[i]?.[1] ?? amount}</p><div class="k-action-row"><button type="button" class="k-button ${state.eaten.includes(i) ? 'k-done' : ''}" data-meal="${i}" aria-pressed="${state.eaten.includes(i)}">${icon(state.eaten.includes(i) ? 'check-check' : 'check')}${state.eaten.includes(i) ? m.eatenDone : m.eaten}</button><button type="button" class="k-button" data-swap="${i}">${m.swap}${icon('repeat-2')}</button></div></div></section>`).join('')}</div>`;
}

function progress() {
  return `${heading(m.progressTitle, m.progressSub, act(m.checkin, 'checkin', true, 'plus'))}${stats(m.progressStats)}${sectionTitle(m.weightJourney)}${weightChart()}
    ${sectionTitle(m.inbody, act(m.add, 'inbody', false, 'plus'))}<p class="k-muted">${m.scanHint}</p>${stats(m.scanValues)}${sectionTitle(m.history, go(m.open, 'history', false, 'arrow-up-left'))}${list(m.historyRows.slice(0, 2))}`;
}

function rank() {
  return `${heading(m.rankTitle, m.rankSub)}<section class="k-rank-hero"><div>${icon('award')}<span>${m.rankName}</span></div><strong class="glass-strong" dir="ltr">${m.rankPoints}<small>${m.points}</small></strong><p>${m.rankNext}</p></section>
    <div class="k-rank-track">${m.rankTiers.map((tier, i) => `<div class="${i <= 2 ? 'is-reached' : ''}"><span></span><small>${tier}</small></div>`).join('')}</div>
    <section class="k-crown-note">${icon('crown')}<div><h2>${m.crownPlayerHint}</h2><p>${m.crownRule}</p></div></section>${sectionTitle(m.points)}${list(m.pointsHistory.map(([reason, points]) => [reason, m.date, points]))}`;
}

function onboarding(state) {
  const step = state.intakeStep ?? 0;
  const sections = [
    `${field(m.name, state.intake?.name ?? m.clientName, 'text', 'name')}<div class="k-form-grid">${field(m.age, '25', 'number', 'age')}${field(m.height, '175', 'number', 'height')}${field(m.weight, '80', 'number', 'weight')}</div>`,
    `<fieldset><legend>${m.schedule}</legend><div class="k-choice-days">${m.weekDays.map((d, i) => `<label><input type="checkbox" name="day-${i}"${i % 2 === 0 ? ' checked' : ''}><span>${d}</span></label>`).join('')}</div></fieldset>`,
    `<label class="k-field"><span>${m.health}</span><textarea rows="4">${m.noHealth}</textarea></label>`,
    `<label class="k-field"><span>${m.foodAllergy}</span><select>${m.allergies.map(a => `<option>${a}</option>`).join('')}</select></label>`,
  ];
  return `<div class="k-intake"><p class="k-eyebrow">${m.coachName}</p>${heading(m.onboardTitle, m.onboardSub)}<div class="k-intake-progress">${m.onboardSteps.map((name, i) => `<span class="${i <= step ? 'is-current' : ''}"><b>0${i + 1}</b>${name}</span>`).join('')}</div><form data-form="onboarding">${sections[step]}<div class="k-action-row">${step ? act(m.back, 'intake-back') : ''}<button type="submit" class="k-button k-primary">${step === 3 ? m.sendIntake : m.next}</button></div></form></div>`;
}

export function renderPlayer(page, state) {
  if (page.id === 'player-home') return playerHome(state);
  if (page.id === 'workout') return workout(state);
  if (page.id === 'nutrition') return nutrition(state);
  if (page.id === 'progress') return progress();
  if (page.id === 'history') return `${heading(m.history, m.historySub)}${list(m.historyRows)}${sectionTitle(m.lastPerformance)}${list(m.exercises.map(([name, sets, reps]) => [name, `${sets} ${m.sets}`, reps]))}`;
  if (page.id === 'rank') return rank();
  if (page.id === 'onboarding') return onboarding(state);
  if (page.id === 'my-coach') return `${heading(m.myCoachTitle, m.myCoachSub)}<section class="k-my-coach">${avatar(m.coachInitials, true)}<h2>${m.coachName}</h2><p>${m.coachRole}</p>${act(m.contactCoach, 'contact-coach', true, 'message-circle')}</section><div class="k-subscription-details">${tag(m.active)}<h2>${m.subscriptionUntil}</h2><p>${m.memberSince}</p></div>${list(m.coachingItems.map(item => [item, '', '']))}`;
  return profileSettings(true);
}

export function playerShell(page, body) {
  const focus = ['workout', 'onboarding'].includes(page.id);
  const menu = [['player-home', 'house', m.home], ['nutrition', 'utensils', m.nutrition], ['progress', 'trending-up', m.progress], ['my-coach', 'message-circle', m.captain]];
  return `<div class="k-player-shell"><header class="k-player-header"><button type="button" data-page="site" class="k-wordmark-text">${m.brand}</button><div>${go(m.settings, 'player-settings', false, 'settings-2')}${act(m.notifications, 'notifications', false, 'bell')}</div></header><main class="k-player-content${focus ? ' k-focus-content' : ''}">${body}</main>${focus ? '' : `<nav class="k-bottom-nav">${menu.map(([id, glyph, label]) => `<button type="button" data-page="${id}" aria-current="${page.id === id ? 'page' : 'false'}">${icon(glyph)}<span>${label}</span></button>`).join('')}</nav>`}</div>`;
}
