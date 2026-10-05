import fs from "fs";
import { createEngine, mixKM, OILS } from "./studio.js";

const byId = Object.fromEntries(OILS.map(o => [o.id, o]));

function stroke(engine, x0, y0, x1, y1, pressure = 0.9) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const spacing = Math.max(1.2, engine.radius * (engine.simple ? 0.36 : 0.2));
  engine.stamp(x0, y0, ux, uy, pressure, "dab");
  for (let d = spacing; d <= dist; d += spacing) {
    engine.stamp(x0 + ux * d, y0 + uy * d, ux, uy, pressure, "draw");
  }
}

function dist(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

const yellow = byId.yellow.rgb;
const blue = byId.blue.rgb;
const mixed = mixKM(yellow, blue, 0.5);
const linear = yellow.map((v, i) => Math.round(v * 0.5 + blue[i] * 0.5));
const mixLum = mixed[0] * 0.3 + mixed[1] * 0.5 + mixed[2] * 0.2;
const linLum = linear[0] * 0.3 + linear[1] * 0.5 + linear[2] * 0.2;
if (!(mixLum < linLum - 8)) {
  throw new Error(`KM mix should darken vs straight RGB. mix ${mixed} lum ${mixLum.toFixed(1)} linear ${linear} lum ${linLum.toFixed(1)}`);
}
if (!(mixed[1] > mixed[0] && mixed[1] > mixed[2])) {
  throw new Error(`Yellow and blue should lean green, got ${mixed}`);
}

const engine = createEngine(420, 260, { simple: false });
engine.radius = 22;
engine.dip(byId.red.rgb);
engine.setKind("flat");
stroke(engine, 30, 120, 230, 120);

engine.dip(byId.blue.rgb);
engine.setKind("round");
stroke(engine, 120, 30, 120, 230);

engine.setKind("round");
engine.dip(byId.blue.rgb);
stroke(engine, 320, 30, 320, 230);

const overlap = engine.pixel(120, 120);
const pureBlue = byId.blue.rgb;
const pureRed = byId.red.rgb;
if (dist(overlap, pureBlue) < 40) throw new Error(`Overlap stayed too close to pure blue: ${overlap}`);
if (dist(overlap, pureRed) < 30) throw new Error(`Overlap stayed too close to pure red: ${overlap}`);

const samples = [];
for (let x = 100; x <= 140; x += 2) samples.push(engine.pixel(x, 120));
const meanR = samples.reduce((s, p) => s + p[0], 0) / samples.length;
const varR = samples.reduce((s, p) => s + (p[0] - meanR) ** 2, 0) / samples.length;
if (varR < 12) throw new Error(`Overlap looks flat (red variance ${varR.toFixed(1)})`);

const tail = engine.pixel(120, 200);
const control = engine.pixel(320, 200);
if (!(tail[0] > control[0] + 8)) {
  throw new Error(`Brush should carry red into the tail. tail ${tail} control ${control}`);
}

engine.dip(byId.white.rgb);
engine.setKind("filbert");
stroke(engine, 40, 170, 200, 190);

engine.dip(byId.yellow.rgb);
engine.setKind("knife");
stroke(engine, 70, 70, 250, 150);

const ppmHead = Buffer.from(`P6\n${engine.w} ${engine.h}\n255\n`);
const rgb = Buffer.alloc(engine.w * engine.h * 3);
for (let i = 0, p = 0; i < engine.w * engine.h; i++, p += 4) {
  rgb[i * 3] = engine.image[p];
  rgb[i * 3 + 1] = engine.image[p + 1];
  rgb[i * 3 + 2] = engine.image[p + 2];
}
fs.writeFileSync("/tmp/oil-blend.ppm", Buffer.concat([ppmHead, rgb]));

const simple = createEngine(180, 120, { simple: true });
simple.radius = 16;
simple.dip(byId.yellow.rgb);
stroke(simple, 16, 60, 164, 60);
simple.dip(byId.blue.rgb);
simple.setKind("round");
stroke(simple, 90, 16, 90, 104);
const simpleOverlap = simple.pixel(90, 60);
if (dist(simpleOverlap, byId.blue.rgb) < 30) {
  throw new Error(`Simpler blend stamped flat blue: ${simpleOverlap}`);
}

if (OILS.length !== 10) throw new Error(`Expected 10 oils, got ${OILS.length}`);
for (const id of ["white", "yellow", "ochre", "red", "crimson", "blue", "cobalt", "green", "umber", "black"]) {
  if (!byId[id]) throw new Error(`Missing tube ${id}`);
}

function chroma(rgb) {
  return Math.max(...rgb) - Math.min(...rgb);
}
const vivid = mixKM(byId.yellow.rgb, byId.blue.rgb, 0.5);
const muted = mixKM(byId.ochre.rgb, byId.cobalt.rgb, 0.5);
if (!(chroma(muted) < chroma(vivid) - 8)) {
  throw new Error(`Ochre and cobalt should mix quieter than cadmium yellow and ultramarine. muted ${muted} vivid ${vivid}`);
}
const blackened = mixKM(byId.ochre.rgb, byId.black.rgb, 0.28);
const ochreLum = byId.ochre.rgb[0] + byId.ochre.rgb[1] + byId.ochre.rgb[2];
const darkLum = blackened[0] + blackened[1] + blackened[2];
const blackLum = byId.black.rgb[0] + byId.black.rgb[1] + byId.black.rgb[2];
if (!(darkLum < ochreLum - 80)) throw new Error(`Black should darken ochre. ${blackened}`);
if (!(darkLum > blackLum + 80)) throw new Error(`A short mix of ivory black should not collapse to black. ${blackened}`);

const earth = createEngine(280, 160, { simple: false });
earth.radius = 18;
earth.dip(byId.ochre.rgb);
earth.setKind("round");
stroke(earth, 24, 80, 250, 80);
earth.dip(byId.black.rgb);
stroke(earth, 140, 24, 140, 140);
const earthMix = earth.pixel(140, 80);
const earthOchre = earth.pixel(60, 80);
if (!(earthMix[0] + earthMix[1] + earthMix[2] < earthOchre[0] + earthOchre[1] + earthOchre[2] - 40)) {
  throw new Error(`Black stroke should darken wet ochre. mix ${earthMix} ochre ${earthOchre}`);
}
if (dist(earthMix, byId.black.rgb) < 50) throw new Error(`Black stamped flat over ochre: ${earthMix}`);

console.log("muted", muted, "blackened", blackened, "earth", earthMix);
console.log("mix", mixed, "linear", linear);
console.log("simple overlap", simpleOverlap);
console.log("overlap", overlap, "varR", varR.toFixed(1));
console.log("tail", tail, "control", control);
console.log("ok");
