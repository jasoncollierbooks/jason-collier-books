// The thing in the timber: a huge shaggy ape, more Bigfoot than tree.
// Sculpted masses, fur shells, and hanging hair cards. Bark, moss, and a few snags stay minor.
// Green eyes, fog around the legs. Creepy, not gory.
import * as THREE from "three";

function canvasTex(draw, w = 256, h = 256, repeat = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  return t;
}

function mulberry32(a) {
  return function rnd() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function furAlbedo() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#5a3c28";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const light = Math.random();
      g.strokeStyle = light > 0.82 ? "#8d6844" : light > 0.4 ? "#3a2618" : "#140e0a";
      g.globalAlpha = 0.35 + Math.random() * 0.55;
      g.lineWidth = 0.6 + Math.random() * 1.3;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 2.2, y + 5 + Math.random() * 18);
      g.stroke();
    }
    g.globalAlpha = 1;
  }, 512, 512, [2.2, 2.4]);
}

function strandMap() {
  return canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const len = 10 + Math.random() * 36;
      const a = 0.35 + Math.random() * 0.65;
      g.strokeStyle = `rgba(255,244,230,${a})`;
      g.lineWidth = Math.random() > 0.75 ? 1.8 : 0.8;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (Math.random() - 0.5) * 6, y + len * 0.5, x + (Math.random() - 0.5) * 4, y + len);
      g.stroke();
    }
  }, 512, 512, [3.5, 2.2]);
}

function barkMap() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#5c4030";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 32; i++) {
      g.strokeStyle = i % 3 ? "#3a2818" : "#7a5a40";
      g.lineWidth = 1 + Math.random() * 2.4;
      g.beginPath();
      let x = (i / 32) * w;
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 10) {
        x += (Math.random() - 0.5) * 7;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  }, 256, 256);
}

function mossMap() {
  return canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
      const x = w * 0.5 + (Math.random() - 0.5) * w * 0.7;
      g.strokeStyle = Math.random() > 0.5 ? "rgba(90,120,60,0.85)" : "rgba(40,70,36,0.9)";
      g.lineWidth = 1 + Math.random() * 2;
      g.beginPath();
      g.moveTo(x, 4);
      g.quadraticCurveTo(x + (Math.random() - 0.5) * 16, h * 0.5, x + (Math.random() - 0.5) * 10, h - 2);
      g.stroke();
    }
  }, 128, 256);
}

