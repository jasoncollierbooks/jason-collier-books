/* One maze for each world already on collierentertainment.com.
   Copy stays inside what those pages actually say. */
import { shiftLetter } from "./logic.js";
import { applyScript } from "./script.js";
import { weaveMaze } from "./layout.js";

function grid(w, h, rects, marks) {
  const g = Array.from({ length: h }, () => Array(w).fill("#"));
  for (const [x, z, rw, rh] of rects) {
    for (let j = 0; j < rh; j++) {
      for (let i = 0; i < rw; i++) g[z + j][x + i] = ".";
    }
  }
  for (const [x, z, ch] of marks || []) g[z][x] = ch;
  return g.map((row) => row.join(""));
}

function theme(partial) {
  return Object.assign({
    hemi: 0.42,
    ceiling: false,
    lamp: 0xffe2b8,
    particles: null,
  }, partial);
}

const trail = {
  id: "trail",
  title: "The California Trail",
  book: "Jang & Tom",
  kicker: "Spring of 1867",
  blurb: "Handbills, a rope, and a ford that forgot how a crossing works.",
  brand: "H",
  shown: "I",
  code: "ROPE",
  door: "rope",
  spawnYaw: Math.PI,
  intro: "Jang folds his arms. You walked in during a true story. The handbills promise California. The ford forgot how a crossing works.",
  win: "The narrows open for good. Jang will not be putting that on a handbill.",
  wrong: "The gate wants the carved word rolled back, not the carving itself.",
  goals: {
    cipher: "Four letters are in your hands. A carving by the gate tells you their order.",
    done: "The trail has branded the page.",
  },
  cipherHints: [
    "The carving by the gate is not the word. Something in the yard tells you how far to roll it.",
    "Tom counted the axles ready to snap. Roll every letter of SPQF back by that count.",
    "One axle. SPQF rolled back by one is ROPE.",
  ],
  theme: theme({
    sky: 0xc47a45, fog: 0xb08960, ground: 0x8a5a32, wall: 0x6b4428,
    accent: 0xe4c27a, lamp: 0xffc98a, ambient: "wind", particles: "dust",
    art: "../images/jang-and-tom-trail-adventure.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 6, 4],
    [4, 6, 1, 4],
    [5, 6, 5, 2],
    [1, 8, 3, 2],
    [4, 9, 6, 2],
  ], [
    [3, 2, "#"], [3, 3, "#"],
    [4, 5, "+"],
    [2, 2, "S"],
    [6, 1, "F"],
    [6, 3, "*"],
    [8, 10, "G"],
  ]),
  portals: [
    { x: 6, z: 1, always: { toX: 2, toZ: 2, yaw: Math.PI / 2, note: "Tom scratches his neck. The California door was a suggestion. Neck's itching." } },
    { x: 6, z: 3, always: { toX: 2, toZ: 2, yaw: 0, note: "This draw brings you back. The rope is the way that does not promise California." } },
  ],
  tokens: [
    {
      id: "rope", x: 1, z: 4, letter: "R", tag: "Rope", kind: "lever", flag: "rope",
      goal: "The narrows have a rope. The key is not the punchline.",
      text: "The rope takes the letter R, and the canyon wall shifts.",
      hints: [
        "Jang already said it. The key is not the punchline.",
        "Use the rope in the west narrows. A wall is waiting to move.",
        "Use the rope. It gives you R and opens the way east.",
      ],
    },
    {
      id: "passage", x: 2, z: 3, letter: "E", tag: "Promise", kind: "read",
      goal: "A promise is painted in the yard. It ends in a letter.",
      text: "Guaranteed safe passage. The last letter of PASSAGE is E. You take E.",
      hints: [
        "The guides promised something. The last letter of that promise is still on the boards.",
        "In the yard, read the promise of safe passage. Take its last letter.",
        "PASSAGE ends in E. The plaque in the yard gives you E.",
      ],
    },
    {
      id: "ox", x: 8, z: 6, letter: "O", tag: "Ox brand", kind: "lantern",
      dark: "The ox brand is there, and the dark keeps it.",
      goal: "Past the shifted wall, a brand shows only under the lantern.",
      text: "The round ox brand is O. You take O.",
      hints: [
        "Something round was branded past the rope. The dark is holding it.",
        "Light the lantern in the east stall and use the brand.",
        "Lantern on, use the ox brand. The letter is O.",
      ],
    },
    {
      id: "boards", x: 1, z: 8, letter: "P", tag: "Boards", kind: "angle", face: "west",
      smear: "The grain is a smear until you look west, along the boards.",
      goal: "The west boards only read when you look along them.",
      text: "Along the grain, the pendulum left a P. You take P.",
      hints: [
        "A letter hides in the grain. Face the way the boards run.",
        "Stand in the west stall and face west, then use the boards.",
        "Face west at the boards. The letter is P.",
      ],
    },
  ],
  signs: [
    { id: "axle", x: 5, z: 2, title: "The wagon", body: "Tom looked it over. Four wheels, a canvas top, and only one axle looks ready to snap. That count is not a decoration. The gate's carving rolls back by it." },
    { id: "handbill", x: 5, z: 1, title: "Handbill", body: "Experienced navigators. Reasonable rates. Guaranteed safe passage to California or your money back. Jang printed these. The picture that promises California in the first breath is the false door." },
    { id: "cipher", x: 6, z: 10, title: "SPQF", body: "Carved by the gate: SPQF. Roll every letter back by the axles Tom said were ready to snap. Not by the four wheels." },
  ],
};

