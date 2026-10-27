// A small .xlsx writer and reader for one sheet of text (no formulas, no styles): enough for translators to work in Excel, LibreOffice or Google Sheets.
// An .xlsx file is a zip of XML parts. We write inline strings; we read inline strings and Excel's shared strings.
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// characters XML 1.0 cannot hold are dropped (control characters other than tab, newline, carriage return)
const clean = s => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const unesc = s => s.replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** 0 -> A, 25 -> Z, 26 -> AA */
export const columnName = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const columnIndex = name => [...name].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/**
 * @param {string[][]} rows the first row is the header; empty strings are empty cells
 * @param {{ sheet?: string, widths?: number[] }} [opts]
 */
export function writeXlsx(rows, { sheet = 'Sheet1', widths = [] } = {}) {
  const cols = widths.length ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const body = rows.map((row, r) => `<row r="${r + 1}">${row.map((v, c) => (v === '' || v == null ? '' : `<c r="${columnName(c)}${r + 1}" t="inlineStr"><is><t xml:space="preserve">${esc(clean(String(v)))}</t></is></c>`)).join('')}</row>`).join('');
  const xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  return zipSync({
    '[Content_Types].xml': strToU8(`${xml}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
    '_rels/.rels': strToU8(`${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    'xl/workbook.xml': strToU8(`${xml}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheet)}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${xml}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
    'xl/worksheets/sheet1.xml': strToU8(`${xml}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>${cols}<sheetData>${body}</sheetData></worksheet>`),
  }, { level: 9 });
}

/** The first sheet of an .xlsx file as rows of text (missing cells are ''). */
export function readXlsx(bytes) {
  let files;
  try { files = unzipSync(bytes); } catch { throw new Error('this is not an .xlsx file'); }
  const text = name => (files[name] ? strFromU8(files[name]) : null);
  const wb = text('xl/workbook.xml'), rels = text('xl/_rels/workbook.xml.rels');
  if (!wb || !rels) throw new Error('this is not an .xlsx file (no workbook)');
  // the first sheet's part: through its relationship id
  const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(wb)?.[1];
  const target = rid && new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*>`).exec(rels)?.[0].match(/\bTarget="([^"]+)"/)?.[1];
  const part = target ? (target.startsWith('/') ? target.slice(1) : 'xl/' + target) : 'xl/worksheets/sheet1.xml';
  const sheet = text(part);
  if (!sheet) throw new Error(`the sheet ${part} is missing`);
  const shared = [];
  const ss = text('xl/sharedStrings.xml');
  if (ss) for (const m of ss.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) shared.push(unesc([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join('')));
  const rows = [];
  for (const rm of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const r = +(/\br="(\d+)"/.exec(rm[1])?.[1] ?? rows.length + 1) - 1;
    const row = rows[r] ??= [];
    let next = 0;
    for (const cm of rm[2].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(cm[1]);
      const c = ref ? columnIndex(ref[1]) : next;
      next = c + 1;
      const type = /\bt="([^"]+)"/.exec(cm[1])?.[1], inner = cm[2] ?? '';
      let v = '';
      if (type === 's') v = shared[+(/<v>(\d+)<\/v>/.exec(inner)?.[1] ?? -1)] ?? '';
      else if (type === 'inlineStr') v = unesc([...inner.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => t[1]).join(''));
      else v = unesc(/<v>([\s\S]*?)<\/v>/.exec(inner)?.[1] ?? '');
      row[c] = v;
    }
  }
  return Array.from({ length: rows.length }, (_, i) => Array.from(rows[i] ?? [], v => v ?? ''));
}
