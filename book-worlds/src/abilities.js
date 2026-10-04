// Abilities the Keeper keeps. Each world awards one. They stay unlocked
// in localStorage and work on every station.
const STORE = "book-worlds-abilities";

export const ABILITIES = [
  { id: "lasso", name: "Lasso", key: "V", world: "trail", cool: 6.5 },
  { id: "steam", name: "Steam", key: "X", world: "stack", cool: 6 },
  { id: "pulse", name: "Pulse", key: "Z", world: "pulse", cool: 7.5 },
];

const CLEAR = {
  lasso: "book-worlds-world1-clear",
  steam: "book-worlds-world2-clear",
  pulse: "book-worlds-world3-clear",
};

let shared = null;

export function createAbilities() {
  if (shared) return shared;
  const owned = new Set();
  const cd = { lasso: 0, steam: 0, pulse: 0 };

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify([...owned])); } catch { /* private mode */ }
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || "[]");
      if (Array.isArray(raw)) for (const id of raw) if (CLEAR[id]) owned.add(id);
    } catch { /* ignore */ }
    try {
      for (const spec of ABILITIES) {
        if (localStorage.getItem(CLEAR[spec.id]) === "1") owned.add(spec.id);
      }
    } catch { /* private mode */ }
    save();
  }

  function specFor(id) {
    return ABILITIES.find((a) => a.id === id) || null;
  }

  function unlock(id) {
    if (!specFor(id) || owned.has(id)) return false;
    owned.add(id);
    save();
    return true;
  }

  function has(id) {
    return owned.has(id);
  }

  function tick(dt) {
    for (const id of Object.keys(cd)) cd[id] = Math.max(0, cd[id] - dt);
  }

  function ready(id) {
    return has(id) && cd[id] <= 0;
  }

  function list() {
    return ABILITIES.filter((a) => owned.has(a.id)).map((a) => ({
      ...a,
      cd: cd[a.id],
      ready: cd[a.id] <= 0,
    }));
  }

  function nearest(ctx, max) {
    let best = null;
    let bestD = max;
    for (const e of ctx.living()) {
      const d = Math.hypot(e.x - ctx.player.x, e.z - ctx.player.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function cast(id, ctx) {
    if (!ctx || !ready(id) || ctx.player.hp <= 0) return false;
    const spec = specFor(id);
    if (!spec) return false;
    if (id === "lasso") {
      const foe = nearest(ctx, 14);
      if (!foe) return false;
      cd.lasso = spec.cool;
      const yaw = Math.atan2(foe.x - ctx.player.x, foe.z - ctx.player.z);
      ctx.player.yaw = yaw;
      const hold = 1.65;
      foe.x = ctx.player.x + Math.sin(yaw) * hold;
      foe.z = ctx.player.z + Math.cos(yaw) * hold;
      if (ctx.resolve) {
        const spot = ctx.resolve(foe.x, foe.z, foe.radius || 0.4);
        foe.x = spot.x;
        foe.z = spot.z;
      }
      if (foe.kind !== "boss") {
        foe.state = "stun";
        foe.t = 0;
        foe.stunFor = Math.max(foe.stunFor || 0, 0.7);
      } else {
        foe.state = "stagger";
        foe.t = 0;
        foe.stunFor = Math.max(foe.stunFor || 0, 0.45);
      }
      ctx.damageEnemy(foe, foe.kind === "boss" ? 10 : 8, null, { knock: 0.15 });
      ctx.events.push({ type: "lasso", x: ctx.player.x, z: ctx.player.z, tx: foe.x, tz: foe.z });
      if (ctx.audio && ctx.audio.whip) ctx.audio.whip();
      return true;
    }
    if (id === "steam") {
      cd.steam = spec.cool;
      const yaw = ctx.player.yaw;
      const dist = 6.4;
      let x = ctx.player.x;
      let z = ctx.player.z;
      const hit = new Set();
      for (let i = 1; i <= 7; i++) {
        const nx = ctx.player.x + Math.sin(yaw) * dist * (i / 7);
        const nz = ctx.player.z + Math.cos(yaw) * dist * (i / 7);
        const spot = ctx.resolve ? ctx.resolve(nx, nz, 0.38) : { x: nx, z: nz };
        x = spot.x;
        z = spot.z;
        for (const e of ctx.living()) {
          if (hit.has(e.id)) continue;
          if (Math.hypot(e.x - x, e.z - z) < 1.55) {
            hit.add(e.id);
            ctx.damageEnemy(e, e.kind === "boss" ? 14 : 16, null, { knock: 0.55 });
          }
        }
      }
      ctx.player.x = x;
      ctx.player.z = z;
      ctx.player.iframes = Math.max(ctx.player.iframes || 0, 0.34);
      ctx.events.push({ type: "steam", x, z });
      if (ctx.audio && ctx.audio.hiss) ctx.audio.hiss();
      return true;
    }
    if (id === "pulse") {
      cd.pulse = spec.cool;
      const rad = 5.6;
      for (const e of ctx.living()) {
        const d = Math.hypot(e.x - ctx.player.x, e.z - ctx.player.z);
        if (d < rad) ctx.damageEnemy(e, e.kind === "boss" ? 22 : 18, null, { knock: e.kind === "boss" ? 0.45 : 1.7 });
      }
      ctx.player.iframes = Math.max(ctx.player.iframes || 0, 0.2);
      ctx.events.push({ type: "pulse", x: ctx.player.x, z: ctx.player.z });
      if (ctx.audio && ctx.audio.pulse) ctx.audio.pulse();
      return true;
    }
    return false;
  }

  load();
  shared = { unlock, has, tick, ready, list, cast, cool: (id) => cd[id] || 0 };
  return shared;
}
