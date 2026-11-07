# PhotoStamp — Add a place and date to your photos

Turn your photos into memories with a simple caption showing where and when they were taken. Use PhotoStamp in your browser or add it to your home screen. Your photos stay on your device.

Open PhotoStamp: https://mohammad-a-s.github.io/photostamp/

Documentation: [User guide and troubleshooting](docs/USER_GUIDE.md) · [Deployment and updates](docs/DEPLOYMENT.md) · [Changelog](CHANGELOG.md)

## Status and provenance

Reconstructed from the accessible “Photo Overlay Web App” conversation requirements. The previous v2 HTML/ZIP was not accessible; this is a new implementation, not a recovered copy. The repository initially contained only a README. The PWA is published through GitHub Pages. The clean-caption revision is merged into main.

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

Load once online and wait for “App files saved for offline editing.” Then test in airplane mode. Browsers may evict cached data; reopening online restores it. Location lookup always requires a connection. Use Update app when offered, or close all PhotoStamp windows and reopen to activate a waiting release. Save your current export first.

## Use and privacy

Choose an original photo. Supported decoding depends on your browser; JPEG, PNG, and WebP are the safest choices. HEIC may need conversion to JPEG first. Local `exifr` reads GPS and original capture time. Missing metadata remains blank rather than being inferred from the device clock or current location. EXIF time is shown as the camera's wall-clock value; the original UTC offset is included if available. You may supply an explicit zone label.

Enter or correct the place and time, choose the stamp position and size, then download a JPEG. The editor shows source labels for manual values, EXIF values, and approximate GPS lookup results. Source descriptions are omitted from the exported stamp. This is a documentation aid, not authentication or proof of location/time. Export uses browser-corrected image orientation and a maximum 20 megapixels to limit memory use; large images can still exceed mobile memory. Canvas export does not preserve original EXIF metadata. Visible coordinates remain visible in the exported pixels when enabled.

Photos stay in page memory and are never uploaded. The service worker caches only the enumerated application files, never photos or geocoding responses. Closing/reloading loses the current editing session. Hosting providers still receive ordinary page requests.

## Optional reverse geocoding

The official GitHub Pages site uses the configured Geoapify service through Netlify. Select **Find place** after choosing a GPS photo; no endpoint entry is needed. Custom services are available under **Settings & help → Advanced settings**. Forks must configure their own service; they do not automatically share the official endpoint. The endpoint receives latitude/longitude and ordinary connection metadata, but never the photo. Results are cached in memory for the session, requests are user-triggered and throttled, and failures preserve manual editing. The endpoint can be switched at runtime. No API secrets belong in this client.

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

## License

Copyright (c) 2026 mohammad-a-s. PhotoStamp is licensed under the [MIT License](LICENSE).

The bundled exifr dependency retains its [own MIT license](site/lib/exifr.LICENSE). OpenStreetMap data retains its separate attribution and ODbL terms.

## v2.1 editing and export improvements

Choose a photo, edit its stamp, then save or share. Caption below photo is the default and preserves the full image; top and bottom overlays remain available. Place, address, capture time and GPS can be hidden independently. Source labels in the editor track each field, and Restore original metadata resets manual edits. Clear photo discards the current photo and fields.

Preview uses a maximum 1400 px edge; export uses the selected original (photo capped at 20 MP) or 2048 px sharing size. A caption adds height to the exported image. JPEG names retain the original basename with `_stamped`. Native sharing is offered when supported and falls back to Download instructions if unavailable.

Appearance preferences are stored locally. Provider persistence is opt-in and can be cleared by unchecking Remember provider. Photos, edited place names, GPS lookup results and capture details remain session-only. A cooldown timestamp is also stored to coordinate tabs. Browsers with Web Locks serialize lookups across tabs; others use best-effort timestamp coordination. Requests are disabled during lookup and for two seconds after completion, with longer Retry-After delays honored. This is per device and does not enforce Nominatim's aggregate application traffic limit.

Update app is shown when a new service worker is waiting. Updating reloads the page and clears the current editing session, with a save-first confirmation when a photo is loaded.

Validation for this revision used Chrome with synthetic JPEG fixtures and mocked provider responses: EXIF/field provenance, caption dimensions, source filenames, restore/clear, preferences/provider persistence, cooldown across tabs, HTTP 429 Retry-After, 1400 px previews and 2048 px export, mobile width, and offline editing. Native share handoff was tested with a browser stub; the actual iPhone/Android share sheet and installation still require device verification.

## v2.2 clean caption default

The default caption sits below the photo, with a stronger place heading and smaller, softer supporting text. Place, address and capture time are included when present; GPS coordinates are off by default and can be enabled. Dates display as `6 Nov 2026 · 11:39 · UTC+08:00` when the offset exists. Seconds and field source descriptions are omitted from exports. The full address is still editable: shorten it manually for a compact locality line. There is no separate preset selector.

Existing installations receive caption position and GPS-off defaults once on first loading this revision; subsequent appearance choices are remembered. Source labels remain in the editor. A lookup may return a nearby business rather than the photographed venue: review the place before export. See the [user guide](docs/USER_GUIDE.md).

## v2.3 simpler editing

Choose a photo, check Place / Location details / Date and time, then Save photo or Share. The editor and preview appear after a photo loads. Customize caption holds styling, visibility and quality; Photo details holds time zone, coordinates and sources. Settings & help contains installation, update checking and custom service configuration. Use PhotoStamp default clears a saved custom service. Existing saved custom services remain selected until reset.

The official site's default Geoapify service is only contacted on Find place. The API key remains server-side. Netlify-hosted copies use their own same-origin function and must configure its key and allowed origins. Local/other hosts require a custom endpoint. The current function does not enforce a distributed daily quota; monitor service usage before wider promotion.