const pine = {
  id: "pine",
  title: "Pine Knot",
  book: "The Pine Knot Gazette",
  kicker: "Miller's Ridge and Over Yonder",
  blurb: "A napkin, a possum, a groundhog, and a gal named in the paper.",
  brand: "A",
  shown: "B",
  code: "OPAL",
  door: "hog",
  spawnYaw: Math.PI / 2,
  intro: "The Pine Knot Gazette is nailed to a post. Jenkins has been walking since breakfast. The napkin is not a map to gold.",
  win: "The ridge lets you off it. Opal would have said yes either way.",
  wrong: "The gate wants the first letter of each line, in order, not the story under them.",
  goals: {
    cipher: "Four letters are in your hands. The verse by the gate is an acrostic.",
    done: "Pine Knot has branded the page.",
  },
  cipherHints: [
    "The verse by the gate is the order. Read it the way a headline is read.",
    "Take the first letter of each of the four lines, top to bottom.",
    "The lines start O, P, A, L. The word is OPAL.",
  ],
  theme: theme({
    sky: 0x8ea4b8, fog: 0x7e9278, ground: 0x3e5a34, wall: 0x5c4632,
    accent: 0xe6c15a, lamp: 0xffe2a0, ambient: "woods", particles: "dust",
    art: "../images/pine-knot.jpg",
  }),
  grid: grid(12, 11, [
    [1, 1, 4, 2],
    [1, 2, 10, 1],
    [4, 3, 4, 4],
    [8, 3, 3, 2],
    [1, 4, 2, 3],
    [8, 1, 3, 1],
    [4, 7, 4, 3],
    [1, 7, 3, 2],
    [8, 6, 3, 2],
  ], [
    [6, 4, "#"], [6, 5, "#"], [1, 7, "#"], [2, 7, "#"],
    [3, 5, "+"],
    [2, 1, "S"],
    [9, 1, "F"],
    [9, 6, "*"],
    [6, 9, "G"],
  ]),
  portals: [
    { x: 9, z: 1, always: { toX: 2, toZ: 1, yaw: Math.PI / 2, note: "The arch says Miller's Ridge. Jenkins would like you to stop saying it. The street brings you back." } },
    { x: 9, z: 6, unlessFlag: "napkin", always: { toX: 8, toZ: 1, yaw: Math.PI, note: "You have walked in a circle since this corner. Jenkins did the same until somebody had the napkin." } },
  ],
  tokens: [
    {
      id: "gold", x: 5, z: 2, letter: "L", tag: "Gold leaves", kind: "read",
      goal: "The leaves on the ridge are turning. One of them is a letter.",
      text: "GOLD is nailed under the leaves. The last letter is L. You take L.",
      hints: [
        "The weather note is also a letter. Look on the main street.",
        "Read the gold-leaf sign on the street. Take the last letter of GOLD.",
        "The street sign gives you L.",
      ],
    },
    {
      id: "napkin", x: 9, z: 3, letter: "O", tag: "Napkin", kind: "lantern", flag: "napkin",
      dark: "The napkin is grease and ketchup until the lantern is on it.",
      goal: "A napkin in the shed will not read with the lamp out.",
      text: "Under the lantern the napkin starts with O. The X was ketchup. You take O. Circles are done with you.",
      hints: [
        "Over Yonder's napkin is in a dark shed. It is not a treasure map.",
        "Light the lantern in the east shed and use the napkin.",
        "Lantern on in the shed. The letter is O, and the walking-in-circles stops.",
      ],
    },
    {
      id: "hole", x: 5, z: 6, kind: "lever", flag: "hog", blocks: true,
      goal: "A groundhog has the dirt piled in the square. The hole is the door.",
      text: "The groundhog gives up the dirt. A wall in the west yard drops open.",
      hints: [
        "Something in the square is professional about dirt.",
        "Use the groundhog hole in the square. It shifts a wall.",
        "Use the hole at the south edge of the square. The west yard opens.",
      ],
    },
    {
      id: "reward", x: 1, z: 5, letter: "P", tag: "Reward", kind: "read",
      goal: "Behind the shifted dirt, a reward poster starts a letter.",
      text: "Precious the possum. Twenty dollars. The poster starts with P. You take P.",
      hints: [
        "Mrs. Whittaker's notice is behind the dirt the groundhog was holding.",
        "Open the hole, then read the poster in the west yard.",
        "The reward poster gives you P.",
      ],
    },
    {
      id: "board", x: 1, z: 8, letter: "A", tag: "Checker", kind: "angle", face: "west",
      smear: "The checkerboard is a blur until you look west along the squares.",
      goal: "The checkerboard only reads from along the squares.",
      text: "Along the board, a red square keeps an A. You take A. The pie can keep the checker.",
      hints: [
        "The board in the south alley has a letter in the grain of the squares.",
        "Stand at the checkerboard and face west, then use it.",
        "Face west at the checkerboard. The letter is A.",
      ],
    },
  ],
  signs: [
    { id: "paper", x: 3, z: 1, title: "Pine Knot Gazette", body: "Jenkins knelt on Miller's Ridge to propose to a gal named Opal, when a groundhog popped out. Opal said yes, eventually. Two boys had his napkin. It was directions to Over Yonder barbecue. The X was ketchup. Nobody cooks the ribs. Hugh will walk you out if you ask who Nobody is." },
    { id: "pie", x: 4, z: 4, title: "The pie", body: "A red checker turned up in the pecan pie. It is still a checker. It is not the gate." },
    { id: "cipher", x: 5, z: 8, title: "Four lines", body: "Over Yonder, the X was only ketchup.\nPrecious the possum left without asking.\nA gal on the ridge was named in the paper.\nLast in GOLD is the letter the leaves keep.\n\nRead the first letter of each line, from the top." },
  ],
};

