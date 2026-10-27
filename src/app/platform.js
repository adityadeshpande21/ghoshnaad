/* platform.js — तुमचे काम · आवृत्ती · स्थापना: backup and restore, updates, install steps, reminders.
 * The rules live in src/data and src/platform (tested on their own); this file is only the screens that use them. */
(function () {
'use strict';
const P = window.GhoshPlatform;

const kv = new P.LocalKv();
const guard = new P.StorageGuard(kv, { storage: navigator.storage });
const lib = new P.UserLibrary(kv);
const clone = o => JSON.parse(JSON.stringify(o));
const appName = () => 'Ghoshnaad ' + APP.version;
const isSite = location.protocol !== 'file:';
let deferredPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt = e; renderBar(); if (!$('#sheet').hidden) render(); });
addEventListener('appinstalled', () => { deferredPrompt = null; renderBar(); render(); });
const advice = () => P.detectInstall(P.currentEnv({ canPrompt: !!deferredPrompt }));

/* ---------- state ---------- */
let restoring = null;          // { plan } while the person is looking at what a restore would do
let message = '';              // a one-line result shown in the sheet
let storageInfo = { persisted: null, usage: null };
let barDismissed = new Set();  // bars closed during this visit

const refreshStorage = async () => { const s = await guard.status(); storageInfo = { persisted: s.persisted, usage: s.usage }; if (!$('#sheet').hidden) render(); };

/* ---------- checks used when restoring: every rachana must compile ---------- */
const firstLine = e => String((e && e.message) || e).split('\n')[0];
const checks = {
  composition: r => { try { GhoshCompile.compile3(Composer.toSource(r)); return null; } catch (e) { return firstLine(e); } },
  correction: (id, src) => { try { GhoshCompile.compile3(clone(src)); return null; } catch (e) { return firstLine(e); } },
};

/* ---------- actions ---------- */
function download(name, obj) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
function doBackup() {
  if (window.ComposerUI && ComposerUI.flush) ComposerUI.flush();
  download(P.backupFileName(new Date()), P.createBackup(kv, { app: appName() }));
  guard.noteBackup(); message = ''; barDismissed.delete('backup'); render(); renderBar();
}
async function readRestoreFile(file) {
  message = ''; restoring = null;
  const parsed = P.parseBackup(await file.text());
  if (!parsed.ok) { message = i18n.t('platform.err_' + parsed.error); render(); return; }
  if (window.ComposerUI && ComposerUI.flush) ComposerUI.flush();
  restoring = { plan: P.planRestore(kv, parsed.backup, checks, { copyLabel: i18n.t('platform.copy') }) };
  openSheet(); render();
}
function applyRestoreNow() {
  if (ScreenApp.isBusy()) { message = i18n.t('platform.r_busy'); render(); return; }          // the page reloads after a restore: not while sound plays or work is unsaved
  const plan = restoring.plan; restoring = null;
  if (window.ComposerUI && ComposerUI.freeze) ComposerUI.freeze();   // a pending save must not write the old list over the restored one
  const ok = P.applyRestore(kv, plan);
  message = ok ? i18n.t('platform.r_done') : i18n.t('platform.r_fail');
  if (!ok && window.ComposerUI && ComposerUI.unfreeze) ComposerUI.unfreeze();
  render(); if (ok) setTimeout(() => location.reload(), 900);
}
function openSheet() { if (typeof renderSheet === 'function') renderSheet(); $('#sheet').hidden = false; }

