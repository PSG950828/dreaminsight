/**
 * Storage Sync Helper: 매니페스트(JSON) → 다운로드/복제 명령 생성
 * Usage:
 *   TS_NODE_TRANSPILE_ONLY=1 ts-node scripts/storage-sync-from-manifest.ts manifest.json > sync.sh
 *   bash sync.sh  # 각 파일을 curl로 다운로드(또는 AWS S3로 복제)
 */

import * as fs from 'fs';

type Manifest = { items: Array<{ post_id: string; files: Array<{ path: string; url: string|null }> }> };

function main() {
  const [file] = process.argv.slice(2);
  if (!file) { console.error('Usage: ts-node storage-sync-from-manifest.ts <manifest.json>'); process.exit(2); }
  const raw = fs.readFileSync(file, 'utf-8');
  const j = JSON.parse(raw) as Manifest;
  const out: string[] = [];
  out.push('#!/usr/bin/env bash');
  out.push('set -euo pipefail');
  out.push('mkdir -p downloaded_storage');
  for (const it of (j.items||[])) {
    for (const f of (it.files||[])) {
      if (!f.url) continue;
      const safe = f.path.replace(/\//g, '_');
      out.push(`echo "downloading: ${f.path}"`);
      out.push(`curl -sSL ${JSON.stringify(f.url)} -o downloaded_storage/${JSON.stringify(safe)}`);
    }
  }
  console.log(out.join('\n'));
}

main();

