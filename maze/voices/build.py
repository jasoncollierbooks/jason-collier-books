#!/usr/bin/env python3
"""Record maze lines with Kokoro-82M, then a light room and -16 LUFS.

Voice choices follow notes already in the repo where they exist:
Harlan / H. Wade is Kokoro am_echo at speed 0.9, pitched down 2 semitones
(book-worlds/worlds/oldman/manifest.txt). The radio announcer on worlds 1-4
was a warm broadcast voice; here that job is am_michael. The other parts are
the closest Kokoro voices to the cast as played on the site.

Existing book-worlds clips are kept when the line is the same sentence.
"""
import hashlib
import json
import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "voices"
MODEL = "/tmp/kokoro/kokoro-v1.0.onnx"
VOICES = "/tmp/kokoro/voices-v1.0.bin"
CATALOG = Path("/tmp/maze-lines.json")

# pitch in semitones. 0 leaves the model pitch alone.
CAST = {
    "jang": dict(voice="am_puck", speed=1.14, sentence=0.16, clause=0.07, pitch=0,
                 eq="highpass=f=95,equalizer=f=350:t=q:w=1:g=-2,equalizer=f=2300:t=q:w=1.1:g=4,equalizer=f=5200:t=q:w=1:g=1.2"),
    "tom": dict(voice="am_liam", speed=0.82, sentence=0.32, clause=0.16, pitch=0,
                eq="highpass=f=70,equalizer=f=220:t=q:w=1:g=2.5,equalizer=f=3400:t=q:w=1:g=-1.2"),
    "wade": dict(voice="am_echo", speed=0.9, sentence=0.26, clause=0.12, pitch=-2,
                 eq="highpass=f=70,equalizer=f=180:t=q:w=1:g=2"),
    "spacey": dict(voice="am_onyx", speed=1.02, sentence=0.2, clause=0.09, pitch=0,
                   eq="highpass=f=80,equalizer=f=280:t=q:w=1:g=1.5,equalizer=f=2500:t=q:w=1:g=2.5"),
    "mira": dict(voice="af_sky", speed=1.05, sentence=0.18, clause=0.08, pitch=2,
                 eq="highpass=f=120,equalizer=f=4500:t=q:w=1:g=2"),
    "mountain": dict(voice="am_fenrir", speed=0.74, sentence=0.38, clause=0.18, pitch=-2,
                     eq="highpass=f=50,lowpass=f=4000,equalizer=f=110:t=q:w=0.8:g=4"),
    "hum": dict(voice="am_fenrir", speed=0.8, sentence=0.34, clause=0.16, pitch=-1,
                eq="highpass=f=60,lowpass=f=4500,equalizer=f=140:t=q:w=1:g=3"),
    "journal": dict(voice="af_sarah", speed=0.92, sentence=0.22, clause=0.1, pitch=0,
                    eq="highpass=f=90,equalizer=f=3000:t=q:w=1:g=1.5"),
    "narrator": dict(voice="am_michael", speed=0.96, sentence=0.24, clause=0.11, pitch=-1,
                     eq="highpass=f=80,equalizer=f=160:t=q:w=1:g=3,equalizer=f=3000:t=q:w=1:g=2.2"),
}
CAST["seed"] = CAST["narrator"]
CAST["ninth"] = dict(CAST["narrator"], speed=0.9)

ROOMS = {
    "trail": "aecho=0.86:0.78:22:0.12",
    "pine": "aecho=0.85:0.74:30:0.14",
    "mountain": "aecho=0.78:0.66:75|155:0.3|0.16",
    "rusty": "aecho=0.82:0.7:14|30:0.15|0.07",
    "pulse": "aecho=0.8:0.7:48|100:0.2|0.1",
    "thorne": "aecho=0.9:0.84:11:0.06",
    "seeders": "aecho=0.84:0.74:36:0.13",
    "envoy": "aecho=0.86:0.76:18:0.09",
    "meta": "aecho=0.88:0.8:15:0.09",
    "any": "aecho=0.9:0.85:12:0.06",
}

