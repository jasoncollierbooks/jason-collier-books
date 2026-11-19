/* Every line the maze can speak, in the same spacing the player hears. */
import { writeFileSync } from "node:fs";
import { WORLDS, META } from "../worlds.js";
import { CAST, pointLine, idleLine } from "../cast.js";

const rows = [];
const owner = new Map();

function add(text, speaker, world, kind) {
  const line = String(text || "").replace(/\s+/g, " ").trim();
  if (!line) return;
  const prev = owner.get(line);
  if (prev && prev !== speaker) {
    console.error("CONFLICT", JSON.stringify(line), prev, "vs", speaker);
    process.exitCode = 1;
    return;
  }
  if (prev) return;
  owner.set(line, speaker);
  rows.push({ text: line, speaker, world, kind });
}

for (const world of WORLDS.concat([META])) {
  add(world.intro, "narrator", world.id, "intro");
  add(world.win, "narrator", world.id, "win");
  add(world.wrong, "narrator", world.id, "wrong");
  add(world.near, "narrator", world.id, "near");
  add(world.closing, "narrator", world.id, "closing");
  for (const hint of world.cipherHints || []) add(hint, "narrator", world.id, "hint");
  for (const token of world.tokens || []) {
    add(token.text, "narrator", world.id, "pickup");
    add(token.dark, "narrator", world.id, "dark");
    add(token.smear, "narrator", world.id, "smear");
    for (const hint of token.hints || []) add(hint, "narrator", world.id, "hint");
    if (token.lines) {
      for (const line of Object.values(token.lines)) add(line, "narrator", world.id, "scope");
    }
  }
  for (const sign of world.signs || []) add(sign.body, "narrator", world.id, "sign");
  for (const portal of world.portals || []) {
    for (const slot of ["always", "lit", "dark"]) {
      const dest = portal[slot];
      if (!dest) continue;
      add(dest.note, "narrator", world.id, "portal");
      add(dest.decoy, "narrator", world.id, "portal");
    }
  }
}

for (const [worldId, people] of Object.entries(CAST)) {
  for (const person of people) {
    for (const line of person.lines) add(line, person.id, worldId, "cast");
    for (const dir of ["north", "south", "east", "west"]) {
      add(pointLine(person.id, dir, false), person.id, "any", "point");
      add(pointLine(person.id, dir, true), person.id, "any", "point");
    }
  }
}

for (const dir of ["north", "south", "east", "west"]) {
  add(idleLine(dir, false), "narrator", "any", "idle");
  add(idleLine(dir, true), "narrator", "any", "idle");
}
add(idleLine("", false), "narrator", "any", "idle");
add("Hold anywhere. You walk toward your finger.", "narrator", "any", "tip");
add("You already hold that letter.", "narrator", "any", "system");
add("The sheet is blank until the lantern is on it.", "narrator", "any", "system");

writeFileSync("/tmp/maze-lines.json", JSON.stringify(rows, null, 2));
const by = {};
for (const row of rows) by[row.speaker] = (by[row.speaker] || 0) + 1;
console.log("lines", rows.length, JSON.stringify(by));
if (process.exitCode) process.exit(process.exitCode);
