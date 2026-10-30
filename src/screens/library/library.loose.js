// Moved from v1.1.0 with its shared names replaced by the services below. Checked by tsc as plain JavaScript (tsconfig.loose.json: wrong names, properties and argument types fail; implicit any is allowed).
// रचना फोल्डर: the user's own folder of rachana files, and the store of corrections.
//  - The app always opens with the built-in rachanas. A folder chosen by the user is read on top of them:
//    book-notation sources (ghosh-notation/1), compiled files (ghosh/3), own compositions (composer files)
//    and correction bundles (ghosh-fixes/1). Folder rachanas are listed next to the book ones (both shown).
//  - Saving: where the browser can write to the folder (Chrome / Edge / Android Chrome), files are written
//    straight into it. Elsewhere they wait in the browser ("not saved as files") until downloaded.
import { compile3 } from '../../core/compile/ghosh3.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';
import talasJson from '../../../rules/talas.json';
import { FolderSync, permissionOf } from '../../data/folderSync.ts';
import { WaitingWork } from '../../data/waitingWork.ts';
import { LocalKv } from '../../data/kv.ts';
import { Settings } from '../../data/settings.ts';
import { clicked } from '../../ui/dom.js';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
export function createLibrary(env) {
const { i18n, esc, dv, APP, setLibRows } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const GhoshCompile = { compile3: src => compile3(src, { talas: talasJson }) };

const clone = o => JSON.parse(JSON.stringify(o));
const now = () => new Date().toISOString();
const safeName = s => String(s || 'rachana').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'rachana';

/* ---------- state ---------- */
const sync = new FolderSync({ now });   // the folder: its mode (none | rw | ro | perm), its files (rachana id -> file, own composition id -> file), reading and safe writing
// what waits in the browser, and what is already a file or a download: corrections (not yet a file in the folder), own compositions already written, deletions the folder could not take
const ww = new WaitingWork(new LocalKv()), settings = new Settings(new LocalKv());
const canPickDir = () => typeof window.showDirectoryPicker === 'function';

/* ---------- remember the folder (IndexedDB holds the handle) ---------- */
function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open('ghosh', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function kv(op, key, val) {
  try { const db = await idb(); return await new Promise((res, rej) => { const t = db.transaction('kv', op === 'get' ? 'readonly' : 'readwrite'), s = t.objectStore('kv');
    const r = op === 'get' ? s.get(key) : op === 'del' ? s.delete(key) : s.put(val, key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return null; }
}

/* ---------- reading ---------- */
async function ingest(list) {
  const r = await sync.read(list, { deletedMine: ww.deletedMine() });
  // a waiting (browser-only) copy that the folder now has, same or newer, is no longer waiting
  ww.releaseSuperseded(sync.files);
  // own compositions from the folder join माझ्या रचना
  const arr = [...sync.mine.values()].map(m => { ww.file(m.r.id, { at: m.r.updated, file: m.file }); return m.r; });
  if (window.ComposerUI && window.ComposerUI.mergeFolder) window.ComposerUI.mergeFolder(arr);
  refresh();
  return r;
}
async function scanDir() {
  let out; try { out = await sync.list(); } catch (e) { note(i18n.t('library.readErr')); return; }
  const r = await ingest(out); note(i18n.t('library.scanned', { count: dv(r.n), mine: dv(r.m) }) + (sync.skipped.length ? ' · ' + i18n.t('library.skipped', { count: dv(sync.skipped.length) }) : ''));
}

/* ---------- choosing ---------- */
const dirInput = document.createElement('input'); dirInput.type = 'file'; dirInput.hidden = true; dirInput.multiple = true; dirInput.accept = '.json,application/json';
if ('webkitdirectory' in dirInput) dirInput.webkitdirectory = true;
document.body.appendChild(dirInput);
dirInput.addEventListener('change', async () => {
  const fs = [...dirInput.files].filter(f => /\.json$/i.test(f.name)); dirInput.value = '';
  if (!fs.length) return;
  const rel = f => f.webkitRelativePath || f.name;
  sync.attachReadOnly((rel(fs[0]).split('/').length > 1 ? rel(fs[0]).split('/')[0] : '') || '…');
  const r = await ingest(fs.map(f => ({ name: f.name, path: rel(f), file: f })));
  note(i18n.t('library.scanned', { count: dv(r.n), mine: dv(r.m) }) + (sync.skipped.length ? ' · ' + i18n.t('library.skipped', { count: dv(sync.skipped.length) }) : ''));
});
async function pick() {
  if (canPickDir()) {
    try { const h = await window.showDirectoryPicker({ id: 'ghosh-rachana', mode: 'readwrite' }); sync.attach(h); await kv('put', 'dir', h); await scanDir(); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* fall through to the plain picker */ }
  }
  dirInput.click();
}
async function reconnect() {
  if (!sync.dir) return pick();
  const p = await permissionOf(sync.dir, true);
  if (p === 'granted') { sync.mode = 'rw'; await scanDir(); } else note(i18n.t('library.noPerm'));
}
async function unlink() { sync.detach(); await kv('del', 'dir'); refresh(); }

/* ---------- writing (the folder's rules are in FolderSync: free names, and a file changed outside the app is never overwritten) ---------- */
const stamp = o => ({ ...o, app: 'Ghoshnaad ' + APP.version });
const srcText = src => JSON.stringify(stamp(src), null, 1);
async function saveSource(src) {
  src = clone(src); src.updated = now();
  if (sync.mode === 'rw' && sync.dir && (await permissionOf(sync.dir, false)) === 'granted') {
    try {
      const ent = sync.files.get(src.id) && !sync.files.get(src.id).bundle ? sync.files.get(src.id) : null;
      const w = await sync.safeWrite(ent, (ent && ent.file) || src.id + '.ghosh.json', srcText(src), src.id);
      sync.files.set(src.id, { id: src.id, src, file: w.name, path: w.name, fh: w.fh, mod: w.mod, updated: src.updated });
      ww.release(src.id); refresh();
      return { written: true, file: w.name, conflict: w.conflict };
    } catch (e) { /* fall back to the browser */ }
  }
  ww.hold(src.id, src, src.updated); refresh();
  if (window.PlatformUI) window.PlatformUI.edit();
  return { written: false };
}
async function removeSource(id) {
  const had = ww.release(id);
  const f = sync.files.get(id); let msg = null;
  if (f) {
    if (sync.mode === 'rw' && f.fh && !f.path.includes('/') && !f.bundle) { if (await sync.remove(f.file)) sync.files.delete(id); else msg = i18n.t('library.delFile', { path: f.path }); }
    else msg = i18n.t('library.delFile', { path: f.path });
  }
  refresh(); return { msg, had: !!had };
}

/* own compositions: written to the folder as they change (or counted as waiting) */
const mineText = r => JSON.stringify(stamp({ ...window.Composer.toSource(r), composer: r }), null, 1);
/** @returns {any[]} */
const mineAll = () => (window.ComposerUI && window.ComposerUI.all ? window.ComposerUI.all() : []);
const mineUnsaved = () => ww.unsaved(mineAll());
let syncT = null, syncing = false;
function syncMine() { clearTimeout(syncT); syncT = setTimeout(flushMine, 1500); refreshSoon(); }
async function flushMine() {
  if (syncing || sync.mode !== 'rw' || !sync.dir) { refresh(); return 0; }
  if ((await permissionOf(sync.dir, false)) !== 'granted') { refresh(); return 0; }
  syncing = true; let n = 0;
  try {
    for (const r of mineUnsaved()) {
      const m = sync.mine.get(r.id), wanted = (m && m.file) || (ww.filedFor(r.id) && ww.filedFor(r.id).file) || safeName(r.name) + '.ghosh.json';
      try { const w = await sync.safeWrite(m && m.fh ? m : null, wanted, mineText(r), r.id); sync.mine.set(r.id, { r: clone(r), file: w.name, path: w.name, fh: w.fh, mod: w.mod }); ww.file(r.id, { at: r.updated, file: w.name }); n++; } catch (e) {}
    }
  } finally { syncing = false; }
  refresh(); return n;
}
async function mineDeleted(id) {
  ww.unfile(id);
  const m = sync.mine.get(id);
  if (m) {
    if (sync.mode === 'rw' && m.fh && !m.path.includes('/')) { if (await sync.remove(m.file)) { sync.mine.delete(id); refresh(); return; } }
    ww.markDeleted(id);
    note(i18n.t('library.delFile', { path: m.path }));
  }
  refresh();
}

/* ---------- downloads ---------- */
async function saveAs(name, blob) {
  if (typeof window.showSaveFilePicker === 'function' && sync.mode !== 'rw') {
    try { const h = await window.showSaveFilePicker({ suggestedName: name, ...(sync.dir ? { startIn: sync.dir } : {}) }); const w = await h.createWritable(); await w.write(blob); await w.close(); return 'picked'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); } catch (e) {}
  return 'download';
}
async function downloadSource(src) {
  const s = clone(src); if (!s.updated) s.updated = now();
  const r = await saveAs(s.id + '.ghosh.json', new Blob([srcText(s)], { type: 'application/json' }));
  if (r === 'cancel') return;
  ww.markDownloaded(s.id);
  refresh(); if (r === 'download') guide();
}
async function downloadAll() {
  const z = {}, enc = s => window.fflate.strToU8(s);
  ww.waitingAll().forEach(p => { z[p.src.id + '.ghosh.json'] = enc(srcText(p.src)); });
  mineUnsaved().forEach(r => { let n = safeName(r.name) + '.ghosh.json'; while (z[n]) n = n.replace(/\.ghosh\.json$/, '') + ' ' + r.id + '.ghosh.json'; z[n] = enc(mineText(r)); });
  if (!Object.keys(z).length) return;
  const blob = new Blob([window.fflate.zipSync(z, { level: 6 })], { type: 'application/zip' });
  const r = await saveAs('ghoshnaad-rachana-' + now().slice(0, 10) + '.zip', blob);
  if (r === 'cancel') return;
  ww.markDownloaded();
  mineUnsaved().forEach(r2 => { ww.file(r2.id, { at: r2.updated, file: safeName(r2.name) + '.ghosh.json', dl: true }); });
  refresh(); note(i18n.t('library.zipped')); if (r === 'download') guide(true);
}
async function writeAll() { let n = 0;
  for (const p of ww.waitingAll()) { const r = await saveSource(p.src); if (r.written) n++; }
  n += await flushMine(); note(i18n.t('library.written', { count: dv(n) }));
}
const pendingCount = () => ww.count(mineAll());

/* ---------- how to keep files in one folder (shown after a plain download) ---------- */
function platform() { const u = navigator.userAgent || ''; if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'ios'; if (/Android/.test(u)) return 'android'; return 'desktop'; }
function guide(force) {
  if (!force && settings.get('guideOff', false)) return;
  const g = $('#libGuide'); if (!g) return;
  $('#libGuideT').textContent = i18n.t('library.guideT');
  $('#libGuideL').innerHTML = [0, 1, 2].map(i => `<li>${esc(i18n.t(`library.g.${['android', 'ios'].includes(platform()) ? platform() : 'desktop'}.${i}`))}</li>`).join('');
  $('#libGuideN').textContent = i18n.t('library.never'); $('#libGuideOk').textContent = i18n.t('library.ok');
  g.hidden = false;
}

/* ---------- list rows for folder rachanas ---------- */
const COMP = new Map();   // id -> { key, piece }
function pieceOf(id) {
  const p = ww.waiting(id), f = sync.files.get(id);
  const useP = p && (!f || String(p.at) >= String(f.updated));
  const key = useP ? 'p' + p.at : 'f' + (f && f.updated);
  const c = COMP.get(id); if (c && c.key === key) return c.piece;
  let piece;
  if (useP) piece = GhoshCompile.compile3(clone(p.src)).piece;
  else if (f.piece) piece = f.piece;
  else piece = GhoshCompile.compile3(clone(f.src)).piece;
  COMP.set(id, { key, piece }); return piece;
}
function sourceOf(id) {
  const p = ww.waiting(id), f = sync.files.get(id);
  if (p && (!f || String(p.at) >= String(f.updated))) return clone(p.src);
  if (f && f.src) return clone(f.src);
  return null;
}
function rowOf(id) {
  let pc; try { pc = pieceOf(id); } catch (e) { return null; }
  const R = pc.rhythm, m = pc.meta, lead = pc.layout.lead;
  let secs = 0; try { secs = Math.round(buildTimeline3(pc, lead, { order: R.performance ? 'performance' : 'printed' }).total); } catch (e) {}
  const talas = [...new Set(R.charans.map(c => R.talas[c.tala] && R.talas[c.tala].name && R.talas[c.tala].name.dev).filter(Boolean))];
  const waiting = !!(ww.waiting(id) && !(sync.files.get(id) && String(sync.files.get(id).updated) >= String(ww.waiting(id).at)));
  return { id: 'f~' + id, srcId: id, lib: waiting ? 'pending' : 'folder', dev: (m.title && m.title.dev) || id, rom: (m.title && m.title.rom) || id, alt: [], sec: m.section || 'naimittik',
    raga: (m.raga && m.raga.name) || '', talas, laya: (R.charans.find(c => c.type !== 'prarambhik') || R.charans[0]).laya, parts: Object.keys(pc.parts).filter(k => ['shankh', 'vanshi', 'anak'].includes(k)), sec_s: secs, standing: m.performance && m.performance.mode };
}
function rows() { const ids = new Set([...sync.files.keys(), ...ww.waitingIds()]); return [...ids].map(rowOf).filter(Boolean); }

/* ---------- bar on the list page + settings group ---------- */
let noteT = null, lastNote = '';
function note(t) { lastNote = t; renderBar(); clearTimeout(noteT); noteT = setTimeout(() => { lastNote = ''; renderBar(); }, 6000); }
const FOLDER_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
function barHTML() {
  const n = sync.files.size + sync.mine.size, pend = pendingCount();
  let h = '<div class="lb-row">';
  if (sync.mode === 'none') h += `<button class="lb-btn main" data-lb="pick">${FOLDER_SVG}${esc(i18n.t('library.pick'))}</button><span class="lb-note">${esc(i18n.t('library.pickNote'))}</span>`;
  else if (sync.mode === 'perm') h += `<span class="lb-name">${FOLDER_SVG}${esc(sync.dirName)}</span><button class="lb-btn main" data-lb="reconnect">${esc(i18n.t('library.reconnect'))}</button><span class="lb-note">${esc(i18n.t('library.reNote'))}</span>`;
  else h += `<span class="lb-name">${FOLDER_SVG}${esc(i18n.t('library.count', { folder: sync.dirName, count: dv(sync.files.size) }))}${sync.mode === 'ro' ? ` <i>(${esc(i18n.t('library.ro'))})</i>` : ''}</span><button class="lb-btn" data-lb="${sync.mode === 'ro' ? 'pick' : 'rescan'}">${esc(i18n.t('library.rescan'))}</button>`;
  h += '</div>';
  if (pend) h += `<div class="lb-row"><span class="lb-pend">${esc(i18n.t('library.pending', { count: dv(pend) }))}</span>${sync.mode === 'rw' ? `<button class="lb-btn main" data-lb="writeAll">${esc(i18n.t('library.writeAll'))}</button>` : `<button class="lb-btn main" data-lb="zip">${esc(i18n.t('library.zip'))}</button>`}</div>`;
  if (lastNote) h += `<div class="lb-msg" role="status">${esc(lastNote)}</div>`;
  return h;
}
function renderBar() { const b = $('#libbar'); if (b) b.innerHTML = barHTML(); const s = $('#libOpts'); if (s && !$('#sheet').hidden) s.innerHTML = sheetHTML(); }
function sheetHTML() {
  let h = `<div class="igrp"><b>${esc(i18n.t('library.libG'))}</b><span class="note">${esc(sync.mode === 'none' ? i18n.t('library.none') : i18n.t('library.count', { folder: sync.dirName, count: dv(sync.files.size) }) + (sync.mode === 'ro' ? ' · ' + i18n.t('library.ro') : ''))}</span><div class="fxrow">`;
  h += sync.mode === 'none' ? `<button class="opt" data-lb="pick"><span>${esc(i18n.t('library.pick'))}</span></button>` : `<button class="opt" data-lb="pick"><span>${esc(i18n.t('library.change'))}</span></button><button class="opt" data-lb="unlink"><span>${esc(i18n.t('library.unlink'))}</span></button>`;
  h += `<button class="opt" data-fx="import"><span>${esc(i18n.t('correction.import'))}</span></button>`;
  if (pendingCount()) h += `<button class="opt" data-lb="${sync.mode === 'rw' ? 'writeAll' : 'zip'}"><span>${esc(i18n.t(sync.mode === 'rw' ? 'library.writeAll' : 'library.zip'))}</span></button>`;
  return h + '</div></div>';
}
document.addEventListener('click', e => {
  const b = clicked(e, '[data-lb]'); if (!b) return; e.stopPropagation();
  const a = b.dataset.lb;
  if (a === 'pick') pick(); else if (a === 'reconnect') reconnect(); else if (a === 'rescan') scanDir(); else if (a === 'unlink') unlink();
  else if (a === 'zip') downloadAll(); else if (a === 'writeAll') writeAll();
}, true);

let rT = null;
function refreshSoon() { clearTimeout(rT); rT = setTimeout(renderBar, 300); }
function refresh() { COMP.clear(); setLibRows(rows()); renderBar(); }

/* ---------- start ---------- */
async function init() {
  const g = $('#libGuide');
  if (g) { $('#libGuideOk').onclick = () => { g.hidden = true; }; $('#libGuideN').onclick = () => { settings.set('guideOff', true); g.hidden = true; }; g.addEventListener('click', e => { if (e.target === g) g.hidden = true; }); }
  refresh();
  const h = await kv('get', 'dir');
  if (h && typeof h.queryPermission === 'function') {
    sync.attach(h, 'perm');
    if ((await permissionOf(h, false)) === 'granted') { sync.mode = 'rw'; await scanDir(); } else renderBar();
  }
}


return { init, pick, rows, pieceOf, sourceOf, saveSource, removeSource, downloadSource, downloadAll, syncMine, mineDeleted, pendingCount,
  isLib: id => sync.files.has(id) || !!ww.waiting(id), mode: () => sync.mode, sheetHTML, renderBar, guide };
}
