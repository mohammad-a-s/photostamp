# PhotoStamp user guide

[Open PhotoStamp](https://mohammad-a-s.github.io/photostamp/) · [README](../README.md)

## Make a stamped photo

1. Choose an original photo. JPEG, PNG and WebP are the safest options; HEIC decoding depends on the browser.
2. Check the capture time and optional time zone. Missing information stays blank.
3. Enter a place and short locality, or use Find place with the preconfigured service.
4. Review the returned name. A nearby business is not a verified venue. Correct or remove it as needed.
5. Review the preview, then use Share stamped photo or Save photo.

The clean default puts a caption below the complete photo. The place is emphasized; address and date/time use smaller text. GPS coordinates start off. Enable them when needed. Include in export lets you hide place, address or time independently. Top and bottom overlays and text size remain adjustable.

Dates show day, abbreviated English month, year and hours/minutes. An available numeric offset is shown with UTC; a custom zone label is used as entered. PhotoStamp does not infer a missing time zone or convert the camera's wall-clock time. Seconds remain in the editable field but are omitted from the stamp.

Field sources remain visible in the editor and are omitted from the export. The stamp is editable information, not proof of capture time or location. Shorten the address yourself when the lookup returns too much detail.

## Save and restore

Preview uses a maximum 1400 px edge. Export offers original decoded size, capped at 20 megapixels, or a 2048 px sharing size. Caption height is added beneath the photo. Saved JPEGs carry place, date and location details when that option is on (see below); keep the original file. Names end in _stamped.jpg.

Reset photo details restores fields read from the selected photo and clears entered/lookup place details. Remove photo discards the current session. Closing, reloading or updating also loses the session. Appearance preferences are remembered; photos and edited details are not.

## iPhone installation and missing GPS

Open the site in Safari, choose Share → Add to Home Screen, and open the installed app. Load online until App files saved for offline editing appears.

If a selected image has no GPS:

1. Check the original in Photos using its information view. If there is no recorded location, PhotoStamp cannot recover one.
2. Try an original file through Files/Browse rather than a messaging-app copy or screenshot. Export/share options and conversions can remove metadata.
3. If Photos offers a Location option when sharing, check that it is enabled when making your file copy.
4. Select that copy in PhotoStamp. If GPS is still unavailable, enter the place manually.

The browser can only read metadata present in the file it receives. PhotoStamp uses your current location only when you tap Use my current location. HEIC conversion may also affect metadata.

## Location lookup

On the official PhotoStamp site, Find place uses Geoapify through Netlify without setup. Under Settings & help → Advanced settings, you can enter an authorized Nominatim-compatible custom endpoint. Remember custom service is optional. Use PhotoStamp default removes the saved override. Forked copies need their own service.

Lookup sends coordinates to the chosen provider, never the photo. A two-second cooldown follows completion; a provider Retry-After delay may extend it. Tabs coordinate requests on the same device, but this does not enforce a limit across all app users. Consult the [provider policy](https://operations.osmfoundation.org/policies/nominatim/) before using public Nominatim. For shared production traffic, arrange aggregate limiting/caching or an appropriate hosted provider.

## Updates and offline use

Save your export before choosing Update app: it reloads and clears the editing session. If no update button appears, connect to the internet, reopen the app, and allow it to check for updates. A waiting update can also activate after all app windows close.

Offline editing works after the app files have been saved. Lookup needs a connection. If cached files have been evicted, load the app online again. Sharing depends on device/browser support; download is the alternative.

## Simple interface

Before selection, only Choose photo and help appear. After loading, edit the three main caption fields beside/below the preview. Expand Customize caption for styling and export quality, Photo details for time zone and sources, or More photo actions to reset/remove. Settings & help contains Check for updates. A prominent banner appears when a new version is ready; save before updating.

## Choose a location when GPS is missing

After loading a photo, select **Choose a location**. Enter a place name, street address or city (adding the country helps), then press **Search**. Choose the matching result to fill Place and Location details. Review and edit before saving. Existing caption text is replaced only after confirmation.

Search uses this deployment's Geoapify service and sends only the words you submit. It runs on Search, not while typing, and shares the two-second cooldown with GPS lookup. Photo GPS is never replaced. For a photo without GPS, the chosen place's map position is kept, labelled Chosen place in Photo details, and never stamped as a GPS line. It is saved into the exported file only if you turn on Save place, date and location in the photo file; it is then marked as set manually. Existing photo GPS, if present, remains separate and optional in the caption. Photo details labels selected text as manually selected. Reset photo details removes the selection; Remove photo clears the session. If offline or no result matches, type the place directly.

A city result may represent the city generally; check the displayed address. This chooser does not offer a draggable map pin.

## Use my current location

For a photo without GPS, **Use my current location** asks the browser for your location, then finds a place name. It is where you are now, not where the photo was taken. The browser asks for permission the first time; if you decline, choose a location or type it. The result is labelled in Photo details, never stamped as a GPS line, and saved into the file only if you turn that on.

## Place, date and location in the saved file

With Save place, date and location in the photo file on, the saved JPEG carries the place and details (image description), date and time, time zone offset and location, so photo and map apps can read them. Camera make, model and exposure details are kept for JPEG originals. Photo GPS is saved by default. A current or chosen location starts off and is marked as set manually when saved. Turn the option off for a file with no details.
