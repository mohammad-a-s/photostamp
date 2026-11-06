# PhotoStamp user guide

[Open PhotoStamp](https://mohammad-a-s.github.io/photostamp/) · [README](../README.md)

## Make a stamped photo

1. Choose an original photo. JPEG, PNG and WebP are the safest options; HEIC decoding depends on the browser.
2. Check the capture time and optional time zone. Missing information stays blank.
3. Enter a place and short locality, or configure a provider under Location lookup settings and use Look up place from photo GPS.
4. Review the returned name. A nearby business is not a verified venue. Correct or remove it as needed.
5. Review the preview, then use Share stamped photo or Download stamped JPEG.

The clean default puts a caption below the complete photo. The place is emphasized; address and date/time use smaller text. GPS coordinates start off. Enable them when needed. Include in export lets you hide place, address or time independently. Top and bottom overlays and text size remain adjustable.

Dates show day, abbreviated English month, year and hours/minutes. An available numeric offset is shown with UTC; a custom zone label is used as entered. PhotoStamp does not infer a missing time zone or convert the camera's wall-clock time. Seconds remain in the editable field but are omitted from the stamp.

Field sources remain visible in the editor and are omitted from the export. The stamp is editable information, not proof of capture time or location. Shorten the address yourself when the lookup returns too much detail.

## Save and restore

Preview uses a maximum 1400 px edge. Export offers original decoded size, capped at 20 megapixels, or a 2048 px sharing size. Caption height is added beneath the photo. JPEG export does not preserve original EXIF; keep the original file. Names end in _stamped.jpg.

Restore original metadata restores fields read from the selected photo and clears entered/lookup place details. Clear photo discards the current session. Closing, reloading or updating also loses the session. Appearance preferences are remembered; photos and edited details are not.

## iPhone installation and missing GPS

Open the site in Safari, choose Share → Add to Home Screen, and open the installed app. Load online until App files saved for offline editing appears.

If a selected image has no GPS:

1. Check the original in Photos using its information view. If there is no recorded location, PhotoStamp cannot recover one.
2. Try an original file through Files/Browse rather than a messaging-app copy or screenshot. Export/share options and conversions can remove metadata.
3. If Photos offers a Location option when sharing, check that it is enabled when making your file copy.
4. Select that copy in PhotoStamp. If GPS is still unavailable, enter the place manually.

The browser can only read metadata present in the file it receives. PhotoStamp does not use your current phone location as the photo's location. HEIC conversion may also affect metadata.

## Location lookup

The endpoint starts blank; the settings show https://nominatim.openstreetmap.org/reverse as an example. Enter an authorized Nominatim-compatible HTTPS endpoint with browser CORS support. Remember provider is optional; uncheck it to remove the saved endpoint.

Lookup sends coordinates to the chosen provider, never the photo. A two-second cooldown follows completion; a provider Retry-After delay may extend it. Tabs coordinate requests on the same device, but this does not enforce a limit across all app users. Consult the [provider policy](https://operations.osmfoundation.org/policies/nominatim/) before using public Nominatim. For shared production traffic, arrange aggregate limiting/caching or an appropriate hosted provider.

## Updates and offline use

Save your export before choosing Update app: it reloads and clears the editing session. If no update button appears, connect to the internet, reopen the app, and allow it to check for updates. A waiting update can also activate after all app windows close.

Offline editing works after the app files have been saved. Lookup needs a connection. If cached files have been evicted, load the app online again. Sharing depends on device/browser support; download is the alternative.
