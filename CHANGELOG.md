# Changelog

## Unreleased

**Dashboard** (new tab)
- One page that fits the window on desktop, no scrolling: a strip of key numbers along the top (movies, shows, episodes, libraries, streaming now, plays, peak streams, downloading), a **library map** where each library's tile is sized by how many titles it holds, poster strips of the most played movies and shows, plays per day, the most active people with the busiest day, peak time and top genre, and the download queue (which scrolls on its own). Smaller windows and phones get the same sections stacked.
- Each library tile shows the artwork of a random title from that library: the poster for tall tiles, the backdrop for wide ones.
- **Radarr & Sonarr** at a glance: totals and size on disk, how much is on disk, missing (click to open it in Gaps), cutoff unmet, due or airing in the next 7 days, unreleased or ended, health warnings, and free space on your media disks. The download queue sits underneath. Read-only, through their documented API.
- **Library**: total movies, TV shows and episodes, and a count for each Plex or Jellyfin library, read live from the server.
- **Server activity, last 14 days**: who's streaming now, plays, movies and episodes watched, the 5 most played movies and shows, the 3 most active people, and the most streams at once. YAMZ can only count streams while it's open, so that figure covers what it has seen, with an all-time record.
- **Downloads**: everything in the Radarr and Sonarr queue, with progress, size, time left, which download client has it, and anything stuck (for example "Waiting to import" with the reason). Refreshes every 10 seconds while the page is open. This uses Radarr's and Sonarr's own queue, so YAMZ still never talks to download clients itself.
- Remove a download with the **×** on its row, or clear everything stuck (failed or waiting to import) with **Remove N stuck**. You confirm first, and can choose to also delete it from the download client and to blocklist the release. This goes through Radarr's and Sonarr's queue API, the same as their own Activity → Queue page.

**Fixes**
- Dark theme: a few colours (owned/upcoming labels, secondary text) were defined in terms of themselves and fell back to plain text colour. They now show as intended.

**One Movies / TV switch, in the top bar**
- The Movies / TV switch now sits in the top bar, to the right of the YAMZ logo, instead of in the side menus of Media, Gaps and Discover. One switch drives all three, so moving between tabs keeps you on movies or TV. It's hidden on tabs where it doesn't apply (Lists, Calendar, Activity).
- Media no longer has a side menu: its genres are the buttons above the posters, so the space goes to the posters. The "library refreshed" note now sits after the title count, for example "34 titles · Plex library refreshed 2 h ago".

## 1.2.0 — 22 October 2026

The big one: YAMZ now watches your server as well as your library. Live streams, play history, stats and recommendations, plus critic scores, written reviews and a tidier look.

### Activity (new tab)

**Now playing**
- A readout in the top bar shows who's streaming right now, for example "▶ 3 streaming · 42 Mbps out", or a dim "Idle". It refreshes every 15 seconds and turns amber when 2 or more streams are transcoding.
- Click it for every stream: poster, title (S02E04 for TV), who's watching, on which device, progress, Local or Remote, and the bitrate.
- Each stream is tagged **Direct play**, **Direct stream** or **Transcoding**, with the reason: "4K → 1080p", "HEVC → H.264", "subtitles burned in", "audio TrueHD → AAC", or "hardware" when the GPU is doing the work.
- Settings → Appearance → Now playing turns it off on a device.

**Activity page**
- A big card per stream, with the artwork behind it, when it will end, the device and app, and video, audio and subtitles showing what the file is and what's actually being sent ("4K HEVC → 1080p H.264 (hardware)").
- The side menu totals Direct play, Direct stream and Transcoding, and splits bandwidth into Local and Remote. The page refreshes every 10 seconds.

**Recently watched**
- Everything watched on your server, newest first, grouped by day, with who watched it. Filter by period (30 days to all time), movies or TV, and person.

**Stats**
- Tiles for plays, movies and episodes watched, people watching, the busiest day and the peak time.
- The 10 most-watched movies and shows, the most active people, top genres, and charts of the busiest days and times.
- **Genre gaps** compares each genre's and decade's share of plays with its share of your library: what's watched more than you stock (with a link to that genre's Essentials) and what you own plenty of but rarely watch.
- **Actor, director & franchise gaps** does the same for people and series: for example, a director who's 12% of your movie plays but 4% of your movies. Links go straight to their missing films in Gaps.

