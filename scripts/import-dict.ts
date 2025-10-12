#!/usr/bin/env ts-node
/// <reference types="node" />
/**
 * DreamInsight dictionary importer
 *
 * Reads one or many CSV files (or an entire directory of CSV files) and emits
 * a generated TypeScript module at `src/lib/dict/imported.ts` that conforms to
 * the `SymbolMeaning` contract.
 *
 * CSV headers (case-insensitive):
 *   - key (required)
 *   - label (required)
 *   - meaning (required)
 *   - tags (comma separated)
 *   - advice
 *   - category
 *   - psych
 *   - culture.kr
 *   - culture.en
 *   - notes (ignored for output, useful for reviewers)
 *
 * Usage examples:
 *   pnpm ts-node scripts/import-dict.ts data/dictionary.sample.csv
 *   pnpm ts-node scripts/import-dict.ts data/dictionary
 */

import fs from 'node:fs';
import path from 'node:path';

type RawRow = Record<string, string>;

type ParsedRow = {
  key: string;
  label: string;
  tags: string[];
  meaning: string;
  advice?: string;
  category?: string;
  psych?: string;
  cultureKr?: string;
  cultureEn?: string;
};

const REQUIRED_FIELDS = ['key', 'label', 'meaning'] as const;

function readCsvSources(inputPath: string): RawRow[] {
  const abs = path.resolve(inputPath);
  if (!fs.existsSync(abs)) {
    throw new Error(`[import-dict] Path not found: ${abs}`);
  }

  const stats = fs.statSync(abs);
  const csvFiles: string[] = stats.isDirectory()
    ? fs
        .readdirSync(abs)
        .filter((file: string) => file.toLowerCase().endsWith('.csv'))
        .sort((a: string, b: string) => a.localeCompare(b))
        .map((file: string) => path.join(abs, file))
    : [abs];

  const rows: RawRow[] = [];
  for (const file of csvFiles) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = parseCsv(raw, file);
    rows.push(...parsed);
  }
  return rows;
}

function parseCsv(contents: string, sourceName: string): RawRow[] {
  const lines = contents
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    console.warn(`[import-dict] File ${sourceName} is empty – skipping`);
    return [];
  }

  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: RawRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row: RawRow = {};
    headers.forEach((header, idx) => {
      row[header] = (cols[idx] ?? '').trim();
    });
    const allEmpty = Object.values(row).every((value) => value.trim() === '');
    if (!allEmpty) {
      rows.push(row);
    }
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === ',') {
        values.push(current);
        current = '';
      } else if (char === '"') {
        inQuotes = true;
      } else {
        current += char;
      }
    }
  }

  values.push(current);
  return values;
}

function normaliseRow(raw: RawRow, index: number): ParsedRow {
  const row: RawRow = {};
  Object.keys(raw).forEach((key) => {
    row[key.toLowerCase()] = raw[key];
  });

  const missing = REQUIRED_FIELDS.filter((field) => !(row[field] && row[field].trim()));
  if (missing.length > 0) {
    throw new Error(
      `[import-dict] Row ${index + 1} is missing required fields: ${missing.join(', ')}`
    );
  }

  const tags = (row['tags'] || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const uniqueTags = Array.from(new Set(tags));
  if (uniqueTags.length === 0) {
    console.warn(`[import-dict] Row ${index + 1} (${row['key']?.trim() ?? 'unknown'}) has no tags.`);
  }

  return {
    key: row['key'].trim(),
    label: row['label'].trim(),
    meaning: row['meaning'].trim(),
    tags: uniqueTags,
    advice: row['advice']?.trim() || undefined,
    category: row['category']?.trim() || undefined,
    psych: row['psych']?.trim() || undefined,
    cultureKr: row['culture.kr']?.trim() || undefined,
    cultureEn: row['culture.en']?.trim() || undefined,
  };
}

function sanitiseKey(key: string): string {
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
    return key;
  }
  return key.replace(/[^a-zA-Z0-9_]/g, '_');
}

function toLiteral(value: string): string {
  if (value.includes('\n')) {
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');
    return `\`${escaped}\``;
  }
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function serialiseSymbol(row: ParsedRow): string[] {
  const lines: string[] = [];
  lines.push(`  '${row.key}': {`);
  lines.push(`    key: '${row.key}',`);
  lines.push(`    label: ${toLiteral(row.label)},`);
  const tagsLiteral = row.tags.map((tag) => toLiteral(tag)).join(', ');
  lines.push(`    tags: [${tagsLiteral}],`);
  lines.push(`    meaning: ${toLiteral(row.meaning)},`);
  if (row.advice) {
    lines.push(`    advice: ${toLiteral(row.advice)},`);
  }
  if (row.category) {
    lines.push(`    category: ${toLiteral(row.category)},`);
  }

  const cultureEntries = [
    row.cultureKr ? `kr: ${toLiteral(row.cultureKr)}` : undefined,
    row.cultureEn ? `en: ${toLiteral(row.cultureEn)}` : undefined,
  ].filter(Boolean);

  const contextsLines: string[] = [];
  if (row.psych) {
    contextsLines.push(`      psych: ${toLiteral(row.psych)},`);
  }
  if (cultureEntries.length > 0) {
    contextsLines.push('      culture: {');
    cultureEntries.forEach((entry) => contextsLines.push(`        ${entry},`));
    contextsLines.push('      },');
  }

  if (contextsLines.length > 0) {
    lines.push('    contexts: {');
    lines.push(...contextsLines);
    lines.push('    },');
  }

  lines.push('  },');
  return lines;
}

function buildModule(symbols: ParsedRow[]): string {
  const lines: string[] = [];
  lines.push('import type { SymbolMeaning } from "./core";');
  lines.push('');
  lines.push('// ⚠️ Generated file — do not edit manually.');
  lines.push('export const IMPORTED_SYMBOLS: Record<string, SymbolMeaning> = {');

  symbols
    .sort((a, b) => a.key.localeCompare(b.key))
    .forEach((row) => {
      lines.push(...serialiseSymbol(row));
    });

  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

function writeOutput(contents: string) {
  const outPath = path.resolve(process.cwd(), 'src', 'lib', 'dict', 'imported.ts');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, contents, 'utf8');
  return outPath;
}

function main() {
  const inputPath = process.argv[2] ?? 'data/dictionary.csv';
  try {
    const rawRows = readCsvSources(inputPath);
    const parsedRows = rawRows.map((row, idx) => normaliseRow(row, idx));

    const deduped = new Map<string, ParsedRow>();
    parsedRows.forEach((originalRow) => {
      const safeKey = sanitiseKey(originalRow.key);
      const finalRow = safeKey === originalRow.key ? originalRow : { ...originalRow, key: safeKey };
      if (safeKey !== originalRow.key) {
        console.warn(
          `[import-dict] Key "${originalRow.key}" contained unsupported characters. Using "${safeKey}" instead.`
        );
      }
      if (deduped.has(finalRow.key)) {
        console.warn(`[import-dict] Duplicate key "${finalRow.key}" – keeping the last definition.`);
      }
      deduped.set(finalRow.key, finalRow);
    });

    const output = buildModule(Array.from(deduped.values()));
    const destination = writeOutput(output);
    console.log(
      `[import-dict] Processed ${rawRows.length} raw rows → ${deduped.size} unique symbols. Wrote ${destination}`
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