KEEP = {
    "You walked in during a true story. We can pencil you in. I am Jang.": "../book-worlds/audio/voices/jang/jang-meet.mp3",
    "The key is not the punchline. The rope is.": "../book-worlds/audio/voices/jang/jang-rope-hint.mp3",
    "Tom. My neck itched, then you arrived. That was the audition.": "../book-worlds/audio/voices/tom/tom-meet.mp3",
    "Neck's itching. That usually means the map was a suggestion.": "../book-worlds/audio/voices/tom/tom-greet.mp3",
    "You walked in during a true story. I'm Spacey. She flies. Eventually.": "../book-worlds/audio/voices/spacey/spacey-greet.mp3",
    "A crate. If it hums, we charge extra.": "../book-worlds/audio/voices/spacey/spacey-chest.mp3",
    "Mira. If it ticks, I already know. Don't touch the lever marked don't.": "../book-worlds/audio/voices/mira/mira-greet.mp3",
}


def pitch_filter(semitones, rate):
    if not semitones:
        return None
    factor = 2 ** (semitones / 12)
    return f"asetrate={int(rate * factor)},aresample={rate},atempo={1 / factor:.5f}"


def render(kokoro, spec, text):
    audio, rate = kokoro.create(
        text, voice=spec["voice"], speed=spec["speed"], lang="en-us",
        trim=True, sentence_pause=spec["sentence"], clause_pause=spec["clause"],
    )
    return audio, rate


def finish(wav, mp3, spec, world):
    rate = 24000
    parts = []
    pitched = pitch_filter(spec["pitch"], rate)
    if pitched:
        parts.append(pitched)
    parts.append(spec["eq"])
    parts.append("silenceremove=start_periods=1:start_silence=0.03:start_threshold=-42dB")
    parts.append("areverse")
    parts.append("silenceremove=start_periods=1:start_silence=0.04:start_threshold=-42dB")
    parts.append("areverse")
    parts.append("apad=pad_dur=0.03")
    parts.append(ROOMS.get(world, ROOMS["any"]))
    parts.append("loudnorm=I=-16:TP=-1.5:LRA=11")
    parts.append("alimiter=limit=0.89")
    filt = ",".join(parts)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-af", filt,
         "-ac", "1", "-ar", "22050", "-b:a", "64k", str(mp3)],
        check=True,
    )


def main():
    lines = json.loads(CATALOG.read_text())
    kokoro = Kokoro(MODEL, VOICES)
    index = {}
    made = 0
    for i, row in enumerate(lines, 1):
        text = row["text"]
        speaker = row["speaker"] if row["speaker"] in CAST else "narrator"
        spec = CAST[speaker]
        if text in KEEP:
            index[text] = {
                "src": KEEP[text], "speaker": speaker, "world": row["world"],
                "voice": "recorded", "kind": row["kind"],
            }
            continue
        digest = hashlib.sha1(text.encode()).hexdigest()[:10]
        folder = OUT / row["world"]
        folder.mkdir(parents=True, exist_ok=True)
        mp3 = folder / f"{speaker}-{digest}.mp3"
        if not mp3.exists() or mp3.stat().st_size < 800:
            audio, rate = render(kokoro, spec, text)
            wav = mp3.with_suffix(".wav")
            sf.write(wav, audio, rate)
            finish(wav, mp3, spec, row["world"])
            wav.unlink(missing_ok=True)
            made += 1
        rel = "./" + mp3.relative_to(ROOT).as_posix()
        index[text] = {
            "src": rel, "speaker": speaker, "world": row["world"],
            "voice": spec["voice"], "kind": row["kind"],
        }
        if i % 20 == 0:
            print(f"{i}/{len(lines)}", flush=True)
    payload = "export const LINES = " + json.dumps(index, ensure_ascii=False, indent=2) + ";\n"
    (OUT / "index.js").write_text(payload)
    print("generated", made, "indexed", len(index))


if __name__ == "__main__":
    main()
