// The First Pulse. Same Keeper, Trail Key, and command combat as the other stations.
// The realm is quantum. Companions are the Entity and a friendly native.
import * as THREE from "three";
import { clamp, damp, dampAngle, hypot2 } from "../../src/util.js";
import { heightAt } from "./world.js?v=6";
import { createHuman } from "../../src/actors.js?v=12";
import { armRing, note } from "../../src/vfx.js?v=1";
import { createEntity, createNative } from "./beings.js?v=2";
import { boss as worldBoss } from "../../bosses/first-pulse.js?v=7";
import { createAbilities } from "../../src/abilities.js?v=4";

const SAVE_KEY = "book-worlds-first-pulse";
const CLEAR_KEY = "book-worlds-world3-clear";
const CHEST_REACH = 3.4;
const GATE_REACH = 4.8;
const abilities = createAbilities();

export function createPulseSim(scene, world, audio) {
  const keeper = createHuman({
    cloth: 0xc4a574, cloth2: 0x6e3832, pants: 0x4a453c, boots: 0x2c2118,
    hat: 0x6a5134, hair: 0x3a2a22, skin: 0xd2a07c, coat: 0xb08960,
    key: true, lantern: true, sharp: true, chest: 1.02, height: 1, bulk: 1,
  });
  const entity = createEntity();
  const native = createNative({ taken: false, seed: 1, scale: 1 });
  scene.add(keeper.root, entity.root, native.root);

  const allies = [
    { id: "entity", name: "Entity", rig: entity, role: "throw", x: -1.5, z: -7.2, yaw: 0.2, side: -1.15, back: 1.7, cd: 1.4, anim: "idle", animT: 0, hp: 90, hpMax: 90, hurt: 0 },
    { id: "native", name: "Native", rig: native, role: "melee", x: 1.5, z: -6.8, yaw: -0.2, side: 1.2, back: 1.45, cd: 1.1, anim: "idle", animT: 0, hp: 84, hpMax: 84, hurt: 0 },
  ];

  const guides = [
    { line: "native-hint-hum", x: 3.4, z: 4.8 },
    { line: "native-hint-answer", x: -3.6, z: 17.2 },
    { line: "native-hint-foam", x: 4.4, z: 33.2 },
    { line: "native-hint-wave", x: -3.8, z: 55.2 },
    { line: "native-hint-invite", x: 4.1, z: 69.2 },
  ].map((spot, i) => {
    const rig = createNative({ taken: false, seed: 4 + i, scale: 0.94 });
    scene.add(rig.root);
    rig.root.position.set(spot.x, 0, spot.z);
    return { ...spot, rig, said: false };
  });

  const player = {
    x: 0, y: 0, z: -8, yaw: 0, vx: 0, vz: 0, vy: 0,
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, coins: 0, potions: 1,
    iframes: 0, action: "idle", actionT: 0, actionDur: 0.4,
    combo: 0, airCombo: 0, comboQueue: false, dodgeSide: 0, dodgeYaw: 0,
    flashCd: 0, flashMax: 7, magicLock: 0, spellCd: 0, spellMax: 1.2, grounded: true, jumps: 0, hurt: 0,
    guardT: 0, hitStop: 0, level: 1, xp: 0, xpNext: 36, str: 0, team: 0, teamHit: false,
  };

  const swingHit = new Set();
  let playerHits = 0;
  const sayQ = [];
  let sayGap = 0;
  let sayLast = "";
  let sayLastT = -10;
  let playTime = 0;
  let freedN = 0;
  const flags = {};
  const events = [];
  const pending = [];
  const shots = [];
  const enemies = [];
  let seq = 1;
  let lockTarget = null;
  let reaction = null;
  let reactCd = 0;
  let outroT = -1;
  let outroArmed = true;
  let bossWall = false;
  let gateSeen = false;
  let gateWasIn = false;
  let gateUsed = false;
  let lastPrompt = null;
  let lastObjective = "Pages 0/5";
  let posed = null;
  const scenes = {
    light: { on: false, done: false },
    dish: { on: false, done: false },
    bridge: { on: false, done: false },
    wave: { on: false, done: false },
  };

  const bossRig = worldBoss.create();
  scene.add(bossRig.root);
  const boss = {
    id: "boss", kind: "boss", name: worldBoss.name, alive: true, active: false,
    x: worldBoss.home.x, z: worldBoss.home.z, yaw: worldBoss.home.yaw,
    hp: worldBoss.hp, hpMax: worldBoss.hp, radius: worldBoss.radius,
    state: "idle", t: 0, pattern: 0, didHit: false, hit: 0, stunFor: 0,
  };
  bossRig.root.position.set(boss.x, 0, boss.z);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 28),
    new THREE.MeshBasicMaterial({ color: 0xd7e6f4, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const gust = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.62, 24),
    new THREE.MeshBasicMaterial({ color: 0xe7d7b0, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  gust.rotation.x = -Math.PI / 2;
  scene.add(gust);
  const gustFx = armRing(gust, {
    tag: "gust",
    life: 480,
    scale: (k) => 1 + (1 - k) * 8,
    opacity: (k) => k * 0.624,
  });

  function speak(id) {
    if (!id || (id === sayLast && playTime - sayLastT < 5) || sayQ.includes(id) || sayQ.length >= 4) return;
    sayLast = id;
    sayLastT = playTime;
    sayQ.push(id);
  }
  function flushSpeak(dt) {
    sayGap = Math.max(0, sayGap - dt);
    if (sayGap > 0 || !sayQ.length) return;
    sayGap = 0.45;
    pending.push({ type: "say", id: sayQ.shift() });
  }
  function scaled(amount) {
    return Math.max(1, Math.round(amount * (1 + player.str * 0.06)));
  }
  function profileFor(kind) {
    if (kind === "fog") return { hp: 42, radius: 0.55, speed: 2.5, tele: 0.42, lunge: 8.6, reach: 1.7, dmg: 8, xp: 14, flash: 28 };
    if (kind === "blanker") return { hp: 76, radius: 0.82, speed: 1.45, tele: 0.55, lunge: 7.2, reach: 2.1, dmg: 14, xp: 22, flash: 22 };
    if (kind === "wisp") return { hp: 30, radius: 0.4, speed: 3.2, tele: 0.42, lunge: 9.4, reach: 1.4, dmg: 7, xp: 12, flash: 30 };
    return { hp: 58, radius: 0.48, speed: 2.15, tele: 0.48, lunge: 8, reach: 1.75, dmg: 11, xp: 18, flash: 16 };
  }
  function makeEnemy(kind, x, z, tag) {
    const rig = createNative({
      taken: true,
      scale: kind === "blanker" ? 1.24 : kind === "wisp" ? 0.66 : 0.98,
      seed: seq + (kind === "blanker" ? 2 : 0),
    });
    scene.add(rig.root);
    const prof = profileFor(kind);
    const enemy = {
      id: "e" + (seq++), kind, rig, prof, x, z, yaw: Math.PI, y: 0, tag: tag || "",
      hp: prof.hp, hpMax: prof.hp, radius: prof.radius,
      state: "idle", t: 0, alive: true, hit: 0, didHit: false, speed: 0, stunFor: 0,
    };
    enemies.push(enemy);
    return enemy;
  }
  function clearEnemies() {
    for (const e of enemies) scene.remove(e.rig.root);
    enemies.length = 0;
  }
  function taggedAlive(tag) {
    return enemies.some((e) => e.alive && e.tag === tag);
  }

  function damageEnemy(e, amount, src, opts = {}) {
    if (!e || !e.alive) return;
    const dealt = src ? amount : scaled(amount);
    e.hp -= dealt;
    e.hit = 1;
    const sx = src ? src.x : player.x;
    const sz = src ? src.z : player.z;
    const dx = e.x - sx;
    const dz = e.z - sz;
    const len = hypot2(dx, dz) || 1;
    const shove = (e.kind === "boss" ? 0.48 : 1.35) + (opts.knock || 0);
    e.x += (dx / len) * shove;
    e.z += (dz / len) * shove;
    events.push({ type: "dmg", x: e.x, y: 1.6, z: e.z, n: Math.round(dealt) });
    if (opts.knock) audio.finisher();
    else audio.hit();
    if (!src) {
      player.team = Math.min(100, player.team + (opts.knock ? 16 : 10));
      player.hitStop = Math.max(player.hitStop, opts.knock ? 0.09 : 0.055);
      events.push({ type: "hit", heavy: !!opts.knock });
      if (!flags.fight) {
        flags.fight = true;
        speak("entity-fight");
        speak("native-fight");
      }
    }
    if (opts.knock && e.alive && e.kind !== "boss") {
      e.state = "stun";
      e.t = 0;
      e.stunFor = Math.max(e.stunFor || 0, 0.35);
    }
    if (e.hp <= 0) {
      e.hp = 0;
      e.alive = false;
      e.state = "dead";
      e.t = 0;
      if (e.kind !== "boss") {
        player.coins += 3;
        if (e.rig.setFree) {
          e.rig.setFree();
          e.freed = true;
        }
        freedN += 1;
        speak("native-free");
      }
      grantXp(e.kind === "boss" ? 90 : e.prof.xp);
      if (e.kind === "boss") {
        freedN += 1;
        audio.roar();
        flags.won = true;
        bossWall = false;
        audio.setTension(0);
        if (abilities.unlock("pulse")) events.push({ type: "ability", id: "pulse" });
        speak("entity-win");
        speak("native-win");
      }
    }
  }

  function hurtAlly(a, amount, sx, sz) {
    if (!a || a.hp <= 0) return;
    a.hp = Math.max(0, a.hp - amount);
    a.hurt = 2.4;
    if (sx != null) {
      const dx = a.x - sx;
      const dz = a.z - sz;
      const len = hypot2(dx, dz) || 1;
      a.x += (dx / len) * 0.55;
      a.z += (dz / len) * 0.55;
    }
    if (a.id === "native" && !flags.nativeHurt) { flags.nativeHurt = true; speak("native-hurt"); }
  }
  function hurtPlayer(amount, sx, sz, attacker) {
    if (player.iframes > 0 || player.hp <= 0) return;
    if (player.action === "dodge" && player.actionT < 0.72) return;
    const dx = player.x - sx;
    const dz = player.z - sz;
    const len = hypot2(dx, dz) || 1;
    const facing = Math.sin(player.yaw) * (sx - player.x) + Math.cos(player.yaw) * (sz - player.z);
    if (player.action === "guard" && facing > 0.15) {
      if (player.guardT < 0.18) {
        player.iframes = 0.28;
        player.hitStop = Math.max(player.hitStop, 0.08);
        audio.parry();
        events.push({ type: "hit", heavy: true });
        events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "Parry" });
        if (attacker && attacker.alive && attacker.kind !== "boss") {
          attacker.state = "stun";
          attacker.t = 0;
          attacker.stunFor = 0.85;
        } else if (attacker && attacker.kind === "boss" && attacker.alive) {
          attacker.state = "stagger";
          attacker.t = 0;
          attacker.stunFor = 0.7;
        }
        player.team = Math.min(100, player.team + 12);
        return;
      }
      amount = Math.max(1, Math.round(amount * 0.22));
      audio.guard();
    }
    player.hp = Math.max(0, player.hp - amount);
    player.iframes = 0.55;
    player.hurt = 1;
    player.vx += (dx / len) * 9;
    player.vz += (dz / len) * 9;
    audio.hurt();
    events.push({ type: "hurt" });
    events.push({ type: "dmg", x: player.x, y: 1.7, z: player.z, n: Math.round(amount) });
    if (player.hp < 36 && !flags.low) { flags.low = true; speak("entity-low"); }
    if (player.hp <= 0) {
      player.hp = 0;
      player.action = "dead";
      events.push({ type: "dead" });
    }
  }

  function inFront(ax, az, yaw, bx, bz, reach, minDot) {
    const dx = bx - ax;
    const dz = bz - az;
    const d = hypot2(dx, dz);
    if (d > reach) return false;
    if (d < 0.001) return true;
    return (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / d > minDot;
  }
  function living() {
    return enemies.filter((e) => e.alive).concat(boss.alive && boss.active ? [boss] : []);
  }
  function nearest(x, z, max) {
    let best = null;
    let bestD = max;
    for (const e of living()) {
      const d = hypot2(e.x - x, e.z - z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
  function lightPath() {
    if (flags.pathLit) return;
    flags.pathLit = true;
    if (world.setPathLit) world.setPathLit(true);
  }
  function abilityCtx() {
    return {
      player, living, damageEnemy, events, audio,
      resolve: (x, z, r) => world.resolve(x, z, r),
      onCast(id) {
        if (id === "pulse" && player.z > 32 && player.z < 44) lightPath();
      },
    };
  }

  function showTell(e) {
    if (!e.tell) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.62, 28),
        new THREE.MeshBasicMaterial({ color: 0xff5a32, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.renderOrder = 3;
      scene.add(mesh);
      e.tell = mesh;
    }
    const wind = e.state === "wind";
    const k = wind ? Math.min(1, e.t / Math.max(0.2, e.prof.tele || 0.4)) : 1;
    e.tell.visible = true;
    e.tell.position.set(e.x, 0.08, e.z);
    e.tell.scale.setScalar(wind ? 0.55 + k * 2.15 : 2.1);
    e.tell.material.opacity = wind ? 0.45 + k * 0.5 : 0.95;
    e.tell.material.color.setHex(wind && k < 0.72 ? 0xffc56a : 0xff2a1c);
    note(e.tell);
  }

  function updateEnemy(e, dt) {
    e.hit = Math.max(0, e.hit - dt * 2.4);
    e._swing = false;
    if (!e.alive) {
      e.t += dt;
      e.rig.root.position.set(e.x, 0, e.z);
      e.rig.root.rotation.z = 0;
      e.rig.update(dt, { speed: 0, air: false, action: "idle", actionT: 0, combo: 0, look: 0, hurt: 0, dodgeSide: 0, hit: 0, tele: false, strike: false });
      if (e.tell) e.tell.visible = false;
      return;
    }
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = hypot2(dx, dz);
    const face = Math.atan2(dx, dz);
    e.speed = 0;
    if (e.state === "stun") {
      e.t += dt;
      if (e.t > e.stunFor) { e.state = "chase"; e.t = 0; }
    } else if (e.state === "wind") {
      e.t += dt;
      e.yaw = dampAngle(e.yaw, face, 10, dt);
      if (e.t > Math.max(0.28, e.prof.tele || 0.42)) {
        e.state = "strike";
        e.t = 0;
        e.didHit = false;
        e.allyHit = false;
      }
    } else if (e.state === "strike") {
      const prev = e.t;
      e.t += dt;
      e.speed = prev < 0.36 ? Math.max(6.4, e.prof.lunge || 8) : 0;
      e._swing = e.t > 0.05 && prev < 0.48;
      if (e.t > 0.52) { e.state = "chase"; e.t = 0; }
    } else if (dist < 16) {
      e.state = "chase";
      e.yaw = dampAngle(e.yaw, face, 6, dt);
      if (dist > (e.prof.reach || 1.5) * 0.9) e.speed = e.prof.speed;
      else {
        e.state = "wind";
        e.t = 0;
        e.didHit = false;
        e.allyHit = false;
      }
    } else e.state = "idle";
    if (e.speed > 0) {
      e.x += Math.sin(e.yaw) * e.speed * dt;
      e.z += Math.cos(e.yaw) * e.speed * dt;
    }
    const c = world.resolve(e.x, e.z, e.radius * 0.6);
    e.x = c.x;
    e.z = c.z;
    if (e._swing) {
      const reach = (e.prof.reach || 1.5) + 1.15;
      if (!e.didHit && hypot2(player.x - e.x, player.z - e.z) < reach) {
        e.didHit = true;
        hurtPlayer(e.prof.dmg, e.x, e.z, e);
      }
      if (!e.allyHit) {
        for (const a of allies) {
          if (a.hp <= 0) continue;
          if (hypot2(a.x - e.x, a.z - e.z) < reach) {
            e.allyHit = true;
            hurtAlly(a, Math.max(4, Math.round(e.prof.dmg * 0.65)), e.x, e.z);
            break;
          }
        }
      }
    }
    if (e.state === "wind" || e._swing) showTell(e);
    else if (e.tell) e.tell.visible = false;
    e.rig.root.position.set(e.x, 0, e.z);
    e.rig.root.rotation.y = e.yaw;
    e.rig.root.rotation.z = 0;
    const telling = e.state === "wind" || e.state === "strike";
    e.rig.update(dt, {
      speed: e.speed, air: false,
      action: e.state === "strike" ? "attack" : "idle",
      actionT: e.state === "strike" ? e.t / 0.42 : 0,
      combo: 1, look: 0, hurt: e.hit,
      tele: e.state === "wind", strike: e.state === "strike",
      hit: telling ? 1 : e.hit,
    });
  }

  function bossPhase() {
    const r = boss.hp / boss.hpMax;
    if (r > 0.66) return 1;
    if (r > 0.33) return 2;
    return 3;
  }
  function beginBoss(name) {
    boss.state = name + "Wind";
    boss.t = 0;
    boss.didHit = false;
    boss.allyHit = false;
    if (name === "charge" || name === "pulse") boss.yaw = Math.atan2(player.x - boss.x, player.z - boss.z);
  }
  function showRing(radius, k, color) {
    ring.position.set(boss.x, 0.08, boss.z);
    ring.scale.setScalar(Math.max(0.2, radius * k));
    ring.material.opacity = 0.16 + 0.5 * k;
    ring.material.color.setHex(color || 0xd7e6f4);
    note(ring);
  }
  function updateBoss(dt) {
    boss.hit = Math.max(0, boss.hit - dt * 2.5);
    if (!boss.alive) {
      boss.t += dt;
      bossRig.root.position.y = -Math.min(1.2, boss.t) * 0.35;
      bossRig.update(dt, { moving: false, state: "dead", hit: 0, phase: 3 });
      ring.material.opacity = 0;
      return;
    }
    if (!boss.active && scenes.wave.done && player.z > 74) wakeBossFight();
    if (!boss.active) {
      bossRig.root.position.set(boss.x, 0, boss.z);
      bossRig.root.rotation.y = boss.yaw;
      bossRig.update(dt, { moving: false, state: "idle", hit: 0, phase: 1 });
      return;
    }
    boss.t += dt;
    let moving = false;
    const face = Math.atan2(player.x - boss.x, player.z - boss.z);
    const phase = bossPhase();
    if (!flags.phase2 && phase >= 2) {
      flags.phase2 = true;
      speak("entity-half");
      audio.roar();
      boss.state = "roarWind";
      boss.t = 0;
    }
    if (boss.state === "intro") {
      boss.yaw = dampAngle(boss.yaw, face, 4, dt);
      if (boss.t > 1.25) beginBoss("pulse");
    } else if (boss.state.endsWith("Wind")) {
      boss.yaw = dampAngle(boss.yaw, face, 6, dt);
      const need = (boss.state === "roarWind" ? 0.95 : boss.state === "pulseWind" ? 0.7 : 0.62) * (phase === 3 ? 0.72 : 1);
      const rad = boss.state === "roarWind" ? 6.2 : boss.state === "pulseWind" ? 4.6 : 3.2;
      showRing(rad, boss.t / need, boss.state.startsWith("pulse") ? 0xc5d6ea : 0xe7c48a);
      if (boss.t > need) {
        boss.state = boss.state.replace("Wind", "");
        boss.t = 0;
        boss.didHit = false;
        if (boss.state === "charge" || boss.state === "roar") audio.roar();
      }
    } else if (boss.state === "charge") {
      moving = true;
      const sp = phase === 3 ? 10.2 : 8.4;
      boss.x += Math.sin(boss.yaw) * sp * dt;
      boss.z += Math.cos(boss.yaw) * sp * dt;
      showRing(3.1, 1, 0xe7c48a);
      if (!boss.didHit && hypot2(player.x - boss.x, player.z - boss.z) < boss.radius + 1.4) {
        boss.didHit = true;
        hurtPlayer(30, boss.x, boss.z, boss);
      }
      if (boss.t > 0.9) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "pulse" || boss.state === "roar" || boss.state === "slam") {
      const rad = boss.state === "roar" ? 5.6 : boss.state === "pulse" ? 6.4 : 4.1;
      showRing(rad, 1, boss.state === "pulse" ? 0xd5e4f4 : 0xe7c48a);
      if (!boss.didHit && boss.t > 0.08 && hypot2(player.x - boss.x, player.z - boss.z) < rad) {
        boss.didHit = true;
        hurtPlayer(boss.state === "roar" ? 22 : boss.state === "pulse" ? 26 : 24, boss.x, boss.z, boss);
        for (const a of allies) {
          if (hypot2(a.x - boss.x, a.z - boss.z) < rad) hurtAlly(a, 12, boss.x, boss.z);
        }
      }
      if (boss.t > 0.4) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "stagger") {
      ring.material.opacity = 0;
      if (boss.t > (boss.stunFor || 0.6)) { boss.state = "recover"; boss.t = 0; }
    } else {
      ring.material.opacity = Math.max(0, ring.material.opacity - dt * 2);
      if (boss.t > (phase === 3 ? 0.4 : 0.6)) {
        const cycle = phase === 1 ? ["pulse", "charge", "slam"] : phase === 2 ? ["pulse", "slam", "charge", "roar"] : ["roar", "pulse", "charge", "slam"];
        beginBoss(cycle[boss.pattern % cycle.length]);
        boss.pattern += 1;
      }
    }
    boss.x = clamp(boss.x, -9, 9);
    boss.z = clamp(boss.z, 76, 92);
    const solved = world.resolve(boss.x, boss.z, 1.1);
    boss.x = solved.x;
    boss.z = clamp(solved.z, 76, 92);
    bossRig.root.position.set(boss.x, 0, boss.z);
    bossRig.root.rotation.y = boss.yaw;
    bossRig.update(dt, {
      moving, state: boss.state, hit: boss.hit, phase,
      tell: String(boss.state).endsWith("Wind") ? Math.min(1, boss.t / 0.55) : 0,
    });
  }

  function wakeBossFight() {
    if (boss.active) return;
    boss.active = true;
    boss.state = "intro";
    boss.t = 0;
    bossWall = true;
    audio.roar();
    audio.setTension(1);
    speak("entity-boss");
    speak("native-boss");
    pending.push({ type: "boss" });
    pending.push({ type: "bulletin", id: "boss" });
  }

  function separate() {
    const list = enemies.filter((e) => e.alive);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        const d = hypot2(dx, dz) || 0.001;
        const min = a.radius + b.radius;
        if (d < min) {
          const p = (min - d) / d * 0.5;
          a.x -= dx * p; a.z -= dz * p;
          b.x += dx * p; b.z += dz * p;
        }
      }
    }
  }

  function updateAllies(dt) {
    if (posed) {
      for (const a of allies) {
        a.yaw = posed.yaw;
        a.rig.root.position.set(a.x, 0, a.z);
        a.rig.root.rotation.y = a.yaw;
        a.rig.update(dt, { speed: 0, air: false, action: "idle", actionT: 0, combo: 0, look: 0, hurt: 0, dodgeSide: 0 });
      }
      return;
    }
    for (const a of allies) {
      const fx = Math.sin(player.yaw);
      const fz = Math.cos(player.yaw);
      const rx = Math.cos(player.yaw);
      const rz = -Math.sin(player.yaw);
      const tx = player.x - fx * a.back + rx * a.side;
      const tz = player.z - fz * a.back + rz * a.side;
      let dx = tx - a.x;
      let dz = tz - a.z;
      const d = hypot2(dx, dz);
      if (d > 0.2) {
        const step = Math.min(d, (d > 5 ? 6.6 : 4.4) * dt);
        a.x += (dx / d) * step;
        a.z += (dz / d) * step;
      }
      const c = world.resolve(a.x, a.z, 0.32);
      a.x = c.x;
      a.z = c.z;
      const foe = nearest(a.x, a.z, 12);
      if (foe) a.yaw = dampAngle(a.yaw, Math.atan2(foe.x - a.x, foe.z - a.z), 8, dt);
      else if (d > 0.4) a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 8, dt);
      a.cd = Math.max(0, a.cd - dt);
      a.hurt = Math.max(0, a.hurt - dt);
      if (a.hp <= 0 && a.hurt <= 0) a.hp = Math.round(a.hpMax * 0.4);
      else if (a.hurt <= 0) a.hp = Math.min(a.hpMax, a.hp + dt * 1.6);
      if (a.anim !== "idle") {
        a.animT += dt / 0.4;
        if (a.animT >= 1) a.anim = "idle";
      }
      if (foe && player.hp > 0 && a.anim === "idle") {
        const fd = hypot2(foe.x - a.x, foe.z - a.z);
        if (a.role === "melee" && fd < 2.2 && a.cd <= 0) {
          a.cd = 2.8;
          a.anim = "shove";
          a.animT = 0;
          damageEnemy(foe, 12, a);
        } else if (a.role === "throw" && fd < 11 && a.cd <= 0) {
          a.cd = 3.4;
          a.anim = "throw";
          a.animT = 0;
          damageEnemy(foe, 8, a);
        }
      }
      a.rig.root.position.set(a.x, 0, a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, {
        speed: d > 0.3 ? Math.min(5, d) : 0,
        air: false, action: a.anim, actionT: a.animT, combo: 1, look: 0, hurt: 0, dodgeSide: 0,
      });
    }
  }

  function pageCount() {
    return world.pages.filter((p) => p.got).length;
  }
  function collectPage() {
    for (const p of world.pages) {
      if (p.got) continue;
      if (hypot2(p.x - player.x, p.z - player.z) < 1.6) {
        p.got = true;
        p.mesh.visible = false;
        audio.chest();
        if (!flags.paged) { flags.paged = true; speak("entity-page"); speak("native-page"); }
        return { type: "page", id: p.id, n: pageCount() };
      }
    }
    return null;
  }
  function tryChests() {
    for (const chest of world.chests) {
      if (!chest.open && hypot2(chest.x - player.x, chest.z - player.z) < CHEST_REACH) return chest;
    }
    return null;
  }
  function openChest(chest) {
    if (!chest || chest.open) return;
    chest.open = true;
    player.potions += 1;
    player.coins += 12;
    audio.chest();
    events.push({ type: "dmg", x: chest.x, y: 1.2, z: chest.z, n: 12, coin: true });
    speak("native-chest");
  }

  function updateScenes() {
    if (!scenes.light.on && player.z > 2) {
      scenes.light.on = true;
      makeEnemy("fog", -2.4, 8, "light");
      makeEnemy("wisp", 0.4, 10.5, "light");
      makeEnemy("fog", 2.6, 12, "light");
      if (!flags.pulseGiven) {
        flags.pulseGiven = true;
        if (abilities.unlock("pulse")) pending.push({ type: "ability", id: "pulse" });
      }
      speak("entity-light");
      speak("native-light");
      events.push({ type: "bulletin", id: "scene-light" });
    }
    if (scenes.light.on && !scenes.light.done && !taggedAlive("light")) scenes.light.done = true;
    if (!scenes.dish.on && player.z > 20) {
      scenes.dish.on = true;
      makeEnemy("fog", -3, 24, "dish");
      makeEnemy("blanker", 2.4, 32, "dish");
      speak("entity-foam");
      speak("native-foam");
      events.push({ type: "bulletin", id: "scene-dish" });
    }
    if (scenes.dish.on && !scenes.dish.done && !taggedAlive("dish")) scenes.dish.done = true;
    if (!scenes.bridge.on && player.z > 42) {
      scenes.bridge.on = true;
      makeEnemy("fog", -2, 46, "bridge");
      makeEnemy("fog", 2.2, 52, "bridge");
      speak("entity-ripple");
      speak("native-ripple");
      events.push({ type: "bulletin", id: "scene-bridge" });
    }
    if (scenes.bridge.on && !scenes.bridge.done && !taggedAlive("bridge")) scenes.bridge.done = true;
    if (!scenes.wave.on && player.z > 66) {
      scenes.wave.on = true;
      makeEnemy("blanker", -2.5, 72, "wave");
      makeEnemy("fog", 2.8, 74, "wave");
      speak("entity-wave");
      speak("native-wave");
      events.push({ type: "bulletin", id: "scene-wave" });
    }
    if (scenes.wave.on && !scenes.wave.done && !taggedAlive("wave")) scenes.wave.done = true;
  }

  function grantXp(n) {
    player.xp += n;
    let ups = 0;
    while (player.xp >= player.xpNext) {
      player.xp -= player.xpNext;
      player.level += 1;
      player.xpNext = Math.round(player.xpNext * 1.4 + 8);
      player.hpMax += 12;
      player.mpMax += 8;
      player.hp = player.hpMax;
      player.mp = player.mpMax;
      player.str += 1;
      ups += 1;
    }
    if (ups) {
      audio.level();
      events.push({ type: "level", n: player.level, x: player.x, y: 2.1, z: player.z });
      if (!flags.levelTalk) { flags.levelTalk = true; speak("entity-level"); }
    }
  }

  function aimTarget() {
    if (lockTarget && lockTarget.alive) return lockTarget;
    return nearest(player.x, player.z, 7.5);
  }
  function findLock() {
    if (lockTarget && !lockTarget.alive) lockTarget = null;
  }
  function toggleLock() {
    const list = living();
    if (!list.length) { lockTarget = null; return; }
    if (!lockTarget) lockTarget = nearest(player.x, player.z, 16);
    else {
      const i = list.indexOf(lockTarget);
      lockTarget = list[(i + 1) % list.length];
    }
  }
  function cycleLock(dir) { toggleLock(); void dir; }

  function startAttack(n) {
    const air = !player.grounded;
    player.action = "attack";
    player.combo = n;
    player.airCombo = air ? n : 0;
    player.comboQueue = false;
    player.actionT = 0;
    const finisher = air ? n >= 3 : n >= 4;
    player.actionDur = finisher ? 0.46 : 0.28;
    swingHit.clear();
    const tgt = aimTarget();
    if (tgt) {
      player.yaw = Math.atan2(tgt.x - player.x, tgt.z - player.z);
      const dx = tgt.x - player.x;
      const dz = tgt.z - player.z;
      const d = hypot2(dx, dz) || 1;
      if (d > 1.2 && d < 7.5) {
        const pull = Math.min(d - 1.15, air ? 2.6 : 1.9);
        player.x += (dx / d) * pull;
        player.z += (dz / d) * pull;
      }
    } else if (hypot2(player.vx, player.vz) > 0.4) player.yaw = Math.atan2(player.vx, player.vz);
    audio.swing();
  }
  function startDodge(wx, wz, camYaw) {
    player.action = "dodge";
    player.actionT = 0;
    player.actionDur = 0.46;
    const mag = hypot2(wx, wz);
    player.dodgeYaw = mag > 0.2 ? Math.atan2(wx, wz) : camYaw + Math.PI;
    player.dodgeSide = Math.sin(player.dodgeYaw - camYaw);
    player.iframes = 0.42;
    player.combo = 0;
  }
  function spend(cost) {
    if (player.mp < cost || player.spellCd > 0 || player.magicLock > 0 || player.hp <= 0) return false;
    player.mp -= cost;
    player.magicLock = 0.34;
    player.spellCd = player.spellMax;
    return true;
  }
  function spellAim() {
    let best = null;
    let bestD = 13;
    const fx = Math.sin(player.yaw);
    const fz = Math.cos(player.yaw);
    for (const e of living()) {
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const d = hypot2(dx, dz);
      if (d > 13 || d < 0.08) continue;
      const dot = (fx * dx + fz * dz) / d;
      if (dot < 0.12) continue;
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) player.yaw = Math.atan2(best.x - player.x, best.z - player.z);
    return best;
  }
  function startFlash() {
    if (player.action === "dodge" || player.action === "team") return;
    if (!spend(25)) return;
    const aimed = spellAim();
    player.action = "flash";
    player.actionT = 0;
    player.actionDur = 0.42;
    audio.flash();
    events.push({ type: "flash" });
    for (const e of living()) {
      const d = hypot2(e.x - player.x, e.z - player.z);
      const aimedHit = aimed && e.id === aimed.id;
      const rad = aimedHit ? 13 : (e.kind === "boss" ? 5.2 : 4.3);
      if (d < rad) {
        damageEnemy(e, e.kind === "boss" ? 34 : (e.prof ? e.prof.flash : 16));
        if (e.alive && e.kind === "boss") { e.state = "stagger"; e.t = 0; e.stunFor = 0.8; }
        else if (e.alive) { e.state = "stun"; e.t = 0; e.stunFor = 1.2; }
        playerHits += 1;
      }
    }
  }
  function startDevil() {
    if (player.action === "dodge" || player.action === "team") return;
    if (!spend(20)) return;
    const aimed = spellAim();
    player.action = "flash";
    player.actionT = 0;
    player.actionDur = 0.38;
    gustFx.fire(player.x, 0.08, player.z);
    audio.wind();
    for (const e of living()) {
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const d = hypot2(dx, dz);
      if ((!(aimed && e.id === aimed.id) && d > 5.4) || d < 0.05) continue;
      damageEnemy(e, e.kind === "boss" ? 16 : 13);
      const push = e.kind === "boss" ? 0.4 : 2;
      e.x += (dx / d) * push;
      e.z += (dz / d) * push;
      if (e.alive && e.kind !== "boss") { e.state = "stun"; e.t = 0; e.stunFor = 0.5; }
      playerHits += 1;
    }
  }
  function startMend() {
    if (player.action === "dodge") return;
    if (player.hp >= player.hpMax && allies.every((a) => a.hp >= a.hpMax)) return;
    if (!spend(30)) return;
    player.hp = Math.min(player.hpMax, player.hp + 36);
    for (const a of allies) a.hp = Math.min(a.hpMax, a.hp + 22);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "+HP" });
  }
  function startTeam() {
    if (player.team < 100 || player.hp <= 0 || player.action === "dodge") return;
    player.team = 0;
    player.action = "team";
    player.actionT = 0;
    player.actionDur = 0.86;
    player.teamHit = false;
    player.vy = 11;
    player.grounded = false;
    player.jumps = 2;
    audio.swing();
    speak("native-toss");
  }
  function drink() {
    if (player.potions <= 0 || player.hp >= player.hpMax) return;
    player.potions -= 1;
    player.hp = Math.min(player.hpMax, player.hp + 42);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "+HP" });
  }
  function pickReaction() {
    if (boss.active && boss.alive && boss.state === "pulseWind" && reactCd <= 0 && boss.t > 0.08 && boss.t < 0.55) {
      return { id: "ground", label: "Ground the wave!" };
    }
    return null;
  }
  function fireReaction() {
    if (!reaction || reaction.id !== "ground" || !boss.alive) return false;
    reactCd = 6;
    boss.state = "stagger";
    boss.t = 0;
    boss.stunFor = 1.2;
    damageEnemy(boss, 40, null, { knock: 0.2 });
    playerHits += 1;
    audio.parry();
    speak("entity-react");
    return true;
  }
  function colorDrain() {
    let drain = 0;
    const sources = enemies.filter((e) => e.alive);
    if (boss.alive && boss.active) sources.push(boss);
    for (const e of sources) {
      const d = hypot2(e.x - player.x, e.z - player.z);
      const inner = e.kind === "boss" ? worldBoss.drain.inner : e.kind === "blanker" ? 5.5 : 3.4;
      const outer = e.kind === "boss" ? worldBoss.drain.outer : inner + 5;
      const t = d <= inner ? 1 : clamp(1 - (d - inner) / (outer - inner), 0, 1);
      drain = Math.max(drain, t);
    }
    return drain;
  }

  function saveBody() {
    return {
      v: 1,
      x: player.x, z: player.z, yaw: player.yaw,
      hpMax: player.hpMax, mpMax: player.mpMax,
      coins: player.coins, potions: player.potions,
      level: player.level, xp: player.xp, xpNext: player.xpNext, str: player.str,
      pages: world.pages.filter((p) => p.got).map((p) => p.id),
      bossDead: !boss.alive,
      complete: !!flags.cleared,
      scenes: { light: scenes.light.done, dish: scenes.dish.done, bridge: scenes.bridge.done, wave: scenes.wave.done },
      path: !!flags.pathLit,
      chests: world.chests.map((c) => !!c.open),
    };
  }
  function persist(complete) {
    if (complete) flags.cleared = true;
    const data = saveBody();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
    if (data.complete) {
      try { localStorage.setItem(CLEAR_KEY, "1"); } catch { /* private mode */ }
      abilities.unlock("pulse");
    }
  }
  function armExit() {
    bossWall = false;
    if (world.gate && world.gate.setReady) world.gate.setReady(true);
  }
  function gateEntered() {
    if (boss.alive || !world.gate) {
      gateSeen = false;
      gateWasIn = false;
      return false;
    }
    const inside = hypot2(player.x - world.gate.x, player.z - world.gate.z) < GATE_REACH;
    if (!gateSeen) {
      gateSeen = true;
      gateWasIn = inside;
      return false;
    }
    const entered = inside && !gateWasIn;
    gateWasIn = inside;
    return entered;
  }
  function stepThrough() {
    if (gateUsed || boss.alive) return;
    gateUsed = true;
    if (world.gate) world.gate.setOpen(true);
    persist(true);
    events.push({ type: "gate" });
    speak("entity-gate");
  }
  function writeSave() {
    player.hp = player.hpMax;
    player.mp = player.mpMax;
    for (const a of allies) a.hp = a.hpMax;
    persist(false);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "Saved" });
    speak("entity-save");
  }
  function applySave(data) {
    player.x = data.x;
    player.z = data.z;
    player.y = 0;
    player.yaw = data.yaw || 0;
    player.hpMax = data.hpMax || 100;
    player.mpMax = data.mpMax || 100;
    player.hp = player.hpMax;
    player.mp = player.mpMax;
    player.coins = data.coins || 0;
    player.potions = data.potions || 0;
    player.level = data.level || 1;
    player.xp = data.xp || 0;
    player.xpNext = data.xpNext || 36;
    player.str = data.str || 0;
    const got = new Set(data.pages || []);
    for (const p of world.pages) {
      p.got = got.has(p.id);
      p.mesh.visible = !p.got;
    }
    if (data.scenes) {
      scenes.light.done = !!data.scenes.light;
      scenes.dish.done = !!data.scenes.dish;
      scenes.bridge.done = !!data.scenes.bridge;
      scenes.wave.done = !!data.scenes.wave;
      if (scenes.light.done) scenes.light.on = true;
      if (scenes.dish.done) scenes.dish.on = true;
      if (scenes.bridge.done) scenes.bridge.on = true;
      if (scenes.wave.done) scenes.wave.on = true;
    }
    (data.chests || []).forEach((open, i) => {
      if (open && world.chests[i]) world.chests[i].open = true;
    });
    if (data.bossDead) {
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 2;
      flags.won = true;
      abilities.unlock("pulse");
      armExit();
    }
    if (data.path || (data.scenes && data.scenes.light)) {
      flags.pulseGiven = true;
      abilities.unlock("pulse");
    }
    if (data.path || player.z > 42 || (data.scenes && data.scenes.bridge)) lightPath();
    if (data.complete) flags.cleared = true;
    flags.g1 = true;
    flags.g2 = true;
  }

  function updateGuides(dt) {
    for (const g of guides) {
      g.rig.root.position.set(g.x, 0, g.z);
      const face = Math.atan2(player.x - g.x, player.z - g.z);
      g.rig.root.rotation.y = face;
      g.rig.update(dt, { speed: 0, action: "idle", actionT: 0 });
      if (!g.said && hypot2(player.x - g.x, player.z - g.z) < 3.1) {
        g.said = true;
        speak(g.line);
      }
    }
  }

  function idlePresentation(dt) {
    keeper.root.position.set(player.x, 0, player.z);
    keeper.root.rotation.y = player.yaw;
    keeper.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0.15, dodgeSide: 0 });
    for (const a of allies) {
      a.rig.root.position.set(a.x, 0, a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0, dodgeSide: 0 });
    }
    bossRig.root.position.set(boss.x, 0, boss.z);
    bossRig.update(dt, { moving: false, state: boss.alive ? "idle" : "dead", hit: 0, phase: 1 });
    updateGuides(dt);
  }

  function snapshot(camYaw, prompt, objective) {
    return {
      player: {
        x: player.x, y: player.y, z: player.z, yaw: player.yaw, hp: player.hp, hpMax: player.hpMax,
        mp: player.mp, mpMax: player.mpMax,
        spell: player.spellMax > 0 ? 1 - player.spellCd / player.spellMax : 1,
        coins: player.coins, potions: player.potions,
        flash: player.mp / player.mpMax,
        combo: player.action === "attack" ? player.combo : 0,
        hits: playerHits, level: player.level, xp: player.xp, xpNext: player.xpNext, team: player.team,
        action: player.action, guarding: player.action === "guard",
        speed: Math.hypot(player.vx, player.vz),
      },
      party: allies.map((a) => ({ id: a.id, name: a.name, hp: a.hp, hpMax: a.hpMax })),
      reaction: reaction ? { id: reaction.id, label: reaction.label } : null,
      heads: {
        keeper: { x: player.x, y: 1.85, z: player.z },
        entity: { x: allies[0].x, y: 1.9, z: allies[0].z },
        native: { x: allies[1].x, y: 1.85, z: allies[1].z },
      },
      enemies: enemies.filter((e) => e.rig.root.visible).map((e) => ({
        id: e.id, kind: e.kind, hp: e.hp, alive: e.alive, x: e.x, y: 1.4, z: e.z,
      })),
      boss: {
        name: boss.name, alive: boss.alive, active: boss.active, hp: boss.hp, hpMax: boss.hpMax,
        x: boss.x, y: 2.6, z: boss.z,
      },
      lock: lockTarget && lockTarget.alive ? {
        id: lockTarget.id, x: lockTarget.x,
        y: lockTarget.kind === "boss" ? 2.4 : 1.5,
        z: lockTarget.z,
      } : null,
      prompt,
      pages: pageCount(),
      circus: scenes.dish.done,
      objective: objective || "Pages 0/5",
      tutor: null,
      drain: colorDrain(),
      events,
      camYaw,
    };
  }

  function objectiveFor() {
    if (boss.active && boss.alive && flags.phase2) return "The hum is changing";
    if (boss.active && boss.alive) return "Break the hum";
    if (!boss.alive) return "Step through to the mountain";
    if (!flags.pathLit) return abilities.has("pulse") && player.z > 28 ? "Pulse the dark path" : "Clear the first light";
    if (!scenes.bridge.done) return "Quiet the ripples";
    if (!scenes.wave.done) return "Cross the wave";
    if (boss.alive) return "The Hum in the wave";
    return `Pages ${pageCount()}/5`;
  }

  function update(dt, input, camYaw, play, fresh = true) {
    if (fresh) {
      events.length = 0;
      while (pending.length) events.push(pending.shift());
    }
    if (!play) {
      idlePresentation(dt);
      return snapshot(camYaw, null);
    }
    flushSpeak(dt);
    if (player.hp <= 0) return snapshot(camYaw, lastPrompt, lastObjective);
    if (player.hitStop > 0) {
      player.hitStop = Math.max(0, player.hitStop - dt);
      return snapshot(camYaw, lastPrompt, lastObjective);
    }
    const edge = input.pull();
    const axes = input.axes();
    playTime += dt;
    if (!flags.g1) { flags.g1 = true; speak("entity-greet"); }
    if (!flags.g2 && playTime > 3.6) { flags.g2 = true; speak("native-greet"); }
    player.flashCd = Math.max(0, player.flashCd - dt);
    player.spellCd = Math.max(0, player.spellCd - dt);
    player.magicLock = Math.max(0, player.magicLock - dt);
    player.iframes = Math.max(0, player.iframes - dt);
    player.hurt = Math.max(0, player.hurt - dt * 2);
    reactCd = Math.max(0, reactCd - dt);

    const mag = clamp(Math.hypot(axes.fwd, axes.strafe), 0, 1);
    let wishX = 0;
    let wishZ = 0;
    if (mag > 0.05) {
      const nx = axes.strafe / mag;
      const nz = axes.fwd / mag;
      wishX = Math.sin(camYaw) * nz - Math.cos(camYaw) * nx;
      wishZ = Math.cos(camYaw) * nz + Math.sin(camYaw) * nx;
    }
    const airChain = player.airCombo > 0 || !player.grounded;
    const chainMax = airChain ? 3 : 4;
    const chestNow = tryChests();
    if (edge.attack && chestNow) openChest(chestNow);
    else if (edge.attack && player.action === "attack" && player.actionT > 0.2 && player.combo < chainMax) player.comboQueue = true;
    else if (edge.attack && (player.action === "idle" || player.action === "flash" || player.action === "guard")) startAttack(1);
    if (edge.dodge && player.action !== "dodge" && player.grounded) startDodge(wishX, wishZ, camYaw);
    if (edge.jump && player.action !== "dodge") {
      if (player.grounded) {
        player.vy = 8.6;
        player.grounded = false;
        player.jumps = 1;
        if (player.action === "guard") player.action = "idle";
        audio.jump();
      } else if (player.jumps < 2) {
        player.vy = 11.4;
        player.jumps = 2;
        audio.jump();
      }
    }
    if (edge.potion) drink();
    if (edge.lock) toggleLock();
    if (edge.recenter) events.push({ type: "recenter" });
    if (edge.cycle) cycleLock(1);
    if (edge.devil) startDevil();
    if (edge.mend) startMend();
    if (edge.special) startTeam();
    if (edge.lasso) abilities.cast("lasso", abilityCtx());
    if (edge.steam) abilities.cast("steam", abilityCtx());
    if (edge.pulse) abilities.cast("pulse", abilityCtx());
    if (edge.firelight) abilities.cast("firelight", abilityCtx());
    if (edge.argon) abilities.cast("argon", abilityCtx());
    const held = input.held ? input.held() : { guard: false };
    if (held.guard && player.grounded && player.action !== "attack" && player.action !== "dodge" && player.action !== "team" && player.action !== "flash") {
      if (player.action !== "guard") {
        player.action = "guard";
        player.guardT = 0;
        player.actionT = 0;
        player.actionDur = 1;
      }
      player.guardT += dt;
    } else if (player.action === "guard") player.action = "idle";

    let speedMul = player.action === "guard" ? 3.1 : 8.7;
    if (player.action === "attack") speedMul = 5.4;
    if (player.action === "team") speedMul = 3.2;
    if (player.action === "dodge") {
      player.vx = Math.sin(player.dodgeYaw) * 13.5;
      player.vz = Math.cos(player.dodgeYaw) * 13.5;
    } else {
      player.vx = damp(player.vx, wishX * speedMul * mag, 14, dt);
      player.vz = damp(player.vz, wishZ * speedMul * mag, 14, dt);
    }
    if (player.action === "attack" || player.action === "team") {
      const tgt = aimTarget();
      if (tgt) {
        const dx = tgt.x - player.x;
        const dz = tgt.z - player.z;
        const d = hypot2(dx, dz) || 1;
        if (d > 1.15 && d < 8) {
          const slide = Math.min(d - 1.1, 16 * dt);
          player.x += (dx / d) * slide;
          player.z += (dz / d) * slide;
        }
      }
    }
    player.x += player.vx * dt;
    player.z += player.vz * dt;
    if (posed) {
      player.x = posed.x;
      player.z = posed.z;
      player.vx = player.vz = 0;
    }
    const resolved = world.resolve(player.x, player.z, 0.38, boss.alive && boss.active ? [{ x: boss.x, z: boss.z, r: 1.15 }] : null);
    player.x = resolved.x;
    player.z = resolved.z;
    if (!flags.pathLit && player.z > 37.4 && player.z < 46) player.z = 37.4;
    if (bossWall && boss.alive && player.z < 73 && player.z > 64) player.z = 73;

    player.vy -= 28 * dt;
    player.y += player.vy * dt;
    const ground = heightAt(player.x, player.z);
    if (player.y <= ground) {
      player.y = ground;
      if (player.vy < 0) player.vy = 0;
      player.grounded = true;
      player.jumps = 0;
    } else player.grounded = false;

    const moving = hypot2(player.vx, player.vz) > 0.45;
    if (player.action === "attack" || player.action === "flash" || player.action === "team") {
      /* yaw set at the start of the swing */
    } else if (lockTarget && lockTarget.alive) {
      player.yaw = dampAngle(player.yaw, Math.atan2(lockTarget.x - player.x, lockTarget.z - player.z), 5, dt);
    } else if (moving && player.action !== "guard") {
      player.yaw = dampAngle(player.yaw, Math.atan2(player.vx, player.vz), 5, dt);
    }
    if (posed) player.yaw = posed.yaw;

    if (player.action !== "idle" && player.action !== "guard") {
      player.actionT += dt / player.actionDur;
      if (player.action === "attack" && player.actionT > 0.12 && player.actionT < 0.58) {
        const finisher = player.airCombo > 0 ? player.combo >= 3 : player.combo >= 4;
        const reach = finisher ? 2.35 : 2.05;
        for (const e of living()) {
          if (swingHit.has(e.id)) continue;
          if (inFront(player.x, player.z, player.yaw, e.x, e.z, reach + e.radius * 0.35, 0.05)) {
            swingHit.add(e.id);
            const table = player.airCombo > 0 ? [12, 15, 24] : [12, 14, 16, 28];
            damageEnemy(e, table[player.combo - 1] || 12, null, { knock: finisher ? (e.kind === "boss" ? 0.8 : 2.4) : 0 });
            playerHits += 1;
          }
        }
      }
      if (player.action === "team" && !player.teamHit && player.actionT > 0.4) {
        player.teamHit = true;
        audio.finisher();
        events.push({ type: "hit", heavy: true });
        for (const e of living()) {
          if (hypot2(e.x - player.x, e.z - player.z) < 3.6) {
            damageEnemy(e, 26, { id: "team" }, { knock: e.kind === "boss" ? 0.5 : 2.1 });
            playerHits += 1;
          }
        }
      }
      if (player.actionT >= 1) {
        const nextMax = (player.airCombo > 0 || !player.grounded) ? 3 : 4;
        if (player.action === "attack" && player.comboQueue && player.combo < nextMax) startAttack(player.combo + 1);
        else {
          player.action = "idle";
          player.combo = 0;
          player.airCombo = 0;
          player.comboQueue = false;
          player.teamHit = false;
        }
      }
    }

    for (const e of enemies) updateEnemy(e, dt);
    updateBoss(dt);
    updateGuides(dt);
    separate();
    updateAllies(dt);
    updateScenes();
    gustFx.follow(player.x, 0.08, player.z);
    for (const chest of world.chests) {
      const open = !!chest.open;
      chest.lid.rotation.x = damp(chest.lid.rotation.x, open ? -1.2 : 0, open ? 14 : 8, dt);
    }
    const pageEv = collectPage();
    if (pageEv) events.push(pageEv);

    const chest = tryChests();
    let prompt = null;
    if (chest) prompt = { id: "chest", label: "OPEN" };
    if (world.radio && hypot2(world.radio.x - player.x, world.radio.z - player.z) < 2.4) {
      prompt = { id: "save", label: "SAVE" };
    }
    const gateNear = !boss.alive && world.gate && hypot2(player.x - world.gate.x, player.z - world.gate.z) < GATE_REACH;
    if (gateNear) {
      prompt = { id: "gate", label: "STEP THROUGH" };
      if (!flags.gateLine) { flags.gateLine = true; speak("entity-gate"); }
    }
    reaction = pickReaction();
    if (edge.magic) startFlash();
    if (edge.flash) {
      if (!fireReaction()) startFlash();
    }
    if (edge.use && chest) openChest(chest);
    if (edge.use && prompt && prompt.id === "save") writeSave();
    if ((edge.use && prompt && prompt.id === "gate") || gateEntered()) stepThrough();
    if (flags.won && outroArmed && outroT < 0) {
      outroT = 1.5;
      outroArmed = false;
    }
    if (outroT > 0) {
      outroT -= dt;
      if (outroT <= 0) events.push({ type: "outro" });
    }

    const step = keeper.update(dt, {
      speed: hypot2(player.vx, player.vz),
      air: !player.grounded,
      action: player.action,
      actionT: Math.min(1, player.actionT),
      combo: player.combo,
      look: lockTarget ? clamp(Math.atan2(lockTarget.x - player.x, lockTarget.z - player.z) - player.yaw, -0.8, 0.8) : 0,
      hurt: player.hurt,
      dodgeSide: player.dodgeSide,
    });
    keeper.root.position.set(player.x, player.y, player.z);
    keeper.root.rotation.y = player.yaw;
    if (step && step.step && player.grounded) audio.step();
    findLock();
    const objective = objectiveFor();
    lastPrompt = reaction || prompt;
    lastObjective = objective;
    return snapshot(camYaw, lastPrompt, objective);
  }

  function resetPulse() {
    for (const k of Object.keys(flags)) delete flags[k];
    pending.length = 0;
    sayQ.length = 0;
    sayGap = 0;
    playTime = 0;
    playerHits = 0;
    outroT = -1;
    outroArmed = true;
    bossWall = false;
    lockTarget = null;
    reaction = null;
    gateSeen = false;
    gateWasIn = false;
    gateUsed = false;
    clearEnemies();
    player.x = 0;
    player.z = -8;
    player.y = 0;
    player.yaw = 0;
    player.vx = player.vz = player.vy = 0;
    player.hp = player.hpMax = 100;
    player.mp = player.mpMax = 100;
    player.coins = 0;
    player.potions = 1;
    player.level = 1;
    player.xp = 0;
    player.xpNext = 36;
    player.str = 0;
    player.team = 0;
    player.action = "idle";
    player.combo = 0;
    player.grounded = true;
    player.iframes = 0;
    const homes = [[-1.5, -7.2, 0.2], [1.5, -6.8, -0.2]];
    allies.forEach((a, i) => {
      a.x = homes[i][0];
      a.z = homes[i][1];
      a.yaw = homes[i][2];
      a.hp = a.hpMax;
      a.anim = "idle";
    });
    for (const key of Object.keys(scenes)) {
      scenes[key].on = false;
      scenes[key].done = false;
    }
    for (const p of world.pages) { p.got = false; p.mesh.visible = true; }
    for (const c of world.chests) c.open = false;
    boss.alive = true;
    boss.active = false;
    boss.hp = boss.hpMax;
    boss.x = worldBoss.home.x;
    boss.z = worldBoss.home.z;
    boss.yaw = worldBoss.home.yaw;
    boss.state = "idle";
    boss.t = 0;
    if (world.gate) {
      world.gate.ready = false;
      world.gate.open = false;
      if (world.gate.setReady) world.gate.setReady(false);
    }
    posed = null;
    for (const g of guides) g.said = false;
  }

  return {
    update,
    player,
    enemies,
    boss,
    bossName: worldBoss.name,
    resetTrail: resetPulse,
    begin({ restore } = {}) {
      resetPulse();
      if (!restore) return;
      let data = null;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { data = null; }
      if (data && data.v === 1) applySave(data);
    },
    place(x, z, yaw) {
      player.x = x;
      player.z = z;
      player.y = 0;
      if (yaw != null) player.yaw = yaw;
      allies[0].x = x - 1.3;
      allies[0].z = z - 1.6;
      allies[1].x = x + 1.3;
      allies[1].z = z - 1.4;
    },
    wakeBoss() {
      scenes.wave.on = true;
      scenes.wave.done = true;
      wakeBossFight();
    },
    poseBoss() {
      boss.yaw = 0.4;
      bossRig.root.rotation.y = boss.yaw;
    },
    poseCrew() {
      posed = { x: player.x, z: player.z, yaw: player.yaw };
      allies[0].x = player.x - 1.15;
      allies[0].z = player.z + 0.2;
      allies[1].x = player.x + 1.2;
      allies[1].z = player.z + 0.15;
    },
    skipToGate() {
      for (const p of world.pages) { p.got = true; p.mesh.visible = false; }
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 2;
      flags.won = true;
      abilities.unlock("pulse");
      armExit();
      gateSeen = false;
      gateWasIn = false;
      gateUsed = false;
      player.x = 0;
      player.z = 96;
      player.y = 0;
    },
    pageCount,
    mp: () => player.mp,
    level: () => player.level,
    team: () => player.team,
    reaction: () => (reaction ? { id: reaction.id, label: reaction.label } : null),
    lockId: () => (lockTarget && lockTarget.alive ? lockTarget.id : null),
    circusDone: () => scenes.dish.done,
    floats: () => [],
    hits: () => playerHits,
    skipLesson() {},
    tutorSave() {},
    teaching: () => false,
    tutorStep: () => "done",
    allies: () => allies.map((a) => ({ id: a.id, x: a.x, z: a.z, hp: a.hp, hpMax: a.hpMax })),
    chests: () => world.chests.map((c) => !!c.open),
    exitReady: () => !!(world.gate && world.gate.ready),
    recap: () => ({ freed: freedN, time: playTime }),
    keyOn: () => true,
    defeatForExit() {
      boss.hp = 0;
      boss.alive = false;
      boss.active = true;
      boss.state = "dead";
      boss.t = 2;
      flags.won = true;
      abilities.unlock("pulse");
      armExit();
    },
    debugStrike(opts = {}) {
      const dist = 1.15;
      const yaw = player.yaw || 0;
      const x = player.x + Math.sin(yaw) * dist;
      const z = player.z + Math.cos(yaw) * dist;
      const e = makeEnemy("fog", x, z);
      e.state = "strike";
      e.t = 0.1;
      e.didHit = false;
      e.prof = { ...e.prof, dmg: opts.dmg || e.prof.dmg, reach: 4.2, lunge: 0 };
      return { id: e.id, dmg: e.prof.dmg };
    },
    debugFoe() {
      const dist = 3.2;
      const x = player.x + Math.sin(player.yaw) * dist;
      const z = player.z + Math.cos(player.yaw) * dist;
      const e = makeEnemy("fog", x, z);
      e.hp = e.hpMax = 90;
      return e.id;
    },
    foeHp(id) {
      const e = enemies.find((foe) => foe.id === id) || (boss.id === id ? boss : null);
      return e ? e.hp : null;
    },
    continueFromSave() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { data = null; }
      if (!data) return false;
      resetPulse();
      applySave(data);
      return true;
    },
    revive() {
      player.hp = player.hpMax;
      player.mp = player.mpMax;
      player.action = "idle";
      player.iframes = 1.2;
      if (boss.active && boss.alive) {
        player.x = 0;
        player.z = 74;
      }
    },
  };
}
