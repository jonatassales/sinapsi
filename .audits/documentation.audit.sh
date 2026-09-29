#!/bin/sh
set -eu

ROOT=$(CDPATH= cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"

failures=0
pass() { printf 'PASS  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1" >&2; failures=$((failures + 1)); }

for image in \
  assets/images/readme-banner.png
do
  if [ -s "$image" ]; then
    pass "$image exists"
  else
    fail "missing or empty $image"
  fi
done

headline_line=$(grep -n -m1 '<h1 align="center">' README.md | cut -d: -f1 || true)
banner_line=$(grep -n -m1 'assets/images/readme-banner.png' README.md | cut -d: -f1 || true)
badges_line=$(grep -n -m1 'badge-l4.svg' README.md | cut -d: -f1 || true)
product_line=$(grep -n -m1 '^## Overview$' README.md | cut -d: -f1 || true)

if \
  [ -n "$headline_line" ] &&
  [ -n "$banner_line" ] &&
  [ -n "$badges_line" ] &&
  [ -n "$product_line" ] &&
  [ "$headline_line" -lt "$banner_line" ] &&
  [ "$banner_line" -lt "$badges_line" ] &&
  [ "$badges_line" -lt "$product_line" ]
then
  pass 'README hero leads into the product implementation guide'
else
  fail 'README hero must be headline -> banner -> badges -> product guide'
fi

for token in \
  'paladini.github.io/harness-score/maturity/badge-l4.svg' \
  'github/actions/workflow/status/jonatassales/sinapsi/ci.yml' \
  'img.shields.io/npm/v/sinapsi'
do
  if grep -F "$token" README.md >/dev/null 2>&1; then
    pass "README contains badge $token"
  else
    fail "README is missing badge $token"
  fi
done

if awk '
  BEGIN {
    expected[1] = "<a href=\"https://github.com/jonatassales/sinapsi\"><strong>Documentation</strong></a>"
    expected[2] = "<a href=\"https://www.npmjs.com/package/sinapsi\"><strong>npm</strong></a>"
    expected[3] = "<a href=\"./LICENSE\"><strong>MIT License</strong></a>"
  }
  /^[[:space:]]*<p align="center">[[:space:]]*$/ {
    active = 1; count = 0; valid = 1; next
  }
  active && /<a / {
    count++
    if (count > 3 || index($0, expected[count]) == 0) valid = 0
  }
  active && /<\/p>/ {
    if (valid && count == 3) found = 1
    active = 0
  }
  END { exit(found ? 0 : 1) }
' README.md; then
  pass 'README centers Documentation, npm, and MIT License consumer links'
else
  fail 'README must center Documentation, npm, and MIT License consumer links'
fi

for heading in \
  '## Overview' \
  '## Install' \
  '## Quick start' \
  '## Usage' \
  '## Web Component API' \
  '### HTML attributes' \
  '### JavaScript properties' \
  '## Motion and activation' \
  '## Palette' \
  '## React and Next.js' \
  '## SSR and browser registration' \
  '## Accessibility' \
  '## Package entry points' \
  '## License'
do
  if grep -F -x "$heading" README.md >/dev/null 2>&1; then
    pass "README contains $heading"
  else
    fail "README is missing $heading"
  fi
done

for token in \
  'sinapsi/browser' \
  '<sinaps-i' \
  color-primary \
  color-text \
  color-muted \
  defineSinapsi \
  activation \
  'move="rotate"'
do
  if grep -F "$token" README.md >/dev/null 2>&1; then
    pass "README documents consumer API token $token"
  else
    fail "README does not document consumer API token $token"
  fi
done

for value in idle rotate pulse; do
  if grep -F "$value" README.md >/dev/null 2>&1; then
    pass "README documents move $value"
  else
    fail "README does not document move $value"
  fi
done

for forbidden in \
  '## Contributing' \
  '## Release review' \
  './cli/graph bootstrap' \
  'graph cleanup --dry-run' \
  'graph git setup' \
  'lint-staged' \
  'Commitlint' \
  '.agents/' \
  '.audits/' \
  'Fork maintainers'
do
  if grep -F "$forbidden" README.md >/dev/null 2>&1; then
    fail "README contains repository-maintainer material: $forbidden"
  else
    pass "README excludes repository-maintainer material: $forbidden"
  fi
done

for token in \
  '## Source checkout: use `graph` directly' \
  'graph doctor' \
  'graph test' \
  'graph check' \
  'pnpm:devPreinstall' \
  './cli/graph setup --launcher'
do
  if grep -F "$token" cli/readme.md >/dev/null 2>&1; then
    pass "CLI guide documents $token"
  else
    fail "CLI guide does not document $token"
  fi
done

if grep -E 'pnpm exec[[:space:]]+graph|npm exec --[[:space:]]+graph' README.md cli/readme.md >/dev/null 2>&1; then
  fail 'active documentation requires a package-manager executable runner for Graph'
else
  pass 'active documentation uses graph directly for engineering commands'
fi

if grep -E 'pnpm (graph|check|version:check)' README.md cli/readme.md >/dev/null 2>&1; then
  fail 'documentation retains removed package-script command aliases'
else
  pass 'documentation keeps Graph as the engineering command surface'
fi

if [ "$failures" -ne 0 ]; then
  printf '\n%d documentation audit failure(s).\n' "$failures" >&2
  exit 1
fi

printf '\nDocumentation audit passed.\n'
