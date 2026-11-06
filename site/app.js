'use strict';
const $ = id => document.getElementById(id);
let originalFields = {}, fieldSources = {}, waitingWorker;
let originalName = 'photo', busy = false, cooldown = 0;
let image = null, coordinates = null, sequence = 0, placeSource = '', dateSource = '', lookupAt = 0, pendingInstall;
const geocodeCache = new Map();
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
  for (const value of [$('showPlace').checked ? $('place').value.trim() : '', $('showAddress').checked ? $('address').value.trim() : '', $('showTime').checked && prettyTime ? prettyTime + (zone ? ` · ${zone}` : '') : '', coordinates && $('gps').checked ? `GPS: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : '']) {
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
  image = null; coordinates = null; placeSource = ''; dateSource = ''; fieldSources = {};
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
    if (Number.isFinite(metadata.latitude) && Number.isFinite(metadata.longitude) && Math.abs(metadata.latitude) <= 90 && Math.abs(metadata.longitude) <= 180) coordinates = {latitude: metadata.latitude, longitude: metadata.longitude};
    // Preserve the camera's wall-clock time, without converting it to this device's time zone.
    const rawDate = metadata.DateTimeOriginal;
    if (typeof rawDate === 'string' && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}$/.test(rawDate)) {
      $('captured').value = rawDate.replace(/^(\d{4}):(\d{2}):(\d{2}) /, '$1-$2-$3T');
      if ($('captured').value) dateSource = 'photo EXIF';
    }
    $('zone').value = typeof metadata.OffsetTimeOriginal === 'string' ? metadata.OffsetTimeOriginal : '';
    $('status').textContent = `${coordinates ? 'Photo GPS found.' : 'No photo GPS found; enter the place manually.'} ${dateSource ? 'Capture time found.' : 'Capture time missing; enter it manually if known.'}${metadataError ? ' Metadata could not be read.' : ''}`;
    originalFields = Object.fromEntries(['place','address','captured','zone'].map(id => [id, $(id).value]));
    fieldSources = {captured: dateSource, zone: $('zone').value ? 'photo EXIF' : ''};
    $('lookup').disabled = !coordinates || busy || Date.now() < sharedDeadline(); $('download').disabled = false;
    $('empty').hidden = true; $('canvas').hidden = false; sourceLabels(); draw();
  } catch { if (ticket === sequence) $('status').textContent = 'This photo could not be opened. Try an original JPEG, PNG, or WebP file.'; }
  finally { URL.revokeObjectURL(url); }
});
for (const id of ['place', 'address', 'captured', 'zone', 'position', 'size', 'gps', 'resolution', 'showPlace', 'showAddress', 'showTime']) $(id).addEventListener('input', () => {
  if (id === 'place' || id === 'address') placeSource = 'user-provided';
  if (['place','address','captured','zone'].includes(id)) fieldSources[id] = 'user-provided';
  savePreferences(); sourceLabels(); draw();
});
async function lookup() {
  if (!navigator.onLine) { $('status').textContent = 'You are offline. Enter a place manually or reconnect for lookup.'; return; }
  if (!coordinates || busy || Date.now() < sharedDeadline()) return;
  if (($('place').value || $('address').value) && !confirm('Replace your current place details with a GPS lookup?')) return;
  let url;
  try { url = new URL($('endpoint').value); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); }
  catch { $('status').textContent = 'Enter an authorized HTTPS reverse-geocoding endpoint in Location lookup settings first.'; return; }
  const ticket = sequence, originalPlace = $('place').value, originalAddress = $('address').value;
  url.searchParams.set('format', 'jsonv2'); url.searchParams.set('lat', coordinates.latitude); url.searchParams.set('lon', coordinates.longitude);
  busy = true; publishDeadline(Date.now() + 14000); lookupAt = Date.now(); $('lookup').disabled = true; $('status').textContent = 'Looking up coordinates online…';
  try {
    const key = url.href;
    let data = geocodeCache.get(key);
    if (!data) { const response = await fetch(url, {credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin', signal: AbortSignal.timeout(12000)}); if (!response.ok) { const retry = response.headers.get('Retry-After'); const seconds = Number(retry); const deadline = retry ? (Number.isFinite(seconds) ? Date.now() + seconds * 1000 : Date.parse(retry)) : 0; cooldown = Math.max(cooldown, Number.isFinite(deadline) ? deadline : 0); throw new Error(response.status === 429 ? 'Provider rate limit reached. Wait for the countdown.' : `Provider returned HTTP ${response.status}. Try again later.`); } data = await response.json(); if (typeof data.display_name !== 'string') throw Error(); geocodeCache.set(key, data); }
    if (ticket !== sequence) return;
    if ($('place').value !== originalPlace || $('address').value !== originalAddress) { $('status').textContent = 'Your manual edits were kept. Try lookup again to replace them.'; return; }
    $('place').value = (data.name || data.display_name.split(',')[0]).slice(0,120); const parts = data.display_name.split(',').map(part => part.trim());
    $('address').value = parts.filter(part => part.toLowerCase() !== $('place').value.toLowerCase()).slice(0,4).join(', ').slice(0,200);
    fieldSources.place = fieldSources.address = 'GPS lookup (approximate)';
    placeSource = 'GPS lookup (approximate)'; sourceLabels(); draw(); $('status').textContent = 'Approximate place found. Review and correct it before exporting.';
  } catch (error) { if (ticket === sequence) $('status').textContent = error.name === 'TimeoutError' ? 'Lookup timed out. Try again or enter a place manually.' : error.message.includes('Provider') ? error.message : 'Cannot reach the provider. Check your connection and endpoint, or enter a place manually.'; }
  finally { busy = false; cooldown = Math.max(cooldown, Date.now() + 2000); publishDeadline(cooldown); }
}
$('lookup').addEventListener('click', () => {
 if (navigator.locks) navigator.locks.request('photostamp-lookup', {ifAvailable:true}, lock => lock ? lookup() : Promise.resolve()).catch(() => { $('status').textContent = 'Lookup unavailable. Try again.'; });
 else lookup();
});
$('download').addEventListener('click', () => {
  draw(true); $('canvas').toBlob(blob => {
    if (!blob) { $('status').textContent = 'Export failed. Try a smaller photo.'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${originalName}_stamped.jpg`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, 'image/jpeg', .94);
});
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pendingInstall = event; $('install').hidden = false; });
$('install').addEventListener('click', async () => { if (pendingInstall) { await pendingInstall.prompt(); pendingInstall = null; $('install').hidden = true; } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').then(async registration => {
  await navigator.serviceWorker.ready; $('offline').textContent = 'App files saved for offline editing.';
  const update = () => { if (registration.waiting) { waitingWorker = registration.waiting; $('updateApp').hidden = false; } if (registration.waiting) $('offline').textContent = 'Update ready. Close all PhotoStamp windows and reopen to use it.'; };
  update(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', update));
}).catch(() => { $('offline').textContent = 'Offline setup unavailable. Keep this page online and reload to try again.'; });

setInterval(() => {
 const remaining = Math.max(0, Math.ceil((sharedDeadline() - Date.now()) / 1000));
 $('lookup').disabled = !coordinates || busy || remaining > 0;
 $('lookup').textContent = busy ? 'Looking up…' : remaining ? `Try again in ${remaining}s…` : 'Look up place from photo GPS';
 $('share').disabled = !image;
}, 200);
$('share').hidden = !navigator.canShare;
$('share').addEventListener('click', () => {
 if (!image) return;
 draw(true);
 const name = originalName;
 $('canvas').toBlob(async blob => {
  if (!blob) return;
  const file = new File([blob], `${name}_stamped.jpg`, {type:'image/jpeg'});
  try { if (!navigator.canShare({files:[file]})) throw Error(); await navigator.share({files:[file]}); }
  catch(error) { if (error.name !== 'AbortError') $('status').textContent = 'Sharing unavailable. Use Download stamped JPEG instead.'; }
 }, 'image/jpeg', .94);
});

const PREFS = ['position','size','resolution','gps','showPlace','showAddress','showTime'];
function savePreferences() { try { localStorage.setItem('photostamp-style', JSON.stringify(Object.fromEntries(PREFS.map(id => [id, $(id).type === 'checkbox' ? $(id).checked : $(id).value])))); } catch {} }
try { const prefs = JSON.parse(localStorage.getItem('photostamp-style') || '{}'); if (!localStorage.getItem('photostamp-clean-default')) { prefs.gps = false; prefs.position = 'caption'; localStorage.setItem('photostamp-clean-default', '1'); localStorage.setItem('photostamp-style', JSON.stringify(prefs)); } for (const id of PREFS) if (id in prefs) { if ($(id).type === 'checkbox') $(id).checked = !!prefs[id]; else $(id).value = prefs[id]; } const endpoint = localStorage.getItem('photostamp-provider'); if (endpoint) { $('endpoint').value = endpoint; $('rememberProvider').checked = true; } } catch {}
function rememberProvider() { try { if ($('rememberProvider').checked) localStorage.setItem('photostamp-provider', $('endpoint').value); else localStorage.removeItem('photostamp-provider'); } catch {} }
$('rememberProvider').addEventListener('change', rememberProvider); $('endpoint').addEventListener('change', rememberProvider);
function sharedDeadline() { try { return Math.max(cooldown, Number(localStorage.getItem('photostamp-cooldown')) || 0); } catch { return cooldown; } }
function publishDeadline(value) { try { localStorage.setItem('photostamp-cooldown', String(value)); } catch {} }
$('restore').addEventListener('click', () => { if (!image) return; for (const id of ['place','address','captured','zone']) $(id).value = originalFields[id] || ''; fieldSources = {captured: originalFields.captured ? 'photo EXIF' : '', zone: originalFields.zone ? 'photo EXIF' : ''}; placeSource = ''; sourceLabels(); draw(); });
$('clear').addEventListener('click', () => { ++sequence; image = null; coordinates = null; originalFields = {}; fieldSources = {}; placeSource = ''; for (const id of ['photo','place','address','captured','zone']) $(id).value = ''; $('canvas').hidden = true; $('empty').hidden = false; $('download').disabled = true; $('status').textContent = 'Choose a photo to begin.'; sourceLabels(); });
$('updateApp').addEventListener('click', () => { if (image && !confirm('Updating clears this editing session. Save your photo first. Update now?')) return; waitingWorker?.postMessage({type:'SKIP_WAITING'}); });
navigator.serviceWorker?.addEventListener('controllerchange', () => location.reload());
