# Changelog

## 1.0.0 — first release

**Server / Docker (new)**
- Runs as a Docker container (`ghcr.io/zombifiedturkey/yamz`, amd64 + arm64) with an Unraid Community Applications template.
- Built-in sign-in: first-run account setup, scrypt-hashed passwords, 30-day sessions, rate-limited sign-in, change password, sign out.
- Settings, lists, connections and caches stored in `/config` and shared across every device; appearance stays per-device.
- Requests to Plex, Jellyfin, Radarr and Sonarr relayed by the server, so they work behind an https reverse proxy.
- Backup and restore (also moves your data from the standalone file to the server).
- Installable as a home-screen app (web manifest and icons).

**App**
- Library from Plex, Jellyfin or folders; posters, genres, multi-source ratings, cast, photos, Play in Plex/Jellyfin.
- TV seasons/episodes with missing-episode detection.
- Missing: incomplete collections, most-watched actors, incomplete TV shows.
- Discover: Popular, Upcoming, Last 12 Months, genre filter, The GOAT (all time or by decade).
- Lists, Plex Watchlist (sync, add/remove, shown in Lists).
- Calendar: month/agenda views; theatrical, digital and physical releases; TV premieres, episodes and finales.
- Radarr and Sonarr: look up and add titles with root folder, quality profile, tags and monitoring options.
- Appearance: theme, accent colour, poster size, poster corners.
