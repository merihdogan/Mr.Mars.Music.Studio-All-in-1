#!/bin/bash
# Mr. Mars Music Studio All in 1 - MRH DGN - Mac icin kurulumsuz, tasinabilir baslatici.
# Tum ayarlar ve projeler bu klasordeki "veri" dizininde tutulur; klasoru USB'ye kopyalamaniz yeterli.
APP="$(cd "$(dirname "$0")" && pwd)"
PROFILE="$APP/veri/profil"
URL="file://$(printf '%s' "$APP/index.html" | sed -e 's/%/%25/g' -e 's/ /%20/g' -e 's/#/%23/g' -e 's/?/%3F/g')"
BR=""
for N in "Google Chrome" "Microsoft Edge" "Chromium" "Brave Browser"; do
  for D in "/Applications" "$HOME/Applications"; do
    if [ -z "$BR" ] && [ -x "$D/$N.app/Contents/MacOS/$N" ]; then BR="$D/$N.app/Contents/MacOS/$N"; fi
  done
done
if [ -z "$BR" ]; then
  echo "Google Chrome veya Microsoft Edge bulunamadi. Safari'de MIDI controller calismaz."
  open "$APP/index.html"
  exit 0
fi
mkdir -p "$PROFILE"
nohup "$BR" --app="$URL" --user-data-dir="$PROFILE" --no-first-run --no-default-browser-check --autoplay-policy=no-user-gesture-required --allow-file-access-from-files --disable-features=Translate >/dev/null 2>&1 &
