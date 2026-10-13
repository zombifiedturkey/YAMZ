# syntax=docker/dockerfile:1
FROM node:22-alpine

ARG VERSION=dev
LABEL org.opencontainers.image.title="YAMZ" \
      org.opencontainers.image.description="Yet Another Media Zombie: browse your Plex/Jellyfin library, find what's missing, discover new releases, and send titles to Radarr/Sonarr." \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.version="${VERSION}"

# su-exec: drop to PUID/PGID; tzdata: honour TZ in logs
RUN apk add --no-cache su-exec tzdata

WORKDIR /app
COPY package.json ./
COPY server ./server
COPY public ./public
COPY YAMZ.html ./public/index.html
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p /config

ENV NODE_ENV=production \
    PORT=7979 \
    YAMZ_CONFIG=/config \
    PUID=99 \
    PGID=100 \
    TZ=Etc/UTC

EXPOSE 7979
VOLUME ["/config"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/healthz" >/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
