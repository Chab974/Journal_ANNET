#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_REPO_ROOT="$(cd "${SCRIPT_DIR}/../../../.." && pwd)"

if [[ $# -gt 0 ]]; then
  TARGET_ROOT="$(cd "$1" && pwd)"
else
  TARGET_ROOT="${DEFAULT_REPO_ROOT}"
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "rg is required for collect-security-signals.sh" >&2
  exit 1
fi

rg_scan() {
  local title="$1"
  local pattern="$2"
  shift 2

  printf '\n== %s ==\n' "$title"

  local paths=()
  local path
  for path in "$@"; do
    if [[ -e "$path" ]]; then
      paths+=("$path")
    fi
  done

  if [[ ${#paths[@]} -eq 0 ]]; then
    echo "(no matching paths)"
    return 0
  fi

  rg -n -m 80 --hidden --color never \
    -g '!node_modules/**' \
    -g '!.git/**' \
    "$pattern" "${paths[@]}" || true
}

printf 'Journal_ANNET security signal inventory\n'
printf 'repo_root: %s\n' "$TARGET_ROOT"
printf 'generated_at: %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

printf '\n== Priority hotspots ==\n'
for rel in \
  "api/notion/webhook.js" \
  "scripts/lib/notion" \
  "scripts/lib/github-api.mjs" \
  "scripts/lib/vercel-deploy-hook.mjs" \
  ".github/workflows" \
  "vercel.json" \
  ".env.example" \
  "package.json" \
  "package-lock.json" \
  "src/_data"; do
  if [[ -e "${TARGET_ROOT}/${rel}" ]]; then
    printf -- '- %s\n' "$rel"
  else
    printf -- '- %s (missing)\n' "$rel"
  fi
done

rg_scan \
  "Environment and secret surfaces" \
  'process\.env|NOTION_|GITHUB_|VERCEL_|TOKEN|SECRET|NEXT_PUBLIC|PUBLIC_' \
  "${TARGET_ROOT}/api" \
  "${TARGET_ROOT}/scripts" \
  "${TARGET_ROOT}/lib" \
  "${TARGET_ROOT}/src" \
  "${TARGET_ROOT}/tests" \
  "${TARGET_ROOT}/.env.example"

rg_scan \
  "Endpoint controls: auth, schema, authorization, rate limiting" \
  'timingSafeEqual|verify|signature|Authorization|auth|schema|zod|safeParse|parse\(|authorize|permission|rate|limit|throttle|429|retry-after' \
  "${TARGET_ROOT}/api" \
  "${TARGET_ROOT}/scripts/lib" \
  "${TARGET_ROOT}/tests"

rg_scan \
  "CI and install commands" \
  'npm ci|npm install|ignore-scripts|lockfile-lint|permissions:' \
  "${TARGET_ROOT}/.github" \
  "${TARGET_ROOT}/README.md" \
  "${TARGET_ROOT}/package.json"

rg_scan \
  "Perimeter controls and security headers" \
  'Content-Security-Policy|Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Trusted IP|trusted ip|password protection|preview protection|WAF|firewall|"headers"|headers:' \
  "${TARGET_ROOT}/vercel.json" \
  "${TARGET_ROOT}/eleventy.config.js" \
  "${TARGET_ROOT}/api" \
  "${TARGET_ROOT}/src" \
  "${TARGET_ROOT}/README.md"

rg_scan \
  "Static/publication exposure surfaces" \
  'process\.env|NOTION_|GITHUB_|VERCEL_|TOKEN|SECRET' \
  "${TARGET_ROOT}/src/_data" \
  "${TARGET_ROOT}/src/_includes" \
  "${TARGET_ROOT}/data" \
  "${TARGET_ROOT}/_site"

rg_scan \
  "Lockfile integrity signals" \
  '"lockfileVersion"|"resolved"|"integrity"' \
  "${TARGET_ROOT}/package-lock.json"
