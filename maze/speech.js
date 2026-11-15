/* Spoken lines. Every line has a recording. A book-worlds clip is used when
   it already says the same sentence. The rest were made with Kokoro.
   The browser voice is only a fallback if a file will not play. */
import { LINES } from "./voices/index.js";

const TONE = {
  jang: { pitch: 1.42, rate: 1.14, high: true },
  tom: { pitch: 0.68, rate: 0.78, high: false },
  wade: { pitch: 0.76, rate: 0.86, high: false },
  mountain: { pitch: 0.55, rate: 0.74, high: false },
  spacey: { pitch: 1.04, rate: 1.0, high: false },
  mira: { pitch: 1.3, rate: 1.08, high: true },
  hum: { pitch: 0.64, rate: 0.8, high: false },
  journal: { pitch: 0.95, rate: 0.92, high: true },
  seed: { pitch: 1, rate: 0.95, high: false },
  ninth: { pitch: 0.95, rate: 0.9, high: false },
  narrator: { pitch: 0.96, rate: 0.95, high: false },
};

const blobs = new Map();
let clip = null;

function norm(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

export function preloadWorld(id) {
  const jobs = [];
  for (const rec of Object.values(LINES)) {
    if (rec.world !== id && rec.world !== "any") continue;
    if (blobs.has(rec.src)) continue;
    blobs.set(rec.src, rec.src);
    jobs.push(fetch(rec.src).then((res) => {
      if (!res.ok) throw new Error(rec.src);
      return res.blob();
    }).then((blob) => {
      blobs.set(rec.src, URL.createObjectURL(blob));
    }).catch(() => {
      blobs.delete(rec.src);
    }));
  }
  return Promise.all(jobs);
}

export function unlockSpeech() {
  try {
    const silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
    const played = silent.play();
    if (played && played.catch) played.catch(() => {});
  } catch (e) { /* a locked browser will refuse this until a gesture */ }
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
  const line = norm(text);
  if (!line) return { spoken: false, kind: "" };
  stopSpeak();
  const rec = LINES[line];
  if (rec) {
    clip = new Audio(blobs.get(rec.src) || rec.src);
    const played = clip.play();
    if (played && played.catch) played.catch(() => synthesize(line, who));
    return { spoken: true, kind: rec.voice === "recorded" ? "clip" : "voice" };
  }
  return { spoken: synthesize(line, who), kind: "synth" };
}

export function toneFor(id) {
  return TONE[id] || TONE.narrator;
}
