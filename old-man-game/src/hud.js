// DOM HUD: compass strip, objective + distance, labels, waypoint, buttons, toasts, overlays.
import { PLACES, PLACE_IDS } from "./terrain.js";
import { clamp, fmtClock, wrapPi } from "./util.js";

const $ = (id) => document.getElementById(id);

export function createHud() {
  const el = {
    day: $("hudDay"), clock: $("hudClock"), obj: $("hudObjective"), nerve: $("hudNerve"), warn: $("hudWarn"), line: $("hudLine"),
    status: $("hudStatus"), ctx: $("ctxBtns"), toast: $("toast"), compass: $("compass"), labels: $("labels"), wp: $("waypoint"),
    overlay: $("overlay"), card: $("overlayCard"), sheet: $("sheet"), fear: $("fear"), flash: $("flash"), keyhint: $("keyhint"),
    optic: $("optic"), opticLabel: $("opticLabel"), opticRange: $("opticRange"), opticFill: $("opticFill"),
  };
  // film grain tile, generated once
  {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    const img = g.createImageData(256, 256);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    $("grain").style.backgroundImage = `url(${c.toDataURL()})`;
  }
  const labelEls = {};
  for (const id of PLACE_IDS) {
    const d = document.createElement("div");
    d.className = "plabel";
    d.innerHTML = `${PLACES[id].short}<small></small>`;
    el.labels.appendChild(d);
    labelEls[id] = d;
  }
  let lastLine = "", lineTimer = 0, ctxKey = "", thoughtTimer = 0;

  const hud = {
    el,
    setTop(day, minutes, phase, night) {
      el.day.textContent = `DAY ${day}`;
      el.clock.textContent = `${fmtClock(minutes)} · ${phase}`;
      el.clock.classList.toggle("night", night);
    },
    setObjective(text, dist, urgent) {
      const d = dist == null ? "" : `<small>${dist < 1000 ? Math.round(dist / 5) * 5 + " m" : (dist / 1000).toFixed(1) + " km"}</small>`;
      const html = `${text}${d}`;
      if (el.obj.innerHTML !== html) el.obj.innerHTML = html;
      el.obj.style.color = urgent ? "#ff8a5a" : "";
    },
    setNerve(h) {
      el.nerve.style.width = `${clamp(h, 0, 100)}%`;
      el.nerve.classList.toggle("low", h < 35);
    },
    setWarn(text, hot) {
      if (el.warn.textContent !== text) el.warn.textContent = text || "";
      el.warn.classList.toggle("hot", !!hot);
    },
    setLine(text, now, ms) {
      if (!text) {
        lastLine = "";
        el.line.textContent = "";
        el.line.classList.remove("show");
        lineTimer = 0;
        return;
      }
      const dur = ms || Math.max(5200, Math.min(16000, (text || "").length * 68));
      if (text && (text !== lastLine || ms)) {
        lastLine = text;
        el.line.textContent = text;
        el.line.classList.add("show");
        lineTimer = now + Math.max(4200, dur);
      }
      if (lineTimer && now > lineTimer) {
        el.line.classList.remove("show");
        lineTimer = 0;
      }
    },
    thought(text, now, ms = 4200) {
      const node = $("thought");
      if (!node) return;
      node.textContent = text || "";
      node.classList.add("show");
      thoughtTimer = now + (ms > 400 ? ms : 4200);
    },
    tickThought(now) {
      if (thoughtTimer && now > thoughtTimer) {
        $("thought")?.classList.remove("show");
        thoughtTimer = 0;
      }
    },
    status(text) { if (el.status.textContent !== text) el.status.textContent = text; },
    /** context buttons: [{id,label,key}] */
    setCtx(list, onTap) {
      const key = list.map((b) => b.id + b.label).join("|");
      if (key === ctxKey) return;
      ctxKey = key;
      el.ctx.innerHTML = "";
      for (const b of list) {
        const btn = document.createElement("button");
        btn.className = "btn ctx";
        btn.innerHTML = `${b.label}${b.key ? `<kbd>${b.key}</kbd>` : ""}`;
        btn.addEventListener("click", (e) => { e.stopPropagation(); onTap(b.id); });
        el.ctx.appendChild(btn);
      }
    },
    toast(title, text) {
      el.toast.innerHTML = `<b>${title}</b>${text ? `<p>${text}</p>` : ""}`;
      el.toast.classList.remove("show");
      void el.toast.offsetWidth;
      el.toast.classList.add("show");
    },
    fear(k) { el.fear.style.opacity = String(clamp(k, 0, 1)); },
    flash(a = 1, ms = 600) {
      el.flash.style.transition = "none";
      el.flash.style.opacity = String(a);
      requestAnimationFrame(() => {
        el.flash.style.transition = `opacity ${ms}ms ease-out`;
        el.flash.style.opacity = "0";
      });
    },
    /** compass: yaw = camera yaw; markers [{x,z,label,color,kind}] relative to player at px,pz; wind arrow */
    compass(yaw, px, pz, markers, wind) {
      const c = el.compass;
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
      if (!w || !h) return;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const g = c.getContext("2d");
      g.clearRect(0, 0, w, h);
      const span = Math.PI * 0.9;
      // bearing of world direction (dx,dz): yaw convention forward=(-sin,-cos)
      const bearingX = (b) => w / 2 + (wrapPi(yaw - b) / span) * w;
      const fade = g.createLinearGradient(0, 0, w, 0);
      fade.addColorStop(0, "rgba(8,9,12,0)");
      fade.addColorStop(0.18, "rgba(8,9,12,0.5)");
      fade.addColorStop(0.82, "rgba(8,9,12,0.5)");
      fade.addColorStop(1, "rgba(8,9,12,0)");
      g.fillStyle = fade;
      g.fillRect(0, h * 0.52, w, h * 0.4);
      g.textAlign = "center";
      g.textBaseline = "middle";
      const cards = [["N", 0], ["NE", -Math.PI / 4], ["E", -Math.PI / 2], ["SE", (-3 * Math.PI) / 4], ["S", Math.PI], ["SW", (3 * Math.PI) / 4], ["W", Math.PI / 2], ["NW", Math.PI / 4]];
      for (let i = 0; i < 24; i++) {
        const b = (i / 24) * Math.PI * 2;
        const x = bearingX(b);
        if (x < 0 || x > w) continue;
        g.fillStyle = "rgba(236,230,218,0.35)";
        g.fillRect(x - dpr * 0.5, h * 0.66, dpr, h * 0.12);
      }
      g.font = `600 ${Math.round(11 * dpr)}px "Barlow Condensed", sans-serif`;
      for (const [t, b] of cards) {
        const x = bearingX(b);
        if (x < 8 || x > w - 8) continue;
        g.fillStyle = t === "N" ? "rgba(236,230,218,0.95)" : "rgba(236,230,218,0.6)";
        g.fillText(t, x, h * 0.72);
      }
      // centre tick
      g.fillStyle = "rgba(236,230,218,0.9)";
      g.beginPath(); g.moveTo(w / 2, h * 0.52); g.lineTo(w / 2 - 4 * dpr, h * 0.44); g.lineTo(w / 2 + 4 * dpr, h * 0.44); g.fill();
      // markers
      g.font = `600 ${Math.round(10.5 * dpr)}px "Barlow Condensed", sans-serif`;
      for (const mk of markers) {
        const dx = mk.x - px, dz = mk.z - pz;
        const b = Math.atan2(-dx, -dz);
        let x = bearingX(b);
        const off = x < 10 * dpr || x > w - 10 * dpr;
        x = clamp(x, 10 * dpr, w - 10 * dpr);
        g.fillStyle = mk.color;
        if (off) {
          g.beginPath();
          const s = x < w / 2 ? -1 : 1;
          g.moveTo(x + s * 6 * dpr, h * 0.72); g.lineTo(x - s * 3 * dpr, h * 0.6); g.lineTo(x - s * 3 * dpr, h * 0.84); g.fill();
        } else if (mk.kind === "diamond") {
          g.save(); g.translate(x, h * 0.72); g.rotate(Math.PI / 4); g.fillRect(-4 * dpr, -4 * dpr, 8 * dpr, 8 * dpr); g.restore();
        } else {
          g.beginPath(); g.arc(x, h * 0.72, 3.2 * dpr, 0, 7); g.fill();
        }
        if (mk.label && !off) g.fillText(mk.label, x, h * 0.25);
      }
      // wind: a small arrow at the right end showing where the air goes
      if (wind) {
        const b = Math.atan2(-wind[0], -wind[1]);
        const a = wrapPi(b - yaw);
        g.save();
        g.translate(w - 12 * dpr, h * 0.25);
        g.rotate(-a);
        g.strokeStyle = "rgba(169,193,220,0.8)";
        g.lineWidth = 1.5 * dpr;
        g.beginPath(); g.moveTo(0, 6 * dpr); g.lineTo(0, -6 * dpr); g.moveTo(-3 * dpr, -2 * dpr); g.lineTo(0, -6 * dpr); g.lineTo(3 * dpr, -2 * dpr); g.stroke();
        g.restore();
      }
    },
    labels(project, px, pz, show) {
      const used = [];
      for (const id of PLACE_IDS) {
        const P = PLACES[id];
        const d = Math.hypot(P.x - px, P.z - pz);
        const L = labelEls[id];
        if (!show || d > 140 || d < 9) { L.style.display = "none"; continue; }
        const s = project(P.x, P.y + 6, P.z);
        if (s.behind || s.x < -40 || s.x > innerWidth + 40) { L.style.display = "none"; continue; }
        let y = s.y;
        for (const u of used) if (Math.abs(u.x - s.x) < 90 && Math.abs(u.y - y) < 30) y = u.y - 32;
        used.push({ x: s.x, y });
        L.style.display = "block";
        L.style.left = `${s.x}px`;
        L.style.top = `${y}px`;
        L.style.opacity = String(clamp(1 - (d - 60) / 80, 0.35, 0.95));
        L.lastChild.textContent = `${Math.round(d / 5) * 5} m`;
      }
    },
    waypoint(s, label, dist) {
      if (!s || s.behind || dist < 10) { el.wp.style.display = "none"; return; }
      el.wp.style.display = "block";
      const x = clamp(s.x, 24, innerWidth - 24), y = clamp(s.y, 90, innerHeight - 140);
      el.wp.style.left = `${x}px`;
      el.wp.style.top = `${y}px`;
      el.wp.style.opacity = String(clamp((dist - 10) / 15, 0, 1));
      el.wp.lastChild.textContent = label;
    },
    overlay(html, opts = {}) {
      el.card.innerHTML = html;
      el.overlay.classList.remove("hidden");
      el.overlay.classList.toggle("clear", !!opts.clear);
      return el.card;
    },
    closeOverlay() { el.overlay.classList.add("hidden"); el.card.innerHTML = ""; },
    get overlayOpen() { return !el.overlay.classList.contains("hidden"); },
    sheet(html) { el.sheet.innerHTML = html; el.sheet.classList.remove("hidden"); },
    closeSheet() { el.sheet.classList.add("hidden"); },
    get sheetOpen() { return !el.sheet.classList.contains("hidden"); },
  };
  return hud;
}
