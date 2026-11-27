import { maxWorkbookBytes, xlsxZip } from './xlsx-zip';
import { cellDisplay } from './xlsx-cell-format';
import type { Sheet } from './sheet-values';

function documentFromXml(xml: string | null) {
  if (!xml || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('invalidFile');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('invalidFile');
  return doc;
}

function textParts(node: Element) {
  // Excel rich text may contain several runs. Phonetic guides are separate.
  return Array.from(node.querySelectorAll('t')).filter(part => part.parentElement?.localName !== 'rPh')
    .map(part => part.textContent ?? '').join('').trim();
}

function readRows(doc: Document, strings: string[], formats: { id: number; code: string }[], date1904: boolean, urls: Map<string, string>) {
  const rows = doc.querySelectorAll('sheetData > row');
  if (rows.length > 1500) throw new Error('fileSize');
  const displayRows: string[][] = [];
  const rawRows = Array.from(rows, row => {
    const values: string[] = [];
    const display: string[] = [];
    for (const cell of row.querySelectorAll('c')) {
      const address = cell.getAttribute('r') ?? '';
      const col = /^[A-Z]{1,2}(?=\d+$)/.exec(address)?.[0];
      if (!col) continue;
      const index = Array.from(col).reduce((count, letter) => count * 26 + letter.charCodeAt(0) - 64, 0) - 1;
      const raw = cell.querySelector('v')?.textContent?.trim() ?? '';
      const type = cell.getAttribute('t');
      const cellValue = type === 'inlineStr' ? textParts(cell) : type === 's' ? strings[Number(raw)] ?? '' : raw;
      const url = urls.get(address);
      if (!cellValue && !url) continue;
      values[index] = cellValue;
      const format = formats[Number(cell.getAttribute('s') ?? '0')];
      const value = cellDisplay(cellValue, type, format?.id ?? 0, format?.code ?? '', date1904);
      display[index] = url && value !== url ? [value, url].filter(Boolean).join('\n') : value;
    }
    if (display.length) displayRows.push(Array.from(display, value => value ?? ''));
    return values;
  });
  return { rows: rawRows, displayRows };
}

const relationshipId = (node: Element) => node.getAttributeNS(
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');

export async function readWorkbook(file: File): Promise<Sheet[]> {
  if (!/\.xlsx$/i.test(file.name)) throw new Error('invalidFile');
  if (file.size > maxWorkbookBytes) throw new Error('fileSize');
  const read = xlsxZip(await file.arrayBuffer());
  const workbook = documentFromXml(await read('xl/workbook.xml'));
  const rels = documentFromXml(await read('xl/_rels/workbook.xml.rels'));
  const stylesXml = await read('xl/styles.xml');
  const styles = stylesXml ? documentFromXml(stylesXml) : null;
  const codes = new Map(Array.from(styles?.querySelectorAll('numFmts > numFmt') ?? [])
    .map(format => [Number(format.getAttribute('numFmtId')), format.getAttribute('formatCode') ?? '']));
  const formats = Array.from(styles?.querySelectorAll('cellXfs > xf') ?? [], style => {
    const id = Number(style.getAttribute('numFmtId') ?? '0');
    return { id, code: codes.get(id) ?? '' };
  });
  const date1904 = /^(1|true)$/i.test(workbook.querySelector('workbookPr')?.getAttribute('date1904') ?? '');
  const stringsXml = await read('xl/sharedStrings.xml');
  const strings = stringsXml ? Array.from(documentFromXml(stringsXml).querySelectorAll('si'), textParts) : [];
  const paths = new Map(Array.from(rels.querySelectorAll('Relationship'))
    .filter(rel => rel.getAttribute('Type')?.endsWith('/worksheet') && rel.getAttribute('TargetMode') !== 'External')
    .map(rel => [rel.getAttribute('Id'), (rel.getAttribute('Target') ?? '').replace(/^\/?xl\//, '')]));
  const sheets = workbook.querySelectorAll('sheet');
  if (sheets.length > 24) throw new Error('fileSize');
  const result: Sheet[] = [];
  for (const sheet of sheets) {
    if (sheet.getAttribute('state') === 'hidden' || sheet.getAttribute('state') === 'veryHidden') continue;
    const path = paths.get(relationshipId(sheet));
    if (!path || !/^worksheets\/[\w.-]+\.xml$/i.test(path)) continue;
    const name = sheet.getAttribute('name') ?? '';
    const doc = documentFromXml(await read(`xl/${path}`));
    const urls = new Map<string, string>();
    if (doc.querySelector('hyperlink')) {
      const linkRels = await read(`xl/worksheets/_rels/${path.slice('worksheets/'.length)}.rels`);
      if (linkRels) {
        const targets = new Map(Array.from(documentFromXml(linkRels).querySelectorAll('Relationship'))
          .filter(rel => rel.getAttribute('Type')?.endsWith('/hyperlink'))
          .map(rel => [rel.getAttribute('Id'), rel.getAttribute('Target') ?? '']));
        for (const link of doc.querySelectorAll('hyperlink')) {
          const url = targets.get(relationshipId(link));
          const address = link.getAttribute('ref');
          if (url && address && /^https:\/\/[^\s]+$/i.test(url)) urls.set(address, url);
        }
      }
    }
    result.push({ name, ...readRows(doc, strings, formats, date1904, urls) });
  }
  if (!result.length) throw new Error('invalidFile');
  return result;
}
