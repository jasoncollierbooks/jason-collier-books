/* Painted cutouts from art already on the site. Lines stay inside the
   existing clues. They never name a gate word. */
import { CELL, center } from "./logic.js";

const TV = "../app/media/jang-tom-tv.jpg";
const PINE = "../images/pine-knot.jpg";
const RIDGE = "../images/jang-tom-millers-ridge.jpg";
const WAGON = "../images/jang-and-tom-wagon-masters.jpg";
const TRAIL = "../book-worlds/assets/stations/trail.jpg";
const OLD = "../images/old-man-on-the-mountain.jpg";
const CREW = "../media/rusty-cyoa/posters/e1.jpg";
const STACK = "../images/the-rusty-stack.jpg";
const PULSE = "../images/the-first-pulse.jpg";
const LAB = "../images/lab/born-twice-banner.jpg";
const SEED = "../images/the-seeders-cover.jpg";
const ENVOY = "../images/the-ninth-envoy.jpg";
const JANG = "../images/author-as-jang.jpg";

export const CAST = {
  trail: [
    { id: "jang", name: "Jang", art: TV, crop: [0.0, 0.02, 0.30, 0.96],
      lines: [
        "You walked in during a true story. We can pencil you in. I am Jang.",
        "The key is not the punchline. The rope is.",
        "The picture that promises California in the first breath is the false door.",
      ] },
    { id: "tom", name: "Tom", art: TV, crop: [0.40, 0.02, 0.48, 0.96],
      lines: [
        "Tom. My neck itched, then you arrived. That was the audition.",
        "Four wheels, a canvas top, and only one axle looks ready to snap. I counted.",
        "Neck's itching. That usually means the map was a suggestion.",
      ] },
  ],
  pine: [
    { id: "jang", name: "Jang", art: PINE, crop: [0.0, 0.0, 0.4, 1],
      lines: [
        "Younger, and still Jang. The napkin is not a map to gold.",
        "Two boys had the napkin. The X was ketchup.",
        "Jenkins has been walking since breakfast. The napkin is what stops him.",
      ] },
    { id: "tom", name: "Tom", art: RIDGE, crop: [0.32, 0.05, 0.4, 0.9],
      lines: [
        "Tom, before the trail got longer. The groundhog has the dirt piled in the square.",
        "The hole is the door. I did not dig it. I respect the professional.",
        "The checkerboard only reads if you look along the squares.",
      ] },
  ],
  mountain: [
    { id: "wade", name: "H. Wade", art: OLD, crop: [0.48, 0.0, 0.5, 0.62],
      lines: [
        "H. Wade kept this fire. Feed it. The pass below camp stays shut until you do.",
        "The lit cabin is not the way down.",
        "The camera counted the nights. The gate rolls back by that count, not by anything else in camp.",
      ] },
    { id: "mountain", name: "The mountain", art: OLD, crop: [0.02, 0.42, 0.46, 0.5],
      lines: [
        "The mountain is not empty.",
        "In the dark the draw turns you around. Light it before you trust it.",
        "The wind still cuts. The fire is the thing that answers.",
      ] },
  ],
  rusty: [
    { id: "spacey", name: "Captain Spacey", art: CREW, crop: [0.0, 0.0, 0.4, 1],
      lines: [
        "You walked in during a true story. I'm Spacey. She flies. Eventually.",
        "Goats with balloons. They follow a lamp. Pass them with it out.",
        "A crate. If it hums, we charge extra.",
      ] },
    { id: "mira", name: "Mira", art: CREW, crop: [0.34, 0.08, 0.28, 0.84],
      lines: [
        "Mira. If it ticks, I already know. Don't touch the lever marked don't.",
        "The goats lose you when the lamp is out. Then the lamp goes back on.",
        "Seven feet. One monocle. The feet are not the count this ship wants.",
      ] },
  ],
  pulse: [
    { id: "hum", name: "The hum", art: PULSE, crop: [0.12, 0.12, 0.76, 0.7],
      lines: [
        "Before light, before matter, before the void, there was only the hum.",
        "The bright door is an invitation. Invitations are not exits.",
        "Answer the pedestal. Leave a mark before you trust an arch.",
      ] },
  ],
  thorne: [
    { id: "journal", name: "Thorne's journal", art: LAB, crop: [0.0, 0.0, 1, 1],
      lines: [
        "Personal Laboratory, Princeton, New Jersey, 1982. The shell must be born twice.",
        "The sine is the honest trace. Square and noise lie.",
        "The year on the clipboard is the wrong count. Roll the carving back by the births.",
      ] },
  ],
  seeders: [
    { id: "seed", name: "The seed", art: SEED, crop: [0.18, 0.05, 0.64, 0.9],
      lines: [
        "Long before anyone was here to remember, something planted a seed.",
        "Turn at the seed. The far arch keeps folding until you do.",
        "Four points of view. Twelve endings. The counts are not the gate.",
      ] },
  ],
  envoy: [
    { id: "ninth", name: "The Ninth", art: ENVOY, crop: [0.05, 0.12, 0.7, 0.62],
      lines: [
        "You are the hive. One mind, spread through living black glass.",
        "The jet carries anyone who shines. Cross it dark.",
        "You are the Ninth. The other counts on the wall are bait.",
      ] },
  ],
  meta: [
    { id: "jang", name: "Jang", art: JANG, crop: [0.08, 0.02, 0.84, 0.96],
      lines: [
        "The cabinet is between stations. Eight brands are in the page.",
        "Read them in the plaque's order. Then treat them the way the trail treated a carving.",
        "The sheet under the lantern has the count, and the blank.",
      ] },
  ],
};

