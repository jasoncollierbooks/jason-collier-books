// Tests for the test build of the Oil Studio (studio-test.js).
// Runs the original blend checks against the new engine, plus palette mixing,
// paint running out, technique strokes, and no regular bristle banding.
import { execFileSync } from "child_process";
import fs from "fs";
import { createEngine, createBrush, OILS } from "./studio-test.js";

const src = fs.readFileSync(new URL("./studio-blend-test.mjs", import.meta.url), "utf8").replace("./studio.js", "./studio-test.js");
const tmp = new URL("./.studio-test-orig.tmp.mjs", import.meta.url);
fs.writeFileSync(tmp, src);
try { execFileSync(process.execPath, [tmp.pathname], { stdio: "inherit" }); } finally { fs.unlinkSync(tmp); }

const byId = Object.fromEntries(OILS.map(o => [o.id, o]));
const d = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
function line(e, x0, y0, x1, y1, p = 0.85, step = 0.2) {
  const L = Math.hypot(x1 - x0, y1 - y0); const ux = (x1 - x0) / L; const uy = (y1 - y0) / L;
  e.stamp(x0, y0, ux, uy, p, "dab");
  for (let s = e.radius * step; s <= L; s += e.radius * step) e.stamp(x0 + ux * s, y0 + uy * s, ux, uy, p, "draw");
}

// 1. Palette mixing: shared brush picks up streaky, multi-colored paint.
const brush = createBrush("flat", byId.white.rgb);
const pal = createEngine(200, 140, { brush, pickBoost: 3, ground: [214, 196, 168] });
pal.radius = 16;
pal.blob(70, 70, 22, byId.blue.rgb);
pal.blob(130, 70, 22, byId.white.rgb);
line(pal, 50, 70, 150, 70);
line(pal, 150, 76, 50, 64);
const cols = pal.colors();
const spread = Math.max(...cols.map(c => d(c, cols[0])));
if (spread < 25) throw new Error(`Palette pickup should be streaky, spread ${spread}`);
const canvas = createEngine(300, 200, { brush });
canvas.radius = 16;
const avg = canvas.carry();
if (d(avg, byId.white.rgb) < 30 || d(avg, byId.blue.rgb) < 30) throw new Error(`Brush should carry a half-mix, got ${avg}`);

// 2. Paint runs out.
canvas.dip(byId.red.rgb);
const before = canvas.loadLevel();
for (let k = 0; k < 4; k++) line(canvas, 20, 30 + k * 40, 280, 30 + k * 40);
const after = canvas.loadLevel();
if (!(after < before - 0.3)) throw new Error(`Paint should run out: ${before} -> ${after}`);
canvas.refill(1);
if (canvas.loadLevel() < 0.99) throw new Error("Refill should top the brush up");

// 3. Double-load keeps two colors on one brush.
canvas.loadColors([byId.green.rgb, byId.yellow.rgb], "double");
const dl = canvas.colors();
if (d(dl[0], dl[dl.length - 1]) < 100) throw new Error("Double-load should hold two colors");

// 4. Knife scrape breaks: some pixels in the swept band stay bare.
const k = createEngine(300, 200, {});
k.radius = 22; k.setKind("knife"); k.style = "knifeLay"; k.dip(byId.white.rgb);
const ground = k.pixel(150, 100);
line(k, 40, 100, 260, 100, 0.55, 0.18);
let hit = 0, miss = 0;
for (let x = 60; x < 240; x += 3) for (let y = 92; y < 108; y += 2) (d(k.pixel(x, y), ground) > 12 ? hit++ : miss++);
if (!hit || !miss) throw new Error(`Knife should lay broken paint, hit ${hit} miss ${miss}`);

// 5. Fan taps make branches wider than the tap line, and light touch keeps paint on top.
const f = createEngine(300, 300, {});
f.radius = 30; f.setKind("fan"); f.style = "fan";
f.dip(byId.blue.rgb); line(f, 0, 150, 300, 150, 0.9);
f.dip(byId.green.rgb); f.style = "fan";
for (let y = 60; y < 240; y += 6) f.stamp(150, y, 0, 1, 0.9, "draw");
const branch = f.pixel(150 + 18, 180);
if (d(branch, f.pixel(20, 20)) < 20) throw new Error("Fan taps should spread branches sideways");
f.dip(byId.yellow.rgb); f.touch = "light"; f.style = "stipple"; f.radius = 14;
for (let i = 0; i < 6; i++) f.stamp(60, 150, 1, 0, 0.6, "dab");
let topY = 0; for (let x = 40; x < 80; x++) for (let y = 135; y < 165; y++) if (f.pixel(x, y)[0] > 150 && f.pixel(x, y)[2] < 120) topY++;
if (topY < 20) throw new Error(`Light-touch yellow should sit on top of wet blue, got ${topY}`);

// 6. No comb: across a round-brush stroke, neighbouring rows should not alternate in a regular pattern.
const r = createEngine(300, 200, {});
r.radius = 40; r.dip(byId.green.rgb);
line(r, 30, 100, 270, 100, 0.85);
const v = []; for (let y = 72; y < 128; y++) v.push(r.pixel(150, y)[1]);
let zig = 0; for (let i = 2; i < v.length; i++) if ((v[i] - v[i - 1]) * (v[i - 1] - v[i - 2]) < 0 && Math.abs(v[i] - v[i - 1]) > 6) zig++;
if (zig > 6) throw new Error(`Round stroke shows banding, ${zig} strong reversals`);

console.log("test build ok", { spread, carry: avg, load: [before.toFixed(2), after.toFixed(2)], knife: { hit, miss }, zig });
