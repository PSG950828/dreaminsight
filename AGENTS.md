# Repository Guidelines

## Project Structure & Module Organization
- App (Next.js): `src/app` (`page.tsx`, `layout.tsx`, `globals.css`)
- Core analysis: `src/lib/dictionary.ts` (symbols/aliases/corrections, GI/MDA), `src/lib/analyze.ts` (API wrapper)
- UI components: `src/components/ui/*`
- User dictionary storage: `src/lib/dictStore.ts`
- CLI & helpers: `scripts/di.js` (CLI), `scripts/ai.sh` (agent launcher)
- Public assets/PWA: `public/*`, `public/manifest.json`

Tip: `dictionary.ts` is the source of truth for symbols/aliases. Keep UI logic thin and reuse library functions.

## Build, Test, and Development Commands
- Dev server: `npm run dev` (Next.js with Turbopack)
- Build/serve: `npm run build` → `npm start`
- Lint/types: `npm run lint`, `npm run typecheck`
- Analyzer (ts-node): `npm run analyze` | JSON: `npm run analyze:json -- "텍스트"`
- CLI usage: `npm run di -- --json "꿈 내용"`
- Samples: `npm run test:purple1`, `npm run test:purple2`

## Coding Style & Naming Conventions
- Language: TypeScript/React. Prefer functional components, hooks.
- Naming: `camelCase` for vars/functions, `PascalCase` for React components, file names lower‑case (`page.tsx`, `card.tsx`); large data modules may use underscores (e.g., `dream_lexicon.ts`).
- Linting: ESLint (Next config). Tailwind v4 for styles. Keep components small and typed; avoid one‑letter names.

## Testing Guidelines
- No formal test suite yet. Use:
  - Type safety: `npm run typecheck`
  - Lint: `npm run lint`
  - Analyzer smoke: `npm run analyze` or CLI `npm run di -- "..."`
- When adding symbols/aliases, validate with realistic Korean phrases (spacing/typos) and color/emotion cues.

## Commit & Pull Request Guidelines
- Commits: concise, imperative (e.g., "Add yellow light cue"), group related changes.
- PRs: include purpose, summary of changes, screenshots for UI, and steps to verify (commands). Link issues if any.
- Scope PRs narrowly (one feature/fix). Avoid unrelated refactors.

## Security & Configuration Tips
- Env: `.env.local` for local; Basic Auth via `ENABLE_AUTH=true`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASS` (see `middleware.ts`).
- Do not commit secrets. Staging domains are fully protected; prod protects `/app/**` when enabled.

## Agent‑Specific Instructions
- Prefer library calls over duplicating logic; `dictionary.ts` + `analyze.ts` are canonical.
- If editing the analyzer, keep normalization/aliases/corrections consistent and update both advice and cue extraction.
- Use fast grep: `rg` for code search; keep edits minimal and focused.
