# Repo Hotspots

Read these paths first during a full-repo audit.

## API and Remote Integrations

- `api/notion/webhook.js`
  - Main exposed server surface. Audit request parsing, signature verification, logging, replay handling, authz assumptions, and rate limiting.
- `scripts/lib/notion/webhook.mjs`
  - Verify signature logic, event filtering, and resolver behavior.
- `scripts/lib/notion/client.mjs`
  - Verify token handling and outbound request construction.
- `scripts/lib/github-api.mjs`
  - Verify token sourcing, auth headers, and error handling.
- `scripts/lib/vercel-deploy-hook.mjs`
  - Verify deploy-hook handling, rate-limit parsing, and secret-safe errors.

## Build and Publication Surfaces

- `src/_data/journal.cjs`
  - Build-time code that can project env-derived state into public HTML or JSON.
- `src/_includes/`
  - Template layer. Should not contain secrets or server-only API calls.
- `data/`
  - Public or generated content. Inspect for secret-derived fields or unintended metadata.
- `_site/`
  - Built output. Useful to confirm whether sensitive build-time values become public artifacts.

## CI/CD and Deployment

- `.github/workflows/deploy-demo-pages.yml`
  - Check `npm ci`, permission scope, secret handling, and deploy exposure.
- `.github/workflows/reconcile-prod-deploy.yml`
  - Check token use, deploy-hook safety, and least privilege.
- `vercel.json`
  - Check visible hardening controls such as headers, function includes, and routing behavior.
- `.env.example`
  - Inventory sensitive env names and ensure examples do not encourage client exposure.

## Package and Lockfile

- `package.json`
  - Inspect scripts and dependency surface.
- `package-lock.json`
  - Confirm deterministic installation and note the absence of lockfile-policy enforcement if applicable.

## Likely Findings in This Repo Shape

Expect to confirm or rule out these classes of issues:

- Missing rate limiting on webhook/API entry points.
- Missing strict schema validation after JSON parsing.
- Logging of verification tokens or other sensitive request metadata.
- Lack of repo-visible CSP/HSTS/frame/content-type headers.
- `npm install` guidance in docs despite `npm ci` in CI.
- Absence of explicit lockfile integrity enforcement.
