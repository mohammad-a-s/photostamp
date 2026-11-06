# PhotoStamp v2

A mobile-friendly, installable photo editor for adding place, capture time, and GPS overlays. Static HTML, CSS, JavaScript, and Canvas; no backend or build step.

Expected production URL after deployment: https://mohammad-a-s.github.io/photostamp/

## Status and provenance

Reconstructed from the accessible “Photo Overlay Web App” conversation requirements. The previous v2 HTML/ZIP was not accessible; this is a new implementation, not a recovered copy. The repository initially contained only a README. This pull request prepares publication; it does not mean the production site is already live.

## Publish on GitHub Pages

1. Review and merge the PWA pull request into `main`.
2. Open repository **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. In **Actions**, open **Deploy PhotoStamp**, choose **Run workflow**, and select `main` if the merge run did not succeed because Pages was not enabled yet.
4. Wait for the `deploy` job to succeed. Open the URL shown in the `github-pages` environment.

The workflow validates the static files on pull requests and pushes, uploads only `site/`, and deploys only on `main` pushes or manual runs on `main`. PRs never deploy production. It uses the GitHub Pages actions documented at https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages . Repository Actions and Pages must be allowed by account/organization policy.

Alternative without Actions: publish from a branch with the contents of `site/` at its root. Do not select `main / (root)` with the current layout, because the app lives in `site/`.

## Install

- iPhone/iPad: open the production URL in Safari → Share → Add to Home Screen → Open as Web App if offered → Add.
- Android: open in Chrome → Install PhotoStamp or browser menu → Install app / Add to Home screen.
- Desktop: use the browser's install button when offered. Installation UI depends on browser support.

Load once online and wait for “App files saved for offline editing.” Then test in airplane mode. Browsers may evict cached data; reopening online restores it. Location lookup always requires a connection. New releases wait until all PhotoStamp windows close before activating.

## Use and privacy

Choose an original photo. Supported decoding depends on your browser; JPEG, PNG, and WebP are the safest choices. HEIC may need conversion to JPEG first. Local `exifr` reads GPS and original capture time. Missing metadata remains blank rather than being inferred from the device clock or current location. EXIF time is shown as the camera's wall-clock value; the original UTC offset is included if available. You may supply an explicit zone label.

Enter or correct the place and time, choose the stamp position and size, then download a JPEG. The exported stamp identifies manual values as user-provided and geocoded names as approximate. This is a documentation aid, not authentication or proof of location/time. Export uses browser-corrected image orientation and a maximum 20 megapixels to limit memory use; large images can still exceed mobile memory. Canvas export does not preserve original EXIF metadata. Visible coordinates remain visible in the exported pixels when enabled.

Photos stay in page memory and are never uploaded. The service worker caches only the enumerated application files, never photos or geocoding responses. Closing/reloading loses the current editing session. Hosting providers still receive ordinary page requests.

## Optional reverse geocoding

No public API is configured by default. Under **Location lookup settings**, supply an HTTPS Nominatim-compatible `/reverse` endpoint with browser CORS support that you are authorized to use, then click **Look up place from photo GPS**. The endpoint receives latitude/longitude and ordinary connection metadata, but never the photo. Results are cached in memory for the session, requests are user-triggered and throttled, and failures preserve manual editing. The endpoint can be switched at runtime. No API secrets belong in this client.

If you deliberately choose the public OSMF Nominatim service, you are responsible for its [usage policy](https://operations.osmfoundation.org/policies/nominatim/): the **total application traffic across all users must remain below one request per second**, with identifying Referer/User-Agent, attribution, caching, no autocomplete or bulk queries, and the ability to switch provider. Client throttling alone cannot enforce a shared limit. For a public launch, use an authorized hosted provider or a proxy enforcing aggregate limits and caching. Do not enable the public service casually. OpenStreetMap data is attributed in the app and licensed under ODbL.

## Local development and verification

From the repository root:

```sh
python3 -m http.server 8000 --directory site
# Open http://localhost:8000
node tests/static-check.cjs
node --check site/app.js
node --check site/service-worker.js
```

To test the GitHub Pages subpath, serve the parent folder with the `site` directory renamed/copied to `photostamp`, and open `/photostamp/`. All app paths, manifest scope, and service worker registration are relative.

Before release, test an original JPEG with GPS and DateTimeOriginal, a stripped image, a rotated portrait, a failed online lookup, a manual correction, JPEG download, and offline reload at `/photostamp/`. Verify install on the target iPhone/Android device; desktop emulation cannot establish platform-specific installation behavior.

## Files and updates

- `site/`: deployable static files, manifest, service worker, and PNG icons.
- `site/lib/exifr.min.js`: exifr **7.1.3**, full UMD distribution, downloaded unchanged from `https://cdn.jsdelivr.net/npm/exifr@7.1.3/dist/full.umd.js`; MIT license alongside it. No runtime CDN dependency.
- `tests/static-check.cjs`: validates manifest/icons, precache paths, and relative deployment paths.
- `.github/workflows/pages.yml`: PR validation and Pages deployment.

When editing cached files, bump `CACHE` in `site/service-worker.js` and update `ASSETS` if files change. The service worker uses a versioned app shell and removes only obsolete PhotoStamp caches within this registration's scope. For rollback, revert the source change and use a new cache version. Test offline after every cache change.

Application licensing has not been selected; the bundled exifr dependency retains its own MIT license.
