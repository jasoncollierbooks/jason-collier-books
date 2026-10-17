#!/bin/bash
# Collier Entertainment: copy the site's audio and video into Cloudflare R2.
#
# Run from inside the site folder on the Mac, after `git pull`:
#     bash cloudflare-media/upload-to-r2.sh
#
# What it does (safe to run again; files already uploaded are skipped):
#   1. signs in to Cloudflare if needed (opens the browser once)
#   2. creates the R2 bucket "collier-media" if it isn't there yet
#   3. uploads every file in cloudflare-media/move-list.tsv, same path as in the repo
#      (if a file is missing or out of date on this Mac, it is fetched from the live site first)
#   4. sets CORS so collierentertainment.com, www, and localhost can use the files
#   5. optional: connects media.collierentertainment.com when ZONE_ID=... is given
#
# Nothing on the website changes. Nothing is deleted.

set -u
BUCKET="collier-media"
DOMAIN="media.collierentertainment.com"
LIVE="https://collierentertainment.com"
WR="${WRANGLER:-npx --yes wrangler@latest}"
HERE="cloudflare-media"
LIST="$HERE/move-list.tsv"
DONE="$HERE/.uploaded"          # local record of finished uploads (not committed)
TMP="$(mktemp -d)"
TAB="$(printf '\t')"
trap 'rm -rf "$TMP"' EXIT

say()  { printf '\n\033[1m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mSTOPPED: %s\033[0m\n' "$*"; exit 1; }

[ -f CNAME ] && grep -q collierentertainment.com CNAME && [ -f "$LIST" ] \
  || fail "Run this from inside the site folder (the one with CNAME and the cloudflare-media folder). Try: cd ~/collier-site/jason-collier-books && git pull"
command -v npx >/dev/null || fail "npx not found. Install Node.js from https://nodejs.org and try again."
command -v curl >/dev/null || fail "curl not found."
touch "$DONE"

say "1/5  Checking your Cloudflare sign-in"
if $WR whoami 2>&1 | grep -qiE "not authenticated|not logged in|wrangler login"; then
  $WR login || fail "Cloudflare sign-in did not finish."
fi

say "2/5  Making sure the bucket \"$BUCKET\" exists"
if $WR r2 bucket info "$BUCKET" >/dev/null 2>&1; then
  echo "Bucket already exists."
else
  $WR r2 bucket create "$BUCKET" || fail "Could not create the bucket. If it says R2 isn't enabled, open dash.cloudflare.com > R2 Object Storage once, accept the free plan, then run this again."
fi

ctype() {
  case "${1##*.}" in
    mp4) echo video/mp4 ;; m4a) echo audio/mp4 ;; mp3) echo audio/mpeg ;;
    webm) echo video/webm ;; wav) echo audio/wav ;; *) echo application/octet-stream ;;
  esac
}
fsize() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0; }
remote_size() {   # size on media.collierentertainment.com, if the domain is already connected
  curl -sfI --max-time 15 "https://$DOMAIN/$1" </dev/null 2>/dev/null | tr -d '\r' | awk 'tolower($1)=="content-length:"{print $2}' | tail -1
}

TOTAL=$(grep -c . "$LIST"); N=0; UP=0; SKIP=0; FETCHED=0; BAD=0; BADLIST=""
GB=$(awk -F"$TAB" '{t+=$1} END{printf "%.2f", t/1e9}' "$LIST")
say "3/5  Uploading $TOTAL files (about $GB GB). This can take a while on home internet."
while IFS="$TAB" read -r SIZE P; do
  [ -z "$P" ] && continue
  N=$((N+1))
  if grep -qxF "$SIZE$TAB$P" "$DONE"; then SKIP=$((SKIP+1)); printf '[%d/%d] already done  %s\n' "$N" "$TOTAL" "$P"; continue; fi
  if [ "$(remote_size "$P")" = "$SIZE" ]; then
    printf '%s\t%s\n' "$SIZE" "$P" >> "$DONE"; SKIP=$((SKIP+1)); printf '[%d/%d] already online %s\n' "$N" "$TOTAL" "$P"; continue
  fi
  SRC="$P"
  if [ "$(fsize "$P")" != "$SIZE" ]; then
    # this Mac's copy is missing or older than GitHub's: grab the live copy instead
    SRC="$TMP/file"
    if ! curl -sfL --retry 3 --max-time 900 -o "$SRC" "$LIVE/$P" </dev/null; then
      BAD=$((BAD+1)); BADLIST="$BADLIST\n  $P (not found locally or on the live site)"; printf '[%d/%d] MISSING       %s\n' "$N" "$TOTAL" "$P"; continue
    fi
    # the live site is the newest copy, even if it has changed since this list was made
    [ "$(fsize "$SRC")" != "$SIZE" ] && echo "        note: live copy is a newer version, using it"
    FETCHED=$((FETCHED+1))
  fi
  printf '[%d/%d] uploading     %s (%s MB)\n' "$N" "$TOTAL" "$P" "$(awk "BEGIN{printf \"%.1f\", $SIZE/1048576}")"
  OK=0
  for TRY in 1 2 3; do
    if $WR r2 object put "$BUCKET/$P" --file "$SRC" --content-type "$(ctype "$P")" \
         --cache-control "public, max-age=86400" --remote </dev/null >"$TMP/log" 2>&1; then OK=1; break; fi
    echo "        retry $TRY..."; sleep 3
  done
  if [ $OK = 1 ]; then printf '%s\t%s\n' "$SIZE" "$P" >> "$DONE"; UP=$((UP+1))
  else BAD=$((BAD+1)); BADLIST="$BADLIST\n  $P ($(tail -2 "$TMP/log" | tr '\n' ' '))"; echo "        FAILED"; fi
done < "$LIST"   # (commands inside the loop read from /dev/null so they cannot eat the list)

say "4/5  Setting CORS (collierentertainment.com, www, localhost)"
$WR r2 bucket cors set "$BUCKET" --file "$HERE/cors.json" --force || echo "CORS step failed. Run this script again (uploads will be skipped)."
$WR r2 bucket cors list "$BUCKET" || true

say "5/5  Custom domain $DOMAIN"
if [ -n "${ZONE_ID:-}" ]; then
  $WR r2 bucket domain add "$BUCKET" --domain "$DOMAIN" --zone-id "$ZONE_ID" --min-tls 1.2 --force \
    || echo "Domain step failed or already connected. Check: $WR r2 bucket domain list $BUCKET"
else
  echo "Not done by this script. In the Cloudflare dashboard: R2 Object Storage > collier-media > Settings >"
  echo "Custom Domains > Add > type $DOMAIN > Continue > Connect Domain."
fi

say "Finished"
echo "Uploaded now:        $UP"
echo "Already there:       $SKIP"
echo "Fetched from site:   $FETCHED"
echo "Problems:            $BAD"
DONE_N=$(sort -u "$DONE" | grep -c .)
echo "In the bucket:       $DONE_N of $TOTAL files"
if [ "$BAD" -gt 0 ]; then printf "These need another try (just run the script again):$BADLIST\n"; exit 2; fi
echo "All $TOTAL files are in R2. Tell Grok Bot \"R2 done\"."
