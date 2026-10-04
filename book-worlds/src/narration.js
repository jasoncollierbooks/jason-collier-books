// Announcer bulletins. Trail lines live in narration.json.
// The Rusty Stack pack lives in worlds/rusty/announcer_script.json.
// The First Pulse announcer lines live in worlds/pulse/voices.json.
// Old Man on the Mountain announcer lines live in worlds/oldman/voices.json.
// A matching mp3 plays when present. One line at a time.
// Captions run even if sound is still locked. The pack is snapshotted
// when say() is called so a station change cannot rewrite a line in flight.
export function createNarration(audio) {
  const bar = document.getElementById("bulletin");
  const kickerEl = document.getElementById("bulletin-kicker");
  const lineEl = document.getElementById("bulletin-line");

  function kickerTrail(id) {
    if (id.startsWith("page-")) return "Story page";
    if (id === "restored") return "Station 1";
    if (id === "blank-next") return "Dead air";
    if (id.startsWith("tutor-")) return "On the trail";
    return "Special bulletin";
  }

  function kickerStack(id) {
    if (id.startsWith("page-")) return "Story page";
    if (id === "restored") return "Station 2";
    if (id === "blank-next") return "Dead air";
    return "Special bulletin";
  }

  function kickerOldman(id) {
    if (id.startsWith("page-")) return "Story page";
    if (id === "restored") return "Station 4";
    if (id === "blank-next") return "Dead air";
    return "Special bulletin";
  }

  function kickerPulse(id) {
    if (id.startsWith("page-")) return "Story page";
    if (id === "restored") return "Station 3";
    if (id === "blank-next") return "Dead air";
    return "Special bulletin";
  }

  function loadPack(url, speaker) {
    const lines = new Map();
    const ready = fetch(new URL(url, import.meta.url))
      .then((res) => (res.ok ? res.json() : []))
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        for (const row of list) {
          if (!row || !row.id || !row.text) continue;
          if (speaker && row.speaker !== speaker) continue;
          lines.set(row.id, row.text);
        }
      })
      .catch(() => {});
    return { lines, ready };
  }

  const packs = {
    trail: {
      ...loadPack("../narration.json"),
      clip(id) { return `../audio/narration/${id}.mp3`; },
      kicker: kickerTrail,
    },
    stack: {
      ...loadPack("../worlds/rusty/announcer_script.json"),
      clip(id) { return `../audio/announcer/rusty/${id}.mp3`; },
      kicker: kickerStack,
    },
    pulse: {
      ...loadPack("../worlds/pulse/voices.json", "announcer"),
      clip(id) { return `../audio/announcer/pulse/${id}.mp3`; },
      kicker: kickerPulse,
    },
    oldman: {
      ...loadPack("../worlds/oldman/voices.json", "announcer"),
      clip(id) { return `../audio/announcer/oldman/${id}.mp3?v=1`; },
      kicker: kickerOldman,
    },
  };

  let pack = packs.trail;
  const queue = [];
  let busy = false;
  let token = 0;
  let typeTimer = 0;
  let current = null;

  function conceal() {
    bar.hidden = true;
    current = null;
  }

  function type(text, my) {
    clearTimeout(typeTimer);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      lineEl.textContent = text;
      lineEl.classList.add("is-done");
      return;
    }
    let i = 0;
    lineEl.textContent = "";
    lineEl.classList.remove("is-done");
    const step = () => {
      if (my !== token) return;
      i += 1;
      lineEl.textContent = text.slice(0, i);
      if (i < text.length) typeTimer = window.setTimeout(step, 26);
      else lineEl.classList.add("is-done");
    };
    step();
  }

  function waitTyped(my) {
    return new Promise((resolve) => {
      const check = () => {
        if (my !== token) { resolve(); return; }
        if (lineEl.classList.contains("is-done")) { resolve(); return; }
        typeTimer = window.setTimeout(check, 40);
      };
      check();
    });
  }

  function delay(ms, my) {
    return new Promise((resolve) => {
      typeTimer = window.setTimeout(() => resolve(my === token), ms);
    });
  }

  function subsOn() {
    return document.body.classList.contains("subs");
  }

  async function run(item, my) {
    const { id, text, clip, kicker } = item;
    current = { id, text };
    kickerEl.textContent = kicker;
    const subs = subsOn();
    bar.hidden = !subs;
    bar.dataset.id = id;
    bar.dataset.force = "0";
    if (subs) type(text, my);
    else {
      lineEl.textContent = text;
      lineEl.classList.add("is-done");
    }
    let played = false;
    const clipJob = audio && audio.playClip
      ? audio.playClip(clip).then((ok) => { played = !!ok; }).catch(() => { played = false; })
      : Promise.resolve();
    if (subs) await waitTyped(my);
    await clipJob;
    if (my !== token) return;
    if (!played) {
      bar.hidden = false;
      bar.dataset.force = "1";
      lineEl.textContent = text;
      lineEl.classList.add("is-done");
      await delay(Math.min(5200, 1600 + text.length * 28), my);
    } else if (subsOn()) {
      await delay(450, my);
    }
  }

  async function pump() {
    if (busy) return;
    const next = queue.shift();
    if (!next) {
      conceal();
      return;
    }
    busy = true;
    const my = ++token;
    try { await run(next, my); } catch { /* caption already on screen */ }
    busy = false;
    if (my !== token) return;
    if (queue.length) pump();
    else conceal();
  }

  function enqueue(source, id) {
    return source.ready.then(() => {
      const text = source.lines.get(id);
      if (!text) return;
      queue.push({
        id,
        text,
        clip: new URL(source.clip(id), import.meta.url).href,
        kicker: source.kicker(id),
      });
      pump();
    });
  }

  return {
    line(id) {
      return pack.lines.get(id) || "";
    },
    use(name) {
      pack = packs[name] || packs.trail;
    },
    async say(id) {
      const source = pack;
      await enqueue(source, id);
    },
    async sayFrom(name, id) {
      const source = packs[name] || packs.trail;
      await enqueue(source, id);
    },
    depth() {
      return queue.length + (busy ? 1 : 0);
    },
    current() {
      return current ? { id: current.id, text: lineEl.textContent, full: current.text } : null;
    },
    stop() {
      token += 1;
      queue.length = 0;
      busy = false;
      clearTimeout(typeTimer);
      conceal();
    },
  };
}
