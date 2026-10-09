/* Oil Studio (test build)
   Alla-prima sketch of wet oil paint. It is not a physics simulation.

   What it does:
   - Mixes pigments with a per-channel Kubelka–Munk reflectance curve, so
     colors darken and shift instead of averaging in straight RGB.
   - The brush carries paint on each bristle. Bristles can hold different
     colors (double-loaded or streaky from the palette) and the paint runs
     out as you paint, ending in a dry, broken scumble.
   - Bristle texture is fine irregular noise, not evenly spaced lines.
   - A mixing palette is a second wet surface. Brush or knife smear paint
     there and pick it up, half-mixed.
   - Techniques: knife scraped highlights that break on the canvas tooth,
     fan-brush tapped evergreen branches, stippled bushes, soft blending,
     and light touch that leaves paint on top of wet paint.

   What it does not do:
   - No drying time, solvent, or real impasto height.
   - Not a spectral mix, so some tube pairs will not match real paint.
*/
export const OILS = [
  { id: "white", name: "White", pigment: "Titanium White", rgb: [244, 240, 230] },
  { id: "yellow", name: "Yellow", pigment: "Cadmium Yellow", rgb: [242, 194, 0] },
  { id: "ochre", name: "Yellow Ochre", pigment: "Yellow Ochre", rgb: [198, 146, 48] },
  { id: "red", name: "Red", pigment: "Cadmium Red", rgb: [216, 58, 46] },
  { id: "crimson", name: "Crimson", pigment: "Alizarin Crimson", rgb: [142, 28, 58] },
  { id: "blue", name: "Blue", pigment: "Ultramarine Blue", rgb: [30, 58, 138] },
  { id: "cobalt", name: "Cobalt Blue", pigment: "Cobalt Blue", rgb: [62, 118, 186] },
  { id: "green", name: "Green", pigment: "Viridian", rgb: [31, 106, 69] },
  { id: "umber", name: "Umber", pigment: "Burnt Umber", rgb: [106, 59, 34] },
  { id: "black", name: "Ivory Black", pigment: "Ivory Black", rgb: [48, 44, 40] }
];

const TUNE = {
  round: { bristles: 9, rx: 1, ry: 1, spread: 0.9, smear: 0.42, deposit: 0.74, pickup: 0.18, use: 0.003 },
  flat: { bristles: 12, rx: 1.55, ry: 0.36, spread: 1.5, smear: 0.5, deposit: 0.7, pickup: 0.22, use: 0.0028 },
  filbert: { bristles: 10, rx: 1.18, ry: 0.56, spread: 1.12, smear: 0.46, deposit: 0.72, pickup: 0.2, use: 0.0028 },
  knife: { bristles: 10, rx: 1.8, ry: 0.2, spread: 1.75, smear: 0.74, deposit: 0.24, pickup: 0.32, scrape: 0.1, use: 0.003 },
  fan: { bristles: 14, rx: 1.6, ry: 0.4, spread: 1.6, smear: 0.3, deposit: 0.85, pickup: 0.035, use: 0.016 },
  one: { bristles: 12, rx: 1.3, ry: 0.5, spread: 1.3, smear: 0.35, deposit: 0.8, pickup: 0.15, use: 0.012 },
  big: { bristles: 16, rx: 1.7, ry: 0.42, spread: 1.7, smear: 0.62, deposit: 0.66, pickup: 0.24, use: 0.002 }
};
export const KINDS = Object.keys(TUNE);

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
function rToKs(reflectance) {
  const r = reflectance < 0.02 ? 0.02 : reflectance > 0.98 ? 0.98 : reflectance;
  return ((1 - r) * (1 - r)) / (2 * r);
}
function ksToR(ks) {
  return 1 + ks - Math.sqrt(ks * (ks + 2));
}
function mixChan(a, b, t) {
  const ks = rToKs(a / 255) * (1 - t) + rToKs(b / 255) * t;
  return clampByte(Math.round(ksToR(ks) * 255));
}
/** Pigment mix. t is the share of color b (0 = all a, 1 = all b). */
export function mixKM(a, b, t) {
  if (t <= 0) return [a[0], a[1], a[2]];
  if (t >= 1) return [b[0], b[1], b[2]];
  return [mixChan(a[0], b[0], t), mixChan(a[1], b[1], t), mixChan(a[2], b[2], t)];
}
function smoothstep(e0, e1, x) {
  const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0 || 1)));
  return t * t * (3 - 2 * t);
}
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function valueNoise(x, y, cell) {
  const gx = x / cell;
  const gy = y / cell;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy) + (hash2(ix + 1, iy) - hash2(ix, iy)) * sx;
  const b = hash2(ix, iy + 1) + (hash2(ix + 1, iy + 1) - hash2(ix, iy + 1)) * sx;
  return a + (b - a) * sy;
}
function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* Linen: an irregular weave, so thin paint never shows a regular comb. */
function fillGround(data, tooth, w, h, base) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const n1 = hash2(x, y);
      const n2 = hash2(x >> 1, (y >> 1) + 977);
      if (base) {
        const grain = Math.sin(x * 0.045 + Math.sin(y * 0.02) * 3) * 6 + (n1 - 0.5) * 6;
        data[i] = clampByte(base[0] + grain);
        data[i + 1] = clampByte(base[1] + grain * 0.9);
        data[i + 2] = clampByte(base[2] + grain * 0.75);
        data[i + 3] = 255;
        tooth[y * w + x] = Math.round(n1 * 255);
        continue;
      }
      const weave = (Math.sin(x * 1.37 + n2 * 2.4) * Math.sin(y * 1.29 + n2 * 2.1)) * 4.2;
      const fiber = Math.sin(x * 0.31 + y * 0.05) * Math.cos(y * 0.17) * 3;
      const blot = Math.sin(x * 0.02 + y * 0.013) * 4;
      const v = weave + fiber + blot + (n1 - 0.5) * 6;
      data[i] = clampByte(226 + v);
      data[i + 1] = clampByte(214 + v * 0.92);
      data[i + 2] = clampByte(194 + v * 0.75);
      data[i + 3] = 255;
      tooth[y * w + x] = clampByte(Math.round(128 + weave * 18 + (n1 - 0.5) * 120 + (n2 - 0.5) * 60));
    }
  }
}

function makeFiber(rand) {
  const raw = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) raw[i] = rand();
  const out = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    out[i] = raw[i] * 0.5 + raw[(i + 1) & 1023] * 0.3 + raw[(i + 1023) & 1023] * 0.2;
  }
  return out;
}

function makeBristles(kind, rgb) {
  const n = TUNE[kind].bristles;
  const list = [];
  for (let i = 0; i < n; i++) list.push({ rgb: [rgb[0], rgb[1], rgb[2]], load: 1, sr: 0, sg: 0, sb: 0, n: 0 });
  return list;
}

/** A brush (or knife) that two surfaces can share: the canvas and the palette. */
export function createBrush(kind, rgb) {
  const k = TUNE[kind] ? kind : "round";
  return { kind: k, bristles: makeBristles(k, rgb || [216, 58, 46]) };
}

