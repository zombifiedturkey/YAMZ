# Changelog

## Unreleased

**Appearance**
- New **Glass** theme (Settings → Appearance → Theme): a floating frosted header, glass side menu, pop-ups and menus, with your posters showing through.
- **Ambient colour**: in Glass, the background glows with the colours of the poster you're on. Can be turned off.
- **Glass strength**: Subtle, Balanced (default) or Frosted.
- Falls back to solid panels when the device asks for reduced transparency, and drops the animations for reduced motion.

**Movie pop-up**
- New series row under the cast: every film in the movie's series in release order, numbered, with the one you're viewing highlighted ("3rd of 5"). Each shows whether you own it, are missing it, or it's upcoming; click any of them to jump to it, or add missing ones to Radarr, your Watchlist or a list.

**Gaps** (renamed from Missing)
- **Movies / TV switch** at the top of the menu; TV is no longer a single item in the list.
- **Search & add** sits in its own recessed box above the rest of the menu, and follows the Movies / TV switch.
- **Waiting in Radarr**: monitored movies with no file yet, split into *Released, not in your library yet* and *Not released yet* (with the next release date).
- **TV**: *Incomplete shows*, *Missing seasons* (whole seasons absent), *Complete shows*, and **Waiting in Sonarr** (monitored series with aired episodes it doesn't have yet, with progress bars).
- New **Search & add** at the top of Gaps: search for any movie or TV show and add it to a list, your Plex Watchlist, or Radarr / Sonarr. Titles you already own are marked, and unreleased ones show their release date.
- Collections now show the films you're missing first, then upcoming ones, then the ones you own.

**Discover**
- *Last 12 Months* is now **Recent**, with a slider underneath to choose how far back to look: 1, 3, 6, 9 or 12 months. Cards show the release month.
- *The GOAT* is now **Essentials** — the must-see titles in a genre, all time or by decade (e.g. *Essential Horror Movies of the 1980s*).

**Release dates in the pop-up**
- Movies that aren't out everywhere yet show a *Not out yet* / *Release dates* panel with each release type — **Theatres**, **Streaming**, **Physical media** — its date and how far away it is (already-released ones are dimmed). A chip under the title shows the next one, e.g. *Theatres 20 Nov 2026*.
- Dates come from Radarr when the movie's there, otherwise TMDB (your region) when you have a key, otherwise Wikidata.
- TV shows with episodes still to air show the premiere, next episode and finale with dates and the network or streaming service (from TVmaze).

**Fixes**
- Plex Watchlist sync failing with "HTTP 400": Plex now limits how many titles can be requested at once. YAMZ asks in smaller pages and steps down automatically if Plex objects.

**Discover uses TMDB when you have a key**
- With a TMDB key in Settings, Discover's lists come from TMDB: **Popular** is TMDB's trending-this-week, **Upcoming** and **Recent** use TMDB release dates ranked by popularity, and **Essentials** ranks by TMDB audience rating (only titles with plenty of votes). Cards show the TMDB rating.
- **Gaps → Search & add** searches TMDB too (add a year, e.g. "alien 1979", to narrow it).
- Titles found on TMDB go to Radarr by their exact TMDB id.
- No key? Everything keeps working from Wikipedia/Wikidata as before. TV genres TMDB doesn't have (e.g. Horror) also fall back automatically.

**100 titles per list**
- Popular, Upcoming, Recent and Essentials now show up to 100 titles each (was 60 for Popular). YAMZ fetches a few extra behind the scenes so lists stay full when foreign-language titles are hidden, and rank numbers stay 1–100 with no gaps.

**Hide foreign-language titles**
- New Discover switch next to *Hide titles I already have*. Hides anything whose original language isn't English (from TMDB, or from Wikidata's original-language field without a key). Titles with no language recorded are kept. Remembered per device.

**Menus**
- The selected item in the side menus is now a soft, accent-tinted fill (a coloured-glass look in Glass) instead of a bar down the left edge.

**Dropdowns**
- Every dropdown (genre, decade, sort, Radarr/Sonarr options…) now opens a themed list that matches Dark, Light and Glass instead of the browser's plain white one. Keyboard works too (arrows, Enter, Esc, type a letter to jump). Phones and tablets keep their native picker.

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
