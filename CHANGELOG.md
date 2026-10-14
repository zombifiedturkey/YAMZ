# Changelog

## Unreleased

**Appearance**
- New **Glass** theme (Settings → Appearance → Theme): a floating frosted header, glass side menu, pop-ups and menus, with your posters showing through.
- **Ambient colour**: in Glass, the background glows with the colours of the poster you're on. Can be turned off.
- **Glass strength**: Subtle, Balanced (default) or Frosted.
- Falls back to solid panels when the device asks for reduced transparency, and drops the animations for reduced motion.

**Movie pop-up**
- New series row under the cast: every film in the movie's series in release order, numbered, with the one you're viewing highlighted ("3rd of 5"). Each shows whether you own it, are missing it, or it's upcoming; click any of them to jump to it, or add missing ones to Radarr, your Watchlist or a list.

**Missing**
- **Movies / TV switch** at the top of the menu; TV is no longer a single item in the list.
- **Search & add** sits in its own recessed box above the rest of the menu, and follows the Movies / TV switch.
- **Waiting in Radarr**: monitored movies with no file yet, split into *Released, not in your library yet* and *Not released yet* (with the next release date).
- **TV**: *Incomplete shows*, *Missing seasons* (whole seasons absent), *Complete shows*, and **Waiting in Sonarr** (monitored series with aired episodes it doesn't have yet, with progress bars).
- New **Search & add** at the top of Missing: search for any movie or TV show and add it to a list, your Plex Watchlist, or Radarr / Sonarr. Titles you already own are marked, and unreleased ones show their release date.
- Collections now show the films you're missing first, then upcoming ones, then the ones you own.

**Side menu**
- New **Auto-hide** option (Settings → Appearance → Side menu, or the arrow at the top of the menu). The menu tucks away and ☰ at the top left brings it back as a drawer that closes once you pick something.

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
