import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { writeXlsx, readXlsx, columnName } from '../../tools/lib/xlsx.mjs';

test('column letters', () => {
  assert.deepEqual([0, 1, 25, 26, 27, 51, 52, 701, 702].map(columnName), ['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA', 'ZZ', 'AAA']);
});
test('rows survive a round trip: scripts, markup characters, quotes, line breaks, empty cells, many columns', () => {
  const rows = [
    ['key', 'English', 'मराठी', 'ગુજરાતી'],
    ['a.b', 'Backed up {days} days <b>ago</b> & "more"', 'नमस्कार', ''],
    ['a.c', '', '', 'x'],
    ['a.d', 'line one\nline two', '  spaces kept  ', "it's"],
    Array.from({ length: 30 }, (_, i) => (i === 29 ? 'last' : '')),
  ];
  const back = readXlsx(writeXlsx(rows));
  const trim = r => { const o = [...r]; while (o.length && o[o.length - 1] === '') o.pop(); return o; };      // a file does not store empty cells at the end of a row
  for (let i = 0; i < 4; i++) assert.deepEqual(trim(back[i]), trim(rows[i]), `row ${i}`);
  assert.equal(back[4][29], 'last'); assert.equal(back[4].length, 30);
});
test('a file saved by a spreadsheet program is read too: shared strings, numbers, empty rows between, a different part name', () => {
  const x = '<?xml version="1.0"?>';
  const files = {
    '[Content_Types].xml': strToU8(x + '<Types/>'),
    'xl/workbook.xml': strToU8(`${x}<workbook xmlns:r="r"><sheets><sheet name="T" sheetId="1" r:id="rId9"/></sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`${x}<Relationships><Relationship Id="rId9" Type="t" Target="worksheets/data.xml"/></Relationships>`),
    'xl/sharedStrings.xml': strToU8(`${x}<sst><si><t>key</t></si><si><r><t>Hel</t></r><r><t>lo &amp; bye</t></r></si><si><t xml:space="preserve">नमस्ते</t></si></sst>`),
    'xl/worksheets/data.xml': strToU8(`${x}<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>2</v></c></row><row r="3"><c r="A3" t="s"><v>1</v></c><c r="B3"><v>42</v></c><c r="C3" t="inlineStr"><is><t>x</t></is></c></row></sheetData></worksheet>`),
  };
  assert.deepEqual(readXlsx(zipSync(files)), [['key', '', 'नमस्ते'], [], ['Hello & bye', '42', 'x']]);
});
test('a file that is not a workbook is refused with a clear message', () => {
  assert.throws(() => readXlsx(strToU8('plain text')), /not an .xlsx file/);
  assert.throws(() => readXlsx(zipSync({ 'a.txt': strToU8('x') })), /no workbook/);
});
