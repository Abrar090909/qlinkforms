// CSV writing with spreadsheet formula-injection protection (CLAUDE.md rule 7).
// A cell starting with = + - @ (or tab/CR) can run as a formula in Excel or
// Sheets, so we prefix it with an apostrophe, which spreadsheets show as text.

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text) || text !== text.trim())
    text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function toCsv(rows: unknown[][]): string {
  // BOM so Excel opens UTF-8 (₹, Hindi names) correctly.
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
