import { NextResponse } from 'next/server';
import { getMergedSymbols } from '@/lib/dictionary';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const tag = (url.searchParams.get('tag') || '').trim();
    const category = (url.searchParams.get('category') || '').trim();
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.max(1, Math.min(200, parseInt(url.searchParams.get('pageSize') || '50', 10) || 50));
    const syms = getMergedSymbols();
    const items = Object.entries(syms).map(([key, v]) => ({
      key,
      label: v.label,
      tags: v.tags || [],
      category: (v as any).category || null,
    }));
    let filtered = items;
    if (q) {
      filtered = filtered.filter(it => it.label.toLowerCase().includes(q) || it.key.toLowerCase().includes(q));
    }
    if (tag) {
      filtered = filtered.filter(it => (it.tags || []).includes(tag));
    }
    if (category) {
      filtered = filtered.filter(it => (it.category || '') === category);
    }
    // basic sort: label asc
    filtered = filtered.sort((a,b)=> a.label.localeCompare(b.label, 'ko'));
    const count = filtered.length;
    const start = (page - 1) * pageSize;
    const slice = start < count ? filtered.slice(start, Math.min(count, start + pageSize)) : [];
    const allTags: Record<string, number> = {};
    const categories: Record<string, number> = {};
    items.forEach(it => {
      (it.tags||[]).forEach(t => { allTags[t] = (allTags[t]||0)+1; });
      const c = (it.category || '').trim(); if (c) categories[c] = (categories[c]||0)+1;
    });
    return NextResponse.json({ total: items.length, count, page, pageSize, items: slice, tags: allTags, categories });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'error' }, { status: 400 });
  }
}