const mountain = {
  id: "mountain",
  title: "Old Man on the Mountain",
  book: "Old Man On The Mountain",
  kicker: "The high ridge",
  blurb: "Wind, spruce, a fire, and a mountain that is not empty.",
  brand: "N",
  shown: "O",
  code: "FIRE",
  door: "fire",
  spawnYaw: Math.PI,
  intro: "The wind cuts across the high ridge. A hunter kept this fire. The mountain is not empty.",
  win: "The ridge lets the fire be a fire again. You can leave the camp standing.",
  wrong: "The carving is seven nights away from the word. The camera already wrote the number.",
  goals: {
    cipher: "Four letters are in your hands. Roll the carving back by the nights on the camera.",
    done: "The mountain has branded the page.",
  },
  cipherHints: [
    "The carving by the gate has been shifted. A note in camp says by how many nights.",
    "The camera note says seven nights. Roll MPYL back by seven. The alphabet wraps.",
    "MPYL rolled back seven is FIRE.",
  ],
  theme: theme({
    sky: 0x1a2836, fog: 0x243646, ground: 0xc5d0d8, wall: 0x2c3e34,
    accent: 0xff6a2a, lamp: 0xffc090, hemi: 0.28, ambient: "mountain", particles: "snow",
    art: "../images/old-man-on-the-mountain.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 6, 4],
    [3, 6, 1, 2],
    [1, 8, 9, 3],
  ], [
    [4, 2, "#"],
    [3, 5, "+"],
    [2, 2, "S"],
    [6, 1, "F"],
    [5, 1, "*"],
    [3, 7, "*"],
    [5, 10, "G"],
  ]),
  portals: [
    { x: 6, z: 1, always: { toX: 2, toZ: 2, yaw: Math.PI, note: "The cabin light is warm and wrong. A mountain that is not empty sent you back to the fire." } },
    { x: 5, z: 1, always: { toX: 2, toZ: 2, yaw: Math.PI / 2, note: "The switchback folds. You are at the fire again." } },
    {
      x: 3, z: 7,
      lit: { pass: true, note: "The snow is crossing the way you are. The draw is true." },
      dark: { toX: 2, toZ: 2, yaw: Math.PI, note: "In the dark the mountain turns you around. Light the draw before you trust it." },
    },
  ],
  tokens: [
    {
      id: "campfire", x: 2, z: 3, letter: "F", tag: "Fire", kind: "lever", flag: "fire",
      goal: "Feed the fire. The pass below camp is shut until you do.",
      text: "You feed the fire. It gives you F, and the snow wall below camp drops.",
      hints: [
        "The only thing on this ridge that answers is the thing you feed.",
        "Use the campfire. A wall of snow shifts, and a letter stays in the coals.",
        "Use the fire. The letter is F, and the way down opens.",
      ],
    },
    {
      id: "tent", x: 7, z: 8, letter: "I", tag: "Tent", kind: "lantern",
      dark: "The tent canvas is just canvas until the lantern crosses it.",
      goal: "Cross the draw with the lantern lit. The tent hides a letter.",
      text: "On the canvas, in the lantern, the letter is I. You take I.",
      hints: [
        "The draw below the fire turns you if you walk it dark. Something past it wants the light.",
        "Cross the narrow draw with the lantern on. Then use the tent.",
        "Lantern on, through the draw, use the tent. The letter is I.",
      ],
    },
    {
      id: "spruce", x: 1, z: 8, letter: "R", tag: "Spruce", kind: "angle", face: "west",
      smear: "The bark reads only if you look west, along the trunk.",
      goal: "A spruce below the draw has cuts that only show along the bark.",
      text: "Along the bark the cuts make an R. You take R.",
      hints: [
        "Past the draw, the west spruce is carved. Face along it.",
        "Stand at the west spruce and face west, then use the bark.",
        "Face west at the spruce. The letter is R.",
      ],
    },
    {
      id: "camera", x: 6, z: 9, letter: "E", tag: "Camera", kind: "read",
      goal: "The trail camera keeps one last letter.",
      text: "Scratched under the lens: keep it going. The plate is stamped E. You take E.",
      hints: [
        "A trail camera sits in the lower camp. It is not only a number.",
        "Read the camera in the lower camp after the draw.",
        "The camera plate gives you E.",
      ],
    },
  ],
  signs: [
    { id: "seven", x: 5, z: 2, title: "Trail camera", body: "Scratched on the housing: Seven nights. Keep the fire going. The gate rolls back by the nights, not by anything else written in camp." },
    { id: "wade", x: 1, z: 2, title: "The camp", body: "H. Wade kept this fire. The wind still cuts. The lit cabin north of camp is not the way down." },
    { id: "cipher", x: 3, z: 10, title: "MPYL", body: "Carved in the cold: MPYL. Roll every letter back by the nights on the camera. If a letter walks off the front of the alphabet, it comes back on from Z." },
  ],
};

