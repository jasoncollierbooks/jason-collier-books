/* Spoken lines. A clip plays only when a recording in the repo says the same
   sentence. Every other line uses the browser voice, one tone per speaker. */
const CLIP = "../book-worlds/audio/voices/";

const CLIPS = {
  "You walked in during a true story. We can pencil you in. I am Jang.": CLIP + "jang/jang-meet.mp3",
  "The key is not the punchline. The rope is.": CLIP + "jang/jang-rope-hint.mp3",
  "Tom. My neck itched, then you arrived. That was the audition.": CLIP + "tom/tom-meet.mp3",
  "Neck's itching. That usually means the map was a suggestion.": CLIP + "tom/tom-greet.mp3",
  "You walked in during a true story. I'm Spacey. She flies. Eventually.": CLIP + "spacey/spacey-greet.mp3",
  "A crate. If it hums, we charge extra.": CLIP + "spacey/spacey-chest.mp3",
  "Mira. If it ticks, I already know. Don't touch the lever marked don't.": CLIP + "mira/mira-greet.mp3",
};

const TONE = {
  jang: { pitch: 1.42, rate: 1.14, high: true },
  tom: { pitch: 0.68, rate: 0.78, high: false },
  wade: { pitch: 0.76, rate: 0.86, high: false },
  mountain: { pitch: 0.55, rate: 0.74, high: false },
  spacey: { pitch: 1.04, rate: 1.0, high: false },
  mira: { pitch: 1.3, rate: 1.08, high: true },
  hum: { pitch: 0.64, rate: 0.8, high: false },
  journal: { pitch: 0.9, rate: 0.9, high: false },
  seed: { pitch: 1.16, rate: 0.86, high: true },
  ninth: { pitch: 0.8, rate: 0.82, high: false },
  narrator: { pitch: 1, rate: 0.95, high: false },
};

let clip = null;

export function unlockSpeech() {
  const synth = window.speechSynthesis;
  if (!synth) return;
  try { synth.resume(); } catch (e) { /* some browsers throw before a gesture */ }
}

export function stopSpeak() {
  if (clip) {
    clip.pause();
    clip = null;
  }
  if (window.speechSynthesis) {
    try { window.speechSynthesis.cancel(); } catch (e) { /* already idle */ }
  }
}

function pickVoice(high) {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en/i.test(v.lang));
  const pool = en.length ? en : voices;
  const match = high
    ? /female|samantha|victoria|zira|google uk english female/i
    : /male|david|daniel|fred|alex|google uk english male/i;
  return pool.find((v) => match.test(v.name)) || pool[high ? pool.length - 1 : 0];
}

function synthesize(line, who) {
  const synth = window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return false;
  const tone = TONE[(who && who.id) || "narrator"] || TONE.narrator;
  const utter = new SpeechSynthesisUtterance(line);
  utter.pitch = tone.pitch;
  utter.rate = tone.rate;
  const voice = pickVoice(tone.high);
  if (voice) utter.voice = voice;
  synth.resume();
  synth.speak(utter);
  return true;
}

export function speak(text, who) {
  const line = String(text || "").replace(/\s+/g, " ").trim();
  if (!line) return { spoken: false, kind: "" };
  stopSpeak();
  const src = CLIPS[line];
  if (src) {
    clip = new Audio(src);
    const played = clip.play();
    if (played && played.catch) played.catch(() => synthesize(line, who));
    return { spoken: true, kind: "clip" };
  }
  return { spoken: synthesize(line, who), kind: "synth" };
}

export function toneFor(id) {
  return TONE[id] || TONE.narrator;
}