export function createEngine(w, h, options) {
  const opts = options || {};
  const simple = !!opts.simple;
  const maxUndo = opts.maxUndo || (simple ? 5 : 8);
  const pickBoost = opts.pickBoost || 1;
  const image = new Uint8ClampedArray(w * h * 4);
  const ground = new Uint8ClampedArray(w * h * 4);
  const tooth = new Uint8Array(w * h);
  const wet = new Uint8Array(w * h);
  fillGround(ground, tooth, w, h, opts.ground || null);
  image.set(ground);

  const rand = rng(opts.seed || 1234567);
  const fiber = makeFiber(rand);
  let fOff = 0;
  let radius = 24;
  let well = OILS.find(oil => oil.id === "red").rgb.slice();
  let brush = opts.brush || createBrush("round", well);
  let style = "normal";
  let touch = "normal";
  let scale = 1;
  const undo = [];
  let useSimple = simple;

  let tmp = new Uint8ClampedArray(16);
  let tmpWet = new Uint8Array(4);
  const region = { x: 0, y: 0, w: 0, h: 0 };

  function ensureTmp(pixels) {
    if (tmp.length < pixels * 4) tmp = new Uint8ClampedArray(pixels * 4);
    if (tmpWet.length < pixels) tmpWet = new Uint8Array(pixels);
  }
  function copyRegion(x0, y0, x1, y1) {
    region.x = x0;
    region.y = y0;
    region.w = Math.max(1, x1 - x0 + 1);
    region.h = Math.max(1, y1 - y0 + 1);
    ensureTmp(region.w * region.h);
    for (let row = 0; row < region.h; row++) {
      const src = ((y0 + row) * w + x0) * 4;
      tmp.set(image.subarray(src, src + region.w * 4), row * region.w * 4);
      const wi = (y0 + row) * w + x0;
      tmpWet.set(wet.subarray(wi, wi + region.w), row * region.w);
    }
  }
  function sampleAt(x, y) {
    let lx = x - region.x;
    let ly = y - region.y;
    if (lx < 0) lx = 0;
    if (ly < 0) ly = 0;
    if (lx > region.w - 1) lx = region.w - 1;
    if (ly > region.h - 1) ly = region.h - 1;
    if (useSimple) {
      const ix = Math.round(lx);
      const iy = Math.round(ly);
      const i = (iy * region.w + ix) * 4;
      return { rgb: [tmp[i], tmp[i + 1], tmp[i + 2]], wet: tmpWet[iy * region.w + ix] / 255 };
    }
    const x0 = Math.floor(lx);
    const y0 = Math.floor(ly);
    const x1 = Math.min(region.w - 1, x0 + 1);
    const y1 = Math.min(region.h - 1, y0 + 1);
    const tx = lx - x0;
    const ty = ly - y0;
    const i00 = (y0 * region.w + x0) * 4;
    const i10 = (y0 * region.w + x1) * 4;
    const i01 = (y1 * region.w + x0) * 4;
    const i11 = (y1 * region.w + x1) * 4;
    const rgb = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
      const a = tmp[i00 + c] + (tmp[i10 + c] - tmp[i00 + c]) * tx;
      const b = tmp[i01 + c] + (tmp[i11 + c] - tmp[i01 + c]) * tx;
      rgb[c] = a + (b - a) * ty;
    }
    return { rgb, wet: tmpWet[Math.round(ly) * region.w + Math.round(lx)] / 255 };
  }
  function groundAt(x, y) {
    const gx = Math.max(0, Math.min(w - 1, Math.round(x)));
    const gy = Math.max(0, Math.min(h - 1, Math.round(y)));
    const i = (gy * w + gx) * 4;
    return [ground[i], ground[i + 1], ground[i + 2]];
  }
  function shapeMask(across, along, rad) {
    const tune = TUNE[brush.kind];
    if (brush.kind === "round") {
      const d = Math.hypot(across, along) / rad;
      if (d >= 1) return 0;
      return 1 - smoothstep(0.58, 1, d);
    }
    const ax = Math.abs(across) / (rad * tune.rx);
    const ay = Math.abs(along) / (rad * tune.ry);
    if (ax >= 1 || ay >= 1) return 0;
    const e = Math.sqrt(Math.pow(ax, 2.2) + Math.pow(ay, 2.2));
    if (e >= 1) return 0;
    return 1 - smoothstep(brush.kind === "flat" || brush.kind === "big" ? 0.42 : 0.55, 1, e);
  }
  function resetPickup() {
    const list = brush.bristles;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      b.sr = 0; b.sg = 0; b.sb = 0; b.n = 0;
    }
  }
  function applyPickup(pressure) {
    const list = brush.bristles;
    const take = TUNE[brush.kind].pickup * (0.7 + 0.3 * pressure) * pickBoost;
    const cap = pickBoost > 1 ? 0.8 : 0.55;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      if (b.n > 0) {
        const avg = [b.sr / b.n, b.sg / b.n, b.sb / b.n];
        b.rgb = mixKM(b.rgb, avg, Math.min(cap, take));
        if (pickBoost > 1) b.load = Math.min(1, b.load + 0.05 * pickBoost * Math.min(1, b.n / 20));
        else b.load = Math.min(1, b.load + 0.0004);
      }
    }
  }
  function deplete(pressure, amount) {
    if (pickBoost > 1 || !amount) return;
    const list = brush.bristles;
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const jitter = 0.7 + 0.6 * fiber[(i * 37 + fOff) & 1023];
      b.load = Math.max(0.03, b.load - amount * (0.5 + 0.5 * pressure) * jitter);
    }
  }
  function preStamp(px, py) {
    const lx = px - region.x;
    const ly = py - region.y;
    if (lx >= 0 && ly >= 0 && lx < region.w && ly < region.h) {
      const ti = (ly * region.w + lx) * 4;
      return [tmp[ti], tmp[ti + 1], tmp[ti + 2]];
    }
    const i = (py * w + px) * 4;
    return [image[i], image[i + 1], image[i + 2]];
  }
  function wetAt(px, py) {
    const lx = px - region.x;
    const ly = py - region.y;
    if (lx >= 0 && ly >= 0 && lx < region.w && ly < region.h) return tmpWet[ly * region.w + lx] / 255;
    return wet[py * w + px] / 255;
  }
  function writePixel(px, py, color, lay) {
    if (px < 0 || py < 0 || px >= w || py >= h || lay < 0.03) return;
    const i = (py * w + px) * 4;
    const out = mixKM(preStamp(px, py), color, Math.min(1, lay));
    image[i] = out[0];
    image[i + 1] = out[1];
    image[i + 2] = out[2];
    image[i + 3] = 255;
    const wi = py * w + px;
    const painted = Math.round(Math.min(1, lay) * 255);
    if (painted > wet[wi]) wet[wi] = painted;
  }
  function box(cx, cy, reach) {
    return {
      x0: Math.max(0, Math.floor(cx - reach)),
      y0: Math.max(0, Math.floor(cy - reach)),
      x1: Math.min(w - 1, Math.ceil(cx + reach)),
      y1: Math.min(h - 1, Math.ceil(cy + reach))
    };
  }

  /* Round, flat, filbert, 1-inch and 2-inch: bristle streaks with fine,
     irregular texture. No evenly spaced lines. */
  function stampBristle(cx, cy, dirX, dirY, perpX, perpY, rad, pressure, mode) {
    const tune = TUNE[brush.kind];
    const light = touch === "light";
    const blendOnly = style === "blend";
    const halfW = rad * tune.spread;
    const reach = Math.ceil(rad * Math.max(tune.rx, tune.ry, 1));
    const smear = rad * tune.smear * (mode === "dab" ? 0.28 : 1);
    const x0 = Math.max(0, Math.floor(cx - reach - smear - 2));
    const y0 = Math.max(0, Math.floor(cy - reach - smear - 2));
    const x1 = Math.min(w - 1, Math.ceil(cx + reach + smear + 2));
    const y1 = Math.min(h - 1, Math.ceil(cy + reach + smear + 2));
    copyRegion(x0, y0, x1, y1);
    resetPickup();
    const list = brush.bristles;
    const n = list.length;
    for (let py = Math.floor(cy - reach); py <= cy + reach; py++) {
      if (py < 0 || py >= h) continue;
      for (let px = Math.floor(cx - reach); px <= cx + reach; px++) {
        if (px < 0 || px >= w) continue;
        const dx = px - cx;
        const dy = py - cy;
        const across = dx * perpX + dy * perpY;
        const along = dx * dirX + dy * dirY;
        const shape = shapeMask(across, along, rad);
        if (shape <= 0) continue;
        const u = across / halfW;
        if (u < -1.05 || u > 1.05) continue;
        const fi = Math.round(across * 1.45) + fOff;
        const fib = fiber[fi & 1023];
        const fib2 = fiber[(fi + 311) & 1023];
        let f = ((Math.max(-1, Math.min(1, u)) + 1) * 0.5) * (n - 1) + (fib - 0.5) * 1.4;
        const bi = f <= 0 ? 0 : f >= n - 1 ? n - 1 : Math.round(f);
        const b = list[bi];
        let lay = shape * (0.86 + 0.14 * fib) * (0.82 + 0.18 * pressure);
        if (lay < 0.04) continue;
        const under = preStamp(px, py);
        const underWet = wetAt(px, py);
        const lag = smear * (0.7 + 0.35 * fib2);
        const behind = sampleAt(px - dirX * lag, py - dirY * lag);
        let mixed;
        if (blendOnly) {
          const k = (0.25 + 0.45 * pressure) * (0.3 + 0.7 * Math.max(behind.wet, underWet));
          mixed = mixKM(under, behind.rgb, Math.min(0.7, k));
          lay *= 0.9;
        } else {
          if (b.load < 0.4) {
            // Running dry: paint only catches on the high points of the weave.
            const need = (0.4 - b.load) * 2.2 + (1 - pressure) * 0.2;
            const t = tooth[py * w + px] / 255;
            if (t < need) continue;
            lay *= Math.min(1, (t - need) * 3 + 0.2);
          }
          const deposit = tune.deposit * Math.pow(b.load, 0.7) * pressure * (0.85 + 0.3 * fib);
          const push = (light ? 0.14 : 0.72) * underWet;
          const tNew = deposit / (deposit + push + 1e-4);
          mixed = mixKM(under, b.rgb, Math.max(0, Math.min(1, tNew)));
          if (behind.wet > 0.12 && mode !== "dab" && !light) {
            mixed = mixKM(mixed, behind.rgb, (0.34 + 0.14 * fib2) * behind.wet);
          }
        }
        const shine = 1 + (fib - 0.5) * 0.05;
        mixed = [clampByte(mixed[0] * shine), clampByte(mixed[1] * shine), clampByte(mixed[2] * shine)];
        writePixel(px, py, mixed, lay);
        if (underWet > 0.08) {
          const m = lay * (light ? 0.35 : 1);
          b.sr += under[0] * m;
          b.sg += under[1] * m;
          b.sb += under[2] * m;
          b.n += m;
        }
      }
    }
    applyPickup(pressure);
    deplete(pressure, blendOnly ? 0 : tune.use);
    return box(cx, cy, reach);
  }

  /* Free knife: moves wet paint more than it lays new paint. */
  function stampKnife(cx, cy, dirX, dirY, perpX, perpY, rad, pressure, mode) {
    const tune = TUNE.knife;
    const half = rad * tune.rx;
    const thick = Math.max(1.6, rad * tune.ry);
    const lag = rad * tune.smear * (mode === "dab" ? 0.25 : 1);
    const reach = Math.ceil(half + thick + 2);
    const x0 = Math.max(0, Math.floor(cx - reach - lag - 2));
    const y0 = Math.max(0, Math.floor(cy - reach - lag - 2));
    const x1 = Math.min(w - 1, Math.ceil(cx + reach + lag + 2));
    const y1 = Math.min(h - 1, Math.ceil(cy + reach + lag + 2));
    copyRegion(x0, y0, x1, y1);
    resetPickup();
    const list = brush.bristles;
    const n = list.length;
    const acrossSteps = Math.max(8, Math.ceil(half * 2));
    for (let s = 0; s <= acrossSteps; s++) {
      const a = -half + (s / acrossSteps) * (half * 2);
      const edge = 1 - Math.abs(a) / half;
      if (edge <= 0) continue;
      const bi = Math.min(n - 1, Math.floor((s / acrossSteps) * n));
      const sampled = sampleAt(cx - dirX * lag + perpX * a * 0.94, cy - dirY * lag + perpY * a * 0.94);
      const b = list[bi];
      const deposit = tune.deposit * b.load * pressure;
      const push = 0.62 + 0.5 * sampled.wet;
      const tNew = Math.min(0.38, deposit / (deposit + push));
      let moved = mixKM(sampled.rgb, b.rgb, tNew);
      const scrape = tune.scrape * (1 - b.load * 0.35);
      moved = mixKM(moved, groundAt(cx + perpX * a, cy + perpY * a), scrape);
      const tSteps = Math.ceil(thick);
      for (let t = -tSteps; t <= tSteps; t++) {
        const feather = (1 - Math.abs(t) / (thick + 0.001)) * Math.min(1, edge * 1.25);
        if (feather < 0.05) continue;
        const px = Math.round(cx + perpX * a + dirX * t * 0.85);
        const py = Math.round(cy + perpY * a + dirY * t * 0.85);
        writePixel(px, py, moved, Math.min(1, feather));
        if (px >= 0 && py >= 0 && px < w && py < h) {
          const wi = py * w + px;
          wet[wi] = Math.max(40, Math.round(wet[wi] * (1 - scrape * 0.35)));
        }
      }
      if (sampled.wet > 0.05) {
        b.sr += sampled.rgb[0];
        b.sg += sampled.rgb[1];
        b.sb += sampled.rgb[2];
        b.n += 1;
      }
    }
    applyPickup(pressure);
    deplete(pressure, tune.use);
    return box(cx, cy, reach);
  }

  /* Mountain knife: the roll of paint on the blade edge catches on the
     tooth of the canvas and breaks. Faster or lighter strokes break more. */
  function stampKnifeLay(cx, cy, dirX, dirY, perpX, perpY, rad, pressure) {
    const light = touch === "light";
    const half = rad * 1.25;
    const thick = Math.max(1.5, rad * 0.24);
    const reach = Math.ceil(half + thick + 2);
    copyRegion(Math.max(0, Math.floor(cx - reach)), Math.max(0, Math.floor(cy - reach)), Math.min(w - 1, Math.ceil(cx + reach)), Math.min(h - 1, Math.ceil(cy + reach)));
    const list = brush.bristles;
    const n = list.length;
    let used = 0;
    for (let py = Math.floor(cy - reach); py <= cy + reach; py++) {
      if (py < 0 || py >= h) continue;
      for (let px = Math.floor(cx - reach); px <= cx + reach; px++) {
        if (px < 0 || px >= w) continue;
        const dx = px - cx;
        const dy = py - cy;
        const across = dx * perpX + dy * perpY;
        const along = dx * dirX + dy * dirY;
        if (Math.abs(across) > half || Math.abs(along) > thick) continue;
        const edge = Math.min(1, (1 - Math.abs(across) / half) * 3) * (1 - Math.abs(along) / (thick + 0.5));
        if (edge <= 0.05) continue;
        const fi = Math.round(across * 1.3) + fOff;
        const fib = fiber[fi & 1023];
        const u = (across / half + 1) * 0.5;
        const bi = Math.max(0, Math.min(n - 1, Math.round(u * (n - 1) + (fib - 0.5) * 1.6)));
        const b = list[bi];
        if (b.load < 0.05) continue;
        const t = valueNoise(px + fOff * 7, py, 4.5) * 0.6 + valueNoise(px, py + fOff, 1.6) * 0.25 + (tooth[py * w + px] / 255) * 0.15;
        const need = (light ? 0.34 : 0.06) + (1 - pressure) * 0.45 + (1 - b.load) * 0.3;
        if (t < need) continue;
        const catchAmt = Math.min(1, (t - need) * 5 + 0.35);
        const under = preStamp(px, py);
        const underWet = wetAt(px, py);
        const tNew = light ? 0.94 : 0.82 / (0.82 + 0.45 * underWet);
        const mixed = mixKM(under, b.rgb, tNew);
        writePixel(px, py, mixed, edge * catchAmt * (0.75 + 0.25 * pressure));
        used++;
      }
    }
    if (used) deplete(pressure, (light ? 0.00006 : 0.0001) * rad);
    return box(cx, cy, reach);
  }

  /* Fan brush tap: a burst of fine branches either side of the trunk line. */
  function stampFan(cx, cy, rad, pressure) {
    const light = touch === "light";
    const reach = Math.ceil(rad * 1.3) + 3;
    copyRegion(Math.max(0, Math.floor(cx - reach)), Math.max(0, Math.floor(cy - reach)), Math.min(w - 1, Math.ceil(cx + reach)), Math.min(h - 1, Math.ceil(cy + reach)));
    resetPickup();
    const list = brush.bristles;
    const n = list.length;
    const count = Math.min(48, 12 + Math.round(rad * 0.7));
    const thickness = Math.max(1, rad / 22);
    for (let k = 0; k < count; k++) {
      const side = rand() < 0.5 ? -1 : 1;
      const bi = Math.min(n - 1, Math.floor(((side < 0 ? 0 : 0.5) + rand() * 0.5) * n));
      const b = list[bi];
      if (b.load < 0.04) continue;
      const ang = (0.42 + rand() * 0.62) * (Math.PI / 2); // from straight down, mostly sideways
      const vx = side * Math.sin(ang);
      const vy = Math.cos(ang) * 0.9 + 0.1;
      const sx = cx + side * rand() * rad * 0.12;
      const sy = cy + (rand() - 0.6) * rad * 0.55;
      const len = rad * (0.3 + 0.8 * rand()) * (0.6 + 0.4 * pressure);
      const strength = (0.75 + 0.3 * pressure) * Math.pow(b.load, 0.5);
      for (let t = 0; t < len; t += 0.75) {
        const taper = 1 - t / len;
        const wob = Math.sin(t * 0.45 + k) * 0.6;
        const px = Math.round(sx + vx * t - vy * wob * 0.3);
        const py = Math.round(sy + vy * t + wob * 0.3);
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const under = preStamp(px, py);
        const underWet = wetAt(px, py);
        const tNew = light ? 0.95 : 0.9 / (0.9 + 0.25 * underWet);
        const mixed = mixKM(under, b.rgb, tNew);
        const lay = Math.min(1, strength * (0.6 + 0.5 * taper));
        writePixel(px, py, mixed, lay);
        if (thickness > 1.2 && taper > 0.3) writePixel(px, py + 1, mixed, lay * 0.6);
        if (underWet > 0.1 && !light) {
          b.sr += under[0] * 0.3; b.sg += under[1] * 0.3; b.sb += under[2] * 0.3; b.n += 0.3;
        }
      }
    }
    applyPickup(pressure * 0.5);
    deplete(pressure, 0.00025 * rad);
    return box(cx, cy, reach);
  }

  /* 1-inch brush tapping: little clusters of paint for bushes and leaves. */
  function stampStipple(cx, cy, rad, pressure) {
    const light = touch === "light";
    const reach = Math.ceil(rad * 1.15) + 4;
    copyRegion(Math.max(0, Math.floor(cx - reach)), Math.max(0, Math.floor(cy - reach)), Math.min(w - 1, Math.ceil(cx + reach)), Math.min(h - 1, Math.ceil(cy + reach)));
    const list = brush.bristles;
    const n = list.length;
    const count = Math.min(120, 20 + Math.round(rad * 1.7));
    for (let k = 0; k < count; k++) {
      const b = list[Math.floor(rand() * n)];
      if (b.load < 0.04) continue;
      const ox = (rand() + rand() - 1) * rad * 1.05;
      const oy = (rand() + rand() - 1) * rad * 0.7 - rad * 0.08;
      const dr = 0.9 + rand() * Math.min(4, rad / 6);
      const shade = 0.8 + rand() * 0.3;
      const col = [clampByte(b.rgb[0] * shade), clampByte(b.rgb[1] * shade), clampByte(b.rgb[2] * shade)];
      const strength = (0.55 + 0.45 * pressure) * Math.pow(b.load, 0.6);
      const ir = Math.ceil(dr);
      for (let yy = -ir; yy <= ir; yy++) {
        for (let xx = -ir; xx <= ir; xx++) {
          const d = Math.hypot(xx, yy) / (dr + 0.01);
          if (d > 1) continue;
          const px = Math.round(cx + ox + xx);
          const py = Math.round(cy + oy + yy);
          if (px < 0 || py < 0 || px >= w || py >= h) continue;
          const under = preStamp(px, py);
          const underWet = wetAt(px, py);
          const tNew = light ? 0.95 : 0.78 / (0.78 + 0.55 * underWet);
          writePixel(px, py, mixKM(under, col, tNew), strength * (1 - d * d * 0.6));
        }
      }
    }
    deplete(pressure, 0.0004 * rad);
    return box(cx, cy, reach);
  }

  function stamp(x, y, dirX, dirY, pressure, mode) {
    const len = Math.hypot(dirX, dirY) || 1;
    const dx = dirX / len;
    const dy = dirY / len;
    const perpX = -dy;
    const perpY = dx;
    const p = Math.max(0.25, Math.min(1, pressure || 0.85));
    const rad = Math.max(2, radius * scale * (0.76 + 0.24 * p));
    if (style === "fan") return stampFan(x, y, rad, p);
    if (style === "stipple") return stampStipple(x, y, rad, p);
    if (style === "knifeLay") return stampKnifeLay(x, y, dx, dy, perpX, perpY, rad, p);
    if (brush.kind === "knife") return stampKnife(x, y, dx, dy, perpX, perpY, rad, p, mode || "draw");
    return stampBristle(x, y, dx, dy, perpX, perpY, rad, p, mode || "draw");
  }

  function carriedAverage() {
    const list = brush.bristles;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < list.length; i++) {
      r += list[i].rgb[0]; g += list[i].rgb[1]; b += list[i].rgb[2];
    }
    const n = list.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  return {
    get image() { return image; },
    get wet() { return wet; },
    get w() { return w; },
    get h() { return h; },
    get kind() { return brush.kind; },
    get radius() { return radius; },
    set radius(v) { radius = v; },
    get simple() { return useSimple; },
    set simple(v) { useSimple = !!v; },
    get style() { return style; },
    set style(v) { style = v || "normal"; },
    get touch() { return touch; },
    set touch(v) { touch = v === "light" ? "light" : "normal"; },
    get scale() { return scale; },
    set scale(v) { scale = Math.max(0.2, Math.min(2, v || 1)); },
    get well() { return well; },
    get brush() { return brush; },
    set brush(v) { if (v && v.bristles) brush = v; },
    stamp,
    newStroke() { fOff = Math.floor(rand() * 1024); },
    dip(rgb) {
      well = [rgb[0], rgb[1], rgb[2]];
      brush.bristles = makeBristles(brush.kind, well);
    },
    setWell(rgb) { well = [rgb[0], rgb[1], rgb[2]]; },
    wipe() { brush.bristles = makeBristles(brush.kind, well); },
    /** Load several colors: "double" splits the brush side to side, "streak" scatters them. */
    loadColors(colors, how) {
      const n = TUNE[brush.kind].bristles;
      const list = [];
      for (let i = 0; i < n; i++) {
        const u = n > 1 ? i / (n - 1) : 0.5;
        let rgb;
        if (how === "double" && colors.length > 1) {
          const t = smoothstep(0.32, 0.68, u + (rand() - 0.5) * 0.18);
          rgb = mixKM(colors[0], colors[1], t);
        } else {
          const a = colors[Math.floor(rand() * colors.length)];
          const b = colors[Math.floor(rand() * colors.length)];
          rgb = mixKM(a, b, rand() * 0.45);
        }
        list.push({ rgb, load: 1, sr: 0, sg: 0, sb: 0, n: 0 });
      }
      brush.bristles = list;
    },
    refill(amount) {
      brush.bristles.forEach(b => { b.load = Math.min(1, amount == null ? 1 : b.load + amount); });
    },
    loadLevel() {
      const list = brush.bristles;
      let s = 0;
      for (let i = 0; i < list.length; i++) s += list[i].load;
      return s / (list.length || 1);
    },
    setKind(next) {
      if (!TUNE[next]) return;
      if (next === brush.kind) return;
      const old = brush.bristles;
      const n = TUNE[next].bristles;
      const list = [];
      for (let i = 0; i < n; i++) {
        const src = old[Math.min(old.length - 1, Math.floor((i / n) * old.length))];
        list.push({ rgb: src.rgb.slice(), load: src.load, sr: 0, sg: 0, sb: 0, n: 0 });
      }
      brush.kind = next;
      brush.bristles = list;
    },
    carry() { return carriedAverage(); },
    colors() { return brush.bristles.map(b => b.rgb.slice()); },
    /** A fresh blob of paint, as if squeezed from the tube. */
    blob(x, y, r, rgb) {
      const reach = Math.ceil(r * 1.3);
      for (let py = Math.floor(y - reach); py <= y + reach; py++) {
        if (py < 0 || py >= h) continue;
        for (let px = Math.floor(x - reach); px <= x + reach; px++) {
          if (px < 0 || px >= w) continue;
          const a = Math.atan2(py - y, px - x);
          const edge = r * (1 + 0.12 * Math.sin(a * 3 + x) + 0.08 * Math.sin(a * 5 + y));
          const d = Math.hypot(px - x, py - y) / edge;
          if (d > 1) continue;
          const i = (py * w + px) * 4;
          const lay = 1 - smoothstep(0.75, 1, d);
          const hi = 1 + (0.25 - Math.min(0.25, Math.hypot(px - x + r * 0.3, py - y + r * 0.35) / (r * 2))) * 0.35;
          const out = mixKM([image[i], image[i + 1], image[i + 2]], rgb, lay);
          image[i] = clampByte(out[0] * hi);
          image[i + 1] = clampByte(out[1] * hi);
          image[i + 2] = clampByte(out[2] * hi);
          const wi = py * w + px;
          wet[wi] = Math.max(wet[wi], Math.round(lay * 255));
        }
      }
      return box(x, y, reach);
    },
    wetAt(x, y) {
      const ix = Math.max(0, Math.min(w - 1, Math.round(x)));
      const iy = Math.max(0, Math.min(h - 1, Math.round(y)));
      return wet[iy * w + ix] / 255;
    },
    pushUndo() {
      undo.push({ paint: image.slice(), wet: wet.slice() });
      if (undo.length > maxUndo) undo.shift();
    },
    undo() {
      const prev = undo.pop();
      if (!prev) return false;
      image.set(prev.paint);
      wet.set(prev.wet);
      return true;
    },
    canUndo() { return undo.length > 0; },
    clear() {
      image.set(ground);
      wet.fill(0);
    },
    pixel(x, y) {
      const ix = Math.max(0, Math.min(w - 1, Math.round(x)));
      const iy = Math.max(0, Math.min(h - 1, Math.round(y)));
      const i = (iy * w + ix) * 4;
      return [image[i], image[i + 1], image[i + 2]];
    }
  };
}