const rusty = {
  id: "rusty",
  title: "The Rusty Stack",
  book: "The Rusty Stack",
  kicker: "Captain Spacey and Mira",
  blurb: "A lever marked don't, goats with balloons, and a crate that hums.",
  brand: "D",
  shown: "E",
  code: "DONT",
  door2: "goats",
  spawnYaw: Math.PI,
  intro: "Mira taps a pipe. Don't touch the lever marked don't. If the crate hums, they charge extra. The goats have balloons.",
  win: "The hangar can have its storm back. Mira keeps the color in the gauges.",
  wrong: "The stack stutters. The carving keeps more letters than the gate wants.",
  goals: {
    cipher: "Four letters are in your hands. The carving stutters. Keep every other one.",
    done: "The Stack has branded the page.",
  },
  cipherHints: [
    "The long carving by the gate is stuttering. Not every letter in it belongs.",
    "Keep the 1st, 3rd, 5th, and 7th letters of DXOXNXT. Let the rest rust.",
    "DXOXNXT, taking every other letter from the start, is DONT.",
  ],
  theme: theme({
    sky: 0x2a3344, fog: 0x4a3832, ground: 0x3a2a24, wall: 0x7a4030,
    accent: 0xd4af37, lamp: 0xffb060, hemi: 0.34, ceiling: true, ambient: "ship", particles: "soot",
    art: "../images/the-rusty-stack.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 5, 3],
    [6, 1, 4, 2],
    [5, 4, 1, 4],
    [6, 6, 4, 2],
    [1, 6, 4, 2],
    [3, 9, 5, 2],
  ], [
    [3, 2, "#"],
    [5, 8, "="],
    [2, 2, "S"],
    [8, 1, "F"],
    [5, 5, "*"],
    [5, 10, "G"],
  ]),
  portals: [
    { x: 8, z: 1, always: { toX: 2, toZ: 2, yaw: Math.PI / 2, note: "The hangar can have its storm back. That door was the storm. You are in the hold again." } },
    {
      x: 5, z: 5,
      lit: { toX: 5, toZ: 4, yaw: Math.PI, note: "The goats follow the lamp. Spacey is not taking questions. You are back at the start of their hall." },
      dark: { pass: true, set: "goats", note: "Lamp out. The goats lose you. A bulkhead ahead unlocks with a tired clank." },
    },
  ],
  tokens: [
    {
      id: "plate", x: 4, z: 2, letter: "D", tag: "Mira's plate", kind: "read",
      goal: "Mira labeled a plate in the hold. The lever beside it is a different idea.",
      text: "The plate is the first letter of her warning. You take D. The lever marked don't is still a bad idea.",
      hints: [
        "The hold has a plate and a lever. Only one of them is worth using.",
        "Read the brass plate in the hold. Leave the lever marked don't alone.",
        "The plate gives you D. Using the don't-lever throws you back.",
      ],
    },
    {
      id: "dont", x: 1, z: 2, kind: "trap",
      goal: "The lever marked don't is labeled that way on purpose.",
      text: "Mira told you. The lever marked don't dumps you back in the hold.",
      hints: ["Leave it.", "Leave it.", "Leave the lever marked don't alone."],
    },
    {
      id: "grate", x: 8, z: 6, letter: "T", tag: "Grate", kind: "lantern",
      dark: "Under the grate is rust and nothing, until the lantern is back on.",
      goal: "Pass the goats with the lamp out. Past them, a grate wants the lamp again.",
      text: "Under the grate, in the light, the letter is T. You take T.",
      hints: [
        "The goat hall is a test of the lamp. The letter after it is a test of the lamp the other way.",
        "Walk the goat cell dark, then turn the lantern on and use the grate to the east.",
        "Lamp out past the goats, lamp on at the grate. The letter is T.",
      ],
    },
    {
      id: "pipe", x: 1, z: 6, letter: "N", tag: "Pipe", kind: "angle", face: "west",
      smear: "The pipe's stamp shows only if you look west, down its length.",
      goal: "A steam pipe reads only when you look down its length.",
      text: "Down the pipe, the stamp is N. You take N.",
      hints: [
        "The west pipe is stamped. Look along it, not at the end.",
        "After the goats, stand at the west pipe and face west.",
        "Face west at the pipe. The letter is N.",
      ],
    },
    {
      id: "crate", x: 4, z: 9, letter: "O", tag: "Crate", kind: "read",
      goal: "The crate behind the bulkhead has the last letter.",
      text: "The crate hums. Stenciled on it: O. You take O. Mira would charge extra.",
      hints: [
        "Once the goats have lost you, a bulkhead opens onto a crate.",
        "Pass the goats in the dark, then read the crate.",
        "The crate gives you O.",
      ],
    },
  ],
  signs: [
    { id: "mono", x: 4, z: 1, title: "One monocle", body: "Seven feet. One monocle. No face. The feet are not the count this ship wants. The goats are down the hall: they follow a lamp. Pass them with it out." },
    { id: "cipher", x: 6, z: 10, title: "DXOXNXT", body: "The stack stutters. Keep the 1st, 3rd, 5th, and 7th letters. Let the rest rust." },
  ],
};

