// Regression check for the ExcelJS UUID override and the jsPDF security update.
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet('Ordini');
sheet.addRow(['Ordine', 'Totale']);
sheet.addRow(['Prova', 12.5]);
sheet.addConditionalFormatting({
  ref: 'B2:B2',
  rules: [{ type: 'dataBar', cfvo: [{ type: 'min' }, { type: 'max' }], color: { argb: 'FFD4AF6A' } }],
});
const bytes = await workbook.xlsx.writeBuffer();
const restored = new ExcelJS.Workbook();
await restored.xlsx.load(bytes);
assert.equal(restored.getWorksheet('Ordini').getCell('B2').value, 12.5);
assert.equal(restored.getWorksheet('Ordini').conditionalFormattings[0].rules[0].type, 'dataBar');

const pdf = new jsPDF();
pdf.text('Ordine di prova', 10, 10);
const output = pdf.output();
assert.ok(output.startsWith('%PDF-'));
assert.ok(output.includes('Ordine di prova'));
console.log('Export XLSX (con formattazione condizionale) e PDF verificati.');
