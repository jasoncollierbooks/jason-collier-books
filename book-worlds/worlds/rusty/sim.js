// Rusty Stack play. Same Keeper, Trail Key, and command combat as the wagon road.
import * as THREE from "three";
import { clamp, damp, dampAngle, hypot2 } from "../../src/util.js";
import { heightAt } from "./world.js?v=11";
import { createFog } from "../../src/rigs.js?v=5";
import { createHuman } from "../../src/actors.js?v=10";
import { armRing, note, spawn } from "../../src/vfx.js?v=1";
import { boss as worldBoss } from "../../bosses/rusty-stack.js?v=8";
import { createAbilities } from "../../src/abilities.js?v=2";

const abilities = createAbilities();

const SAVE_KEY = "book-worlds-rusty-stack";
const CLEAR_KEY = "book-worlds-world2-clear";
const CHEST_REACH = 3.4;
const GATE_REACH = 4.8;

export function createRustySim(scene, world, audio) {
  const keeper = createHuman({
    cloth: 0xc4a574, cloth2: 0x6e3832, pants: 0x4a453c, boots: 0x2c2118,
    hat: 0x6a5134, hair: 0x3a2a22, skin: 0xd2a07c, coat: 0xb08960,
    key: true, lantern: true, sharp: true, chest: 1.02, height: 1, bulk: 1,
  });
  const spacey = createHuman({
    cloth: 0x6d6a3e, cloth2: 0x4a3828, pants: 0x2c3034, boots: 0x5a3a24,
    hair: 0x3a2416, skin: 0xc49474, coat: 0x6b452c,
    goggles: true, cigar: true, gloves: true, crossBelts: true, stubble: true, messy: true, ownHair: true, spyglass: true,
    height: 1.08, bulk: 0.9, chest: 0.98, shoulder: 0.2,
  });
  const mira = createHuman({
    cloth: 0x4e6438, cloth2: 0x3a3024, pants: 0x3e4a32, boots: 0x1a1a1a,
    hat: 0x3d4a32, newsboy: true, hair: 0x14110e, skin: 0xc48a6a,
    sleeves: 0x6a7a48, soot: true, toolbelt: true, wrench: true, ownHair: true, coverall: true,
    height: 0.74, bulk: 0.82, chest: 0.9, shoulder: 0.18,
  });
  scene.add(keeper.root, spacey.root, mira.root);

  const allies = [
    { id: "spacey", name: "Spacey", rig: spacey, role: "throw", x: -1.4, z: -6.2, yaw: 0.2, side: -1.15, back: 1.7, cd: 1.4, anim: "idle", animT: 0, hp: 90, hpMax: 90, hurt: 0 },
    { id: "mira", name: "Mira", rig: mira, role: "melee", x: 1.5, z: -5.8, yaw: -0.2, side: 1.2, back: 1.45, cd: 1.1, anim: "idle", animT: 0, hp: 80, hpMax: 80, hurt: 0 },
  ];

  const player = {
    x: 0, y: 0, z: -8, yaw: 0, vx: 0, vz: 0, vy: 0,
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, coins: 0, potions: 1,
    iframes: 0, action: "idle", actionT: 0, actionDur: 0.4,
    combo: 0, airCombo: 0, comboQueue: false, dodgeSide: 0, dodgeYaw: 0,
    flashCd: 0, flashMax: 7, magicLock: 0, spellCd: 0, spellMax: 1.2, grounded: true, jumps: 0, hurt: 0,
    guardT: 0, hitStop: 0, level: 1, xp: 0, xpNext: 36, str: 0, team: 0, teamHit: false,
  };

  const swingHit = new Set();
  let swingHold = null;
  let playerHits = 0;
  const sayQ = [];
  let sayGap = 0;
  let sayLast = "";
  let sayLastT = -10;
  let playTime = 0;
  const flags = {};
  const events = [];
  const pending = [];
  const shots = [];
  const enemies = [];
  const orbs = [];
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
  let stormAt = 12;
  let lastPrompt = null;
  let lastObjective = "Pages 0/5";
  let posed = null;
  const scenes = {
    brawl: { on: false, wave: 0, done: false },
    city: { on: false, done: false },
    goats: { on: false, done: false },
    fort: { on: false, done: false },
  };

  const bossRig = worldBoss.create();
  scene.add(bossRig.root);
  const boss = {
    id: "boss", kind: "boss", name: worldBoss.name, alive: true, active: false,
    x: worldBoss.home.x, z: worldBoss.home.z, yaw: worldBoss.home.yaw,
    hp: worldBoss.hp, hpMax: worldBoss.hp, radius: worldBoss.radius,
    state: "idle", t: 0, pattern: 0, didHit: false, hit: 0, stunFor: 0,
  };
  bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 28),
    new THREE.MeshBasicMaterial({ color: 0xe7c48a, transparent: true, opacity: 0, side: THREE.DoubleSide }),
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
  const orbGeo = new THREE.SphereGeometry(0.14, 8, 6);

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
    return { hp: 58, radius: 0.48, speed: 2.15, tele: 0.48, lunge: 8, reach: 1.75, dmg: 11, xp: 18, flash: 16 };
  }
  function makeEnemy(kind, x, z, tag) {
    const fog = kind === "fog" || kind === "blanker";
    const rig = fog
      ? createFog({ tall: kind === "blanker", scale: kind === "blanker" ? 1.28 : 0.92 })
      : createHuman({
        cloth: 0x6a6864, cloth2: 0x5a3434, pants: 0x3e3e3c, boots: 0x2a2422,
        hat: 0x2c2424, wideHat: true, hair: 0x1a1410, skin: 0xb09880,
        bandana: true, club: true, height: 1.04, bulk: 1.04, chest: 1.05,
      });
    scene.add(rig.root);
    const prof = profileFor(kind);
    const enemy = {
      id: "e" + (seq++), kind, rig, prof, x, z, yaw: Math.PI, y: 0, tag: tag || "",
      hp: prof.hp, hpMax: prof.hp, radius: prof.radius,
      state: "idle", t: 0, alive: true, hit: 0, didHit: false,
      speed: 0, stunFor: 0,
    };
    enemies.push(enemy);
    return enemy;
  }
  function clearEnemies() {
    for (const e of enemies) scene.remove(e.rig.root);
    enemies.length = 0;
  }
  function spawnStarters() {
    makeEnemy("fog", -3.2, 4, "deck");
    makeEnemy("fog", 3.4, 9.5, "deck");
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
    const shove = (e.kind === "boss" ? 0.35 : 1.05) + (opts.knock || 0);
    e.x += (dx / len) * shove;
    e.z += (dz / len) * shove;
    events.push({ type: "dmg", x: e.x, y: 1.6, z: e.z, n: Math.round(dealt) });
    if (opts.knock) audio.finisher();
    else audio.hit();
    if (!src) {
      player.team = Math.min(100, player.team + (opts.knock ? 16 : 10));
      player.hitStop = Math.max(player.hitStop, opts.knock ? 0.07 : 0.04);
      events.push({ type: "hit", heavy: !!opts.knock });
      if (!flags.fight) {
        flags.fight = true;
        speak("spacey-fight");
        speak("mira-fight");
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
      if (e.kind !== "boss") dropLoot(e);
      grantXp(e.kind === "boss" ? 90 : e.prof.xp);
      if (e.kind === "boss") {
        audio.roar();
        flags.won = true;
        bossWall = false;
        audio.setTension(0);
        abilities.unlock("steam");
        events.push({ type: "ability", id: "steam" });
        speak("spacey-win");
        speak("mira-win");
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
    events.push({ type: "hurt", amount });
    events.push({ type: "dmg", x: player.x, y: 1.7, z: player.z, n: Math.round(amount) });
    if (!flags.low && player.hp < 40 && player.hp > 0) {
      flags.low = true;
      speak("mira-hurt");
      speak("spacey-low");
    }
    if (player.hp <= 0 && !flags.dead) {
      flags.dead = true;
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
    e.tell.position.set(e.x, heightAt(e.x, e.z) + 0.08, e.z);
    e.tell.scale.setScalar(wind ? 0.35 + k * 1.7 : 1.75);
    e.tell.material.opacity = wind ? 0.28 + k * 0.62 : 0.9;
    e.tell.material.color.setHex(wind && k < 0.72 ? 0xffc56a : 0xff2a1c);
    note(e.tell);
  }

  function updateEnemy(e, dt) {
    e.hit = Math.max(0, e.hit - dt * 2.4);
    e._swing = false;
    if (!e.alive) {
      e.t += dt;
      e.y = heightAt(e.x, e.z);
      e.rig.root.position.set(e.x, e.y, e.z);
      e.rig.root.rotation.z = Math.min(1.1, e.t) * 0.8;
      e.rig.update(dt, { speed: 0, air: false, action: "death", actionT: Math.min(1, e.t), combo: 0, look: 0, hurt: 0, dodgeSide: 0, hit: 0, tele: false, strike: false });
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
      if (dist > (e.prof.reach || 1.5) * 0.9) {
        e.speed = e.prof.speed * (e.kind === "fog" ? 1.15 : 1);
      } else {
        e.state = "wind";
        e.t = 0;
        e.didHit = false;
        e.allyHit = false;
        e.speed = 0;
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
    e.y = heightAt(e.x, e.z);
    e.rig.root.position.set(e.x, e.y, e.z);
    e.rig.root.rotation.y = e.yaw;
    e.rig.root.rotation.z = 0;
    const telling = e.state === "wind" || e.state === "strike";
    e.rig.update(dt, {
      speed: e.speed,
      air: false,
      action: e.state === "strike" ? "attack" : "idle",
      actionT: e.state === "strike" ? e.t / 0.42 : 0,
      combo: 1,
      look: 0,
      hurt: e.hit,
      tele: e.state === "wind",
      strike: e.state === "strike",
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
    if (name === "charge" || name === "monocle") boss.yaw = Math.atan2(player.x - boss.x, player.z - boss.z);
  }
  function showRing(radius, k, color) {
    ring.position.set(boss.x, heightAt(boss.x, boss.z) + 0.08, boss.z);
    ring.scale.setScalar(Math.max(0.2, radius * k));
    ring.material.opacity = 0.16 + 0.5 * k;
    ring.material.color.setHex(color || 0xe7c48a);
    note(ring);
  }
  function updateBoss(dt) {
    boss.hit = Math.max(0, boss.hit - dt * 2.5);
    if (!boss.alive) {
      boss.t += dt;
      bossRig.root.position.y = heightAt(boss.x, boss.z) - Math.min(1.4, boss.t) * 0.4;
      bossRig.root.rotation.z = Math.sin(boss.t) * 0.15;
      bossRig.update(dt, { moving: false, state: "dead", hit: 0, phase: 3 });
      ring.material.opacity = 0;
      return;
    }
    const dist = hypot2(player.x - boss.x, player.z - boss.z);
    if (!boss.active && scenes.fort.done && player.z > 56) wakeBossFight();
    if (!boss.active) {
      bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);
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
      speak("spacey-half");
      audio.roar();
      boss.state = "roarWind";
      boss.t = 0;
    }
    if (boss.state === "intro") {
      boss.yaw = dampAngle(boss.yaw, face, 4, dt);
      if (boss.t > 1.25) beginBoss("slam");
    } else if (boss.state.endsWith("Wind")) {
      boss.yaw = dampAngle(boss.yaw, face, 6, dt);
      const need = (boss.state === "roarWind" ? 0.95 : boss.state === "monocleWind" ? 0.7 : 0.62) * (phase === 3 ? 0.72 : 1);
      const rad = boss.state === "roarWind" ? 6.4 : boss.state === "monocleWind" ? 2.2 : boss.state === "chargeWind" ? 3.2 : 4.4;
      const color = boss.state.startsWith("monocle") ? 0xd7d7e8 : boss.state.startsWith("roar") ? 0xc8c8c8 : 0xe7c48a;
      showRing(rad, boss.t / need, color);
      if (boss.t > need) {
        boss.state = boss.state.replace("Wind", "");
        boss.t = 0;
        boss.didHit = false;
        if (boss.state === "charge" || boss.state === "roar") audio.roar();
      }
    } else if (boss.state === "charge") {
      moving = true;
      const sp = phase === 3 ? 10.5 : phase === 2 ? 9.2 : 8.2;
      boss.x += Math.sin(boss.yaw) * sp * dt;
      boss.z += Math.cos(boss.yaw) * sp * dt;
      showRing(3.1, 1, 0xe7c48a);
      const chargeDist = hypot2(player.x - boss.x, player.z - boss.z);
      if (!boss.didHit && chargeDist < boss.radius + 1.45) {
        boss.didHit = true;
        hurtPlayer(32, boss.x, boss.z, boss);
      }
      if (!boss.allyHit) {
        for (const a of allies) {
          if (hypot2(a.x - boss.x, a.z - boss.z) < boss.radius + 1.45) {
            boss.allyHit = true;
            hurtAlly(a, 14, boss.x, boss.z);
            break;
          }
        }
      }
      if (boss.t > 0.95) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "slam" || boss.state === "roar" || boss.state === "monocle") {
      const rad = boss.state === "roar" ? 5.8 : boss.state === "monocle" ? 7.2 : 4.2;
      showRing(rad, 1, boss.state === "monocle" ? 0xe4e4f2 : 0xe7c48a);
      const toX = player.x - boss.x;
      const toZ = player.z - boss.z;
      const lateral = Math.abs(toX * Math.cos(boss.yaw) - toZ * Math.sin(boss.yaw));
      const missedBeam = boss.state === "monocle" && lateral > 0.9;
      const slamDist = hypot2(player.x - boss.x, player.z - boss.z);
      if (!boss.didHit && boss.t > 0.08 && slamDist < rad && !missedBeam) {
          boss.didHit = true;
          hurtPlayer(boss.state === "roar" ? 24 : boss.state === "monocle" ? 22 : 28, boss.x, boss.z, boss);
          for (const a of allies) {
            if (hypot2(a.x - boss.x, a.z - boss.z) < rad) hurtAlly(a, boss.state === "roar" ? 12 : 14, boss.x, boss.z);
          }
      } else if (boss.state === "monocle" && boss.t > 0.08) boss.didHit = true;
      if (boss.t > 0.38) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "stagger") {
      ring.material.opacity = 0;
      if (boss.t > boss.stunFor) { boss.state = "recover"; boss.t = 0; }
    } else {
      ring.material.opacity = Math.max(0, ring.material.opacity - dt * 2);
      if (boss.t > (phase === 3 ? 0.42 : 0.62)) {
        const cycle = phase === 1
          ? ["slam", "charge", "slam", "charge"]
          : phase === 2
            ? ["slam", "monocle", "charge", "slam"]
            : ["roar", "charge", "monocle", "slam", "charge"];
        const name = cycle[boss.pattern % cycle.length];
        boss.pattern += 1;
        beginBoss(name);
      }
    }
    boss.x = clamp(boss.x, -12, 12);
    boss.z = clamp(boss.z, 52, 70);
    const solved = world.resolve(boss.x, boss.z, 1.15);
    boss.x = solved.x;
    boss.z = clamp(solved.z, 52, 70);
    bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);
    bossRig.root.rotation.y = boss.yaw;
    bossRig.update(dt, { moving, state: boss.state, hit: boss.hit, phase });
  }

  function wakeBossFight() {
    if (boss.active) return;
    boss.active = true;
    boss.state = "intro";
    boss.t = 0;
    bossWall = true;
    audio.roar();
    audio.setTension(1);
    if (world.flashStorm) world.flashStorm();
    if (audio.thunder) audio.thunder();
    speak("spacey-boss");
    speak("mira-boss");
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

  function throwMatch(from, foe) {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.03, 0.1, 2, 5),
      new THREE.MeshStandardMaterial({ color: 0x6a4a32, roughness: 0.7 }),
    );
    scene.add(mesh);
    const yaw = from.yaw;
    const shot = {
      mesh, x: from.x, y: 1.2, z: from.z, foe,
      vx: Math.sin(yaw) * 11, vz: Math.cos(yaw) * 11,
      fx: null,
    };
    shot.fx = spawn({
      tag: "match",
      mesh,
      life: 1400,
      disposable: true,
      onStop() {
        if (mesh.userData.vfxDead) return;
        mesh.userData.vfxDead = true;
        mesh.removeFromParent();
        mesh.geometry.dispose();
        mesh.material.dispose();
      },
    });
    shots.push(shot);
  }

  function updateAllies(dt) {
    if (swingHold) {
      const park = [[0.2, -4.8], [-0.3, -5.2]];
      allies.forEach((a, i) => {
        a.x = player.x + park[i][0];
        a.z = player.z + park[i][1];
        a.yaw = player.yaw;
        a.rig.root.position.set(a.x, heightAt(a.x, a.z), a.z);
        a.rig.root.rotation.y = a.yaw;
        a.rig.update(dt, { speed: 0, air: false, action: "idle", actionT: 0, combo: 0, look: 0, hurt: 0, dodgeSide: 0 });
      });
      return;
    }
    if (posed) {
      for (const a of allies) {
        a.yaw = posed.yaw;
        a.rig.root.position.set(a.x, heightAt(a.x, a.z), a.z);
        a.rig.root.rotation.y = a.yaw;
        a.rig.update(dt, {
          speed: 0, air: false, action: "idle", actionT: 0, combo: 0, look: 0, hurt: 0, dodgeSide: 0,
        });
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
          damageEnemy(foe, 14, a);
          if (!flags.wrench) { flags.wrench = true; speak("mira-wrench"); }
        } else if (a.role === "throw" && fd < 11 && a.cd <= 0) {
          a.cd = 3.6;
          a.anim = "throw";
          a.animT = 0;
          throwMatch(a, foe);
        }
      }
      a.rig.root.position.set(a.x, heightAt(a.x, a.z), a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, {
        speed: d > 0.3 ? Math.min(5, d) : 0,
        air: false, action: a.anim, actionT: a.animT, combo: 1, look: 0, hurt: 0, dodgeSide: 0,
      });
    }
    for (let i = shots.length - 1; i >= 0; i--) {
      const b = shots[i];
      if (!b.fx || !b.fx.alive) {
        shots.splice(i, 1);
        continue;
      }
      const target = b.foe && b.foe.alive ? b.foe : null;
      if (target) {
        b.vx = damp(b.vx, (target.x - b.x) * 6, 6, dt);
        b.vz = damp(b.vz, (target.z - b.z) * 6, 6, dt);
      }
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.y = 1.15 + Math.sin(performance.now() / 1000 * 18) * 0.04;
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.z += dt * 10;
      const hit = target && hypot2(target.x - b.x, target.z - b.z) < 0.7;
      if (hit) {
        damageEnemy(target, 8, { x: b.x, z: b.z });
        if (target.kind !== "boss" && target.alive) { target.state = "stun"; target.t = 0; target.stunFor = 0.7; }
        b.fx.stop();
        shots.splice(i, 1);
      }
    }
  }

  function pageCount() {
    return world.pages.filter((p) => p.got).length;
  }
  function collectPage() {
    for (const p of world.pages) {
      if (p.got) continue;
      if (hypot2(p.x - player.x, p.z - player.z) < 1.5) {
        p.got = true;
        p.mesh.visible = false;
        audio.chest();
        if (!flags.paged) { flags.paged = true; speak("spacey-page"); speak("mira-page"); }
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
    speak("spacey-chest");
  }

  function updateCrystals() {
    let moved = false;
    for (const crystal of world.crystals) {
      if (crystal.seated) continue;
      let dx = crystal.x - player.x;
      let dz = crystal.z - player.z;
      let d = hypot2(dx, dz) || 0.001;
      if (d < 1.35) {
        const overlap = 1.35 - d;
        crystal.x += (dx / d) * overlap;
        crystal.z += (dz / d) * overlap;
        moved = true;
      }
      crystal.x = clamp(crystal.x, 23.4, 41.6);
      crystal.z = clamp(crystal.z, -6.2, 16.2);
      if (hypot2(crystal.x - crystal.socketX, crystal.z - crystal.socketZ) < 0.75) {
        crystal.seated = true;
        crystal.x = crystal.socketX;
        crystal.z = crystal.socketZ;
        audio.chest();
      }
    }
    const seated = world.crystals.filter((c) => c.seated).length;
    if (world.setCityCalm) world.setCityCalm(seated / 3);
    if (!scenes.city.done && seated === world.crystals.length) {
      scenes.city.done = true;
      audio.level();
    }
    return moved;
  }

  function updateGoats(dt) {
    const pen = world.pen;
    for (const g of world.goats) {
      if (g.penned) {
        g.rig.update(dt, 0.15);
        g.root.position.set(g.x, heightAt(g.x, g.z), g.z);
        continue;
      }
      g.yaw += Math.sin(playTime * 0.8 + g.seed) * dt * 0.7;
      let nx = g.x + Math.sin(g.yaw) * 0.7 * dt;
      let nz = g.z + Math.cos(g.yaw) * 0.7 * dt;
      const dx = nx - player.x;
      const dz = nz - player.z;
      const d = hypot2(dx, dz) || 0.001;
      if (d < 1.3) {
        nx += (dx / d) * (1.3 - d);
        nz += (dz / d) * (1.3 - d);
        g.yaw = Math.atan2(dx, dz);
      }
      nx = clamp(nx, -45.4, -23.2);
      nz = clamp(nz, -13.2, 15.4);
      const fence = (nx < -43.5 && nz > 8 && nz < 14.2)
        || (nx > -38.6 && nx < -37.9 && nz > 8 && nz < 14.2)
        || (nz > 13.55 && nz < 14.3 && nx < -38 && nx > -44.2);
      if (!fence) { g.x = nx; g.z = nz; }
      g.inside = g.x > pen.minX && g.x < pen.maxX && g.z > pen.minZ && g.z < pen.maxZ;
      g.root.position.set(g.x, heightAt(g.x, g.z), g.z);
      g.root.rotation.y = g.yaw;
      g.rig.update(dt, 0.7);
    }
    if (!scenes.goats.done && world.goats.length && world.goats.every((g) => g.inside)) {
      scenes.goats.done = true;
      for (const g of world.goats) g.penned = true;
      audio.chest();
    }
  }

  function taggedAlive(tag) {
    return enemies.some((e) => e.alive && e.tag === tag);
  }
  function updateScenes() {
    const onDeckBow = player.z > 15 && player.z < 27 && Math.abs(player.x) < 9;
    if (onDeckBow && !scenes.brawl.on && !scenes.brawl.done) {
      scenes.brawl.on = true;
      scenes.brawl.wave = 1;
      world.setHeel(0.045);
      makeEnemy("boarder", -2.2, 20, "brawl");
      makeEnemy("boarder", 2.4, 22, "brawl");
      makeEnemy("fog", 0.4, 24, "brawl");
      speak("spacey-brawl");
      speak("mira-brawl");
      events.push({ type: "bulletin", id: "scene-brawl" });
      if (audio.clank) audio.clank();
    }
    if (scenes.brawl.on && !scenes.brawl.done && scenes.brawl.wave === 1 && !taggedAlive("brawl")) {
      scenes.brawl.wave = 2;
      makeEnemy("blanker", 0.2, 23, "brawl");
      makeEnemy("fog", -2.5, 21, "brawl");
      makeEnemy("boarder", 2.2, 19.5, "brawl");
    }
    if (scenes.brawl.on && !scenes.brawl.done && scenes.brawl.wave === 2 && !taggedAlive("brawl")) {
      scenes.brawl.done = true;
      world.setHeel(0.018);
    }
    if (player.x > 23 && !flags.cityLine) {
      flags.cityLine = true;
      scenes.city.on = true;
      speak("spacey-city");
      speak("mira-city");
      events.push({ type: "bulletin", id: "scene-city" });
    }
    if (player.x < -24 && !flags.goatLine) {
      flags.goatLine = true;
      scenes.goats.on = true;
      speak("spacey-goats");
      speak("mira-goats");
      events.push({ type: "bulletin", id: "scene-goats" });
      if (audio.bleat) audio.bleat();
    }
    if (player.z > 42 && !scenes.fort.on && !scenes.fort.done) {
      scenes.fort.on = true;
      makeEnemy("boarder", -2, 48, "fort");
      makeEnemy("fog", 2.2, 50, "fort");
      makeEnemy("blanker", 0, 53, "fort");
      speak("spacey-fort");
      speak("mira-fort");
      events.push({ type: "bulletin", id: "scene-fort" });
      if (audio.thunder) audio.thunder();
      if (world.flashStorm) world.flashStorm();
    }
    if (scenes.fort.on && !scenes.fort.done && !taggedAlive("fort")) scenes.fort.done = true;
    if (player.z > 44 && playTime > stormAt && audio.thunder) {
      stormAt = playTime + 8;
      audio.thunder();
      if (world.flashStorm) world.flashStorm();
    }
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
      if (!flags.levelTalk) { flags.levelTalk = true; speak("spacey-level"); }
    }
  }
  function dropLoot(e) {
    const kinds = [["hp", 10], ["mp", 8], ["coin", 2]];
    for (const [kind, n] of kinds) {
      const color = kind === "hp" ? 0x9dbe74 : kind === "mp" ? 0x8eb4d4 : 0xe4c56a;
      const mesh = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color }));
      scene.add(mesh);
      const ang = Math.random() * Math.PI * 2;
      orbs.push({ kind, n, mesh, age: 0, y: 0.7, x: e.x + Math.cos(ang) * 0.4, z: e.z + Math.sin(ang) * 0.4 });
    }
  }
  function updateOrbs(dt) {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.age += dt;
      o.y = 0.55 + Math.sin(o.age * 4) * 0.08;
      o.mesh.position.set(o.x, heightAt(o.x, o.z) + o.y, o.z);
      if (hypot2(o.x - player.x, o.z - player.z) < 1.15) {
        if (o.kind === "hp") player.hp = Math.min(player.hpMax, player.hp + o.n);
        else if (o.kind === "mp") player.mp = Math.min(player.mpMax, player.mp + o.n);
        else { player.coins += o.n; audio.coin(); }
        scene.remove(o.mesh);
        orbs.splice(i, 1);
      } else if (o.age > 12) {
        scene.remove(o.mesh);
        orbs.splice(i, 1);
      }
    }
  }

  function findLock() {
    if (lockTarget && !lockTarget.alive) lockTarget = null;
    return lockTarget;
  }
  function toggleLock() {
    if (lockTarget && lockTarget.alive) { lockTarget = null; return; }
    lockTarget = nearest(player.x, player.z, 18);
  }
  function cycleLock(dir) {
    const list = living().filter((e) => hypot2(e.x - player.x, e.z - player.z) < 20);
    if (!list.length) { lockTarget = null; return; }
    let i = list.findIndex((e) => e.id === (lockTarget && lockTarget.id));
    if (i < 0) i = 0;
    lockTarget = list[(i + dir + list.length) % list.length];
  }
  function aimTarget() {
    if (lockTarget && lockTarget.alive) return lockTarget;
    let best = null;
    let bestD = 8;
    for (const e of living()) {
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const d = hypot2(dx, dz);
      if (d > 8 || d < 0.001) continue;
      const dot = (Math.sin(player.yaw) * dx + Math.cos(player.yaw) * dz) / d;
      if (dot < 0.15 && d > 3.4) continue;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
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
      if (!e || e.kind === "dummy") continue;
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
    gustFx.fire(player.x, player.y + 0.08, player.z);
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
    speak("mira-toss");
  }
  function drink() {
    if (player.potions <= 0 || player.hp >= player.hpMax) return;
    player.potions -= 1;
    player.hp = Math.min(player.hpMax, player.hp + 42);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "+HP" });
  }
  function pickReaction() {
    if (boss.active && boss.alive && boss.state === "slamWind" && reactCd <= 0 && boss.t > 0.08 && boss.t < 0.55) {
      return { id: "hook", label: "Hook the knee!" };
    }
    return null;
  }
  function fireReaction() {
    if (!reaction || reaction.id !== "hook" || !boss.alive) return false;
    reactCd = 6;
    boss.state = "stagger";
    boss.t = 0;
    boss.stunFor = 1.3;
    damageEnemy(boss, 42, null, { knock: 0.2 });
    playerHits += 1;
    audio.parry();
    speak("spacey-react");
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
      scenes: { brawl: scenes.brawl.done, city: scenes.city.done, goats: scenes.goats.done, fort: scenes.fort.done },
      crystals: world.crystals.map((c) => c.seated),
      chests: world.chests.map((c) => !!c.open),
    };
  }
  function persist(complete) {
    if (complete) flags.cleared = true;
    const data = saveBody();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
    if (data.complete) {
      try { localStorage.setItem(CLEAR_KEY, "1"); } catch { /* private mode */ }
    }
  }
  function armExit() {
    bossWall = false;
    outroArmed = false;
    outroT = 0;
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
    speak("spacey-gate");
  }
  function writeSave() {
    player.hp = player.hpMax;
    player.mp = player.mpMax;
    for (const a of allies) a.hp = a.hpMax;
    persist(false);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "Saved" });
    speak("spacey-save");
  }
  function applySave(data) {
    player.x = data.x;
    player.z = data.z;
    player.y = heightAt(data.x, data.z);
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
    (data.crystals || []).forEach((seated, i) => {
      if (seated && world.crystals[i]) {
        world.crystals[i].seated = true;
        world.crystals[i].x = world.crystals[i].socketX;
        world.crystals[i].z = world.crystals[i].socketZ;
      }
    });
    if (world.setCityCalm) {
      const n = world.crystals.filter((c) => c.seated).length;
      world.setCityCalm(n / Math.max(1, world.crystals.length));
    }
    if (data.scenes) {
      scenes.brawl.done = !!data.scenes.brawl;
      scenes.city.done = !!data.scenes.city;
      scenes.goats.done = !!data.scenes.goats;
      scenes.fort.done = !!data.scenes.fort;
      if (scenes.brawl.done) scenes.brawl.on = true;
      if (scenes.fort.done) scenes.fort.on = true;
      if (scenes.goats.done) for (const g of world.goats) g.penned = true;
    }
    (data.chests || []).forEach((open, i) => {
      if (open && world.chests[i]) {
        world.chests[i].open = true;
        world.chests[i].lid.rotation.x = -1.15;
      }
    });
    if (data.bossDead) {
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 2;
      flags.won = true;
      armExit();
    }
    if (data.complete) flags.cleared = true;
    flags.g1 = true;
    flags.g2 = true;
  }

  function idlePresentation(dt) {
    player.y = heightAt(player.x, player.z);
    keeper.root.position.set(player.x, player.y, player.z);
    keeper.root.rotation.y = player.yaw;
    keeper.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0.15, dodgeSide: 0 });
    for (const a of allies) {
      a.rig.root.position.set(a.x, heightAt(a.x, a.z), a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0, dodgeSide: 0 });
    }
    for (const e of enemies) {
      e.rig.root.position.set(e.x, heightAt(e.x, e.z), e.z);
      e.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, tele: false, strike: false, hit: 0 });
    }
    bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);
    bossRig.update(dt, { moving: false, state: boss.alive ? "idle" : "dead", hit: 0, phase: 1 });
    for (const g of world.goats) g.root.position.set(g.x, 0, g.z);
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
        keeper: { x: player.x, y: player.y + 1.85, z: player.z },
        spacey: { x: allies[0].x, y: heightAt(allies[0].x, allies[0].z) + 1.85, z: allies[0].z },
        mira: { x: allies[1].x, y: heightAt(allies[1].x, allies[1].z) + 1.35, z: allies[1].z },
      },
      enemies: enemies.filter((e) => e.rig.root.visible).map((e) => ({
        id: e.id, kind: e.kind, hp: e.hp, alive: e.alive, x: e.x, y: e.y + 1.4, z: e.z,
      })),
      boss: {
        name: boss.name, alive: boss.alive, active: boss.active, hp: boss.hp, hpMax: boss.hpMax,
        x: boss.x, y: heightAt(boss.x, boss.z) + 2.8, z: boss.z,
      },
      lock: lockTarget && lockTarget.alive ? {
        id: lockTarget.id, x: lockTarget.x,
        y: heightAt(lockTarget.x, lockTarget.z) + (lockTarget.kind === "boss" ? 2.6 : 1.5),
        z: lockTarget.z,
      } : null,
      prompt,
      pages: pageCount(),
      circus: scenes.city.done,
      objective: objective || "Pages 0/5",
      tutor: null,
      drain: colorDrain(),
      events,
      camYaw,
    };
  }

  function objectiveFor() {
    const got = pageCount();
    if (boss.active && boss.alive) return "Break the baron";
    if (!boss.alive) return "Step through";
    if (scenes.brawl.on && !scenes.brawl.done) return "Clear the deck";
    if (player.x > 23 && !scenes.city.done) return "Seat the crystals";
    if (player.x < -24 && !scenes.goats.done) return "Pen the goats";
    if (player.z > 42 && !scenes.fort.done) return "Cross the crag";
    if (scenes.fort.done && boss.alive && player.z > 48) return "Baron in the hangar";
    return `Pages ${got}/5`;
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
    if (!flags.g1) { flags.g1 = true; speak("spacey-greet"); }
    if (!flags.g2 && playTime > 3.6) { flags.g2 = true; speak("mira-greet"); }
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
    if (edge.lasso || edge.steam || edge.pulse || edge.firelight) {
      const id = edge.firelight ? "firelight" : edge.pulse ? "pulse" : edge.steam ? "steam" : "lasso";
      abilities.cast(id, {
        player, living, damageEnemy, events, audio,
        resolve: (x, z, r) => world.resolve(x, z, r),
      });
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
    const resolved = world.resolve(player.x, player.z, 0.38, boss.alive && boss.active ? [{ x: boss.x, z: boss.z, r: 1.2 }] : null);
    player.x = resolved.x;
    player.z = resolved.z;
    if (bossWall && boss.alive && player.z < 49.2 && player.z > 40) player.z = 49.2;

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

    if (swingHold) {
      player.action = "attack";
      player.combo = swingHold.combo;
      player.actionDur = 0.55;
      player.vx = player.vz = 0;
      if (player.actionT < swingHold.holdAt) {
        player.actionT = Math.min(swingHold.holdAt, player.actionT + dt / 0.55);
      }
    } else if (player.action !== "idle" && player.action !== "guard") {
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
    separate();
    updateAllies(dt);
    updateOrbs(dt);
    updateCrystals();
    updateGoats(dt);
    updateScenes();
    gustFx.follow(player.x, player.y + 0.08, player.z);
    for (const chest of world.chests) {
      const open = !!chest.open;
      chest.lid.rotation.x = damp(chest.lid.rotation.x, open ? -1.2 : 0, open ? 14 : 8, dt);
      chest.lid.position.y = damp(chest.lid.position.y, open ? 0.56 : 0.46, open ? 10 : 8, dt);
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
      if (!flags.gateLine) { flags.gateLine = true; speak("spacey-gate"); }
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

  function resetRusty() {
    for (const k of Object.keys(flags)) delete flags[k];
    pending.length = 0;
    sayQ.length = 0;
    sayGap = 0;
    sayLast = "";
    sayLastT = -10;
    playTime = 0;
    playerHits = 0;
    outroT = -1;
    outroArmed = true;
    bossWall = false;
    lockTarget = null;
    reaction = null;
    reactCd = 0;
    swingHit.clear();
    player.x = 0;
    player.z = -8;
    player.y = 0;
    player.yaw = 0;
    player.vx = player.vz = player.vy = 0;
    player.hpMax = 100;
    player.mpMax = 100;
    player.hp = 100;
    player.mp = 100;
    player.coins = 0;
    player.potions = 1;
    player.level = 1;
    player.xp = 0;
    player.xpNext = 36;
    player.str = 0;
    player.team = 0;
    player.iframes = 0;
    player.action = "idle";
    player.actionT = 0;
    player.combo = 0;
    player.airCombo = 0;
    player.comboQueue = false;
    player.flashCd = 0;
    player.spellCd = 0;
    player.magicLock = 0;
    player.hitStop = 0;
    player.guardT = 0;
    player.jumps = 0;
    player.hurt = 0;
    player.grounded = true;
    const homes = [[-1.4, -6.2, 0.2], [1.5, -5.8, -0.2]];
    allies.forEach((a, i) => {
      a.x = homes[i][0];
      a.z = homes[i][1];
      a.yaw = homes[i][2];
      a.hp = a.hpMax;
      a.hurt = 0;
      a.anim = "idle";
      a.cd = 1;
    });
    clearEnemies();
    spawnStarters();
    for (const s of shots) if (s.fx) s.fx.stop();
    shots.length = 0;
    for (const o of orbs) scene.remove(o.mesh);
    orbs.length = 0;
    boss.alive = true;
    boss.active = false;
    boss.x = worldBoss.home.x;
    boss.z = worldBoss.home.z;
    boss.yaw = worldBoss.home.yaw;
    boss.hp = boss.hpMax;
    boss.state = "idle";
    boss.t = 0;
    boss.pattern = 0;
    boss.didHit = false;
    boss.hit = 0;
    bossRig.root.visible = true;
    bossRig.root.rotation.set(0, Math.PI, 0);
    bossRig.root.position.set(boss.x, 0, boss.z);
    for (const chest of world.chests) {
      chest.open = false;
      chest.lid.rotation.x = 0;
    }
    for (const p of world.pages) {
      p.got = false;
      p.mesh.visible = true;
    }
    for (const crystal of world.crystals) {
      crystal.seated = false;
      crystal.x = crystal.homeX;
      crystal.z = crystal.homeZ;
    }
    if (world.setCityCalm) world.setCityCalm(0);
    if (world.setHeel) world.setHeel(0.018);
    world.goats.forEach((g, i) => {
      const spots = [[-30, -2], [-33.5, 0.5], [-28.5, 2.2], [-32, -6]];
      g.x = spots[i][0];
      g.z = spots[i][1];
      g.penned = false;
      g.inside = false;
      g.root.position.set(g.x, 0, g.z);
    });
    scenes.brawl.on = false;
    scenes.brawl.wave = 0;
    scenes.brawl.done = false;
    scenes.city.on = false;
    scenes.city.done = false;
    scenes.goats.on = false;
    scenes.goats.done = false;
    scenes.fort.on = false;
    scenes.fort.done = false;
    gateUsed = false;
    gateSeen = false;
    gateWasIn = false;
    if (world.gate.setReady) world.gate.setReady(false);
    world.gate.setOpen(false);
    audio.setTension(0);
  }

  spawnStarters();

  return {
    update,
    begin(opts) {
      if (!opts || !opts.restore) return false;
      let data = null;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { data = null; }
      if (!data || data.v !== 1) return false;
      applySave(data);
      return true;
    },
    place(x, z, yaw = 0) {
      player.x = x;
      player.z = z;
      player.y = heightAt(x, z);
      player.yaw = yaw;
      player.vx = player.vz = 0;
      allies[0].x = x - 1.2;
      allies[0].z = z - 1.4;
      allies[1].x = x + 1.2;
      allies[1].z = z - 1.2;
    },
    poseCrew() {
      const z = -9.6;
      posed = { x: 0, z, yaw: -Math.PI / 2 };
      player.x = 0;
      player.z = z;
      player.y = heightAt(0, z);
      player.yaw = posed.yaw;
      player.vx = player.vz = player.vy = 0;
      allies.forEach((a, i) => {
        a.x = 0;
        a.z = z + (i === 0 ? -0.7 : 0.7);
        a.yaw = posed.yaw;
      });
    },
    poseBoss() {
      boss.yaw = Math.PI * 0.78;
    },
    wakeBoss() {
      scenes.fort.on = true;
      scenes.fort.done = true;
      wakeBossFight();
    },
    revive() {
      flags.dead = false;
      player.hp = player.hpMax;
      player.iframes = 1.2;
      player.action = "idle";
      if (boss.active && boss.alive) {
        player.x = 0;
        player.z = 54;
        boss.hp = boss.hpMax;
        boss.x = worldBoss.home.x;
        boss.z = worldBoss.home.z;
        boss.state = "recover";
        boss.t = 0;
      } else {
        player.x = 0;
        player.z = -8;
      }
      player.y = heightAt(player.x, player.z);
    },
    resetTrail: resetRusty,
    skipToGate() {
      for (const p of world.pages) {
        p.got = true;
        p.mesh.visible = false;
      }
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 2;
      flags.won = true;
      armExit();
      gateSeen = false;
      gateWasIn = false;
      gateUsed = false;
      player.x = 0;
      player.z = -14.2;
      player.y = 0;
    },
    pageCount,
    mp: () => player.mp,
    level: () => player.level,
    team: () => player.team,
    reaction: () => (reaction ? { id: reaction.id, label: reaction.label } : null),
    lockId: () => (lockTarget && lockTarget.alive ? lockTarget.id : null),
    circusDone: () => scenes.city.done,
    floats: () => [],
    player,
    enemies,
    boss,
    bossName: worldBoss.name,
    hits: () => playerHits,
    skipLesson() {},
    tutorSave() {},
    teaching: () => false,
    tutorStep: () => "done",
    allies: () => allies.map((a) => ({ id: a.id, x: a.x, z: a.z, hp: a.hp, hpMax: a.hpMax })),
    chests: () => world.chests.map((c) => !!c.open),
    exitReady: () => !!(world.gate && world.gate.ready),
    defeatForExit() {
      boss.hp = 0;
      boss.alive = false;
      boss.active = true;
      boss.state = "dead";
      boss.t = 2;
      flags.won = true;
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
      e.allyHit = false;
      e.yaw = Math.atan2(player.x - x, player.z - z);
      const dmg = opts.dmg || e.prof.dmg;
      e.prof = { ...e.prof, dmg, reach: 4.2, lunge: 0 };
      return { id: e.id, dmg };
    },
    tuckExtras() {
      allies[0].x = player.x + 1.6;
      allies[0].z = player.z - 3.1;
      allies[1].x = player.x - 1.5;
      allies[1].z = player.z - 3.4;
      enemies.forEach((e, i) => {
        e.x = 34;
        e.z = 6 + i * 1.4;
        e.state = "idle";
        e.speed = 0;
      });
    },
    holdSwing(combo = 1) {
      swingHold = { combo, holdAt: 0.42 };
      player.action = "attack";
      player.combo = combo;
      player.actionDur = 0.55;
      player.actionT = 0;
      player.yaw = 0.35;
      player.vx = player.vz = 0;
      this.tuckExtras();
    },
    debugFoe() {
      const dist = 3.5;
      const x = player.x + Math.sin(player.yaw) * dist;
      const z = player.z + Math.cos(player.yaw) * dist;
      const e = makeEnemy("fog", x, z);
      e.hp = e.hpMax = 90;
      e.state = "idle";
      return e.id;
    },
    foeHp(id) {
      const e = enemies.find((foe) => foe.id === id);
      return e ? e.hp : null;
    },
    continueFromSave() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { data = null; }
      if (!data || data.v !== 1) return false;
      applySave(data);
      flags.dead = false;
      player.hp = player.hpMax;
      player.mp = player.mpMax;
      player.iframes = 1.6;
      player.action = "idle";
      player.vx = player.vz = player.vy = 0;
      return true;
    },
    keyOn: () => true,
  };
}
