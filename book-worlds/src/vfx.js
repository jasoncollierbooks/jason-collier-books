// One clock for every short-lived effect the player can spawn.
// Lifetimes use performance.now() and are ticked from the frame loop, so a
// missed character update, hit-stop, pause, caption, or hidden tab cannot
// leave a mesh on screen. Anything still armed after 2s is removed.
import * as THREE from "three";

export const CAP_MS = 2000;

const live = new Set();
const tagged = new Set();
const systems = [];
const noted = new WeakMap();

function clampLife(ms) {
  const n = Number.isFinite(ms) ? ms : CAP_MS;
  return Math.min(CAP_MS, Math.max(1, n));
}

export function system(fn) {
  systems.push(fn);
}

export function tag(mesh, hooks = {}) {
  if (!mesh) return;
  mesh.userData.vfx = true;
  mesh.userData.vfxTag = hooks.tag || mesh.userData.vfxTag || "mesh";
  mesh.userData.vfxBorn = Number.isFinite(hooks.born) ? hooks.born : performance.now();
  mesh.userData.vfxDispose = hooks.dispose !== false;
  mesh.userData.onVfxExpire = hooks.onExpire || null;
  tagged.add(mesh);
}

export function untag(mesh) {
  if (!mesh) return;
  mesh.userData.vfx = false;
  mesh.userData.onVfxExpire = null;
  tagged.delete(mesh);
}

function disposeMesh(mesh) {
  if (!mesh) return;
  mesh.visible = false;
  mesh.removeFromParent();
  if (mesh.geometry && mesh.geometry.dispose) mesh.geometry.dispose();
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  for (const m of mats) if (m && m.dispose) m.dispose();
}

function hideMesh(mesh) {
  if (!mesh) return;
  mesh.visible = false;
  if (mesh.material && "opacity" in mesh.material) mesh.material.opacity = 0;
  if (mesh.isLight) mesh.intensity = 0;
}

function kill(rec, now) {
  if (!rec.alive) return;
  rec.alive = false;
  live.delete(rec);
  if (rec.mesh) untag(rec.mesh);
  if (rec.onStop) rec.onStop(rec, now);
}

function armMesh(rec) {
  if (!rec.mesh) return;
  tag(rec.mesh, {
    tag: rec.tag,
    born: rec.born,
    dispose: rec.disposable !== false,
    onExpire() {
      if (rec.alive) kill(rec, performance.now());
    },
  });
}

export function bind(opts) {
  const rec = {
    alive: false,
    born: 0,
    life: clampLife(opts.life),
    tag: opts.tag || "fx",
    mesh: opts.mesh || null,
    disposable: opts.disposable === true,
    onTick: opts.onTick || null,
    onStop: opts.onStop || null,
  };
  return {
    restart(lifeMs) {
      rec.born = performance.now();
      rec.life = clampLife(lifeMs == null ? rec.life : lifeMs);
      rec.alive = true;
      live.add(rec);
      armMesh(rec);
      if (rec.mesh) rec.mesh.visible = true;
    },
    stop() { kill(rec, performance.now()); },
    get alive() { return rec.alive; },
  };
}

export function spawn(opts) {
  const fx = bind(opts);
  fx.restart(opts.life);
  return fx;
}

// Flat expanding ring. fire() arms it once; follow() may slide it while it
// lives. The fade does not read the sim clock.
export function armRing(mesh, spec) {
  const pos = new THREE.Vector3();
  const fx = bind({
    tag: spec.tag || "ring",
    mesh,
    life: spec.life,
    onTick(k) {
      mesh.position.copy(pos);
      mesh.scale.setScalar(spec.scale(k));
      mesh.material.opacity = spec.opacity(k);
    },
    onStop() { hideMesh(mesh); },
  });
  return {
    fire(x, y, z) {
      pos.set(x, y, z);
      fx.restart(spec.life);
    },
    follow(x, y, z) {
      if (!fx.alive) return;
      pos.set(x, y, z);
    },
    get alive() { return fx.alive; },
  };
}

// State rings (enemy tell, boss slam) are re-armed only while their owner
// is actively showing them. If that update stops, they die within 2s.
export function note(mesh, life = CAP_MS) {
  if (!mesh) return;
  let fx = noted.get(mesh);
  if (!fx) {
    fx = bind({
      tag: "ring",
      mesh,
      life,
      onStop() { hideMesh(mesh); },
    });
    noted.set(mesh, fx);
  }
  fx.restart(life);
}

function sweep(now) {
  for (const mesh of [...tagged]) {
    const born = mesh.userData && mesh.userData.vfxBorn;
    const age = now - born;
    // A mesh armed during this tick is a few milliseconds newer than `now`.
    // That is not expiry. Only a real 2s age, or a broken timestamp, is.
    if (Number.isFinite(age) && age < CAP_MS) {
      if (age < -250) mesh.userData.vfxBorn = now;
      continue;
    }
    const fn = mesh.userData && mesh.userData.onVfxExpire;
    const disposable = !mesh.userData || mesh.userData.vfxDispose !== false;
    untag(mesh);
    if (fn) fn(now);
    else if (disposable) disposeMesh(mesh);
    else hideMesh(mesh);
  }
}

export function tick(now) {
  const t = Number.isFinite(now) ? now : performance.now();
  for (const fn of systems) fn(t);
  for (const rec of [...live]) {
    if (!rec.alive) { live.delete(rec); continue; }
    const age = t - rec.born;
    if (!Number.isFinite(age) || age >= rec.life || age >= CAP_MS) {
      kill(rec, t);
      continue;
    }
    if (age < -250) rec.born = t;
    if (rec.onTick) rec.onTick(1 - Math.max(0, age) / rec.life, age, t);
  }
  sweep(t);
}

export function active() {
  const now = performance.now();
  const rows = [];
  const seen = new Set();
  for (const rec of live) {
    if (!rec.alive) continue;
    if (rec.mesh) seen.add(rec.mesh);
    rows.push({ tag: rec.tag, age: Math.round(now - rec.born), life: rec.life });
  }
  for (const mesh of tagged) {
    if (seen.has(mesh) || !mesh.userData || !mesh.userData.vfx) continue;
    rows.push({
      tag: mesh.userData.vfxTag || "mesh",
      age: Math.round(now - (mesh.userData.vfxBorn || now)),
      life: CAP_MS,
    });
  }
  return rows;
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") tick(performance.now());
});
