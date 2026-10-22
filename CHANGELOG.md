# Changelog

## Unreleased

**Interface corners**
- New Settings → Appearance → **Interface corners** squares off parts of YAMZ on their own: the **top bar**, the **side menu**, **pop-ups & cards**, and **pill buttons & switches**. Pick any mix.
- Posters keep their own Poster corners setting, and small dots and profile icons stay round.
- Saved per device and applied before the page draws, so there's no flash of rounded corners.

**Critic scores and reviews**
- Pop-ups now show the **Rotten Tomatoes** Tomatometer and **Metascore** for most films and many shows, read from Wikidata. No extra key is needed (OMDb is still used first when you've added one).
- Click the Rotten Tomatoes, Metacritic, IMDb or TMDB tile to open that title's page on the site.
- New **Reviews** section above Photos. It shows written reviews from TMDB members (name, score, date, with Read more for long ones) when TMDB is your details source, plus links to the critics' reviews on Rotten Tomatoes and Metacritic and the IMDb user reviews.

**Now playing**
- New readout in the top bar shows who's streaming from your Plex server right now, for example "▶ 3 streaming · 42 Mbps out". It shows a dim "Idle" when nobody's watching and refreshes every 15 seconds while YAMZ is open.
- Click it to see every stream: poster, title (S02E04 for TV), who's watching, on which device, a progress bar, Local or Remote, and the bitrate.
- Each stream is tagged **Direct play**, **Direct stream** or **Transcoding**, with the reason: "4K → 1080p", "HEVC → H.264", "subtitles burned in", "audio TrueHD → AAC", or "hardware" when the GPU is doing the work.
- The readout turns amber when 2 or more streams are transcoding at once.
- Click a stream to open that title's pop-up.
- Settings → Appearance → Now playing turns it off on a device.
- Only the Plex server owner's sign-in can see everyone's streams. A shared user only sees their own.
- Jellyfin support for Now playing is coming next.

**Activity page**
- New **Activity** tab, shown when a Plex server is connected. It gives a big card per stream, with the artwork behind it and who's watching. Each card shows:
  - progress, and when the stream will end ("Ends 2:55 PM"), or how much is left if it's paused
  - the device and Plex app
  - video, audio and subtitles, each showing what the file is and what's actually being sent ("4K HEVC → 1080p H.264 (hardware)", "TrueHD 7.1 → AAC stereo", "English (PGS) (burned in)")
  - the container, the bitrate and the transcode speed
- The side menu totals Direct play, Direct stream and Transcoding, and splits bandwidth into Local and Remote.
- The page refreshes every 10 seconds while it's open. Click a card to open that title.
- The Now playing dropdown has a link to the page.

**Recently watched**
- New **Activity → Recently watched**: everything watched on your Plex server, newest first, grouped by day ("Today", "Yesterday", "Tue, Oct 20"). Each entry shows the poster, the title (S01E03 for TV), who watched it and when. Click one to open the title.
- Filters in the side menu: **Period** (30 days, 90 days, 1 year, all time), **Show** (all, movies or TV) and **Who** (everyone or one person). They're shared with Stats.

**Stats**
- New **Activity → Stats** for the chosen period and person:
  - tiles for plays, movies watched, episodes watched, people watching, the busiest day and the peak time
  - the 10 most-watched movies and shows
  - the most active people
  - top genres
  - charts of the busiest days of the week and times of day (hover a bar for the exact figure)
- It all comes from your Plex server's own play history, which needs the server owner's sign-in. History is fetched in pages and cached for 5 minutes. **↻ Refresh** fetches it again.

**For you** (Discover)
- New **Discover → For you**, built from the last year of plays on your Plex server. Pick who it's for (Everyone or one person) in the side menu. It shows:
  - **Your taste**: your top genres and decades as a share of plays, with recent plays counting more.
  - **Up next**: the next episode of each show someone is watching (from the episodes you own), and the next film in a series someone has started. Series come from Gaps → Collections. If the next film isn't in your library, it can go straight to Radarr.
  - **Because you watched…**: for the last few titles watched, similar titles split into **In your library, not watched yet** and **Not in your library** (one click to Radarr, Sonarr, your Watchlist or a list). These use TMDB when you have a key. Without one, YAMZ suggests unwatched titles from your own library with matching genres and era.
- Discover lists from TMDB get a **Popular / For you** switch. For you puts titles matching your server's taste first, while still weighing popularity.

**Genre gaps** (Activity → Stats)
- Compares each genre's share of plays with its share of your library, and does the same for decades of films. Each one shows a bar for plays and a marker for your library.
- **Watched more than you stock** lists genres and decades people watch more than you collect, with a link to that genre's **Essentials** to fill the gap.
- **Plenty here, rarely watched** lists genres you own lots of but rarely watch.

**Jellyfin in Activity**
- **Now playing**, the **Activity** page, **Recently watched**, **Stats** and **For you** now work with Jellyfin as well as Plex, using the admin API key YAMZ already connects with.
- Live streams show the same details as Plex: direct play / direct stream / transcoding, Jellyfin's own transcode reasons (for example "subtitles burned in" or "video codec not supported"), hardware acceleration, video, audio and subtitle conversions, bitrate, and whether the viewer is local or remote.
- Jellyfin doesn't keep a log of every play, only the last time each title was played. Repeat viewings therefore count once in Recently watched and Stats, and the side menu says so.

**For you**
- Each row now has **‹ ›** scroll buttons, which only appear when there's more to see. The rows also scroll with a trackpad or touch.
- **Up next** only suggests real film series. Wikidata lists like "BBC's 100 Greatest Films of the 21st Century" and unnamed series are left out.

**Media tab**
- **Movies** and **TV** are now one **Media** tab, with a Movies / TV switch at the top of its side menu, the same as Gaps and Discover. It remembers which one you last used.

**Lists tab is optional**
- **Settings → Appearance → Lists tab** turns the Lists tab on or off. Hiding it also hides the bookmark (add to list) buttons on posters and in pop-ups. Your lists are kept and come back when you turn it on again.

**For you**
- New **Hide titles already in my library** switch. It hides the "In your library, not watched yet" rows and owned titles in Up next, leaving only suggestions to add.

**Header**
- The Settings button no longer gets pushed off the edge on mid-sized windows.

**Removed**
- The Surprise me button.

**Library**
- The poster grid is now centred in the window, so wide windows no longer leave a gap down the right-hand side.

**Fixes**
- Jellyfin: connecting with an API key failed with "HTTP 401" on newer Jellyfin servers, which turn off the old way of passing the key in the web address ([#1](https://github.com/zombifiedturkey/YAMZ/issues/1)). YAMZ now signs in to Jellyfin only with the `Authorization: MediaBrowser …` header, for API keys and for username/password, and never puts a key in a URL. A key Jellyfin rejects now shows "API key was rejected" straight away, instead of failing later during library sync. Existing Jellyfin connections pick up the fix automatically. Thanks to @RoWe90 for the detailed report, the fix and the regression tests.

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
