#!/bin/sh
# Runs YAMZ as PUID:PGID (Unraid default 99:100) and makes sure /config is writable.
set -e
PUID="${PUID:-99}"
PGID="${PGID:-100}"
CONFIG="${YAMZ_CONFIG:-/config}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$CONFIG"
  if ! chown -R "$PUID:$PGID" "$CONFIG" 2>/dev/null; then
    echo "Warning: couldn't change the owner of $CONFIG to $PUID:$PGID — YAMZ may not be able to save."
  fi
  [ -n "$UMASK" ] && umask "$UMASK"
  exec su-exec "$PUID:$PGID" node /app/server/server.js
fi

# Already running as a non-root user (e.g. docker run --user ...)
exec node /app/server/server.js
