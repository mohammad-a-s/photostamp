const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../site');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest')));
assert.equal(manifest.start_url, './'); assert.equal(manifest.scope, './'); assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const bytes = fs.readFileSync(path.join(root, icon.src));
  assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
  assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
}
let assets;
vm.runInNewContext(fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8') + '\nresult(ASSETS)', {URL, self: {registration: {scope: 'https://example.org/photostamp/'}, addEventListener() {}}, result(value) {assets = value;}});
for (const asset of assets) assert.ok(fs.existsSync(path.join(root, asset)), asset);
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const match of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), match[1]);
assert.ok(!html.includes('src="https://'), 'No runtime CDN scripts');
assert.ok(fs.statSync(path.join(root, 'lib/exifr.min.js')).size > 50000);
console.log(`Static PWA checks passed: ${assets.length} cached assets and ${manifest.icons.length} correctly sized icons.`);
