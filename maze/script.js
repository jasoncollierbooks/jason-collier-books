/* Spoken and on-screen lines. The puzzles stay where they are.
   A line that names a letter names the letter you actually take. */

export function applyScript(world) {
  const copy = COPY[world.id];
  if (!copy) return;
  for (const key of ["intro", "win", "wrong", "near", "closing"]) {
    if (copy[key]) world[key] = copy[key];
  }
  if (copy.goals) world.goals = Object.assign({}, world.goals, copy.goals);
  if (copy.cipherHints) world.cipherHints = copy.cipherHints;
  for (const t of world.tokens || []) {
    const patch = copy.tokens && copy.tokens[t.id];
    if (patch) Object.assign(t, patch);
  }
  for (const s of world.signs || []) {
    const patch = copy.signs && copy.signs[s.id];
    if (patch) Object.assign(s, patch);
  }
  for (const p of world.portals || []) {
    const patch = copy.notes && copy.notes[p.x + "," + p.z];
    if (!patch) continue;
    if (patch.always && p.always) p.always.note = patch.always;
    if (patch.lit && p.lit) p.lit.note = patch.lit;
    if (patch.dark && p.dark) p.dark.note = patch.dark;
    if (patch.decoy && p.always) p.always.decoy = patch.decoy;
  }
}

