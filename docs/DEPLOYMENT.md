# Deployment and maintenance

[README](../README.md) · [User guide](USER_GUIDE.md)

## GitHub Pages

1. Put changes on a branch and open a pull request against main.
2. Check the Deploy PhotoStamp validation job and review the changes.
3. Merge the pull request.
4. In Settings → Pages, select GitHub Actions as the deployment source.
5. In Actions, wait for Deploy PhotoStamp → deploy to succeed. If Pages was enabled after a failed run, run the workflow manually on main.
6. Open https://mohammad-a-s.github.io/photostamp/ and verify the release.

The workflow validates pull requests but only deploys main pushes or manual runs on main. It uploads site/; selecting main's root as a branch-based Pages source will not publish this layout correctly.

## Application updates

For changes to cached application files, increment CACHE in site/service-worker.js. Add or remove ASSETS entries when the application shell changes. Keep paths relative for the /photostamp/ subpath. Documentation outside site/ is not precached and needs no cache bump.

Save any active editing session before applying Update app. Verify that an existing installation offers the update and that an offline reopen uses the new version. For rollback, revert the relevant code and use a new cache version rather than reusing an old cache name.

The clean-caption migration runs once per local browser storage: it selects caption position and disables GPS inclusion, preserving other saved appearance settings. Later user choices are remembered.

## Checks

From the repository root:

```sh
node tests/static-check.cjs
node --check site/app.js
node --check site/service-worker.js
python3 -m http.server 8000 --directory site
```

Open http://localhost:8000. Also test under /photostamp/ before deployment. Verify an original GPS JPEG, an image without metadata, rotated portrait, long/wrapped text, manual edits, optional coordinates, export sizes, failed lookup, cooldown, HTTP 429, offline reload and update activation. Confirm the clean export has no source descriptions and that source labels remain in the editor.

Use a real iPhone for file picker metadata, install, share-sheet and update checks. Desktop emulation alone does not verify these behaviors.

## Dependencies and privacy

exifr 7.1.3 is bundled locally in site/lib/ with its MIT license. No runtime CDN is required. Photos stay in page memory. The service worker caches only the enumerated app shell; external geocoding requests are not cached there.

No public geocoding endpoint is configured by default. Client cooldowns cannot enforce a provider's aggregate application limit. See the [user guide](USER_GUIDE.md#location-lookup) and provider policy when configuring a service. Do not put API secrets in this static client.
