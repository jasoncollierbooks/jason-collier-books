/* Oil Studio
   Alla-prima sketch of wet oil paint. It is not a physics simulation.

   What it does:
   - Mixes pigments with a per-channel Kubelka–Munk reflectance curve, so
     colors darken and shift instead of averaging in straight RGB.
   - Lays bristle streaks. Each bristle carries its own paint and picks up
     what it crosses, so a stroke smears a tail of the last color.
   - While paint is wet, a stroke also pulls color forward from behind the
     brush. The knife does this more than it deposits new paint, and it can
     scrape back toward the linen.
   - A light ridge on each bristle suggests thick paint.

   What it does not do:
   - No drying time, solvent, canvas weave absorption, or real impasto height.
   - Not a spectral mix, so some tube pairs will not match real paint.
   - Simpler blend uses nearest-neighbor samples and fewer stamps. It still
     mixes and smears, with less streak detail.
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
  round: { bristles: 8, rx: 1, ry: 1, spread: 0.9, groove: 0.48, smear: 0.42, deposit: 0.74, pickup: 0.18 },
  flat: { bristles: 11, rx: 1.55, ry: 0.36, spread: 1.5, groove: 0.66, smear: 0.5, deposit: 0.7, pickup: 0.22 },
  filbert: { bristles: 9, rx: 1.18, ry: 0.56, spread: 1.12, groove: 0.55, smear: 0.46, deposit: 0.72, pickup: 0.2 },
  knife: { bristles: 8, rx: 1.8, ry: 0.2, spread: 1.75, groove: 0.08, smear: 0.74, deposit: 0.24, pickup: 0.32, scrape: 0.1 }
};

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

function fillGround(data, w, h) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const weaveX = (x & 3) < 2 ? 9 : -7;
      const weaveY = (y & 3) < 2 ? -6 : 8;
      const n = ((x * 17 + y * 13) & 15) - 7;
      const fiber = Math.sin(x * 0.31) * Math.cos(y * 0.17) * 5;
      const blot = Math.sin(x * 0.02 + y * 0.013) * 4;
      const v = weaveX + weaveY + n * 0.45 + fiber + blot;
      data[i] = clampByte(226 + v);
      data[i + 1] = clampByte(214 + v * 0.92);
      data[i + 2] = clampByte(194 + v * 0.75);
      data[i + 3] = 255;
    }
  }
}

function makeBristles(kind, rgb) {
  const n = TUNE[kind].bristles;
  const list = [];
  for (let i = 0; i < n; i++) {
    list.push({ rgb: [rgb[0], rgb[1], rgb[2]], load: 1, sr: 0, sg: 0, sb: 0, n: 0 });
  }
  return list;
}

export function createEngine(w, h, options) {
  const simple = !!(options && options.simple);
  const maxUndo = (options && options.maxUndo) || (simple ? 5 : 8);
  const image = new Uint8ClampedArray(w * h * 4);
  const ground = new Uint8ClampedArray(w * h * 4);
  const wet = new Uint8Array(w * h);
  fillGround(ground, w, h);
  image.set(ground);

  let kind = "round";
  let radius = 24;
  let well = OILS.find(oil => oil.id === "red").rgb.slice();
  let bristles = makeBristles(kind, well);
  const undo = [];
  let useSimple = simple;

  let tmp = new Uint8ClampedArray(16);
  let tmpWet = new Uint8Array(4);
  let region = { x: 0, y: 0, w: 0, h: 0 };

  function ensureTmp(pixels) {
    if (tmp.length < pixels * 4) tmp = new Uint8ClampedArray(pixels * 4);
    if (tmpWet.length < pixels) tmpWet = new Uint8Array(pixels);
  }

  function copyRegion(x0, y0, x1, y1) {
    region.x = x0;
    region.y = y0;
    region.w = x1 - x0 + 1;
    region.h = y1 - y0 + 1;
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
      return {
        rgb: [tmp[i], tmp[i + 1], tmp[i + 2]],
        wet: tmpWet[iy * region.w + ix] / 255
      };
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
    const wetHere = tmpWet[Math.round(ly) * region.w + Math.round(lx)] / 255;
    return { rgb, wet: wetHere };
  }

  function groundAt(x, y) {
    const gx = Math.max(0, Math.min(w - 1, Math.round(x)));
    const gy = Math.max(0, Math.min(h - 1, Math.round(y)));
    const i = (gy * w + gx) * 4;
    return [ground[i], ground[i + 1], ground[i + 2]];
  }

  function shapeMask(across, along, rad) {
    const tune = TUNE[kind];
    if (kind === "round") {
      const d = Math.hypot(across, along) / rad;
      if (d >= 1) return 0;
      return 1 - smoothstep(0.58, 1, d);
    }
    const ax = Math.abs(across) / (rad * tune.rx);
    const ay = Math.abs(along) / (rad * tune.ry);
    if (ax >= 1 || ay >= 1) return 0;
    const e = Math.sqrt(Math.pow(ax, 2.2) + Math.pow(ay, 2.2));
    if (e >= 1) return 0;
    return 1 - smoothstep(kind === "flat" ? 0.42 : 0.55, 1, e);
  }

  function resetPickup() {
    for (let i = 0; i < bristles.length; i++) {
      const b = bristles[i];
      b.sr = 0;
      b.sg = 0;
      b.sb = 0;
      b.n = 0;
    }
  }

  function applyPickup(pressure) {
    const take = TUNE[kind].pickup * (0.7 + 0.3 * pressure);
    for (let i = 0; i < bristles.length; i++) {
      const b = bristles[i];
      if (b.n > 0) {
        const avg = [b.sr / b.n, b.sg / b.n, b.sb / b.n];
        b.rgb = mixKM(b.rgb, avg, Math.min(0.55, take));
        b.load = Math.max(0.42, b.load - 0.004 * pressure);
      }
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
    if (lx >= 0 && ly >= 0 && lx < region.w && ly < region.h) {
      return tmpWet[ly * region.w + lx] / 255;
    }
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

  function stampBristle(cx, cy, dirX, dirY, perpX, perpY, rad, pressure, mode) {
    const tune = TUNE[kind];
    const halfW = rad * tune.spread;
    const reach = Math.ceil(rad * Math.max(tune.rx, tune.ry, 1));
    const smear = rad * tune.smear * (mode === "dab" ? 0.28 : 1);
    const x0 = Math.max(0, Math.floor(cx - reach - smear - 2));
    const y0 = Math.max(0, Math.floor(cy - reach - smear - 2));
    const x1 = Math.min(w - 1, Math.ceil(cx + reach + 2));
    const y1 = Math.min(h - 1, Math.ceil(cy + reach + 2));
    copyRegion(x0, y0, x1, y1);
    resetPickup();
    const n = bristles.length;
    const step = 1;
    for (let py = Math.floor(cy - reach); py <= cy + reach; py += step) {
      if (py < 0 || py >= h) continue;
      for (let px = Math.floor(cx - reach); px <= cx + reach; px += step) {
        if (px < 0 || px >= w) continue;
        const dx = px - cx;
        const dy = py - cy;
        const across = dx * perpX + dy * perpY;
        const along = dx * dirX + dy * dirY;
        const shape = shapeMask(across, along, rad);
        if (shape <= 0) continue;
        const u = across / halfW;
        if (u < -1.05 || u > 1.05) continue;
        const f = ((Math.max(-1, Math.min(1, u)) + 1) * 0.5) * (n - 1);
        const i0 = Math.max(0, Math.min(n - 2, Math.floor(f)));
        const t = Math.min(1, Math.max(0, f - i0));
        const nearest = t < 0.5 ? i0 : Math.min(n - 1, i0 + 1);
        const onBristle = 1 - Math.sin(Math.min(t, 1) * Math.PI);
        const bristleMask = 0.5 + 0.5 * Math.pow(Math.max(0, onBristle), 0.8);
        const lay = shape * bristleMask * (0.82 + 0.18 * pressure);
        if (lay < 0.04) continue;
        const under = preStamp(px, py);
        const underWet = wetAt(px, py);
        const lagJ = 0.68 + 0.4 * ((nearest % 3) / 2);
        const curl = Math.sin(nearest * 1.7) * rad * (useSimple ? 0 : 0.07);
        const lag = smear * lagJ;
        const behind = sampleAt(px - dirX * lag + perpX * curl, py - dirY * lag + perpY * curl);
        const carry = bristles[nearest].rgb;
        const deposit = tune.deposit * bristles[nearest].load * pressure * (0.78 + 0.22 * onBristle);
        const push = 1.05 * underWet;
        const tNew = deposit / (deposit + push + 1e-4);
        let mixed = mixKM(under, carry, Math.max(0, Math.min(1, tNew)));
        if (behind.wet > 0.12 && mode !== "dab") {
          const pull = Math.min(0.48, 0.34 + 0.2 * ((nearest % 2) ? 1 : 0)) * behind.wet;
          mixed = mixKM(mixed, behind.rgb, pull);
        }
        const shine = 1 + (onBristle - 0.4) * 0.08;
        mixed = [
          clampByte(mixed[0] * shine),
          clampByte(mixed[1] * shine),
          clampByte(mixed[2] * shine)
        ];
        writePixel(px, py, mixed, lay);
        if (underWet > 0.08) {
          const b = bristles[nearest];
          const m = lay;
          b.sr += under[0] * m;
          b.sg += under[1] * m;
          b.sb += under[2] * m;
          b.n += m;
        }
      }
    }
    applyPickup(pressure);
    return { x0: Math.max(0, Math.floor(cx - reach)), y0: Math.max(0, Math.floor(cy - reach)), x1: Math.min(w - 1, Math.ceil(cx + reach)), y1: Math.min(h - 1, Math.ceil(cy + reach)) };
  }

  function stampKnife(cx, cy, dirX, dirY, perpX, perpY, rad, pressure, mode) {
    const tune = TUNE.knife;
    const half = rad * tune.rx;
    const thick = Math.max(1.6, rad * tune.ry);
    const lag = rad * tune.smear * (mode === "dab" ? 0.25 : 1);
    const reach = Math.ceil(half + thick + 2);
    const x0 = Math.max(0, Math.floor(cx - reach - lag - 2));
    const y0 = Math.max(0, Math.floor(cy - reach - lag - 2));
    const x1 = Math.min(w - 1, Math.ceil(cx + reach + 2));
    const y1 = Math.min(h - 1, Math.ceil(cy + reach + 2));
    copyRegion(x0, y0, x1, y1);
    resetPickup();
    const n = bristles.length;
    const acrossSteps = Math.max(8, Math.ceil(half * 2));
    for (let s = 0; s <= acrossSteps; s++) {
      const a = -half + (s / acrossSteps) * (half * 2);
      const edge = 1 - Math.abs(a) / half;
      if (edge <= 0) continue;
      const bi = Math.min(n - 1, Math.floor((s / acrossSteps) * n));
      const sx = cx - dirX * lag + perpX * a * 0.94;
      const sy = cy - dirY * lag + perpY * a * 0.94;
      const sampled = sampleAt(sx, sy);
      const carry = bristles[bi].rgb;
      const deposit = tune.deposit * bristles[bi].load * pressure;
      const push = 0.62 + 0.5 * sampled.wet;
      const tNew = Math.min(0.38, deposit / (deposit + push));
      let moved = mixKM(sampled.rgb, carry, tNew);
      const scrape = tune.scrape * (1 - bristles[bi].load * 0.35);
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
        const b = bristles[bi];
        b.sr += sampled.rgb[0];
        b.sg += sampled.rgb[1];
        b.sb += sampled.rgb[2];
        b.n += 1;
      }
    }
    applyPickup(pressure);
    return {
      x0: Math.max(0, Math.floor(cx - reach)),
      y0: Math.max(0, Math.floor(cy - reach)),
      x1: Math.min(w - 1, Math.ceil(cx + reach)),
      y1: Math.min(h - 1, Math.ceil(cy + reach))
    };
  }

  function stamp(x, y, dirX, dirY, pressure, mode) {
    const len = Math.hypot(dirX, dirY) || 1;
    const dx = dirX / len;
    const dy = dirY / len;
    const perpX = -dy;
    const perpY = dx;
    const p = Math.max(0.3, Math.min(1, pressure || 0.85));
    const rad = Math.max(2, radius * (0.76 + 0.24 * p));
    if (kind === "knife") return stampKnife(x, y, dx, dy, perpX, perpY, rad, p, mode || "draw");
    return stampBristle(x, y, dx, dy, perpX, perpY, rad, p, mode || "draw");
  }

  function carriedAverage() {
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < bristles.length; i++) {
      r += bristles[i].rgb[0];
      g += bristles[i].rgb[1];
      b += bristles[i].rgb[2];
    }
    const n = bristles.length || 1;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  return {
    get image() { return image; },
    get wet() { return wet; },
    get w() { return w; },
    get h() { return h; },
    get kind() { return kind; },
    get radius() { return radius; },
    set radius(v) { radius = v; },
    get simple() { return useSimple; },
    set simple(v) { useSimple = !!v; },
    get well() { return well; },
    stamp,
    dip(rgb) {
      well = [rgb[0], rgb[1], rgb[2]];
      bristles = makeBristles(kind, well);
    },
    setWell(rgb) {
      well = [rgb[0], rgb[1], rgb[2]];
    },
    wipe() {
      bristles = makeBristles(kind, well);
    },
    setKind(next) {
      if (!TUNE[next]) return;
      const keep = carriedAverage();
      kind = next;
      bristles = makeBristles(kind, keep);
    },
    carry() {
      return carriedAverage();
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
    canUndo() {
      return undo.length > 0;
    },
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
  const ring = document.getElementById("studio-ring");
  const palette = document.getElementById("studio-palette");
  const brushes = document.getElementById("studio-brushes");

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  let engine = null;
  let frameData = null;
  let oil = OILS.find(item => item.id === "red");
  let kind = "round";
  let simple = autoSimple();
  let drawing = false;
  let pointerId = null;
  let last = null;
  let lastDir = { x: 1, y: 0 };
  let leftover = 0;
  let lastTime = 0;
  let dirty = null;

  const KIND_LABEL = { round: "Round brush", flat: "Flat brush", filbert: "Filbert brush", knife: "Palette knife" };

  function autoSimple() {
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const save = navigator.connection && navigator.connection.saveData;
    if (save || mem <= 2 || cores <= 2) return true;
    return false;
  }

  function cssSize() {
    return Math.max(8, Number(sizeInput.value) || 28);
  }

  function bufferScale() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return 1;
    return canvas.width / rect.width;
  }

  function applyRadius() {
    if (!engine) return;
    const px = cssSize() * bufferScale();
    const cap = Math.min(canvas.width, canvas.height) * 0.22;
    engine.radius = Math.max(4, Math.min(px, cap));
  }

  function markDirty(box) {
    if (!box) return;
    if (!dirty) dirty = { x0: box.x0, y0: box.y0, x1: box.x1, y1: box.y1 };
    else {
      dirty.x0 = Math.min(dirty.x0, box.x0);
      dirty.y0 = Math.min(dirty.y0, box.y0);
      dirty.x1 = Math.max(dirty.x1, box.x1);
      dirty.y1 = Math.max(dirty.y1, box.y1);
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

  function syncChrome() {
    const carry = engine.carry();
    chip.style.background = `rgb(${carry[0]}, ${carry[1]}, ${carry[2]})`;
    const dirtyBrush = Math.abs(carry[0] - oil.rgb[0]) + Math.abs(carry[1] - oil.rgb[1]) + Math.abs(carry[2] - oil.rgb[2]) > 22;
    statusEl.textContent = dirtyBrush
      ? `${KIND_LABEL[kind]}. ${oil.pigment} is mixing on the brush.`
      : `${KIND_LABEL[kind]}. ${oil.pigment}.`;
    undoBtn.disabled = !engine.canUndo();
    qualityBtn.setAttribute("aria-pressed", simple ? "true" : "false");
    qualityBtn.textContent = simple ? "Richer" : "Simpler";
    qualityBtn.setAttribute("aria-label", simple ? "Richer blend" : "Simpler blend");
    noteEl.textContent = simple
      ? "Simpler blend is on. Paint still smears and mixes, with less streak detail. Switch to the richer blend if this device can take it."
      : "Wet paint smears and mixes as you drag. This is a studio sketch of oils, not a full physics model.";
    sizeRead.textContent = String(cssSize());
    sizeInput.setAttribute("aria-valuenow", String(cssSize()));
    if (ring) ring.dataset.kind = kind;
  }

  function rebuild(keepPaint) {
    const rect = frame.getBoundingClientRect();
    const cssW = Math.max(2, rect.width);
    const cssH = Math.max(2, rect.height);
    const dpr = Math.min(window.devicePixelRatio || 1, simple ? 1 : 1.35);
    let bw = Math.max(2, Math.round(cssW * dpr));
    let bh = Math.max(2, Math.round(cssH * dpr));
    const cap = simple ? 640000 : 1100000;
    const pixels = bw * bh;
    if (pixels > cap) {
      const s = Math.sqrt(cap / pixels);
      bw = Math.max(2, Math.round(bw * s));
      bh = Math.max(2, Math.round(bh * s));
    }
    let prevPaint = null;
    let prevWet = null;
    let prevW = 0;
    let prevH = 0;
    let prevCarry = null;
    if (keepPaint && engine && canvas.width > 0) {
      prevPaint = engine.image.slice();
      prevWet = engine.wet.slice();
      prevW = engine.w;
      prevH = engine.h;
      prevCarry = engine.carry();
    }
    canvas.width = bw;
    canvas.height = bh;
    engine = createEngine(bw, bh, { simple, maxUndo: simple ? 5 : 8 });
    engine.simple = simple;
    engine.setKind(kind);
    if (prevCarry) {
      engine.dip(prevCarry);
      engine.setWell(oil.rgb);
    } else {
      engine.dip(oil.rgb);
    }
    if (prevPaint) {
      const src = document.createElement("canvas");
      src.width = prevW;
      src.height = prevH;
      const sctx = src.getContext("2d", { alpha: false });
      sctx.putImageData(new ImageData(prevPaint, prevW, prevH), 0, 0);
      const scaled = document.createElement("canvas");
      scaled.width = bw;
      scaled.height = bh;
      const dctx = scaled.getContext("2d", { alpha: false });
      dctx.imageSmoothingEnabled = true;
      dctx.drawImage(src, 0, 0, bw, bh);
      engine.image.set(dctx.getImageData(0, 0, bw, bh).data);
      const wetSrc = document.createElement("canvas");
      wetSrc.width = prevW;
      wetSrc.height = prevH;
      const wctx = wetSrc.getContext("2d");
      const wid = wctx.createImageData(prevW, prevH);
      for (let i = 0; i < prevW * prevH; i++) {
        const v = prevWet[i];
        wid.data[i * 4] = v;
        wid.data[i * 4 + 1] = v;
        wid.data[i * 4 + 2] = v;
        wid.data[i * 4 + 3] = 255;
      }
      wctx.putImageData(wid, 0, 0);
      const wetScaled = document.createElement("canvas");
      wetScaled.width = bw;
      wetScaled.height = bh;
      const ws = wetScaled.getContext("2d");
      ws.imageSmoothingEnabled = true;
      ws.drawImage(wetSrc, 0, 0, bw, bh);
      const wr = ws.getImageData(0, 0, bw, bh).data;
      for (let i = 0; i < bw * bh; i++) engine.wet[i] = wr[i * 4];
    }
    frameData = new ImageData(engine.image, bw, bh);
    applyRadius();
    syncChrome();
    flush(true);
  }

  function eventPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  function pressureFrom(e, speedScale) {
    let p = 0.88;
    if (e.pointerType === "pen" && e.pressure > 0) p = 0.28 + e.pressure * 0.72;
    return Math.max(0.34, Math.min(1, p * speedScale));
  }

  function paintSegment(from, to, pressure, mode) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      markDirty(engine.stamp(to.x, to.y, lastDir.x, lastDir.y, pressure, "dab"));
      return;
    }
    const ux = dx / dist;
    const uy = dy / dist;
    lastDir = { x: ux, y: uy };
    const spacing = Math.max(1.2, engine.radius * (simple ? 0.36 : 0.2));
    let traveled = leftover;
    while (traveled + spacing <= dist) {
      traveled += spacing;
      const x = from.x + ux * traveled;
      const y = from.y + uy * traveled;
      markDirty(engine.stamp(x, y, ux, uy, pressure, mode));
    }
    leftover = dist - traveled;
  }

  function placeRing(clientX, clientY) {
    if (!ring) return;
    const rect = frame.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const x = clientX - canvasRect.left;
    const y = clientY - canvasRect.top;
    const size = cssSize();
    const wide = kind === "flat" || kind === "knife" ? size * 1.65 : kind === "filbert" ? size * 1.15 : size;
    const tall = kind === "flat" || kind === "knife" ? size * 0.5 : kind === "filbert" ? size * 0.68 : size;
    const offsetX = canvasRect.left - rect.left;
    const offsetY = canvasRect.top - rect.top;
    ring.hidden = false;
    ring.style.width = `${wide * 2}px`;
    ring.style.height = `${tall * 2}px`;
    ring.style.transform = `translate(${offsetX + x - wide}px, ${offsetY + y - tall}px)`;
  }

  function selectOil(next) {
    oil = next;
    engine.dip(oil.rgb);
    palette.querySelectorAll("[data-oil]").forEach(btn => {
      const on = btn.dataset.oil === oil.id;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    syncChrome();
  }

  function selectKind(next) {
    kind = next;
    engine.setKind(kind);
    brushes.querySelectorAll("[data-kind]").forEach(btn => {
      const on = btn.dataset.kind === kind;
      btn.setAttribute("aria-checked", on ? "true" : "false");
      btn.tabIndex = on ? 0 : -1;
    });
    syncChrome();
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

  brushes.querySelectorAll("[data-kind]").forEach(btn => {
    btn.addEventListener("click", () => selectKind(btn.dataset.kind));
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

  function down(e) {
    if (pointerId !== null) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no pointer to capture */ }
    pointerId = e.pointerId;
    drawing = true;
    document.documentElement.classList.add("studio-painting");
    engine.pushUndo();
    leftover = 0;
    lastTime = e.timeStamp;
    last = eventPos(e);
    lastDir = { x: 1, y: 0 };
    markDirty(engine.stamp(last.x, last.y, 1, 0, pressureFrom(e, 1), "dab"));
    flush(false);
    syncChrome();
    placeRing(e.clientX, e.clientY);
  }

  function move(e) {
    if (e.pointerId !== pointerId || !drawing || !last) {
      if (e.pointerType !== "touch") placeRing(e.clientX, e.clientY);
      return;
    }
    e.preventDefault();
    const pos = eventPos(e);
    const dist = Math.hypot(pos.x - last.x, pos.y - last.y);
    const dt = Math.max(8, e.timeStamp - lastTime);
    const speed = dist / dt;
    const speedScale = Math.max(0.4, Math.min(1, 1.08 - speed * 0.62));
    const pressure = pressureFrom(e, speedScale);
    if (dist > engine.radius * 8) {
      const steps = Math.ceil(dist / (engine.radius * 0.45));
      const cap = Math.min(steps, 36);
      for (let i = 1; i <= cap; i++) {
        const t = i / cap;
        const x = last.x + (pos.x - last.x) * t;
        const y = last.y + (pos.y - last.y) * t;
        markDirty(engine.stamp(x, y, pos.x - last.x, pos.y - last.y, pressure, "draw"));
      }
      leftover = 0;
    } else {
      paintSegment(last, pos, pressure, "draw");
    }
    last = pos;
    lastTime = e.timeStamp;
    flush(false);
    syncChrome();
    placeRing(e.clientX, e.clientY);
  }

  function up(e) {
    if (e.pointerId !== pointerId) return;
    drawing = false;
    pointerId = null;
    leftover = 0;
    document.documentElement.classList.remove("studio-painting");
    flush(false);
    syncChrome();
  }

  canvas.addEventListener("pointerdown", down, { passive: false });
  canvas.addEventListener("pointermove", move, { passive: false });
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  canvas.addEventListener("pointerleave", e => {
    if (!drawing && ring) ring.hidden = true;
    if (e.pointerId === pointerId && drawing) up(e);
  });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  frame.addEventListener("pointermove", e => {
    if (!drawing && e.pointerType !== "touch") placeRing(e.clientX, e.clientY);
  });
  frame.addEventListener("pointerleave", () => {
    if (!drawing && ring) ring.hidden = true;
  });

  document.addEventListener("touchmove", e => {
    if (drawing) e.preventDefault();
  }, { passive: false });

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => rebuild(true), 160);
  });

  rebuild(false);
}

if (typeof document !== "undefined") mount();
