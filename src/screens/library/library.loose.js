// @ts-nocheck — moved from v1.1.0 with its shared names replaced by the services below; not fully typed yet.
// रचना फोल्डर: the user's own folder of rachana files, and the store of corrections.
//  - The app always opens with the built-in rachanas. A folder chosen by the user is read on top of them:
//    book-notation sources (ghosh-notation/1), compiled files (ghosh/3), own compositions (composer files)
//    and correction bundles (ghosh-fixes/1). Folder rachanas are listed next to the book ones (both shown).
//  - Saving: where the browser can write to the folder (Chrome / Edge / Android Chrome), files are written
//    straight into it. Elsewhere they wait in the browser ("not saved as files") until downloaded.
import { compile3 } from '../../core/compile/ghosh3.ts';
import { buildTimeline3 } from '../../core/timeline/timeline3.ts';
import talasJson from '../../../rules/talas.json';

/** @param {import('../../ui/env.d.ts').AppEnv} env */
export function createLibrary(env) {
const { tx, esc, dv, L, I18N, APP, setLibRows } = env;
const $ = env.q;   // like v1.1.0: null when the element is absent
const GhoshCompile = { compile3: src => compile3(src, { talas: talasJson }) };
const LS = {
 mr: { l_pick: 'फोल्डर निवडा', l_pickNote: 'तुमच्या रचना ठेवलेला फोल्डर निवडा — तो इथे जोडला जाईल.', l_count: (a, n) => `${a} · ${n} रचना`, l_rescan: 'पुन्हा वाचा', l_change: 'फोल्डर बदला', l_unlink: 'फोल्डर काढा',
  l_reconnect: 'पुन्हा जोडा', l_reNote: 'ब्राउझर पुन्हा परवानगी विचारेल', l_ro: 'फक्त वाचन', l_pending: n => `फाइल म्हणून जतन बाकी: ${n}`, l_writeAll: 'फोल्डरमध्ये जतन करा', l_zip: 'सर्व डाउनलोड (zip)',
  l_skipped: n => `${n} फाइल्स वाचता आल्या नाहीत`, l_tagFolder: 'फोल्डर', l_tagPending: 'जतन बाकी', l_srcBook: 'ग्रंथ', l_srcLib: 'फोल्डर', l_tabAll: n => `रचना ${n}`,
  l_savedFolder: f => `फोल्डरमध्ये जतन: ${f}`, l_savedLocal: 'ब्राउझरमध्ये जतन केले. फाइल डाउनलोड करून तुमच्या रचना फोल्डरमध्ये ठेवा.', l_download: 'फाइल डाउनलोड',
  l_guideT: 'सर्व रचना एकाच फोल्डरमध्ये ठेवा', l_never: 'पुन्हा दाखवू नका', l_ok: 'समजले', l_readErr: 'फोल्डर वाचता आला नाही', l_noPerm: 'फोल्डरची परवानगी मिळाली नाही',
  l_conflict: f => `फाइल बाहेर बदलली होती; नवी प्रत जतन केली: ${f}`, l_delFile: f => `फोल्डरमधून ही फाइल स्वतः हटवा: ${f}`, l_scanned: (n, m) => `${n} रचना आणि ${m} माझ्या रचना वाचल्या`,
  l_libG: 'रचना फोल्डर', l_none: 'अजून फोल्डर जोडलेला नाही.', l_written: n => `${n} फाइल्स फोल्डरमध्ये जतन केल्या`, l_zipped: 'zip डाउनलोड झाली — ती उघडून फाइल्स तुमच्या रचना फोल्डरमध्ये ठेवा.',
  l_g: { ios: ['Files ॲपमध्ये "On My iPhone" (किंवा iCloud Drive) मध्ये "घोष रचना" नावाचा फोल्डर एकदाच बनवा.', 'डाउनलोड झालेली फाइल Downloads मधून त्या फोल्डरमध्ये हलवा (zip असल्यास आधी टॅप करून उघडा).', 'ॲपमध्ये "फोल्डर निवडा" → घोष रचना. नंतर नवीन फाइल्स ठेवल्यावर पुन्हा निवडा.'],
   android: ['Files ॲपमध्ये Documents मध्ये "घोष रचना" फोल्डर एकदाच बनवा.', 'Download मधील फाइल त्या फोल्डरमध्ये हलवा (zip असल्यास आधी extract करा).', 'ॲपमध्ये "फोल्डर निवडा" → घोष रचना, नंतर "पुन्हा वाचा".'],
   desktop: ['Documents मध्ये "घोष रचना" फोल्डर एकदाच बनवा.', 'Downloads मधील फाइल त्या फोल्डरमध्ये हलवा (zip असल्यास आधी extract करा). नावात "(1)" आले तरी चालते.', 'ॲपमध्ये "फोल्डर निवडा" → घोष रचना, नंतर "पुन्हा वाचा".'] } },
 hi: { l_pick: 'फ़ोल्डर चुनें', l_pickNote: 'अपनी रचनाओं वाला फ़ोल्डर चुनें — वह यहाँ जुड़ जाएगा।', l_count: (a, n) => `${a} · ${n} रचनाएँ`, l_rescan: 'फिर पढ़ें', l_change: 'फ़ोल्डर बदलें', l_unlink: 'फ़ोल्डर हटाएँ',
  l_reconnect: 'फिर जोड़ें', l_reNote: 'ब्राउज़र फिर अनुमति पूछेगा', l_ro: 'केवल पढ़ना', l_pending: n => `फ़ाइल के रूप में सहेजना बाकी: ${n}`, l_writeAll: 'फ़ोल्डर में सहेजें', l_zip: 'सभी डाउनलोड (zip)',
  l_skipped: n => `${n} फ़ाइलें पढ़ी नहीं जा सकीं`, l_tagFolder: 'फ़ोल्डर', l_tagPending: 'सहेजना बाकी', l_srcBook: 'पुस्तक', l_srcLib: 'फ़ोल्डर', l_tabAll: n => `रचनाएँ ${n}`,
  l_savedFolder: f => `फ़ोल्डर में सहेजा: ${f}`, l_savedLocal: 'ब्राउज़र में सहेजा। फ़ाइल डाउनलोड करके अपने रचना फ़ोल्डर में रखें।', l_download: 'फ़ाइल डाउनलोड',
  l_guideT: 'सभी रचनाएँ एक ही फ़ोल्डर में रखें', l_never: 'फिर न दिखाएँ', l_ok: 'समझ गया', l_readErr: 'फ़ोल्डर पढ़ा नहीं जा सका', l_noPerm: 'फ़ोल्डर की अनुमति नहीं मिली',
  l_conflict: f => `फ़ाइल बाहर बदली गई थी; नई प्रति सहेजी: ${f}`, l_delFile: f => `फ़ोल्डर से यह फ़ाइल स्वयं हटाएँ: ${f}`, l_scanned: (n, m) => `${n} रचनाएँ और ${m} मेरी रचनाएँ पढ़ीं`,
  l_libG: 'रचना फ़ोल्डर', l_none: 'अभी कोई फ़ोल्डर नहीं जुड़ा।', l_written: n => `${n} फ़ाइलें फ़ोल्डर में सहेजीं`, l_zipped: 'zip डाउनलोड हुई — उसे खोलकर फ़ाइलें अपने रचना फ़ोल्डर में रखें।',
  l_g: { ios: ['Files ऐप में "On My iPhone" (या iCloud Drive) में "घोष रचना" नाम का फ़ोल्डर एक बार बनाएँ।', 'डाउनलोड हुई फ़ाइल Downloads से उस फ़ोल्डर में ले जाएँ (zip हो तो पहले टैप करके खोलें)।', 'ऐप में "फ़ोल्डर चुनें" → घोष रचना। नई फ़ाइलें रखने के बाद फिर चुनें।'],
   android: ['Files ऐप में Documents में "घोष रचना" फ़ोल्डर एक बार बनाएँ।', 'Download की फ़ाइल उस फ़ोल्डर में ले जाएँ (zip हो तो पहले extract करें)।', 'ऐप में "फ़ोल्डर चुनें" → घोष रचना, फिर "फिर पढ़ें"।'],
   desktop: ['Documents में "घोष रचना" फ़ोल्डर एक बार बनाएँ।', 'Downloads की फ़ाइल उस फ़ोल्डर में ले जाएँ (zip हो तो पहले extract करें)। नाम में "(1)" आए तो भी चलेगा।', 'ऐप में "फ़ोल्डर चुनें" → घोष रचना, फिर "फिर पढ़ें"।'] } },
 en: { l_pick: 'Choose folder', l_pickNote: 'Choose the folder where you keep your rachanas — it is added here.', l_count: (a, n) => `${a} · ${n} rachanas`, l_rescan: 'Re-read', l_change: 'Change folder', l_unlink: 'Disconnect',
  l_reconnect: 'Reconnect', l_reNote: 'the browser asks for permission again', l_ro: 'read only', l_pending: n => `Not yet saved as files: ${n}`, l_writeAll: 'Save to folder', l_zip: 'Download all (zip)',
  l_skipped: n => `${n} files couldn't be read`, l_tagFolder: 'folder', l_tagPending: 'not saved', l_srcBook: 'Book', l_srcLib: 'Folder', l_tabAll: n => `Rachanas ${n}`,
  l_savedFolder: f => `Saved to the folder: ${f}`, l_savedLocal: 'Saved in the browser. Download the file and keep it in your rachana folder.', l_download: 'Download file',
  l_guideT: 'Keep all rachanas in one folder', l_never: 'Don\'t show again', l_ok: 'Got it', l_readErr: 'Couldn\'t read the folder', l_noPerm: 'No permission for the folder',
  l_conflict: f => `The file had changed outside the app; saved a new copy: ${f}`, l_delFile: f => `Delete this file from the folder yourself: ${f}`, l_scanned: (n, m) => `Read ${n} rachanas and ${m} of my rachanas`,
  l_libG: 'Rachana folder', l_none: 'No folder linked yet.', l_written: n => `${n} files saved to the folder`, l_zipped: 'Zip downloaded — open it and put the files in your rachana folder.',
  l_g: { ios: ['In the Files app, make a folder "Ghosh Rachana" once, under On My iPhone (or iCloud Drive).', 'Move the downloaded file from Downloads into that folder (tap a zip first to open it).', 'In the app: Choose folder → Ghosh Rachana. After adding files, choose it again.'],
   android: ['In the Files app, make a folder "Ghosh Rachana" in Documents once.', 'Move the file from Download into that folder (extract a zip first).', 'In the app: Choose folder → Ghosh Rachana, then Re-read.'],
   desktop: ['Make a folder "Ghosh Rachana" in Documents once.', 'Move the file from Downloads into that folder (extract a zip first). A "(1)" in the name is fine.', 'In the app: Choose folder → Ghosh Rachana, then Re-read.'] } }
};
for (const l in LS) Object.assign(I18N[l], LS[l]);

const clone = o => JSON.parse(JSON.stringify(o));
const now = () => new Date().toISOString();
const sget = (k, d) => { try { const v = JSON.parse(localStorage.getItem('ghosh.' + k)); return v == null ? d : v; } catch (e) { return d; } };
const sset = (k, v) => { try { localStorage.setItem('ghosh.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } };
const safeName = s => String(s || 'rachana').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'rachana';

/* ---------- state ---------- */
let mode = 'none';          // none | rw (can write) | ro (read only) | perm (needs a tap to reconnect)
let dir = null, dirName = '', scannedAt = null, skipped = [];
let FILES = new Map();      // rachana id -> { id, src?, piece?, file, path, fh?, mod, updated }
let MINEF = new Map();      // own composition id -> { r, file, fh?, mod }
let PEND = sget('fix', {}); // rachana id -> { src, at, dl? } : saved in the browser, not yet a file in the folder
let FILED = sget('filed', {});   // 'm:<id>' -> { at, file, dl? } : own compositions already in the folder / downloaded
let MDEL = sget('mineDel', []);  // own compositions deleted here while the folder could not be written
const savePend = () => sset('fix', PEND), saveFiled = () => sset('filed', FILED), saveDel = () => sset('mineDel', MDEL);
const canPickDir = () => typeof window.showDirectoryPicker === 'function';

/* ---------- remember the folder (IndexedDB holds the handle) ---------- */
function idb() { return new Promise((res, rej) => { try { const r = indexedDB.open('ghosh', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }); }
async function kv(op, key, val) {
  try { const db = await idb(); return await new Promise((res, rej) => { const t = db.transaction('kv', op === 'get' ? 'readonly' : 'readwrite'), s = t.objectStore('kv');
    const r = op === 'get' ? s.get(key) : op === 'del' ? s.delete(key) : s.put(val, key); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); } catch (e) { return null; }
}

/* ---------- reading ---------- */
function classify(o) {
  if (!o || typeof o !== 'object') return null;
  if (o.composer && Array.isArray(o.composer.blocks)) return 'mine';
  if (o.format === 'ghosh-notation/1' && o.parts) return 'src';
  if (o.format === 'ghosh/3' && o.parts && o.rhythm) return 'piece';
  if (o.format === 'ghosh-fixes/1' && o.fixes) return 'fixes';
  return null;
}
async function walk(h, path, out, depth) {
  for await (const e of h.values()) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    if (e.kind === 'directory') { if (depth < 4) await walk(e, path + e.name + '/', out, depth + 1); }
    else if (/\.json$/i.test(e.name)) { try { const f = await e.getFile(); out.push({ name: e.name, path: path + e.name, fh: e, file: f }); } catch (x) {} }
  }
}
async function ingest(list) {
  const files = new Map(), mine = new Map(); skipped = [];
  const put = (id, ent) => { const o = files.get(id); if (!o || String(ent.updated) > String(o.updated)) files.set(id, ent); };
  for (const it of list) {
    let o; try { o = JSON.parse(await it.file.text()); } catch (e) { skipped.push(it.path); continue; }
    const k = classify(o), base = { file: it.name, path: it.path, fh: it.fh || null, mod: it.file.lastModified };
    if (k === 'src' && o.id) put(o.id, { ...base, id: o.id, src: o, updated: o.updated || new Date(it.file.lastModified).toISOString() });
    else if (k === 'piece' && o.id) put(o.id, { ...base, id: o.id, piece: o, updated: (o.generated && o.generated.at) || new Date(it.file.lastModified).toISOString() });
    else if (k === 'fixes') Object.entries(o.fixes).forEach(([id, v]) => { if (v && v.src) put(id, { ...base, id, src: v.src, updated: v.at || o.exported || '' , bundle: true }); });
    else if (k === 'mine') { const r = o.composer; if (MDEL.includes(r.id)) continue; const p = mine.get(r.id); if (!p || String(r.updated) > String(p.r.updated)) mine.set(r.id, { ...base, r }); }
    else skipped.push(it.path);
  }
  FILES = files; MINEF = mine; scannedAt = new Date();
  // a waiting (browser-only) copy that the folder now has, same or newer, is no longer waiting
  for (const [id, p] of Object.entries(PEND)) { const f = files.get(id); if (f && f.src && String(f.updated) >= String(p.at)) delete PEND[id]; }
  savePend();
  // own compositions from the folder join माझ्या रचना
  const arr = [...mine.values()].map(m => { FILED['m:' + m.r.id] = { at: m.r.updated, file: m.file }; return m.r; });
  saveFiled();
  if (window.ComposerUI && window.ComposerUI.mergeFolder) window.ComposerUI.mergeFolder(arr);
  refresh();
  return { n: files.size, m: mine.size };
}
async function scanDir() {
  const out = []; try { await walk(dir, '', out, 0); } catch (e) { note(tx('l_readErr')); return; }
  const r = await ingest(out); note(tx('l_scanned', dv(r.n), dv(r.m)) + (skipped.length ? ' · ' + tx('l_skipped', dv(skipped.length)) : ''));
}
async function permOf(h, ask) {
  try { const o = { mode: 'readwrite' }; let p = await h.queryPermission(o); if (p !== 'granted' && ask) p = await h.requestPermission(o); return p; } catch (e) { return 'denied'; }
}

/* ---------- choosing ---------- */
const dirInput = document.createElement('input'); dirInput.type = 'file'; dirInput.hidden = true; dirInput.multiple = true; dirInput.accept = '.json,application/json';
if ('webkitdirectory' in dirInput) dirInput.webkitdirectory = true;
document.body.appendChild(dirInput);
dirInput.addEventListener('change', async () => {
  const fs = [...dirInput.files].filter(f => /\.json$/i.test(f.name)); dirInput.value = '';
  if (!fs.length) return;
  const rel = f => f.webkitRelativePath || f.name;
  dir = null; mode = 'ro'; dirName = (rel(fs[0]).split('/').length > 1 ? rel(fs[0]).split('/')[0] : '') || '…';
  const r = await ingest(fs.map(f => ({ name: f.name, path: rel(f), file: f })));
  note(tx('l_scanned', dv(r.n), dv(r.m)) + (skipped.length ? ' · ' + tx('l_skipped', dv(skipped.length)) : ''));
});
async function pick() {
  if (canPickDir()) {
    try { const h = await window.showDirectoryPicker({ id: 'ghosh-rachana', mode: 'readwrite' }); dir = h; dirName = h.name; mode = 'rw'; await kv('put', 'dir', h); await scanDir(); return; }
    catch (e) { if (e && e.name === 'AbortError') return; /* fall through to the plain picker */ }
  }
  dirInput.click();
}
async function reconnect() {
  if (!dir) return pick();
  const p = await permOf(dir, true);
  if (p === 'granted') { mode = 'rw'; await scanDir(); } else note(tx('l_noPerm'));
}
async function unlink() { dir = null; mode = 'none'; dirName = ''; FILES = new Map(); MINEF = new Map(); skipped = []; await kv('del', 'dir'); refresh(); }

/* ---------- writing ---------- */
async function writeFile(name, text, fh) {
  const h = fh || await dir.getFileHandle(name, { create: true });
  const w = await h.createWritable(); await w.write(text); await w.close();
  const f = await h.getFile(); return { fh: h, mod: f.lastModified, name: h.name };
}
async function freeName(base, ownId) {
  let n = base, i = 2;
  const taken = nm => [...FILES.values()].some(f => f.file === nm && f.id !== ownId && !f.path.includes('/')) || [...MINEF.values()].some(m => m.file === nm && m.r.id !== ownId);
  while (taken(n)) n = base.replace(/(\.ghosh)?\.json$/i, '') + ' (' + i++ + ').ghosh.json';
  return n;
}
// a file the person changed outside the app since it was read is not overwritten: the save goes to a new name
async function safeWrite(ent, wanted, text, ownId) {
  if (ent && ent.fh) {
    let changed = false; try { const f = await ent.fh.getFile(); changed = f.lastModified > ent.mod + 1; } catch (e) { changed = true; }
    if (!changed) return { ...(await writeFile(ent.file, text, ent.fh)), conflict: false };
    const n = await freeName(wanted.replace(/\.ghosh\.json$/i, '') + ' ' + now().slice(0, 16).replace(/[:T]/g, '-') + '.ghosh.json', ownId);
    return { ...(await writeFile(n, text)), conflict: true };
  }
  return { ...(await writeFile(await freeName(wanted, ownId), text)), conflict: false };
}
const stamp = o => ({ ...o, app: 'Ghoshnaad ' + APP.version });
const srcText = src => JSON.stringify(stamp(src), null, 1);
async function saveSource(src) {
  src = clone(src); src.updated = now();
  if (mode === 'rw' && dir && (await permOf(dir, false)) === 'granted') {
    try {
      const ent = FILES.get(src.id) && !FILES.get(src.id).bundle ? FILES.get(src.id) : null;
      const w = await safeWrite(ent, (ent && ent.file) || src.id + '.ghosh.json', srcText(src), src.id);
      FILES.set(src.id, { id: src.id, src, file: w.name, path: w.name, fh: w.fh, mod: w.mod, updated: src.updated });
      delete PEND[src.id]; savePend(); refresh();
      return { written: true, file: w.name, conflict: w.conflict };
    } catch (e) { /* fall back to the browser */ }
  }
  PEND[src.id] = { src, at: src.updated }; savePend(); refresh();
  if (window.PlatformUI) window.PlatformUI.edit();
  return { written: false };
}
async function removeSource(id) {
  const had = PEND[id]; delete PEND[id]; savePend();
  const f = FILES.get(id); let msg = null;
  if (f) {
    if (mode === 'rw' && f.fh && !f.path.includes('/') && !f.bundle) { try { await dir.removeEntry(f.file); FILES.delete(id); } catch (e) { msg = tx('l_delFile', f.path); } }
    else msg = tx('l_delFile', f.path);
  }
  refresh(); return { msg, had: !!had };
}

/* own compositions: written to the folder as they change (or counted as waiting) */
const mineText = r => JSON.stringify(stamp({ ...window.Composer.toSource(r), composer: r }), null, 1);
const mineUnsaved = () => (window.ComposerUI && window.ComposerUI.all ? window.ComposerUI.all() : []).filter(r => { const f = FILED['m:' + r.id]; return !f || f.at !== r.updated; });
let syncT = null, syncing = false;
function syncMine() { clearTimeout(syncT); syncT = setTimeout(flushMine, 1500); refreshSoon(); }
async function flushMine() {
  if (syncing || mode !== 'rw' || !dir) { refresh(); return 0; }
  if ((await permOf(dir, false)) !== 'granted') { refresh(); return 0; }
  syncing = true; let n = 0;
  try {
    for (const r of mineUnsaved()) {
      const m = MINEF.get(r.id), wanted = (m && m.file) || (FILED['m:' + r.id] && FILED['m:' + r.id].file) || safeName(r.name) + '.ghosh.json';
      try { const w = await safeWrite(m && m.fh ? m : null, wanted, mineText(r), r.id); MINEF.set(r.id, { r: clone(r), file: w.name, path: w.name, fh: w.fh, mod: w.mod }); FILED['m:' + r.id] = { at: r.updated, file: w.name }; n++; } catch (e) {}
    }
    saveFiled();
  } finally { syncing = false; }
  refresh(); return n;
}
async function mineDeleted(id) {
  delete FILED['m:' + id]; saveFiled();
  const m = MINEF.get(id);
  if (m) {
    if (mode === 'rw' && m.fh && !m.path.includes('/')) { try { await dir.removeEntry(m.file); MINEF.delete(id); refresh(); return; } catch (e) {} }
    if (!MDEL.includes(id)) { MDEL.push(id); saveDel(); }
    note(tx('l_delFile', m.path));
  }
  refresh();
}

/* ---------- downloads ---------- */
async function saveAs(name, blob) {
  if (typeof window.showSaveFilePicker === 'function' && mode !== 'rw') {
    try { const h = await window.showSaveFilePicker({ suggestedName: name, ...(dir ? { startIn: dir } : {}) }); const w = await h.createWritable(); await w.write(blob); await w.close(); return 'picked'; }
    catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
  }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); } catch (e) {}
  return 'download';
}
async function downloadSource(src) {
  const s = clone(src); if (!s.updated) s.updated = now();
  const r = await saveAs(s.id + '.ghosh.json', new Blob([srcText(s)], { type: 'application/json' }));
  if (r === 'cancel') return;
  if (PEND[s.id]) { PEND[s.id].dl = true; savePend(); }
  refresh(); if (r === 'download') guide();
}
async function downloadAll() {
  const z = {}, enc = s => window.fflate.strToU8(s);
  Object.values(PEND).forEach(p => { z[p.src.id + '.ghosh.json'] = enc(srcText(p.src)); });
  mineUnsaved().forEach(r => { let n = safeName(r.name) + '.ghosh.json'; while (z[n]) n = n.replace(/\.ghosh\.json$/, '') + ' ' + r.id + '.ghosh.json'; z[n] = enc(mineText(r)); });
  if (!Object.keys(z).length) return;
  const blob = new Blob([window.fflate.zipSync(z, { level: 6 })], { type: 'application/zip' });
  const r = await saveAs('ghoshnaad-rachana-' + now().slice(0, 10) + '.zip', blob);
  if (r === 'cancel') return;
  Object.values(PEND).forEach(p => { p.dl = true; }); savePend();
  mineUnsaved().forEach(r2 => { FILED['m:' + r2.id] = { at: r2.updated, file: safeName(r2.name) + '.ghosh.json', dl: true }; }); saveFiled();
  refresh(); note(tx('l_zipped')); if (r === 'download') guide(true);
}
async function writeAll() { let n = 0;
  for (const p of Object.values(PEND)) { const r = await saveSource(p.src); if (r.written) n++; }
  n += await flushMine(); note(tx('l_written', dv(n)));
}
const pendingCount = () => Object.values(PEND).filter(p => !p.dl).length + mineUnsaved().filter(r => !(FILED['m:' + r.id] && FILED['m:' + r.id].dl && FILED['m:' + r.id].at === r.updated)).length;

/* ---------- how to keep files in one folder (shown after a plain download) ---------- */
function platform() { const u = navigator.userAgent || ''; if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && navigator.maxTouchPoints > 1)) return 'ios'; if (/Android/.test(u)) return 'android'; return 'desktop'; }
function guide(force) {
  if (!force && sget('guideOff', false)) return;
  const g = $('#libGuide'); if (!g) return;
  $('#libGuideT').textContent = tx('l_guideT');
  $('#libGuideL').innerHTML = (L().l_g[platform()] || L().l_g.desktop).map(s => `<li>${esc(s)}</li>`).join('');
  $('#libGuideN').textContent = tx('l_never'); $('#libGuideOk').textContent = tx('l_ok');
  g.hidden = false;
}

/* ---------- list rows for folder rachanas ---------- */
const COMP = new Map();   // id -> { key, piece }
function pieceOf(id) {
  const p = PEND[id], f = FILES.get(id);
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
  const p = PEND[id], f = FILES.get(id);
  if (p && (!f || String(p.at) >= String(f.updated))) return clone(p.src);
  if (f && f.src) return clone(f.src);
  return null;
}
function rowOf(id) {
  let pc; try { pc = pieceOf(id); } catch (e) { return null; }
  const R = pc.rhythm, m = pc.meta, lead = pc.layout.lead;
  let secs = 0; try { secs = Math.round(buildTimeline3(pc, lead, { order: R.performance ? 'performance' : 'printed' }).total); } catch (e) {}
  const talas = [...new Set(R.charans.map(c => R.talas[c.tala] && R.talas[c.tala].name && R.talas[c.tala].name.dev).filter(Boolean))];
  const waiting = !!(PEND[id] && !(FILES.get(id) && String(FILES.get(id).updated) >= String(PEND[id].at)));
  return { id: 'f~' + id, srcId: id, lib: waiting ? 'pending' : 'folder', dev: (m.title && m.title.dev) || id, rom: (m.title && m.title.rom) || id, alt: [], sec: m.section || 'naimittik',
    raga: (m.raga && m.raga.name) || '', talas, laya: (R.charans.find(c => c.type !== 'prarambhik') || R.charans[0]).laya, parts: Object.keys(pc.parts).filter(k => ['shankh', 'vanshi', 'anak'].includes(k)), sec_s: secs, standing: m.performance && m.performance.mode };
}
function rows() { const ids = new Set([...FILES.keys(), ...Object.keys(PEND)]); return [...ids].map(rowOf).filter(Boolean); }

/* ---------- bar on the list page + settings group ---------- */
let noteT = null, lastNote = '';
function note(t) { lastNote = t; renderBar(); clearTimeout(noteT); noteT = setTimeout(() => { lastNote = ''; renderBar(); }, 6000); }
const FOLDER_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/></svg>';
function barHTML() {
  const n = FILES.size + MINEF.size, pend = pendingCount();
  let h = '<div class="lb-row">';
  if (mode === 'none') h += `<button class="lb-btn main" data-lb="pick">${FOLDER_SVG}${esc(tx('l_pick'))}</button><span class="lb-note">${esc(tx('l_pickNote'))}</span>`;
  else if (mode === 'perm') h += `<span class="lb-name">${FOLDER_SVG}${esc(dirName)}</span><button class="lb-btn main" data-lb="reconnect">${esc(tx('l_reconnect'))}</button><span class="lb-note">${esc(tx('l_reNote'))}</span>`;
  else h += `<span class="lb-name">${FOLDER_SVG}${esc(tx('l_count', dirName, dv(FILES.size)))}${mode === 'ro' ? ` <i>(${esc(tx('l_ro'))})</i>` : ''}</span><button class="lb-btn" data-lb="${mode === 'ro' ? 'pick' : 'rescan'}">${esc(tx('l_rescan'))}</button>`;
  h += '</div>';
  if (pend) h += `<div class="lb-row"><span class="lb-pend">${esc(tx('l_pending', dv(pend)))}</span>${mode === 'rw' ? `<button class="lb-btn main" data-lb="writeAll">${esc(tx('l_writeAll'))}</button>` : `<button class="lb-btn main" data-lb="zip">${esc(tx('l_zip'))}</button>`}</div>`;
  if (lastNote) h += `<div class="lb-msg" role="status">${esc(lastNote)}</div>`;
  return h;
}
function renderBar() { const b = $('#libbar'); if (b) b.innerHTML = barHTML(); const s = $('#libOpts'); if (s && !$('#sheet').hidden) s.innerHTML = sheetHTML(); }
function sheetHTML() {
  let h = `<div class="igrp"><b>${esc(tx('l_libG'))}</b><span class="note">${esc(mode === 'none' ? tx('l_none') : tx('l_count', dirName, dv(FILES.size)) + (mode === 'ro' ? ' · ' + tx('l_ro') : ''))}</span><div class="fxrow">`;
  h += mode === 'none' ? `<button class="opt" data-lb="pick"><span>${esc(tx('l_pick'))}</span></button>` : `<button class="opt" data-lb="pick"><span>${esc(tx('l_change'))}</span></button><button class="opt" data-lb="unlink"><span>${esc(tx('l_unlink'))}</span></button>`;
  h += `<button class="opt" data-fx="import"><span>${esc(tx('f_import'))}</span></button>`;
  if (pendingCount()) h += `<button class="opt" data-lb="${mode === 'rw' ? 'writeAll' : 'zip'}"><span>${esc(tx(mode === 'rw' ? 'l_writeAll' : 'l_zip'))}</span></button>`;
  return h + '</div></div>';
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-lb]'); if (!b) return; e.stopPropagation();
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
  if (g) { $('#libGuideOk').onclick = () => { g.hidden = true; }; $('#libGuideN').onclick = () => { sset('guideOff', true); g.hidden = true; }; g.addEventListener('click', e => { if (e.target === g) g.hidden = true; }); }
  refresh();
  const h = await kv('get', 'dir');
  if (h && typeof h.queryPermission === 'function') {
    dir = h; dirName = h.name;
    if ((await permOf(h, false)) === 'granted') { mode = 'rw'; await scanDir(); } else { mode = 'perm'; renderBar(); }
  }
}


return { init, pick, rows, pieceOf, sourceOf, saveSource, removeSource, downloadSource, downloadAll, syncMine, mineDeleted, pendingCount,
  isLib: id => FILES.has(id) || !!PEND[id], mode: () => mode, sheetHTML, renderBar, guide };
}
