import * as THREE from "three";
import { clamp, damp, dampAngle, hypot2 } from "./util.js";
import { halfWidth, heightAt } from "./world.js?v=7";
import { createFog, handbillMesh } from "./rigs.js?v=5";
import { createHuman } from "./actors.js?v=7";
import { bossFor } from "../bosses/index.js?v=8";
import { createAbilities } from "./abilities.js?v=1";

const abilities = createAbilities();

const worldBoss = bossFor("california-trail");

const SAVE_KEY = "book-worlds-california-trail";
const CLEAR_KEY = "book-worlds-world1-clear";
const CHEST_REACH = 3.4;
const GATE_Z = 126;
const GATE_REACH = 4.8;

export function createSim(scene, world, audio) {
  const keeper = createHuman({
    cloth: 0xc4a574, cloth2: 0x6e3832, pants: 0x4a453c, boots: 0x2c2118,
    hat: 0x6a5134, hair: 0x3a2a22, skin: 0xd2a07c, coat: 0xb08960,
    key: true, lantern: true, sharp: true, chest: 1.02, height: 1, bulk: 1,
  });
  const jang = createHuman({
    cloth: 0xe6d8c4, cloth2: 0x2c3338, pants: 0x3e4650, boots: 0x241c16,
    hat: 0x2a2420, hatTilt: -0.18, hatPitch: 0.04, hatBand: 0x6a2430, bowler: true, waistcoat: true,
    hair: 0x1c1612, skin: 0xc99570, mustache: true, sharp: true, neckerchief: 0x7a2430,
    bills: true, height: 0.9, bulk: 0.92, chest: 0.96, shoulder: 0.21,
  });
  const tom = createHuman({
    cloth: 0x6d7e8a, cloth2: 0x8a5a3c, pants: 0x5a4634, boots: 0x2a2018,
    hat: 0x6a5340, hatTilt: 0.06, wideHat: true, hair: 0x4a3428, skin: 0xd7a888,
    suspenders: true, scratch: true, roundFace: true, sleeves: 0xc4a888,
    height: 1.12, bulk: 1.18, chest: 1.28, shoulder: 0.28,
  });
  scene.add(keeper.root, jang.root, tom.root);

  const allies = [
    { id: "jang", name: "Jang", rig: jang, x: -1.5, z: 0.6, yaw: 0.2, side: -1.15, back: 1.65, cd: 1.2, anim: "idle", animT: 0, hp: 80, hpMax: 80, hurt: 0 },
    { id: "tom", name: "Tom", rig: tom, x: 1.7, z: 0.4, yaw: -0.1, side: 1.3, back: 1.8, cd: 1.6, anim: "idle", animT: 0, hp: 120, hpMax: 120, hurt: 0 },
  ];

  const player = {
    x: 0, y: 0, z: -6, yaw: 0, vx: 0, vz: 0, vy: 0,
    hp: 100, hpMax: 100, mp: 100, mpMax: 100, coins: 0, potions: 1,
    iframes: 0, action: "idle", actionT: 0, actionDur: 0.4,
    combo: 0, airCombo: 0, comboQueue: false, dodgeSide: 0,
    flashCd: 0, flashMax: 7, magicLock: 0, spellCd: 0, spellMax: 1.2, grounded: true, jumps: 0, hurt: 0,
    guardT: 0, hitStop: 0, level: 1, xp: 0, xpNext: 36, str: 0, team: 0, teamHit: false,
  };
  const swingHit = new Set();
  let playerHits = 0;
  let allyHold = 8;
  const sayQ = [];
  let sayGap = 0;
  let sayLast = "";
  let sayLastT = -10;
  let bossWall = true;
  let gateSeen = false;
  let gateWasIn = false;
  let gateUsed = false;
  const flags = {};
  const events = [];
  const TUTOR_KEY = "book-worlds-tutorial";
  const MEET = { jang: { x: -2.2, z: -28, yaw: Math.PI }, tom: { x: 2.3, z: -27.4, yaw: Math.PI } };
  let tutorialOn = false;
  let partyJoined = true;
  let tutorStep = "done";
  let tutorSaid = "";
  let tutorMoved = 0;
  let tutorLooked = false;
  let tutorRecenter = false;
  let tutorJumped = false;
  let tutorDodged = false;
  let tutorCombo = false;
  let tutorLocked = false;
  let tutorGuarded = false;
  let tutorFlashed = false;
  let tutorMended = false;
  let tutorDrank = false;
  let tutorSaved = false;
  let tutorMagic = 0;
  let practiceT = 1.2;
  let practiceHit = 0;
  let partyTomT = 0;
  let stepCam = 0;
  function tutorialCleared() {
    try { return localStorage.getItem(TUTOR_KEY) === "1"; } catch { return false; }
  }
  const bills = [];
  const enemies = [];
  const orbs = [];
  let seq = 1;
  const arenas = [
    {
      id: "camp", minZ: 10, maxZ: 24, wave: 0, active: false, cleared: false,
      waves: [
        [{ kind: "fog", x: 0.2, z: 11 }, { kind: "fog", x: 1.7, z: 12.6 }],
        [{ kind: "bandit", x: -3.2, z: 8 }, { kind: "fog", x: 3.4, z: 14 }],
      ],
    },
    {
      id: "narrows", minZ: 28, maxZ: 66, wave: 0, active: false, cleared: false,
      waves: [
        [{ kind: "blanker", x: -2.2, z: 38 }],
        [{ kind: "bandit", x: 2.2, z: 52 }, { kind: "fog", x: -1.2, z: 60 }],
      ],
    },
    {
      id: "rope", minZ: 68, maxZ: 92, wave: 0, active: false, cleared: false,
      waves: [
        [
          { kind: "fog", x: -1.4, z: 70 },
          { kind: "bandit", x: -1.6, z: 76, pendulum: true },
          { kind: "bandit", x: 1.4, z: 84.5, pendulum: true },
        ],
      ],
    },
  ];

  const bossRig = worldBoss.create();
  scene.add(bossRig.root);
  const boss = {
    id: "boss", kind: "boss", name: worldBoss.name, alive: true, active: false,
    x: worldBoss.home.x, z: worldBoss.home.z, yaw: worldBoss.home.yaw,
    hp: worldBoss.hp, hpMax: worldBoss.hp, radius: worldBoss.radius,
    state: "idle", t: 0, pattern: 0, didHit: false, hit: 0, stunFor: 0,
  };
  bossRig.root.visible = true;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 32),
    new THREE.MeshBasicMaterial({ color: 0xe7c48a, transparent: true, opacity: 0.0, side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);
  const gust = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.62, 28),
    new THREE.MeshBasicMaterial({ color: 0xe7d7b0, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  gust.rotation.x = -Math.PI / 2;
  scene.add(gust);
  let gustT = 0;

  let circus = false;
  let reaction = null;
  let lassoCd = 0;
  let lastPrompt = null;
  let lastObjective = "Pages 0/5";
  const orbGeo = new THREE.SphereGeometry(0.14, 8, 6);

  function profileFor(kind) {
    if (kind === "fog") return { hp: 42, radius: 0.55, speed: 2.7, tele: 0.46, lunge: 9.2, reach: 1.7, dmg: 8, xp: 14, flash: 30 };
    if (kind === "blanker") return { hp: 74, radius: 0.82, speed: 1.55, tele: 0.58, lunge: 7.2, reach: 2.15, dmg: 16, xp: 22, flash: 24 };
    return { hp: 58, radius: 0.48, speed: 2.3, tele: 0.5, lunge: 8.4, reach: 1.85, dmg: 12, xp: 20, flash: 16 };
  }

  function erasePatches(x, z) {
    const patches = [];
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(
        new THREE.CircleGeometry(1.35 + i * 0.35, 20),
        new THREE.MeshBasicMaterial({ color: 0xe4e4e4, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      );
      const ang = i * 2.2 + 0.4;
      const rad = 1.3 + i * 0.85;
      const px = x + Math.cos(ang) * rad;
      const pz = z + Math.sin(ang) * rad;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(px, heightAt(px, pz) + 0.045, pz);
      mesh.renderOrder = 2;
      scene.add(mesh);
      patches.push(mesh);
    }
    return patches;
  }

  function fadePatches(e, dt, target) {
    if (!e.patches) return;
    for (const mesh of e.patches) {
      mesh.material.opacity = damp(mesh.material.opacity, target, 2.4, dt);
    }
    if (!e.alive && e.patches.every((mesh) => mesh.material.opacity < 0.03)) {
      for (const mesh of e.patches) scene.remove(mesh);
      e.patches = null;
    }
  }

  function makeEnemy(kind, x, z, pendulum = false) {
    const fog = kind === "fog" || kind === "blanker";
    const rig = fog
      ? createFog({ tall: kind === "blanker", scale: kind === "blanker" ? 1.38 : 0.92 })
      : createHuman({
        cloth: 0x6e6e6a, cloth2: 0x4e4e4a, pants: 0x5a5a56, boots: 0x2a2a28,
        hat: 0x3a3a38, hair: 0x1a1410, skin: 0xb08a68, bandana: true, club: true, fog: true,
        height: 1.02, bulk: 1.02, chest: 1.05,
      });
    scene.add(rig.root);
    const prof = profileFor(kind);
    return {
      id: "e" + (seq++), kind, rig, prof, x, z, yaw: Math.PI, y: 0,
      hp: prof.hp, hpMax: prof.hp, radius: prof.radius,
      state: "idle", t: 0, alive: true, hit: 0, didHit: false,
      speed: 0, stunFor: 0, homeX: x, homeZ: z, pendulum, routed: false,
      rise: 0, arena: null, portal: null,
      patches: kind === "blanker" ? erasePatches(x, z) : null,
    };
  }

  const pending = [];
  function speak(id) {
    if (!id) return;
    if (id === sayLast && playTime - sayLastT < 5) return;
    if (sayQ.includes(id) || sayQ.length >= 4) return;
    sayLast = id;
    sayLastT = playTime;
    sayQ.push(id);
  }
  function flushSpeak(dt) {
    sayGap = Math.max(0, sayGap - dt);
    if (sayGap > 0 || !sayQ.length) return;
    const id = sayQ.shift();
    sayGap = 0.45;
    pending.push({ type: "say", id });
  }

  function scaled(amount) {
    return Math.max(1, Math.round(amount * (1 + player.str * 0.06)));
  }

  function damageEnemy(e, amount, src, opts = {}) {
    if (!e.alive) return;
    if (e.rise > 0.25) return;
    if (e.pendulum) {
      e.hit = 1;
      const dx = e.x - (src ? src.x : player.x);
      const dz = e.z - (src ? src.z : player.z);
      const l = hypot2(dx, dz) || 1;
      e.x += (dx / l) * 0.45;
      e.z += (dz / l) * 0.45;
      audio.hit();
      if (!flags.ropeHint) {
        flags.ropeHint = true;
        speak("jang-rope-hint");
      }
      return;
    }
    const dealt = src ? amount : scaled(amount);
    e.hp -= dealt;
    e.hit = 1;
    const dx = e.x - (src ? src.x : player.x);
    const dz = e.z - (src ? src.z : player.z);
    const l = hypot2(dx, dz) || 1;
    const shove = (e.kind === "boss" ? 0.4 : e.kind === "dummy" ? 0.12 : 1.15) + (opts.knock || 0);
    e.x += (dx / l) * shove;
    e.z += (dz / l) * shove;
    events.push({ type: "dmg", x: e.x, y: 1.6, z: e.z, n: Math.round(dealt) });
    if (opts.knock) audio.finisher();
    else audio.hit();
    if (!src) {
      player.team = Math.min(100, player.team + (opts.knock ? 16 : 10));
      player.hitStop = Math.max(player.hitStop, opts.knock ? 0.072 : 0.042);
      events.push({ type: "hit", heavy: !!opts.knock });
    }
    if (opts.knock && e.alive && e.kind !== "boss") {
      e.state = "stun";
      e.t = 0;
      e.stunFor = Math.max(e.stunFor, 0.35);
    }
    if (e.kind === "dummy" && !src && player.combo >= 3) tutorCombo = true;
    if (e.hp <= 0) {
      e.hp = 0;
      e.alive = false;
      e.state = "dead";
      e.t = 0;
      if (e.kind !== "dummy") dropLoot(e);
      grantXp(e.kind === "boss" ? 90 : e.kind === "dummy" ? 2 : (e.prof ? e.prof.xp : 20));
      if (e.kind === "boss") {
        audio.roar();
        flags.won = true;
        abilities.unlock("lasso");
        events.push({ type: "ability", id: "lasso" });
        armExit();
        events.push({ type: "bossDead" });
        speak("jang-win");
        speak("tom-win");
      }
    }
  }

  function hurtAlly(a, amount, sx, sz) {
    if (a.hp <= 0) return;
    a.hp = Math.max(0, a.hp - amount);
    a.hurt = 2.4;
    if (sx != null) {
      const dx = a.x - sx;
      const dz = a.z - sz;
      const l = hypot2(dx, dz) || 1;
      a.x += (dx / l) * 0.55;
      a.z += (dz / l) * 0.55;
    }
  }

  function hurtPlayer(amount, sx, sz, attacker) {
    if (player.iframes > 0 || player.hp <= 0) return;
    if (player.action === "dodge" && player.actionT < 0.72) return;
    const dx = player.x - sx;
    const dz = player.z - sz;
    const l = hypot2(dx, dz) || 1;
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
        if (attacker && attacker.kind === "practice") tutorGuarded = true;
        return;
      }
      amount = Math.max(1, Math.round(amount * 0.22));
      audio.guard();
      if (attacker && attacker.kind === "practice") tutorGuarded = true;
    }
    player.hp = Math.max(0, player.hp - amount);
    player.iframes = 0.55;
    player.hurt = 1;
    player.vx += (dx / l) * 9;
    player.vz += (dz / l) * 9;
    audio.hurt();
    events.push({ type: "hurt", amount });
    events.push({ type: "dmg", x: player.x, y: 1.7, z: player.z, n: Math.round(amount) });
    if (!flags.low && player.hp < 40 && player.hp > 0) {
      flags.low = true;
      speak("tom-hurt");
      speak("jang-low");
    }
    if (player.hp <= 0) events.push({ type: "dead" });
  }

  function inFront(ax, az, yaw, bx, bz, reach, minDot) {
    const dx = bx - ax;
    const dz = bz - az;
    const d = hypot2(dx, dz);
    if (d > reach) return false;
    if (d < 0.001) return true;
    const dot = (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / d;
    return dot > minDot;
  }

  function nearest(x, z, max, dummies = false) {
    let best = null;
    let bestD = max;
    for (const e of living()) {
      if (e.kind === "dummy" && !dummies) continue;
      const d = hypot2(e.x - x, e.z - z);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  function living() {
    return enemies.filter((e) => e.alive).concat(boss.alive && boss.active ? [boss] : []);
  }

  function updateEnemy(e, dt) {
    if (!e.alive) {
      if (e.kind === "dummy") return;
      e.t += dt;
      e.rig.update(dt, {
        speed: 0, air: false, action: "death", actionT: Math.min(1, e.t / 0.85),
        combo: 0, look: 0, hurt: 0, dodgeSide: 0, hit: 0, tele: false, strike: false,
      });
      if (e.rig.skinned) {
        e.rig.root.position.y = heightAt(e.x, e.z);
        e.rig.root.rotation.x = 0;
      } else {
        e.rig.root.position.y = heightAt(e.x, e.z) - Math.min(1.2, e.t) * 0.8;
        e.rig.root.rotation.x = Math.min(1.2, e.t);
      }
      fadePatches(e, dt, 0);
      if (e.t > 1.3) e.rig.root.visible = false;
      if (e.tell) e.tell.visible = false;
      if (e.portal) {
        e.portal.material.opacity = Math.max(0, e.portal.material.opacity - dt * 1.6);
        if (e.portal.material.opacity <= 0.02) {
          scene.remove(e.portal);
          e.portal = null;
        }
      }
      return;
    }
    if (e.kind === "dummy") {
      e.rig.root.position.set(e.x, heightAt(e.x, e.z), e.z);
      e.rig.root.rotation.y = Math.PI;
      return;
    }
    const dx = player.x - e.x;
    const dz = player.z - e.z;
    const dist = hypot2(dx, dz);
    e.hit = Math.max(0, e.hit - dt * 3);
    e._swing = false;
    if (e.state === "stun") {
      e.t += dt;
      e.speed = 0;
      if (e.t > e.stunFor) { e.state = "recover"; e.t = 0; }
    } else if (e.state === "idle") {
      e.speed = 0;
      const leash = e.pendulum && (player.z > 94 || player.z < 68);
      if (dist < 11 && player.hp > 0 && !leash) {
        e.state = "chase";
        if (!flags.fight) { flags.fight = true; speak("jang-fight"); }
      }
    } else if (e.state === "chase" && e.pendulum && (player.z > 94 || player.z < 68 || hypot2(e.x - e.homeX, e.z - e.homeZ) > 14)) {
      e.state = "idle";
      e.speed = 0;
    } else if (e.state === "chase") {
      e.speed = dist > 2.2 ? e.prof.speed : e.prof.speed * 0.62;
      if (dist > 0.2) e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), 8, dt);
      if (dist < (e.pendulum ? 1.25 : 2.45)) {
        e.state = "tele";
        e.t = 0;
        e.didHit = false;
        e.allyHit = false;
      }
      if (dist > 18) e.state = "idle";
    } else if (e.state === "tele") {
      e.speed = 0;
      e.t += dt;
      e.yaw = dampAngle(e.yaw, Math.atan2(dx, dz), 10, dt);
      const need = Math.max(0.32, e.prof.tele);
      if (e.t > need) {
        e.state = "strike";
        e.t = 0;
        e.didHit = false;
        e.allyHit = false;
        e._swing = false;
      }
    } else if (e.state === "strike") {
      const prev = e.t;
      e.t += dt;
      e.speed = prev < 0.36 ? Math.max(6.4, e.prof.lunge) : 0;
      e._swing = e.t > 0.05 && prev < 0.48;
      if (e.t > 0.52) { e.state = "recover"; e.t = 0; }
    } else if (e.state === "recover") {
      e.speed = 0;
      e.t += dt;
      if (e.t > 0.55) e.state = "chase";
    }
    if (e.speed > 0 && e.state !== "dead") {
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
    if (e.state === "tele" || e._swing) showTell(e);
    else if (e.tell) e.tell.visible = false;
    e.y = heightAt(e.x, e.z) - Math.max(0, e.rise || 0);
    if (e.rise > 0) e.rise = Math.max(0, e.rise - dt);
    if (e.portal) {
      e.portal.material.opacity = e.alive ? 0.55 + Math.sin(e.t * 9) * 0.15 : Math.max(0, e.portal.material.opacity - dt);
      e.portal.scale.setScalar(0.7 + Math.sin((e.t + 1) * 6) * 0.08);
      if (!e.alive && e.portal.material.opacity <= 0.02) {
        scene.remove(e.portal);
        e.portal = null;
      }
    }
    fadePatches(e, dt, 0.58);
    e.rig.root.position.set(e.x, e.y, e.z);
    e.rig.root.rotation.y = e.yaw;
    const anim = e.rig.update(dt, {
      speed: e.speed,
      air: false,
      action: e.state === "strike" ? "attack" : "idle",
      actionT: e.state === "strike" ? e.t / 0.42 : 0,
      combo: 1,
      look: 0,
      hurt: e.hit,
      tele: e.state === "tele",
      strike: e.state === "strike" || !!e._swing,
      hit: e.state === "tele" || e.state === "strike" || e._swing ? 1 : e.hit,
    });
    if (anim && anim.step) audio.step();
  }

  function updateBoss(dt) {
    boss.hit = Math.max(0, boss.hit - dt * 2.5);
    if (!boss.alive) {
      boss.t += dt;
      bossRig.root.position.y = heightAt(boss.x, boss.z) - Math.min(2, boss.t) * 0.5;
      bossRig.root.rotation.z = Math.sin(boss.t) * 0.2;
      bossRig.update(dt, { moving: false, state: "dead", hit: 0 });
      ring.material.opacity = 0;
      return;
    }
    const dist = hypot2(player.x - boss.x, player.z - boss.z);
    if (!boss.active && circus && player.z > 106.5) {
      boss.active = true;
      boss.state = "intro";
      boss.t = 0;
      audio.roar();
      audio.setTension(1);
      speak("jang-boss");
      speak("tom-boss");
      events.push({ type: "boss" });
      events.push({ type: "bulletin", id: "boss" });
    }
    if (!boss.active) {
      bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);
      bossRig.root.rotation.y = boss.yaw;
      bossRig.update(dt, { moving: false, state: "idle", hit: 0 });
      return;
    }
    boss.t += dt;
    let moving = false;
    const face = Math.atan2(player.x - boss.x, player.z - boss.z);
    if (boss.state === "intro") {
      boss.yaw = dampAngle(boss.yaw, face, 4, dt);
      if (boss.t > 1.3) beginBoss("charge");
    } else if (boss.state === "chargeWind" || boss.state === "slamWind" || boss.state === "roarWind") {
      if (boss.state === "chargeWind") boss.yaw = boss.yaw;
      else boss.yaw = dampAngle(boss.yaw, face, 6, dt);
      const phase = bossPhase();
      const need = (boss.state === "roarWind" ? 0.95 : 0.75) * (phase === 3 ? 0.72 : phase === 2 ? 0.86 : 1);
      showRing(boss.state === "roarWind" ? 6.2 : boss.state === "slamWind" ? 4.3 : 3.4, boss.t / need);
      if (boss.t > need) {
        boss.state = boss.state.replace("Wind", "");
        boss.t = 0;
        boss.didHit = false;
        if (boss.state === "charge") audio.roar();
      }
    } else if (boss.state === "charge") {
      moving = true;
      const sp = bossPhase() === 3 ? 11 : bossPhase() === 2 ? 9.6 : 8.5;
      boss.x += Math.sin(boss.yaw) * sp * dt;
      boss.z += Math.cos(boss.yaw) * sp * dt;
      boss.x = clamp(boss.x, -12, 12);
      boss.z = clamp(boss.z, 106, 122);
      showRing(3.6, 1);
      const hitD = hypot2(player.x - boss.x, player.z - boss.z);
      if (!boss.didHit && hitD < boss.radius + 1.45) {
        boss.didHit = true;
        hurtPlayer(34, boss.x, boss.z, boss);
      }
      if (!boss.allyHit) {
        for (const a of allies) {
          if (hypot2(a.x - boss.x, a.z - boss.z) < boss.radius + 1.25) {
            boss.allyHit = true;
            hurtAlly(a, 16, boss.x, boss.z);
            break;
          }
        }
      }
      if (boss.t > 1.05) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "slam" || boss.state === "roar") {
      const rad = boss.state === "roar" ? 6.2 : 4.6;
      showRing(rad, 1);
      const hitD = hypot2(player.x - boss.x, player.z - boss.z);
      if (!boss.didHit && boss.t > 0.08 && hitD < rad) {
        boss.didHit = true;
        hurtPlayer(boss.state === "roar" ? 24 : 28, boss.x, boss.z, boss);
        for (const a of allies) {
          if (hypot2(a.x - boss.x, a.z - boss.z) < rad) hurtAlly(a, boss.state === "roar" ? 12 : 14, boss.x, boss.z);
        }
      }
      if (boss.t > 0.34) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "stagger") {
      ring.material.opacity = 0;
      if (boss.t > boss.stunFor) { boss.state = "recover"; boss.t = 0; }
    } else if (boss.state === "recover" || boss.state === "idle") {
      ring.material.opacity = Math.max(0, ring.material.opacity - dt * 2);
      if (boss.t > 0.62) {
        const phase = bossPhase();
        const cycle = phase === 1
          ? ["charge", "slam", "charge", "slam"]
          : phase === 2
            ? ["charge", "slam", "roar", "charge"]
            : ["roar", "charge", "slam", "roar", "charge"];
        let name = cycle[boss.pattern % cycle.length];
        boss.pattern++;
        if (name === "slam" && boss.hp < boss.hpMax * 0.5 && !flags.half) {
          flags.half = true;
          speak("tom-half");
        }
        beginBoss(name);
      }
    }
    const c = world.resolve(boss.x, boss.z, 1.2);
    boss.x = c.x;
    boss.z = clamp(c.z, 104, 123);
    bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);
    bossRig.root.rotation.y = boss.yaw;
    bossRig.root.visible = true;
    bossRig.update(dt, { moving, state: boss.state, hit: boss.hit });
  }

  function beginBoss(name) {
    boss.state = name + "Wind";
    boss.t = 0;
    boss.didHit = false;
    boss.allyHit = false;
    if (name === "charge") boss.yaw = Math.atan2(player.x - boss.x, player.z - boss.z);
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
    const wind = e.state === "tele";
    const k = wind ? Math.min(1, e.t / Math.max(0.2, e.prof.tele || 0.4)) : 1;
    e.tell.visible = true;
    e.tell.position.set(e.x, heightAt(e.x, e.z) + 0.08, e.z);
    e.tell.scale.setScalar(wind ? 0.35 + k * 1.7 : 1.75);
    e.tell.material.opacity = wind ? 0.28 + k * 0.62 : 0.9;
    e.tell.material.color.setHex(wind && k < 0.72 ? 0xffc56a : 0xff2a1c);
  }

  function showRing(radius, k) {
    ring.position.set(boss.x, heightAt(boss.x, boss.z) + 0.08, boss.z);
    const s = Math.max(0.2, radius * k);
    ring.scale.setScalar(s);
    ring.material.opacity = 0.15 + 0.45 * k;
    ring.material.color.set(boss.state.startsWith("roar") ? 0xd2c4ee : 0xe7c48a);
  }

  function separate(dt) {
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
    void dt;
  }

  function updateAllies(dt, camYaw) {
    if (!partyJoined) {
      for (const a of allies) {
        const dx = player.x - a.x;
        const dz = player.z - a.z;
        if (hypot2(dx, dz) < 9) a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 6, dt);
        const y = heightAt(a.x, a.z);
        a.rig.root.position.set(a.x, y, a.z);
        a.rig.root.rotation.y = a.yaw;
        a.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0, dodgeSide: 0 });
      }
      return;
    }
    allyHold = Math.max(0, allyHold - dt);
    for (const a of allies) {
      if (tutorialOn && tutorStep === "guard" && a.id === "tom") {
        if (a.anim !== "idle") {
          a.animT += dt / 0.4;
          if (a.animT >= 1) a.anim = "idle";
        }
        const y = heightAt(a.x, a.z);
        a.rig.root.position.set(a.x, y, a.z);
        a.rig.root.rotation.y = a.yaw;
        a.rig.update(dt, {
          speed: 0, air: false, action: a.anim, actionT: a.animT,
          combo: 0, look: 0, hurt: a.hurt, dodgeSide: 0,
        });
        continue;
      }
      const fx = Math.sin(player.yaw);
      const fz = Math.cos(player.yaw);
      const rx = Math.cos(player.yaw);
      const rz = -Math.sin(player.yaw);
      const tx = player.x - fx * a.back + rx * a.side;
      const tz = player.z - fz * a.back + rz * a.side;
      let dx = tx - a.x;
      let dz = tz - a.z;
      const d = hypot2(dx, dz);
      const speed = d > 5 ? 6.8 : 4.6;
      if (d > 0.2) {
        const step = Math.min(d, speed * dt);
        a.x += (dx / d) * step;
        a.z += (dz / d) * step;
      }
      const c = world.resolve(a.x, a.z, 0.35);
      a.x = c.x;
      a.z = c.z;
      const foe = nearest(a.x, a.z, 12);
      if (foe) a.yaw = dampAngle(a.yaw, Math.atan2(foe.x - a.x, foe.z - a.z), 8, dt);
      else if (d > 0.4) a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 8, dt);
      a.cd = Math.max(0, a.cd - dt);
      a.hurt = Math.max(0, a.hurt - dt);
      if (a.hp <= 0 && a.hurt <= 0) a.hp = Math.round(a.hpMax * 0.35);
      else if (a.hurt <= 0 && a.hp > 0 && a.hp < a.hpMax) a.hp = Math.min(a.hpMax, a.hp + dt * 1.6);
      if (a.anim !== "idle") {
        a.animT += dt / 0.4;
        if (a.animT >= 1) a.anim = "idle";
      }
      if (allyHold <= 0 && foe && player.hp > 0 && a.anim === "idle") {
        const fd = hypot2(foe.x - a.x, foe.z - a.z);
        if (a.id === "tom" && fd < 2.35 && a.cd <= 0) {
          a.cd = 3.3;
          a.anim = "shove";
          a.animT = 0;
          damageEnemy(foe, 15, a);
          if (foe.alive && foe.kind !== "boss") { foe.state = "stun"; foe.stunFor = 0.45; foe.t = 0; }
          if (!flags.tomFight) { flags.tomFight = true; speak("tom-fight"); }
        } else if (a.id === "jang" && fd < 11 && a.cd <= 0) {
          a.cd = 4;
          a.anim = "throw";
          a.animT = 0;
          const mesh = handbillMesh();
          scene.add(mesh);
          bills.push({ mesh, x: a.x, y: 1.3, z: a.z, foe, life: 0 });
        }
      }
      const y = heightAt(a.x, a.z);
      a.rig.root.position.set(a.x, y, a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, {
        speed: d > 0.3 ? Math.min(5, d) : 0,
        air: false,
        action: a.anim,
        actionT: a.animT,
        combo: 1,
        look: 0,
        hurt: 0,
        dodgeSide: 0,
      });
      void camYaw;
    }
    for (let i = bills.length - 1; i >= 0; i--) {
      const b = bills[i];
      b.life += dt;
      const target = b.foe && b.foe.alive ? b.foe : null;
      const tx = target ? target.x : b.x;
      const tz = target ? target.z : b.z + 0.5;
      const dx = tx - b.x;
      const dz = tz - b.z;
      const d = hypot2(dx, dz) || 0.001;
      b.x += (dx / d) * 13 * dt;
      b.z += (dz / d) * 13 * dt;
      b.y = 1.25 + Math.sin(b.life * 16) * 0.05;
      b.mesh.position.set(b.x, b.y, b.z);
      b.mesh.rotation.y += dt * 8;
      b.mesh.rotation.x = Math.sin(b.life * 10) * 0.4;
      if (target && d < 0.7) {
        damageEnemy(target, 7, { x: b.x, z: b.z });
        if (target.kind !== "boss") {
          target.state = "stun";
          target.t = 0;
          target.stunFor = 1.25;
        } else {
          target.hit = 1;
        }
        if (!flags.bill) { flags.bill = true; speak("jang-bill"); }
        scene.remove(b.mesh);
        bills.splice(i, 1);
      } else if (b.life > 1.6) {
        scene.remove(b.mesh);
        bills.splice(i, 1);
      }
    }
  }

  function tryChests() {
    for (const chest of world.chests) {
      const d = hypot2(chest.x - player.x, chest.z - player.z);
      if (!chest.open && d < CHEST_REACH) return chest;
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
    speak("jang-chest");
  }

  function armExit() {
    bossWall = false;
    outroArmed = false;
    outroT = 0;
    if (world.gate && world.gate.setReady) world.gate.setReady(true);
  }

  function gateEntered() {
    if (boss.alive) {
      gateSeen = false;
      gateWasIn = false;
      return false;
    }
    const inside = hypot2(player.x, player.z - GATE_Z) < GATE_REACH;
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
    flags.cleared = true;
    persist(true);
    events.push({ type: "gate" });
    speak("tom-gate");
  }

  function pageCount() {
    return world.pages.filter((p) => p.got).length;
  }

  function collectPage() {
    for (const p of world.pages) {
      if (p.got) continue;
      if (hypot2(p.x - player.x, p.z - player.z) < 1.45) {
        p.got = true;
        p.mesh.visible = false;
        audio.chest();
        if (!flags.paged) {
          flags.paged = true;
          speak("jang-page");
        }
        return { type: "page", id: p.id, n: pageCount() };
      }
    }
    return null;
  }

  function updateFloats(dt) {
    for (const w of world.floats) {
      if (w.floated) continue;
      if (!w.drift) {
        let dx = w.x - player.x;
        let dz = w.z - player.z;
        let d = hypot2(dx, dz) || 0.001;
        const min = 1.72;
        if (d < min) {
          const overlap = min - d;
          w.x += (dx / d) * overlap;
          w.z += (dz / d) * overlap;
          if (player.z < w.z + 0.4) w.z += Math.max(overlap * 0.65, 0.05);
          const half = halfWidth(w.z) - 1.4;
          w.x = clamp(w.x, -half, half);
          w.z = clamp(w.z, 94, 107);
          dx = w.x - player.x;
          dz = w.z - player.z;
          d = hypot2(dx, dz) || 0.001;
          player.x = w.x - (dx / d) * min;
          if (player.z > w.z - 0.35) player.z = w.z - 0.35;
        }
        if (w.z > 102.45) w.drift = true;
      } else {
        w.z = Math.min(112.2, w.z + dt * 2.6);
        w.x = damp(w.x, clamp(w.x, -5.5, 5.5), 2, dt);
        if (w.z >= 111.6) w.floated = true;
      }
      w.mesh.position.set(w.x, heightAt(w.x, w.z) + (w.drift ? 0.16 : 0), w.z);
      w.mesh.rotation.y = Math.atan2(player.x - w.x, 2);
    }
    if (!circus && world.floats.every((w) => w.floated)) {
      circus = true;
      speak("jang-circus");
      speak("tom-circus");
      events.push({ type: "circus" });
    }
  }

  function checkRope() {
    const bob = world.rope;
    if (!bob || !bob.low) return;
    let any = false;
    for (const e of enemies) {
      if (!e.alive || !e.pendulum) continue;
      if (hypot2(e.x - bob.x, e.z - bob.z) > 1.6) continue;
      e.hp = 0;
      e.alive = false;
      e.state = "dead";
      e.t = 0;
      e.routed = true;
      e.x += Math.sign(e.x - bob.x || 1) * 1.4;
      e.z += 0.8;
      dropLoot(e);
      grantXp(12);
      any = true;
    }
    if (any) {
      audio.hit();
      if (!flags.rout) {
        flags.rout = true;
        speak("tom-rout");
        speak("jang-rout");
        events.push({ type: "rout" });
      }
    }
  }

  function settleCircus() {
    circus = true;
    for (const w of world.floats) {
      w.drift = true;
      w.floated = true;
      w.z = 112;
      w.mesh.position.set(w.x, heightAt(w.x, 112) + 0.22, 112);
    }
  }

  let outroT = -1;
  let outroArmed = true;
  let playTime = 0;

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
    if (player.hitStop > 0) {
      player.hitStop = Math.max(0, player.hitStop - dt);
      return snapshot(camYaw, lastPrompt, lastObjective);
    }
    const edge = input.pull();
    const axes = input.axes();
    playTime += dt;
    if (!flags.g1 && partyJoined && !tutorialOn) { flags.g1 = true; speak("jang-greet"); }
    if (!flags.g2 && partyJoined && !tutorialOn && playTime > 3.8) { flags.g2 = true; speak("tom-greet"); }
    player.flashCd = Math.max(0, player.flashCd - dt);
    player.magicLock = Math.max(0, player.magicLock - dt);
    player.spellCd = Math.max(0, player.spellCd - dt);
    player.iframes = Math.max(0, player.iframes - dt);
    player.hurt = Math.max(0, player.hurt - dt * 2);
    lassoCd = Math.max(0, lassoCd - dt);
    updateArenas();

    const mag = clamp(Math.hypot(axes.fwd, axes.strafe), 0, 1);
    let wishX = 0;
    let wishZ = 0;
    if (mag > 0.05) {
      const nx = axes.strafe / mag;
      const nz = axes.fwd / mag;
      // Screen-right is (-cos(yaw), sin(yaw)) with this orbit. Positive strafe must use that, not its opposite.
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
        player.action = player.action === "guard" ? "idle" : player.action;
        audio.jump();
      } else if (player.jumps < 2) {
        player.vy = 11.4;
        player.jumps = 2;
        audio.jump();
      }
    }
    if (edge.potion) drink();
    if (edge.lock) toggleLock();
    if (edge.recenter) {
      events.push({ type: "recenter" });
      tutorRecenter = true;
    }
    if (edge.jump) tutorJumped = true;
    if (edge.dodge) tutorDodged = true;
    if (edge.cycle) cycleLock(1);
    if (edge.devil) startDevil();
    if (edge.mend) startMend();
    if (edge.special) startTeam();
    if (edge.lasso || edge.steam || edge.pulse) {
      const id = edge.pulse ? "pulse" : edge.steam ? "steam" : "lasso";
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
    } else if (player.action === "guard") {
      player.action = "idle";
    }

    let speedMul = player.action === "guard" ? 3.1 : 8.7;
    if (player.action === "attack") speedMul = 5.4;
    if (player.action === "team") speedMul = 3.2;
    if (player.z > 109 && player.z < 121) speedMul *= 0.9;
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
    const resolved = world.resolve(player.x, player.z, 0.38, boss.alive && boss.active ? [{ x: boss.x, z: boss.z, r: 1.15 }] : null, player.y);
    player.x = resolved.x;
    player.z = resolved.z;
    if (!circus && player.z > 103.2) player.z = 103.2;
    if (bossWall && boss.alive && player.z > 123) player.z = 123;
    if (tutorialOn && player.z > 5.8) player.z = 5.8;
    clampArenas();

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
      /* yaw snapped at the start */
    } else if (lockTarget && lockTarget.alive) {
      player.yaw = dampAngle(player.yaw, Math.atan2(lockTarget.x - player.x, lockTarget.z - player.z), 5, dt);
    } else if (moving && player.action !== "guard") {
      player.yaw = dampAngle(player.yaw, Math.atan2(player.vx, player.vz), 5, dt);
    }

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
            damageEnemy(e, table[player.combo - 1] || 12, null, { knock: finisher ? (e.kind === "boss" ? 0.8 : 2.6) : 0 });
            playerHits++;
          }
        }
      }
      if (player.action === "team" && !player.teamHit && player.actionT > 0.4) {
        player.teamHit = true;
        audio.finisher();
        events.push({ type: "hit", heavy: true });
        for (const e of living()) {
          if (hypot2(e.x - player.x, e.z - player.z) < 3.6) {
            damageEnemy(e, 26, { id: "team" }, { knock: e.kind === "boss" ? 0.5 : 2.2 });
            playerHits++;
          }
        }
      }
      if (player.actionT >= 1) {
        const nextMax = (player.airCombo > 0 || !player.grounded) ? 3 : 4;
        if (player.action === "attack" && player.comboQueue && player.combo < nextMax) startAttack(player.combo + 1);
        else { player.action = "idle"; player.combo = 0; player.airCombo = 0; player.comboQueue = false; player.teamHit = false; }
      }
    }

    for (const e of enemies) updateEnemy(e, dt);
    updateBoss(dt);
    separate(dt);
    updateAllies(dt, camYaw);
    updateOrbs(dt);
    if (gustT > 0) {
      gustT = Math.max(0, gustT - dt);
      gust.position.set(player.x, player.y + 0.08, player.z);
      gust.scale.setScalar(1 + (1 - gustT / 0.48) * 8);
      gust.material.opacity = gustT * 1.3;
    } else gust.material.opacity = 0;

    for (const chest of world.chests) {
      const target = chest.open ? -1.2 : 0;
      chest.lid.rotation.x = damp(chest.lid.rotation.x, target, chest.open ? 14 : 8, dt);
      if (chest.mesh) {
        const pop = chest.open ? Math.max(0, Math.sin(Math.min(1, -chest.lid.rotation.x / 1.2) * Math.PI) * 0.07) : 0;
        chest.mesh.position.y = heightAt(chest.x, chest.z) + pop;
      }
    }

    updateFloats(dt);
    checkRope();
    const pageEv = collectPage();
    if (pageEv) events.push(pageEv);
    if (!flags.ford && !circus && player.z > 92) {
      flags.ford = true;
      speak("jang-ford");
      events.push({ type: "bulletin", id: "scene-circus" });
    }
    if (!flags.rope && player.z > 72 && player.z < 90) {
      flags.rope = true;
      speak("jang-rope");
      events.push({ type: "bulletin", id: "scene-rope" });
    }

    const chest = tryChests();
    let prompt = null;
    if (chest) prompt = { id: "chest", label: "OPEN" };
    if (world.radio && hypot2(world.radio.x - player.x, world.radio.z - player.z) < 2.4) {
      prompt = { id: "save", label: "SAVE" };
    }
    const gateD = hypot2(player.x, player.z - GATE_Z);
    const gateNear = !boss.alive && gateD < GATE_REACH;
    if (gateNear) {
      prompt = { id: "gate", label: "STEP THROUGH" };
      if (!flags.gateLine) { flags.gateLine = true; speak("jang-gate"); }
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

    const speed = hypot2(player.vx, player.vz);
    const step = keeper.update(dt, {
      speed,
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
    if (keeper.glow) {
      const ready = 1 - player.flashCd / player.flashMax;
      keeper.glow.scale.setScalar(0.8 + ready * 0.5);
    }
    if (step && step.step && player.grounded) audio.step();

    updateTutorial(dt, camYaw, edge);

    let objective = tutorialOn ? "Learn the road" : "Follow the trail";
    if (!flags.rout && player.z > 70 && player.z < 92 && boss.alive) objective = "Rope the bandits";
    if (!circus && player.z > 90) objective = "Float the wagons";
    if (circus && boss.alive && !boss.active) objective = "Bear at the ford";
    if (boss.active && boss.alive) objective = "Break the bear";
    if (!boss.alive) objective = "Step through";
    const here = arenas.find((a) => a.active && !a.cleared);
    if (here && (objective === "Follow the trail" || objective.startsWith("Pages"))) objective = "Clear the fog";

    lastPrompt = reaction || prompt;
    lastObjective = objective;
    return snapshot(camYaw, lastPrompt, objective);
  }

  let lockTarget = null;
  function findLock() {
    if (lockTarget && !lockTarget.alive) lockTarget = null;
    return lockTarget;
  }
  function toggleLock() {
    if (lockTarget && lockTarget.alive) { lockTarget = null; return; }
    lockTarget = nearest(player.x, player.z, 18, true);
  }

  function cycleLock(dir) {
    const list = living().filter((e) => hypot2(e.x - player.x, e.z - player.z) < 20);
    if (!list.length) { lockTarget = null; return; }
    if (!lockTarget || !lockTarget.alive) { lockTarget = list[0]; return; }
    let i = list.findIndex((e) => e.id === lockTarget.id);
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
    if (mag > 0.2) player.dodgeYaw = Math.atan2(wx, wz);
    else player.dodgeYaw = camYaw + Math.PI;
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
    player.flashCd = 0.4;
    audio.flash();
    events.push({ type: "flash", x: player.x, z: player.z });
    if (world.town && hypot2(world.town.barn.x - player.x, world.town.barn.z - player.z) < 7) {
      world.town.lightBarn();
      tutorFlashed = true;
    }
    for (const e of living()) {
      const d = hypot2(e.x - player.x, e.z - player.z);
      const aimedHit = aimed && e.id === aimed.id;
      const rad = aimedHit ? 13 : (e.kind === "boss" ? 5.2 : 4.3);
      if (d < rad) {
        const dmg = e.kind === "boss" ? 36 : (e.prof ? e.prof.flash : 16);
        damageEnemy(e, dmg);
        if (e.alive && e.kind === "boss") {
          e.state = "stagger";
          e.t = 0;
          e.stunFor = 0.85;
        } else if (e.alive) {
          e.state = "stun";
          e.t = 0;
          e.stunFor = 1.35;
        }
        playerHits++;
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
    gustT = 0.48;
    audio.wind();
    for (const e of living()) {
      const dx = e.x - player.x;
      const dz = e.z - player.z;
      const d = hypot2(dx, dz);
      if ((!(aimed && e.id === aimed.id) && d > 5.4) || d < 0.05) continue;
      damageEnemy(e, e.kind === "boss" ? 16 : 13);
      const push = e.kind === "boss" ? 0.45 : 2.2;
      e.x += (dx / d) * push;
      e.z += (dz / d) * push;
      if (e.alive && e.kind !== "boss") { e.state = "stun"; e.t = 0; e.stunFor = 0.55; }
      playerHits++;
    }
  }

  function startMend() {
    if (player.action === "dodge") return;
    if (player.hp >= player.hpMax && allies.every((a) => a.hp >= a.hpMax)) return;
    if (!spend(30)) return;
    tutorMended = true;
    player.hp = Math.min(player.hpMax, player.hp + 36);
    for (const a of allies) a.hp = Math.min(a.hpMax, a.hp + 22);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "+HP" });
  }

  function startTeam() {
    if (player.team < 100 || player.hp <= 0) return;
    if (player.action === "dodge") return;
    player.team = 0;
    player.action = "team";
    player.actionT = 0;
    player.actionDur = 0.86;
    player.teamHit = false;
    player.vy = 11;
    player.grounded = false;
    player.jumps = 2;
    audio.swing();
    speak("tom-toss");
    const tgt = aimTarget();
    if (tgt) player.yaw = Math.atan2(tgt.x - player.x, tgt.z - player.z);
    for (let i = 0; i < 5; i++) {
      const mesh = handbillMesh();
      scene.add(mesh);
      const yaw = player.yaw + (i - 2) * 0.28;
      bills.push({
        mesh, x: allies[0].x, y: 1.35, z: allies[0].z, foe: tgt, life: 0,
        vx: Math.sin(yaw) * 4, vz: Math.cos(yaw) * 4,
      });
    }
  }

  function drink() {
    if (player.potions <= 0 || player.hp >= player.hpMax) return;
    player.potions -= 1;
    tutorDrank = true;
    player.hp = Math.min(player.hpMax, player.hp + 42);
    audio.heal();
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "+HP" });
  }

  function bossPhase() {
    const r = boss.hp / boss.hpMax;
    if (r > 0.66) return 1;
    if (r > 0.33) return 2;
    return 3;
  }

  function pickReaction() {
    if (boss.active && boss.alive && boss.state === "chargeWind" && lassoCd <= 0 && boss.t > 0.08 && boss.t < 0.62) {
      return { id: "lasso", label: "Lasso!" };
    }
    if (!circus) {
      for (const w of world.floats) {
        if (w.floated || w.drift) continue;
        if (player.z > 94 && hypot2(w.x - player.x, w.z - player.z) < 2.15) return { id: "wagon", label: "Hold the wagon!" };
      }
    }
    return null;
  }

  function fireReaction() {
    if (!reaction) return false;
    if (reaction.id === "lasso" && boss.alive) {
      lassoCd = 7;
      boss.state = "stagger";
      boss.t = 0;
      boss.stunFor = 1.35;
      damageEnemy(boss, 46, null, { knock: 0.2 });
      playerHits++;
      audio.parry();
      events.push({ type: "hit", heavy: true });
      speak("jang-lasso");
      reaction = null;
      return true;
    }
    if (reaction.id === "wagon") {
      for (const w of world.floats) {
        if (!w.floated && hypot2(w.x - player.x, w.z - player.z) < 2.4) w.z = Math.min(106.5, w.z + 1.6);
      }
      audio.swing();
      speak("jang-ford");
      return true;
    }
    return false;
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
      if (!flags.levelTalk) { flags.levelTalk = true; speak("jang-level"); }
    }
  }

  function dropLoot(e) {
    const kinds = e.kind === "boss"
      ? [["hp", 16], ["hp", 16], ["mp", 14], ["mp", 14], ["coin", 5], ["coin", 5], ["coin", 5], ["coin", 5]]
      : [["hp", 10], ["mp", 8], ["coin", 2], ["coin", 1]];
    for (const [kind, n] of kinds) {
      const color = kind === "hp" ? 0x9dbe74 : kind === "mp" ? 0x8eb4d4 : 0xe4c56a;
      const mesh = new THREE.Mesh(orbGeo, new THREE.MeshBasicMaterial({ color }));
      const ang = Math.random() * Math.PI * 2;
      const dist = 0.35 + Math.random() * 0.7;
      scene.add(mesh);
      orbs.push({
        kind, n, mesh, age: 0, vy: 3.2,
        x: e.x + Math.cos(ang) * dist,
        z: e.z + Math.sin(ang) * dist,
        y: 0.8,
      });
    }
  }

  function updateOrbs(dt) {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.age += dt;
      o.vy -= 8 * dt;
      o.y = Math.max(0.32, o.y + o.vy * dt);
      const dx = player.x - o.x;
      const dz = player.z - o.z;
      const d = hypot2(dx, dz) || 0.001;
      if (o.age > 0.28 && d < 6.8) {
        const pull = d < 1.8 ? 18 : 8;
        o.x += (dx / d) * pull * dt;
        o.z += (dz / d) * pull * dt;
      }
      if (d < 0.8 && o.age > 0.15) {
        if (o.kind === "hp") player.hp = Math.min(player.hpMax, player.hp + o.n);
        else if (o.kind === "mp") player.mp = Math.min(player.mpMax, player.mp + o.n);
        else { player.coins += o.n; audio.coin(); }
        scene.remove(o.mesh);
        orbs.splice(i, 1);
        continue;
      }
      o.mesh.position.set(o.x, heightAt(o.x, o.z) + o.y + Math.sin(o.age * 7) * 0.06, o.z);
    }
  }

  function portalMesh(x, z) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 22),
      new THREE.MeshBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, heightAt(x, z) + 0.06, z);
    scene.add(mesh);
    return mesh;
  }

  function beginWave(arena) {
    const wave = arena.waves[arena.wave];
    if (!wave) return;
    for (const s of wave) {
      const e = makeEnemy(s.kind, s.x, s.z, !!s.pendulum);
      e.arena = arena.id;
      e.rise = 0.55;
      e.portal = portalMesh(s.x, s.z);
      enemies.push(e);
    }
    arena.active = true;
    audio.staticBurst();
    events.push({ type: "wave", id: arena.id, n: arena.wave + 1 });
  }

  function arenaLiving(id) {
    return enemies.some((e) => e.alive && e.arena === id);
  }

  function updateArenas() {
    for (const a of arenas) {
      if (a.cleared) continue;
      const inside = player.z >= a.minZ && player.z <= a.maxZ;
      if (!a.active && inside) beginWave(a);
      if (!a.active) continue;
      if (arenaLiving(a.id)) continue;
      if (a.wave + 1 < a.waves.length) {
        a.wave += 1;
        beginWave(a);
      } else {
        a.cleared = true;
        a.active = false;
      }
    }
  }

  function clampArenas() {
    for (const a of arenas) {
      if (!a.active || a.cleared) continue;
      if (player.z < a.minZ - 2 || player.z > a.maxZ + 2) continue;
      player.z = clamp(player.z, a.minZ + 0.8, a.maxZ - 0.8);
    }
  }

  function wipeEnemies() {
    for (const e of enemies) {
      if (e.kind === "dummy") {
        e.alive = false;
        e.rig.root.visible = false;
        continue;
      }
      scene.remove(e.rig.root);
      if (e.portal) scene.remove(e.portal);
    }
    enemies.length = 0;
    for (const o of orbs) scene.remove(o.mesh);
    orbs.length = 0;
    for (const a of arenas) {
      a.wave = 0;
      a.active = false;
      a.cleared = false;
    }
  }

  function saveData(complete) {
    return {
      v: 1,
      x: player.x, z: player.z, yaw: player.yaw,
      hp: player.hp, hpMax: player.hpMax, mp: player.mp, mpMax: player.mpMax,
      coins: player.coins, potions: player.potions,
      level: player.level, xp: player.xp, xpNext: player.xpNext, str: player.str,
      pages: world.pages.filter((p) => p.got).map((p) => p.id),
      circus, bossDead: !boss.alive,
      arenas: arenas.filter((a) => a.cleared).map((a) => a.id),
      chests: world.chests.map((c) => !!c.open),
      complete: !!(complete || flags.cleared),
    };
  }

  function persist(complete) {
    if (complete) flags.cleared = true;
    const data = saveData(!!complete || !!flags.cleared);
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* private mode */ }
    if (data.complete) {
      try { localStorage.setItem(CLEAR_KEY, "1"); } catch { /* private mode */ }
    }
  }

  function writeSave() {
    player.hp = player.hpMax;
    player.mp = player.mpMax;
    for (const a of allies) a.hp = a.hpMax;
    persist(false);
    audio.heal();
    tutorSaved = true;
    events.push({ type: "save" });
    events.push({ type: "dmg", x: player.x, y: 1.8, z: player.z, n: "Saved" });
    speak("jang-save");
  }

  function applySave(data) {
    player.x = data.x;
    player.z = data.z;
    player.y = heightAt(data.x, data.z);
    player.yaw = data.yaw || 0;
    player.hpMax = data.hpMax || player.hpMax;
    player.mpMax = data.mpMax || player.mpMax;
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
    if (data.circus) settleCircus();
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
    const cleared = new Set(data.arenas || []);
    for (const a of arenas) if (cleared.has(a.id)) a.cleared = true;
    (data.chests || []).forEach((open, i) => {
      if (open && world.chests[i]) {
        world.chests[i].open = true;
        world.chests[i].lid.rotation.x = -1.15;
      }
    });
    const progressed = player.z > 8
      || (data.pages && data.pages.length)
      || data.circus
      || data.bossDead
      || (data.arenas && data.arenas.length)
      || (data.chests && data.chests.some(Boolean))
      || (data.level && data.level > 1);
    if (!tutorialOn || progressed) finishTutorial(false);
    else resumeAtFog();
  }

  function idlePresentation(dt) {
    player.y = heightAt(player.x, player.z);
    keeper.root.position.set(player.x, player.y, player.z);
    keeper.root.rotation.y = player.yaw;
    keeper.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0.2, dodgeSide: 0 });
    for (const a of allies) {
      a.rig.root.position.set(a.x, heightAt(a.x, a.z), a.z);
      a.rig.root.rotation.y = a.yaw;
      a.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, look: 0, dodgeSide: 0 });
    }
    for (const e of enemies) {
      e.y = heightAt(e.x, e.z);
      e.rig.root.position.set(e.x, e.y, e.z);
      e.rig.update(dt, { speed: 0, action: "idle", actionT: 0, combo: 0, air: false, hurt: 0, tele: false, strike: false, hit: 0 });
    }
    bossRig.root.position.set(boss.x, heightAt(boss.x, boss.z), boss.z);
    bossRig.root.rotation.y = boss.yaw;
    bossRig.update(dt, { moving: false, state: "idle", hit: 0 });
  }

  function colorDrain() {
    let drain = 0;
    const sources = enemies.filter((e) => e.alive && e.kind !== "dummy");
    if (boss.alive) sources.push(boss);
    for (const e of sources) {
      const d = hypot2(e.x - player.x, e.z - player.z);
      const inner = e.kind === "boss" ? worldBoss.drain.inner : e.kind === "blanker" ? 5.5 : 3.4;
      const outer = e.kind === "boss" ? worldBoss.drain.outer : inner + 5;
      const t = d <= inner ? 1 : clamp(1 - (d - inner) / (outer - inner), 0, 1);
      drain = Math.max(drain, t);
    }
    return drain;
  }

  const LESSONS = {
    move: {
      line: "tutor-move",
      text: "The road is quiet. Walk it, look around, then put the view back behind you.",
      hintKey: "Move · look · C",
      hintTouch: "Move · look · Cam",
    },
    obstacles: {
      line: "tutor-obstacles",
      text: "Jump the logs. Dodge is the step around a rock that will not move.",
      hintKey: "Space jump · Shift dodge",
      hintTouch: "Tap JUMP · DODGE",
    },
    party: {
      line: "tutor-party",
      text: "Two men by the wagons have a story and no guide. Walk over.",
      hintKey: "Walk to Jang and Tom",
      hintTouch: "Walk to Jang and Tom",
    },
    key: {
      line: "tutor-key",
      text: "The trail key is on the crate. It is a saber if you pick it up.",
      hintKey: "Take the key",
      hintTouch: "Take the key",
    },
    combo: {
      line: "tutor-combo",
      text: "The hay is a patient opponent. Land a three-hit combo.",
      hintKey: "J J J",
      hintTouch: "Tap ATTACK",
    },
    lock: {
      line: "tutor-lock",
      text: "Choose one bale and keep it. Lock on, then look away. It stays chosen.",
      hintKey: "L lock",
      hintTouch: "Tap LOCK",
    },
    guard: {
      line: "tutor-guard",
      text: "Tom swings like a lesson. Guard it. A quick guard is a parry.",
      hintKey: "Hold G",
      hintTouch: "Hold GUARD",
    },
    magic: {
      line: "tutor-magic",
      text: "The barn is dark. Open Commands, then Magic, then Lantern Flash.",
      hintKey: "Open Commands",
      hintTouch: "Tap COMMANDS",
    },
    save: {
      line: "tutor-save",
      text: "The radio at the edge of camp remembers the set.",
      hintKey: "E at the radio",
      hintTouch: "Tap SAVE",
    },
    fog: {
      line: "tutor-fog",
      text: "Three small fogs at the edge of town. The canyon stays shut until they go.",
      hintKey: "J attack",
      hintTouch: "Tap ATTACK",
    },
  };

  function tutorBanner() {
    if (!tutorialOn || tutorStep === "done" || !LESSONS[tutorStep]) return null;
    const lesson = LESSONS[tutorStep];
    let hintKey = lesson.hintKey;
    let hintTouch = lesson.hintTouch;
    if (tutorStep === "move") {
      const bits = [];
      if (tutorMoved < 3) bits.push("Move");
      if (!tutorLooked) bits.push("Look");
      if (!tutorRecenter) bits.push("Cam");
      if (bits.length && bits.length < 3) {
        hintKey = bits.join(" · ");
        hintTouch = bits.join(" · ");
      }
    } else if (tutorStep === "magic" && tutorMagic === 1) {
      hintKey = "3 · Trail Mend";
      hintTouch = "Tap TRAIL MEND";
    } else if (tutorStep === "magic" && tutorMagic === 2) {
      hintKey = "1 · Tonic";
      hintTouch = "Tap TONIC";
    }
    return {
      step: tutorStep,
      text: "",
      hintKey,
      hintTouch,
      act: tutorStep === "save" && world.radio && hypot2(world.radio.x - player.x, world.radio.z - player.z) < 2.2 ? "Save" : null,
    };
  }

  function sayLesson(id) {
    if (tutorSaid === id) return;
    tutorSaid = id;
    events.push({ type: "bulletin", id });
  }

  function spawnDummies() {
    if (!world.town) return;
    for (const d of world.town.dummies) {
      if (enemies.some((e) => e.dummyRef === d)) continue;
      d.root.visible = true;
      d.root.rotation.set(0, Math.PI, 0);
      d.root.position.set(d.x, heightAt(d.x, d.z), d.z);
      enemies.push({
        id: "e" + (seq++), kind: "dummy", dummyRef: d, rig: { root: d.root, update() { return { step: false }; }, skinned: false },
        prof: { hp: 80, radius: 0.6, speed: 0, tele: 9, lunge: 0, reach: 0, dmg: 0, xp: 2, flash: 0 },
        x: d.x, z: d.z, yaw: Math.PI, y: 0,
        hp: 80, hpMax: 80, radius: 0.6,
        state: "idle", t: 0, alive: true, hit: 0, didHit: false,
        speed: 0, stunFor: 0, homeX: d.x, homeZ: d.z, pendulum: false, routed: false,
        rise: 0, arena: null, portal: null,
      });
    }
  }

  function clearLessonFoes() {
    for (const e of enemies) {
      if (e.kind === "dummy") {
        e.alive = false;
        e.rig.root.visible = false;
        continue;
      }
      if (!e.tutorial) continue;
      e.alive = false;
      e.rig.root.visible = false;
      scene.remove(e.rig.root);
      if (e.portal) scene.remove(e.portal);
    }
  }

  function finishTutorial(announce) {
    const was = tutorialOn;
    tutorialOn = false;
    tutorStep = "done";
    partyJoined = true;
    keeper.setKey(true);
    if (world.town) {
      world.town.open();
      if (world.town.key) world.town.key.visible = false;
    }
    clearLessonFoes();
    try { localStorage.setItem(TUTOR_KEY, "1"); } catch { /* private mode */ }
    if (announce && was && !flags.enterSaid) {
      flags.enterSaid = true;
      events.push({ type: "bulletin", id: "enter" });
    }
  }

  function advanceTutor(next) {
    tutorStep = next;
    tutorSaid = "";
    stepCam = 0;
    if (next === "obstacles") {
      tutorJumped = false;
      tutorDodged = false;
    }
    if (next === "combo") tutorCombo = false;
    if (next === "lock") {
      tutorLocked = false;
      lockTarget = null;
    }
    if (next === "guard") tutorGuarded = false;
    if (next === "magic") {
      tutorMagic = 0;
      tutorFlashed = false;
      tutorMended = false;
      tutorDrank = false;
    }
    if (next === "save") tutorSaved = false;
    if (next === "fog") {
      allyHold = 3.2;
      const spots = [[-1.5, 0.4], [1.6, 1.1], [0.2, 2.4]];
      for (const [x, z] of spots) {
        const e = makeEnemy("fog", x, z);
        e.tutorial = true;
        e.hp = e.hpMax = 16;
        e.prof = { ...e.prof, hp: 16, dmg: 4, speed: 1.7, xp: 6 };
        enemies.push(e);
      }
    }
    if (next === "done") finishTutorial(true);
  }

  function skipLesson() {
    if (!tutorialOn) return;
    const order = ["move", "obstacles", "party", "key", "combo", "lock", "guard", "magic", "save", "fog"];
    const i = order.indexOf(tutorStep);
    if (tutorStep === "party") joinParty();
    if (tutorStep === "key") {
      keeper.setKey(true);
      if (world.town) world.town.key.visible = false;
    }
    if (tutorStep === "fog" || i < 0 || i === order.length - 1) {
      finishTutorial(true);
      return;
    }
    advanceTutor(order[i + 1]);
  }

  function joinParty() {
    if (partyJoined) return;
    partyJoined = true;
    flags.g1 = true;
    flags.g2 = true;
    speak("jang-meet");
    partyTomT = 3.4;
  }

  function updateTutorial(dt, camYaw, edge) {
    if (partyTomT > 0) {
      partyTomT -= dt;
      if (partyTomT <= 0) speak("tom-meet");
    }
    if (!tutorialOn) return;
    if (player.hp < 28 && tutorStep !== "fog") player.hp = 60;
    const lesson = LESSONS[tutorStep];
    if (lesson && !(tutorStep === "magic" && tutorMagic > 0)) sayLesson(lesson.line);
    const dx = player.x - (updateTutorial.px || player.x);
    const dz = player.z - (updateTutorial.pz || player.z);
    tutorMoved += Math.hypot(dx, dz);
    updateTutorial.px = player.x;
    updateTutorial.pz = player.z;
    if (!stepCam) stepCam = camYaw;
    const turn = Math.atan2(Math.sin(camYaw - stepCam), Math.cos(camYaw - stepCam));
    if (Math.abs(turn) > 0.45) tutorLooked = true;
    if (lockTarget && lockTarget.alive && lockTarget.kind === "dummy") tutorLocked = true;

    if (tutorStep === "move" && tutorMoved > 3 && tutorLooked && tutorRecenter) advanceTutor("obstacles");
    else if (tutorStep === "obstacles" && tutorJumped && tutorDodged) advanceTutor("party");
    else if (tutorStep === "party") {
      const near = allies.some((a) => hypot2(a.x - player.x, a.z - player.z) < 3.3);
      if (near) {
        joinParty();
        advanceTutor("key");
      }
    } else if (tutorStep === "key") {
      const k = world.town && world.town.key;
      if (k && hypot2(k.position.x - player.x, k.position.z - player.z) < 1.35) {
        k.visible = false;
        keeper.setKey(true);
        advanceTutor("combo");
      }
    } else if (tutorStep === "combo" && tutorCombo) advanceTutor("lock");
    else if (tutorStep === "lock" && tutorLocked) advanceTutor("guard");
    else if (tutorStep === "guard") {
      const tom = allies[1];
      const fx = Math.sin(player.yaw);
      const fz = Math.cos(player.yaw);
      tom.x = damp(tom.x, player.x + fx * 1.9, 8, dt);
      tom.z = damp(tom.z, player.z + fz * 1.9, 8, dt);
      const placed = world.resolve(tom.x, tom.z, 0.35);
      tom.x = placed.x;
      tom.z = placed.z;
      tom.yaw = Math.atan2(player.x - tom.x, player.z - tom.z);
      const dist = hypot2(tom.x - player.x, tom.z - player.z);
      practiceT -= dt;
      if (practiceHit > 0) {
        practiceHit -= dt;
        if (practiceHit <= 0 && dist < 2.7) hurtPlayer(4, tom.x, tom.z, { kind: "practice", alive: false });
      } else if (practiceT <= 0 && dist < 4.2) {
        practiceT = 2.6;
        practiceHit = 0.45;
        tom.anim = "shove";
        tom.animT = 0;
      }
      if (tutorGuarded) advanceTutor("magic");
    } else if (tutorStep === "magic") {
      if (tutorMagic === 0 && tutorFlashed) {
        tutorMagic = 1;
        if (player.hp > 68) player.hp = 62;
        if (player.mp < 40) player.mp = 40;
        events.push({ type: "bulletin", id: "tutor-mend" });
        tutorSaid = "tutor-mend";
      } else if (tutorMagic === 1 && tutorMended) {
        tutorMagic = 2;
        if (player.potions < 1) player.potions = 1;
        if (player.hp > 70) player.hp = 64;
        events.push({ type: "bulletin", id: "tutor-tonic" });
        tutorSaid = "tutor-tonic";
      } else if (tutorMagic === 2 && tutorDrank) advanceTutor("save");
    } else if (tutorStep === "save" && tutorSaved) advanceTutor("fog");
    else if (tutorStep === "fog") {
      const left = enemies.some((e) => e.tutorial && e.alive);
      if (!left && enemies.some((e) => e.tutorial)) finishTutorial(true);
    }
    if (tutorStep === "save" && edge && edge.use && world.radio && hypot2(world.radio.x - player.x, world.radio.z - player.z) < 1.8) {
      /* writeSave already runs from the prompt handler before this */
    }
    void edge;
  }

  function resetTutorFlags() {
    tutorSaid = "";
    tutorMoved = 0;
    tutorLooked = false;
    tutorRecenter = false;
    tutorJumped = false;
    tutorDodged = false;
    tutorCombo = false;
    tutorLocked = false;
    tutorGuarded = false;
    tutorFlashed = false;
    tutorMended = false;
    tutorDrank = false;
    tutorSaved = false;
    tutorMagic = 0;
    practiceT = 1.2;
    practiceHit = 0;
    partyTomT = 0;
    stepCam = 0;
    updateTutorial.px = undefined;
    updateTutorial.pz = undefined;
  }

  function parkAllies(spots) {
    allies.forEach((a, i) => {
      const s = spots[i];
      a.x = s.x;
      a.z = s.z;
      a.yaw = s.yaw;
      a.cd = 1.2;
      a.anim = "idle";
      a.animT = 0;
      a.hp = a.hpMax;
      a.hurt = 0;
    });
  }

  function settleOpening() {
    resetTutorFlags();
    if (tutorialCleared()) {
      tutorialOn = false;
      tutorStep = "done";
      partyJoined = true;
      keeper.setKey(true);
      if (world.town) {
        world.town.open();
        if (world.town.key) world.town.key.visible = false;
        for (const d of world.town.dummies) d.root.visible = false;
      }
      return;
    }
    tutorialOn = true;
    partyJoined = false;
    tutorStep = "move";
    player.x = 0;
    player.z = -50;
    player.y = heightAt(0, -50);
    player.yaw = 0;
    player.vx = player.vz = player.vy = 0;
    keeper.setKey(false);
    parkAllies([MEET.jang, MEET.tom]);
    if (world.town) {
      world.town.close();
      if (world.town.key) world.town.key.visible = true;
    }
    spawnDummies();
  }

  function resumeAtFog() {
    partyJoined = true;
    keeper.setKey(true);
    if (world.town && world.town.key) world.town.key.visible = false;
    clearLessonFoes();
    advanceTutor("fog");
  }

  function tutorSave() {
    if (!tutorialOn || tutorStep !== "save") return false;
    if (!world.radio || hypot2(world.radio.x - player.x, world.radio.z - player.z) > 2.2) return false;
    writeSave();
    return true;
  }

  function snapshot(camYaw, prompt, objective) {
    const head = (rig, x, y, z) => ({ x, y: y + 1.85, z });
    return {
      player: {
        x: player.x, y: player.y, z: player.z, yaw: player.yaw, hp: player.hp, hpMax: player.hpMax,
        mp: player.mp, mpMax: player.mpMax,
        spell: player.spellMax > 0 ? 1 - player.spellCd / player.spellMax : 1,
        coins: player.coins, potions: player.potions,
        flash: player.mp / player.mpMax,
        combo: player.action === "attack" ? player.combo : 0,
        hits: playerHits,
        level: player.level, xp: player.xp, xpNext: player.xpNext, team: player.team,
        action: player.action, guarding: player.action === "guard",
        speed: Math.hypot(player.vx, player.vz),
      },
      party: allies.map((a) => ({ id: a.id, name: a.name, hp: a.hp, hpMax: a.hpMax })),
      reaction: reaction ? { id: reaction.id, label: reaction.label } : null,
      heads: {
        keeper: head(keeper, player.x, player.y, player.z),
        jang: { x: allies[0].x, y: heightAt(allies[0].x, allies[0].z) + 1.7, z: allies[0].z },
        tom: { x: allies[1].x, y: heightAt(allies[1].x, allies[1].z) + 2.05, z: allies[1].z },
      },
      enemies: enemies.filter((e) => e.rig.root.visible).map((e) => ({
        id: e.id, kind: e.kind, hp: e.hp, alive: e.alive, x: e.x, y: e.y + 1.4, z: e.z,
        tele: e.state === "tele",
      })),
      boss: {
        name: boss.name, alive: boss.alive, active: boss.active, hp: boss.hp, hpMax: boss.hpMax,
        x: boss.x, y: heightAt(boss.x, boss.z) + 2.4, z: boss.z,
      },
      lock: lockTarget && lockTarget.alive ? { id: lockTarget.id, x: lockTarget.x, y: heightAt(lockTarget.x, lockTarget.z) + (lockTarget.kind === "boss" ? 2.2 : 1.5), z: lockTarget.z } : null,
      prompt,
      pages: pageCount(),
      circus,
      objective: objective || "Pages 0/5",
      tutor: tutorBanner(),
      drain: colorDrain(),
      events,
      camYaw,
    };
  }

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
    },
    wakeBoss() {
      settleCircus();
      boss.active = true;
      boss.state = "intro";
      boss.t = 0;
      pending.push({ type: "boss" });
      pending.push({ type: "bulletin", id: "boss" });
    },
    revive() {
      player.hp = player.hpMax;
      player.iframes = 1.2;
      player.action = "idle";
      if (boss.active && boss.alive) {
        player.x = 0;
        player.z = 102;
        boss.hp = boss.hpMax;
        boss.x = worldBoss.home.x;
        boss.z = worldBoss.home.z;
        boss.state = "recover";
        boss.t = 0;
      } else {
        player.x = 0;
        player.z = -4;
      }
      player.y = heightAt(player.x, player.z);
    },
    resetTrail() {
      while (bills.length) {
        const b = bills.pop();
        scene.remove(b.mesh);
      }
      pending.length = 0;
      for (const k of Object.keys(flags)) delete flags[k];
      outroT = -1;
      outroArmed = true;
      playTime = 0;
      allyHold = 8;
      sayQ.length = 0;
      sayGap = 0;
      sayLast = "";
      sayLastT = -10;
      playerHits = 0;
      bossWall = true;
      lockTarget = null;
      swingHit.clear();
      player.x = 0;
      player.z = -6;
      player.y = heightAt(0, -6);
      player.yaw = 0;
      player.vx = player.vz = player.vy = 0;
      player.hpMax = 100;
      player.mpMax = 100;
      player.hp = player.hpMax;
      player.mp = player.mpMax;
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
      player.magicLock = 0;
      player.hitStop = 0;
      player.guardT = 0;
      player.jumps = 0;
      player.hurt = 0;
      player.grounded = true;
      reaction = null;
      lassoCd = 0;
      const homes = [[-1.5, 0.6, 0.2], [1.7, 0.4, -0.1]];
      allies.forEach((a, i) => {
        a.x = homes[i][0];
        a.z = homes[i][1];
        a.yaw = homes[i][2];
        a.cd = 1.2;
        a.anim = "idle";
        a.animT = 0;
        a.hp = a.hpMax;
        a.hurt = 0;
      });
      wipeEnemies();
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
      boss.stunFor = 0;
      bossRig.root.visible = true;
      bossRig.root.rotation.set(0, Math.PI, 0);
      bossRig.root.position.set(worldBoss.home.x, heightAt(worldBoss.home.x, worldBoss.home.z), worldBoss.home.z);
      for (const chest of world.chests) {
        chest.open = false;
        chest.lid.rotation.x = 0;
      }
      gateUsed = false;
      gateSeen = false;
      gateWasIn = false;
      player.spellCd = 0;
      if (world.gate.setReady) world.gate.setReady(false);
      world.gate.setOpen(false);
      audio.setTension(0);
      circus = false;
      for (const p of world.pages) {
        p.got = false;
        p.mesh.visible = true;
      }
      for (const w of world.floats) {
        w.x = w.homeX;
        w.z = w.homeZ;
        w.drift = false;
        w.floated = false;
        w.mesh.position.set(w.x, heightAt(w.x, w.z), w.z);
        w.mesh.rotation.z = 0;
      }
      settleOpening();
    },
    skipToGate(withPages = true) {
      settleCircus();
      if (withPages) {
        for (const p of world.pages) {
          p.got = true;
          p.mesh.visible = false;
        }
      }
      boss.alive = false;
      boss.hp = 0;
      boss.active = true;
      boss.state = "dead";
      boss.t = 1.6;
      flags.won = true;
      armExit();
      player.x = 0;
      player.z = 124.2;
      player.y = heightAt(0, 124.2);
      player.yaw = 0;
      player.vx = player.vz = player.vy = 0;
      player.hp = player.hpMax;
      player.action = "idle";
    },
    pageCount,
    mp: () => player.mp,
    level: () => player.level,
    team: () => player.team,
    reaction: () => (reaction ? { id: reaction.id, label: reaction.label } : null),
    lockId: () => (lockTarget && lockTarget.alive ? lockTarget.id : null),
    circusDone: () => circus,
    floats: () => world.floats.map((w) => ({ x: w.x, z: w.z, drift: w.drift, floated: w.floated })),
    player,
    enemies,
    boss,
    bossName: worldBoss.name,
    hits: () => playerHits,
    skipLesson,
    tutorSave,
    teaching: () => tutorialOn,
    tutorStep: () => tutorStep,
    allies: () => allies.map((a) => ({ id: a.id, x: a.x, z: a.z, hp: a.hp, hpMax: a.hpMax })),
    chests: () => world.chests.map((c) => !!c.open),
    exitReady: () => !!(world.gate && world.gate.ready),
    defeatForExit() {
      settleCircus();
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
      enemies.push(e);
      return { id: e.id, dmg };
    },
    debugFoe() {
      const dist = 3.5;
      const x = player.x + Math.sin(player.yaw) * dist;
      const z = player.z + Math.cos(player.yaw) * dist;
      const e = makeEnemy("fog", x, z);
      e.hp = e.hpMax = 90;
      e.state = "idle";
      enemies.push(e);
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
      player.hp = player.hpMax;
      player.mp = player.mpMax;
      player.iframes = 1.6;
      player.action = "idle";
      player.vx = player.vz = player.vy = 0;
      return true;
    },
    keyOn: () => !!(keeper.keyMesh && keeper.keyMesh.visible),
  };
}
