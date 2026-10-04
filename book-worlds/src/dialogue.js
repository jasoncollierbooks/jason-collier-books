// Character barks. Lines live in dialogue.json.
// A matching mp3 at audio/voices/<speaker>/<id>.mp3 plays when present.
// Subtitles stay off unless the player asks, except when the clip is missing.
// A new bark replaces the one already playing. It waits if the announcer is mid-line.
const NAMES = { jang: "Jang", tom: "Tom", spacey: "Spacey", mira: "Mira", listener: "Listener", pilot: "Pilot" };
const VOICE_REV = "3";

export function createDialogue(audio) {
  const rows = new Map();
  let scope = "california-trail";
  let epoch = 0;
  function take(list) {
    const rowsIn = Array.isArray(list) ? list : [];
    for (const row of rowsIn) {
      if (!row || !row.id || !row.text || !row.speaker) continue;
      if (row.speaker === "announcer") continue;
      if (!row.world && (row.speaker === "listener" || row.speaker === "pilot")) row.world = "first-pulse";
      rows.set(row.id, row);
    }
  }
  const ready = Promise.all([
    fetch(new URL("../dialogue.json", import.meta.url)).then((res) => (res.ok ? res.json() : [])).catch(() => []),
    fetch(new URL("../worlds/pulse/voices.json", import.meta.url)).then((res) => (res.ok ? res.json() : [])).catch(() => []),
  ]).then(([base, pulse]) => {
    take(base);
    take(pulse);
    if (audio && audio.warm) audio.warm([...rows.values()].map((row) => clipUrl(row)));
  });

  let token = 0;
  let active = null;
  let hideTimer = 0;

  function clipUrl(row) {
    return new URL(`../audio/voices/${row.speaker}/${row.id}.mp3?v=${VOICE_REV}`, import.meta.url).href;
  }

  function subsOn() {
    return document.body.classList.contains("subs");
  }

  function subEl() {
    return document.getElementById("subtitle");
  }

  function tagEl() {
    return document.getElementById("tag");
  }

  function showSub(text, force) {
    const el = subEl();
    if (!el) return;
    const on = force || subsOn();
    el.hidden = !on;
    el.textContent = on ? text : "";
    el.dataset.force = force ? "1" : "0";
  }

  function showTag(speaker, on) {
    const el = tagEl();
    if (!el) return;
    const name = NAMES[speaker] || "";
    el.hidden = !(on && name);
    el.dataset.who = speaker || "";
    el.textContent = name;
  }

  function delay(ms, my) {
    return new Promise((resolve) => {
      hideTimer = window.setTimeout(() => resolve(my === token), ms);
    });
  }

  async function speak(row, my) {
    active = { id: row.id, speaker: row.speaker, text: row.text };
    showTag(row.speaker, true);
    showSub(row.text, subsOn());
    let played = false;
    try {
      const play = audio && (audio.playCompanion || audio.playClip);
      played = !!(play && await play(clipUrl(row)));
    } catch {
      played = false;
    }
    if (my !== token) return;
    if (!played) {
      showSub(row.text, true);
      const still = await delay(Math.min(4600, 1400 + row.text.length * 32), my);
      if (!still || my !== token) return;
    }
    if (my !== token) return;
    active = null;
    showTag(row.speaker, false);
    const el = subEl();
    if (el && !subsOn()) {
      el.hidden = true;
      el.textContent = "";
    }
  }

  return {
    ready,
    line(id) {
      return rows.get(id) || null;
    },
    lines() {
      return [...rows.values()];
    },
    setWorld(id) {
      scope = id || "california-trail";
    },
    say(id) {
      const my = ++token;
      const scopeAt = scope;
      ready.then(() => {
        if (my !== token) return;
        const row = rows.get(id);
        if (!row) return;
        if ((row.world || "california-trail") !== scopeAt) return;
        speak(row, my);
      });
    },
    active() {
      return active;
    },
    depth() {
      return active ? 1 : 0;
    },
    stop() {
      epoch += 1;
      token += 1;
      active = null;
      clearTimeout(hideTimer);
      if (audio && audio.cancelCompanion) audio.cancelCompanion();
      showTag("", false);
      const el = subEl();
      if (el && !subsOn()) el.hidden = true;
    },
  };
}
