# Geoapify on Netlify

PhotoStamp can stay on GitHub Pages. This function converts Geoapify results into the response format PhotoStamp already accepts.

## Setup

1. Merge this PR.
2. In Netlify, add a project by importing the mohammad-a-s/photostamp GitHub repository. Select main. The included netlify.toml sets site as the publish directory and netlify/functions as the functions directory. No build command is required.
3. Before deploying, open Project configuration → Environment variables. Add GEOAPIFY_API_KEY with your Geoapify key, available to Functions in production. Do not add it to GitHub, HTML or netlify.toml.
4. Add ALLOWED_ORIGINS with value https://mohammad-a-s.github.io. If you also use the Netlify-hosted app, append its exact origin separated by a comma, without a trailing slash or path.
5. Deploy or redeploy after setting variables.
6. Copy the resulting endpoint: https://YOUR-SITE.netlify.app/.netlify/functions/reverse
7. In PhotoStamp's Location lookup settings, paste that endpoint and optionally select Remember provider. No API key belongs in this textbox.
8. Choose a GPS photo and click Look up place from photo GPS. Review the approximate result.

The function rejects missing/invalid coordinates and unapproved browser origins, only calls the fixed Geoapify endpoint, hides provider error bodies and forwards rate-limit delays. Coordinates pass through Netlify to Geoapify; photos never leave the device. Responses use no-store to avoid caching precise coordinates in shared caches.

## Usage limits

The existing two-second webpage cooldown still applies. This initial adapter does not provide a distributed application-wide rate limiter, daily budget or persistent result cache. Origin checks reduce unintended browser use but are not authentication and can be forged outside a browser. Monitor usage in Geoapify and Netlify; do not advertise this endpoint as abuse-proof. Before wider promotion, add shared quota enforcement and caching or platform-level traffic controls. Provider limits and hosting quotas still apply.

The free Geoapify plan requires Geoapify and data-source attribution. The app includes a Powered by Geoapify link beside lookup and retains OpenStreetMap attribution.

## Verify

Use the GitHub Pages app (not direct address-bar navigation, which has no Origin header) to test a lookup, invalid provider/key errors, cooldown, export and offline editing. Check that no key appears in page source or browser requests. Real deployment testing requires your configured Netlify project and key.
