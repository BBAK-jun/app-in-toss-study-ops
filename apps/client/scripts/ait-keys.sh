#!/usr/bin/env bash
# apps/client/scripts/ait-keys.sh
#
# Manages apps-in-toss `ait` API keys in macOS keychain.
# Keys are NEVER stored in plaintext on disk except in ~/.ait/credentials
# (which ait reads at deploy time). That file is kept mode 0600.
#
# Storage layout:
#   keychain service:  apps-in-toss-ait-<profile>   (e.g. apps-in-toss-ait-dev)
#   keychain account:  $USER                         (current macOS user)
#   credentials file:  ~/.ait/credentials            (JSON, mode 600)
#
# Commands:
#   set <profile>     Prompt for key (hidden input) → store in keychain + sync
#   sync              Rebuild ~/.ait/credentials from keychain (idempotent)
#   list              Show stored profiles with last-4 chars only
#   remove <profile>  Delete from keychain + credentials
#   show <profile>    Print full key (USE WITH CAUTION — for debugging only)
#
# Usage:
#   ./scripts/ait-keys.sh set dev
#   ./scripts/ait-keys.sh sync
#   ./scripts/ait-keys.sh list

set -euo pipefail

PROFILE_VALID_RE='^[a-z][a-z0-9-]*$'
SVC_PREFIX="apps-in-toss-ait"
CRED_DIR="$HOME/.ait"
CRED_FILE="$CRED_DIR/credentials"

die() { echo "error: $*" >&2; exit 1; }

require_profile() {
  local p="${1:-}"
  [[ "$p" =~ $PROFILE_VALID_RE ]] || die "invalid profile name '$p' (lowercase, digits, hyphen only; must start with letter)"
  echo "$p"
}

svc_name() { echo "${SVC_PREFIX}-$1"; }

# Read key from keychain. Returns nonzero if not found.
get_from_keychain() {
  local profile="$1"
  security find-generic-password -s "$(svc_name "$profile")" -a "$USER" -w 2>/dev/null || true
}

# Write a single profile's key into keychain (upsert).
put_to_keychain() {
  local profile="$1" key="$2"
  security add-generic-password -s "$(svc_name "$profile")" -a "$USER" -w "$key" -U 2>/dev/null
}

delete_from_keychain() {
  local profile="$1"
  # `security delete` dumps the deleted entry's attributes — suppress for clean UX
  security delete-generic-password -s "$(svc_name "$profile")" -a "$USER" >/dev/null 2>&1 || true
}

# List profiles known to keychain (parsed from `security` dump).
keychain_profiles() {
  security dump-keychain 2>/dev/null \
    | grep -oE "\"svce\"<blob>=\"${SVC_PREFIX}-[a-z0-9-]+\"" \
    | sed -E "s/.*\"${SVC_PREFIX}-([a-z0-9-]+)\"/\1/" \
    | sort -u
}

# Rebuild ~/.ait/credentials JSON from all keychain entries.
sync_credentials() {
  mkdir -p "$CRED_DIR"
  local tmp; tmp="$(mktemp)"
  echo "{" > "$tmp"
  local first=1
  for profile in $(keychain_profiles); do
    local key; key="$(get_from_keychain "$profile")"
    [[ -z "$key" ]] && continue
    if [[ $first -eq 0 ]]; then echo "," >> "$tmp"; fi
    # JSON-encode the key (escape backslash and double-quote)
    local encoded; encoded="$(printf '%s' "$key" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')"
    printf '  "%s": "%s"' "$profile" "$encoded" >> "$tmp"
    first=0
  done
  echo "" >> "$tmp"
  echo "}" >> "$tmp"
  mv "$tmp" "$CRED_FILE"
  chmod 600 "$CRED_FILE"
  echo "✓ synced $(keychain_profiles | wc -l | tr -d ' ') profile(s) → $CRED_FILE (mode 600)"
}

cmd_set() {
  local profile; profile="$(require_profile "${1:-}")"
  echo "Enter API key for profile '$profile' (input hidden):"
  # -s = silent (no echo), required so the key doesn't leak to terminal scrollback
  local key; key="$(read -rs key; echo "$key")"
  [[ -z "$key" ]] && die "empty key — aborted"
  put_to_keychain "$profile" "$key"
  sync_credentials
  echo "✓ stored in keychain: service=$(svc_name "$profile") account=$USER"
}

cmd_sync() { sync_credentials; }

cmd_list() {
  echo "Apps-in-Toss ait keychain inventory"
  echo "-----------------------------------"
  echo "keychain prefix: ${SVC_PREFIX}-<profile>"
  echo "credentials:     $CRED_FILE"
  echo
  local found=0
  for profile in $(keychain_profiles); do
    local key; key="$(get_from_keychain "$profile")"
    local last4="${key: -4}"
    local len="${#key}"
    echo "  $profile:"
    echo "    keychain service : $(svc_name "$profile")"
    echo "    account          : $USER"
    echo "    length           : $len chars"
    echo "    last 4           : …$last4"
    found=1
  done
  [[ $found -eq 0 ]] && echo "  (no profiles stored yet — run: $0 set <profile>)"
}

cmd_remove() {
  local profile; profile="$(require_profile "${1:-}")"
  delete_from_keychain "$profile"
  sync_credentials
  echo "✓ removed profile '$profile' from keychain + credentials"
}

cmd_show() {
  local profile; profile="$(require_profile "${1:-}")"
  local key; key="$(get_from_keychain "$profile")"
  [[ -z "$key" ]] && die "profile '$profile' not found in keychain"
  echo "$key"
}

usage() {
  sed -n '2,/^$/p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
}

main() {
  local cmd="${1:-}"
  shift || true
  case "$cmd" in
    set)     cmd_set "$@";;
    sync)    cmd_sync;;
    list)    cmd_list;;
    remove)  cmd_remove "$@";;
    show)    cmd_show "$@";;
    -h|--help|help|"") usage;;
    *)       die "unknown command '$cmd'. Try: $0 --help";;
  esac
}

main "$@"
