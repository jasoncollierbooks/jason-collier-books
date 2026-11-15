#!/usr/bin/env python3
"""Polish pass for the maze voices.

Kokoro-82M style vectors are blended, then each take is scored for clicks,
dropouts, and clipped endings. The winner gets a gentle de-esser, the world's
room, a short lead and tail, and a two-pass -16 LUFS / -1.5 dBTP master.

H. Wade stays on the site's Harlan recipe: am_echo, speed 0.9, down 2 semitones.
"Jang" is left spelled Jang. Espeak already reads it dʒæŋ, the same vowel as hang.
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
REPO = ROOT.parent

ROOMS = {
    "trail": "aecho=0.86:0.8:24:0.1",
    "pine": "aecho=0.85:0.76:32:0.12",
    "mountain": "aecho=0.78:0.68:80|160:0.26|0.14",
    "rusty": "aecho=0.84:0.74:16|34:0.12|0.06",
    "pulse": "aecho=0.82:0.72:50|105:0.18|0.09",
    "thorne": "aecho=0.9:0.86:12:0.05",
    "seeders": "aecho=0.84:0.76:38:0.11",
    "envoy": "aecho=0.86:0.78:20:0.08",
    "meta": "aecho=0.88:0.82:16:0.08",
    "any": "aecho=0.9:0.86:14:0.06",
}

# Pacing only. The words stay the same. Jang is not respelled.
SAY = {
    "Younger, and still Jang. The napkin is not a map to gold.":
        "Younger, and still Jang. The napkin... is not a map to gold.",
    "The picture that promises California in the first breath is the false door.":
        "The picture that promises California in the first breath... is the false door.",
    "H. Wade kept this fire. Feed it. The pass below camp stays shut until you do.":
        "H. Wade kept this fire. Feed it. The pass below camp... stays shut until you do.",
    "The mountain is not empty.": "The mountain... is not empty.",
    "The wind still cuts. The fire is the thing that answers.":
        "The wind still cuts. The fire... is the thing that answers.",
}

KEEP_SRC = {
    "You walked in during a true story. We can pencil you in. I am Jang.": "book-worlds/audio/voices/jang/jang-meet.mp3",
    "The key is not the punchline. The rope is.": "book-worlds/audio/voices/jang/jang-rope-hint.mp3",
    "Tom. My neck itched, then you arrived. That was the audition.": "book-worlds/audio/voices/tom/tom-meet.mp3",
    "Neck's itching. That usually means the map was a suggestion.": "book-worlds/audio/voices/tom/tom-greet.mp3",
    "You walked in during a true story. I'm Spacey. She flies. Eventually.": "book-worlds/audio/voices/spacey/spacey-greet.mp3",
    "A crate. If it hums, we charge extra.": "book-worlds/audio/voices/spacey/spacey-chest.mp3",
    "Mira. If it ticks, I already know. Don't touch the lever marked don't.": "book-worlds/audio/voices/mira/mira-greet.mp3",
}


def spec(speaker):
    # takes: (label, blend pairs, speed, pitch semitones, lilt semitones on the last third)
    if speaker == "jang":
        return dict(
            label="am_puck+am_adam",
            eq="highpass=f=80,equalizer=f=2400:t=q:w=1.4:g=1.4",
            sentence=0.18, clause=0.09,
            takes=[
                ("puck-adam", (("am_puck", 0.62), ("am_adam", 0.38)), 1.06, 0, 0.45),
                ("puck-eric", (("am_puck", 0.7), ("am_eric", 0.3)), 1.1, 0, 0.4),
                ("puck-adam-b", (("am_puck", 0.78), ("am_adam", 0.22)), 1.04, 0, 0.55),
            ],
        )
    if speaker == "mira":
        return dict(
            label="af_bella+af_heart",
            eq="highpass=f=90,equalizer=f=280:t=q:w=0.8:g=3.2,equalizer=f=900:t=q:w=1:g=1.2,equalizer=f=7000:t=q:w=1.2:g=-1.5",
            sentence=0.2, clause=0.1,
            takes=[
                ("bella-heart", (("af_bella", 0.58), ("af_heart", 0.42)), 0.98, 1, 0),
                ("nova-bella", (("af_nova", 0.65), ("af_bella", 0.35)), 1.0, 0, 0),
                ("heart", (("af_heart", 1.0),), 0.98, 1, 0),
            ],
        )
    if speaker == "tom":
        return dict(
            label="am_liam+am_michael",
            eq="highpass=f=70,equalizer=f=240:t=q:w=0.9:g=2.8,equalizer=f=700:t=q:w=1:g=1.2,equalizer=f=3500:t=q:w=1:g=-1",
            sentence=0.34, clause=0.16,
            takes=[
                ("liam-michael", (("am_liam", 0.6), ("am_michael", 0.4)), 0.8, 0, 0),
                ("liam-adam", (("am_liam", 0.55), ("am_adam", 0.45)), 0.84, 0, 0),
                ("liam-michael-b", (("am_liam", 0.72), ("am_michael", 0.28)), 0.78, 0, 0),
            ],
        )
    if speaker == "spacey":
        return dict(
            label="am_onyx",
            eq="highpass=f=80,equalizer=f=2500:t=q:w=1:g=1.6",
            sentence=0.24, clause=0.12,
            takes=[
                ("onyx", (("am_onyx", 1.0),), 0.98, 0, 0),
                ("onyx-b", (("am_onyx", 0.75), ("am_adam", 0.25)), 1.0, 0, 0),
            ],
        )
    if speaker == "wade":
        return dict(
            label="am_echo",
            eq="highpass=f=70,equalizer=f=180:t=q:w=1:g=1.6",
            sentence=0.3, clause=0.14,
            takes=[
                ("echo", (("am_echo", 1.0),), 0.9, -2, 0),
                ("echo-b", (("am_echo", 1.0),), 0.86, -2, 0),
            ],
        )
    if speaker == "mountain":
        return dict(
            label="am_fenrir",
            eq="highpass=f=50,lowpass=f=4200,equalizer=f=110:t=q:w=0.8:g=3.5",
            sentence=0.42, clause=0.2,
            takes=[
                ("fenrir", (("am_fenrir", 1.0),), 0.72, -2, 0),
                ("fenrir-b", (("am_fenrir", 1.0),), 0.68, -2, 0),
            ],
        )
    if speaker == "hum":
        return dict(
            label="am_fenrir",
            eq="highpass=f=60,lowpass=f=4600,equalizer=f=140:t=q:w=1:g=2.4",
            sentence=0.36, clause=0.16,
            takes=[
                ("fenrir", (("am_fenrir", 1.0),), 0.8, -1, 0),
                ("fenrir-b", (("am_fenrir", 1.0),), 0.76, -1, 0),
            ],
        )
    if speaker == "journal":
        return dict(
            label="af_sarah",
            eq="highpass=f=90,equalizer=f=300:t=q:w=1:g=1.4",
            sentence=0.26, clause=0.12,
            takes=[
                ("sarah", (("af_sarah", 1.0),), 0.9, 0, 0),
                ("sarah-b", (("af_sarah", 0.7), ("af_bella", 0.3)), 0.92, 0, 0),
            ],
        )
    # The storyteller. Piper's Alan was flatter (pitch std about 14 Hz against
    # Fable's 29 Hz on the same paragraph), so the narrator stays on Kokoro
    # and leaves the announcer presence-boost behind.
    if speaker == "narrator":
        return dict(
            label="bm_fable",
            lang="en-gb",
            eq="highpass=f=65,equalizer=f=200:t=q:w=0.9:g=2.6,equalizer=f=3200:t=q:w=1.2:g=-1.6",
            sentence=0.36, clause=0.16,
            takes=[
                ("fable", (("bm_fable", 0.78), ("bm_george", 0.22)), 0.9, 0, 0),
                ("fable-plain", (("bm_fable", 1.0),), 0.88, 0, 0),
            ],
        )
    speed = 0.9 if speaker == "ninth" else 0.96
    return dict(
        label="am_michael",
        eq="highpass=f=80,equalizer=f=170:t=q:w=1:g=2.4,equalizer=f=3000:t=q:w=1:g=1.6",
        sentence=0.28, clause=0.13,
        takes=[
            ("michael", (("am_michael", 1.0),), speed, -1, 0),
            ("michael-b", (("am_michael", 0.8), ("am_adam", 0.2)), speed - 0.02, -1, 0),
        ],
    )


def blend(kokoro, pairs):
    acc = None
    for name, weight in pairs:
        vec = kokoro.get_voice_style(name).astype(np.float32) * float(weight)
        acc = vec if acc is None else acc + vec
    return acc


def lilt(audio, sr, semis):
    if not semis or len(audio) < sr // 2:
        return audio
    cut = int(len(audio) * 0.68)
    fade = int(0.03 * sr)
    head, tail = audio[:cut], audio[cut:]
    tmp_in = Path("/tmp/lilt-in.wav")
    tmp_out = Path("/tmp/lilt-out.wav")
    sf.write(tmp_in, tail, sr)
    scale = 2 ** (semis / 12)
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(tmp_in),
         "-af", f"rubberband=pitch={scale:.5f}",
         "-ac", "1", str(tmp_out)],
        check=True,
    )
    raised, raised_sr = sf.read(tmp_out)
    if raised.ndim > 1:
        raised = raised[:, 0]
    if raised_sr != sr:
        return audio
    n = min(len(tail), len(raised))
    raised = raised[:n].astype(np.float32)
    head = head.astype(np.float32)
    if fade > n:
        fade = n // 4 or 1
    mix = head.copy()
    ramp = np.linspace(0, 1, fade, dtype=np.float32)
    # overlap the join
    join = head[-fade:] * (1 - ramp) + raised[:fade] * ramp
    return np.concatenate([head[:-fade], join, raised[fade:]])


def score(audio, sr, words):
    x = np.asarray(audio, dtype=np.float64)
    if x.size < sr // 5 or not np.isfinite(x).all():
        return -1e6
    peak = float(np.max(np.abs(x)))
    if peak < 1e-3:
        return -1e6
    n = max(2, int(0.02 * sr))
    jump = float(np.max(np.abs(np.diff(x[:n]))))
    frame = max(1, int(0.04 * sr))
    rms = np.array([
        np.sqrt(np.mean(x[i:i + frame] ** 2) + 1e-12)
        for i in range(0, len(x) - frame, frame)
    ])
    db = 20 * np.log10(rms + 1e-9)
    drops = 0
    for i in range(1, len(db) - 1):
        if db[i] < -45 and db[i - 1] > -24 and db[i + 1] > -24:
            drops += 1
    a = int(0.05 * sr)
    if len(x) > 4 * a:
        tail = np.sqrt(np.mean(x[-a:] ** 2) + 1e-12)
        prev = np.sqrt(np.mean(x[-3 * a:-a] ** 2) + 1e-12)
        end_ratio = tail / prev
    else:
        end_ratio = 1
    dur = len(x) / sr
    per = dur / max(1, words)
    penalty = 0
    if jump > 0.35:
        penalty += 40
    penalty += drops * 25
    if per < 0.22:
        penalty += (0.22 - per) * 200
    if per > 0.72:
        penalty += (per - 0.72) * 80
    if end_ratio > 1.15:
        penalty += (end_ratio - 1.15) * 30
    if peak > 0.98:
        penalty += 15
    # prefer a present, even voice
    body = float(np.mean(db[db > -40])) if np.any(db > -40) else -50
    return 20 - penalty + min(body, 0) / 10


def master(src_wav, mp3, eq, world):
    room = ROOMS.get(world, ROOMS["any"])
    pre = ",".join([
        "highpass=f=70",
        eq,
        "adeclick=w=25:o=60:a=2",
        "deesser=i=0.22:m=0.35:f=0.55:s=o",
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.08",
        "areverse",
        "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12",
        "areverse",
        "adelay=160",
        "apad=pad_dur=0.22",
        room,
    ])
    mid = src_wav.with_suffix(".mid.wav")
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(src_wav), "-af", pre, "-ac", "1", str(mid)],
        check=True,
    )
    probe = subprocess.run(
        ["ffmpeg", "-v", "info", "-i", str(mid),
         "-af", "loudnorm=I=-16:TP=-2.0:LRA=11:print_format=json",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    blob = probe.stderr
    measured = json.loads(blob[blob.rfind("{"):blob.rfind("}") + 1])
    second = (
        "loudnorm=I=-16:TP=-2.0:LRA=11:"
        f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
        f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
        f"offset={measured['target_offset']}:linear=true,"
        "alimiter=limit=0.841:attack=5:release=40:level=disabled"
    )
    subprocess.run(
        ["ffmpeg", "-y", "-v", "error", "-i", str(mid), "-af", second,
         "-ac", "1", "-ar", "22050", "-b:a", "64k", str(mp3)],
        check=True,
    )
    mid.unlink(missing_ok=True)


def synthesize(kokoro, sp, text):
    best = None
    best_score = -1e9
    best_name = ""
    words = len(text.split())
    spoken = SAY.get(text, text)
    for name, pairs, speed, pitch, rise in sp["takes"]:
        voice = blend(kokoro, pairs)
        audio, sr = kokoro.create(
            spoken, voice=voice, speed=speed, lang=sp.get("lang", "en-us"), trim=True,
            sentence_pause=sp["sentence"], clause_pause=sp["clause"],
        )
        audio = np.asarray(audio, dtype=np.float32)
        if pitch:
            tmp = Path("/tmp/take-pitch.wav")
            outp = Path("/tmp/take-pitched.wav")
            sf.write(tmp, audio, sr)
            factor = 2 ** (pitch / 12)
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(tmp),
                 "-af", f"asetrate={int(sr * factor)},aresample={sr},atempo={1 / factor:.5f}",
                 "-ac", "1", str(outp)],
                check=True,
            )
            audio, sr = sf.read(outp)
            audio = np.asarray(audio, dtype=np.float32)
            if audio.ndim > 1:
                audio = audio[:, 0]
        audio = lilt(audio, sr, rise)
        value = score(audio, sr, words)
        if value > best_score:
            best_score = value
            best = (audio, sr)
            best_name = name
    return best[0], best[1], best_name


def old_index():
    path = OUT / "index.js"
    if not path.exists():
        return {}
    raw = path.read_text()
    raw = raw.split("=", 1)[1].strip()
    if raw.endswith(";"):
        raw = raw[:-1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def main():
    lines = json.loads(CATALOG.read_text())
    previous = old_index()
    kokoro = None
    index = {}
    seen = set()
    for i, row in enumerate(lines, 1):
        text = row["text"]
        speaker = row["speaker"]
        if text in seen:
            continue
        seen.add(text)
        prior = previous.get(text)
        if (
            prior
            and prior.get("speaker") == speaker
            and speaker != "narrator"
            and (ROOT / prior["src"].lstrip("./")).exists()
        ):
            index[text] = prior
            print(f"{i}/{len(lines)} keep {speaker}", flush=True)
            continue
        if kokoro is None and text not in KEEP_SRC:
            kokoro = Kokoro(MODEL, VOICES)
        sp = spec(speaker)
        if speaker != "narrator" and len(text.split()) <= 12 and len(sp["takes"]) > 1:
            sp = dict(sp, takes=sp["takes"][:1])
        digest = hashlib.sha1((speaker + "|" + sp["label"] + "|" + text).encode()).hexdigest()[:10]
        folder = OUT / row["world"]
        folder.mkdir(parents=True, exist_ok=True)
        mp3 = folder / f"{speaker}-{digest}.mp3"
        wav = mp3.with_suffix(".wav")
        if text in KEEP_SRC:
            raw = REPO / KEEP_SRC[text]
            subprocess.run(
                ["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-ac", "1", "-ar", "24000", str(wav)],
                check=True,
            )
            voice = "recorded"
        elif mp3.exists() and mp3.stat().st_size > 400:
            voice = sp["label"]
            print(f"{i}/{len(lines)} cached {speaker}", flush=True)
            index[text] = {
                "src": "./" + mp3.relative_to(ROOT).as_posix(),
                "speaker": speaker,
                "world": row["world"],
                "voice": voice,
                "kind": row["kind"],
            }
            continue
        else:
            audio, sr, voice = synthesize(kokoro, sp, text)
            sf.write(wav, audio, sr)
            voice = sp["label"]
        master(wav, mp3, sp["eq"], row["world"])
        wav.unlink(missing_ok=True)
        index[text] = {
            "src": "./" + mp3.relative_to(ROOT).as_posix(),
            "speaker": speaker,
            "world": row["world"],
            "voice": voice,
            "kind": row["kind"],
        }
        print(f"{i}/{len(lines)} {speaker}", flush=True)
    (OUT / "index.js").write_text(
        "export const LINES = " + json.dumps(index, ensure_ascii=False, indent=2) + ";\n"
    )
    keep = { (ROOT / rec["src"].lstrip("./")).resolve() for rec in index.values() }
    for mp3 in OUT.rglob("*.mp3"):
        if mp3.resolve() not in keep:
            mp3.unlink()
    print("indexed", len(index))


if __name__ == "__main__":
    main()
