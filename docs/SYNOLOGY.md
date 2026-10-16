# YAMZ on Synology: Quick Setup

YAMZ runs on any Synology that can run Docker, and setup takes about 10 minutes in Container Manager.

## Before you start

- **DSM 7.2 or later with Container Manager.** Open Package Center and install Container Manager if it isn't there already. Older DSM versions call it "Docker" and don't have the Project screen this guide uses, so update DSM first.
- **Plex or Jellyfin** that the NAS can reach. It can run on the NAS itself or on another computer on the same network.
- **The NAS's IP address,** for example `192.168.1.50`. You can find it in Control Panel → Network → Network Interface.

YAMZ works on both Intel/AMD and ARM Synology models, so the model doesn't matter.

## Step 1: Make a folder for YAMZ

YAMZ keeps its account, settings and lists in one folder.

1. Open **File Station**.
2. Open the **docker** shared folder. Container Manager creates it when it's installed.
3. Create a new folder inside it called **yamz**.

The full path will be `/volume1/docker/yamz`.

## Step 2: Create the YAMZ project

1. Open **Container Manager** and go to **Project** → **Create**.
2. Fill in the first screen:
    - **Project name:** `yamz`
    - **Path:** pick the `docker/yamz` folder from Step 1.
    - **Source:** Create docker-compose.yml
3. Paste this into the box:

```yaml
services:
  yamz:
    image: ghcr.io/zombifiedturkey/yamz:latest
    container_name: yamz
    restart: unless-stopped
    ports:
      - "7979:7979"
    volumes:
      - ./config:/config
    environment:
      - PUID=1026
      - PGID=100
      - TZ=Australia/Brisbane
```

4. Change `TZ` to your own timezone if you're not in Queensland, for example `Australia/Sydney` or `Europe/London`.
5. Click **Next**. Skip the Web Station / web portal option, then click **Done**.

Container Manager downloads YAMZ and starts it. This takes a minute or two the first time. When the project shows as **Running**, it's ready.

`PUID=1026` and `PGID=100` match the first account created on most Synology NAS units. If yours is different, it's fine: YAMZ fixes the folder's permissions itself when it starts.

## Step 3: Open YAMZ and connect your library

1. In a browser on any computer or phone on your network, go to `http://<NAS IP>:7979`, for example `http://192.168.1.50:7979`.
2. Create your YAMZ account. This is a new username and password just for YAMZ, not your Synology login.
3. On **Connect your library**, choose one:
    - **Plex:** click **Sign in with Plex**. A Plex window opens so you can sign in on Plex's own site, then your servers are found automatically.
    - **Jellyfin:** enter the server address, such as `http://192.168.1.50:8096`, and sign in.
4. Wait for the first sync to finish. Big libraries can take a few minutes. Then click **Done**.

Optional extras in **Settings**: a free TMDB key for better Discover lists, a free OMDb key for IMDb ratings, and Radarr or Sonarr to send titles straight to them.

Tip: on a phone, use **Add to Home Screen** in the browser and YAMZ opens like an app.

## Updating YAMZ

In Container Manager, go to **Image**. When the YAMZ image shows **Update available**, click it and choose **Update**. The container restarts on the new version, and your account and settings are kept in `docker/yamz/config`.

## If something goes wrong

| Problem | Fix |
|---|---|
| The page won't open | Check the project shows **Running** in Container Manager. Use `http://`, not `https://`, and include `:7979`. |
| Port 7979 is already in use | Change the first number in the ports line, for example `"7980:7979"`, then open `http://<NAS IP>:7980`. |
| YAMZ can't reach Plex or Jellyfin | Use the NAS's or server's network IP address, never `localhost`, even when Plex or Jellyfin runs on the same NAS. |
| Settings don't save | Check the `docker/yamz` folder exists. Then stop and start the project so YAMZ can fix the folder's permissions. |

Jellyfin support is newer and still being tested. If something looks wrong, report it on [GitHub](https://github.com/zombifiedturkey/YAMZ/issues) with your Jellyfin version.

Want a look first? The [live demo](https://zombifiedturkey.github.io/YAMZ/) runs in the browser with sample data (sign in with `demo` / `zombies123`), and the [tour video](https://www.youtube.com/watch?v=bnb8neIcp1s) shows every page.