const COPY = {
  trail: {
    intro: "Find four letters, then the gate at the end of the trail. The handbills lie. The rope does not.",
    win: "The trail opens. Jang will not be putting that on a handbill.",
    wrong: "The carving is not the word. Roll it back by the axle that is ready to snap.",
    near: "You're close. Walk onto it.",
    closing: "All four letters are in your hands. The carving by the gate tells you the order.",
    goals: {
      start: "Find four letters, then the gate. The rope opens the first wall.",
      cipher: "Letters 4/4. Read the carving by the gate, then roll it back.",
      done: "The trail has branded the page.",
    },
    cipherHints: [
      "The carving by the gate is not the word. The wagon tells you how far to roll it.",
      "Tom counted one axle ready to snap. Roll every letter of SPQF back by that one.",
      "One axle. SPQF rolled back by one is ROPE.",
    ],
    tokens: {
      rope: {
        goal: "Walk onto the rope. It opens a wall and gives you a letter.",
        text: "The rope takes the letter R, and a wall shifts. Three letters left, then the gate.",
        hints: [
          "Jang already said it. The key is not the punchline.",
          "Walk onto the rope. A wall is waiting to move.",
          "The rope gives you R and opens the way on.",
        ],
      },
      passage: {
        goal: "Read the painted promise. Its last letter is one of yours.",
        text: "Guaranteed safe passage. PASSAGE ends in E. You take E.",
        hints: [
          "The guides promised safe passage. The last letter is still on the boards.",
          "Read the promise of safe passage.",
          "PASSAGE ends in E.",
        ],
      },
      ox: {
        goal: "Past the rope, a brand shows only under the lantern.",
        text: "The round ox brand is O. You take O.",
        dark: "The ox brand is there. The dark is holding it.",
        hints: [
          "Something round was branded past the rope. Light it.",
          "Lantern on, then walk onto the ox brand.",
          "The ox brand gives you O.",
        ],
      },
      boards: {
        goal: "The boards only read when you look along them. Face west.",
        text: "Along the grain, the boards keep a P. You take P. That is the set.",
        smear: "The grain is a smear until you look west, along the boards.",
        hints: [
          "A letter hides in the grain. Face the way the boards run.",
          "Walk onto the boards. The letter is cut along the grain.",
          "Face west at the boards. The letter is P.",
        ],
      },
    },
    signs: {
      axle: { body: "Tom looked the wagon over. Four wheels, one axle ready to snap. Roll the gate's carving back by that one, not by the four wheels." },
      handbill: { body: "Jang printed this. It promises California in the first breath. That door is the false one." },
      cipher: { body: "Carved here: SPQF. Roll every letter back by the axles ready to snap. Not by the four wheels." },
    },
    notes: {
      "6,1": { always: "Tom scratches his neck. The California door was a suggestion. You are back where you started." },
      "6,3": { always: "This draw brings you back. The rope is the way that does not promise California." },
    },
  },
  pine: {
    intro: "Find four letters in Pine Knot, then the gate. The napkin is not a map to gold.",
    win: "The ridge lets you off it. Opal would have said yes either way.",
    wrong: "Read the first letter of each line by the gate, from the top. The story under them is not the word.",
    near: "You're on it. Walk onto it.",
    closing: "Four letters. The verse by the gate is an acrostic. Read down the first letters.",
    goals: {
      start: "Find four letters, then the gate. The leaves on the street have the first one.",
      cipher: "Letters 4/4. The verse by the gate is an acrostic.",
      done: "Pine Knot has branded the page.",
    },
    cipherHints: [
      "The verse by the gate is the order. Read it the way a headline is read.",
      "Take the first letter of each of the four lines, top to bottom.",
      "The lines start O, P, A, L. The word is OPAL.",
    ],
    tokens: {
      gold: {
        goal: "Read the gold-leaf sign on the street. Take its last letter.",
        text: "GOLD is nailed under the leaves. The last letter is L. You take L.",
        hints: [
          "The weather note on the main street is also a letter.",
          "Read the gold-leaf sign.",
          "GOLD ends in L.",
        ],
      },
      napkin: {
        goal: "The napkin only reads with the lantern on.",
        text: "Under the lantern the napkin starts with O. The X was ketchup. You take O.",
        dark: "The napkin is grease and ketchup until the lantern is on it.",
        hints: [
          "The napkin is grease and ketchup. It is not a treasure map.",
          "Lantern on, then walk onto the napkin.",
          "The napkin gives you O, and the circles stop.",
        ],
      },
      hole: {
        goal: "The groundhog has the dirt piled in the square. Walk onto the hole. It opens a wall.",
        text: "The groundhog gives up the dirt. A wall drops open.",
        hints: [
          "Something in the square is professional about dirt.",
          "Walk onto the groundhog hole in the square.",
          "The hole opens a wall. The reward poster is past it.",
        ],
      },
      reward: {
        goal: "Behind the shifted dirt, the reward poster starts a letter.",
        text: "Precious the possum. The poster starts with P. You take P.",
        hints: [
          "The possum notice is behind the dirt the groundhog was holding.",
          "Open the hole, then read the reward poster.",
          "The reward poster gives you P.",
        ],
      },
      board: {
        goal: "The checkerboard only reads when you look west along the squares.",
        text: "Along the board, a red square keeps an A. You take A. The pie can keep the checker.",
        smear: "The checkerboard is a blur until you look west along the squares.",
        hints: [
          "The checkerboard has a letter along the squares.",
          "Walk onto the checkerboard. The letter reads from the squares.",
          "Face west at the checkerboard. The letter is A.",
        ],
      },
    },
    signs: {
      paper: { body: "Jenkins knelt to propose to a gal named Opal, and a groundhog popped out. Two boys had his napkin. It was directions to Over Yonder. The X was ketchup." },
      pie: { body: "A red checker turned up in the pecan pie. It is still a checker. It is not the gate." },
      cipher: { body: "Over Yonder, the X was only ketchup.\nPrecious the possum left without asking.\nA gal on the ridge was named in the paper.\nLast in GOLD is the letter the leaves keep.\n\nRead the first letter of each line, from the top." },
    },
    notes: {
      "9,1": { always: "The arch says Miller's Ridge. It is a street that brings you back. Stop saying it." },
      "9,6": { always: "You have walked in a circle. Jenkins did the same until somebody had the napkin." },
    },
  },
  mountain: {
    intro: "Find four letters on the ridge, then the gate. Feed the fire. The mountain is not empty.",
    win: "The ridge lets the fire be a fire again. You can leave the camp standing.",
    wrong: "The carving is the nights on the camera away from the word. Seven, not anything else in camp.",
    near: "You're close. Walk onto what the ridge put in front of you.",
    closing: "Four letters. The carving rolls back by the nights scratched on the camera.",
    goals: {
      start: "Find four letters, then the gate. Feed the fire first. The pass stays shut until you do.",
      cipher: "Letters 4/4. Roll the carving back by the nights on the camera.",
      done: "The mountain has branded the page.",
    },
    cipherHints: [
      "The carving by the gate has been shifted. The camera says by how many nights.",
      "Seven nights. Roll MPYL back by seven. The alphabet wraps.",
      "MPYL rolled back seven is FIRE.",
    ],
    tokens: {
      campfire: {
        goal: "Feed the fire. A pass opens, and the coals keep a letter.",
        text: "You feed the fire. It gives you F, and a snow wall drops.",
        hints: [
          "The thing on this ridge that answers is the thing you feed.",
          "Walk onto the campfire.",
          "The fire gives you F and opens the way down.",
        ],
      },
      tent: {
        goal: "Cross the draw with the lantern lit. The tent hides a letter.",
        text: "On the canvas, in the lantern, the letter is I. You take I.",
        dark: "The tent canvas is just canvas until the lantern crosses it.",
        hints: [
          "The draw turns you if you walk it dark. The tent past it wants the light.",
          "Cross the draw with the lantern on, then walk onto the tent.",
          "Lantern on at the tent. The letter is I.",
        ],
      },
      spruce: {
        goal: "The spruce reads only when you look along the bark. Face west.",
        text: "Along the bark the cuts make an R. You take R.",
        smear: "The bark reads only if you look west, along the trunk.",
        hints: [
          "The spruce past the draw is carved. Face along it.",
          "Walk onto the spruce. The letter is in the bark.",
          "Face west at the spruce. The letter is R.",
        ],
      },
      camera: {
        goal: "The trail camera keeps the last letter, and the count for the gate.",
        text: "Under the lens, the plate is stamped E. You take E. That is the set.",
        hints: [
          "The trail camera is a letter, not only a number.",
          "Read the camera after the draw.",
          "The camera plate gives you E.",
        ],
      },
    },
    signs: {
      seven: { body: "Scratched on the housing: seven nights. Keep the fire going. The gate rolls back by those nights, not by anything else in camp." },
      wade: { body: "H. Wade kept this fire. The lit cabin is not the way down." },
      cipher: { body: "Carved in the cold: MPYL. Roll every letter back by the nights on the camera. If a letter walks off A, it comes back on from Z." },
    },
    notes: {
      "6,1": { always: "The cabin light is warm and wrong. The mountain sent you back to the fire." },
      "5,1": { always: "The switchback folds. You are at the fire again." },
      "3,7": { lit: "The lantern is on. The draw is true. Keep walking.", dark: "In the dark the mountain turns you around. Light the draw before you trust it." },
    },
  },
  rusty: {
    intro: "Find four letters in the ship, then the gate. Leave the lever marked don't alone. The goats follow a lamp.",
    win: "The hangar can have its storm back. Mira keeps the color in the gauges.",
    wrong: "The carving stutters. Keep the first, third, fifth, and seventh letters. Let the rest rust.",
    near: "You're close. Walk onto it, unless it is the lever marked don't.",
    closing: "Four letters. The carving by the gate keeps more than it wants. Take every other one.",
    goals: {
      start: "Find four letters, then the gate. Mira's plate is the first. The lever beside it is not.",
      cipher: "Letters 4/4. The carving stutters. Keep every other letter.",
      done: "The Stack has branded the page.",
    },
    cipherHints: [
      "The long carving by the gate is stuttering. Not every letter in it belongs.",
      "Keep the 1st, 3rd, 5th, and 7th letters of DXOXNXT.",
      "DXOXNXT, taking every other letter from the start, is DONT.",
    ],
    tokens: {
      plate: {
        goal: "Read Mira's plate. Leave the lever marked don't alone.",
        text: "The plate starts with D. You take D. The lever marked don't is still a bad idea.",
        hints: [
          "There is a plate and a lever. Only the plate is worth using.",
          "Read the brass plate. Leave the don't-lever alone.",
          "The plate gives you D.",
        ],
      },
      dont: {
        goal: "The lever marked don't is labeled that way on purpose. Leave it.",
        text: "Mira told you. The lever marked don't dumps you back at the start.",
        hints: ["Leave it.", "Leave it.", "Leave the lever marked don't alone."],
      },
      grate: {
        goal: "Pass the goats with the lamp out. Past them, the grate wants the lamp again.",
        text: "Under the grate, in the light, the letter is T. You take T.",
        dark: "Under the grate is rust and nothing, until the lantern is back on.",
        hints: [
          "The goats follow a lamp. The grate after them wants the lamp back on.",
          "Walk past the goats in the dark, then lantern on at the grate.",
          "Lamp out past the goats, lamp on at the grate. The letter is T.",
        ],
      },
      pipe: {
        goal: "The steam pipe reads only when you face west and look down its length.",
        text: "Down the pipe, the stamp is N. You take N.",
        smear: "The stamp shows only if you look west, down the pipe.",
        hints: [
          "The pipe is stamped. Look along it.",
          "Walk onto the pipe. The letter is cut there.",
          "Face west at the pipe. The letter is N.",
        ],
      },
      crate: {
        goal: "The crate past the goats has the last letter.",
        text: "The crate hums. Stenciled on it: O. You take O. Mira would charge extra.",
        hints: [
          "Once the goats have lost you, a crate is waiting.",
          "Pass the goats in the dark, then read the crate.",
          "The crate gives you O.",
        ],
      },
    },
    signs: {
      mono: { body: "Seven feet. One monocle. The feet are not the count this ship wants. The goats are down the hall. They follow a lamp. Pass them with it out." },
      cipher: { body: "The stack stutters: DXOXNXT. Keep the 1st, 3rd, 5th, and 7th letters. Let the rest rust." },
    },
    notes: {
      "8,1": { always: "That door was the storm. You are back at the start. The gate is the other way." },
      "5,5": { lit: "The goats follow the lamp. You are back at the start of their hall.", dark: "Lamp out. The goats lose you. A bulkhead ahead unlocks." },
    },
  },
  pulse: {
    intro: "Find four letters in the hum, then the gate. The bright door is an invitation. Invitations are not exits.",
    win: "The hum answers, once. The signal keeps its color.",
    wrong: "The carving is a mirror. A speaks as Z, B as Y. It is not a shift, and the invitation's letter does not belong.",
    near: "You're close. Walk onto what is holding still.",
    closing: "Four letters. Mirror the carving. A is Z, and the rest of the alphabet folds the same way.",
    goals: {
      start: "Find four letters, then the gate. Answer the hum first. The bright door is a lie.",
      cipher: "Letters 4/4. Fold the alphabet in half and read the carving through that fold.",
      done: "The Pulse has branded the page.",
    },
    cipherHints: [
      "The carving is not shifted. The plaque says A speaks as Z.",
      "Mirror the alphabet. A is Z, B is Y, and so on. Do that to every letter of VXSL.",
      "VXSL mirrored is ECHO.",
    ],
    tokens: {
      pedestal: {
        goal: "Answer the hum at the pedestal. A wall will not move until you do.",
        text: "You answer the hum. The wall ahead unseats itself.",
        hints: [
          "The room is listening for an answer, not a brighter door.",
          "Walk onto the pedestal.",
          "The pedestal opens the way deeper. The bright door is a lie.",
        ],
      },
      chalk: {
        goal: "Leave a chalk mark before you trust an arch.",
        text: "You leave a chalk mark. It will not follow you through a lying arch.",
        hints: [
          "One arch past the hum repeats the room.",
          "Walk onto the chalk, then try an arch. If you return without the mark, that arch lied.",
          "One arch repeats the room. The letter is on the arch that does not.",
        ],
      },
      arch: {
        goal: "Read the arch that does not send you back.",
        text: "This arch did not repeat. Cut into it: C. You take C.",
        hints: [
          "One arch is a room. The other gives you back.",
          "Read the arch that keeps you, not the one that sends you back.",
          "The true arch gives you C.",
        ],
      },
      pocket: {
        goal: "A dark pocket keeps a letter for the lantern.",
        text: "In the lantern the static settles on O. You take O.",
        dark: "The pocket is only static until the lantern fills it.",
        hints: [
          "A pocket past the arches stays dark on purpose.",
          "Lantern on in the pocket, then walk onto the wall.",
          "Lantern on in the pocket. The letter is O.",
        ],
      },
      quote: {
        goal: "The old line is missing a word. The wall still has its letter.",
        text: "Only the hum. The word begins with H. You take H.",
        hints: [
          "The line about the beginning is carved on a wall.",
          "Read the carved line about the hum.",
          "The line gives you H.",
        ],
      },
      ring: {
        goal: "A ring on the ceiling reads only when you look up.",
        text: "Looking up, the ring is E. You take E. That is the set.",
        smear: "The ring is on the ceiling. Look up.",
        hints: [
          "Not every letter is on a wall.",
          "Walk onto the ring. The letter is overhead, and it is yours when you stand there.",
          "Look up at the ring. The letter is E.",
        ],
      },
    },
    signs: {
      begin: { body: "Before light, before matter, before the void, only the hum. The bright door is an invitation, not the way on. Answer the pedestal. Leave a chalk mark before you trust an arch." },
      cipher: { body: "A speaks as Z. B speaks as Y. Fold the rest of the alphabet the same way, and read VXSL through that fold. The letter the invitation offered does not belong." },
    },
    notes: {
      "8,1": { always: "The bright door was the invitation. It brought you back.", decoy: "The invitation offered the letter I. The hum crossed it out." },
      "2,7": { always: "The room repeats. The true arch is the one that lets the chalk mark stay." },
    },
  },
  thorne: {
    intro: "Find four letters in the lab, then the gate. The shell was born twice. The year on the clipboard is the wrong count.",
    win: "The membrane takes the second birth. The log can stay open.",
    wrong: "Roll the carving back by the births. Twice. Not by 1982.",
    near: "You're close. Walk onto what the bench is showing you.",
    closing: "Four letters. The carving rolls back by the two births, not by the year.",
    goals: {
      start: "Find four letters, then the gate. The clipboard has the first. The scope has to show a sine before the lab opens.",
      cipher: "Letters 4/4. Roll the carving back by the births, not by the year.",
      done: "The lab has branded the page.",
    },
    cipherHints: [
      "The carving has been shifted. The year 1982 is the wrong count.",
      "Born twice. Roll DQTP back by two.",
      "DQTP rolled back by two is BORN.",
    ],
    tokens: {
      clip: {
        goal: "Read the clipboard. Biology is the second birth, and it starts a letter.",
        text: "Biology is the second birth. You take B. The year on the page is not the count.",
        hints: [
          "The clipboard by the door still has the inventory.",
          "Read the clipboard at the front of the lab.",
          "The clipboard gives you B.",
        ],
      },
      scope: {
        goal: "Walk onto the scope until it shows a sine. Square and noise are lying.",
        text: "A sine. The honest trace. The membrane ahead unlocks.",
        hints: [
          "The scope cycles. Square and noise are the wrong traces.",
          "Walk onto the scope until it reads sine.",
          "Set the scope to sine. The door opens.",
        ],
      },
      chamber: {
        goal: "Cross the basement with the beam on. The chamber hides a letter in that light.",
        text: "In the beam, the chamber reads N. You take N.",
        dark: "The chamber wall is blank without the beam.",
        hints: [
          "The basement repeats if the beam is off. Past it, a letter needs the same light.",
          "Lantern on, cross the hall, then walk onto the chamber.",
          "Lantern on at the chamber. The letter is N.",
        ],
      },
      trefoil: {
        goal: "The radiation mark reads only when you look west along the paint.",
        text: "Along the trefoil, the paint hides O. You take O.",
        smear: "The warning mark reads only if you look west along the paint.",
        hints: [
          "A warning mark is painted on a wall. Look along the paint, facing west.",
          "Walk onto the trefoil. The letter is cut there.",
          "Face west at the trefoil. The letter is O.",
        ],
      },
      shell: {
        goal: "The photon shell keeps the last letter.",
        text: "The shell was born twice. The last letter on the glass is R. You take R.",
        hints: [
          "Past the beam, the shell itself is labeled.",
          "Read the photon shell.",
          "The shell gives you R.",
        ],
      },
    },
    signs: {
      entry: { body: "January 15, 1982. The argon laser arrived damaged. The sine is the honest trace. Square and noise lie. The vacuum door is only the first birth." },
      cipher: { body: "Carved on the bench: DQTP. The shell was born twice. Roll every letter back by the births. Not by the year 1982." },
    },
    notes: {
      "8,1": { always: "The vacuum door is the first birth. It returns you. The second birth is not this door." },
      "4,7": { lit: "The beam is on. The hall is true.", dark: "In the dark the basement repeats. The beam has to be on." },
    },
  },
  seeders: {
    intro: "Find four tagged letters, then the gate. Turn at the seed. The garden door is what grew, not the way out.",
    win: "The seed is still a seed. What grew can wait in the garden.",
    wrong: "Four and twelve are counts, not the word. The clock names the order: hull, circuit, vein, edge.",
    near: "You're close. Walk onto what is planted here.",
    closing: "Four tagged letters. The clock by the gate, from the top going clockwise, is the order.",
    goals: {
      start: "Find four tagged letters, then the gate. The hull stamp is first. Turn at the seed before the far arch.",
      cipher: "Letters 4/4. The clock by the gate names the order of the tags.",
      done: "The Seeders have branded the page.",
    },
    cipherHints: [
      "The gate is a clock. Your letters are already tagged with where you found them.",
      "From the top, clockwise: hull, circuit, vein, edge.",
      "Hull S, circuit E, vein E, edge D. The word is SEED.",
    ],
    tokens: {
      hull: {
        goal: "Read the hull stamp. It is tagged Hull.",
        text: "The hull stamp is S. You take S, tagged Hull.",
        hints: [
          "The ship you arrived in still has a letter on the hull.",
          "Read the hull plate.",
          "The hull plate gives you S, tagged Hull.",
        ],
      },
      vein: {
        goal: "Walk onto the crystal seed. The far arch keeps folding until you turn there.",
        text: "You turn at the seed. The vein in it is E, tagged Vein. The far arch stops folding.",
        hints: [
          "The corridor folds if you walk the arch before the seed.",
          "Walk onto the crystal in the long corridor.",
          "The seed gives you E, tagged Vein, and the arch lets you through.",
        ],
      },
      circuit: {
        goal: "Past the arch, the circuitry shows a letter under the lantern. It is tagged Circuit.",
        text: "The lit circuit is E. You take E, tagged Circuit.",
        dark: "The circuitry is dark glass until the lantern is on it.",
        hints: [
          "After the seed lets you through, a letter is still dark.",
          "In the room past the arch, lantern on, walk onto the circuit.",
          "The circuit gives you E, tagged Circuit.",
        ],
      },
      edge: {
        goal: "The facet reads only when you look along its edge. Face west. It is tagged Edge.",
        text: "Along the facet, the cut is D. You take D, tagged Edge.",
        smear: "The edge-cut shows only if you look west, along the facet.",
        hints: [
          "The facet is cut. Look along it.",
          "Walk onto the facet. The letter is cut there.",
          "Face west at the facet. The letter is D, tagged Edge.",
        ],
      },
    },
    signs: {
      counts: { body: "Four points of view. Twelve endings. One crystal seed. The counts are not the gate. The garden door is the wrong way out." },
      cipher: { body: "A clock with no numbers. From the top, going clockwise: Hull, Circuit, Vein, Edge. Your letters are already tagged. Four and twelve are not hands on this clock." },
    },
    notes: {
      "8,1": { always: "The garden is what grew. It is not the way out. You are at the hull again." },
      "8,4": { always: "The arch folds you back. Turn at the seed before you take it." },
    },
  },
  envoy: {
    intro: "Find four letters in the hive, then the gate. You are the Ninth. The other counts on the wall are bait.",
    win: "The envoy keeps its number. The hive has the word it already was.",
    wrong: "Fourteen, one, and ten billion are bait. Roll the carving back by nine.",
    near: "You're close. Walk onto what the glass is willing to show.",
    closing: "Four letters. Step the carving back by the envoy's own number. Nine.",
    goals: {
      start: "Find four letters, then the gate. The fate wall is first. Cross the jet with the lamp out.",
      cipher: "Letters 4/4. Roll the carving back by the envoy's own number.",
      done: "The Envoy has branded the page.",
    },
    cipherHints: [
      "The carving has been shifted by the envoy's number. The other counts are bait.",
      "You are the Ninth. Roll QREN back by nine. Letters that pass A come back from Z.",
      "QREN rolled back by nine is HIVE.",
    ],
    tokens: {
      fates: {
        goal: "Read the fate wall. What you are is a fourth word, and it starts a letter.",
        text: "Stripped, claimed, or left alone. You are the hive. You take H.",
        hints: [
          "The wall lists three fates for a world. You are not one of those three.",
          "Read the fate wall.",
          "The fate wall gives you H.",
        ],
      },
      glass: {
        goal: "Cross the jet with the lamp out. The glass beyond wants the lamp.",
        text: "In the lantern, a shard reads E. You take E.",
        dark: "The black glass stays a mirror until the lantern is on it.",
        hints: [
          "The jet carries light. Past it, the glass still wants a lamp.",
          "Cross the jet dark, then lantern on at the glass.",
          "Lamp out across the jet, lamp on at the glass. The letter is E.",
        ],
      },
      shard: {
        goal: "The shard reads only along its edge. Face west.",
        text: "Along the edge, the shard says I. You take I.",
        smear: "The shard reads only if you look west along the edge.",
        hints: [
          "The shard is edged with a letter. Look along it.",
          "Walk onto the shard. The letter is cut in the glass.",
          "Face west at the shard. The letter is I.",
        ],
      },
      lens: {
        goal: "Walk onto the lens. The last room is on the far side of that bend.",
        text: "The lens bends. The door to the last room opens.",
        hints: [
          "There is a lens. It bends the hall.",
          "Walk onto the lens. The last room is past that bend.",
          "The lens opens the last room. The letter is past it.",
        ],
      },
      bind: {
        goal: "The mandate past the lens has the last letter.",
        text: "The mandate is cut with a V. You take V. That is the set.",
        hints: [
          "Past the lens, the envoy's orders are carved.",
          "Open the lens, then read the mandate.",
          "The mandate gives you V.",
        ],
      },
    },
    signs: {
      counts: { body: "One mind. Ten billion shards. Fourteen endings. You are the Ninth. The jet carries anyone who shines. Cross it dark. The conquest door is an ending, not a way through." },
      cipher: { body: "Carved in the glass: QREN. Step every letter back by the envoy's own number. Not by fourteen. Not by one. Not by ten billion." },
    },
    notes: {
      "8,1": { always: "Total conquest is an ending. That door brought you back." },
      "3,4": { lit: "The jet carries anyone who shines. Cross it dark.", dark: "You cross the jet dark. It does not take you." },
    },
  },
  meta: {
    intro: "Eight brands are already in the page. Read them in the plaque's order, roll them back the way the trail did, and say that word at the gate.",
    win: "The pages are back in the book. Color returns to the signal. We return you now to your regular program.",
    wrong: "Not that word. Plaque order, then roll each brand back by the one axle Tom counted.",
    near: "The sheet is here. Light it before you read.",
    closing: "The sheet has the count and the blank. The plaque has the order.",
    goals: {
      start: "Light the sheet. Read the eight brands in plaque order, then roll them back.",
      cipher: "Light the sheet. Plaque order, then the trail's own trick.",
      done: "The cabinet is back on the air.",
    },
    cipherHints: [
      "The brands are a word you have already seen printed, once you undo a shift.",
      "Plaque order, top to bottom. Roll each brand back by the one axle Tom counted. The sheet says the count.",
      "The brands rolled back in plaque order spell HANDBILL.",
    ],
    signs: {
      plaque: { body: "1. The California Trail\n2. Pine Knot\n3. Old Man on the Mountain\n4. The Rusty Stack\n5. The First Pulse\n6. Thorne's Lab\n7. The Seeders\n8. The Ninth Envoy\n\nRead the brands in this order. Then roll them back the way the trail rolled a carving." },
      sheet: { body: "Only one axle looks ready to snap. Roll every brand back by that count.\n\nTom, later: Well, we did put out the ________.\n\nEight letters. Two of them are the same. The blank is the word Jang kept nailing up." },
    },
  },
};
