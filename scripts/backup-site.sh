#!/usr/bin/env bash
# Canary Dashboard site backup (owner-approved 2026-09-25).
#
#  1. Tarball: /workspace/backups/canary-site-<YYYY-MM-DD>.tar.gz
#       site repo (/workspace/repos/canaries, no node_modules / build output)
#       + /home/box/canaries data under backup-data/ (no screenshots)
#     Keeps the newest 30 tarballs.
#  2. Private GitHub backup repo (remote name "backup" ONLY):
#       https://github.com/shaunleebryant-netizen/canary-dashboard-backup
#     Committed from a SEPARATE clone at /workspace/backups/canary-dashboard-backup,
#     so the site repo's own git (and its "origin" remote) is never touched.
#
# Secrets are never copied: .env*, .dev.vars*, *.pem/*.key, token/secret/credential
# files, wrangler state, and any file whose content matches a secret pattern
# (Stripe sk_/rk_/pk_/whsec_, GitHub/AWS/Slack/Google tokens, Cloudflare tokens,
# private keys, password=/token= literals). A names-only env.required.txt lists
# the variables to re-add. Excluded paths are listed in BACKUP-EXCLUDED.txt and
# printed. Before every push the STAGED content is grepped again; any hit aborts.
#
# Usage: bash scripts/backup-site.sh [--no-push]
# Prints: tarball path + size, pushed commit SHA.
set -euo pipefail

SITE="/workspace/repos/canaries"
DATA="/home/box/canaries"
OUT="/workspace/backups"
BKREPO="$OUT/canary-dashboard-backup"
REMOTE_URL="https://github.com/shaunleebryant-netizen/canary-dashboard-backup.git"
KEEP=30
DATE="$(date +%F)"          # box clock = Pacific/Auckland
NO_PUSH=0
[[ "${1:-}" == "--no-push" ]] && NO_PUSH=1

SECRET_RE='(sk|rk|pk)_(live|test)_[A-Za-z0-9]{10,}|whsec_[A-Za-z0-9]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|(CLOUDFLARE|CF)_[A-Z_]*(TOKEN|KEY)[[:space:]]*[=:][[:space:]]*["'"'"']?[A-Za-z0-9_-]{20,}|(password|passwd|secret|api[_-]?key|token)[[:space:]]*[=:][[:space:]]*["'"'"'][^"'"'"'[:space:]{}]{8,}'

# Path excludes (both copies). Build output, deps, caches, secrets.
EXCLUDES=(
  --exclude=./node_modules --exclude=./.next --exclude=./.open-next --exclude=./.wrangler
  --exclude=./.git --exclude=./.turbo --exclude=./.cache --exclude=./out --exclude=./build
  --exclude=./coverage --exclude='*.tsbuildinfo' --exclude=./.vercel
  --exclude='.env' --exclude='.env.*' --exclude='.env*' --exclude='.dev.vars*' --exclude='dev.vars'
  --exclude='*.pem' --exclude='*.key' --exclude='*.p12' --exclude='*.pfx'
  --exclude='*secret*' --exclude='*token*' --exclude='*credential*'
  --exclude='wrangler_oauth_bridge.py'
  --exclude='newsletter-signups.json' --exclude='seminar-signups.json' --exclude='tuition-leads.json'
)
DATA_EXCLUDES=(--exclude=./screenshots)

mkdir -p "$OUT"
STAGE="$(mktemp -d "$OUT/.stage-$DATE-XXXX")"
trap 'rm -rf "$STAGE"' EXIT
EXCL="$STAGE/BACKUP-EXCLUDED.txt"
: > "$EXCL"

copy_tree() { # src dst extra-excludes...
  local src="$1" dst="$2"; shift 2
  mkdir -p "$dst"
  tar -C "$src" "${EXCLUDES[@]}" "$@" -cf - . | tar -C "$dst" -xf -
}

# Record path-excluded secret-ish files (names only, never contents).
list_path_excluded() { # root label
  (cd "$1" && find . \( -path ./node_modules -o -path ./.next -o -path ./.open-next -o -path ./.git \) -prune -o \
     -type f \( -name '.env*' -o -name '.dev.vars*' -o -name 'dev.vars' -o -name '*.pem' -o -name '*.key' \
       -o -name '*secret*' -o -name '*token*' -o -name '*credential*' -o -name 'wrangler_oauth_bridge.py' \) -print) \
    | sed "s|^\./|$2/|" | sed 's/$/  (path rule: secret-type file)/' >> "$EXCL" || true
  [[ -d "$1/.wrangler" ]] && echo "$2/.wrangler/  (path rule: wrangler local state)" >> "$EXCL" || true
}

copy_tree "$SITE" "$STAGE/site"
copy_tree "$DATA" "$STAGE/site/backup-data" "${DATA_EXCLUDES[@]}"
list_path_excluded "$SITE" "site"
list_path_excluded "$DATA" "backup-data"
echo "backup-data/screenshots/  (size rule: screenshots not backed up)" >> "$EXCL"

# Names-only list of env vars to re-add (values never copied).
{
  echo "# Env / secret NAMES to re-add after restore (values are NOT backed up)."
  echo "# Cloudflare Worker secrets: npx wrangler secret put <NAME>"
  for f in "$SITE/.env.example" "$SITE/.env.local" "$SITE/.dev.vars"; do
    [[ -f "$f" ]] || continue
    echo "## from $(basename "$f")"
    grep -E '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*[[:space:]]*=' "$f" | sed -E 's/^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*).*/\1/' | sort -u
  done
} > "$STAGE/site/env.required.txt"

