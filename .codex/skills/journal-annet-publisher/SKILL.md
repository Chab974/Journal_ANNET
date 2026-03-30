---
name: journal-annet-publisher
description: Use when maintaining the Journal ANNET editorial pipeline: sync Notion data sources, validate generated snapshots, build the Eleventy site, diagnose webhook/media/schema issues, and follow the repository runbook without re-deriving the workflow.
---

# Journal ANNET Publisher

Use this skill for recurring work on the Journal ANNET publishing chain.

## Quick start
1. Check env coverage in `.env.example`.
2. Run `npm run sync:notion` when Notion access is required.
3. Run `npm run validate:snapshots`.
4. Run `npm run build`.
5. For deployment issues, inspect:
   - `.github/workflows/deploy-pages.yml`
   - `api/notion/webhook.js`
   - `scripts/lib/notion/snapshot-builders.mjs`

## Rules
- Treat `data/publications.json`, `data/agenda.json`, `data/menus.json`, and `data/site-sections.json` as generated artifacts. Do not hand-edit them unless explicitly asked.
- Keep public URLs stable: `index.html`, `portail.html`, `agenda.html`.
- Prefer fixing schema adapters in `scripts/lib/notion/snapshot-builders.mjs` instead of changing frontend contracts.
- Media download failures are warnings, not hard build failures.

## Common tasks
- **New Notion property names**: update candidate lists in `scripts/lib/notion/snapshot-builders.mjs`.
- **Broken cross-links**: run `npm run validate:snapshots` and inspect agenda/publication relations.
- **Webhook dispatch issues**: verify `NOTION_WEBHOOK_VERIFICATION_TOKEN`, `GITHUB_WEBHOOK_TOKEN`, repo/workflow env vars, and event filtering in `scripts/lib/notion/webhook.mjs`.
- **Template regressions**: build locally and inspect `_site/index.html`, `_site/portail.html`, `_site/agenda.html`.
