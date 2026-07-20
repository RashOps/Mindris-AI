#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
verifier="$script_dir/verify_release_promotion.sh"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT HUP INT TERM

git -C "$tmp_dir" init -q -b main
git -C "$tmp_dir" config user.name "Mindris CI"
git -C "$tmp_dir" config user.email "ci@mindris.local"

echo base > "$tmp_dir/release.txt"
git -C "$tmp_dir" add release.txt
git -C "$tmp_dir" commit -qm "base"

echo candidate > "$tmp_dir/release.txt"
git -C "$tmp_dir" commit -qam "candidate"
git -C "$tmp_dir" tag v9.8.7-rc.1
git -C "$tmp_dir" commit --allow-empty -qm "merge-equivalent stable commit"
git -C "$tmp_dir" tag v9.8.7

(
  cd "$tmp_dir"
  MINDRIS_MAIN_REF=main "$verifier" v9.8.7 >/dev/null
)

echo changed > "$tmp_dir/release.txt"
git -C "$tmp_dir" commit -qam "tree mismatch"
git -C "$tmp_dir" tag v9.8.8

if (
  cd "$tmp_dir"
  MINDRIS_MAIN_REF=main "$verifier" v9.8.8 >/dev/null 2>&1
); then
  echo "tree mismatch was incorrectly accepted" >&2
  exit 1
fi

echo "Release promotion policy checks passed."