const pulse = {
  id: "pulse",
  title: "The First Pulse",
  book: "The First Pulse",
  kicker: "Leftover light",
  blurb: "Before the light, there was only the hum. Invitations are not exits.",
  brand: "B",
  shown: "C",
  code: "ECHO",
  door: "hum",
  spawnYaw: Math.PI,
  intro: "Before light, before matter, before the void, there was only the hum. You are leftover light. The bright door is an invitation. Invitations are not exits.",
  win: "The hum answers, once. The signal keeps its color.",
  wrong: "The carving is a mirror, not a shift and not the invitation's letter.",
  goals: {
    cipher: "Four letters are in your hands. The carving is the alphabet folded in half.",
    done: "The Pulse has branded the page.",
  },
  cipherHints: [
    "The carving is not shifted. The plaque says A speaks as Z.",
    "Mirror the alphabet. A is Z, B is Y, C is X, and so on. Do that to every letter of VXSL.",
    "VXSL mirrored is ECHO.",
  ],
  theme: theme({
    sky: 0x07060f, fog: 0x1a1030, ground: 0x140c22, wall: 0x2a1848,
    accent: 0xf0d080, lamp: 0xd8c0ff, hemi: 0.3, ceiling: false, ambient: "hum", particles: "motes",
    art: "../book-worlds/assets/stations/pulse.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 5, 4],
    [6, 1, 4, 2],
    [2, 6, 8, 2],
    [1, 8, 9, 3],
  ], [
    [4, 6, "#"], [5, 6, "#"], [6, 6, "#"],
    [3, 5, "+"],
    [2, 2, "S"],
    [8, 1, "F"],
    [2, 7, "*"],
    [5, 10, "G"],
  ]),
  portals: [
    { x: 8, z: 1, always: { toX: 2, toZ: 2, yaw: 0, note: "The bright door was the invitation. Humanity's breakthroughs are not accidents. They are invitations. This one brought you back.", decoy: "The invitation offered the letter I. The hum crossed it out." } },
    { x: 2, z: 7, always: { toX: 3, toZ: 6, yaw: Math.PI, note: "The room repeats. If you left a mark, it did not come with you. The true arch is the one that lets the mark stay." } },
  ],
  tokens: [
    {
      id: "pedestal", x: 2, z: 4, kind: "lever", flag: "hum", blocks: true,
      goal: "Answer the hum. A wall will not move until you do.",
      text: "You answer the hum. The wall ahead unseats itself.",
      hints: [
        "The room is listening for an answer, not a brighter door.",
        "Use the pedestal in the first chamber.",
        "Use the pedestal. The way deeper opens. The bright door is a lie.",
      ],
    },
    {
      id: "chalk", x: 3, z: 6, kind: "lever", flag: "chalk",
      goal: "Leave a mark before you trust an arch.",
      text: "You leave a chalk mark. It will not follow you through a lying arch.",
      hints: [
        "The arches past the hum are not all rooms.",
        "Use the chalk at the junction, then try the side arch. If you return without the mark, that arch lied.",
        "The west arch repeats the room. The letter is on the arch that does not.",
      ],
    },
    {
      id: "arch", x: 4, z: 7, letter: "C", tag: "True arch", kind: "read",
      goal: "One arch keeps you. It has a letter.",
      text: "This arch did not repeat. Cut into it: C. You take C.",
      hints: [
        "One arch past the junction is a room. The other gives you back.",
        "Ignore the west arch. Read the arch just east of the junction.",
        "The true arch gives you C.",
      ],
    },
    {
      id: "pocket", x: 8, z: 6, letter: "O", tag: "Pocket", kind: "lantern",
      dark: "The pocket is only static until the lantern fills it.",
      goal: "A dark pocket keeps a letter for the lantern.",
      text: "In the lantern the static settles on O. You take O.",
      hints: [
        "East of the arches, a pocket stays dark on purpose.",
        "Turn the lantern on in the east pocket and use the wall.",
        "Lantern on in the pocket. The letter is O.",
      ],
    },
    {
      id: "quote", x: 1, z: 8, letter: "H", tag: "The hum", kind: "read",
      goal: "The old line is missing its last word. The wall still has the letter.",
      text: "Only the hum. The word begins with H. You take H.",
      hints: [
        "The line about the beginning is written in the lower gallery.",
        "Read the carved line in the lower west gallery.",
        "The line gives you H.",
      ],
    },
    {
      id: "ring", x: 8, z: 9, letter: "E", tag: "Ring", kind: "pitch",
      smear: "The ring is on the ceiling. Look up.",
      goal: "A ring overhead reads only when you look up.",
      text: "Looking up, the ring is E. You take E.",
      hints: [
        "Not every letter is on a wall.",
        "Stand in the lower east and look up, then use what you see.",
        "Look up at the ring. The letter is E.",
      ],
    },
  ],
  signs: [
    { id: "begin", x: 4, z: 2, title: "Only the hum", body: "In the beginning there was no light, no matter, no void. Only the hum. The bright door north of here is an invitation. It is not the way on. Answer the pedestal. Leave a chalk mark before you trust an arch." },
    { id: "cipher", x: 2, z: 10, title: "VXSL", body: "A speaks as Z. B speaks as Y. Fold the rest of the alphabet the same way, and read the carving through that fold. The letter the invitation offered does not belong." },
  ],
};

