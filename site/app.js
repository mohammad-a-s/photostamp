'use strict';
const $ = id => document.getElementById(id);
let originalFields = {}, fieldSources = {}, waitingWorker;
let originalName = 'photo', busy = false, cooldown = 0;
let image = null, coordinates = null, sequence = 0, placeSource = '', dateSource = '', lookupAt = 0, pendingInstall;
// coordinateSource: 'photo' (EXIF GPS), 'device' (current location now) or 'search' (chosen place). Only photo GPS is stamped as GPS.
let photoCoordinates = null, coordinateSource = '', originalFile = null, locating = false, exporting = false, editVersion = 0, preparedShare = null;
const DEVICE_LABEL = 'current device location (approximate, not from photo)';
const geocodeCache = new Map();
// Forks must configure their own service rather than share the official quota.
const DEFAULT_ENDPOINT = location.hostname === 'mohammad-a-s.github.io'
  ? 'https://imaginative-bavarois-fc2df5.netlify.app/.netlify/functions/reverse'
  : location.hostname.endsWith('.netlify.app') ? new URL('/.netlify/functions/reverse', location.origin).href : '';
$('endpoint').value = DEFAULT_ENDPOINT;
function updateProvider() {
 const official = $('endpoint').value === DEFAULT_ENDPOINT && !!DEFAULT_ENDPOINT;
 $('providerCredit').hidden = !official;
 $('providerStatus').textContent = official ? 'Using the configured PhotoStamp service.' : $('endpoint').value ? 'Using a custom service.' : 'No service configured. You can still enter a place manually.';
}
function syncWorkspace() {
 window.dispatchEvent(new Event('photostamp:photochange'));
 $('workspace').hidden = !image;
 $('chooseLabel').textContent = image ? 'Choose another photo' : 'Choose photo';
 const fromPhoto = coordinateSource === 'photo';
 $('lookup').hidden = !!image && !fromPhoto;
 $('useLocation').hidden = $('useLocationHint').hidden = !image || fromPhoto;
 $('lookupHint').textContent = fromPhoto ? 'Location found in photo. Find place to add a name.'
  : coordinateSource === 'device' ? 'Using your current location. It is not where the photo was taken unless you are still there.'
  : coordinateSource === 'search' ? 'Using a chosen place. Check that it is right.'
  : 'This photo has no location information. Use your current location, choose a location, or type one below.';
 $('gpsHelp').hidden = fromPhoto;
 const label = fromPhoto ? 'Photo GPS' : coordinateSource === 'device' ? `Your device now${coordinates?.accuracy ? ` (±${Math.round(coordinates.accuracy)} m)` : ''}` : 'Chosen place';
 $('coordinateDetails').textContent = coordinates ? `${label}: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : 'No GPS coordinates in this file.';
 syncExifHint();
}
function syncExifHint() {
 $('exifHint').textContent = !$('writeExif').checked ? 'The saved photo will contain no place, date or location details.'
  : !coordinates ? 'Place and date are saved in the file if entered. No location is saved.'
  : coordinateSource === 'photo' ? 'The photo’s original location is saved in the file. Photo and map apps can read it.'
  : 'This location is saved as if recorded with the photo, marked as set manually. Photo and map apps can read it.';
}
// Photo GPS turns file saving on by default. Device or chosen locations start off, so the user decides.
// Does not call syncWorkspace: that broadcasts photostamp:photochange, which would close the chooser mid-selection.
function setCoordinateSource(source, point) {
 coordinates = point || null; coordinateSource = point ? source : '';
 $('writeExif').checked = !point || source === 'photo';
 editVersion++;
 const fromPhoto = coordinateSource === 'photo';
 $('lookup').hidden = !!image && !fromPhoto;
 $('useLocation').hidden = $('useLocationHint').hidden = !image || fromPhoto;
 const label = fromPhoto ? 'Photo GPS' : coordinateSource === 'device' ? `Your device now${coordinates?.accuracy ? ` (±${Math.round(coordinates.accuracy)} m)` : ''}` : 'Chosen place';
 $('coordinateDetails').textContent = coordinates ? `${label}: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : 'No GPS coordinates in this file.';
 $('lookupHint').textContent = fromPhoto ? 'Location found in photo. Find place to add a name.' : coordinateSource === 'device' ? 'Using your current location. It is not where the photo was taken unless you are still there.' : coordinateSource === 'search' ? 'Using a chosen place. Check that it is right.' : 'This photo has no location information. Use your current location, choose a location, or type one below.';
 syncExifHint(); draw();
}

