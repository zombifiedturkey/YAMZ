# Getting YAMZ into Unraid Community Applications

Community Applications (CA) lists templates from GitHub repositories that its moderators have approved.
The requirements change from time to time — check the current guidance pinned in the
**Community Applications** thread on forums.unraid.net before submitting. The usual steps are:

1. **Publish the image.** Push a `v1.0.0` tag so GitHub Actions publishes `ghcr.io/zombifiedturkey/yamz:latest`.
   Then on GitHub go to your profile → **Packages → yamz → Package settings** and set visibility to **Public**
   (new GHCR packages are private, and Unraid can't pull private images without a login).
2. **Check the template.** `unraid/yamz.xml` must point at the public image, the icon URL and the template URL
   (already set up for zombifiedturkey/YAMZ). Test it on your own server through *Docker → Template repositories*.
3. **Create a support thread** in the Unraid forums (*Docker Containers* section). Put its URL in the
   template's `<Support>` tag — CA expects a support link users can reach.
4. **Submit the template repository** (`https://github.com/zombifiedturkey/YAMZ`) using the submission method
   described in the CA thread. A moderator reviews it; once accepted, YAMZ appears in the Apps tab.
5. **Updates** happen automatically: CA re-reads `unraid/yamz.xml` from `main`, and users get new images
   whenever you push a new tag.