const thorne = {
  id: "thorne",
  title: "Thorne's Lab",
  book: "Dr. Elias Thorne, 1982",
  kicker: "Princeton, personal laboratory",
  blurb: "A photon shell, a damaged argon laser, and a thing born twice.",
  brand: "I",
  shown: "J",
  code: "BORN",
  door: "sine",
  spawnYaw: Math.PI / 2,
  intro: "Personal Laboratory, Princeton, New Jersey, 1982. The shell must be born twice. Once in vacuum, once in biology. The argon laser arrived damaged.",
  win: "The membrane takes the second birth. The log can stay open.",
  wrong: "The year on the clipboard is a red herring. The carving rolls back by the births.",
  goals: {
    cipher: "Four letters are in your hands. Roll the carving back by the births, not by the year.",
    done: "The lab has branded the page.",
  },
  cipherHints: [
    "The carving by the gate has been shifted. The year 1982 is the wrong count.",
    "Born twice. Roll DQTP back by two.",
    "DQTP rolled back by two is BORN.",
  ],
  theme: theme({
    sky: 0x070a12, fog: 0x0c1c18, ground: 0x1a140e, wall: 0x163028,
    accent: 0x9dffc8, lamp: 0xb8ffe0, hemi: 0.3, ceiling: true, ambient: "lab", particles: "motes",
    art: "../images/lab/born-twice-banner.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 6, 4],
    [7, 1, 3, 2],
    [4, 6, 1, 2],
    [1, 8, 9, 3],
  ], [
    [4, 5, "+"],
    [2, 2, "S"],
    [8, 1, "F"],
    [4, 7, "*"],
    [7, 10, "G"],
  ]),
  portals: [
    { x: 8, z: 1, always: { toX: 2, toZ: 2, yaw: Math.PI / 2, note: "The vacuum door is the first birth. It returns you. The second birth is the membrane, and it is not this door." } },
    {
      x: 4, z: 7,
      lit: { pass: true, set: "argon", note: "What is left of the argon beam shows the true hall." },
      dark: { toX: 4, toZ: 6, yaw: Math.PI, note: "In the dark the basement repeats. The beam has to be on." },
    },
  ],
  tokens: [
    {
      id: "clip", x: 4, z: 2, letter: "B", tag: "Clipboard", kind: "read",
      goal: "The clipboard still has the inventory, and one letter of the second birth.",
      text: "Biology is the second birth. You take B. The argon laser is listed once. It arrived damaged.",
      hints: [
        "Entry 001 is still on the clipboard, near where you came in.",
        "Read the clipboard in the front of the lab.",
        "The clipboard gives you B.",
      ],
    },
    {
      id: "scope", x: 2, z: 4, kind: "cycle", flag: "sine", blocks: true,
      values: ["noise", "square", "sine"],
      open: "sine",
      lines: {
        noise: "Noise. The membrane does not care for noise.",
        square: "A square trace. Too neat to be the honest one.",
        sine: "A sine. The honest trace. The membrane ahead answers.",
      },
      goal: "The bench scope is lying until it shows the honest trace.",
      text: "A sine. The membrane unlocks.",
      hints: [
        "The scope on the bench cycles. Square and noise are the wrong traces.",
        "Use the scope until it reads sine. That opens the membrane.",
        "Set the scope to sine. The door opens. Noise and square do not.",
      ],
    },
    {
      id: "chamber", x: 8, z: 8, letter: "N", tag: "Chamber", kind: "lantern",
      dark: "The chamber wall is blank without the argon beam.",
      goal: "Cross the basement with the beam on. A chamber past it hides a letter in that light.",
      text: "In the beam, the chamber reads N. You take N.",
      hints: [
        "The basement hall repeats if the beam is off. Past it, a letter needs the same beam.",
        "Turn the lantern on, cross the repeating hall, then use the east chamber.",
        "Lantern on through the hall and on the chamber. The letter is N.",
      ],
    },
    {
      id: "trefoil", x: 1, z: 8, letter: "O", tag: "Trefoil", kind: "angle", face: "west",
      smear: "The warning mark reads only if you look west along the paint.",
      goal: "The radiation mark has a letter in the paint, edge-on.",
      text: "Along the trefoil, the paint hides O. You take O.",
      hints: [
        "The west wall of the lower lab is a warning mark. Look along the paint.",
        "Stand at the trefoil and face west, then use it.",
        "Face west at the trefoil. The letter is O.",
      ],
    },
    {
      id: "shell", x: 5, z: 9, letter: "R", tag: "Shell", kind: "read",
      goal: "The photon shell keeps the last letter of the second birth.",
      text: "The shell was born twice. The last letter on the glass is R. You take R.",
      hints: [
        "Past the beam and the membrane, the shell itself is labeled.",
        "Read the photon shell in the lower lab.",
        "The shell gives you R.",
      ],
    },
  ],
  signs: [
    { id: "entry", x: 5, z: 3, title: "Entry 001", body: "January 15, 1982. Equipment: an aging oscilloscope, a vacuum chamber, a Geiger counter scavenged from the nuclear physics department, and a borrowed argon laser. The laser arrived damaged. The sine is the honest trace. Square and noise lie. The vacuum door is only the first birth." },
    { id: "cipher", x: 2, z: 10, title: "DQTP", body: "Carved on the bench: DQTP. The shell must be born twice. Roll every letter back by the births. Not by the year 1982. Not by the hours Thorne slept." },
  ],
};

