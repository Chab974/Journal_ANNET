# Audit Checklist

Use this checklist to confirm each finding before writing the report.

## 1. Scope and Evidence

- Confirm whether the target is a full-repo audit, a file audit, or a pasted snippet.
- Confirm whether the behavior is server-only, build-time, or public/static.
- Keep platform-level statements conservative. If the repo does not prove a setting, mark it `Non verifiable dans le repo`.

## 2. Endpoint Controls

Apply these four checks to every route, webhook, or server-side mutation surface:

- Authentication: Is the caller identity verified?
- Validation: Is the payload normalized by an explicit schema or equivalent strict checks?
- Authorization: Is access to the targeted resource restricted by policy?
- Rate limiting: Is there a control against brute force, bursts, or resource exhaustion?

For `Journal_ANNET`, check these surfaces first:

- `api/notion/webhook.js`
- `scripts/reconcile-production.mjs`
- `scripts/lib/notion/*.mjs`
- `scripts/lib/github-api.mjs`
- `scripts/lib/vercel-deploy-hook.mjs`

## 3. Secrets and Data Exposure

- Search `process.env`, `TOKEN`, `SECRET`, `NOTION_`, `GITHUB_`, `VERCEL_`, `NEXT_PUBLIC`, and `PUBLIC_`.
- Trace whether env-derived values can reach:
  - `src/_data/*.cjs`
  - `src/_includes/`
  - `data/*.json`
  - generated `_site/*.html`
  - logs, console output, tests, or docs
- Treat build-time Eleventy code as a possible bridge from secrets to public output.

## 4. Server-Only Access Boundary

- Notion, GitHub, and Vercel API calls must remain in `api/` or `scripts/lib/`.
- Flag any direct secret usage or remote API access from:
  - templates,
  - static data builders that emit public artifacts,
  - public JSON generation paths.

## 5. Supply Chain and CI/CD

- Verify `npm ci` in GitHub Actions.
- Flag `npm install` in CI or deployment automation.
- Recommend `npm install --ignore-scripts` or equivalent when the repo lacks package-install hardening guidance.
- Check whether lockfile integrity validation such as `lockfile-lint` is absent.
- Review workflow `permissions:` for least privilege and note any unnecessary write scopes.

## 6. Perimeter and Deployment Hardening

- Check repo-visible config for:
  - `Content-Security-Policy`
  - `Strict-Transport-Security`
  - `X-Frame-Options`
  - `X-Content-Type-Options`
- Check whether preview access restrictions, password protection, Trusted IPs, or WAF rules are expressed in repo docs or config.
- If they are not visible in repo code/config, record them as `Non verifiable dans le repo`, not as missing platform configuration.

## 7. Severity Calibration

- `Critique`: direct secret disclosure, auth bypass, or high-confidence remote compromise path.
- `Haute`: exploitable missing protection on exposed server surfaces, severe data leakage, or deployment hardening gaps on sensitive entry points.
- `Moyenne`: meaningful hardening gaps or validation weaknesses with constrained impact.
- `Faible`: advisory gaps, defense-in-depth improvements, or documentation/CI policy weaknesses.

## 8. Reporting Rules

- Order findings from highest to lowest severity.
- Use the exact French structure:
  - `🔴 Sévérité`
  - `🔍 Description du Risque`
  - `⚠️ Code Vulnérable`
  - `✅ Solution Sécurisée`
- Include exact excerpts from the repo when available.
- Prefer fixes that match the existing code style of the project.