export const TECHNIQUES = {
  free: {
    label: "Free paint", kind: null, size: 28, touches: ["Firm", "Light touch"],
    hint: "Pick a brush and paint. Mix on the palette first for streaky, half-mixed color.",
    prep: "Working the paint into the brush."
  },
  mountain: {
    label: "Mountains", kind: "knife", size: 30, touches: ["Scrape", "Light touch"],
    hint: "Pull the knife down the slope. Go faster or lighter and the paint breaks, like snow catching on rock.",
    prep: "Pulling the paint into a thin roll on the knife edge."
  },
  trees: {
    label: "Trees", kind: "fan", size: 34, touches: ["Tap", "Light touch"],
    hint: "Start at the top and tap your way down. The fan brush opens into branches as the tree widens.",
    prep: "Tapping the fan brush into the paint so it's full to the tips."
  },
  bushes: {
    label: "Bushes", kind: "one", size: 22, touches: ["Tap", "Light touch"],
    hint: "Tap, don't drag. Little clusters build a happy little bush. Light touch lays highlights on top.",
    prep: "Tapping the 1-inch brush on the palette to load the tips."
  },
  sky: {
    label: "Sky", kind: "big", size: 52, touches: ["Crisscross", "Soft blend"],
    hint: "Crisscross big strokes, then switch to Soft blend to melt the sky together.",
    prep: "Working the paint deep into the 2-inch brush with little crisscross strokes."
  },
  water: {
    label: "Water", kind: "big", size: 44, touches: ["Pull across", "Blend down"],
    hint: "Pull straight across, then Blend down to pull reflections from the shore.",
    prep: "Loading the 2-inch brush with long, flat pulls."
  }
};

