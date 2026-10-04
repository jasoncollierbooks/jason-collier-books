// Wide outward weapon arcs. The blade is aimed in world space and nudged
// off the torso every frame, so a combo cannot pass the edge through the body.
import * as THREE from "three";
import { system, tag, untag } from "./vfx.js?v=1";

const _shoulder = new THREE.Vector3();
const _elbowNow = new THREE.Vector3();
const _handNow = new THREE.Vector3();
const _handT = new THREE.Vector3();
const _elbow = new THREE.Vector3();
const _pole = new THREE.Vector3();
const _toHand = new THREE.Vector3();
const _along = new THREE.Vector3();
const _side = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _forward = new THREE.Vector3();
const _blade = new THREE.Vector3();
const _x = new THREE.Vector3();
const _y = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _worldQ = new THREE.Quaternion();
const _parentQ = new THREE.Quaternion();
const _preQ = new THREE.Quaternion();
const _tgtQ = new THREE.Quaternion();
const _tip = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _local = new THREE.Vector3();
const _push = new THREE.Vector3();
const _spine = new THREE.Vector3();
const _sample = new THREE.Vector3();
const _width = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _zero = new THREE.Vector3();

// Offsets from the shoulder in (character-right, up, forward), meters at keeper scale.
// Blade direction is in the same basis. Pole pulls the elbow out, away from the ribs.
const SLASH = [
  { hand: [0.42, -0.02, 0.02], blade: [0.9, 0.16, -0.28], pole: [0.66, 0.28, 0.02] },
  { hand: [0.34, 0.08, 0.34], blade: [0.62, 0.16, 0.68], pole: [0.58, 0.36, 0.22] },
  { hand: [0.2, 0.02, 0.44], blade: [0.28, 0.08, 0.94], pole: [0.42, 0.24, 0.34] },
];
const BACK = [
  { hand: [0.2, 0.02, 0.44], blade: [0.28, 0.08, 0.94], pole: [0.42, 0.24, 0.34] },
  { hand: [0.34, 0.08, 0.34], blade: [0.62, 0.16, 0.68], pole: [0.58, 0.36, 0.22] },
  { hand: [0.44, -0.02, 0.02], blade: [0.92, 0.14, -0.24], pole: [0.68, 0.28, 0.02] },
];
const OVER = [
  { hand: [0.3, 0.44, -0.06], blade: [0.22, 0.96, -0.1], pole: [0.58, 0.46, -0.1] },
  { hand: [0.14, 0.48, 0.24], blade: [0.04, 0.32, 0.94], pole: [0.42, 0.5, 0.14] },
  { hand: [0.08, -0.08, 0.42], blade: [0.06, -0.48, 0.86], pole: [0.34, 0.2, 0.32] },
];

