@RTK.md

## Project Memory

Shared Codex memory lives in `~/Documents/Codex`.

When project memory is needed:
1. Read `~/Documents/Codex/wiki/hot.md`.
2. Read `~/Documents/Codex/wiki/index.md`.
3. Read `~/Documents/Codex/wiki/sources/project-journal-annet.md` if the task concerns Journal ANNET.
4. Read only the additional relevant wiki pages.
5. Do not read `~/Documents/Codex/.raw/` unless explicitly requested.
6. If `graphify-out/GRAPH_REPORT.md` exists for this project, read it before broad file searches.

## Project Notes

- Use the `journal-annet-publisher` skill for recurring publishing pipeline work.
- Treat `data/publications.json`, `data/agenda.json`, `data/menus.json`, and `data/site-sections.json` as generated artifacts.
- Prefer fixing Notion schema adapters in `scripts/lib/notion/snapshot-builders.mjs` over changing frontend contracts.
- Keep public URLs stable: `index.html`, `portail.html`, `agenda.html`.
- Vercel is production. GitHub Pages is the demo mirror.
