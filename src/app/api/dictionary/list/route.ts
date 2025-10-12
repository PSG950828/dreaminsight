import { NextResponse } from "next/server";
import { getMergedSymbols, normalizeText } from "@/lib/dictionary";

// GET /api/dictionary/list
// Query params:
//  - q: string (label/tags/category contains; case-insensitive; Korean normalized)
//  - tag: string (filter items that include this tag)
//  - category: string (filter items that match this category)
//  - page: number (1-based)
//  - pageSize: number (default 50, 10..500)
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const tag = (url.searchParams.get("tag") || "").trim();
    const category = (url.searchParams.get("category") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const rawPageSize = parseInt(url.searchParams.get("pageSize") || "50", 10) || 50;
    const pageSize = Math.min(500, Math.max(10, rawPageSize));

    const symbols = getMergedSymbols() as any as Record<string, { label: string; tags?: string[]; category?: string }>;

    // Build base list
    const all: Array<{ key: string; label: string; tags: string[]; category?: string|null }> = [];
    for (const [key, val] of Object.entries(symbols)) {
      const label = String((val as any)?.label || key);
      const tags = Array.isArray((val as any)?.tags) ? ((val as any).tags as string[]) : [];
      const cat = (val as any)?.category || null;
      all.push({ key, label, tags, category: cat });
    }

    // Filters
    let items = all;
    if (tag) items = items.filter((it) => (it.tags || []).includes(tag));
    if (category) items = items.filter((it) => (it.category || "") === category);

    if (q) {
      const nq = normalizeText(q);
      items = items.filter((it) => {
        const nl = normalizeText(it.label || "");
        const ntags = (it.tags || []).map((t) => normalizeText(t));
        const ncat = normalizeText(String(it.category || ""));
        return nl.includes(nq) || ntags.some((t) => t.includes(nq)) || (!!ncat && ncat.includes(nq));
      });
    }

    // Aggregates for current result set
    const tagsMap: Record<string, number> = {};
    const catMap: Record<string, number> = {};
    for (const it of items) {
      for (const t of it.tags || []) tagsMap[t] = (tagsMap[t] || 0) + 1;
      if (it.category) catMap[it.category] = (catMap[it.category] || 0) + 1;
    }

    const total = all.length;
    const count = items.length;

    // Pagination
    const start = (page - 1) * pageSize;
    const pageItems = items.slice(start, start + pageSize);

    return NextResponse.json({ items: pageItems, total, count, tags: tagsMap, categories: catMap }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 });
  }
}

