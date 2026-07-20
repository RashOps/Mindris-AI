#!/bin/sh
set -eu

stable_tag="${1:-}"
main_ref="${MINDRIS_MAIN_REF:-origin/main}"

fail() {
  echo "release promotion rejected: $*" >&2
  exit 1
}

case "$stable_tag" in
  v[0-9]*.[0-9]*.[0-9]*) ;;
  *) fail "expected a stable tag such as v0.5.0" ;;
esac

echo "$stable_tag" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || \
  fail "$stable_tag is not a strict stable semantic version"

git rev-parse --verify "${stable_tag}^{commit}" >/dev/null 2>&1 || \
  fail "stable tag $stable_tag does not exist"
git rev-parse --verify "${main_ref}^{commit}" >/dev/null 2>&1 || \
  fail "main reference $main_ref does not exist"

stable_commit="$(git rev-parse "${stable_tag}^{commit}")"
stable_tree="$(git rev-parse "${stable_tag}^{tree}")"

git merge-base --is-ancestor "$stable_commit" "$main_ref" || \
  fail "$stable_tag is not contained in $main_ref"

rc_tag=""
for candidate in $(git tag --list "${stable_tag}-rc.*" --sort=-version:refname); do
  candidate_commit="$(git rev-parse "${candidate}^{commit}")"
  candidate_tree="$(git rev-parse "${candidate}^{tree}")"

  if git merge-base --is-ancestor "$candidate_commit" "$stable_commit" && \
    [ "$candidate_tree" = "$stable_tree" ]; then
    rc_tag="$candidate"
    break
  fi
done

[ -n "$rc_tag" ] || \
  fail "no ancestor ${stable_tag}-rc.* tag has the same Git tree as $stable_tag"

rc_commit="$(git rev-parse "${rc_tag}^{commit}")"
echo "stable_tag=$stable_tag"
echo "stable_commit=$stable_commit"
echo "stable_tree=$stable_tree"
echo "rc_tag=$rc_tag"
echo "rc_commit=$rc_commit"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "stable_tag=$stable_tag"
    echo "stable_commit=$stable_commit"
    echo "stable_tree=$stable_tree"
    echo "rc_tag=$rc_tag"
    echo "rc_commit=$rc_commit"
  } >> "$GITHUB_OUTPUT"
fi