function lerp3(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function sampleKeys(keys, u) {
  const t = Math.max(0, Math.min(1, u));
  const span = keys.length - 1;
  const x = t * span;
  const i = Math.min(span - 1, Math.floor(x));
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  return {
    hand: lerp3(keys[i].hand, keys[i + 1].hand, s),
    blade: lerp3(keys[i].blade, keys[i + 1].blade, s),
    pole: lerp3(keys[i].pole, keys[i + 1].pole, s),
  };
}

function keysFor(action, combo) {
  if (action === "shove") return SLASH;
  if (combo === 2) return BACK;
  if (combo >= 3) return OVER;
  return SLASH;
}

function aimBone(bone, yDir, xHint, blend) {
  _y.copy(yDir);
  if (_y.lengthSq() < 1e-8) return;
  _y.normalize();
  _x.copy(xHint);
  _x.addScaledVector(_y, -_x.dot(_y));
  if (_x.lengthSq() < 1e-8) _x.set(0, 1, 0).addScaledVector(_y, -_y.y);
  if (_x.lengthSq() < 1e-8) _x.set(1, 0, 0);
  _x.normalize();
  _z.crossVectors(_x, _y).normalize();
  _x.crossVectors(_y, _z).normalize();
  _m.makeBasis(_x, _y, _z);
  _worldQ.setFromRotationMatrix(_m);
  bone.parent.updateWorldMatrix(true, false);
  bone.parent.getWorldQuaternion(_parentQ);
  _tgtQ.copy(_parentQ.invert()).multiply(_worldQ);
  if (blend < 0.999) bone.quaternion.copy(_preQ).slerp(_tgtQ, blend);
  else bone.quaternion.copy(_tgtQ);
}

function basisOf(root) {
  root.getWorldQuaternion(_worldQ);
  _forward.set(0, 0, 1).applyQuaternion(_worldQ);
  _right.set(-1, 0, 0).applyQuaternion(_worldQ);
  _up.set(0, 1, 0).applyQuaternion(_worldQ);
}

function place(out, origin, offset, scale) {
  out.copy(origin);
  out.addScaledVector(_right, offset[0] * scale);
  out.addScaledVector(_up, offset[1] * scale);
  out.addScaledVector(_forward, offset[2] * scale);
  return out;
}

function solveElbow(shoulder, hand, pole, L1, L2) {
  _toHand.subVectors(hand, shoulder);
  let dist = _toHand.length();
  const max = L1 + L2 - 0.012;
  const min = Math.abs(L1 - L2) + 0.012;
  dist = Math.max(min, Math.min(max, dist));
  _toHand.normalize().multiplyScalar(dist);
  _handT.copy(shoulder).add(_toHand);
  const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  _along.copy(_toHand).multiplyScalar(1 / dist);
  _side.subVectors(pole, shoulder);
  _side.addScaledVector(_along, -_side.dot(_along));
  if (_side.lengthSq() < 1e-8) _side.copy(_up);
  _side.normalize();
  _elbow.copy(shoulder).addScaledVector(_along, a).addScaledVector(_side, h);
}

// Push the blade direction until samples along it sit outside the torso capsule.
function clearBlade(hand, dir, scale) {
  const radius = 0.38 * scale;
  const headR = 0.22 * scale;
  _blade.copy(dir).normalize();
  for (let n = 0; n < 3; n++) {
    _push.set(0, 0, 0);
    let close = false;
    for (let i = 0; i <= 8; i++) {
      _sample.copy(hand).addScaledVector(_blade, (0.04 + (i / 8) * 1.55) * scale);
      const y = Math.max(_shoulder.y - 0.55 * scale, Math.min(_shoulder.y + 0.22 * scale, _sample.y));
      _spine.copy(_shoulder);
      _spine.addScaledVector(_right, -0.18 * scale);
      _spine.y = y;
      _spine.addScaledVector(_forward, 0.04 * scale);
      const dist = _sample.distanceTo(_spine);
      if (dist < radius) {
        close = true;
        _local.subVectors(_sample, _spine);
        _local.y *= 0.35;
        if (_local.lengthSq() < 1e-6) _local.copy(_right);
        _push.add(_local.normalize().multiplyScalar(radius - dist + 0.05));
      }
      _spine.copy(_shoulder);
      _spine.addScaledVector(_right, -0.16 * scale);
      _spine.y = _shoulder.y + 0.22 * scale;
      _spine.addScaledVector(_forward, 0.05 * scale);
      const hd = _sample.distanceTo(_spine);
      if (hd < headR) {
        close = true;
        _local.subVectors(_sample, _spine);
        if (_local.lengthSq() < 1e-6) _local.copy(_up);
        _push.add(_local.normalize().multiplyScalar(headR - hd + 0.04));
      }
    }
    if (!close) break;
    _blade.add(_push).normalize();
    // Prefer the open air in front of the chest over folding back into it.
    _blade.addScaledVector(_forward, 0.18).addScaledVector(_right, 0.08).normalize();
  }
  return _blade;
}

// Each sample dies on a wall-clock timer. The ribbon fades and the mesh is
// disposed even if the swing is interrupted, the sim skips a frame, or the
// tab comes back long after the blade stopped.
const TRAIL_MS = 380;
const liveTrails = new Set();

export function createTrail(root) {
  const trail = { root: root || null, mesh: null, pts: [], max: 40 };
  liveTrails.add(trail);
  return trail;
}

function ensureMesh(trail) {
  if (trail.mesh) return trail.mesh;
  const max = trail.max;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(max * 2 * 3), 3));
  geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(max * 2 * 3), 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  mesh.visible = false;
  trail.mesh = mesh;
  if (trail.root) trail.root.add(mesh);
  tag(mesh, {
    tag: "trail",
    dispose: true,
    onExpire() {
      trail.pts.length = 0;
      trail.sealed = true;
      if (trail.mesh === mesh) disposeTrailMesh(trail);
    },
  });
  return mesh;
}

function disposeTrailMesh(trail) {
  const mesh = trail.mesh;
  if (!mesh) return;
  untag(mesh);
  trail.mesh = null;
  mesh.visible = false;
  mesh.removeFromParent();
  mesh.geometry.dispose();
  mesh.material.dispose();
}

function expirePoints(trail, now) {
  const pts = trail.pts;
  let i = 0;
  while (i < pts.length) {
    const age = now - pts[i].born;
    if (!Number.isFinite(age) || age >= TRAIL_MS || age >= 2000) i++;
    else break;
  }
  if (i > 0) pts.splice(0, i);
}