/* ---------- the group in the settings sheet ---------- */
const li = a => a.map(s => `<li>${esc(s)}</li>`).join('');
function restoreHTML() {
  const p = restoring.plan, n = (k, v) => `<li>${esc(i18n.t('platform.' + k, { n: dv(v) }))}</li>`;
  const rows = [];
  if (p.compositions.add.length) rows.push(n('r_new', p.compositions.add.length));
  if (p.compositions.same) rows.push(n('r_same', p.compositions.same + p.corrections.same));
  if (p.compositions.copies.length) rows.push(n('r_copies', p.compositions.copies.length));
  if (Object.keys(p.corrections.add).length) rows.push(n('r_fix_new', Object.keys(p.corrections.add).length));
  if (Object.keys(p.corrections.newer).length) rows.push(n('r_fix_newer', Object.keys(p.corrections.newer).length));
  if (p.corrections.older.length) rows.push(n('r_fix_older', p.corrections.older.length));
  if (Object.keys(p.settings.add).length) rows.push(n('r_set', Object.keys(p.settings.add).length));
  const problems = p.problems.map(x => `<li>${esc(x.id)} — ${esc(x.message)}</li>`).join('');
  const nothing = P.planIsEmpty(p);
  return `<div class="pf-box" data-pf-box><b>${esc(i18n.t('platform.r_title'))}</b>
    ${rows.length ? `<ul>${rows.join('')}</ul>` : ''}${nothing ? `<p class="note">${esc(i18n.t('platform.r_nochange'))}</p>` : `<p class="note">${esc(i18n.t('platform.r_note'))}</p>`}
    ${problems ? `<p class="note">${esc(i18n.t('platform.r_skipped', { n: dv(p.problems.length) }))}</p><ul class="pf-bad">${problems}</ul>` : ''}
    <div class="opts">${nothing ? '' : `<button class="lb-btn main" data-pf="restore-go">${esc(i18n.t('platform.r_go'))}</button>`}<button class="lb-btn" data-pf="restore-cancel">${esc(i18n.t('platform.r_cancel'))}</button></div></div>`;
}
function sheetHTML() {
  const adv = advice(), c = lib.counts(), d = guard.daysSinceBackup();
  const where = adv.where === 'file' ? i18n.t('platform.where_file') : i18n.t('platform.where_site');
  const backupLine = d === null ? i18n.t('platform.backup_never') : d === 0 ? i18n.t('platform.backup_today') : i18n.t('platform.backup_ago', { days: dv(d) });
  const persist = storageInfo.persisted === true ? i18n.t('platform.persist_yes') : storageInfo.persisted === false ? i18n.t('platform.persist_no') : '';
  const usage = storageInfo.usage != null ? i18n.t('platform.usage', { mb: dv((storageInfo.usage / 1048576).toFixed(1)) }) : '';
  const work = c.compositions + c.corrections === 0 ? i18n.t('platform.nothing') : i18n.t('platform.counts', { own: dv(c.compositions), corrections: dv(c.corrections) });
  let h = `<div class="igrp" id="pfWork"><b>${esc(i18n.t('platform.work'))}</b>
    <p class="sh-p">${esc(where)} · ${esc(work)}</p>
    ${adv.where === 'file' ? `<p class="note">${esc(i18n.t('platform.file_note'))}</p>` : ''}
    <p class="note" data-pf-status="backup">${esc(backupLine)}</p>
    ${persist || usage ? `<p class="note">${esc([persist, usage].filter(Boolean).join(' · '))}</p>` : ''}
    <div class="opts"><button class="lb-btn main" data-pf="backup">${esc(i18n.t('platform.backup_btn'))}</button>
      <label class="lb-btn" style="cursor:pointer">${esc(i18n.t('platform.restore_btn'))}<input type="file" accept=".json,application/json" data-pf-file hidden></label></div>
    ${restoring ? restoreHTML() : ''}
    ${c.olderCopies ? `<p class="note">${esc(i18n.t('platform.older_have', { n: dv(c.olderCopies) }))} <button class="lb-btn" data-pf="older-dl">${esc(i18n.t('platform.older_dl'))}</button></p>` : ''}
    ${message ? `<p class="note pf-msg" role="status">${esc(message)}</p>` : ''}</div>`;
  // version and updates
  const st = update ? update.state : { kind: 'none' };
  h += `<div class="igrp" id="pfVersion"><b>${esc(i18n.t('platform.ver'))}</b>
    <p class="sh-p">v${esc(APP.version)} · ${esc(APP.date)}</p>
    ${st.kind !== 'none' ? `<p class="sh-p pf-upd">${esc(i18n.t('platform.upd_avail', { version: st.info.version }))}</p>` : (update ? `<p class="note">${esc(i18n.t('platform.upd_none'))}</p>` : `<p class="note">${esc(i18n.t('platform.upd_file'))}</p>`)}
    <div class="opts"><button class="lb-btn" data-pf="whatsnew">${esc(i18n.t('platform.whatsnew_btn'))}</button>
      ${update ? `<button class="lb-btn" data-pf="upd-check">${esc(i18n.t('platform.upd_check'))}</button>` : ''}
      ${st.kind !== 'none' ? `<button class="lb-btn main" data-pf="upd-apply">${esc(i18n.t('platform.upd_btn'))}</button>` : ''}</div></div>`;
  // install
  h += `<div class="igrp" id="pfInstall"><b>${esc(i18n.t('platform.inst_title'))}</b>`;
  if (adv.where === 'installed') h += `<p class="sh-p">${esc(i18n.t('platform.inst_done'))}</p>`;
  else {
    const steps = [];
    for (let i = 0; i18n.has(`platform.steps.${adv.steps}.${i}`); i++) steps.push(i18n.t(`platform.steps.${adv.steps}.${i}`, { url: APP.site || '' }));
    h += `<ol class="pf-steps">${steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>`;
    if (adv.canPrompt) h += `<div class="opts"><button class="lb-btn main" data-pf="install">${esc(i18n.t('platform.inst_btn'))}</button></div>`;
  }
  return h + '</div>';
}
function render() { const box = $('#dataOpts'); if (box) box.innerHTML = sheetHTML(); }