const seeders = {
  id: "seeders",
  title: "The Seeders",
  book: "The Seeders",
  kicker: "What was planted",
  blurb: "A crystal seed, four points of view, and a maze in the back.",
  brand: "L",
  shown: "M",
  code: "SEED",
  spawnYaw: Math.PI / 2,
  intro: "Long before anyone was here to remember, something planted a seed. The visitors came back to see what grew. There is a maze in the back.",
  win: "The seed is still a seed. What grew can wait in the garden.",
  wrong: "Four points of view and twelve endings are counts, not the word. The clock by the gate names the order.",
  goals: {
    cipher: "Four letters are tagged in your hands. The clock by the gate names their order.",
    done: "The Seeders have branded the page.",
  },
  cipherHints: [
    "The gate is a clock. Your letters are already tagged with where you found them.",
    "From the top, clockwise: hull, circuit, vein, edge.",
    "Hull S, circuit E, vein E, edge D. The word is SEED.",
  ],
  theme: theme({
    sky: 0x02140e, fog: 0x04281c, ground: 0x06281c, wall: 0x0c3d2c,
    accent: 0x5dffc4, lamp: 0xc8ffe8, hemi: 0.32, ceiling: true, ambient: "seed", particles: "spores",
    art: "../seeders/seeders-cover.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 5, 3],
    [6, 1, 4, 2],
    [1, 4, 8, 1],
    [8, 5, 1, 1],
    [5, 6, 5, 4],
  ], [
    [2, 2, "S"],
    [8, 1, "F"],
    [8, 4, "*"],
    [7, 9, "G"],
  ]),
  portals: [
    { x: 8, z: 1, always: { toX: 2, toZ: 2, yaw: Math.PI / 2, note: "The garden is what grew. They came back to see it, not to leave through it. You are at the hull again." } },
    { x: 8, z: 4, unlessFlag: "seed", always: { toX: 1, toZ: 4, yaw: Math.PI / 2, note: "The maze in the back reads both ways. Turn at the seed. Do not walk through the far arch yet." } },
  ],
  tokens: [
    {
      id: "hull", x: 4, z: 2, letter: "S", tag: "Hull", kind: "read",
      goal: "The hull of the visitor's ship is stamped. That stamp is tagged Hull.",
      text: "The hull stamp is S. You take S, tagged Hull.",
      hints: [
        "The ship you arrived in still has a letter on the hull.",
        "Read the hull plate in the landing bay.",
        "The hull plate gives you S.",
      ],
    },
    {
      id: "vein", x: 4, z: 4, letter: "E", tag: "Vein", kind: "lever", flag: "seed",
      goal: "Turn at the crystal seed. The far arch will keep folding until you do.",
      text: "You turn at the seed. The vein in it is E, tagged Vein. The far arch stops folding.",
      hints: [
        "The corridor folds because you walked through the arch instead of turning at the seed.",
        "Use the crystal in the long corridor before you take the far arch.",
        "Use the seed. It gives you E, tagged Vein, and the arch lets you through.",
      ],
    },
    {
      id: "circuit", x: 7, z: 6, letter: "E", tag: "Circuit", kind: "lantern",
      dark: "The circuitry is dark glass until the lantern is on it.",
      goal: "Past the arch, the crystal's circuitry shows a letter under the lantern.",
      text: "The lit circuit is E. You take E, tagged Circuit.",
      hints: [
        "After the seed lets you through, a letter is still dark.",
        "In the room past the arch, lantern on, use the circuit.",
        "Lantern on the circuit. The letter is E, tagged Circuit.",
      ],
    },
    {
      id: "edge", x: 1, z: 2, letter: "D", tag: "Edge", kind: "angle", face: "west",
      smear: "The edge-cut shows only if you look west, along the facet.",
      goal: "A facet in the bay reads only from along its edge.",
      text: "Along the facet, the cut is D. You take D, tagged Edge.",
      hints: [
        "The west facet of the bay is cut. Look along it.",
        "Stand at the west facet and face west, then use it.",
        "Face west at the bay facet. The letter is D, tagged Edge.",
      ],
    },
  ],
  signs: [
    { id: "counts", x: 2, z: 1, title: "What they left", body: "Four points of view. Twelve endings. Alien ships, worlds, and species. One crystal seed. The counts are not the gate. The garden door is what grew, and it is the wrong way out." },
    { id: "cipher", x: 6, z: 8, title: "The clock", body: "A clock with no numbers. From the top, going clockwise: Hull, Circuit, Vein, Edge. Your letters are already tagged. Four and twelve are not hands on this clock." },
  ],
};

const envoy = {
  id: "envoy",
  title: "The Ninth Envoy",
  book: "The Ninth Envoy",
  kicker: "The hive",
  blurb: "Living black glass, a jet, and a choice of stripped, claimed, or left alone.",
  brand: "L",
  shown: "M",
  code: "HIVE",
  door: "lens",
  spawnYaw: Math.PI,
  intro: "You are the hive. One mind, spread through living black glass. The Ninth Envoy was sent to bind stars. A world is stripped, claimed, or left alone.",
  win: "The envoy keeps its number. The hive has the word it already was.",
  wrong: "Fourteen endings, one mind, ten billion shards. None of those is the envoy's number.",
  goals: {
    cipher: "Four letters are in your hands. Roll the carving back by the envoy's own number.",
    done: "The Envoy has branded the page.",
  },
  cipherHints: [
    "The carving has been shifted by the envoy's number. The other counts on the wall are bait.",
    "You are the Ninth. Roll QREN back by nine. Letters that pass A come back from Z.",
    "QREN rolled back by nine is HIVE.",
  ],
  theme: theme({
    sky: 0x000008, fog: 0x07070e, ground: 0x07070c, wall: 0x14141c,
    accent: 0xc9c6e8, lamp: 0xd0d4ff, hemi: 0.26, ceiling: true, ambient: "void", particles: "motes",
    art: "../images/the-ninth-envoy.jpg",
  }),
  grid: grid(12, 12, [
    [1, 1, 5, 3],
    [6, 1, 4, 2],
    [3, 4, 1, 1],
    [1, 5, 9, 2],
    [3, 8, 5, 3],
  ], [
    [5, 7, "+"],
    [2, 2, "S"],
    [8, 1, "F"],
    [3, 4, "*"],
    [5, 10, "G"],
  ]),
  portals: [
    { x: 8, z: 1, always: { toX: 2, toZ: 2, yaw: 0, note: "Total conquest is an ending. Fourteen endings, and this door is one of them. It brought you back." } },
    {
      x: 3, z: 4,
      lit: { toX: 3, toZ: 3, yaw: Math.PI, note: "The neutron-star jet carries those who shine. Cross it dark." },
      dark: { pass: true, set: "jet", note: "You cross the jet dark. It does not take you." },
    },
  ],
  tokens: [
    {
      id: "fates", x: 4, z: 2, letter: "H", tag: "Fates", kind: "read",
      goal: "Three fates are carved for a world. What you are is a fourth word.",
      text: "Stripped, claimed, or left alone. You are the hive. You take H.",
      hints: [
        "The bay wall lists fates for worlds. You are not one of those fates.",
        "Read the fate wall in the bay.",
        "The fate wall gives you H.",
      ],
    },
    {
      id: "glass", x: 8, z: 5, letter: "E", tag: "Glass", kind: "lantern",
      dark: "The black glass stays a mirror until the lantern is on it.",
      goal: "Cross the jet with the lamp out. The glass beyond wants the lamp.",
      text: "In the lantern, a shard reads E. You take E.",
      hints: [
        "The jet ahead carries light. Past it, the glass still wants a lamp.",
        "Cross the jet dark, then turn the lantern on and use the east glass.",
        "Lamp out across the jet, lamp on at the glass. The letter is E.",
      ],
    },
    {
      id: "shard", x: 1, z: 5, letter: "I", tag: "Shard", kind: "angle", face: "west",
      smear: "The shard reads only if you look west along the edge.",
      goal: "A shard reads only along its edge.",
      text: "Along the edge, the shard says I. You take I.",
      hints: [
        "The west shard is edged with a letter. Look along it.",
        "Stand at the west shard and face west, then use it.",
        "Face west at the shard. The letter is I.",
      ],
    },
    {
      id: "lens", x: 2, z: 6, kind: "lever", flag: "lens", blocks: true,
      goal: "Bend time at the lens. The last room is on the far side of that bend.",
      text: "The lens bends. A door beyond the gallery opens.",
      hints: [
        "Black holes are how this place bends a hall. There is a lens in the gallery.",
        "Use the lens in the west of the gallery after the jet.",
        "Use the lens. It opens the last room. It is not a letter by itself.",
      ],
    },
    {
      id: "bind", x: 4, z: 9, letter: "V", tag: "Mandate", kind: "read",
      goal: "The mandate is written past the lens.",
      text: "Bind every star. The mandate is cut with a V. You take V.",
      hints: [
        "Past the lens, the envoy's orders are carved.",
        "Open the lens, then read the mandate.",
        "The mandate gives you V.",
      ],
    },
  ],
  signs: [
    { id: "counts", x: 2, z: 1, title: "Counts", body: "One mind. Ten billion shards of living black glass. Fourteen endings, from total conquest to the end of your kind. You are the Ninth. The jet north of the gallery carries anyone who shines. The conquest door is an ending, not a way through." },
    { id: "cipher", x: 6, z: 9, title: "QREN", body: "Carved in the glass: QREN. Step every letter back by the envoy's own number. Not by fourteen. Not by one. Not by ten billion. If a letter steps off the front of the alphabet, it returns from Z." },
  ],
};