# Content scan: drop any staged file that still looks secret.
while IFS= read -r f; do
  rel="${f#"$STAGE"/site/}"
  echo "$rel  (content rule: secret-looking string)" >> "$EXCL"
  rm -f "$f"
done < <(grep -rlIE -i "$SECRET_RE" "$STAGE/site" --exclude=env.required.txt --exclude=BACKUP-EXCLUDED.txt 2>/dev/null \
  | grep -v -x -F -e "$STAGE/site/src/lib/members/stripe.ts" -e "$STAGE/site/scripts/members-e2e.mjs" || true)
# ^ Owner-verified 2026-09-26: stripe.ts (whsec_mock… placeholder) and members-e2e.mjs
#   (local test passwords / sk_test_sign… mock) hold no real secrets.
cp "$EXCL" "$STAGE/site/BACKUP-EXCLUDED.txt"

# 1) Tarball
TARBALL="$OUT/canary-site-$DATE.tar.gz"
tar -C "$STAGE" -czf "$TARBALL" --transform "s|^site|canary-site-$DATE|" site
ls -1t "$OUT"/canary-site-*.tar.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
SIZE="$(du -h "$TARBALL" | cut -f1)"

# 2) Private GitHub backup repo (separate clone; remote "backup")
SHA="(push skipped)"
if [[ "$NO_PUSH" -eq 0 ]]; then
  if [[ ! -d "$BKREPO/.git" ]]; then
    mkdir -p "$BKREPO"
    git -C "$BKREPO" init -q -b main
    git -C "$BKREPO" remote add backup "$REMOTE_URL"
    git -C "$BKREPO" config user.name "Canary Backup"
    git -C "$BKREPO" config user.email "shaunleebryant-netizen@users.noreply.github.com"
    git -C "$BKREPO" fetch -q backup 2>/dev/null && git -C "$BKREPO" rev-parse -q --verify backup/main >/dev/null \
      && git -C "$BKREPO" reset -q backup/main || true
  fi
  # Refuse anything but the dedicated backup remote.
  if git -C "$BKREPO" remote | grep -qvx backup; then
    echo "ABORT: backup clone has a remote other than 'backup'" >&2; exit 3
  fi
  find "$BKREPO" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  # data/private/ = Cboe delayed options data (personal, non-commercial use only): kept in the
  # Drive tarball above, NEVER committed to GitHub (owner 2026-09-28). Any options-* JSON or raw
  # chain file under backup-data/ is kept out of GitHub for the same reason.
  (cd "$STAGE/site" && tar --exclude=./backup-data/book --exclude=./data/private \
     --exclude='./backup-data/private' --exclude='./backup-data/**/options-*.json*' -cf - .) | tar -C "$BKREPO" -xf -
  echo "data/private/  (GitHub leg only: Cboe options data, kept in Drive tarball)" | tee -a "$EXCL" >> "$BKREPO/BACKUP-EXCLUDED.txt"
  cat > "$BKREPO/.gitignore" <<'GI'
# secrets — never commit
.env
.env.*
.env*
.dev.vars*
dev.vars
*.pem
*.key
*.p12
*.pfx
*secret*
*token*
*credential*
.wrangler/
# build output / deps / caches
node_modules/
.next/
.open-next/
out/
build/
coverage/
.turbo/
.cache/
*.tsbuildinfo
.vercel
# PII
newsletter-signups.json
seminar-signups.json
tuition-leads.json
# Cboe delayed options data (personal use only): Drive tarball only, never GitHub
data/private/
backup-data/private/
# large binaries
backup-data/screenshots/
backup-data/book/
GI
  git -C "$BKREPO" add -A
  # Verify staged content: secret-type paths or secret-looking strings abort.
  if git -C "$BKREPO" diff --cached --name-only | grep -Ei '(^|/)(\.env|\.dev\.vars)|\.pem$|\.key$|secret|token|credential' \
       | grep -v -x -E 'env\.required\.txt|src/lib/members/sessionToken\.ts'; then
    # sessionToken.ts: HMAC session code (secret is a runtime argument, none in the file); still content-scanned.
    echo "ABORT: secret-type path staged" >&2; exit 4
  fi
  # Cboe options data must never reach GitHub.
  if git -C "$BKREPO" ls-files --cached | grep -E '(^|/)data/private/|(^|/)options-(scan|iv-history|contract-history)\.json|cboe.*\.json(\.gz)?$'; then
    echo "ABORT: Cboe/options data staged for GitHub" >&2; exit 6
  fi
  if git -C "$BKREPO" grep --cached -I -l -i -E "$SECRET_RE" -- . ':!env.required.txt' ':!BACKUP-EXCLUDED.txt' ':!.gitignore' \
       ':!src/lib/members/stripe.ts' ':!scripts/members-e2e.mjs' ; then
    echo "ABORT: secret-looking content staged" >&2; exit 5
  fi
  if git -C "$BKREPO" diff --cached --quiet && git -C "$BKREPO" rev-parse -q --verify HEAD >/dev/null; then
    echo "No changes since last backup commit."
  else
    git -C "$BKREPO" commit -q -m "backup: canary site + data $DATE ($(date +%H:%M) PT)"
  fi
  git -C "$BKREPO" push -q backup main
  SHA="$(git -C "$BKREPO" rev-parse HEAD)"
fi

echo "EXCLUDED (secret / path rules):"
sed 's/^/  /' "$EXCL"
echo "TARBALL: $TARBALL ($SIZE)"
echo "BACKUP REPO: ${REMOTE_URL%.git}"
echo "COMMIT SHA: $SHA"
