import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OFFICIAL_EXAM_PRESETS,
  binarySearchCompression,
  computeLockedHeight,
  computeLockedWidth,
  convertDimension,
  formatBytes,
  fromPixels,
  toBytes,
  toPixels,
} from './unitsAndPresets';

test('toPixels converts cm, mm, in, and px accurately at 200 and 300 DPI', () => {
  // SSC Photo: 3.5 cm x 4.5 cm @ 200 DPI -> (3.5 * 200) / 2.54 = 275.59 -> 276 px
  assert.equal(toPixels(3.5, 'cm', 200), 276);
  assert.equal(toPixels(4.5, 'cm', 200), 354);

  // mm conversion: 40 mm x 20 mm @ 200 DPI -> (40 * 200) / 25.4 = 314.96 -> 315 px
  assert.equal(toPixels(40, 'mm', 200), 315);
  assert.equal(toPixels(20, 'mm', 200), 157);

  // inch conversion: 2 in x 2 in @ 300 DPI -> 600 x 600 px
  assert.equal(toPixels(2, 'in', 300), 600);
  assert.equal(toPixels(500, 'px', 150), 500);
});

test('convertDimension preserves physical size when switching units', () => {
  assert.equal(convertDimension(3.5, 'cm', 'mm', 200), 35);
  assert.equal(convertDimension(35, 'mm', 'cm', 200), 3.5);
  assert.equal(convertDimension(1, 'in', 'cm', 200), 2.54);
  assert.equal(fromPixels(600, 'in', 300), 2);
});

test('aspect ratio lock computes proportional height and width', () => {
  // 3.5 : 4.5 ratio = 0.7777...
  const ratio = 3.5 / 4.5;
  assert.equal(computeLockedHeight(7.0, ratio, 'cm'), 9.0);
  assert.equal(computeLockedWidth(9.0, ratio, 'cm'), 7.0);
});

test('KB and MB byte conversion and formatting', () => {
  assert.equal(toBytes(20, 'KB'), 20480);
  assert.equal(toBytes(50, 'KB'), 51200);
  assert.equal(toBytes(2, 'MB'), 2097152);
  assert.equal(formatBytes(25600), '25.0 KB');
  assert.equal(formatBytes(1572864), '1.50 MB');
});

test('official Indian exam presets match exact specifications', () => {
  const sscPhoto = OFFICIAL_EXAM_PRESETS.find((p) => p.id === 'ssc-photo');
  assert.ok(sscPhoto);
  assert.equal(sscPhoto.width, 3.5);
  assert.equal(sscPhoto.height, 4.5);
  assert.equal(sscPhoto.dpi, 200);
  assert.equal(sscPhoto.minSize, 20);
  assert.equal(sscPhoto.maxSize, 50);

  const sscSign = OFFICIAL_EXAM_PRESETS.find((p) => p.id === 'ssc-signature');
  assert.ok(sscSign);
  assert.equal(sscSign.width, 4.0);
  assert.equal(sscSign.height, 2.0);
  assert.equal(sscSign.minSize, 10);
  assert.equal(sscSign.maxSize, 20);
});

test('binarySearchCompression lands strictly inside [minBytes, maxBytes] targeting high clarity', async () => {
  const minBytes = 20 * 1024; // 20 KB
  const maxBytes = 50 * 1024; // 50 KB

  // Simulate realistic non-linear JPEG byte size curve: ~120KB at q=0.99 down to ~8KB at q=0.05
  const result = await binarySearchCompression(minBytes, maxBytes, async (quality, scale) => {
    const bytes = Math.round((8000 + Math.pow(quality, 1.45) * 112000) * scale * scale);
    return { payload: `q=${quality}`, bytes };
  });

  assert.equal(result.withinRange, true);
  assert.ok(result.bytes >= minBytes, `Expected >= ${minBytes}, got ${result.bytes}`);
  assert.ok(result.bytes <= maxBytes, `Expected <= ${maxBytes}, got ${result.bytes}`);
  assert.equal(result.scaleFactor, 1.0);
  // Should aim near 85-92% of 50KB (~42-46KB)
  assert.ok(result.bytes >= 38 * 1024, `Expected high clarity >= 38KB, got ${result.bytes}`);
});

test('binarySearchCompression falls back to scale reduction if q=0.05 still exceeds maxBytes', async () => {
  const minBytes = 10 * 1024;
  const maxBytes = 20 * 1024;

  // Simulate very large image where q=0.05 at scale 1.0 is still 32 KB (> 20 KB)
  const result = await binarySearchCompression(minBytes, maxBytes, async (quality, scale) => {
    const bytes = Math.round((30000 + Math.pow(quality, 1.4) * 90000) * scale * scale);
    return { payload: `s=${scale},q=${quality}`, bytes };
  });

  assert.equal(result.withinRange, true);
  assert.ok(result.bytes >= minBytes && result.bytes <= maxBytes);
  assert.ok(result.scaleFactor < 1.0);
});