function fogMap() {
  return canvasTex((g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w * 0.48);
    gr.addColorStop(0, "rgba(236,238,240,0.55)");
    gr.addColorStop(0.45, "rgba(210,214,218,0.22)");
    gr.addColorStop(1, "rgba(210,214,218,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  }, 128, 128);
}

function lathe(pairs, segs = 22) {
  const g = new THREE.LatheGeometry(pairs.map(([r, y]) => new THREE.Vector2(Math.max(0.004, r), y)), segs);
  g.computeVertexNormals();
  return g;
}

function solidMat(tex, color, rough = 0.94) {
  const m = new THREE.MeshStandardMaterial({ map: tex || null, color, roughness: rough, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
      float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.1);
      gl_FragColor.rgb += rim * vec3(0.20, 0.14, 0.08);`,
    );
  };
  m.customProgramCacheKey = () => "beast-solid-rim";
  return m;
}

function shellMat(map, color, offset, test) {
  const droop = offset * 0.55;
  const m = new THREE.MeshStandardMaterial({
    map, color, roughness: 0.98, metalness: 0,
    alphaTest: test, side: THREE.DoubleSide,
  });
  m.customProgramCacheKey = () => `beast-shell-${offset}-${test}`;
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      transformed += normalize(objectNormal) * ${offset.toFixed(4)};
      transformed.y -= ${droop.toFixed(4)};`,
    );
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
      float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 1.8);
      gl_FragColor.rgb += rim * vec3(0.32, 0.22, 0.12);`,
    );
  };
  return m;
}

function put(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function hairCard(w, len, mat) {
  const g = new THREE.PlaneGeometry(w, len, 1, 3);
  g.translate(0, -len / 2, 0);
  const col = [];
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.clamp(-pos.getY(i) / len, 0, 1);
    col.push(0.28 + k * 0.85, 0.18 + k * 0.55, 0.1 + k * 0.28);
  }
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  const a = new THREE.Mesh(g, mat);
  const b = new THREE.Mesh(g, mat);
  b.rotation.y = Math.PI / 2;
  const grp = new THREE.Group();
  grp.add(a, b);
  return grp;
}

export function buildWalker(lowEnd = false) {
  const rnd = mulberry32(0x0b1f700d);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const albedo = furAlbedo();
  const strands = strandMap();
  const fur = solidMat(albedo, 0xffffff, 0.96);
  const furDark = solidMat(albedo, 0x9a8878, 0.98);
  const leather = solidMat(null, 0x2a1c16, 0.62);
  leather.metalness = 0.04;
  const bark = new THREE.MeshStandardMaterial({ map: barkMap(), color: 0x6a4a32, roughness: 1, metalness: 0 });
  const mossMat = new THREE.MeshStandardMaterial({
    map: mossMap(), color: 0xc8d8b0, roughness: 1, alphaTest: 0.35, side: THREE.DoubleSide,
  });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.88 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xd6ff6a, transparent: true, opacity: 0, fog: false, depthWrite: false });
  eyeMat.toneMapped = false;

  const shellLevels = lowEnd
    ? [
      shellMat(strands, 0x3a2818, 0.045, 0.28),
      shellMat(strands, 0x7a5a38, 0.095, 0.52),
    ]
    : [
      shellMat(strands, 0x2e2016, 0.04, 0.22),
      shellMat(strands, 0x5a4030, 0.09, 0.42),
      shellMat(strands, 0x8d6844, 0.145, 0.6),
    ];
  const shellLists = shellLevels.map(() => []);

  function grow(mesh) {
    shellLevels.forEach((mat, i) => {
      const s = new THREE.Mesh(mesh.geometry, mat);
      s.castShadow = false;
      s.receiveShadow = false;
      mesh.add(s);
      shellLists[i].push(s);
    });
  }

  const H = 3.45;
  const cards = [];
  const snags = [];

  function clump(parent, x, y, z, w, len, rx, rz, rankAmp) {
    const c = hairCard(w, len, shellLevels[Math.min(1, shellLevels.length - 1)]);
    c.position.set(x, y, z);
    c.userData.rx = rx;
    c.userData.rz = rz;
    c.userData.amp = rankAmp;
    c.userData.keep = len;
    c.userData.ph = rnd() * Math.PI * 2;
    c.rotation.set(rx, rnd() * 0.4, rz);
    parent.add(c);
    cards.push(c);
    return c;
  }

  // ---- legs: thick, slightly bent, big flat feet. Local -Z is the face. ----
  const legs = [];
  const thighGeo = lathe([[0.22, 0], [0.34, -0.16], [0.36, -0.4], [0.3, -0.68], [0.2, -0.9]], 20);
  const shinGeo = lathe([[0.16, 0], [0.2, -0.16], [0.18, -0.4], [0.15, -0.62], [0.14, -0.78]], 18);
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.28, 1.74, 0.02);
    const thigh = put(hip, thighGeo, fur, 0, 0, 0);
    grow(thigh);
    const kn = new THREE.Group();
    kn.position.set(0, -0.9, 0);
    hip.add(kn);
    const cap = put(kn, new THREE.SphereGeometry(0.16, 16, 12), furDark, 0, 0, 0.02, 0, 0, 0, 1.15, 0.85, 1.05);
    grow(cap);
    const shin = put(kn, shinGeo, furDark, 0, 0, 0);
    grow(shin);
    const ankle = new THREE.Group();
    ankle.position.set(0, -0.78, 0);
    kn.add(ankle);
    const foot = put(ankle, new THREE.CapsuleGeometry(0.11, 0.34, 6, 14), furDark, 0, -0.02, -0.02, Math.PI / 2, 0, 0, 1.55, 1.05, 0.42);
    grow(foot);
    for (let i = 0; i < 3; i++) {
      clump(thigh, Math.sin(i * 2.1) * 0.22, -0.25 - i * 0.18, Math.cos(i * 1.7) * 0.2, 0.1, 0.28 + (i % 2) * 0.08, 0.2, s * 0.05, 0.07);
    }
    body.add(hip);
    legs.push({ hip, kn, ankle, side: s });
  }

  // ---- barrel torso, gut forward, hump and traps high, head low ----
  const pelvis = put(body, lathe([[0.2, -0.22], [0.46, -0.06], [0.5, 0.1], [0.36, 0.26]], 26), fur, 0, 1.78, 0.02, 0, 0, 0, 1.28, 1, 1.02);
  grow(pelvis);
  const gut = put(body, lathe([[0.22, -0.28], [0.48, -0.06], [0.56, 0.16], [0.4, 0.38], [0.24, 0.5]], 28), fur, 0, 2.12, -0.16, -0.42, 0, 0, 1.18, 1.05, 1.12);
  grow(gut);
  const chest = put(body, lathe([[0.26, -0.2], [0.48, 0.02], [0.54, 0.24], [0.4, 0.46], [0.24, 0.58]], 28), fur, 0, 2.42, -0.1, -0.5, 0, 0, 1.32, 1, 1.08);
  grow(chest);
  const hump = put(body, lathe([[0.16, -0.1], [0.38, 0.08], [0.34, 0.28], [0.16, 0.42]], 22), furDark, 0, 2.72, 0.16, 0.55, 0, 0, 1.25, 0.9, 0.95);
  grow(hump);

  const trapGeo = new THREE.CapsuleGeometry(0.26, 0.34, 8, 16);
  for (const s of [-1, 1]) {
    const trap = put(body, trapGeo, fur, s * 0.4, 2.78, -0.02, -0.55, 0, s * 0.7, 1.15, 0.82, 1.05);
    grow(trap);
    const plate = put(body, new THREE.SphereGeometry(0.34, 16, 12, s > 0 ? 0.2 : -1.2, 1.3, 0.45, 1.1), bark, s * 0.52, 2.7, 0.02, 0.2, s * 0.4, s * 0.5, 0.7, 0.42, 0.55);
    plate.castShadow = true;
    const moss = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.42), mossMat);
    moss.geometry.translate(0, -0.2, 0);
    moss.position.set(s * 0.48, 2.62, -0.12);
    moss.rotation.y = s * 0.8;
    moss.userData.rx = moss.rotation.x;
    moss.userData.rz = 0;
    moss.userData.amp = 0.12;
    moss.userData.keep = 0.5;
    moss.userData.ph = rnd() * 6;
    body.add(moss);
    cards.push(moss);
  }

  // snags on the back — absolute sway, they do not accumulate
  const snagGeo = lathe([[0.012, 0], [0.028, 0.08], [0.016, 0.22], [0.006, 0.36]], 7);
  const snagSpec = [[0.08, 2.85, 0.32, -0.5, 0.2], [-0.2, 2.55, 0.3, -0.2, -0.5], [0.22, 2.48, 0.26, 0.3, 0.7]];
  for (const [x, y, z, rx, rz] of snagSpec) {
    const st = put(body, snagGeo, wood, x, y, z, rx, 0, rz);
    st.castShadow = false;
    st.userData.rx = rx;
    st.userData.rz = rz;
    st.userData.ph = rnd() * 5;
    snags.push(st);
    if (z > 0.28) {
      const tw = put(st, lathe([[0.006, 0], [0.012, 0.04], [0.004, 0.14]], 5), wood, 0.02, 0.16, 0, 0.4, 0, 1.1);
      tw.castShadow = false;
    }
  }
  for (let i = 0; i < 7; i++) {
    const a = -0.8 + i * 0.28;
    clump(body, Math.sin(a) * 0.28, 2.55 + (i % 3) * 0.12, 0.22 + (i % 2) * 0.08, 0.14, 0.42 + (i % 3) * 0.08, 0.35, (i - 3) * 0.04, 0.1);
  }

  // ---- head, almost no neck, sitting low and forward ----
  const neck = new THREE.Group();
  neck.position.set(0, 2.52, -0.2);
  body.add(neck);
  const nk = put(neck, lathe([[0.16, 0], [0.2, 0.06], [0.15, 0.12]], 16), fur, 0, 0, -0.02);
  grow(nk);

  const head = new THREE.Group();
  head.position.set(0, 0.16, -0.18);
  neck.add(head);
  // skull stays back; fur shells would swallow the face, so the shag here is cards
  const skull = put(head, lathe([[0.08, -0.2], [0.18, -0.08], [0.22, 0.04], [0.18, 0.14], [0.09, 0.24]], 24), fur, 0, 0.02, 0.06, 0.12, 0, 0, 1.15, 0.96, 0.82);
  const jaw = put(head, lathe([[0.06, -0.08], [0.14, 0], [0.12, 0.08]], 16), furDark, 0, -0.13, -0.1, 0.15, 0, 0, 1.2, 0.75, 0.9);
  const brow = put(head, new THREE.CapsuleGeometry(0.055, 0.28, 6, 14), furDark, 0, 0.08, -0.3, 0, 0, Math.PI / 2, 1, 1.15, 1.7);
  const face = put(head, lathe([[0.03, -0.11], [0.1, -0.02], [0.11, 0.06], [0.04, 0.11]], 18), leather, 0, -0.03, -0.24, 0, 0, 0, 1.3, 1.05, 0.5);
  face.castShadow = true;
  const nose = put(head, new THREE.CapsuleGeometry(0.026, 0.012, 4, 10), leather, 0, -0.05, -0.34, Math.PI / 2, 0, 0, 1.8, 0.45, 0.4);
  for (const s of [-1, 1]) {
    put(head, new THREE.CapsuleGeometry(0.035, 0.02, 4, 8), furDark, s * 0.2, 0.02, 0.02, 0, 0, s * 0.4, 0.7, 1.1, 0.55);
  }
  const headSnag = put(head, lathe([[0.008, 0], [0.016, 0.06], [0.006, 0.2]], 5), wood, 0.1, 0.18, 0.1, -0.8, 0.2, 0.4);
  headSnag.userData.rx = -0.8;
  headSnag.userData.rz = 0.4;
  headSnag.userData.ph = 1.2;
  snags.push(headSnag);
  for (let i = 0; i < 7; i++) {
    const a = -1.15 + i * 0.38;
    clump(head, Math.sin(a) * 0.18, 0.1 + (i % 2) * 0.05, Math.cos(a) * 0.1, 0.08, 0.2, 0.35, 0, 0.07);
  }
  const browFur = clump(head, 0, 0.1, -0.2, 0.18, 0.1, 0.55, 0, 0.03);

  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 12), eyeMat);
    e.position.set(s * 0.082, -0.012, -0.34);
    e.material.polygonOffset = true;
    e.material.polygonOffsetFactor = -2;
    e.renderOrder = 5;
    head.add(e);
    eyes.push(e);
    const glowMat = new THREE.SpriteMaterial({
      color: 0xd6ff6a, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending,
    });
    glowMat.toneMapped = false;
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(0.16, 0.11, 1);
    glow.position.set(s * 0.082, -0.012, -0.38);
    glow.renderOrder = 6;
    head.add(glow);
    e.userData.glow = glow;
  }
  // keep the brow fur in front of the skull shells but behind nothing important
  browFur.renderOrder = 2;

  // ---- long thick arms, hands to the knees, thick fingers ----
  const arms = [];
  const upperGeo = lathe([[0.2, 0], [0.24, -0.16], [0.22, -0.42], [0.16, -0.8]], 18);
  const foreGeo = lathe([[0.15, 0], [0.17, -0.18], [0.15, -0.4], [0.13, -0.72]], 16);
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.62, 2.52, -0.02);
    const shoulder = put(sh, new THREE.SphereGeometry(0.2, 16, 12), fur, 0, 0.02, 0, 0, 0, 0, 1.2, 0.9, 1);
    grow(shoulder);
    const upper = put(sh, upperGeo, fur, 0, 0, 0);
    grow(upper);
    for (let i = 0; i < 4; i++) {
      clump(upper, Math.sin(i * 1.7 + s) * 0.16, -0.18 - i * 0.16, Math.cos(i * 1.4) * 0.14, 0.09, 0.34, 0.15, s * 0.08, 0.1);
    }
    const el = new THREE.Group();
    el.position.set(0, -0.8, 0);
    sh.add(el);
    put(el, new THREE.SphereGeometry(0.13, 14, 10), furDark, 0, 0, 0, 0, 0, 0, 1.1, 0.9, 1);
    const fore = put(el, foreGeo, fur, 0, 0, 0);
    grow(fore);
    const plate = put(el, new THREE.SphereGeometry(0.2, 12, 10, 0.4, 1.4, 0.5, 1.0), bark, s * 0.02, -0.28, -0.06, 0.3, 0, s * 0.2, 0.55, 0.7, 0.32);
    plate.castShadow = true;
    for (let i = 0; i < 3; i++) {
      clump(fore, Math.sin(i * 2.2) * 0.12, -0.2 - i * 0.16, -0.06, 0.07, 0.26, 0.25, 0, 0.09);
    }
    const hand = new THREE.Group();
    hand.position.set(0, -0.74, -0.02);
    el.add(hand);
    const palm = put(hand, new THREE.CapsuleGeometry(0.07, 0.08, 6, 12), furDark, 0, -0.02, 0, 0, 0, 0, 1.35, 0.85, 0.9);
    grow(palm);
    for (let f = 0; f < 4; f++) {
      const fg = new THREE.Group();
      const spread = (f - 1.5) * 0.042;
      fg.position.set(spread, -0.08, s * -0.01);
      const len = 0.12 + (f === 1 || f === 2 ? 0.035 : 0);
      const prox = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, len * 0.55, 4, 8), furDark);
      prox.position.y = -len * 0.32;
      fg.add(prox);
      const mid = new THREE.Group();
      mid.position.y = -len * 0.62;
      mid.rotation.x = 0.35;
      const tip = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, len * 0.4, 4, 8), furDark);
      tip.position.y = -len * 0.26;
      mid.add(tip);
      fg.add(mid);
      fg.rotation.z = spread * 1.4;
      hand.add(fg);
    }
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.026, 0.09, 4, 8), furDark);
    thumb.position.set(s * 0.09, -0.02, -0.02);
    thumb.rotation.set(0.5, 0, s * 0.95);
    hand.add(thumb);
    body.add(sh);
    arms.push({ sh, el, side: s });
  }

  const fogTex = fogMap();
  const fogs = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.22, color: 0xd5d8dc }));
    sp.userData.noAO = true;
    const ang = (i / 6) * Math.PI * 2;
    sp.position.set(Math.cos(ang) * 0.7, 0.55 + (i % 3) * 0.4, Math.sin(ang) * 0.45);
    sp.scale.set(1.3 + (i % 3) * 0.3, 0.75, 1);
    root.add(sp);
    fogs.push(sp);
  }

  cards.sort((a, b) => (b.userData.keep || 0) - (a.userData.keep || 0));

  let phase = rnd() * 6;
  let lodKey = -1;
  function setLod(dist) {
    const near = dist < 16;
    const mid = dist < 42;
    const shellsOn = near ? shellLevels.length : mid ? 1 : 0;
    const cardCut = near ? (lowEnd ? 0.45 : 1) : mid ? (lowEnd ? 0 : 0.28) : 0;
    const key = shellsOn * 16 + Math.round(cardCut * 20);
    if (key === lodKey) return;
    lodKey = key;
    shellLists.forEach((list, i) => {
      const vis = i < shellsOn;
      for (const m of list) m.visible = vis;
    });
    cards.forEach((c, i) => { c.visible = cards.length ? (i + 0.5) / cards.length <= cardCut : false; });
  }
  setLod(lowEnd ? 20 : 8);

  return {
    root, eyes, eyeMat, height: H, setLod,
    /** mode: stand | walk | sniff | crouch | run | reach ; eyesOn 0..1 */
    animate(mode, dt, t, eyesOn = 0) {
      const sniff = mode === "sniff";
      const crouch = mode === "crouch";
      const run = mode === "run";
      const reach = mode === "reach";
      const walk = mode === "walk";
      const moving = walk || run || crouch;
      const rate = run ? 2.35 : crouch ? 0.7 : walk ? 1.02 : 0;
      phase += dt * rate * Math.PI * 2;
      legs.forEach((l, i) => {
        const o = i === 0 ? 0 : Math.PI * 0.84;
        const amp = (run ? 0.62 : crouch ? 0.22 : walk ? 0.4 : 0) * (i === 0 ? 1.12 : 0.88);
        const s = Math.sin(phase + o);
        const hipX = 0.2 + s * amp + (crouch ? 0.45 : 0);
        const knee = 0.4 + Math.max(0, -s) * amp * 1.15 + (crouch ? 0.7 : 0);
        l.hip.rotation.x = hipX;
        l.hip.rotation.z = l.side * (0.07 + Math.abs(s) * 0.04);
        l.kn.rotation.x = -knee;
        l.ankle.rotation.x = knee * 0.62 - hipX * 0.35;
      });
      arms.forEach((a, i) => {
        const o = i === 0 ? Math.PI * 0.92 : 0.15;
        const s = Math.sin(phase + o);
        const swing = run ? 0.62 : crouch ? 0.14 : walk ? 0.4 : sniff ? 0.07 : 0.035;
        a.sh.rotation.x = 0.15 + s * swing * (i === 0 ? 1.1 : 0.86) + (reach ? 1.05 : crouch ? 0.42 : 0);
        a.sh.rotation.z = a.side * (0.16 + (crouch ? 0.06 : 0));
        a.el.rotation.x = 0.32 + Math.max(0, -s) * (run ? 0.35 : 0.18) + (reach ? 0.15 : 0);
      });
      const roll = Math.sin(phase) * (run ? 0.08 : walk ? 0.055 : crouch ? 0.025 : 0);
      body.rotation.z = roll + 0.04;
      body.rotation.y = Math.sin(phase * 0.5) * (walk ? 0.035 : 0);
      const breath = Math.sin(t * (run ? 3.2 : sniff ? 1.5 : 1.02));
      // negative x hunches the shoulders toward the face (-Z)
      body.rotation.x = (crouch ? -0.58 : run ? -0.26 : sniff ? -0.2 : reach ? -0.16 : -0.06) + breath * 0.015;
      body.position.y = (crouch ? -0.42 : 0) + (moving ? Math.pow(Math.abs(Math.sin(phase)), 1.35) * (run ? 0.1 : 0.04) : breath * 0.012);
      body.position.x = roll * 0.12;
      const idle = !moving;
      const sniffDip = sniff || (idle && Math.sin(t * 0.37) > 0.48);
      neck.rotation.x = sniffDip ? -0.5 + Math.sin(t * 2.1) * 0.05 : crouch ? -0.22 : run ? 0.06 : -0.04;
      neck.rotation.y = idle || sniff ? Math.sin(t * 0.31) * 0.5 : Math.sin(t * 0.4 + phase * 0.12) * 0.08;
      neck.rotation.z = Math.sin(t * 0.19) * 0.06 - roll * 0.25;
      chest.scale.y = 1 + breath * 0.03;
      const swayK = run ? 2.1 : moving ? 1.25 : 0.65;
      for (const c of cards) {
        if (!c.visible) continue;
        const u = c.userData;
        const w = Math.sin(t * 1.55 * (run ? 1.7 : 1) + u.ph) * u.amp * swayK;
        c.rotation.x = u.rx + w;
        c.rotation.z = (u.rz || 0) + Math.cos(t * 1.15 + u.ph) * u.amp * 0.6;
      }
      for (const st of snags) {
        const u = st.userData;
        st.rotation.x = u.rx + Math.sin(t * 1.25 + u.ph) * 0.05;
        st.rotation.z = u.rz + Math.cos(t * 1.05 + u.ph) * 0.06;
      }
      const eye = eyesOn > 0.05 ? 0.35 + eyesOn * 0.65 : 0;
      eyeMat.opacity = eye;
      for (const e of eyes) if (e.userData.glow) e.userData.glow.material.opacity = eye * 0.9;
      fogs.forEach((sp, i) => {
        const a = t * 0.15 + i;
        const rad = 0.55 + (i % 3) * 0.2;
        sp.position.x = Math.cos(a + i) * rad;
        sp.position.z = Math.sin(a * 0.8 + i) * rad * 0.7;
        sp.position.y = 0.4 + (i % 4) * 0.45 + Math.sin(t * 0.6 + i) * 0.08;
        sp.material.opacity = 0.08 + (i % 3) * 0.035 + Math.sin(t * 0.8 + i) * 0.02;
      });
    },
  };
}
