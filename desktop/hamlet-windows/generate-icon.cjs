const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const SIZE = 256;
const pixels = Buffer.alloc(SIZE * SIZE * 4);
const navy = [7, 29, 74, 255];
const white = [255, 255, 255, 255];

function setPixel(x, y, color) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  pixels[i] = color[0];
  pixels[i + 1] = color[1];
  pixels[i + 2] = color[2];
  pixels[i + 3] = color[3];
}

// Prefer Hamlet's checked-in website favicon so the desktop icon follows
// the same source of truth as the public site. Fall back to a crisp vector-like
// mark if the favicon is absent or is not a usable PNG-backed ICO.
function readPngFromIco(ico) {
  if (!Buffer.isBuffer(ico) || ico.length < 22 ||
      ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) return null;
  const count = ico.readUInt16LE(4);
  let best = null;
  for (let i = 0; i < count; i++) {
    const offset = 6 + i * 16;
    if (offset + 16 > ico.length) break;
    const size = ico.readUInt32LE(offset + 8);
    const dataOffset = ico.readUInt32LE(offset + 12);
    if (dataOffset + size > ico.length || size < 8) continue;
    const image = ico.subarray(dataOffset, dataOffset + size);
    if (image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
      const width = ico[offset] || 256;
      const height = ico[offset + 1] || 256;
      const score = Math.min(width, 256) * Math.min(height, 256);
      if (!best || score > best.score) best = { image, score };
    }
  }
  return best?.image || null;
}

function drawFallbackMark() {
  // Solid royal-navy tile with a clean white lowercase "h".
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) setPixel(x, y, navy);
  }
  // Slightly rounded-looking, proportioned strokes at 256px scale.
  for (let y = 46; y < 210; y++) {
    for (let x = 62; x < 90; x++) setPixel(x, y, white);
  }
  for (let y = 110; y < 138; y++) {
    for (let x = 88; x < 190; x++) setPixel(x, y, white);
  }
  for (let y = 110; y < 210; y++) {
    for (let x = 162; x < 190; x++) setPixel(x, y, white);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPngFromPixels() {
  const scanlines = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    const dst = y * (SIZE * 4 + 1);
    scanlines[dst] = 0; // PNG filter: none
    pixels.copy(scanlines, dst + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(scanlines)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function createIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry[0] = 0; // 256px
  entry[1] = 0; // 256px
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, png]);
}

const faviconPath = path.resolve(__dirname, "../../assets/images/favicon.ico");
let png = null;
try {
  png = readPngFromIco(fs.readFileSync(faviconPath));
} catch {
  // A source favicon is optional; the deterministic fallback remains available.
}

if (png) {
  fs.writeFileSync("icon.ico", createIco(png));
  console.log("Generated Hamlet Windows icon from assets/images/favicon.ico.");
} else {
  drawFallbackMark();
  fs.writeFileSync("icon.ico", createIco(createPngFromPixels()));
  console.log("Generated fallback Hamlet Windows icon.");
}
