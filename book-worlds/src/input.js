// WASD / arrows move. Mouse or touch-drag looks. Buttons and keys share one edge queue.
export function createInput(root) {
  const keys = new Set();
  const pressed = {
    attack: false, dodge: false, jump: false, flash: false, magic: false, lock: false, use: false, potion: false,
    guard: false, devil: false, mend: false, special: false, cycle: false, recenter: false,
    lasso: false, steam: false, pulse: false, firelight: false, argon: false,
  };
  let guardPointer = false;
  const st = {
    mx: 0,
    my: 0,
    lookDX: 0,
    lookDY: 0,
    enabled: true,
  };
  let stickId = null;
  let stickCX = 0;
  let stickCY = 0;
  const lookIds = new Map();
  const stickEl = document.getElementById("stick");
  const knobEl = document.getElementById("knob");

  const isUI = (el) => el && el.closest && el.closest("button, a, .ui, .story");

  const swallow = (el) => {
    if (!el) return;
    const block = (e) => { if (e.cancelable) e.preventDefault(); };
    el.addEventListener("touchstart", block, { passive: false });
    el.addEventListener("touchmove", block, { passive: false });
    el.addEventListener("contextmenu", block);
  };
  swallow(document.getElementById("view"));
  swallow(document.getElementById("actions"));
  swallow(document.getElementById("cmd"));
  swallow(document.getElementById("stick"));
  swallow(document.getElementById("settings"));
  swallow(document.getElementById("settings-btn"));
  swallow(document.getElementById("tutor"));
  swallow(document.getElementById("rotate-hint"));
  swallow(document.getElementById("abilities"));
  swallow(document.getElementById("home-pin"));
  swallow(document.getElementById("leave"));
  root.addEventListener("selectstart", (e) => e.preventDefault());
  root.addEventListener("gesturestart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
  root.addEventListener("gesturechange", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });

  root.addEventListener("pointerdown", (e) => {
    if (!st.enabled || isUI(e.target)) return;
    const rect = root.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const stickZone = e.pointerType !== "mouse" && x < rect.width * 0.5;
    if (stickZone && stickId == null) {
      stickId = e.pointerId;
      stickCX = e.clientX;
      stickCY = e.clientY;
      stickEl.style.left = `${x - stickEl.clientWidth / 2}px`;
      stickEl.style.top = `${y - stickEl.clientHeight / 2}px`;
      stickEl.classList.add("on");
    } else {
      lookIds.set(e.pointerId, { x: e.clientX, y: e.clientY, moved: 0, button: e.button });
    }
    try { root.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
  });

  root.addEventListener("pointermove", (e) => {
    if (e.pointerId === stickId) {
      let dx = e.clientX - stickCX;
      let dy = e.clientY - stickCY;
      const r = Math.max(46, stickEl.clientWidth / 2);
      const d = Math.hypot(dx, dy) || 1;
      if (d > r) { dx *= r / d; dy *= r / d; }
      knobEl.style.transform = `translate(${dx}px, ${dy}px)`;
      st.mx = dx / r;
      st.my = -dy / r;
    } else if (lookIds.has(e.pointerId)) {
      const p = lookIds.get(e.pointerId);
      const dx = e.clientX - p.x;
      const dy = e.clientY - p.y;
      p.moved += Math.abs(dx) + Math.abs(dy);
      st.lookDX += dx;
      st.lookDY += dy;
      p.x = e.clientX;
      p.y = e.clientY;
    }
  });

  const end = (e) => {
    if (e.pointerId === stickId) {
      stickId = null;
      st.mx = st.my = 0;
      knobEl.style.transform = "translate(0px, 0px)";
      stickEl.classList.remove("on");
      stickEl.style.left = "";
      stickEl.style.top = "";
    }
    if (lookIds.has(e.pointerId)) {
      const p = lookIds.get(e.pointerId);
      lookIds.delete(e.pointerId);
      if (st.enabled && p.button === 0 && p.moved < 7 && e.pointerType === "mouse") pressed.attack = true;
    }
  };
  root.addEventListener("pointerup", end);
  root.addEventListener("pointercancel", end);

  const mapKey = (k) => {
    if (k === "j") return "attack";
    if (k === "shift") return "dodge";
    if (k === " ") return "jump";
    if (k === "f") return "flash";
    if (k === "q") return "magic";
    if (k === "l") return "lock";
    if (k === "enter") return "use";
    if (k === "tab") return "cycle";
    if (k === "e") return "use";
    if (k === "r" || k === "1") return "potion";
    if (k === "2") return "devil";
    if (k === "3") return "mend";
    if (k === "4") return "special";
    if (k === "g") return "guard";
    if (k === "c") return "recenter";
    if (k === "v") return "lasso";
    if (k === "x") return "steam";
    if (k === "z") return "pulse";
    if (k === "h") return "firelight";
    if (k === "y") return "argon";
    return null;
  };
  window.addEventListener("keydown", (e) => {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "tab", "enter"].includes(k)) e.preventDefault();
    if (!st.enabled) return;
    if (!keys.has(k)) {
      const slot = mapKey(k);
      if (slot) pressed[slot] = true;
    }
    keys.add(k);
  });
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener("blur", () => keys.clear());

  document.querySelectorAll("[data-act]").forEach((btn) => {
    const slot = btn.getAttribute("data-act");
    const fire = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (slot === "guard") guardPointer = true;
      else if (st.enabled && pressed[slot] != null) pressed[slot] = true;
    };
    btn.addEventListener("pointerdown", fire);
    if (slot === "guard") {
      const up = (e) => { guardPointer = false; e.stopPropagation(); };
      btn.addEventListener("pointerup", up);
      btn.addEventListener("pointercancel", up);
      btn.addEventListener("pointerleave", up);
    }
  });

  st.axes = () => {
    let fwd = st.my;
    let strafe = st.mx;
    if (keys.has("w") || keys.has("arrowup")) fwd = 1;
    if (keys.has("s") || keys.has("arrowdown")) fwd = Math.min(fwd, -1);
    if (keys.has("d") || keys.has("arrowright")) strafe = 1;
    if (keys.has("a") || keys.has("arrowleft")) strafe = strafe === 1 ? strafe : -1;
    if ((keys.has("a") || keys.has("arrowleft")) && (keys.has("d") || keys.has("arrowright"))) strafe = st.mx;
    return { fwd, strafe };
  };
  st.pull = () => {
    const edge = { ...pressed };
    for (const k of Object.keys(pressed)) pressed[k] = false;
    return edge;
  };
  st.press = (slot) => {
    if (st.enabled && pressed[slot] != null) pressed[slot] = true;
  };
  st.held = () => ({ guard: keys.has("g") || guardPointer });
  st.consumeLook = () => {
    const d = { dx: st.lookDX, dy: st.lookDY };
    st.lookDX = st.lookDY = 0;
    return d;
  };
  return st;
}
