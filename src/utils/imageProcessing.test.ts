import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAdaptiveSignatureFilter,
  applyEdgeProtectedBackgroundClean,
  computeLaplacianSharpness,
  detectSkinToneFaceBounds,
  patchJpegDpiAndSize,
} from './imageProcessing';

test('computeLaplacianSharpness distinguishes sharp edges from flat blurry image', () => {
  const w = 32;
  const h = 32;
  const sharp = new Uint8ClampedArray(w * h * 4);
  const blurry = new Uint8ClampedArray(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const val = (x + y) % 2 === 0 ? 240 : 20;
      sharp[idx] = sharp[idx + 1] = sharp[idx + 2] = val;
      sharp[idx + 3] = 255;

      blurry[idx] = blurry[idx + 1] = blurry[idx + 2] = 128;
      blurry[idx + 3] = 255;
    }
  }

  const sharpRes = computeLaplacianSharpness(sharp, w, h);
  const blurryRes = computeLaplacianSharpness(blurry, w, h);

  assert.equal(sharpRes.status, 'sharp');
  assert.ok(sharpRes.variance > 1000);
  assert.equal(blurryRes.status, 'blurry');
  assert.equal(blurryRes.variance, 0);
});

test('applyAdaptiveSignatureFilter turns paper white and ink crisp dark', () => {
  const w = 40;
  const h = 40;
  const rgba = new Uint8ClampedArray(w * h * 4);

  // Cream/shadowed paper background (210, 200, 180) with dark stroke in center
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const isInk = x >= 15 && x <= 25 && y >= 18 && y <= 21;
      rgba[idx] = isInk ? 30 : 210;
      rgba[idx + 1] = isInk ? 35 : 200;
      rgba[idx + 2] = isInk ? 60 : 180;
      rgba[idx + 3] = 255;
    }
  }

  applyAdaptiveSignatureFilter(rgba, w, h, 'black');

  // Corner paper should be pure white
  assert.equal(rgba[0], 255);
  assert.equal(rgba[1], 255);
  assert.equal(rgba[2], 255);

  // Center ink pixel (20, 19) should be crisp dark ink (#0F172A)
  const inkIdx = (19 * w + 20) * 4;
  assert.ok(rgba[inkIdx] < 40);
  assert.ok(rgba[inkIdx + 1] < 40);
});

test('applyEdgeProtectedBackgroundClean lightens outer background while protecting center', () => {
  const w = 40;
  const h = 40;
  const rgba = new Uint8ClampedArray(w * h * 4);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      // Uniform shaded gray background (190) everywhere except dark center box
      const inCenter = x >= 15 && x <= 25 && y >= 15 && y <= 25;
      rgba[idx] = inCenter ? 90 : 190;
      rgba[idx + 1] = inCenter ? 70 : 190;
      rgba[idx + 2] = inCenter ? 60 : 190;
      rgba[idx + 3] = 255;
    }
  }

  applyEdgeProtectedBackgroundClean(rgba, w, h, 100, 'photo');

  // Top-left corner (0,0) should become significantly brighter toward white
  assert.ok(rgba[0] > 235, `Expected corner brightened >235, got ${rgba[0]}`);
  // Center subject pixel (20,20) should remain protected
  const centerIdx = (20 * w + 20) * 4;
  assert.equal(rgba[centerIdx], 90);
});

test('detectSkinToneFaceBounds locates off-center skin cluster', () => {
  const w = 60;
  const h = 60;
  const rgba = new Uint8ClampedArray(w * h * 4);
  // Neutral cool gray background
  for (let i = 0; i < w * h; i++) {
    rgba[i * 4] = 220;
    rgba[i * 4 + 1] = 225;
    rgba[i * 4 + 2] = 230;
    rgba[i * 4 + 3] = 255;
  }
  // Place skin-tone face patch centered around x=40 (0.67), y=20 (0.33)
  for (let y = 12; y <= 28; y++) {
    for (let x = 32; x <= 48; x++) {
      const idx = (y * w + x) * 4;
      rgba[idx] = 210;
      rgba[idx + 1] = 158;
      rgba[idx + 2] = 130;
    }
  }

  const res = detectSkinToneFaceBounds(rgba, w, h);
  assert.equal(res.detected, true);
  assert.ok(Math.abs(res.cx - 40 / 60) < 0.08);
  assert.ok(Math.abs(res.cy - 20 / 60) < 0.08);
});

test('patchJpegDpiAndSize sets JFIF APP0 DPI bytes and pads minimum byte floor', () => {
  // Minimal synthetic JFIF header (20 bytes) + EOI (FF D9)
  const mockJpeg = new Uint8Array([
    0xff, 0xd8, // SOI
    0xff, 0xe0, // APP0
    0x00, 0x10, // length 16
    0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF\0
    0x01, 0x01, // version 1.1
    0x00, // units = 0
    0x00, 0x01, // Xdensity
    0x00, 0x01, // Ydensity
    0x00, 0x00, // thumb
    0xff, 0xd9, // EOI
  ]);

  const patched = patchJpegDpiAndSize(mockJpeg, 200, 1024);
  assert.equal(patched[13], 1); // units = DPI
  assert.equal((patched[14] << 8) | patched[15], 200);
  assert.equal((patched[16] << 8) | patched[17], 200);
  assert.ok(patched.byteLength >= 1024);
  assert.equal(patched[patched.length - 2], 0xff);
  assert.equal(patched[patched.length - 1], 0xd9);
});