export const POSTERS = {
  trail: [
    { art: WAGON, title: "Wagon Masters" },
    { art: TRAIL, title: "The wagon" },
  ],
  pine: [
    { art: PINE, title: "Pine Knot" },
    { art: RIDGE, title: "Miller's Ridge" },
    { art: "../images/jang-tom-checkers.jpg", title: "Checkers" },
  ],
  mountain: [
    { art: OLD, title: "Old Man on the Mountain" },
    { art: "../book-worlds/assets/stations/oldman.jpg", title: "The ridge" },
  ],
  rusty: [
    { art: STACK, title: "The Rusty Stack" },
    { art: CREW, title: "The crew" },
    { art: "../book-worlds/assets/stations/stack.jpg", title: "The ship" },
  ],
  pulse: [
    { art: PULSE, title: "The First Pulse" },
  ],
  thorne: [
    { art: LAB, title: "Born twice" },
  ],
  seeders: [
    { art: SEED, title: "The Seeders" },
  ],
  envoy: [
    { art: ENVOY, title: "The Ninth Envoy" },
  ],
  meta: [
    { art: "../book-worlds/assets/play-cover.webp", title: "The cabinet" },
  ],
};

function openCell(world, x, z) {
  const row = world.grid[z];
  if (!row || x < 0 || x >= row.length) return false;
  const c = row[x];
  return c !== "#" && c !== "+" && c !== "=";
}

function neighbors(world, x, z) {
  let n = 0;
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    if (openCell(world, x + dx, z + dz)) n++;
  }
  return n;
}

export function peopleFor(world) {
  const cast = CAST[world.id] || [];
  if (!cast.length) return [];
  const taken = new Set();
  (world.tokens || []).forEach((t) => taken.add(t.x + "," + t.z));
  (world.signs || []).forEach((t) => taken.add(t.x + "," + t.z));
  (world.portals || []).forEach((t) => taken.add(t.x + "," + t.z));
  let sx = 1;
  let sz = 1;
  const dead = [];
  const floors = [];
  for (let z = 0; z < world.grid.length; z++) {
    for (let x = 0; x < world.grid[z].length; x++) {
      if (world.grid[z][x] === "S") { sx = x; sz = z; }
      if (!openCell(world, x, z)) continue;
      if (world.grid[z][x] === "S" || world.grid[z][x] === "G" || world.grid[z][x] === "F") continue;
      if (taken.has(x + "," + z)) continue;
      const far = !(world.tokens || []).some((t) => Math.abs(t.x - x) + Math.abs(t.z - z) < 4);
      if (!far) continue;
      floors.push({ x, z });
      if (neighbors(world, x, z) === 1) dead.push({ x, z });
    }
  }
  const placed = [];
  const greeter = cast[0];
  const gx = openCell(world, sx - 2, sz) ? sx - 2 : sx - 1;
  const gz = sz;
  placed.push(Object.assign({ x: gx, z: gz, greet: true, side: 0.42 }, greeter));
  const used = new Set(placed.map((p) => p.x + "," + p.z));
  const pool = dead.concat(floors).filter((c) => !used.has(c.x + "," + c.z));
  pool.sort((a, b) => (b.x - a.x) || (a.z - b.z));
  cast.slice(1).forEach((person, i) => {
    const spot = pool[i * 3] || pool[i] || pool[0];
    if (!spot) return;
    used.add(spot.x + "," + spot.z);
    placed.push(Object.assign({ x: spot.x, z: spot.z }, person));
  });
  return placed.map((p) => {
    const c = center(p.x, p.z);
    return Object.assign({}, p, { wx: c.x, wz: c.z + (p.side || 0) });
  });
}

export function posterSpots(world) {
  const list = POSTERS[world.id] || [];
  const spots = [];
  for (let z = 1; z < world.grid.length - 1 && spots.length < list.length; z++) {
    for (let x = 1; x < world.grid[z].length - 1 && spots.length < list.length; x++) {
      if (!openCell(world, x, z)) continue;
      if (world.grid[z][x] === "S") continue;
      if (neighbors(world, x, z) !== 1) continue;
      const wall = [[0, -1], [0, 1], [1, 0], [-1, 0]].find(([dx, dz]) => !openCell(world, x + dx, z + dz));
      if (!wall) continue;
      spots.push({ x, z, dx: wall[0], dz: wall[1], art: list[spots.length].art, title: list[spots.length].title });
    }
  }
  return spots;
}

export const CELL_SIZE = CELL;