function writeTrail(trail, now) {
  const pts = trail.pts;
  const n = pts.length;
  const root = trail.root;
  if (n < 2 || !root) {
    disposeTrailMesh(trail);
    return;
  }
  const mesh = ensureMesh(trail);
  const pos = mesh.geometry.attributes.position;
  const col = mesh.geometry.attributes.color;
  mesh.visible = true;
  root.updateMatrixWorld(true);
  let count = 0;
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1);
    const age = Math.min(1, Math.max(0, (now - pts[i].born) / TRAIL_MS));
    const w = (0.11 + f * 0.42) * (1 - age * 0.35);
    _a.copy(pts[Math.max(0, i - 1)].at);
    _b.copy(pts[Math.min(n - 1, i + 1)].at);
    _width.subVectors(_b, _a);
    if (_width.lengthSq() < 1e-6) _width.set(0, 1, 0);
    _width.normalize();
    _side.crossVectors(_width, _up);
    if (_side.lengthSq() < 1e-5) _side.set(1, 0, 0);
    _side.normalize().multiplyScalar(w);
    const fade = (1 - age) * (0.45 + 0.55 * f);
    for (const sign of [-1, 1]) {
      _local.copy(pts[i].at).addScaledVector(_side, sign);
      root.worldToLocal(_local);
      pos.setXYZ(count, _local.x, _local.y, _local.z);
      col.setXYZ(count, 1 * fade, 0.68 * fade, 0.16 * fade);
      count++;
    }
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  mesh.geometry.setDrawRange(0, count);
  mesh.geometry.computeBoundingSphere();
}

function fadeTrail(trail, now) {
  if (!trail) return;
  const born = trail.mesh && trail.mesh.userData.vfxBorn;
  if (trail.mesh && Number.isFinite(born) && now - born >= 2000) {
    trail.pts.length = 0;
    trail.sealed = true;
    disposeTrailMesh(trail);
    return;
  }
  expirePoints(trail, now);
  if (trail.pts.length < 2) {
    if (trail.pts.length === 0 || !Number.isFinite(trail.pts[0].born) || now - trail.pts[0].born >= TRAIL_MS) {
      trail.pts.length = 0;
    }
    disposeTrailMesh(trail);
    return;
  }
  writeTrail(trail, now);
}

export function tickTrails(now = performance.now()) {
  const t = Number.isFinite(now) ? now : performance.now();
  for (const trail of liveTrails) fadeTrail(trail, t);
}

system((now) => tickTrails(now));

export function swingWeapon(model, bones, root, spec, trail) {
  const upper = bones.upperarm_r;
  const lower = bones.lowerarm_r;
  const hand = bones.hand_r;
  const weapon = hand && hand.children.find((c) => c.userData && c.userData.bladeTip);
  const attacking = spec.action === "attack" || spec.action === "shove";
  if (trail && !attacking) trail.sealed = false;
  if (!upper || !lower || !hand || !weapon || !attacking) return;

  model.updateMatrixWorld(true);
  upper.getWorldPosition(_shoulder);
  lower.getWorldPosition(_elbowNow);
  hand.getWorldPosition(_handNow);
  const L1 = Math.max(0.08, _shoulder.distanceTo(_elbowNow));
  const L2 = Math.max(0.07, _elbowNow.distanceTo(_handNow));
  const reach = L1 + L2;
  const scale = reach / 0.49;

  basisOf(model);
  const p = Math.max(0, Math.min(1, spec.actionT || 0));
  const u = Math.sin(p * Math.PI * 0.5);
  const pose = sampleKeys(keysFor(spec.action, spec.combo || 1), u);
  place(_handT, _shoulder, pose.hand, scale);
  place(_pole, _shoulder, pose.pole, scale);
  place(_blade, _zero, pose.blade, 1);
  _blade.normalize();
  solveElbow(_shoulder, _handT, _pole, L1, L2);
  clearBlade(_handT, _blade, scale);

  const blend = Math.max(0.42, Math.min(1, p / 0.1));
  _preQ.copy(upper.quaternion);
  aimBone(upper, _y.copy(_elbow).sub(_shoulder), _up, blend);
  upper.updateMatrixWorld(true);
  _preQ.copy(lower.quaternion);
  aimBone(lower, _y.copy(_handT).sub(_elbow), _up, blend);
  lower.updateMatrixWorld(true);
  // The fist snaps to a safe aim so the edge never spends a frame inside the chest.
  _preQ.copy(hand.quaternion);
  aimBone(hand, _blade, _up, 1);
  hand.updateMatrixWorld(true);

  if (!trail || trail.sealed) return;
  const now = performance.now();
  expirePoints(trail, now);
  _tip.copy(weapon.userData.bladeTip).applyMatrix4(weapon.matrixWorld);
  const last = trail.pts[trail.pts.length - 1];
  const freshSwing = (spec.actionT || 0) < 0.05 && last && now - last.born > 50;
  if (freshSwing) {
    trail.pts.length = 0;
    disposeTrailMesh(trail);
  }
  const prev = trail.pts[trail.pts.length - 1];
  if (!prev || prev.at.distanceTo(_tip) > 0.045 * scale) {
    trail.pts.push({ at: _tip.clone(), born: now });
    if (trail.pts.length > trail.max) trail.pts.shift();
  }
  void _mid;
}