Only the server owner's sign-in can see everyone's streams and history. A shared user only sees their own.

### Discover

**For you** (new)
- Built from the last year of plays. Pick who it's for (Everyone or one person).
- **Your taste**: your top genres and decades, with recent plays counting more.
- **Up next**: the next episode of each show someone's watching, and the next film in a series they've started. If it isn't in your library, it can go straight to Radarr.
- **Because you watched…**: similar titles, split into **In your library, not watched yet** and **Not in your library** (one click to Radarr, Sonarr, your Watchlist or a list). Uses TMDB when you have a key, and your own library when you don't.
- A **Hide titles already in my library** switch leaves only suggestions to add. Each row has **‹ ›** scroll buttons.
- TMDB lists get a **Popular / For you** switch that puts titles matching your taste first.

### Gaps

- New **Directors** page: the directors behind 3 or more of your movies and the rest of their films. Run **↻ Re-analyse** once to fill it in.

### Pop-ups

- **Rotten Tomatoes** and **Metacritic** scores for most films and many shows, read from Wikidata. No extra key needed.
- Click a Rotten Tomatoes, Metacritic, IMDb or TMDB tile to open that title's page on the site.
- New **Reviews** section: written reviews from TMDB members (when TMDB is your details source), plus links to the critics' reviews on Rotten Tomatoes and Metacritic and the IMDb user reviews.

### Look and layout

- **Movies** and **TV** are now one **Media** tab with a Movies / TV switch.
- **Genre buttons**: on Media and Discover, genres sit as buttons centred above the posters (Media shows how many titles are in each). Scroll down and they break off into a floating dock under the top bar. This replaces the genre list in the side menu and Discover's Genre dropdown.
- **Compact search**: the search box is now a magnifier button that slides open when clicked or when you press **/**, and closes again when it's empty. **Esc** clears it.
- **Interface corners** (Settings → Appearance): square off the top bar, the side menu, pop-ups & cards, and pill buttons & switches, each on its own.
- **Lists tab** (Settings → Appearance) can be turned off. Your lists are kept.
- The poster grid is centred in the window.
- The Surprise me button is gone.
- The Settings button no longer gets pushed off the edge on mid-sized windows.

### Jellyfin

- Now playing, Activity, Recently watched, Stats and For you work with Jellyfin as well as Plex, using the admin API key YAMZ already connects with, including Jellyfin's own transcode reasons. Jellyfin only records the last time each title was played, so repeat viewings count once, and the side menu says so. These are still being tested on real Jellyfin servers. Please report anything odd.
- **Fixed:** connecting with an API key failed with "HTTP 401" on newer Jellyfin servers ([#1](https://github.com/zombifiedturkey/YAMZ/issues/1)). YAMZ now signs in only with the `Authorization: MediaBrowser …` header and never puts a key in a URL. A rejected key now says so straight away. Existing connections pick up the fix automatically. Thanks to @RoWe90 for the detailed report, the fix and the regression tests.

## 1.1.0 — 15 October 2026

**Docs**
- README and Unraid template now say that Jellyfin support should work but is still being tested. The Unraid description also uses the current page names (Gaps, Recent, Essentials).

**Library**
- The foot of the Movies and TV menus now shows, in small faded text, when Plex or Jellyfin last refreshed its library and when YAMZ last synced with it. Hover over a line to see the exact date and time. For Jellyfin this uses the "Scan media library" task. If your account can't see that task, YAMZ shows when something was last added instead.

**Calendar**
- Clicking a TV episode now opens the pop-up on that episode: season and episode number, title, air date, network and runtime, plus the episode's own description (from Sonarr or TVmaze). The show's description is still there under "About the show".
- When a service drops a whole season on one day, the calendar shows it once, on episode 1, marked "all N eps", rather than filling the day with every episode. Weekly shows still appear once a week.

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
