// Old Man on the Mountain. Same Keeper, Trail Key, and command combat.
// Harlan Wade walks the hunt. The fog takes wolves, shades, and the Old Man.
import * as THREE from "three";
import { clamp, damp, dampAngle, hypot2 } from "../../src/util.js";
import { heightAt } from "./world.js?v=2";
import { createHuman } from "../../src/actors.js?v=10";
import { armRing, note, spawn } from "../../src/vfx.js?v=1";
import { createWolf, createShade } from "./beings.js?v=2";
import { boss as worldBoss } from "../../bosses/old-man.js?v=2";
import { createAbilities } from "../../src/abilities.js?v=3";

const SAVE_KEY = "book-worlds-old-man";
const CLEAR_KEY = "book-worlds-world4-clear";
const CHEST_REACH = 3.4;
const GATE_REACH = 4.6;
const abilities = createAbilities();

export function createOldmanSim(scene, world, audio) {
  const keeper = createHuman({
    cloth: 0xc4a574, cloth2: 0x6e3832, pants: 0x4a453c, boots: 0x2c2118,
    hat: 0x6a5134, hair: 0x3a2a22, skin: 0xd2a07c, coat: 0xb08960,
    key: true, lantern: true, sharp: true, chest: 1.02, height: 1, bulk: 1,
  });
  const harlanRig = createHuman({
    cloth: 0x4a4036, pants: 0x2a2622, boots: 0x1a1410,
    hat: 0x3a2c22, hatBand: 0x2a2018, wideHat: true,
    hair: 0xc8c2b4, skin: 0xc4a07c, coat: 0x3c342c,
    eyes: 0xd5d8de, beard: 0xb0aa9e, scar: true, rifle: true,
    key: false, lantern: false,
  });
  scene.add(keeper.root, harlanRig.root);

  const allies = [
    {
      id: "harlan", name: "Harlan", rig: harlanRig, role: "rifle",
      x: 1.4, z: -6.2, yaw: 0.2, side: 1.25, back: 1.55,
      cd: 1.2, anim: "idle", animT: 0, hp: 96, hpMax: 96, hurt: 0,
    },
  ];

  const player = {
    x: 0, y: 0, z: -4, yaw: 0, vx: 0, vz: 0, vy: 0,
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
  let demoFire = false;
  const scenes = {
    timber: { on: false, done: false },
    benches: { on: false, done: false },
    park: { on: false, done: false },
    watched: { on: false, done: false },
  };

  const bossRig = worldBoss.create();
  scene.add(bossRig.root);
  const boss = {
    id: "boss", kind: "boss", name: worldBoss.name, alive: true, active: false,
    x: worldBoss.home.x, z: worldBoss.home.z, yaw: worldBoss.home.yaw,
    hp: worldBoss.hp, hpMax: worldBoss.hp, radius: worldBoss.radius,
    state: "idle", t: 0, pattern: 0, didHit: false, hit: 0, stunFor: 0, didSummon: false,
  };

  const logMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 28),
    new THREE.MeshBasicMaterial({ color: 0xc8d0b0, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const gust = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.62, 24),
    new THREE.MeshBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
  );
  gust.rotation.x = -Math.PI / 2;
  scene.add(gust);
  const gustFx = armRing(gust, {
    tag: "gust",
    life: 480,
    scale: (k) => 1 + (1 - k) * 8,
    opacity: (k) => k * 0.55,
  });

  function groundY(x, z) { return heightAt(x, z); }
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
    if (kind === "shade") return { hp: 68, radius: 0.72, speed: 1.85, tele: 0.5, lunge: 7.2, reach: 1.95, dmg: 13, xp: 20, flash: 20 };
    if (kind === "alpha") return { hp: 74, radius: 0.7, speed: 2.65, tele: 0.52, lunge: 8.2, reach: 1.75, dmg: 12, xp: 22, flash: 22 };
    return { hp: 40, radius: 0.52, speed: 3.15, tele: 0.4, lunge: 9, reach: 1.55, dmg: 9, xp: 14, flash: 24 };
  }
  function makeEnemy(kind, x, z, tag) {
    const rig = kind === "shade" ? createShade() : createWolf({ scale: kind === "alpha" ? 1.38 : 1 });
    scene.add(rig.root);
    const prof = profileFor(kind);
    const enemy = {
      id: "e" + (seq++), kind, rig, prof, x, z, yaw: Math.PI, tag: tag || "",
      hp: prof.hp, hpMax: prof.hp, radius: prof.radius,
      state: "idle", t: 0, alive: true, hit: 0, didHit: false, speed: 0, stunFor: 0, trackCd: 0,
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
  function awardFire() {
    if (abilities.unlock("firelight")) pending.push({ type: "ability", id: "firelight" });
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
    const shove = (e.kind === "boss" ? 0.45 : 1.35) + (opts.knock || 0);
    e.x += (dx / len) * shove;
    e.z += (dz / len) * shove;
    events.push({ type: "dmg", x: e.x, y: groundY(e.x, e.z) + 1.6, z: e.z, n: Math.round(dealt) });
    if (opts.knock) audio.finisher();
    else audio.hit();
    if (!src) {
      player.team = Math.min(100, player.team + (opts.knock ? 16 : 10));
      player.hitStop = Math.max(player.hitStop, opts.knock ? 0.09 : 0.055);
      events.push({ type: "hit", heavy: !!opts.knock });
      if (!flags.fight) {
        flags.fight = true;
        speak("harlan-fight");
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
        speak("harlan-free");
        freedN += 1;
      }
      grantXp(e.kind === "boss" ? 90 : e.prof.xp);
      if (e.kind === "boss") {
        freedN += 1;
        audio.roar();
        if (audio.chorus) audio.chorus();
        flags.won = true;
        bossWall = false;
        audio.setTension(0);
        if (audio.setMood) audio.setMood(0.2, 0);
        awardFire();
        if (world.setFreed) world.setFreed(true);
        if (bossRig.free) bossRig.free();
        if (world.gate && world.gate.setReady) world.gate.setReady(true);
        speak("harlan-win");
        speak("harlan-walk");
      }
    }
  }

  function hurtAlly(a, amount, sx, sz) {
    if (!a || a.hp <= 0) return;
    a.hp = Math.max(0, a.hp - amount);
    a.hurt = 2.2;
    if (sx != null) {
      const dx = a.x - sx;
      const dz = a.z - sz;
      const len = hypot2(dx, dz) || 1;
      a.x += (dx / len) * 0.5;
      a.z += (dz / len) * 0.5;
    }
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
        events.push({ type: "dmg", x: player.x, y: player.y + 1.8, z: player.z, n: "Parry" });
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
    events.push({ type: "dmg", x: player.x, y: player.y + 1.7, z: player.z, n: Math.round(amount) });
    if (player.hp < 36 && !flags.low) { flags.low = true; speak("harlan-low"); }
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
  function openFog() {
    if (flags.fogDriven) return;
    flags.fogDriven = true;
    if (world.setFogGate) world.setFogGate(true);
  }
  function abilityCtx() {
    return {
      player, living, damageEnemy, events, audio,
      resolve: (x, z, r) => world.resolve(x, z, r),
      onCast(id) {
        if (id === "firelight" && player.z > 50 && player.z < 66) openFog();
      },
    };
  }

  function leaveTrack(e) {
    e.trackCd = 0.42;
    const mark = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 6),
      new THREE.MeshBasicMaterial({ color: 0x241c16, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.scale.set(1.8, 0.45, 1);
    mark.position.set(e.x, groundY(e.x, e.z) + 0.04, e.z);
    scene.add(mark);
    spawn({
      tag: "track",
      mesh: mark,
      disposable: true,
      life: 1600,
      onTick(k) { mark.material.opacity = k * 0.5; },
    });
  }

  function showTell(e) {
    if (!e.tell) {
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(0.42, 0.62, 24),
        new THREE.MeshBasicMaterial({ color: 0xff5a32, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }),
      );
      mesh.rotation.x = -Math.PI / 2;
      scene.add(mesh);
      e.tell = mesh;
    }
    const wind = e.state === "wind";
    const k = wind ? Math.min(1, e.t / Math.max(0.2, e.prof.tele || 0.4)) : 1;
    e.tell.visible = true;
    e.tell.position.set(e.x, groundY(e.x, e.z) + 0.06, e.z);
    e.tell.scale.setScalar(wind ? 0.55 + k * 2.1 : 2.05);
    e.tell.material.opacity = wind ? 0.45 + k * 0.5 : 0.95;
    note(e.tell);
  }

  function updateEnemy(e, dt) {
    e.hit = Math.max(0, e.hit - dt * 2.4);
    e.trackCd = Math.max(0, (e.trackCd || 0) - dt);
    e._swing = false;
    const y = groundY(e.x, e.z);
    if (!e.alive) {
      e.t += dt;
      e.rig.root.position.set(e.x, y, e.z);
      e.rig.update(dt, { speed: 0, action: "idle", actionT: 0 });
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
      if (e.t > Math.max(0.28, e.prof.tele || 0.4)) {
        e.state = "strike";
        e.t = 0;
        e.didHit = false;
        e.allyHit = false;
      }
    } else if (e.state === "strike") {
      const prev = e.t;
      e.t += dt;
      e.speed = prev < 0.32 ? Math.max(6.2, e.prof.lunge || 8) : 0;
      e._swing = e.t > 0.05 && prev < 0.46;
      if (e.t > 0.5) { e.state = "chase"; e.t = 0; }
    } else if (dist < 16) {
      e.state = "chase";
      e.yaw = dampAngle(e.yaw, face, 6, dt);
      if (dist > (e.prof.reach || 1.5) * 0.85) e.speed = e.prof.speed;
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
      if (e.trackCd <= 0 && e.kind === "wolf") leaveTrack(e);
    }
    const c = world.resolve(e.x, e.z, e.radius * 0.55);
    e.x = c.x;
    e.z = c.z;
    if (e._swing) {
      const reach = (e.prof.reach || 1.5) + 1.05;
      if (!e.didHit && hypot2(player.x - e.x, player.z - e.z) < reach) {
        e.didHit = true;
        hurtPlayer(e.prof.dmg, e.x, e.z, e);
      }
      if (!e.allyHit) {
        for (const a of allies) {
          if (a.hp <= 0) continue;
          if (hypot2(a.x - e.x, a.z - e.z) < reach) {
            e.allyHit = true;
            hurtAlly(a, Math.max(4, Math.round(e.prof.dmg * 0.6)), e.x, e.z);
            break;
          }
        }
      }
    }
    if (e.state === "wind" || e._swing) showTell(e);
    else if (e.tell) e.tell.visible = false;
    e.rig.root.position.set(e.x, groundY(e.x, e.z), e.z);
    e.rig.root.rotation.y = e.yaw;
    e.rig.update(dt, {
      speed: e.speed,
      action: e.state === "strike" ? "attack" : "idle",
      actionT: e.state === "strike" ? e.t / 0.42 : 0,
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
    boss.didSummon = false;
    boss.allyHit = false;
    if (name === "charge" || name === "log") boss.yaw = Math.atan2(player.x - boss.x, player.z - boss.z);
  }
  function showRing(radius, k, color) {
    ring.position.set(boss.x, groundY(boss.x, boss.z) + 0.08, boss.z);
    ring.scale.setScalar(Math.max(0.2, radius * k));
    ring.material.opacity = 0.16 + 0.5 * k;
    ring.material.color.setHex(color || 0xc8d0b0);
    note(ring);
  }
  function throwLog() {
    const yaw = boss.yaw;
    const sx = boss.x;
    const sz = boss.z;
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 2.6, 6), logMat.clone());
    scene.add(log);
    spawn({
      tag: "log",
      mesh: log,
      disposable: true,
      life: 900,
      onTick(k, age) {
        const u = age / 1000;
        const y = groundY(sx, sz) + 1.3 + Math.sin(Math.min(1, u) * Math.PI) * 1.4;
        log.position.set(sx + Math.sin(yaw) * u * 12, y, sz + Math.cos(yaw) * u * 12);
        log.rotation.z = Math.PI / 2;
        log.rotation.x = u * 8;
      },
    });
  }
  function dropSpruce(x, z) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 3.4, 6), logMat.clone());
    scene.add(log);
    const y0 = groundY(x, z) + 5.5;
    const y1 = groundY(x, z) + 0.55;
    spawn({
      tag: "spruce",
      mesh: log,
      disposable: true,
      life: 1400,
      onTick(k) {
        const fall = Math.min(1, (1 - k) * 1.35);
        log.position.set(x, y0 + (y1 - y0) * fall, z);
        log.rotation.z = Math.PI / 2 + fall * 0.35;
      },
    });
  }

  function updateBoss(dt) {
    boss.hit = Math.max(0, boss.hit - dt * 2.5);
    const y = groundY(boss.x, boss.z);
    if (!boss.alive) {
      boss.t += dt;
      bossRig.root.position.set(boss.x, y, boss.z);
      bossRig.root.rotation.y = boss.yaw;
      bossRig.update(dt, { moving: false, state: "dead", hit: 0, phase: 3, freed: true });
      ring.material.opacity = 0;
      return;
    }
    if (!boss.active && scenes.watched.done && player.z > 78) wakeBossFight();
    if (!boss.active) {
      bossRig.root.position.set(boss.x, y, boss.z);
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
      speak("harlan-half");
      audio.roar();
      boss.state = "roarWind";
      boss.t = 0;
    }
    if (boss.state === "intro") {
      boss.yaw = dampAngle(boss.yaw, face, 4, dt);
      if (boss.t > 1.2) beginBoss("slam");
    } else if (boss.state.endsWith("Wind")) {
      boss.yaw = dampAngle(boss.yaw, face, 6, dt);
      const need = (boss.state === "roarWind" ? 0.9 : boss.state === "trapWind" ? 0.85 : 0.62) * (phase === 3 ? 0.75 : 1);
      const rad = boss.state === "roarWind" ? 6.4 : boss.state === "slamWind" ? 4.4 : 3.4;
      showRing(rad, boss.t / need, boss.state.startsWith("trap") ? 0xc4a060 : 0xd7e2c8);
      if (boss.state === "logWind" && boss.t > need - 0.02 && !boss.didSummon) {
        boss.didSummon = true;
        throwLog();
      }
      if (boss.t > need) {
        boss.state = boss.state.replace("Wind", "");
        boss.t = 0;
        boss.didHit = false;
        if (boss.state === "roar" || boss.state === "charge") audio.roar();
        if (boss.state === "trap") dropSpruce(boss.x + Math.sin(boss.yaw) * 1.2, boss.z + Math.cos(boss.yaw) * 1.2);
      }
    } else if (boss.state === "charge") {
      moving = true;
      const sp = phase === 3 ? 9.6 : 7.8;
      boss.x += Math.sin(boss.yaw) * sp * dt;
      boss.z += Math.cos(boss.yaw) * sp * dt;
      showRing(3.2, 1, 0xe7c48a);
      if (!boss.didHit && hypot2(player.x - boss.x, player.z - boss.z) < boss.radius + 1.35) {
        boss.didHit = true;
        hurtPlayer(26, boss.x, boss.z, boss);
      }
      if (boss.t > 0.85) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "log") {
      const u = boss.t;
      const lx = boss.x + Math.sin(boss.yaw) * u * 12;
      const lz = boss.z + Math.cos(boss.yaw) * u * 12;
      if (!boss.didHit && hypot2(player.x - lx, player.z - lz) < 1.55) {
        boss.didHit = true;
        hurtPlayer(18, lx, lz, boss);
      }
      if (boss.t > 0.8) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "slam" || boss.state === "roar" || boss.state === "trap") {
      const rad = boss.state === "roar" ? 6.2 : boss.state === "trap" ? 3.6 : 4.6;
      showRing(rad, 1, boss.state === "roar" ? 0xb7c4a4 : 0xe7c48a);
      if (boss.state === "roar" && !boss.didSummon) {
        boss.didSummon = true;
        makeEnemy("wolf", boss.x - 3.4, boss.z - 2.2, "summon");
        makeEnemy("wolf", boss.x + 3.2, boss.z - 1.4, "summon");
        if (audio.howl) audio.howl();
      }
      if (!boss.didHit && boss.t > 0.08 && hypot2(player.x - boss.x, player.z - boss.z) < rad) {
        boss.didHit = true;
        hurtPlayer(boss.state === "roar" ? 16 : boss.state === "trap" ? 22 : 24, boss.x, boss.z, boss);
        for (const a of allies) {
          if (hypot2(a.x - boss.x, a.z - boss.z) < rad) hurtAlly(a, 10, boss.x, boss.z);
        }
      }
      if (boss.t > 0.42) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "stagger") {
      ring.material.opacity = 0;
      if (boss.t > (boss.stunFor || 0.6)) { boss.state = "recover"; boss.t = 0; }
    } else {
      ring.material.opacity = Math.max(0, ring.material.opacity - dt * 2);
      if (boss.t > (phase === 3 ? 0.38 : 0.58)) {
        const cycle = phase === 1
          ? ["slam", "log", "charge"]
          : phase === 2
            ? ["slam", "roar", "log", "charge", "trap"]
            : ["roar", "trap", "charge", "slam", "log"];
        beginBoss(cycle[boss.pattern % cycle.length]);
        boss.pattern += 1;
      }
    }
    boss.x = clamp(boss.x, -8, 8);
    boss.z = clamp(boss.z, 80, 96);
    const solved = world.resolve(boss.x, boss.z, 1.15);
    boss.x = solved.x;
    boss.z = clamp(solved.z, 80, 96);
    bossRig.root.position.set(boss.x, groundY(boss.x, boss.z), boss.z);
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
    if (allies[0].rig.setSidearm) allies[0].rig.setSidearm("revolver");
    speak("harlan-boss");
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

  function rifleLine(a, foe) {
    const y = groundY(a.x, a.z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([
      a.x, y + 1.35, a.z,
      foe.x, groundY(foe.x, foe.z) + 1.1, foe.z,
    ], 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0.9 }));
    scene.add(line);
    spawn({
      tag: "rifle",
      mesh: line,
      disposable: true,
      life: 140,
      onTick(k) { line.material.opacity = k * 0.85; },
    });
    if (audio.rifle) audio.rifle();
  }

  function updateAllies(dt) {
    if (posed) {
      for (const a of allies) {
        a.yaw = posed.yaw;
        a.rig.root.position.set(a.x, groundY(a.x, a.z), a.z);
        a.rig.root.rotation.y = a.yaw;
        a.rig.update(dt, { speed: 0, air: false, action: "idle", actionT: 0, combo: 0, look: 0, hurt: 0, dodgeSide: 0 });
      }
      return;
    }
    for (const a of allies) {
      let tx;
      let tz;
      const fx = Math.sin(player.yaw);
      const fz = Math.cos(player.yaw);
      const rx = Math.cos(player.yaw);
      const rz = -Math.sin(player.yaw);
      if (flags.won && player.z < 18) {
        tx = world.truck.x + 1.15;
        tz = world.truck.z + 0.2;
      } else {
        tx = player.x - fx * a.back + rx * a.side;
        tz = player.z - fz * a.back + rz * a.side;
      }
      let dx = tx - a.x;
      let dz = tz - a.z;
      const d = hypot2(dx, dz);
      if (d > 0.25) {
        const step = Math.min(d, (d > 5 ? 6.4 : 4.2) * dt);
        a.x += (dx / d) * step;
        a.z += (dz / d) * step;
      }
      const c = world.resolve(a.x, a.z, 0.34);
      a.x = c.x;
      a.z = c.z;
      const foe = nearest(a.x, a.z, 13);
      if (foe && !flags.won) a.yaw = dampAngle(a.yaw, Math.atan2(foe.x - a.x, foe.z - a.z), 8, dt);
      else if (d > 0.4) a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 8, dt);
      a.cd = Math.max(0, a.cd - dt);
      a.hurt = Math.max(0, a.hurt - dt);
      if (a.hp <= 0 && a.hurt <= 0) a.hp = Math.round(a.hpMax * 0.45);
      else if (a.hurt <= 0) a.hp = Math.min(a.hpMax, a.hp + dt * 1.4);
      if (a.anim !== "idle") {
        a.animT += dt / 0.38;
        if (a.animT >= 1) a.anim = "idle";
      }
      if (foe && player.hp > 0 && !flags.won && a.anim === "idle" && a.cd <= 0) {
        const fd = hypot2(foe.x - a.x, foe.z - a.z);
        if (fd < 13) {
          a.cd = 2.4;
          a.anim = "attack";
          a.animT = 0;
          damageEnemy(foe, foe.kind === "boss" ? 9 : 12, a);
          rifleLine(a, foe);
        }
      }
      a.rig.root.position.set(a.x, groundY(a.x, a.z), a.z);
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
        if (!flags.paged) { flags.paged = true; speak("harlan-page"); }
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
    events.push({ type: "dmg", x: chest.x, y: groundY(chest.x, chest.z) + 1.2, z: chest.z, n: 12, coin: true });
    speak("harlan-chest");
  }

  function updateScenes() {
    if (!scenes.timber.on && player.z > 4) {
      scenes.timber.on = true;
      makeEnemy("wolf", -2.4, 10, "timber");
      makeEnemy("wolf", 2.6, 14, "timber");
      speak("harlan-food");
      events.push({ type: "bulletin", id: "scene-timber" });
      if (audio.howl) audio.howl();
    }
    if (scenes.timber.on && !scenes.timber.done && !taggedAlive("timber")) scenes.timber.done = true;
    if (!scenes.benches.on && player.z > 22) {
      scenes.benches.on = true;
      makeEnemy("wolf", -2.2, 28, "benches");
      makeEnemy("alpha", 0.3, 31, "benches");
      makeEnemy("shade", 2.4, 33, "benches");
      speak("harlan-tracks");
      events.push({ type: "bulletin", id: "scene-benches" });
    }
    if (scenes.benches.on && !scenes.benches.done && !taggedAlive("benches")) scenes.benches.done = true;
    if (!scenes.park.on && player.z > 42) {
      scenes.park.on = true;
      makeEnemy("wolf", -3.2, 50, "park");
      makeEnemy("shade", 3.4, 55, "park");
      speak("harlan-cold");
      speak("harlan-park");
      events.push({ type: "bulletin", id: "scene-park" });
    }
    if (scenes.park.on && !scenes.park.done && !taggedAlive("park")) scenes.park.done = true;
    if (!flags.fireAward && scenes.park.on && hypot2(player.x - world.camp.x, player.z - world.camp.z) < 5.5) {
      flags.fireAward = true;
      awardFire();
      speak("harlan-fire");
    }
    if (!flags.fireAward && player.z > 54) {
      flags.fireAward = true;
      awardFire();
      speak("harlan-fire");
    }
    if (!scenes.watched.on && player.z > 64) {
      scenes.watched.on = true;
      makeEnemy("shade", -2.2, 68, "watched");
      makeEnemy("wolf", 2.6, 72, "watched");
      speak("harlan-eyes");
      speak("harlan-watched");
      events.push({ type: "bulletin", id: "scene-watched" });
    }
    if (scenes.watched.on && !scenes.watched.done && !taggedAlive("watched")) scenes.watched.done = true;
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
      events.push({ type: "level", n: player.level, x: player.x, y: player.y + 2.1, z: player.z });
    }
  }

  function aimTarget() {
    if (lockTarget && lockTarget.alive) return lockTarget;
    return nearest(player.x, player.z, 7.5);
  }
  function toggleLock() {
    const list = living();
    if (!list.length) { lockTarget = null; return; }
    if (!lockTarget || !lockTarget.alive) lockTarget = nearest(player.x, player.z, 16);
    else {
      const i = list.indexOf(lockTarget);
      lockTarget = list[(i + 1) % list.length];
    }
  }
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
    if (tgt) player.yaw = Math.atan2(tgt.x - player.x, tgt.z - player.z);
    else if (hypot2(player.vx, player.vz) > 0.4) player.yaw = Math.atan2(player.vx, player.vz);
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
  function startFlash() {
    if (player.action === "dodge" || player.action === "team") return;
    if (!spend(25)) return;
    player.action = "flash";
    player.actionT = 0;
    player.actionDur = 0.42;
    audio.flash();
    events.push({ type: "flash" });
    for (const e of living()) {
      if (hypot2(e.x - player.x, e.z - player.z) < (e.kind === "boss" ? 5.2 : 4.4)) {
        damageEnemy(e, e.kind === "boss" ? 28 : (e.prof ? e.prof.flash : 16));
        if (e.alive && e.kind === "boss") { e.state = "stagger"; e.t = 0; e.stunFor = 0.7; }
        else if (e.alive) { e.state = "stun"; e.t = 0; e.stunFor = 1.1; }
        playerHits += 1;
      }
    }
  }
  function startDevil() {
    if (player.action === "dodge" || player.action === "team") return;
    if (!spend(20)) return;
    player.action = "flash";
    player.actionT = 0;
    player.actionDur = 0.38;
    gustFx.fire(player.x, player.y + 0.08, player.z);
    audio.wind();
    for (const e of living()) {
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const d = hypot2(dx, dz);
      if (d > 5.2 || d < 0.05) continue;
      damageEnemy(e, e.kind === "boss" ? 14 : 12);
      const push = e.kind === "boss" ? 0.35 : 1.8;
      e.x += (dx / d) * push;
      e.z += (dz / d) * push;
      if (e.alive && e.kind !== "boss") { e.state = "stun"; e.t = 0; e.stunFor = 0.45; }
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
    events.push({ type: "dmg", x: player.x, y: player.y + 1.8, z: player.z, n: "+HP" });
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
  }
  function drink() {
    if (player.potions <= 0 || player.hp >= player.hpMax) return;
    player.potions -= 1;
    player.hp = Math.min(player.hpMax, player.hp + 42);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: player.y + 1.8, z: player.z, n: "+HP" });
  }
  function pickReaction() {
    if (boss.active && boss.alive && boss.state === "trapWind" && reactCd <= 0 && boss.t > 0.1 && boss.t < 0.7) {
      return { id: "pin", label: "Pin the arm" };
    }
    return null;
  }
  function fireReaction() {
    if (!reaction || reaction.id !== "pin" || !boss.alive) return false;
    reactCd = 6;
    boss.state = "stagger";
    boss.t = 0;
    boss.stunFor = 1.35;
    dropSpruce(boss.x - 0.8, boss.z + 0.4);
    damageEnemy(boss, 36, null, { knock: 0.2 });
    playerHits += 1;
    audio.parry();
    speak("harlan-pin");
    return true;
  }
  function colorDrain() {
    let drain = 0;
    const sources = enemies.filter((e) => e.alive);
    if (boss.alive && boss.active) sources.push(boss);
    for (const e of sources) {
      const d = hypot2(e.x - player.x, e.z - player.z);
      const inner = e.kind === "boss" ? worldBoss.drain.inner : e.kind === "shade" ? 5.2 : 3.2;
      const outer = e.kind === "boss" ? worldBoss.drain.outer : inner + 4.5;
      const t = d <= inner ? 1 : clamp(1 - (d - inner) / (outer - inner), 0, 1);
      drain = Math.max(drain, t);
    }
    return drain * 0.42;
  }
  function dreadNow() {
    if (!boss.alive) return 0.15;
    if (boss.active) return 1;
    return clamp((player.z - 6) / 80, 0, 0.85);
  }
  function fireNow() {
    const d = hypot2(player.x - world.camp.x, player.z - world.camp.z);
    return clamp(1 - d / 9, 0, 1);
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
      fire: !!flags.fireAward,
      fog: !!flags.fogDriven,
      scenes: {
        timber: scenes.timber.done, benches: scenes.benches.done,
        park: scenes.park.done, watched: scenes.watched.done,
      },
      chests: world.chests.map((c) => !!c.open),
    };
  }
  function persist(complete) {
    if (complete) flags.cleared = true;
    const data = saveBody();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
    if (data.complete) {
      try { localStorage.setItem(CLEAR_KEY, "1"); } catch { /* private mode */ }
      awardFire();
    }
  }
  function armExit() {
    bossWall = false;
    outroArmed = false;
    outroT = 0;
    if (world.gate && world.gate.setReady) world.gate.setReady(true);
    if (world.setFreed) world.setFreed(true);
    if (bossRig.free) bossRig.free();
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
    speak("harlan-gate");
  }
  function writeSave() {
    player.hp = player.hpMax;
    player.mp = player.mpMax;
    for (const a of allies) a.hp = a.hpMax;
    persist(false);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: player.y + 1.8, z: player.z, n: "Saved" });
    speak("harlan-save");
  }
  function applySave(data) {
    player.x = data.x;
    player.z = data.z;
    player.y = groundY(player.x, player.z);
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
      for (const key of Object.keys(scenes)) {
        scenes[key].done = !!data.scenes[key];
        if (scenes[key].done) scenes[key].on = true;
      }
    }
    if (data.fire) flags.fireAward = true;
    (data.chests || []).forEach((open, i) => {
      if (open && world.chests[i]) world.chests[i].open = true;
    });
    if (data.bossDead) {
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 3;
      flags.won = true;
      awardFire();
      armExit();
    }
    if (data.fog || player.z > 64 || (data.scenes && data.scenes.watched)) openFog();
    if (data.complete) flags.cleared = true;
    flags.g1 = true;
  }

  function idlePresentation(dt) {
    player.y = groundY(player.x, player.z);
    keeper.root.position.set(player.x, player.y, player.z);
    keeper.root.rotation.y = player.yaw;
    keeper.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0.15, dodgeSide: 0 });
    for (const a of allies) {
      a.rig.root.position.set(a.x, groundY(a.x, a.z), a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0, dodgeSide: 0 });
    }
    bossRig.root.position.set(boss.x, groundY(boss.x, boss.z), boss.z);
    bossRig.update(dt, { moving: false, state: boss.alive ? "idle" : "dead", hit: 0, phase: 1, freed: !boss.alive });
  }

  function snapshot(camYaw, prompt, objective) {
    const hy = groundY(allies[0].x, allies[0].z);
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
        keeper: { x: player.x, y: player.y + 1.85, z: player.z },
        harlan: { x: allies[0].x, y: hy + 1.85, z: allies[0].z },
      },
      enemies: enemies.filter((e) => e.rig.root.visible).map((e) => ({
        id: e.id, kind: e.kind, hp: e.hp, alive: e.alive, freed: !!e.freed, x: e.x, y: groundY(e.x, e.z) + 1.1, z: e.z,
      })),
      boss: {
        name: boss.name, alive: boss.alive, active: boss.active, hp: boss.hp, hpMax: boss.hpMax,
        x: boss.x, y: groundY(boss.x, boss.z) + 3.2, z: boss.z,
      },
      lock: lockTarget && lockTarget.alive ? {
        id: lockTarget.id, x: lockTarget.x,
        y: groundY(lockTarget.x, lockTarget.z) + (lockTarget.kind === "boss" ? 3 : 1.3),
        z: lockTarget.z,
      } : null,
      prompt,
      pages: pageCount(),
      circus: scenes.park.done,
      objective: objective || "Pages 0/5",
      tutor: null,
      drain: colorDrain(),
      events,
      camYaw,
    };
  }

  function objectiveFor() {
    if (boss.active && boss.alive && flags.phase2) return "The fog is swinging";
    if (boss.active && boss.alive) return "Free the Old Man";
    if (!boss.alive) return "Back to the truck";
    if (!flags.fogDriven) return player.z > 48 || scenes.timber.done ? "Firelight the fog" : "Clear the timber";
    if (!scenes.watched.done) return "The treeline";
    if (boss.alive) return "The Old Man";
    return `Pages ${pageCount()}/5`;
  }

  function update(dt, input, camYaw, play, fresh = true) {
    if (fresh) {
      events.length = 0;
      while (pending.length) events.push(pending.shift());
    }
    flushSpeak(dt);
    if (!play) {
      idlePresentation(dt);
      return snapshot(camYaw, null);
    }
    if (player.hp <= 0) return snapshot(camYaw, lastPrompt, lastObjective);
    if (player.hitStop > 0) {
      player.hitStop = Math.max(0, player.hitStop - dt);
      return snapshot(camYaw, lastPrompt, lastObjective);
    }
    const edge = input.pull();
    const axes = input.axes();
    playTime += dt;
    if (!flags.g1) { flags.g1 = true; speak("harlan-greet"); }
    player.flashCd = Math.max(0, player.flashCd - dt);
    player.spellCd = Math.max(0, player.spellCd - dt);
    player.magicLock = Math.max(0, player.magicLock - dt);
    player.iframes = Math.max(0, player.iframes - dt);
    player.hurt = Math.max(0, player.hurt - dt * 2);
    reactCd = Math.max(0, reactCd - dt);
    if (audio.setMood) audio.setMood(dreadNow(), fireNow());

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
    if (edge.devil) startDevil();
    if (edge.mend) startMend();
    if (edge.special) startTeam();
    if (edge.lasso) abilities.cast("lasso", abilityCtx());
    if (edge.steam) abilities.cast("steam", abilityCtx());
    if (edge.pulse) abilities.cast("pulse", abilityCtx());
    if (edge.firelight) abilities.cast("firelight", abilityCtx());
    if (demoFire && playTime > 0.35 && abilities.ready("firelight")) {
      abilities.cast("firelight", abilityCtx());
    }
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

    let speedMul = player.action === "guard" ? 3.1 : 8.2;
    if (player.action === "attack") speedMul = 5.2;
    if (player.action === "team") speedMul = 3.2;
    if (player.action === "dodge") {
      player.vx = Math.sin(player.dodgeYaw) * 13;
      player.vz = Math.cos(player.dodgeYaw) * 13;
    } else {
      player.vx = damp(player.vx, wishX * speedMul * mag, 14, dt);
      player.vz = damp(player.vz, wishZ * speedMul * mag, 14, dt);
    }
    player.x += player.vx * dt;
    player.z += player.vz * dt;
    if (posed) {
      player.x = posed.x;
      player.z = posed.z;
      player.vx = player.vz = 0;
    }
    const resolved = world.resolve(player.x, player.z, 0.38, boss.alive && boss.active ? [{ x: boss.x, z: boss.z, r: 1.2 }] : null);
    player.x = resolved.x;
    player.z = resolved.z;
    if (!flags.fogDriven && player.z > 59.8 && player.z < 68) player.z = 59.8;
    if (bossWall && boss.alive && player.z < 79 && player.z > 70) player.z = 79;

    player.vy -= 28 * dt;
    player.y += player.vy * dt;
    const ground = groundY(player.x, player.z);
    if (player.y <= ground) {
      player.y = ground;
      if (player.vy < 0) player.vy = 0;
      player.grounded = true;
      player.jumps = 0;
    } else player.grounded = false;

    const moving = hypot2(player.vx, player.vz) > 0.45;
    if (player.action === "attack" || player.action === "flash" || player.action === "team") {
      /* yaw set at the swing */
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
            damageEnemy(e, table[player.combo - 1] || 12, null, { knock: finisher ? (e.kind === "boss" ? 0.8 : 2.2) : 0 });
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
            damageEnemy(e, 24, { id: "team" }, { knock: e.kind === "boss" ? 0.45 : 2 });
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
    separate();
    updateAllies(dt);
    updateScenes();
    gustFx.follow(player.x, player.y + 0.08, player.z);
    for (const chest of world.chests) {
      const open = !!chest.open;
      chest.lid.rotation.x = damp(chest.lid.rotation.x, open ? -1.15 : 0, open ? 14 : 8, dt);
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
      prompt = { id: "gate", label: "THE TRUCK" };
      if (!flags.gateLine) { flags.gateLine = true; speak("harlan-gate"); }
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
      outroT = 2.1;
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
    if (lockTarget && !lockTarget.alive) lockTarget = null;
    const objective = objectiveFor();
    lastPrompt = reaction || prompt;
    lastObjective = objective;
    return snapshot(camYaw, lastPrompt, objective);
  }

  function resetOldman() {
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
    player.z = -4;
    player.y = groundY(0, -4);
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
    allies[0].x = 1.4;
    allies[0].z = -6.2;
    allies[0].yaw = 0.2;
    allies[0].hp = allies[0].hpMax;
    allies[0].anim = "idle";
    if (allies[0].rig.setSidearm) allies[0].rig.setSidearm("rifle");
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
    if (world.setFreed) world.setFreed(false);
    if (world.gate) {
      world.gate.ready = false;
      world.gate.open = false;
      if (world.gate.setReady) world.gate.setReady(false);
    }
    posed = null;
  }

  return {
    update,
    player,
    enemies,
    boss,
    bossName: worldBoss.name,
    resetTrail: resetOldman,
    begin({ restore } = {}) {
      resetOldman();
      if (!restore) return;
      let data = null;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { data = null; }
      if (data && data.v === 1) applySave(data);
    },
    place(x, z, yaw) {
      player.x = x;
      player.z = z;
      player.y = groundY(x, z);
      if (yaw != null) player.yaw = yaw;
      allies[0].x = x + 1.25;
      allies[0].z = z - 1.2;
    },
    wakeBoss() {
      scenes.watched.on = true;
      scenes.watched.done = true;
      wakeBossFight();
    },
    poseBoss() { boss.yaw = 0.35; },
    poseCrew() {
      posed = { x: player.x, z: player.z, yaw: player.yaw };
      allies[0].x = player.x + 1.15;
      allies[0].z = player.z + 0.15;
      allies[0].yaw = player.yaw + 0.2;
    },
    armFireDemo() {
      awardFire();
      demoFire = true;
      makeEnemy("wolf", player.x + Math.sin(player.yaw || 0) * 3.2, player.z + Math.cos(player.yaw || 0) * 3.2, "demo");
    },
    skipToGate() {
      for (const p of world.pages) { p.got = true; p.mesh.visible = false; }
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 3;
      flags.won = true;
      awardFire();
      armExit();
      gateSeen = false;
      gateWasIn = false;
      gateUsed = false;
      player.x = world.truck.x;
      player.z = world.truck.z + 2;
      player.y = groundY(player.x, player.z);
    },
    pageCount,
    mp: () => player.mp,
    level: () => player.level,
    team: () => player.team,
    reaction: () => (reaction ? { id: reaction.id, label: reaction.label } : null),
    lockId: () => (lockTarget && lockTarget.alive ? lockTarget.id : null),
    circusDone: () => scenes.park.done,
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
      boss.t = 3;
      flags.won = true;
      awardFire();
      armExit();
    },
    debugStrike(opts = {}) {
      const dist = 1.2;
      const yaw = player.yaw || 0;
      const e = makeEnemy("wolf", player.x + Math.sin(yaw) * dist, player.z + Math.cos(yaw) * dist);
      e.state = "strike";
      e.t = 0.1;
      e.didHit = false;
      e.prof = { ...e.prof, dmg: opts.dmg || e.prof.dmg, reach: 4.2, lunge: 0 };
      return { id: e.id, dmg: e.prof.dmg };
    },
    debugFoe() {
      const dist = 3.2;
      const e = makeEnemy("wolf", player.x + Math.sin(player.yaw) * dist, player.z + Math.cos(player.yaw) * dist);
      e.hp = e.hpMax = 80;
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
      resetOldman();
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
        player.z = 82;
        player.y = groundY(0, 82);
      }
    },
  };
}
