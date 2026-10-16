const fs = require("node:fs");
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

function fillRect(x1, y1, x2, y2, color) {
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) setPixel(x, y, color);
  }
}

// Solid Hamlet navy field with a simple, high-contrast lowercase "h" mark.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) setPixel(x, y, navy);
}
fillRect(64, 48, 88, 208, white);
fillRect(88, 112, 184, 136, white);
fillRect(160, 112, 184, 208, white);

// PNG RGBA image, using the standard no-filter scanline format.
const scanlines = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  const dst = y * (SIZE * 4 + 1);
  scanlines[dst] = 0;
  pixels.copy(scanlines, dst + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
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

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // 8-bit channels
ihdr[9] = 6; // RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk("IHDR", ihdr),
  pngChunk("IDAT", zlib.deflateSync(scanlines)),
  pngChunk("IEND", Buffer.alloc(0))
]);

// ICO container embedding the generated 256x256 PNG.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
const entry = Buffer.alloc(16);
entry[0] = 0; // 256px
entry[1] = 0; // 256px
entry[2] = 0;
entry[3] = 0;
entry.writeUInt16LE(1, 4);
entry.writeUInt16LE(32, 6);
entry.writeUInt32LE(png.length, 8);
entry.writeUInt32LE(22, 12);

fs.writeFileSync("icon.ico", Buffer.concat([header, entry, png]));
console.log("Generated Hamlet Windows icon: icon.ico");
