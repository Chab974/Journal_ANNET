---
name: journal-annet-security-audit
description: Audit de securite dedie au projet Journal_ANNET. Utiliser pour auditer le depot complet, une route API Vercel, un fichier Node/Eleventy, un workflow GitHub Actions, un extrait de code colle, l'exposition de secrets via les donnees statiques, la supply chain NPM/Node, ou le durcissement de deploiement Vercel/GitHub/Notion.
---

# Journal Annet Security Audit

## Overview

Use this skill to audit the actual `Journal_ANNET` stack: Eleventy static build, Vercel API route, Notion/GitHub/Vercel integrations, GitHub Actions workflows, and Node/NPM supply chain.

Work from repo evidence first. Do not assume Next.js conventions or invent platform settings that are not visible in the codebase.

## Quick Start

1. Identify the audit mode: full repo, single file, or pasted snippet.
2. For a full-repo audit, read [references/repo-hotspots.md](references/repo-hotspots.md) and run `bash .codex/skills/journal-annet-security-audit/scripts/collect-security-signals.sh`.
3. Load [references/audit-checklist.md](references/audit-checklist.md) and inspect the highest-risk files first.
4. Produce the report in French, ordered from `Critique` to `Faible`.
5. Separate confirmed issues from platform controls that are `Non verifiable dans le repo`.

## Audit Modes

### Full Repo

- Inspect first:
  - `api/notion/webhook.js`
  - `scripts/lib/notion/*.mjs`
  - `scripts/lib/github-api.mjs`
  - `scripts/lib/vercel-deploy-hook.mjs`
  - `.github/workflows/*.yml`
  - `vercel.json`
  - `.env.example`
  - `package.json`
  - `package-lock.json`
  - `src/_data/*.cjs`
- Treat `src/_data/`, `src/_includes/`, `data/`, and generated `_site/` output as public-exposure surfaces.
- Include a short 3-5 line posture summary before the findings.

### Single File

- Audit the file in isolation first, then read only the minimum surrounding files needed to confirm impact.
- Skip the global summary unless it clarifies scope or residual risk.

### Pasted Snippet

- Audit the snippet as code that may belong to `Journal_ANNET`, but avoid claiming repo-specific exposure unless the repository confirms it.
- Ask for the source file only if the repo evidence is required to determine exploitability.

## Mandatory Workflow

1. Confirm the execution surface.
   - Distinguish server-only code (`api/`, `scripts/lib/`) from static/public output (`src/`, `data/`, `_site/`).
   - For claims about Vercel preview protection, Trusted IPs, WAF, or password gating, only state them as present when the repo proves it. Otherwise mark them `Non verifiable dans le repo`.

2. Apply the 4 mandatory endpoint checks to every server surface.
   - Authentication of the caller.
   - Strict input validation with an explicit schema or equivalent normalization.
   - Authorization to access or mutate the targeted resource.
   - Rate limiting or another resource-exhaustion control.

3. Audit secrets and data exposure.
   - Trace `process.env` usage and determine whether any value can flow into templates, data files, JSON snapshots, or generated HTML.
   - Flag any secret-like value exposed to public output, documentation, tests, or logs.
   - Because this repo is Eleventy, treat `src/_data/*.cjs` as build-time code that can leak secrets into static output.

4. Enforce the server-only access boundary.
   - Notion, GitHub, and Vercel API calls must stay in `api/` or `scripts/lib/`.
   - Flag business logic or credential use that migrates into templates, client-visible data builders, or other public render paths.
   - Treat this as the repository's equivalent of a server-only DAL.

5. Audit supply chain and CI/CD.
   - Verify `npm ci` in GitHub Actions and flag `npm install` if it appears in CI.
   - Recommend `npm install --ignore-scripts` or equivalent policy for local/package intake when relevant.
   - Recommend lockfile-integrity checks such as `lockfile-lint` when the repo does not already enforce them.
   - Inspect `package-lock.json`, workflow permissions, token usage, and deployment hooks.

6. Audit perimeter and deployment hardening.
   - Inspect `vercel.json`, middleware/config files, and deployment docs for security headers.
   - Look for evidence of CSP, HSTS, `X-Frame-Options`, and `X-Content-Type-Options`.
   - When headers are absent from repo-visible config, report the gap and keep platform-only controls in the `Non verifiable dans le repo` bucket.

## Reporting Contract

- Full repo audit: start with 3-5 lines summarizing overall posture, top risks, and blind spots.
- File or snippet audit: go directly to findings unless a brief summary adds value.
- For each confirmed issue, use this exact structure:

```text
🔴 Sévérité : Critique | Haute | Moyenne | Faible

🔍 Description du Risque : explication claire de la faille technique et de son impact métier.

⚠️ Code Vulnérable :
~~~lang
[extrait exact]
~~~

✅ Solution Sécurisée :
~~~lang
[correctif]
~~~
[explication defense-in-depth]
```

- Quote the exact vulnerable excerpt. Do not paraphrase the code block when the repo provides the source.
- Propose fixes in the project's existing style: plain Node.js modules, Eleventy build code, Vercel API handlers, GitHub Actions YAML.
- If no vulnerability is confirmed, say `aucune vulnerabilite confirmee`, then list residual risks and `Non verifiable dans le repo` items.

## Journal_ANNET Heuristics

- `api/notion/webhook.js`
  - Check signature verification, JSON parsing, replay/rate-limit gaps, token handling, and log hygiene.
- `scripts/lib/notion/*.mjs`
  - Check that Notion auth stays server-side and cannot flow into generated static artifacts.
- `scripts/lib/github-api.mjs` and `scripts/lib/vercel-deploy-hook.mjs`
  - Check token sourcing, outbound request hardening, and error/log leakage.
- `.github/workflows/*.yml`
  - Check `npm ci`, permission scope, token exposure, and deploy-trigger safety.
- `src/_data/*.cjs`, `src/_includes/`, `data/`
  - Check static-rendered data paths for env leakage, secret-derived output, or DAL boundary violations.
- `vercel.json`
  - Check for security headers or their absence. Do not assume a platform-side default.

## Resources

- `references/repo-hotspots.md`
  - Read first for the repository-specific audit order and security intent of each hotspot.
- `references/audit-checklist.md`
  - Use as the decision checklist before finalizing a finding.
- `scripts/collect-security-signals.sh`
  - Run for a fast, read-only inventory of secrets, workflow, endpoint, and perimeter signals before deeper inspection.