function mount() {
  const canvas = document.getElementById("studio-canvas");
  if (!canvas) return;
  const frame = document.getElementById("studio-frame");
  const statusEl = document.getElementById("studio-status");
  const noteEl = document.getElementById("studio-note");
  const chip = document.getElementById("studio-chip");
  const sizeInput = document.getElementById("studio-size");
  const sizeRead = document.getElementById("studio-size-read");
  const undoBtn = document.getElementById("studio-undo");
  const clearBtn = document.getElementById("studio-clear");
  const saveBtn = document.getElementById("studio-save");
  const wipeBtn = document.getElementById("studio-wipe");
  const qualityBtn = document.getElementById("studio-quality");
  const cursor = document.getElementById("studio-cursor");
  const printDialog = document.getElementById("studio-print-dialog");
  const printForm = document.getElementById("studio-print-form");
  const printBtn = document.getElementById("studio-print");
  const printCancel = document.getElementById("studio-print-cancel");
  const printNote = document.getElementById("studio-print-note");
  const titleInput = document.getElementById("studio-title");
  const painterInput = document.getElementById("studio-painter");
  const palette = document.getElementById("studio-palette");
  const brushes = document.getElementById("studio-brushes");
  const techBar = document.getElementById("studio-tech");
  const touchBar = document.getElementById("studio-touch");
  const hintEl = document.getElementById("studio-tech-hint");
  const mixCanvas = document.getElementById("studio-mix");
  const mixBox = document.getElementById("studio-mixbox");
  const prepTool = document.getElementById("studio-prep");
  const prepNote = document.getElementById("studio-prep-note");
  const reloadBtn = document.getElementById("studio-reload");
  const doubleBtn = document.getElementById("studio-double");
  const cleanBtn = document.getElementById("studio-clean");
  const meter = document.getElementById("studio-meter");

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const mixCtx = mixCanvas ? mixCanvas.getContext("2d", { alpha: false }) : null;
  const brush = createBrush("round", OILS.find(o => o.id === "red").rgb);
  let engine = null;
  let frameData = null;
  let mixEngine = null;
  let mixData = null;
  let oil = OILS.find(item => item.id === "red");
  let prevOil = OILS.find(item => item.id === "white");
  let freeKind = "round";
  let tech = "free";
  let touchIdx = 0;
  let simple = autoSimple();
  let drawing = false;
  let pointerId = null;
  let last = null;
  let start = null;
  let lastDir = { x: 1, y: 0 };
  let leftover = 0;
  let lastTime = 0;
  let dirty = null;
  let lastClient = null;
  let mixPointer = null;
  let mixLast = null;
  let prepRun = 0;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const KIND_LABEL = { round: "Round brush", flat: "Flat brush", filbert: "Filbert brush", knife: "Palette knife", fan: "Fan brush", one: "1-inch brush", big: "2-inch brush" };

  function autoSimple() {
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const save = navigator.connection && navigator.connection.saveData;
    return !!(save || mem <= 2 || cores <= 2);
  }
  function cssSize() { return Math.max(8, Number(sizeInput.value) || 28); }
  function bufferScale() {
    const rect = canvas.getBoundingClientRect();
    return rect.width ? canvas.width / rect.width : 1;
  }
  function applyRadius() {
    if (!engine) return;
    const px = cssSize() * bufferScale();
    const cap = Math.min(canvas.width, canvas.height) * 0.22;
    engine.radius = Math.max(4, Math.min(px, cap));
    if (mixEngine) {
      const r = mixCanvas.getBoundingClientRect();
      const ms = r.width ? mixCanvas.width / r.width : 1;
      mixEngine.radius = Math.max(4, Math.min(cssSize() * ms * 0.55, Math.min(mixCanvas.width, mixCanvas.height) * 0.2));
    }
  }
  function markDirty(b) {
    if (!b) return;
    if (!dirty) dirty = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    else {
      dirty.x0 = Math.min(dirty.x0, b.x0);
      dirty.y0 = Math.min(dirty.y0, b.y0);
      dirty.x1 = Math.max(dirty.x1, b.x1);
      dirty.y1 = Math.max(dirty.y1, b.y1);
    }
  }
  function flush(full) {
    if (!frameData) return;
    if (full || !dirty) {
      ctx.putImageData(frameData, 0, 0);
      dirty = null;
      return;
    }
    const x = Math.max(0, dirty.x0);
    const y = Math.max(0, dirty.y0);
    const dw = Math.min(canvas.width - x, dirty.x1 - x + 1);
    const dh = Math.min(canvas.height - y, dirty.y1 - y + 1);
    if (dw > 0 && dh > 0) ctx.putImageData(frameData, 0, 0, x, y, dw, dh);
    dirty = null;
  }
  function flushMix() {
    if (mixCtx && mixData) mixCtx.putImageData(mixData, 0, 0);
  }

  function applyTechnique() {
    const t = TECHNIQUES[tech];
    const kind = t.kind || freeKind;
    engine.setKind(kind);
    const light = touchIdx === 1;
    let style = "normal";
    if (tech === "mountain") style = "knifeLay";
    else if (tech === "trees") style = "fan";
    else if (tech === "bushes") style = "stipple";
    else if ((tech === "sky" || tech === "water") && light) style = "blend";
    engine.style = style;
    engine.touch = (tech === "sky" || tech === "water") ? "normal" : (light ? "light" : "normal");
    engine.scale = 1;
    if (mixEngine) {
      mixEngine.style = "normal";
      mixEngine.touch = "normal";
    }
  }

  function syncChrome() {
    const carry = engine.carry();
    const colors = engine.colors();
    const stops = colors.map((c, i) => `rgb(${c[0]},${c[1]},${c[2]}) ${Math.round((i / colors.length) * 100)}% ${Math.round(((i + 1) / colors.length) * 100)}%`).join(",");
    chip.style.background = `linear-gradient(90deg, ${stops})`;
    const level = engine.loadLevel();
    if (meter) {
      meter.style.setProperty("--load", String(Math.round(level * 100)));
      meter.setAttribute("aria-valuenow", String(Math.round(level * 100)));
    }
    const t = TECHNIQUES[tech];
    const toolName = KIND_LABEL[engine.kind];
    let state = `${oil.pigment}.`;
    const spread = colors.reduce((m, c) => Math.max(m, Math.abs(c[0] - carry[0]) + Math.abs(c[1] - carry[1]) + Math.abs(c[2] - carry[2])), 0);
    if (spread > 40) state = "Streaky mix on the brush.";
    else if (Math.abs(carry[0] - oil.rgb[0]) + Math.abs(carry[1] - oil.rgb[1]) + Math.abs(carry[2] - oil.rgb[2]) > 22) state = `${oil.pigment} is mixing on the brush.`;
    if (level < 0.18) state = "Brush is nearly dry. Reload on the palette.";
    const head = tech === "free" ? toolName : `${t.label}, ${toolName.toLowerCase()}`;
    statusEl.textContent = `${head}. ${state}`;
    undoBtn.disabled = !engine.canUndo();
    qualityBtn.setAttribute("aria-pressed", simple ? "true" : "false");
    qualityBtn.textContent = simple ? "Richer" : "Simpler";
    qualityBtn.setAttribute("aria-label", simple ? "Richer blend" : "Simpler blend");
    noteEl.textContent = simple
      ? "Simpler blend is on. Paint still smears and mixes, with less detail. Switch to the richer blend if this device can take it."
      : "Wet paint smears and mixes as you drag, and the brush runs dry as you paint. This is a studio sketch of oils, not a full physics model.";
    sizeRead.textContent = String(cssSize());
    sizeInput.setAttribute("aria-valuenow", String(cssSize()));
    if (hintEl) hintEl.textContent = t.hint;
    if (touchBar) {
      touchBar.querySelectorAll("[data-touch]").forEach((btn, i) => {
        btn.textContent = t.touches[i];
        btn.setAttribute("aria-checked", i === touchIdx ? "true" : "false");
        btn.tabIndex = i === touchIdx ? 0 : -1;
      });
    }
    placeRing();
  }

  function buildMix() {
    if (!mixCanvas) return;
    const rect = mixCanvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, simple ? 1 : 2);
    const bw = Math.max(2, Math.round(Math.max(40, rect.width) * dpr));
    const bh = Math.max(2, Math.round(Math.max(40, rect.height) * dpr));
    let prev = null;
    if (mixEngine) prev = { img: mixEngine.image.slice(), wet: mixEngine.wet.slice(), w: mixEngine.w, h: mixEngine.h };
    if (prev && prev.w === bw && prev.h === bh) return;
    mixCanvas.width = bw;
    mixCanvas.height = bh;
    mixEngine = createEngine(bw, bh, { simple, brush, pickBoost: 3, ground: [214, 196, 168], seed: 99 });
    if (prev) {
      const src = document.createElement("canvas");
      src.width = prev.w; src.height = prev.h;
      src.getContext("2d").putImageData(new ImageData(prev.img, prev.w, prev.h), 0, 0);
      const dst = document.createElement("canvas");
      dst.width = bw; dst.height = bh;
      const dctx = dst.getContext("2d");
      dctx.drawImage(src, 0, 0, bw, bh);
      mixEngine.image.set(dctx.getImageData(0, 0, bw, bh).data);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        mixEngine.wet[y * bw + x] = prev.wet[Math.floor(y * prev.h / bh) * prev.w + Math.floor(x * prev.w / bw)];
      }
    }
    mixData = new ImageData(mixEngine.image, bw, bh);
    flushMix();
  }

  function rebuild(keepPaint) {
    const rect = frame.getBoundingClientRect();
    const cssW = Math.max(2, rect.width);
    const cssH = Math.max(2, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, simple ? 1 : 2);
    let bw = Math.max(2, Math.round(cssW * dpr));
    let bh = Math.max(2, Math.round(cssH * dpr));
    const cap = simple ? 640000 : 1100000;
    if (bw * bh > cap) {
      const s = Math.sqrt(cap / (bw * bh));
      bw = Math.max(2, Math.round(bw * s));
      bh = Math.max(2, Math.round(bh * s));
    }
    let prev = null;
    if (keepPaint && engine && canvas.width > 0) prev = { img: engine.image.slice(), wet: engine.wet.slice(), w: engine.w, h: engine.h };
    canvas.width = bw;
    canvas.height = bh;
    engine = createEngine(bw, bh, { simple, maxUndo: simple ? 5 : 8, brush, seed: 4242 });
    engine.setWell(oil.rgb);
    if (prev) {
      const src = document.createElement("canvas");
      src.width = prev.w; src.height = prev.h;
      src.getContext("2d", { alpha: false }).putImageData(new ImageData(prev.img, prev.w, prev.h), 0, 0);
      const scaled = document.createElement("canvas");
      scaled.width = bw; scaled.height = bh;
      const dctx = scaled.getContext("2d", { alpha: false });
      dctx.imageSmoothingEnabled = true;
      dctx.drawImage(src, 0, 0, bw, bh);
      engine.image.set(dctx.getImageData(0, 0, bw, bh).data);
      for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) {
        engine.wet[y * bw + x] = prev.wet[Math.floor(y * prev.h / bh) * prev.w + Math.floor(x * prev.w / bw)];
      }
    }
    frameData = new ImageData(engine.image, bw, bh);
    buildMix();
    applyTechnique();
    applyRadius();
    syncChrome();
    flush(true);
  }

  function eventPos(e, el) {
    const rect = el.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (el.width / rect.width), y: (e.clientY - rect.top) * (el.height / rect.height) };
  }

  /* Real pressure when the device reports it (Apple Pencil, pen, force touch).
     Otherwise speed stands in: slow and deliberate is a firm stroke, quick is light. */
  function pressureFrom(e, speedScale) {
    const real = e.pressure > 0 && (e.pointerType === "pen" || (e.pointerType === "touch" && e.pressure !== 0.5 && e.pressure !== 1));
    let p;
    if (real) p = (0.25 + e.pressure * 0.75) * (0.85 + 0.15 * speedScale);
    else p = 0.95 * speedScale;
    if (touchIdx === 1 && tech !== "sky" && tech !== "water") p *= 0.72;
    return Math.max(0.25, Math.min(1, p));
  }

  function paintSegment(eng, from, to, pressure, mode, spacingK) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    const boxes = [];
    if (dist < 0.001) return boxes;
    const ux = dx / dist;
    const uy = dy / dist;
    lastDir = { x: ux, y: uy };
    const spacing = Math.max(1.2, eng.radius * eng.scale * (spacingK || (simple ? 0.36 : 0.2)));
    let at = Math.max(0, spacing - leftover);
    let count = 0;
    while (at <= dist && count < 400) {
      count++;
      boxes.push(eng.stamp(from.x + ux * at, from.y + uy * at, ux, uy, pressure, mode));
      at += spacing;
    }
    leftover = dist - (at - spacing);
    return boxes;
  }

  function treeScale(y) {
    const span = canvas.height * 0.4;
    const d = y - start.y;
    if (d >= 0) return 0.32 + 0.9 * Math.min(1, d / span);
    return Math.max(0.32, 1 - 0.68 * Math.min(1, -d / span));
  }

  /* Ring cursor: just the brush size, for mouse and pen hover. Nothing pops up on touch. */
  function placeRing(clientX, clientY, kindOfPointer) {
    if (!cursor) return;
    if (clientX != null) lastClient = { x: clientX, y: clientY, type: kindOfPointer };
    if (!lastClient || lastClient.type === "touch") {
      cursor.hidden = true;
      return;
    }
    const rect = frame.getBoundingClientRect();
    const d = Math.max(6, (engine.radius / bufferScale()) * 2 * (tech === "mountain" ? 1.25 : tech === "trees" ? 1.3 : 1));
    cursor.hidden = false;
    cursor.style.width = `${d}px`;
    cursor.style.height = `${tech === "mountain" ? Math.max(6, d * 0.3) : d}px`;
    cursor.style.transform = `translate(${lastClient.x - rect.left}px, ${lastClient.y - rect.top}px) translate(-50%, -50%)`;
  }
  function hideRing() {
    lastClient = null;
    if (cursor) cursor.hidden = true;
  }

  function openPrint(dataUrl, title, painter) {
    const popup = window.open("", "_blank", "noopener,width=900,height=1100");
    if (!popup) {
      if (printNote) printNote.textContent = "The browser blocked the print window. Allow pop-ups for this page, then try Print again.";
      return false;
    }
    const doc = popup.document;
    doc.open();
    doc.write("<!DOCTYPE html><html><head><meta charset='utf-8'><title></title></head><body></body></html>");
    doc.close();
    doc.title = title || "Oil Studio";
    const style = doc.createElement("style");
    style.textContent = "body{margin:1rem;text-align:center;font-family:Georgia,serif;color:#1a120c;background:#fff}img{max-width:100%;height:auto}h1{font-size:1.8rem;margin:.7rem 0 .15rem}p{font-size:1.35rem;margin:.1rem 0}@media print{body{margin:.4in}h1,p{color:#000}}";
    doc.head.appendChild(style);
    const img = doc.createElement("img");
    img.src = dataUrl;
    img.alt = title || "Oil painting";
    doc.body.appendChild(img);
    if (title) {
      const heading = doc.createElement("h1");
      heading.textContent = title;
      doc.body.appendChild(heading);
    }
    if (painter) {
      const who = doc.createElement("p");
      who.textContent = painter;
      doc.body.appendChild(who);
    }
    img.addEventListener("load", () => { popup.focus(); popup.print(); });
    return true;
  }

  /* Each tube squeezes a blob onto the mixing area, on the side facing the tube. */
  function blobSpot(item) {
    const idx = OILS.indexOf(item);
    const btn = palette.children[idx];
    const box = mixCanvas.getBoundingClientRect();
    const sx = mixCanvas.width / (box.width || 1);
    let ax = 0, ay = -1;
    if (btn) {
      const r = btn.getBoundingClientRect();
      ax = r.left + r.width / 2 - (box.left + box.width / 2);
      ay = r.top + r.height / 2 - (box.top + box.height / 2);
    }
    const len = Math.hypot(ax, ay) || 1;
    return {
      x: mixCanvas.width / 2 + (ax / len) * mixCanvas.width * 0.36,
      y: mixCanvas.height / 2 + (ay / len) * mixCanvas.height * 0.36,
      r: Math.max(6, 11 * sx)
    };
  }
  function squeeze(item) {
    if (!mixEngine) return;
    const s = blobSpot(item);
    const near = mixEngine.pixel(s.x, s.y);
    const same = Math.abs(near[0] - item.rgb[0]) + Math.abs(near[1] - item.rgb[1]) + Math.abs(near[2] - item.rgb[2]) < 30;
    if (!same || mixEngine.wetAt(s.x, s.y) < 0.5) mixEngine.blob(s.x, s.y, s.r, item.rgb);
    flushMix();
  }

  function selectOil(next) {
    if (next.id !== oil.id) prevOil = oil;
    oil = next;
    engine.dip(oil.rgb);
    squeeze(oil);
    palette.querySelectorAll("[data-oil]").forEach(btn => {
      const on = btn.dataset.oil === oil.id;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    syncChrome();
  }

  function selectKind(next) {
    freeKind = next;
    brushes.querySelectorAll("[data-kind]").forEach(btn => {
      const on = btn.dataset.kind === next;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    if (tech !== "free") selectTech("free", true);
    applyTechnique();
    syncChrome();
  }

  function selectTech(next, quiet) {
    if (!TECHNIQUES[next]) return;
    tech = next;
    touchIdx = 0;
    if (techBar) techBar.querySelectorAll("[data-tech]").forEach(btn => {
      const on = btn.dataset.tech === tech;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    if (next !== "free") {
      sizeInput.value = String(TECHNIQUES[next].size);
      brushes.querySelectorAll("[data-kind]").forEach(btn => btn.setAttribute("aria-checked", "false"));
    } else {
      brushes.querySelectorAll("[data-kind]").forEach(btn => btn.setAttribute("aria-checked", btn.dataset.kind === freeKind ? "true" : "false"));
    }
    applyTechnique();
    applyRadius();
    syncChrome();
    if (!quiet) prep();
  }

  /* The charming bit: the tool works the paint on the palette, and the
     palette paint really ends up on the brush. */
  function prepPath() {
    const W = mixCanvas.width;
    const H = mixCanvas.height;
    const s = blobSpot(oil);
    const pts = [];
    const add = (x, y, mode, hold) => pts.push({ x, y, mode, hold: hold || 0 });
    if (tech === "mountain") {
      // Pull the paint out flat, then cut a thin roll with the edge.
      add(s.x, s.y, "dab");
      for (let i = 1; i <= 10; i++) add(s.x + (W * 0.5 - s.x) * i / 10, s.y + (H * 0.55 - s.y) * i / 10, "draw");
      for (let k = 0; k < 2; k++) {
        for (let i = 0; i <= 10; i++) add(W * 0.2 + W * 0.6 * i / 10, H * 0.55 + k * 4, "draw");
        for (let i = 10; i >= 0; i--) add(W * 0.2 + W * 0.6 * i / 10, H * 0.58 + k * 4, "draw");
      }
      for (let i = 0; i <= 8; i++) add(W * 0.25 + W * 0.5 * i / 8, H * 0.62, "draw");
    } else if (tech === "trees" || tech === "bushes") {
      const cx = (s.x + W / 2) / 2;
      const cy = (s.y + H / 2) / 2;
      for (let k = 0; k < 6; k++) {
        add(cx + (k % 2 ? 3 : -3), cy - 10, "lift", 1);
        add(cx + (k % 2 ? 3 : -3), cy + (k % 3) * 2, "dab", 1);
      }
    } else if (tech === "sky" || tech === "water") {
      const cx = (s.x + W / 2) / 2;
      const cy = (s.y + H / 2) / 2;
      const r = Math.min(W, H) * 0.18;
      for (let k = 0; k < 5; k++) {
        const sgn = k % 2 ? 1 : -1;
        if (tech === "sky") {
          for (let i = 0; i <= 5; i++) add(cx - r + 2 * r * i / 5, cy + sgn * (r - 2 * r * i / 5), "draw");
        } else {
          for (let i = 0; i <= 5; i++) add(cx + sgn * (r - 2 * r * i / 5), cy + (k - 2) * 3, "draw");
        }
      }
    } else {
      const cx = (s.x + W / 2) / 2;
      const cy = (s.y + H / 2) / 2;
      for (let i = 0; i <= 18; i++) {
        const a = i / 18 * Math.PI * 3;
        add(cx + Math.cos(a) * 12, cy + Math.sin(a) * 8, i ? "draw" : "dab");
      }
    }
    return pts;
  }

  function finishPrep() {
    engine.refill(1);
    if (prepTool) {
      prepTool.hidden = true;
      prepTool.removeAttribute("data-tech");
    }
    if (prepNote) prepNote.textContent = "";
    syncChrome();
  }

  function prep() {
    if (!mixEngine || !mixCanvas) return;
    const run = ++prepRun;
    squeeze(oil);
    const pts = prepPath();
    const savedStyle = mixEngine.style;
    mixEngine.style = "normal";
    if (prepNote) prepNote.textContent = TECHNIQUES[tech].prep;
    if (reduceMotion || !prepTool) {
      let prevPt = null;
      pts.forEach(p => {
        if (p.mode === "lift") { prevPt = null; return; }
        if (!prevPt || p.mode === "dab") mixEngine.stamp(p.x, p.y, 1, 0, 0.9, "dab");
        else mixEngine.stamp(p.x, p.y, p.x - prevPt.x || 1, p.y - prevPt.y, 0.9, "draw");
        prevPt = p;
      });
      mixEngine.style = savedStyle;
      flushMix();
      finishPrep();
      return;
    }
    prepTool.hidden = false;
    prepTool.dataset.tech = tech;
    const box = mixCanvas.getBoundingClientRect();
    const host = mixBox.getBoundingClientRect();
    const k = box.width / mixCanvas.width;
    const offX = box.left - host.left;
    const offY = box.top - host.top;
    const total = 1300;
    const t0 = performance.now();
    let idx = 0;
    let prevPt = null;
    function frameStep(now) {
      if (run !== prepRun) return;
      const t = Math.max(0, Math.min(1, (now - t0) / total));
      const target = Math.floor(t * (pts.length - 1));
      while (idx <= target) {
        const p = pts[idx];
        if (p.mode === "lift") prevPt = null;
        else if (!prevPt || p.mode === "dab") mixEngine.stamp(p.x, p.y, 1, 0, 0.9, "dab");
        else mixEngine.stamp(p.x, p.y, p.x - prevPt.x || 1, p.y - prevPt.y, 0.9, "draw");
        if (p.mode !== "lift") prevPt = p;
        idx++;
      }
      const p = pts[Math.min(pts.length - 1, target)];
      const lift = p.mode === "lift" ? -10 : 0;
      prepTool.style.transform = `translate(${offX + p.x * k}px, ${offY + p.y * k + lift}px)`;
      flushMix();
      syncChrome();
      if (t < 1) requestAnimationFrame(frameStep);
      else {
        mixEngine.style = savedStyle;
        setTimeout(() => { if (run === prepRun) finishPrep(); }, 220);
      }
    }
    requestAnimationFrame(frameStep);
  }

  OILS.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "oil";
    btn.dataset.oil = item.id;
    btn.setAttribute("role", "radio");
    btn.setAttribute("aria-checked", item.id === oil.id ? "true" : "false");
    btn.tabIndex = item.id === oil.id ? 0 : -1;
    btn.setAttribute("aria-label", item.pigment);
    btn.innerHTML = `<span class="dab" style="--oil:rgb(${item.rgb[0]},${item.rgb[1]},${item.rgb[2]})"></span><span class="oil-name">${item.name}</span>`;
    btn.addEventListener("click", () => selectOil(item));
    palette.appendChild(btn);
    if (index === OILS.length - 1) btn.classList.add("oil-last");
  });

  brushes.querySelectorAll("[data-kind]").forEach(btn => btn.addEventListener("click", () => selectKind(btn.dataset.kind)));
  if (techBar) techBar.querySelectorAll("[data-tech]").forEach(btn => btn.addEventListener("click", () => selectTech(btn.dataset.tech)));
  if (touchBar) touchBar.querySelectorAll("[data-touch]").forEach((btn, i) => btn.addEventListener("click", () => {
    touchIdx = i;
    applyTechnique();
    syncChrome();
  }));
  if (reloadBtn) reloadBtn.addEventListener("click", () => prep());
  if (doubleBtn) doubleBtn.addEventListener("click", () => {
    engine.loadColors([oil.rgb, prevOil.rgb], "double");
    if (prepNote) prepNote.textContent = `Double-loaded: ${oil.name} on one side, ${prevOil.name} on the other.`;
    syncChrome();
  });
  if (cleanBtn) cleanBtn.addEventListener("click", () => {
    if (!mixEngine) return;
    mixEngine.clear();
    flushMix();
  });

  sizeInput.addEventListener("input", () => {
    applyRadius();
    syncChrome();
  });
  undoBtn.addEventListener("click", () => {
    if (!engine.undo()) return;
    flush(true);
    syncChrome();
  });
  clearBtn.addEventListener("click", () => {
    engine.pushUndo();
    engine.clear();
    flush(true);
    syncChrome();
  });
  wipeBtn.addEventListener("click", () => {
    engine.wipe();
    syncChrome();
  });
  qualityBtn.addEventListener("click", () => {
    simple = !simple;
    rebuild(true);
  });
  saveBtn.addEventListener("click", () => {
    flush(true);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "oil-studio.png";
    link.click();
  });
  if (printBtn && printDialog) {
    printBtn.addEventListener("click", () => {
      hideRing();
      if (printNote) printNote.textContent = "";
      if (typeof printDialog.showModal === "function") printDialog.showModal();
      if (titleInput) titleInput.focus();
    });
  }
  if (printCancel && printDialog) printCancel.addEventListener("click", () => printDialog.close());
  if (printForm) {
    printForm.addEventListener("submit", (e) => {
      e.preventDefault();
      flush(true);
      const title = (titleInput && titleInput.value.trim()) || "";
      const painter = (painterInput && painterInput.value.trim()) || "";
      const opened = openPrint(canvas.toDataURL("image/png"), title, painter);
      if (opened && printDialog.open) printDialog.close();
    });
  }

  function snap(pos) {
    if (tech !== "water") return pos;
    if (touchIdx === 0) return { x: pos.x, y: start.y + (pos.y - start.y) * 0.08 };
    return { x: start.x + (pos.x - start.x) * 0.08, y: Math.max(start.y, pos.y) };
  }

  function down(e) {
    if (pointerId !== null || mixPointer !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
    prepRun++;
    if (prepTool && !prepTool.hidden) finishPrep();
    pointerId = e.pointerId;
    drawing = true;
    document.documentElement.classList.add("studio-painting");
    engine.pushUndo();
    engine.newStroke();
    leftover = 0;
    lastTime = e.timeStamp;
    last = eventPos(e, canvas);
    start = { x: last.x, y: last.y };
    lastDir = tech === "water" && touchIdx === 1 ? { x: 0, y: 1 } : { x: 1, y: 0 };
    if (tech === "trees") engine.scale = treeScale(last.y);
    markDirty(engine.stamp(last.x, last.y, lastDir.x, lastDir.y, pressureFrom(e, 1), "dab"));
    flush(false);
    syncChrome();
    placeRing(e.clientX, e.clientY, e.pointerType);
  }

  function move(e) {
    if (e.pointerId !== pointerId || !drawing || !last) {
      if (e.pointerType !== "touch") placeRing(e.clientX, e.clientY, e.pointerType);
      return;
    }
    e.preventDefault();
    const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
    const list = events && events.length ? events : [e];
    for (const ev of list) {
      const pos = snap(eventPos(ev, canvas));
      const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
      const dt = Math.max(8, ev.timeStamp - lastTime);
      const speed = dist / dt / (bufferScale() || 1);
      const speedScale = Math.max(0.35, Math.min(1, 1.1 - speed * 0.55));
      const pressure = pressureFrom(ev, speedScale);
      let spacingK = null;
      if (tech === "trees") {
        engine.scale = treeScale(pos.y);
        spacingK = 0.3;
      } else if (tech === "bushes") spacingK = 0.6;
      else if (tech === "mountain") spacingK = 0.18;
      if (dist > engine.radius * 8 && !spacingK) {
        const cap = Math.min(Math.ceil(dist / (engine.radius * 0.45)), 36);
        for (let i = 1; i <= cap; i++) {
          const t = i / cap;
          markDirty(engine.stamp(last.x + (pos.x - last.x) * t, last.y + (pos.y - last.y) * t, pos.x - last.x, pos.y - last.y, pressure, "draw"));
        }
        leftover = 0;
      } else {
        paintSegment(engine, last, pos, pressure, "draw", spacingK).forEach(markDirty);
      }
      last = pos;
      lastTime = ev.timeStamp;
    }
    flush(false);
    syncChrome();
    if (e.pointerType !== "touch") placeRing(e.clientX, e.clientY, e.pointerType);
  }

  function up(e) {
    if (e.pointerId !== pointerId) return;
    drawing = false;
    pointerId = null;
    leftover = 0;
    engine.scale = 1;
    document.documentElement.classList.remove("studio-painting");
    flush(false);
    syncChrome();
    if (e.pointerType === "touch") hideRing();
  }

  canvas.addEventListener("pointerdown", down, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: false });
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  frame.addEventListener("pointerleave", () => { if (!drawing) hideRing(); });

  /* Mixing on the palette: the same brush, with stronger pickup. */
  if (mixCanvas) {
    mixCanvas.addEventListener("pointerdown", e => {
      if (pointerId !== null || mixPointer !== null) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      try { mixCanvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events */ }
      prepRun++;
      if (prepTool && !prepTool.hidden) finishPrep();
      mixPointer = e.pointerId;
      document.documentElement.classList.add("studio-painting");
      mixEngine.newStroke();
      leftover = 0;
      mixLast = eventPos(e, mixCanvas);
      mixEngine.stamp(mixLast.x, mixLast.y, 1, 0, 0.9, "dab");
      flushMix();
      syncChrome();
    }, { passive: false });
    mixCanvas.addEventListener("pointermove", e => {
      if (e.pointerId !== mixPointer) return;
      e.preventDefault();
      const pos = eventPos(e, mixCanvas);
      paintSegment(mixEngine, mixLast, pos, 0.9, "draw");
      mixLast = pos;
      flushMix();
      syncChrome();
    }, { passive: false });
    const mixUp = e => {
      if (e.pointerId !== mixPointer) return;
      mixPointer = null;
      leftover = 0;
      document.documentElement.classList.remove("studio-painting");
      syncChrome();
    };
    mixCanvas.addEventListener("pointerup", mixUp);
    mixCanvas.addEventListener("pointercancel", mixUp);
    mixCanvas.addEventListener("contextmenu", e => e.preventDefault());
  }

  document.addEventListener("touchmove", e => {
    if (drawing || mixPointer !== null) e.preventDefault();
  }, { passive: false });

  let resizeTimer = 0;
  let lastWidth = window.innerWidth;
  window.addEventListener("resize", () => {
    // iOS fires resize when the toolbar shows or hides; only rebuild on real width changes.
    if (Math.abs(window.innerWidth - lastWidth) < 2 && engine) return;
    lastWidth = window.innerWidth;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => rebuild(true), 160);
  });

  rebuild(false);
  engine.dip(oil.rgb);
  squeeze(OILS.find(o => o.id === "white"));
  squeeze(OILS.find(o => o.id === "blue"));
  squeeze(oil);
  syncChrome();
  window.__studio = { get engine() { return engine; }, get mixEngine() { return mixEngine; }, selectTech, selectOil: id => selectOil(OILS.find(o => o.id === id)), prep, flush: () => { flush(true); flushMix(); } };
}

if (typeof document !== "undefined") mount();
