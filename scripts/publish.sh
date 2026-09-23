#!/usr/bin/env bash
# Validate, commit and deploy one map.
#
#   scripts/publish.sh <slug> "<commit message>"
#   scripts/publish.sh rust "Add Rust ecosystem map"
#
# Pages deploys straight from main, so pushing IS publishing. That makes the
# validator the only gate between a broken graph and the live site — this script
# runs it first and refuses to push on failure.
#
# Only the map's own files are staged (data/<slug>.js, maps/<slug>.html,
# data/manifest.js), so unrelated work in the tree never rides along.
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo"

slug="${1:-}"
msg="${2:-}"
if [[ -z "$slug" || -z "$msg" ]]; then
  echo 'Usage: scripts/publish.sh <slug> "<commit message>"' >&2
  exit 1
fi

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" ]]; then
  echo "On branch '$branch' — Pages deploys from main. Switch first." >&2
  exit 1
fi

files=("data/$slug.js" "maps/$slug.html" "data/manifest.js")
for f in "${files[@]}"; do
  [[ -f "$f" ]] || { echo "Missing $f — scaffold with scripts/new-map.mjs first." >&2; exit 1; }
done

# Anything already staged that isn't ours would be swept into this commit.
stray="$(git diff --cached --name-only | grep -vxF -e "${files[0]}" -e "${files[1]}" -e "${files[2]}" || true)"
if [[ -n "$stray" ]]; then
  echo "Unrelated files are already staged; unstage or commit them first:" >&2
  echo "$stray" | sed 's/^/  /' >&2
  exit 1
fi

echo "→ Validating"
node scripts/validate.mjs

git add -- "${files[@]}"
if git diff --cached --quiet; then
  echo "Nothing changed for '$slug' — nothing to publish."
  exit 0
fi

echo "→ Committing"
git commit -q -m "$msg"

echo "→ Syncing with origin/main"
git pull -q --rebase --autostash origin main
node scripts/validate.mjs > /dev/null   # re-check: the rebase may have pulled in manifest changes

echo "→ Pushing"
git push -q origin main
sha="$(git rev-parse HEAD)"

# Wait for the Pages build of this exact commit. Best-effort: skipped without gh.
if ! command -v gh > /dev/null; then
  echo "Pushed $sha. (gh not installed — not waiting for the Pages build.)"
  exit 0
fi

nwo="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
site="$(gh api "repos/$nwo/pages" -q .html_url 2>/dev/null || true)"
echo "→ Waiting for GitHub Pages build of ${sha:0:7}"
status=""
for _ in $(seq 1 60); do
  read -r build_sha status < <(gh api "repos/$nwo/pages/builds/latest" -q '"\(.commit) \(.status)"' 2>/dev/null || echo "- -")
  if [[ "$build_sha" == "$sha" && ( "$status" == "built" || "$status" == "errored" ) ]]; then break; fi
  sleep 5
done

url="${site%/}/maps/$slug.html"
case "$status" in
  built)   echo "✓ Live: $url" ;;
  errored) echo "✗ Pages build errored — check the repo's Pages settings / Actions tab." >&2; exit 1 ;;
  *)
    # The builds API doesn't always record every push; the page itself is the real test.
    code="$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)"
    if [[ "$code" == "200" ]]; then echo "✓ Live: $url"
    else echo "Pushed ${sha:0:7}, but $url returned HTTP ${code:-?} after 5 min (build status: ${status:-unknown})."
    fi ;;
esac
