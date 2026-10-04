// Harlan's inner voice. Short mutters and the captions he thinks out loud.
// Clips are Kokoro `am_echo` at speed 0.9, pitched down 2 semitones, with a light close reverb.
// One line at a time. Mute silences them. Playback waits for the first tap (iPhone Safari).
import { getCtx, getMaster } from "./audio.js";

export const LINES = {};
const WHISPER = new Set(["close", "still", "smell"]);
const buffers = {};
const bytes = {};
const captionIndex = new Map();
let loadP = null;
let catalogReady = false;
let current = null;
let busyUntil = 0;
const queue = [];
const lastPick = {};
let lastText = "";
let soundOn = () => true;

export function setVoiceMuteCheck(fn) { soundOn = fn; }

function guessMs(text) {
  const words = String(text || "").split(/\s+/).filter(Boolean).length;
  return Math.max(1700, Math.round(words * 430 + 700));
}
function showFor(sec) { return Math.max(1800, Math.round(sec * 1000 + 650)); }

export function preloadThoughts() {
  if (loadP) return loadP;
  loadP = fetch("./assets/voice/catalog.json")
    .then((r) => { if (!r.ok) throw new Error("catalog"); return r.json(); })
    .then((cat) => {
      for (const k of Object.keys(LINES)) delete LINES[k];
      Object.assign(LINES, cat.thoughts || {});
      captionIndex.clear();
      (cat.captions || []).forEach((text, i) => captionIndex.set(text, i));
      catalogReady = true;
      const jobs = [];
      for (const [id, lines] of Object.entries(LINES)) {
        lines.forEach((_, i) => jobs.push([`${id}-${i}`, `./assets/voice/${id}-${i}.mp3`]));
      }
      (cat.captions || []).forEach((_, i) => {
        const name = `cap-${String(i).padStart(3, "0")}`;
        jobs.push([name, `./assets/voice/${name}.mp3`]);
      });
      return Promise.all(jobs.map(([key, url]) => fetch(url)
        .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then((b) => { bytes[key] = b; })
        .catch(() => {})));
    })
    .then(() => decodeReady())
    .catch((e) => { catalogReady = true; console.warn("voice catalog", e?.message || e); });
  return loadP;
}

function decodeReady() {
  // Decode one clip at play time. Decoding every line up front is too much for a phone.
}

export function voiceReady() { return Object.keys(buffers).length; }
export function voiceCatalogReady() { return catalogReady; }
export function thoughtBusy() { return !!current || queue.length > 0 || performance.now() < busyUntil - 40; }

export function armThought() {
  const audio = getCtx();
  if (audio && audio.state === "suspended") void audio.resume().then(() => decodeReady());
  else decodeReady();
  pump();
}

function fallbackSpeak(text, quiet) {
  const ss = window.speechSynthesis;
  if (!ss || typeof SpeechSynthesisUtterance === "undefined") return;
  try { ss.cancel(); } catch { /* ignore */ }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.pitch = 0.55;
  u.rate = 0.86;
  u.volume = quiet ? 0.45 : 0.8;
  ss.speak(u);
}

function pickLine(id) {
  const lines = LINES[id];
  const avoid = lastPick[id];
  const choices = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines.length > 1 && i === avoid) continue;
    if (lines.length > 1 && lines[i] === lastText) continue;
    choices.push(i);
  }
  if (!choices.length) for (let i = 0; i < lines.length; i++) if (i !== avoid) choices.push(i);
  if (!choices.length) choices.push(0);
  const i = choices[Math.floor(Math.random() * choices.length)];
  lastPick[id] = i;
  lastText = lines[i];
  return { i, text: lines[i], key: `${id}-${i}` };
}

function enqueue(job) {
  if (queue.length && queue[queue.length - 1].text === job.text) return job;
  if (queue.length >= 2) queue.shift();
  const queued = !!current || queue.length > 0;
  queue.push(job);
  job.queued = queued;
  pump();
  return job;
}

function finishCurrent() {
  current = null;
  pump();
}

function pump() {
  if (current || !queue.length) return;
  const job = queue[0];
  const audio = getCtx();
  const audible = job.sound && soundOn();
  if (audible && audio && bytes[job.key] && !buffers[job.key] && !job.decoding) {
    job.decoding = true;
    const resume = audio.state === "suspended" ? audio.resume() : Promise.resolve();
    resume.then(() => audio.decodeAudioData(bytes[job.key].slice(0)))
      .then((buf) => { buffers[job.key] = buf; })
      .catch(() => { job.failed = true; })
      .then(() => { job.decoding = false; if (queue[0] === job && !current) startHead(); });
    return;
  }
  startHead();
}

function startHead() {
  if (current || !queue.length) return;
  const job = queue.shift();
  const audio = getCtx();
  const master = getMaster();
  const buf = buffers[job.key];
  const audible = job.sound && soundOn() && !job.failed;
  const ms = buf ? showFor(buf.duration) : guessMs(job.text);
  try { job.onbegin?.(job.text, ms); } catch { /* hud */ }
  busyUntil = performance.now() + (buf ? buf.duration * 1000 + 90 : ms);
  if (!(audible && audio && master && buf)) {
    if (audible) fallbackSpeak(job.text, job.quiet);
    current = { fake: true };
    setTimeout(() => { if (current && current.fake) finishCurrent(); }, buf ? buf.duration * 1000 : ms);
    return;
  }
  const src = audio.createBufferSource();
  src.buffer = buf;
  const filter = audio.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = job.quiet ? 2200 : 3400;
  const g = audio.createGain();
  g.gain.value = job.quiet ? Math.min(job.gain ?? 0.42, 0.55) : (job.gain ?? 0.82);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  try { src.start(); } catch { finishCurrent(); return; }
  current = src;
  src.onended = () => { if (current === src) finishCurrent(); };
}

/** Play one variant. Returns {text, ms, queued} or null if that moment has no lines. */
export function speakThought(id, sound, opts = {}) {
  const lines = LINES[id];
  if (!lines || !lines.length) return null;
  const { text, key } = pickLine(id);
  const quiet = WHISPER.has(id) || !!opts.quiet;
  const job = enqueue({
    key, text, sound: !!sound, quiet,
    gain: opts.gain,
    onbegin: opts.onbegin,
  });
  return { text, ms: guessMs(text), queued: !!job.queued };
}

/** Speak a caption if a clip exists for that exact line. */
export function speakCaption(text, sound, onbegin) {
  if (!text) return null;
  const i = captionIndex.get(text);
  if (i == null) return null;
  const key = `cap-${String(i).padStart(3, "0")}`;
  const job = enqueue({
    key, text, sound: !!sound, quiet: false, gain: 0.78, onbegin,
  });
  return { text, ms: guessMs(text), queued: !!job.queued, key };
}

export function stopThought() {
  queue.length = 0;
  if (current && !current.fake) { try { current.stop(); } catch { /* ignore */ } }
  current = null;
  busyUntil = 0;
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
}

preloadThoughts();
