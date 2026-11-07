// Minimal PNG reader for the asset pack: 8-bit truecolour (RGB/RGBA), non-interlaced.
// Enough to inspect the 16x16 cells of a sheet without any dependency.
import fs from "node:fs";
import zlib from "node:zlib";

const SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function readPng(file) {
  const buf = fs.readFileSync(file);
  for (let i = 0; i < 8; i++) if (buf[i] !== SIG[i]) throw new Error("not a png");
  let p = 8;
  let ihdr = null;
  const idat = [];
  let palette = null;
  let trns = null;
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    p += 12 + len;
    if (type === "IHDR")
      ihdr = {
        w: data.readUInt32BE(0),
        h: data.readUInt32BE(4),
        depth: data[8],
        color: data[9],
        interlace: data[12],
      };
    else if (type === "IDAT") idat.push(Buffer.from(data));
    else if (type === "PLTE") palette = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IEND") break;
  }
  if (!ihdr || ihdr.interlace) throw new Error("only non-interlaced png");
  if (ihdr.depth !== 8) throw new Error(`depth ${ihdr.depth} unsupported`);
  const channels = ihdr.color === 6 ? 4 : ihdr.color === 2 ? 3 : 1;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = ihdr.w * channels;
  const out = Buffer.alloc(ihdr.h * stride);
  let o = 0;
  for (let y = 0; y < ihdr.h; y++) {
    const filter = raw[o++];
    const line = raw.subarray(o, o + stride);
    o += stride;
    const up = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0;
      const b = up ? up[x] : 0;
      const c = up && x >= channels ? up[x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pp = a + b - c;
        const pa = Math.abs(pp - a),
          pb = Math.abs(pp - b),
          pc = Math.abs(pp - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }
  const rgba = Buffer.alloc(ihdr.w * ihdr.h * 4);
  for (let i = 0; i < ihdr.w * ihdr.h; i++) {
    if (channels === 4) {
      out.copy(rgba, i * 4, i * 4, i * 4 + 4);
    } else if (channels === 3) {
      rgba[i * 4] = out[i * 3];
      rgba[i * 4 + 1] = out[i * 3 + 1];
      rgba[i * 4 + 2] = out[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    } else {
      const idx = out[i];
      rgba[i * 4] = palette[idx * 3];
      rgba[i * 4 + 1] = palette[idx * 3 + 1];
      rgba[i * 4 + 2] = palette[idx * 3 + 2];
      rgba[i * 4 + 3] = trns ? (idx < trns.length ? trns[idx] : 255) : 255;
    }
  }
  return { w: ihdr.w, h: ihdr.h, rgba };
}

/** Every 16x16 cell of the sheet, with coverage and the average colour. */
export function cells(png, size = 16) {
  const list = [];
  const cols = Math.floor(png.w / size);
  const rows = Math.floor(png.h / size);
  for (let ry = 0; ry < rows; ry++)
    for (let cx = 0; cx < cols; cx++) {
      let n = 0,
        r = 0,
        g = 0,
        b = 0;
      const shades = new Set();
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const i = ((ry * size + y) * png.w + cx * size + x) * 4;
          if (png.rgba[i + 3] < 128) continue;
          n++;
          r += png.rgba[i];
          g += png.rgba[i + 1];
          b += png.rgba[i + 2];
          shades.add(
            `${png.rgba[i] >> 4},${png.rgba[i + 1] >> 4},${png.rgba[i + 2] >> 4}`,
          );
        }
      list.push({
        cx,
        cy: ry,
        i: ry * cols + cx,
        coverage: n / (size * size),
        shades: shades.size,
        rgb: n ? [Math.round(r / n), Math.round(g / n), Math.round(b / n)] : null,
      });
    }
  return { cols, rows, list };
}

export const hex = (rgb) =>
  "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

/* ------------------------------------------------------------------ *
 * Writing: an 8-bit RGBA png, filter 0, so crops can be looked at.
 * ------------------------------------------------------------------ */

const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

export function writePng(file, w, h, rgba) {
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  fs.writeFileSync(
    file,
    Buffer.concat([
      Buffer.from(SIG),
      chunk("IHDR", ihdr),
      chunk("IDAT", zlib.deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** A nearest-neighbour crop of one cell (or a block of cells) at `scale`. */
export function crop(png, cx, cy, cellsX, cellsY, cell, scale) {
  const w = cellsX * cell * scale;
  const h = cellsY * cell * scale;
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const sx = cx * cell + Math.floor(x / scale);
      const sy = cy * cell + Math.floor(y / scale);
      const i = (sy * png.w + sx) * 4;
      const o = (y * w + x) * 4;
      // Checkerboard under the transparency, so empty space is obvious.
      const on = ((x / cell | 0) + (y / cell | 0)) % 2 === 0;
      const bg = on ? [40, 44, 48] : [24, 27, 30];
      const a = png.rgba[i + 3] / 255;
      out[o] = Math.round(png.rgba[i] * a + bg[0] * (1 - a));
      out[o + 1] = Math.round(png.rgba[i + 1] * a + bg[1] * (1 - a));
      out[o + 2] = Math.round(png.rgba[i + 2] * a + bg[2] * (1 - a));
      out[o + 3] = 255;
    }
  return { w, h, rgba: out };
}
