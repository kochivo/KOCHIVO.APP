import { messages as m } from './messages.ts';

export const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
export const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
export const avatar = (letters, large = false) => `<span class="k-avatar${large ? ' k-avatar-large' : ''}">${esc(letters)}</span>`;
export const go = (label, page, primary = false, glyph = '') => `<button type="button" class="k-button${primary ? ' k-primary' : ''}" data-page="${page}">${esc(label)}${glyph ? icon(glyph) : ''}</button>`;
export const act = (label, action, primary = false, glyph = '') => `<button type="button" class="k-button${primary ? ' k-primary' : ''}" data-action="${action}">${esc(label)}${glyph ? icon(glyph) : ''}</button>`;
export const field = (label, value = '', type = 'text', key = '') => `<label class="k-field"><span>${esc(label)}</span><input type="${type}" name="${esc(key || label)}" value="${esc(value)}"${['email', 'password', 'number', 'tel'].includes(type) ? ' dir="ltr"' : ''}></label>`;
export const heading = (title, subtitle, action = '') => `<header class="k-page-heading"><div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>${action}</header>`;
export const stats = items => `<dl class="k-stats">${items.map(([number, label]) => `<div><dt>${esc(label)}</dt><dd class="glass-strong" dir="ltr">${esc(number)}</dd></div>`).join('')}</dl>`;
export const tag = label => `<span class="k-tag">${esc(label)}</span>`;
export const sectionTitle = (label, action = '') => `<div class="k-section-title"><h2>${esc(label)}</h2>${action}</div>`;
export const list = items => `<div class="k-list">${items.map(([title, sub, end]) => `<div class="k-list-row"><div><strong>${esc(title)}</strong><p>${esc(sub)}</p></div>${end ? `<span class="k-muted">${esc(end)}</span>` : ''}</div>`).join('')}</div>`;
export const table = (headers, rows) => `<div class="k-table-wrap"><table class="k-table"><thead><tr>${headers.map(title => `<th>${esc(title)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const brand = () => `<button type="button" class="k-wordmark" data-page="site" aria-label="${m.brand}"><img class="k-logo-dark" src="__LOGO_DARK__" alt="${m.brand}"><img class="k-logo-light" src="__LOGO_LIGHT__" alt="${m.brand}"></button>`;
export const photo = className => `<img class="${className}" src="__HERO__" alt="" decoding="async">`;
export const footer = () => `<footer class="k-site-footer"><span>${m.copyright}</span><span>${m.credit}</span>${go(m.signIn, 'login')}</footer>`;
export const athleteTabs = active => `<nav class="k-tabs" aria-label="${m.clientName}">${['athlete', 'athlete-programs', 'athlete-nutrition', 'athlete-preview'].map((id, i) => `<button type="button" data-page="${id}" aria-current="${id === active ? 'page' : 'false'}">${m.playerTabs[i]}</button>`).join('')}</nav>`;

export function weightChart() {
  const values = [82.5, 81.8, 81.2, 80.4];
  return `<div class="k-weight-chart" role="img" aria-label="${esc(m.weightJourney)}: 82.5, 81.8, 81.2, 80.4 ${m.kg}">
    <div class="k-chart-values">${values.map((value, i) => `<div><strong dir="ltr">${value}</strong><span class="k-chart-mark" style="block-size:${70 + (value - 80) * 30}px"></span><small>${m.chartWeeks[i]}</small></div>`).join('')}</div>
    <span class="k-muted">${m.kg}</span></div>`;
}

export function profileSettings(isPlayer) {
  return `${heading(m.settingsTitle, m.settingsSub)}<div class="k-settings-layout"><nav class="k-settings-nav">${m.settingsGroups.map((name, i) => `<button type="button" data-settings="${i}" aria-pressed="${i === 0}">${name}</button>`).join('')}</nav>
    <form class="k-settings-form" data-form="settings"><div class="k-profile-line">${avatar(isPlayer ? m.clientInitials : m.coachInitials, true)}<div><h2>${isPlayer ? m.clientName : m.coachName}</h2><p>${isPlayer ? m.memberSince : m.coachRole}</p></div></div>
    <div class="k-form-grid">${field(m.name, isPlayer ? m.clientName : m.coachName)}${field(m.email, isPlayer ? m.playerEmail : m.emailExample, 'email')}</div>
    ${field(m.phone, '+201012345678', 'tel')}<label class="k-field"><span>${m.bio}</span><textarea rows="3">${m.bioText}</textarea></label>
    <div class="k-form-grid"><label class="k-field"><span>${m.language}</span><select><option>${m.arabic}</option><option>${m.english}</option></select></label><label class="k-field"><span>${m.units}</span><select><option>${m.metric}</option></select></label></div>
    <button class="k-button k-primary" type="submit">${m.save}</button></form></div>`;
}
