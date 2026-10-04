// The thing in the timber: a huge shaggy ape, more Bigfoot than tree.
// Bark plates on the shoulders and forearms, a few moss strands, snags on the back and head.
// Green eyes, fog around the legs. Creepy, not gory.
import * as THREE from "three";

function canvasTex(draw, w = 256, h = 256) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function furMap() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#24170f";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2400; i++) {
      const x = Math.random() * w, y = Math.random() * h;
      const dark = Math.random() > 0.42;
      g.strokeStyle = dark ? (Math.random() > 0.5 ? "#0c0908" : "#1a100c") : "#4a301c";
      g.globalAlpha = 0.35 + Math.random() * 0.55;
      g.lineWidth = dark ? 1.1 : 0.7;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 2.4, y + 6 + Math.random() * 16);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

function barkMap() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#5c4030";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 28; i++) {
      g.strokeStyle = i % 3 ? "#3a2818" : "#7a5a40";
      g.lineWidth = 1 + Math.random() * 2.4;
      g.beginPath();
      let x = (i / 28) * w + Math.random() * 6;
      g.moveTo(x, 0);
      for (let y = 0; y <= h; y += 12) {
        x += (Math.random() - 0.5) * 6;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
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

function bone(len, r0, r1, mat, sides = 12) {
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, 3, false);
  g.translate(0, -len / 2, 0);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

function tufts(parent, n, len, mat, radius) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.012 + Math.random() * 0.012, len * (0.6 + Math.random() * 0.7), 4), mat);
    cone.castShadow = false;
    const x = Math.sin(b) * Math.cos(a) * radius;
    const y = Math.cos(b) * radius * 0.85;
    const z = Math.sin(b) * Math.sin(a) * radius;
    cone.position.set(x, y, z);
    cone.lookAt(cone.position.clone().multiplyScalar(2));
    cone.rotateX(Math.PI / 2);
    parent.add(cone);
  }
}