/* ---------- the bottom bar: one message at a time ---------- */
let bar = null;
function barEl() {
  if (!bar) { bar = document.createElement('div'); bar.id = 'pfBar'; bar.hidden = true; bar.setAttribute('role', 'status'); document.body.appendChild(bar); }
  return bar;
}
function wanted() {
  const st = update ? update.state : { kind: 'none' };
  if (st.kind !== 'none' && !barDismissed.has('update')) return { id: 'update', text: i18n.t('platform.upd_avail', { version: st.info.version }), btn: i18n.t('platform.upd_btn'), act: 'bar-update' };
  const due = guard.due();
  if (due.due && !barDismissed.has('backup')) return { id: 'backup', text: due.reason === 'edits' ? i18n.t('platform.bar_edits') : i18n.t('platform.bar_days', { days: dv(due.days ?? 0) }), btn: i18n.t('platform.bar_btn'), act: 'bar-backup' };
  if (firstRun && !kv.get('firstRunSeen') && !barDismissed.has('first')) return { id: 'first', text: i18n.t('platform.first'), btn: i18n.t('platform.first_btn'), act: 'bar-restore' };
  const a = advice();
  if (isSite && a.where === 'website' && a.steps && !kv.get('installSeen') && !barDismissed.has('install') && !firstRun)
    return { id: 'install', text: i18n.t('platform.inst_bar'), btn: a.canPrompt ? i18n.t('platform.inst_btn') : i18n.t('platform.inst_show'), act: a.canPrompt ? 'install' : 'bar-install' };
  return null;
}
function renderBar() {
  const el = barEl(), w = wanted();
  const onList = !$('#list').hidden;
  if (!w || !onList) { el.hidden = true; el.dataset.id = ''; return; }
  el.dataset.id = w.id; el.hidden = false;
  el.innerHTML = `<span>${esc(w.text)}</span><button class="lb-btn main" data-pf="${w.act}">${esc(w.btn)}</button><button class="pf-x" data-pf="bar-x" aria-label="${esc(i18n.t('platform.dismiss'))}">×</button>`;
}
new MutationObserver(renderBar).observe($('#list'), { attributes: true, attributeFilter: ['hidden'] });

/* ---------- what's new ---------- */
function showNew(info) {
  const notes = (info && info.whatsNew) || APP.whatsNew || {};
  const items = notes[AppEnv.lang()] || notes.en || [];
  if (!items.length) return;
  let m = $('#pfNew');
  if (!m) { m = document.createElement('div'); m.id = 'pfNew'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); document.body.appendChild(m); }
  m.hidden = false;
  m.innerHTML = `<div class="pf-card"><b>${esc(i18n.t('platform.new_title'))} · v${esc((info && info.version) || APP.version)}</b><ul>${li(items)}</ul><button class="lb-btn main" data-pf="new-ok">${esc(i18n.t('platform.new_ok'))}</button></div>`;
}

