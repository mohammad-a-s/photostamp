'use strict';
const $ = id => document.getElementById(id);
let image = null, coordinates = null, sequence = 0, placeSource = '', dateSource = '', lookupAt = 0, pendingInstall;
const geocodeCache = new Map();
function sourceLabels() {
  $('locationSource').textContent = `Location: ${placeSource || 'not provided'}`;
  $('timeSource').textContent = `Capture time: ${dateSource || 'not provided'}`;
}
function wrap(ctx, text, width) {
  const lines = []; let line = '';
  for (const character of text) {
    if (line && ctx.measureText(line + character).width > width) { lines.push(line); line = ''; }
    line += character;
  }
  if (line) lines.push(line);
  return lines;
}
function draw() {
  if (!image) return;
  const canvas = $('canvas'), ctx = canvas.getContext('2d');
  const scale = Math.min(1, Math.sqrt(20000000 / (image.naturalWidth * image.naturalHeight)));
  canvas.width = Math.round(image.naturalWidth * scale); canvas.height = Math.round(image.naturalHeight * scale);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  const font = Math.max(10, Math.min(canvas.width, canvas.height) * Number($('size').value) / 100);
  const padding = font, lineHeight = font * 1.45;
  ctx.font = `600 ${font}px system-ui, sans-serif`;
  const rows = [];
  for (const value of [$('place').value.trim(), $('address').value.trim(), $('captured').value.replace('T', ' ') + ($('captured').value && $('zone').value.trim() ? ` ${$('zone').value.trim()}` : ''), coordinates && $('gps').checked ? `GPS: ${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(6)}` : '']) {
    if (value) rows.push(...wrap(ctx, value, canvas.width - 2 * padding));
  }
  const provenance = [];
  if ($('place').value.trim() || $('address').value.trim()) provenance.push(`Place: ${placeSource || 'user-provided'}`);
  if ($('captured').value) provenance.push(`Time: ${dateSource || 'user-provided'}`);
  if (provenance.length) rows.push(...wrap(ctx, provenance.join(' · '), canvas.width - 2 * padding));
  if (!rows.length) return;
  const height = rows.length * lineHeight + padding * 2;
  const y = $('position').value === 'top' ? 0 : canvas.height - height;
  ctx.fillStyle = 'rgba(10,20,32,.76)'; ctx.fillRect(0, y, canvas.width, height);
  ctx.fillStyle = '#fff'; ctx.textBaseline = 'top';
  rows.forEach((row, i) => ctx.fillText(row, padding, y + padding + i * lineHeight));
}
$('photo').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  const ticket = ++sequence;
  image = null; coordinates = null; placeSource = ''; dateSource = '';
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
    $('lookup').disabled = !coordinates; $('download').disabled = false;
    $('empty').hidden = true; $('canvas').hidden = false; sourceLabels(); draw();
  } catch { if (ticket === sequence) $('status').textContent = 'This photo could not be opened. Try an original JPEG, PNG, or WebP file.'; }
  finally { URL.revokeObjectURL(url); }
});
for (const id of ['place', 'address', 'captured', 'zone', 'position', 'size', 'gps']) $(id).addEventListener('input', () => {
  if (id === 'place' || id === 'address') placeSource = 'user-provided';
  if (id === 'captured' || id === 'zone') dateSource = 'user-provided';
  sourceLabels(); draw();
});
$('lookup').addEventListener('click', async () => {
  if (!coordinates || Date.now() - lookupAt < 1100) return;
  let url;
  try { url = new URL($('endpoint').value); if (url.protocol !== 'https:' || url.username || url.password) throw Error(); }
  catch { $('status').textContent = 'Enter an authorized HTTPS reverse-geocoding endpoint in Location lookup settings first.'; return; }
  const ticket = sequence, originalPlace = $('place').value, originalAddress = $('address').value;
  url.searchParams.set('format', 'jsonv2'); url.searchParams.set('lat', coordinates.latitude); url.searchParams.set('lon', coordinates.longitude);
  lookupAt = Date.now(); $('lookup').disabled = true; $('status').textContent = 'Looking up coordinates online…';
  try {
    const key = url.href;
    let data = geocodeCache.get(key);
    if (!data) { const response = await fetch(url, {credentials: 'omit', referrerPolicy: 'strict-origin-when-cross-origin', signal: AbortSignal.timeout(12000)}); if (!response.ok) throw Error(); data = await response.json(); if (typeof data.display_name !== 'string') throw Error(); geocodeCache.set(key, data); }
    if (ticket !== sequence) return;
    if ($('place').value !== originalPlace || $('address').value !== originalAddress) { $('status').textContent = 'Your manual edits were kept. Try lookup again to replace them.'; return; }
    $('place').value = (data.name || data.display_name.split(',')[0]).slice(0,120); $('address').value = data.display_name.slice(0,200);
    placeSource = 'GPS lookup (approximate)'; sourceLabels(); draw(); $('status').textContent = 'Approximate place found. Review and correct it before exporting.';
  } catch { if (ticket === sequence) $('status').textContent = 'Location lookup unavailable. You can still enter a place manually and export offline.'; }
  finally { if (ticket === sequence) setTimeout(() => { if (ticket === sequence) $('lookup').disabled = !coordinates; }, 1100); }
});
$('download').addEventListener('click', () => {
  draw(); $('canvas').toBlob(blob => {
    if (!blob) { $('status').textContent = 'Export failed. Try a smaller photo.'; return; }
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'photostamp.jpg'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }, 'image/jpeg', .94);
});
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); pendingInstall = event; $('install').hidden = false; });
$('install').addEventListener('click', async () => { if (pendingInstall) { await pendingInstall.prompt(); pendingInstall = null; $('install').hidden = true; } });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').then(async registration => {
  await navigator.serviceWorker.ready; $('offline').textContent = 'App files saved for offline editing.';
  const update = () => { if (registration.waiting) $('offline').textContent = 'Update ready. Close all PhotoStamp windows and reopen to use it.'; };
  update(); registration.addEventListener('updatefound', () => registration.installing?.addEventListener('statechange', update));
}).catch(() => { $('offline').textContent = 'Offline setup unavailable. Keep this page online and reload to try again.'; });
