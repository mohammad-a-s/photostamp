# Changelog

## v2.4 — Location for photos without GPS, and photo-file details

- Choose a location: search a place, address or city and pick one of up to five results (search on submit only, shared cooldown).
- Use my current location for photos without GPS, labelled as the device's location now, not where the photo was taken.
- Netlify search function for Geoapify forward geocoding; results include coordinates.
- Saved and shared JPEGs carry place, date, offset and location in EXIF (piexifjs, bundled locally).
- Photo GPS is saved by default and never replaced. Current or chosen locations are off by default and marked as set manually (GPSProcessingMethod MANUAL).
- Original camera tags are kept for JPEG originals; orientation is reset because the image is already rotated.
- The stamped GPS line only ever shows coordinates from the photo itself.
- Place search and chooser regression tests in CI. Updated offline application cache.

## v2.2 — Clean caption

- Caption below the photo and GPS coordinates off are the clean defaults.
- Emphasized place heading with smaller supporting text.
- Human-readable dates without seconds; numeric offsets display with UTC.
- Source descriptions stay in the editor and are omitted from exported pixels.
- One-time migration applies caption/GPS defaults to existing installations.
- Updated offline application cache.

## v2.1 — Editing and export

- Independent place, address, date/time and GPS visibility.
- Restore original metadata and clear photo controls.
- Original-size export up to 20 MP and 2048 px sharing size; preview capped at 1400 px.
- Native sharing where supported and source-based output filenames.
- Saved appearance preferences and optional saved geocoding endpoint.
- Two-second lookup cooldown, cross-tab coordination and Retry-After handling.
- Update app control for waiting PWA releases.

## v2 — Initial PWA

- Static local photo editor with bundled EXIF reader.
- Editable place, capture time, time zone and optional GPS stamp.
- Manifest, icons, offline app shell and GitHub Pages workflow.
- Optional user-configured reverse geocoding.
