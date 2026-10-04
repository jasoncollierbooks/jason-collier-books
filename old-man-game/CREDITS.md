# Credits and licenses

- **Three.js r186** (vendor/three.min.js, vendor/three-addons.min.js: HDRLoader, GLTFLoader, EffectComposer, RenderPass, UnrealBloomPass, GTAOPass, OutputPass, ShaderPass, FXAAPass). MIT License, © 2010-2025 three.js authors. See vendor/THREE-LICENSE.
- **Textures, CC0** (public domain), from Poly Haven (https://polyhaven.com), resized and recompressed to 1K and 512 JPG in assets/tex/:
  - snow_02 → snow_* (https://polyhaven.com/a/snow_02)
  - forest_ground_04 → dirt_* (https://polyhaven.com/a/forest_ground_04)
  - rock_face_03 → rock_* (https://polyhaven.com/a/rock_face_03)
  - pine_bark → bark_* (https://polyhaven.com/a/pine_bark)
- **HDRI, CC0**: snow_field_2 (1K .hdr) from Poly Haven (https://polyhaven.com/a/snow_field_2), assets/env/.
- **Fonts**: Barlow Condensed and Cormorant Garamond, SIL Open Font License 1.1 (vendor/fonts/).
- **Scene art** (assets/title.jpg, truck.jpg, walker.jpg): Jason Collier's own art for the game.
- Everything else (models, sounds, shaders) is procedural and original to this project.
- **Harlan's thoughts** (`assets/voice/*.mp3`): inner-voice lines synthesized with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) voice `am_echo` at speed 0.9 (Apache-2.0), then pitched down 2 semitones with a light close reverb so they sit with the World 4 Harlan clips. No music.

## Harlan (v3 rigged character) — all CC0 1.0 (public domain), by Quaternius (quaternius.com)
- Body/outfit: `Male_Peasant` from **Modular Character Outfits – Fantasy** (CC0, https://quaternius.itch.io/modular-character-outfits-fantasy). Textures converted to JPG; unused normal/ORM maps dropped.
- Head, eyes, brows: cut from `Superhero_Male_FullBody` in **Universal Base Characters** (CC0, https://quaternius.itch.io/universal-base-characters); beard `Hair_Beard` and grey hair `Hair_SimpleParted` from the same kit.
- Animations: **Universal Animation Library** (CC0, https://quaternius.itch.io/universal-animation-library): Idle, Walk, Jog, Sprint, Crouch walk/idle, Sitting, Fixing_Kneeling, Interact, PickUp, Pistol aim, Hit, Death, Torch idle. Finger/scale tracks stripped, resampled.
- The glTF files were taken from the CC0 copies redistributed in https://github.com/lord3nd3r/ffxi-browser (public/models/chars), since the itch download needs a browser.
- Our additions (code, CC0 like the rest of our work): hat, headlamp, long coat skirt (skinned), collar, pack straps, rifle sling, pack, bedroll, meat load, rifle; colour grading of the outfit and winter sleeves.
- Tried and rejected: Quaternius "Animated Base Character" mannequin (poly.pizza) — animations good but the mannequin itself is segmented/blocky.

## Elk (assets/models/elk_bull.glb, elk_cow.glb)
- "Stag" (bull) and "Deer" (cows) from **Ultimate Animated Animal Pack** by Quaternius (July 2021), https://quaternius.com/packs/ultimateanimatedanimals.html and https://poly.pizza/bundle/Animated-Animal-Pack-ILAPXeUYiS. License: **CC0 1.0 (public domain)**.
- Source glTFs taken from the CC0 copies vendored in github.com/danwahl/animasim (assets/source/gltf/Stag.gltf, Deer.gltf), unmodified upstream files; kept in /workspace/assets-src/animals/.
- Our changes: dropped attack/jump clips (kept Idle, Idle_2, Idle_Headlow, Eating, Walk, Gallop, Death, Idle_HitReact1), resampled/pruned with gltf-transform; recoloured in code to an elk palette (pale body, dark mane, pale antlers 1.3x larger).
