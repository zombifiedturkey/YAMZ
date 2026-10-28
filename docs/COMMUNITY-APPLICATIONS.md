# Getting YAMZ into Unraid Community Applications

**Status: approved on 16 October 2026.** YAMZ appears in the Apps tab from the next Community Apps update.

Submissions now go through the Community Apps website: https://ca.unraid.net/submit
(help pages: https://ca.unraid.net/submit/help). Check those pages before submitting, as the rules change from time to time.

## What the repository needs (all done)

- [x] Public GitHub repository: `https://github.com/zombifiedturkey/YAMZ`
- [x] OSI-approved licence at the root: `LICENSE` (MIT)
- [x] `ca_profile.xml` at the root, with a non-empty `<Profile>`
- [x] A Docker template: `unraid/yamz.xml`, pointing at `ghcr.io/zombifiedturkey/yamz:latest`, with icon, support and template URLs
- [x] A published image: `:latest` is built from each `v*` release (currently 1.3.0)

## Steps

1. **Check the image is public.** On GitHub go to your profile → **Packages → yamz → Package settings** and make sure visibility is **Public**. Unraid can't pull private images.
2. **Test the template on your own server.** Copy `unraid/yamz.xml` to `/boot/config/plugins/dockerMan/templates-user/my-YAMZ.xml`, then pick it under *Docker → Add Container* and check it installs and opens.
3. **Optional: create a support thread** in the Unraid forums (*Docker Containers* section). If you do, put its URL in `<Support>` in `unraid/yamz.xml` and `<Forum>` in `ca_profile.xml`. Until then both point to GitHub Issues.
4. **Submit.** Sign in at https://ca.unraid.net/submit/new, add the repository URL, then run **Validate** and **Scan** and fix anything they flag. Track it under *My submissions*.
5. **Wait for review.** Once accepted, YAMZ appears in the Apps tab.

## After it's listed

CA re-reads `unraid/yamz.xml` from `main`, so template changes go live automatically. Users get new versions whenever a new `v*` release is published. Run Validate and Scan again after any meaningful change to the XML.

Help with submissions: https://product.unraid.net/b/community-apps-submission-support
