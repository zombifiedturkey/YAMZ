# YAMZ video tour

Films a guided tour of **your own** YAMZ server — real posters, real library — at exactly
**1920 × 1080 (16:9)**, whatever monitor you have (ultrawide included). It moves a cursor,
clicks through every tab and shows captions, the same style as the YAMZ promo videos.

## You need
- **Node.js** (LTS) from <https://nodejs.org>
- Your YAMZ address, username and password

## Run it
- **Windows:** double-click `run-windows.bat`
- **macOS / Linux:** `./run-mac-linux.sh`

The first run installs the recorder (a couple of minutes). Then it asks for your YAMZ address
(e.g. `http://192.168.1.10:7979`), username and password, and films the tour (about 6–7 minutes).
The video is saved as **`output/yamz-tour.webm`**.

Want to watch while it records? Run `run-windows.bat --watch` (or `./run-mac-linux.sh --watch`).

### Recording with OBS instead (sharper picture)
`run-windows.bat --obs` opens a 1920 × 1080 YAMZ window and waits. In OBS, add a **Window Capture**
of that window (canvas 1920 × 1080), start recording, then press **Enter** in the script window.
It tells you when to stop.

## Privacy & safety
- Sign-in happens off camera (the screen stays black until the tour starts).
- Connections, API keys, backup and account sections of Settings are hidden; server addresses
  and your Plex / YAMZ usernames are blanked out (`•••`) wherever they'd appear.
- It doesn't change anything on your server: nothing is added to lists, the Watchlist, Radarr
  or Sonarr (the Radarr dialog is only opened and closed), and any Discover / Gaps preferences
  it touches are put back afterwards. It films in the Glass theme in its own browser — your
  devices keep their own look.

## Options (environment variables)
| Variable | Default | |
|---|---|---|
| `YAMZ_URL`, `YAMZ_USER`, `YAMZ_PASSWORD` | asked | skip the questions |
| `YAMZ_SEARCH` | `Alien` | what's typed into Gaps → Search & add |
| `YAMZ_GENRE` | `Horror` | genre shown in Discover |
| `YAMZ_DECADE` | `1980s` | decade shown in Essentials |