const meta = {
  id: "meta",
  title: "Dead Air",
  book: "Every station",
  kicker: "The cabinet",
  blurb: "The brands, in plaque order, after the trail's own trick.",
  brand: "",
  shown: "",
  code: "HANDBILL",
  freeCode: true,
  spawnYaw: 0,
  intro: "The cabinet is between stations. Eight brands are in the page. Dead air is what is left when a story is eaten, and it is waiting for one word.",
  win: "The pages are back in the book. Color returns to the signal. We return you now to your regular program.",
  wrong: "The dead air swallows that. The sheet does not.",
  goals: {
    cipher: "Light the sheet. Read the brands in the plaque's order, then treat them the way the trail treated a carving.",
    done: "The cabinet is back on the air.",
  },
  cipherHints: [
    "The brands are a word you have already seen printed, once you undo a shift.",
    "Plaque order, top to bottom. Then roll each brand back by the axles Tom counted. The sheet under the lantern says the count, and the blank.",
    "The brands rolled back in plaque order spell HANDBILL.",
  ],
  theme: theme({
    sky: 0x100e0c, fog: 0x1a120c, ground: 0x2a1c12, wall: 0x3a2416,
    accent: 0xd4af37, lamp: 0xffd28a, hemi: 0.22, ceiling: true, ambient: "parlor", particles: "dust",
    art: "../book-worlds/assets/play-cover.webp",
  }),
  grid: grid(9, 9, [
    [1, 1, 7, 7],
  ], [
    [2, 2, "S"],
    [4, 6, "G"],
  ]),
  portals: [],
  tokens: [],
  signs: [
    { id: "plaque", x: 2, z: 4, title: "Stations", body: "1. The California Trail\n2. Pine Knot\n3. Old Man on the Mountain\n4. The Rusty Stack\n5. The First Pulse\n6. Thorne's Lab\n7. The Seeders\n8. The Ninth Envoy\n\nRead the brands in this order. Then treat them the way the trail treated a carving." },
    { id: "sheet", x: 6, z: 4, need: "lantern", title: "The sheet", body: "Only one axle looks ready to snap. Roll every brand back by that count.\n\nTom, later: Well, we did put out the ________.\n\nEight letters. Two of them are the same. The blank is the word Jang kept nailing up. You have already walked through a maze papered with them." },
  ],
};

export const WORLDS = [trail, pine, mountain, rusty, pulse, thorne, seeders, envoy];
export const META = meta;
export const ORDER = WORLDS.map((w) => w.id);

export function worldById(id) {
  if (id === "meta") return META;
  return WORLDS.find((w) => w.id === id) || null;
}

export function brandsSpell() {
  return ORDER.map((id) => worldById(id).brand).join("");
}

export function brandsShown() {
  return ORDER.map((id) => worldById(id).shown).join("");
}

for (const w of WORLDS.concat([META])) applyScript(w);
for (const w of WORLDS) weaveMaze(w);

/* Keep the shown brand one step ahead of the true letter, trail-style. */
for (const w of WORLDS) {
  if (shiftLetter(w.brand, 1) !== w.shown) {
    throw new Error("Brand shift mismatch: " + w.id);
  }
}