/* ---------- updates ---------- */
let update = null;
if (isSite) {
  const swOk = 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost');
  update = new P.UpdateManager({
    appVersion: APP.version,
    fetchVersion: async () => { const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' }); return r.ok ? r.json() : null; },
    sw: swOk ? navigator.serviceWorker : undefined,
    reload: () => location.reload(),
    busy: () => ScreenApp.isBusy(),
  });
  update.onChange(() => { renderBar(); if (!$('#sheet').hidden) render(); });
}
function tryUpdate() {
  if (!update) return;
  if (!update.apply()) { message = i18n.t('platform.upd_busy'); render(); const el = barEl(); if (!el.hidden && el.dataset.id === 'update') el.querySelector('span').textContent = i18n.t('platform.upd_busy'); }
}

/* ---------- clicks ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pf]'); if (!b) return;
  switch (b.dataset.pf) {
    case 'backup': doBackup(); break;
    case 'restore-go': applyRestoreNow(); break;
    case 'restore-cancel': restoring = null; render(); break;
    case 'older-dl': download('ghoshnaad-older-corrections.json', P.olderCopiesFile(kv, appName())); break;
    case 'whatsnew': { const st = update && update.state; showNew(st && st.kind !== 'none' ? st.info : null); break; }
    case 'new-ok': $('#pfNew').hidden = true; break;
    case 'upd-check': if (update) update.check().then(() => { message = update.state.kind === 'none' ? i18n.t('platform.upd_none') : ''; render(); }); break;
    case 'upd-apply': case 'bar-update': tryUpdate(); break;
    case 'install': if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; renderBar(); render(); } break;
    case 'bar-backup': openSheet(); render(); $('#pfWork').scrollIntoView({ block: 'start' }); break;
    case 'bar-install': kv.set('installSeen', '1'); openSheet(); render(); $('#pfInstall').scrollIntoView({ block: 'start' }); renderBar(); break;
    case 'bar-restore': kv.set('firstRunSeen', '1'); openSheet(); render(); $('#pfWork').scrollIntoView({ block: 'start' }); renderBar(); break;
    case 'bar-x': {
      const id = barEl().dataset.id;
      if (id === 'install') kv.set('installSeen', '1'); else if (id === 'first') kv.set('firstRunSeen', '1');
      barDismissed.add(id); renderBar(); break;
    }
  }
});
document.addEventListener('change', e => {
  const f = e.target.closest('[data-pf-file]'); if (!f || !f.files[0]) return;
  const file = f.files[0]; f.value = ''; readRestoreFile(file);
});

/* ---------- hooks the other scripts call ---------- */
let lastEdit = 0, asked = false;
window.PlatformUI = {
  sheetHTML, render() { render(); void refreshStorage(); },
  // a save of the person's own work; counted at most once a minute, so a stretch of typing is one edit
  edit() {
    const t = Date.now();
    if (t - lastEdit > 60000) { lastEdit = t; guard.noteEdit(); renderBar(); }
    if (!asked) { asked = true; void guard.persist().then(refreshStorage); }
  },
  _guard: guard, _update: () => update,
};
// the work, version and install group of the settings sheet, and the bottom bar, follow the language
ScreenApp.register('platform', { onLang() { render(); renderBar(); } });

/* ---------- start-up ---------- */
const seen = kv.get('seenVersion');
let firstRun = false;
if (seen !== APP.version) {
  if (seen === null && lib.isEmpty() && kv.get('recent') === null) firstRun = true;   // no work, nothing opened yet: a new device or a new file name
  else setTimeout(() => showNew(null), 600);                          // an upgrade: say what changed, once
  kv.set('seenVersion', APP.version);
}
injectStyle();
renderBar();
void refreshStorage();
if (update) {
  update.start();
  setInterval(() => update.check(), 6 * 3600 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) update.check(); });
}

function injectStyle() {
  const s = document.createElement('style');
  s.textContent = `#pfBar{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:15;display:flex;align-items:center;gap:10px;max-width:560px;margin:0 auto;padding:10px 12px;border-radius:14px;background:var(--panel);border:1px solid var(--line);box-shadow:0 4px 18px rgba(0,0,0,.18);font-size:14px}
#pfBar[hidden],#pfNew[hidden]{display:none}#pfBar span{flex:1;min-width:0}#pfBar .lb-btn{flex:none}
.pf-x{flex:none;width:32px;height:32px;border:0;background:none;color:var(--mut);font-size:22px;line-height:1;cursor:pointer}
.pf-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--panel);display:flex;flex-direction:column;gap:6px}.pf-box ul,.pf-card ul{margin:0;padding-left:20px}.pf-bad{color:var(--mut);font-size:12.5px}
.pf-steps{margin:0;padding-left:22px;display:flex;flex-direction:column;gap:4px;font-size:14px}.pf-msg{color:var(--fg)}
#pfNew{position:fixed;inset:0;z-index:30;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(0,0,0,.4)}
.pf-card{background:var(--bg);color:var(--fg);border-radius:16px;padding:18px;max-width:420px;width:100%;display:flex;flex-direction:column;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,.3)}`;
  document.head.appendChild(s);
}
})();