function sourceLabels() {
  $('locationSource').textContent = `Place: ${fieldSources.place || 'not provided'} · Address: ${fieldSources.address || 'not provided'}`;
  $('timeSource').textContent = `Capture time: ${fieldSources.captured || 'not provided'} · Zone: ${fieldSources.zone || 'not provided'}`;
}
function wrap(ctx, text, width) {
  const lines = []; let line = '';
  for (const word of text.split(/\s+/)) {
    if (line && ctx.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
    for (const character of (line ? ' ' : '') + word) {
      if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ''; }
      line += character;
    }
  }
  if (line) lines.push(line);
  return lines;
}
function draw(exporting = false) {
  if (!image) return;
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const scale = Math.min(1, (exporting ? Number($('resolution').value) : 1400) / Math.max(image.naturalWidth, image.naturalHeight), Math.sqrt(20000000 / (image.naturalWidth * image.naturalHeight)));
  canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  let font = Math.max(10, Math.min(canvas.width, canvas.height) * Number($('size').value) / 100);
  let padding = font, lineHeight = font * 1.45;
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  const rows = [];
  const stampTime = $('captured').value;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})/.exec(stampTime);
  const prettyTime = match ? `${Number(match[3])} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(match[2])-1]} ${match[1]} · ${match[4]}` : stampTime;
  const zone = $('zone').value.trim().replace(/^([+-]\d{2}:\d{2})$/, 'UTC$1');
  for (const value of [$('showPlace').checked ? $('place').value.trim() : '', $('showAddress').checked ? $('address').value.trim() : '', $('showTime').checked && prettyTime ? prettyTime + (zone ? ` · ${zone}` : '') : '', coordinateSource === 'photo' && $('gps').checked ? `GPS: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : '']) {
    if (value) rows.push(...wrap(ctx, value, canvas.width - 2 * padding));
  }
  if (!rows.length) return;
  if ($('position').value !== 'caption' && rows.length * lineHeight + padding * 2 > canvas.height * .65) { const shrink = canvas.height * .65 / (rows.length * lineHeight + padding * 2); font *= shrink; padding *= shrink; lineHeight *= shrink; ctx.font = `600 ${font}px system-ui, sans-serif`; }
  const height = rows.length * lineHeight + padding * 2;
  let y = $('position').value === 'top' ? 0 : canvas.height - height;
  if ($('position').value === 'caption') { const photo = document.createElement('canvas'); photo.width = canvas.width; photo.height = canvas.height; photo.getContext('2d').drawImage(canvas,0,0); y = canvas.height; canvas.height += Math.ceil(height); ctx.drawImage(photo,0,0); ctx.font = `600 ${font}px system-ui, sans-serif`; }
  ctx.fillStyle = 'rgba(10,20,32,.76)'; ctx.fillRect(0, y, canvas.width, height);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  rows.forEach((row, i) => {
    const heading = i === 0 && $('showPlace').checked && $('place').value.trim();
    ctx.font = `${heading ? 600 : 400} ${heading ? font : font * .88}px system-ui, sans-serif`;
    ctx.fillStyle = heading ? '#fff' : '#cbd5e1';
    ctx.fillText(row, padding, y + padding + i * lineHeight);
  });
}
$('photo').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  originalName = file.name.replace(/\.[^.]+$/, '') || 'photo';
  const ticket = ++sequence;
  originalFile = file; photoCoordinates = null; coordinateSource = ''; preparedShare = null; editVersion++;
  image = null; coordinates = null; placeSource = ''; dateSource = ''; fieldSources = {}; syncWorkspace();
  for (const id of ['place', 'address', 'captured', 'zone']) $(id).value = '';
  $('download').disabled = true; $('lookup').disabled = true; $('canvas').hidden = true; $('empty').hidden = false;
  $('status').textContent = 'Reading photo on your device…'; sourceLabels();
  const url = URL.createObjectURL(file);
  try {
    const next = new Image(); next.src = url; await next.decode();
    let metadata = {}, metadataError = false;
    try { metadata = await exifr.parse(file, {reviveValues: false}) || {}; } catch { metadataError = true; }
    if (ticket !== sequence) return;
    image = next;
    if (Number.isFinite(metadata.latitude) && Number.isFinite(metadata.longitude) && Math.abs(metadata.latitude) <= 90 && Math.abs(metadata.longitude) <= 180) photoCoordinates = {latitude: metadata.latitude, longitude: metadata.longitude};
    coordinates = photoCoordinates; coordinateSource = photoCoordinates ? 'photo' : ''; $('writeExif').checked = true;
    // Preserve the camera's wall-clock time, without converting it to this device's time zone.
    const rawDate = metadata.DateTimeOriginal;
    if (typeof rawDate === 'string' && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(rawDate)) {
      $('captured').value = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
      if ($('captured').value) dateSource = 'photo EXIF';
    }
    $('zone').value = typeof metadata.OffsetTimeOriginal === 'string' ? metadata.OffsetTimeOriginal : '';
    $('status').textContent = `${coordinates ? 'Photo GPS found.' : 'No location in this photo. Use your current location, choose a location, or type one.'} ${dateSource ? 'Capture time found.' : 'Capture time missing; enter it manually if known.'}${metadataError ? ' Metadata could not be read.' : ''}`;
    originalFields = Object.fromEntries(['place','address','captured','zone'].map(id => [id, $(id).value]));
    fieldSources = {captured: dateSource, zone: $('zone').value ? 'photo EXIF' : ''};
    $('lookup').disabled = !coordinates || busy || Date.now() < sharedDeadline(); $('download').disabled = false;
    $('empty').hidden = true; $('canvas').hidden = false; syncWorkspace(); sourceLabels(); draw();
  } catch { if (ticket === sequence) $('status').textContent = 'This photo could not be opened. Try an original JPEG, PNG, or WebP file.'; }
  finally { URL.revokeObjectURL(url); }
});
for (const id of ['place', 'address', 'captured', 'zone', 'position', 'size', 'gps', 'resolution', 'showPlace', 'showAddress', 'showTime']) $(id).addEventListener('input', () => {
  if (id === 'place' || id === 'address') placeSource = 'user-provided';
  if (['place','address','captured','zone'].includes(id)) fieldSources[id] = 'user-provided';
  editVersion++;
  savePreferences(); sourceLabels(); draw();
});
async function lookup(point = coordinates, label = 'GPS lookup (approximate)', confirmed = false) {
  if (!navigator.onLine) { $('status').textContent = 'You are offline. Enter a place manually or reconnect for lookup.'; return; }
  if (!point || busy || Date.now() < sharedDeadline()) return;
  if (!confirmed && ($('place').value || $('address').value) && !confirm('Replace your current place details with a GPS lookup?')) return;
  let url;
  try { url = new URL($('endpoint').value); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); }
  catch { $('status').textContent = 'Location service is not configured. Enter a place manually, or check Advanced settings.'; return; }
  const ticket = sequence, originalPlace = $('place').value, originalAddress = $('address').value;
  url.searchParams.set('format', 'jsonv2'); url.searchParams.set('lat', point.latitude); url.searchParams.set('lon', point.longitude);
  busy = true; publishDeadline(Date.now() + 14000); lookupAt = Date.now(); $('lookup').disabled = true; $('status').textContent = 'Finding a place…';
  try {
    const key = url.href;
    let data = geocodeCache.get(key);
    if (!data) { const response = await fetch(url, {credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin', signal: AbortSignal.timeout(12000)}); if (!response.ok) { const retry = response.headers.get('Retry-After'); const seconds = Number(retry); const deadline = retry ? (Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retry)) : 0; cooldown = Math.max(cooldown, Number.isFinite(deadline) ? deadline : 0); throw new Error(response.status === 429 ? 'The location service is busy. Wait for the countdown.' : 'The location service is unavailable. Try later or enter a place manually.'); } data = await response.json(); if (typeof data.display_name !== 'string') throw Error(); geocodeCache.set(key, data); }
    if (ticket !== sequence) return;
    if ($('place').value !== originalPlace || $('address').value !== originalAddress) { $('status').textContent = 'Your manual edits were kept. Try lookup again to replace them.'; return; }
    $('place').value = (data.name || data.display_name.split(',')[0]).slice(0,120); const parts = (data.address || data.display_name).split(',').map(part => part.trim());
    $('address').value = [...new Set(parts)].filter(part => part.toLowerCase() !== $('place').value.toLowerCase()).slice(0,4).join(', ').slice(0,200);
    fieldSources.place = fieldSources.address = label;
    placeSource = label; editVersion++; $('chosenLocation').hidden = true; sourceLabels(); draw(); $('status').textContent = 'Approximate place found. Review and correct it before exporting.';
  } catch (error) { if (ticket === sequence) $('status').textContent = error.name === 'TimeoutError' ? 'Lookup timed out. Try again or enter a place manually.' : error.message.includes('location service') ? error.message : 'Cannot find a place right now. Check your connection or enter a place manually.'; }
  finally { busy = false; cooldown = Math.max(cooldown, Date.now() + 2000); publishDeadline(cooldown); }
}
function withLock(task) {
 if (!navigator.locks) return task();
 return navigator.locks.request('photostamp-lookup', {ifAvailable:true}, lock => lock ? task() : Promise.resolve()).catch(() => { $('status').textContent = 'Lookup unavailable. Try again.'; });
}
$('lookup').addEventListener('click', () => withLock(() => lookup()));

// Current location: only on tap, labelled as the device's location now, never as photo GPS.
async function useCurrentLocation() {
  if (!image || busy || locating || Date.now() < sharedDeadline()) return;
  if (!('geolocation' in navigator) || !window.isSecureContext) { $('status').textContent = 'Location is not available in this browser. Choose a location or type it.'; return; }
  if (($('place').value || $('address').value) && !confirm('Replace your current place details with your current location?')) return;
  const ticket = sequence; locating = true; $('status').textContent = 'Getting your current location…';
  try {
    const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, {enableHighAccuracy: false, timeout: 15000, maximumAge: 60000}));
    if (ticket !== sequence) return;
    const {latitude, longitude, accuracy} = position.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw {code: 2};
    $('chosenLocation').hidden = true;
    setCoordinateSource('device', {latitude, longitude, accuracy});
    locating = false;
    await withLock(() => lookup(coordinates, DEVICE_LABEL, true));
  } catch (error) {
    if (ticket !== sequence) return;
    $('status').textContent = error?.code === 1 ? 'Location permission was denied. Allow location for this site in your browser settings, or choose a location.'
      : error?.code === 3 ? 'Getting your location took too long. Try again, or choose a location.'
      : 'Your location is unavailable right now. Try again, or choose a location.';
  } finally { locating = false; }
}
$('useLocation').addEventListener('click', useCurrentLocation);
$('writeExif').addEventListener('change', () => { editVersion++; syncExifHint(); });

// EXIF writing on export (piexifjs). Canvas output has no metadata, so it is rebuilt here.
const OFFSET_TIME_ORIGINAL = 0x9011;
function toBinary(bytes) { let out = ''; for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return out; }
function fromBinary(text) { const bytes = new Uint8Array(text.length); for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i); return bytes; }
function canvasBlob() { return new Promise(resolve => $('canvas').toBlob(resolve, 'image/jpeg', .94)); }
async function readOriginalExif() {
  if (!originalFile) return null;
  // EXIF sits at the start of a JPEG; try the first 512 KB before reading the whole file.
  for (const part of [originalFile.slice(0, 524288), originalFile]) {
    try { const head = new Uint8Array(await part.slice(0, 2).arrayBuffer()); if (head[0] !== 0xff || head[1] !== 0xd8) return null; return piexif.load(toBinary(new Uint8Array(await part.arrayBuffer()))); } catch {}
  }
  return null;
}
function knownTags(ifd, values) { return Object.fromEntries(Object.entries(values || {}).filter(([tag]) => piexif.TAGS[ifd]?.[tag])); }
function buildExif(width, height, original) {
  if (!piexif.TAGS.Exif[OFFSET_TIME_ORIGINAL]) piexif.TAGS.Exif[OFFSET_TIME_ORIGINAL] = {name: 'OffsetTimeOriginal', type: 'Ascii'};
  const I = piexif.ImageIFD, E = piexif.ExifIFD, G = piexif.GPSIFD, zeroth = {}, exif = knownTags('Exif', original?.Exif);
  for (const tag of [I.Make, I.Model]) if (original?.['0th']?.[tag]) zeroth[tag] = original['0th'][tag];
  for (const tag of [E.MakerNote, E.InteroperabilityTag, E.DateTimeOriginal, OFFSET_TIME_ORIGINAL]) delete exif[tag];
  zeroth[I.Orientation] = 1; zeroth[I.Software] = 'PhotoStamp 2.4';
  const description = [$('place').value.trim(), $('address').value.trim()].filter(Boolean).join(', ');
  if (description) zeroth[I.ImageDescription] = toBinary(new TextEncoder().encode(description));
  exif[E.PixelXDimension] = width; exif[E.PixelYDimension] = height;
  const time = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec($('captured').value);
  if (time) exif[E.DateTimeOriginal] = `${time[1]}:${time[2]}:${time[3]} ${time[4]}:${time[5]}:${time[6] || '00'}`;
  const offset = $('zone').value.trim().replace(/^UTC/i, '');
  if (/^[+-]\d{2}:\d{2}$/.test(offset)) exif[OFFSET_TIME_ORIGINAL] = offset;
  let gps = {};
  if (coordinates && coordinateSource === 'photo' && original?.GPS && Object.keys(original.GPS).length) gps = knownTags('GPS', original.GPS);
  else if (coordinates) {
    gps[G.GPSVersionID] = [2, 2, 0, 0];
    gps[G.GPSLatitudeRef] = coordinates.latitude < 0 ? 'S' : 'N'; gps[G.GPSLatitude] = piexif.GPSHelper.degToDmsRational(Math.abs(coordinates.latitude));
    gps[G.GPSLongitudeRef] = coordinates.longitude < 0 ? 'W' : 'E'; gps[G.GPSLongitude] = piexif.GPSHelper.degToDmsRational(Math.abs(coordinates.longitude));
    // Marks a location not recorded by the camera (8-byte character code, then the method name).
    if (coordinateSource !== 'photo') gps[G.GPSProcessingMethod] = 'ASCII\0\0\0MANUAL';
  }
  return piexif.dump({'0th': zeroth, Exif: exif, GPS: gps});
}
async function exportBlob() {
  const ticket = sequence;
  draw(true);
  const blob = await canvasBlob();
  if (!blob || ticket !== sequence) return null;
  if (!$('writeExif').checked) return {blob};
  try {
    if (typeof piexif === 'undefined') throw Error();
    const {width, height} = $('canvas'), original = await readOriginalExif();
    let bytes; try { bytes = buildExif(width, height, original); } catch { bytes = buildExif(width, height, null); }
    const jpeg = piexif.insert(bytes, toBinary(new Uint8Array(await blob.arrayBuffer())));
    return ticket === sequence ? {blob: new Blob([fromBinary(jpeg)], {type: 'image/jpeg'})} : null;
  } catch { return {blob, exifFailed: true}; }
}
$('download').addEventListener('click', async () => {
  if (!image || exporting) return;
  exporting = true; $('status').textContent = 'Preparing photo…';
  try {
    const result = await exportBlob();
    if (!result) { $('status').textContent = 'Export failed. Try a smaller photo.'; return; }
    const url = URL.createObjectURL(result.blob), link = document.createElement('a');
    link.href = url; link.download = `${originalName}_stamped.jpg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
    $('status').textContent = result.exifFailed ? 'Photo saved without place and date details. The file could not be updated.' : 'Photo saved.';
  } finally { exporting = false; }
});
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pendingInstall = event; $('install').hidden = false; });
$('install').addEventListener('click', async () => { if (pendingInstall) { await pendingInstall.prompt(); pendingInstall = null; $('install').hidden = true; } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').then(async registration => {
  await navigator.serviceWorker.ready; $('offline').textContent = 'App files saved for offline editing.';
  const update = () => { if (registration.waiting) { waitingWorker = registration.waiting; $('updateApp').hidden = false; $('updateBanner').hidden = false; } if (registration.waiting) $('offline').textContent = 'Update ready. Close all PhotoStamp windows and reopen to use it.'; };
  update(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', update));
  $('checkUpdates').addEventListener('click', async () => {
    $('updateStatus').textContent = 'Checking…';
    try { await registration.update(); update(); $('updateStatus').textContent = registration.installing ? 'Downloading update. Keep this page open.' : registration.waiting ? 'Update ready above.' : 'You have the latest version.'; }
    catch { $('updateStatus').textContent = 'Unable to check. Connect to the internet and try again.'; }
  });
}).catch(() => { $('offline').textContent = 'Offline setup unavailable. Keep this page online and reload to try again.'; });

setInterval(() => {
 const remaining = Math.max(0, Math.ceil((sharedDeadline() - Date.now()) / 1000));
 $('lookup').disabled = !coordinates || busy || remaining > 0;
 $('lookup').textContent = busy ? 'Looking up…' : remaining ? `Try again in ${remaining}s…` : 'Find place';
 $('useLocation').disabled = !image || busy || locating || remaining > 0;
 $('useLocation').textContent = locating ? 'Getting your location…' : remaining && !busy ? `Use my current location (${remaining}s)` : 'Use my current location';
 $('share').disabled = !image || exporting;
 $('download').disabled = !image || exporting;
}, 200);
$('share').hidden = !navigator.canShare;
$('share').addEventListener('click', async () => {
 if (!image || exporting) return;
 // Reuse a file prepared by an earlier tap if nothing changed, so a second tap shares at once.
 let file = preparedShare?.version === editVersion && preparedShare.sequence === sequence ? preparedShare.file : null;
 if (!file) {
  exporting = true;
  try { const result = await exportBlob(); if (!result) return; file = new File([result.blob], `${originalName}_stamped.jpg`, {type:'image/jpeg'}); preparedShare = {file, version: editVersion, sequence}; }
  finally { exporting = false; }
 }
 try { if (!navigator.canShare({files:[file]})) throw Error(); await navigator.share({files:[file]}); }
 catch(error) { if (error.name === 'NotAllowedError') $('status').textContent = 'Photo is ready. Tap Share again.'; else if (error.name !== 'AbortError') $('status').textContent = 'Sharing unavailable. Use Save photo instead.'; }
});

const PREFS = ['position','size','resolution','gps','showPlace','showAddress','showTime'];
function savePreferences() { try { localStorage.setItem('photostamp-style', JSON.stringify(Object.fromEntries(PREFS.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value])))); } catch {} }
try { const prefs = JSON.parse(localStorage.getItem('photostamp-style') || '{}'); if (!localStorage.getItem('photostamp-clean-default')) { prefs.gps = false; prefs.position = 'caption'; localStorage.setItem('photostamp-clean-default', '1'); localStorage.setItem('photostamp-style', JSON.stringify(prefs)); } for (const id of PREFS) if (id in prefs) { if ($(id).type === 'checkbox') $(id).checked = !!prefs[id]; else $(id).value = prefs[id]; } const endpoint = localStorage.getItem('photostamp-provider'); if (endpoint) { $('endpoint').value = endpoint; $('rememberProvider').checked = true; } } catch {}
function rememberProvider() { try { if ($('rememberProvider').checked) localStorage.setItem('photostamp-provider', $('endpoint').value); else localStorage.removeItem('photostamp-provider'); } catch {} }
$('rememberProvider').addEventListener('change', rememberProvider); $('endpoint').addEventListener('change', rememberProvider);
function sharedDeadline() { try { return Math.max(cooldown, Number(localStorage.getItem('photostamp-cooldown')) || 0); } catch { return cooldown; } }
function publishDeadline(value) { try { localStorage.setItem('photostamp-cooldown', String(value)); } catch {} }
$('restore').addEventListener('click', () => { if (!image) return; window.dispatchEvent(new Event('photostamp:photochange')); for (const id of ['place','address','captured','zone']) $(id).value = originalFields[id] || ''; fieldSources = {captured: originalFields.captured ? 'photo EXIF' : '', zone: originalFields.zone ? 'photo EXIF' : ''}; placeSource = ''; setCoordinateSource(photoCoordinates ? 'photo' : '', photoCoordinates); sourceLabels(); });
$('clear').addEventListener('click', () => { ++sequence; image = null; coordinates = null; photoCoordinates = null; coordinateSource = ''; originalFile = null; preparedShare = null; originalFields = {}; fieldSources = {}; placeSource = ''; for (const id of ['photo','place','address','captured','zone']) $(id).value = ''; $('canvas').hidden = true; $('empty').hidden = false; $('download').disabled = true; $('status').textContent = 'Choose a photo to begin.'; syncWorkspace(); sourceLabels(); });
$('updateApp').addEventListener('click', () => { if (image && !confirm('Updating clears this editing session. Save your photo first. Update now?')) return; waitingWorker?.postMessage({type:'SKIP_WAITING'}); });
navigator.serviceWorker?.addEventListener('controllerchange', () => location.reload());

$('endpoint').addEventListener('input', updateProvider);
$('defaultProvider').addEventListener('click', () => {
 $('endpoint').value = DEFAULT_ENDPOINT; $('rememberProvider').checked = false;
 try { localStorage.removeItem('photostamp-provider'); } catch {}
 updateProvider();
});
updateProvider(); syncWorkspace();
