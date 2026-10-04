# Book Worlds credits

## Engine

- **Three.js r186** (`../old-man-game/vendor/three.min.js`, `three-addons.min.js`: GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, OutputPass). MIT License, © 2010-2025 three.js authors.

## Characters

Rigged humanoids are the Quaternius **Male Peasant** body and **Universal Base** head/hair, driven by the **Universal Animation Library**, all **CC0 1.0**. The same files are already vendored for the Old Man game; copies live in `assets/models/` (`body.glb`, `head.glb`, `hair.glb`, `anims.glb`).

- Body: `Male_Peasant` from Modular Character Outfits – Fantasy, https://quaternius.itch.io/modular-character-outfits-fantasy
- Head and parted hair: Universal Base Characters, https://quaternius.itch.io/universal-base-characters
- Clips (idle, walk, jog, sprint, crouch, hit, death, and the gestures layered in code): Universal Animation Library, https://quaternius.itch.io/universal-animation-library

Keeper’s duster, Jang’s waistcoat and bowler, Tom’s suspenders and wide hat, the brass key-saber, and the jump / attack / dodge poses are original to this project and sit on that CC0 skeleton. The airship coats are shaped meshes (open front, collar, sleeves, split tails) skinned to those bones, with Poly Haven leather normals. Spacey’s goggles, belts, and spyglass, and Mira’s cap, coveralls, and hand wrench, are original. Nonimaginaires and the Blank Bear are original fog shaders and meshes.

## Narration

Announcer lines in `audio/narration/` are original recordings for this project, including the trail tutorial. Captions live in `narration.json`. Jang and Tom speak the lines in `dialogue.json` from `audio/voices/jang/<id>.mp3` and `audio/voices/tom/<id>.mp3`.

## Terrain textures

CC0, from Poly Haven, resized JPG already used by the Old Man game and copied into `assets/tex/` (1K and 512):

- `forest_ground_04` → `dirt_*` (https://polyhaven.com/a/forest_ground_04), recolored in the trail into sand
- `rock_face_03` → `rock_*` (https://polyhaven.com/a/rock_face_03)
- `pine_bark` → `bark_*` (https://polyhaven.com/a/pine_bark), used on the wagons
- `brown_leather` → `leather_*` (https://polyhaven.com/a/brown_leather), albedo, normal, and roughness on the duster, hats, and boots

Total vendored texture set is well under 10 MB.

## The Rusty Stack

World II reuses the same Quaternius rigs and Poly Haven textures. The airship, patched balloon and rope net, riveted stacks, wheelhouse, deck straps, cloud-sea planes, garden city, fortress, fog crew, and the Blank Baron are original procedural geometry. Deck, stack, balloon, and cloud images are generated canvases (512 on desktop, 256 on a phone) so the page does not ship extra texture files. Repeated rivets, straps, and rigging ropes are instanced. There is no music on this station: the deck bed is synthesized steam, wind, hull creak, and ship noise. Companion lines live in `dialogue.json` (`world`: `rusty-stack`). Spacey and Mira speak them from `audio/voices/spacey/<id>.mp3` and `audio/voices/mira/<id>.mp3`. Announcer lines live in `worlds/rusty/announcer_script.json` and play from `audio/announcer/rusty/<id>.mp3`.

## The First Pulse

World III keeps the Keeper on the Quaternius rig. The Entity, the natives, the crystalline islands, the particle fields, the gate, and the Blank Hum are original procedural geometry. There is no music on this station: the bed is a low hum, air, and a little static. Companion and announcer lines live in `worlds/pulse/voices.json`. The Entity speaks from `audio/voices/entity/<id>.mp3`, the Native from `audio/voices/native/<id>.mp3`, and the announcer from `audio/announcer/pulse/<id>.mp3`. A missing clip falls back to a caption. The station card is `assets/stations/pulse.webp` (1024×576). Unlocked abilities (lasso, steam, pulse) are stored in `localStorage` under `book-worlds-abilities`.