export function buildWalker() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const furTex = furMap();
  furTex.repeat.set(2.2, 3.2);
  const fur = new THREE.MeshStandardMaterial({ map: furTex, color: 0x4a3220, roughness: 0.92, metalness: 0 });
  fur.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace(
      "#include <opaque_fragment>",
      `#include <opaque_fragment>
      float rim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4);
      gl_FragColor.rgb += rim * vec3(0.10, 0.07, 0.04);`,
    );
  };
  const furDark = fur.clone();
  furDark.color.setHex(0x1c140e);
  const barkTex = barkMap();
  const bark = new THREE.MeshStandardMaterial({ map: barkTex, color: 0x6a4a32, roughness: 1, metalness: 0 });
  const moss = new THREE.MeshStandardMaterial({ color: 0x3e5c34, roughness: 1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xc6ff7a, transparent: true, opacity: 0, fog: false, depthWrite: false });

  const H = 3.45;

  // thick legs, slightly bent, big feet. Face is -Z.
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.22, 1.72, 0.02);
    hip.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), fur));
    const thigh = bone(0.78, 0.15, 0.12, fur, 14);
    hip.add(thigh);
    tufts(thigh, 8, 0.16, furDark, 0.14);
    const kn = new THREE.Group();
    kn.position.y = -0.78;
    hip.add(kn);
    kn.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), furDark));
    const shin = bone(0.74, 0.1, 0.08, furDark, 12);
    kn.add(shin);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), furDark);
    foot.scale.set(0.85, 0.42, 2.15);
    foot.position.set(s * 0.02, -0.78, -0.08);
    kn.add(foot);
    body.add(hip);
    legs.push({ hip, kn, side: s });
  }

  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), fur);
  pelvis.scale.set(1.35, 0.72, 0.95);
  pelvis.position.set(0, 1.72, 0.02);
  pelvis.castShadow = true;
  body.add(pelvis);

  const torso = bone(0.95, 0.34, 0.28, fur, 16);
  torso.position.set(0, 2.48, 0.06);
  torso.rotation.x = 0.28;
  body.add(torso);
  tufts(torso, 14, 0.22, furDark, 0.32);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), fur);
  chest.scale.set(1.45, 0.85, 0.78);
  chest.position.set(0, 2.22, -0.06);
  chest.castShadow = true;
  body.add(chest);

  // bark plates on the shoulders
  const shoulders = [];
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), bark);
    plate.scale.set(1.15, 0.55, 0.85);
    plate.position.set(s * 0.38, 2.48, 0.02);
    plate.rotation.z = s * 0.4;
    plate.castShadow = true;
    body.add(plate);
    shoulders.push(plate);
    const mossBit = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.28), moss);
    mossBit.position.set(s * 0.42, 2.62, -0.08);
    mossBit.rotation.y = s * 0.8;
    body.add(mossBit);
  }

  // snags off the upper back
  const snags = [];
  const snagRoot = new THREE.Group();
  snagRoot.position.set(0, 2.35, 0.28);
  body.add(snagRoot);
  const sticks = [[0.05, 0.15, 0.02, 0.42, 0.4, -0.2], [-0.16, 0.05, 0.04, 0.28, -0.5, 0.6], [0.18, 0.02, 0.06, 0.22, 0.9, 0.3]];
  for (const [x, y, z, len, rx, rz] of sticks) {
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.028, len, 5), wood);
    st.position.set(x, y, z);
    st.rotation.set(rx, 0, rz);
    snagRoot.add(st);
    snags.push(st);
    if (len > 0.3) {
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, 0.14, 4), wood);
      tw.position.set(0, len * 0.2, 0);
      tw.rotation.z = 0.9;
      st.add(tw);
    }
  }

  const neck = new THREE.Group();
  neck.position.set(0, 2.55, -0.08);
  body.add(neck);
  const nk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.22, 12), fur);
  nk.position.y = 0.12;
  neck.add(nk);

  const head = new THREE.Group();
  head.position.set(0, 0.32, -0.02);
  neck.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 14), fur);
  skull.scale.set(0.92, 1.05, 1.05);
  skull.castShadow = true;
  head.add(skull);
  tufts(skull, 10, 0.14, furDark, 0.2);
  const brow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), furDark);
  brow.scale.set(1.15, 0.38, 0.55);
  brow.position.set(0, 0.06, -0.12);
  head.add(brow);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), fur);
  jaw.scale.set(0.9, 0.7, 0.85);
  jaw.position.set(0, -0.12, -0.06);
  head.add(jaw);
  const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), furDark);
  muzzle.scale.set(1.1, 0.7, 1.2);
  muzzle.position.set(0, -0.06, -0.18);
  head.add(muzzle);
  // head snag
  const headSnag = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.26, 5), wood);
  headSnag.position.set(0.08, 0.16, 0.06);
  headSnag.rotation.set(-0.4, 0, 0.5);
  head.add(headSnag);
  snags.push(headSnag);
  const headMoss = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.16), moss);
  headMoss.position.set(-0.1, 0.12, -0.08);
  headMoss.rotation.y = -0.6;
  head.add(headMoss);

  const eyes = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeMat);
    e.position.set(s * 0.07, 0.02, -0.175);
    head.add(e);
    eyes.push(e);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xc6ff7a, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    glow.scale.set(0.16, 0.16, 1);
    glow.position.copy(e.position);
    head.add(glow);
    e.userData.glow = glow;
  }

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * 0.46, 2.42, 0.02);
    sh.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), fur));
    const upper = bone(0.72, 0.12, 0.1, fur, 12);
    sh.add(upper);
    tufts(upper, 6, 0.16, furDark, 0.12);
    const el = new THREE.Group();
    el.position.y = -0.72;
    sh.add(el);
    el.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), furDark));
    const fore = bone(0.78, 0.09, 0.07, fur, 12);
    el.add(fore);
    // bark on the forearm
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.06), bark);
    plate.position.set(s * 0.04, -0.28, -0.04);
    plate.rotation.z = s * 0.15;
    el.add(plate);
    const hand = new THREE.Group();
    hand.position.y = -0.78;
    el.add(hand);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), furDark);
    palm.scale.set(1.1, 0.7, 0.55);
    hand.add(palm);
    for (let f = 0; f < 4; f++) {
      const fg = bone(0.16 + (f === 1 || f === 2 ? 0.04 : 0), 0.018, 0.01, furDark, 6);
      fg.position.set((f - 1.5) * 0.03, -0.08, -0.02);
      fg.rotation.x = 0.25;
      fg.rotation.z = (f - 1.5) * 0.08;
      hand.add(fg);
    }
    const thumb = bone(0.1, 0.02, 0.012, furDark, 5);
    thumb.position.set(s * 0.06, -0.02, -0.02);
    thumb.rotation.z = s * 1.1;
    hand.add(thumb);
    body.add(sh);
    arms.push({ sh, el, side: s });
  }

  const fogTex = fogMap();
  const fogs = [];
  for (let i = 0; i < 7; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.28, color: 0xd5d8dc }));
    sp.userData.noAO = true;
    const ang = (i / 7) * Math.PI * 2;
    sp.position.set(Math.cos(ang) * 0.55, 0.7 + (i % 3) * 0.45, Math.sin(ang) * 0.4);
    sp.scale.set(1.15 + (i % 3) * 0.25, 0.7, 1);
    root.add(sp);
    fogs.push(sp);
  }

  let phase = Math.random() * 6;
  return {
    root, eyes, eyeMat, height: H,
    /** mode: stand | walk | sniff | crouch | run | reach ; eyesOn 0..1 */
    animate(mode, dt, t, eyesOn = 0) {
      const sniff = mode === "sniff";
      const crouch = mode === "crouch";
      const run = mode === "run";
      const reach = mode === "reach";
      const walk = mode === "walk";
      const moving = walk || run || crouch;
      const rate = run ? 2.55 : crouch ? 0.72 : walk ? 1.05 : 0;
      phase += dt * rate * Math.PI * 2;
      // heavy, slightly asymmetric stride: the left foot reaches farther and lands late
      legs.forEach((l, i) => {
        const o = i === 0 ? 0 : Math.PI * 0.84;
        const amp = (run ? 0.78 : crouch ? 0.32 : walk ? 0.46 : 0) * (i === 0 ? 1.12 : 0.88);
        const s = Math.sin(phase + o);
        l.hip.rotation.x = s * amp + (crouch ? 0.55 : 0.08);
        l.hip.rotation.z = l.side * (0.08 + Math.abs(s) * 0.05);
        l.kn.rotation.x = Math.max(0.05, -Math.cos(phase + o)) * amp * 1.2 + (crouch ? 0.85 : 0.12);
      });
      arms.forEach((a, i) => {
        const o = i === 0 ? Math.PI * 0.92 : 0.18;
        const s = Math.sin(phase + o);
        const swing = run ? 0.72 : crouch ? 0.16 : walk ? 0.5 : sniff ? 0.08 : 0.04;
        a.sh.rotation.x = 0.22 + s * swing + (reach ? -1.15 : crouch ? 0.55 : 0);
        a.sh.rotation.z = a.side * (0.16 + (i === 0 ? 0.06 : 0)) + s * 0.05;
        a.el.rotation.x = -0.55 - Math.max(0, s) * (run ? 0.45 : 0.28) + (reach ? -0.15 : 0);
      });
      const roll = Math.sin(phase) * (run ? 0.1 : walk ? 0.07 : crouch ? 0.03 : 0);
      body.rotation.z = roll + 0.045;
      body.rotation.y = Math.sin(phase * 0.5) * (walk ? 0.04 : 0);
      const breath = Math.sin(t * (run ? 3.4 : sniff ? 1.6 : 1.05));
      body.rotation.x = (crouch ? 0.78 : run ? 0.42 : sniff ? 0.5 : reach ? 0.48 : 0.24) + breath * 0.02;
      body.position.y = (crouch ? -0.48 : 0) + (moving ? Math.pow(Math.abs(Math.sin(phase)), 1.4) * (run ? 0.12 : 0.045) : breath * 0.012);
      body.position.x = roll * 0.15;
      // pauses, head turns, a sniff
      const idle = !moving;
      const sniffDip = sniff || (idle && Math.sin(t * 0.37) > 0.45);
      neck.rotation.x = sniffDip ? 0.62 + Math.sin(t * 2.2) * 0.06 : crouch ? 0.28 : run ? -0.08 : 0.06;
      neck.rotation.y = idle || sniff ? Math.sin(t * 0.31) * 0.55 : Math.sin(t * 0.45 + phase * 0.15) * 0.1;
      neck.rotation.z = Math.sin(t * 0.19) * 0.07 - roll * 0.3;
      chest.scale.y = 0.85 + breath * 0.04;
      snags.forEach((st, i) => {
        st.rotation.z += Math.sin(t * 1.3 + i) * 0.002;
      });
      const eye = eyesOn > 0.05 ? 0.25 + eyesOn * 0.75 : 0;
      eyeMat.opacity = eye;
      for (const e of eyes) if (e.userData.glow) e.userData.glow.material.opacity = eye * 0.85;
      fogs.forEach((sp, i) => {
        const a = t * 0.15 + i;
        const rad = 0.45 + (i % 3) * 0.18;
        sp.position.x = Math.cos(a + i) * rad;
        sp.position.z = Math.sin(a * 0.8 + i) * rad * 0.75;
        sp.position.y = 0.45 + (i % 4) * 0.38 + Math.sin(t * 0.6 + i) * 0.08;
        sp.material.opacity = 0.1 + (i % 3) * 0.04 + Math.sin(t * 0.8 + i) * 0.03;
      });
    },
  };
}
