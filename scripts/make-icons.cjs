const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// App accent (matches --accent in editor.css) and the white "<>" brand mark.
const ACCENT = [0x7c, 0x6c, 0xf0];
const WHITE = [0xff, 0xff, 0xff];
const SS = 4; // supersampling factor for anti-aliasing

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

// Is the point inside the rounded-square background (all coords in super-sample space)?
function insideRoundedSquare(x, y, S) {
  const radius = S * 0.2;
  const minX = radius, maxX = S - radius, minY = radius, maxY = S - radius;
  const qx = Math.max(minX - x, 0, x - maxX);
  const qy = Math.max(minY - y, 0, y - maxY);
  return Math.hypot(qx, qy) <= radius;
}

// Opacity of the "<>" mark at a point: 1 on the left chevron, 0.5 on the right, 0 elsewhere.
function markOpacity(x, y, S) {
  const half = (S * 0.11) / 2;
  const onLeft =
    Math.min(
      distToSegment(x, y, S * 0.44, S * 0.3, S * 0.3, S * 0.5),
      distToSegment(x, y, S * 0.44, S * 0.7, S * 0.3, S * 0.5)
    ) <= half;
  if (onLeft) return 1;
  const onRight =
    Math.min(
      distToSegment(x, y, S * 0.56, S * 0.3, S * 0.7, S * 0.5),
      distToSegment(x, y, S * 0.56, S * 0.7, S * 0.7, S * 0.5)
    ) <= half;
  if (onRight) return 0.5;
  return 0;
}

function makeIcon(size) {
  const S = size * SS;
  const raw = Buffer.alloc((size * 4 + 1) * size);

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // PNG filter type: none
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, coveredSubs = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x * SS + sx + 0.5;
          const py = y * SS + sy + 0.5;
          if (!insideRoundedSquare(px, py, S)) continue; // transparent outside
          const op = markOpacity(px, py, S);
          // Composite the mark (white @ op) over the opaque accent background.
          r += WHITE[0] * op + ACCENT[0] * (1 - op);
          g += WHITE[1] * op + ACCENT[1] * (1 - op);
          b += WHITE[2] * op + ACCENT[2] * (1 - op);
          coveredSubs++;
        }
      }
      const n = SS * SS;
      const off = rowStart + 1 + x * 4;
      if (coveredSubs === 0) {
        raw[off] = raw[off + 1] = raw[off + 2] = raw[off + 3] = 0;
      } else {
        raw[off] = Math.round(r / coveredSubs);
        raw[off + 1] = Math.round(g / coveredSubs);
        raw[off + 2] = Math.round(b / coveredSubs);
        raw[off + 3] = Math.round((coveredSubs / n) * 255);
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
for (const size of [16, 48, 128]) {
  const png = makeIcon(size);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
