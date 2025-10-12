#!/usr/bin/env ts-node
/// <reference types="node" />
/* eslint-disable no-console */

import { SYMBOLS } from '../src/lib/dict/core.ts';
import { EXTRA_SYMBOLS } from '../src/lib/dict/extra.ts';
import { IMPORTED_SYMBOLS } from '../src/lib/dict/imported.ts';

import type { SymbolMeaning } from '../src/lib/dict/core.ts';

type SymbolEntry = { key: string; data: SymbolMeaning };

function collectSymbols(): SymbolEntry[] {
  const merged: Record<string, SymbolMeaning> = {
    ...SYMBOLS,
    ...EXTRA_SYMBOLS,
    ...IMPORTED_SYMBOLS,
  };

  return Object.entries(merged).map(([key, data]) => ({ key, data }));
}

function validateSymbol({ key, data }: SymbolEntry): string[] {
  const issues: string[] = [];
  const tags = Array.from(new Set((data.tags ?? []).map((tag) => tag.trim()))).filter(Boolean);

  if (!data.label || data.label.trim().length === 0) {
    issues.push('label is missing');
  }
  if (!data.meaning || data.meaning.trim().length < 16) {
    issues.push('meaning is too short (min 16 characters)');
  }
  if (tags.length === 0) {
    issues.push('tags are missing');
  }
  if (tags.length > 0 && tags.some((tag) => tag.length < 2)) {
    issues.push('tags contain very short entries (<2 characters)');
  }
  if (data.tags && data.tags.length !== tags.length) {
    issues.push('tags contain duplicates or blank entries');
  }
  if (data.advice && data.advice.trim().length < 12) {
    issues.push('advice is too short (min 12 characters)');
  }

  return issues;
}

function run(): void {
  const symbols = collectSymbols();
  const errors: string[] = [];

  symbols.forEach((entry) => {
    const issues = validateSymbol(entry);
    if (issues.length > 0) {
      errors.push(
        issues
          .map((issue) => ` - ${entry.key}: ${issue}`)
          .join('\n')
      );
    }
  });

  if (errors.length > 0) {
    console.error('[dict:validate] Found issues with dream symbols:\n' + errors.join('\n'));
    process.exit(1);
  }

  console.log(`[dict:validate] ${symbols.length} symbols validated successfully.`);
}

run();
