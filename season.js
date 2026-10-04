/* Seasonal look from the visitor's month. Override with ?season=halloween|thanksgiving|christmas. */
(function () {
  var override = "";
  try { override = new URLSearchParams(window.location.search).get("season") || ""; }
  catch (e) {}
  var season = "";
  if (override === "halloween" || override === "thanksgiving" || override === "christmas") season = override;
  else {
    var month = new Date().getMonth();
    if (month === 9) season = "halloween";
    else if (month === 10) season = "thanksgiving";
    else if (month === 11) season = "christmas";
  }
  if (!season) return;
  document.documentElement.classList.add("season-" + season);

  var LEAF = {
    halloween: ["#e3943c", "#d85a28", "#a34b22"],
    thanksgiving: ["#e07a2a", "#c4472a", "#8d5a2b", "#b86a32"]
  };

  function still() {
    if (document.documentElement.classList.contains("reduce-motion")) return true;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  function spawn(kind, w, h, colors) {
    if (kind === "leaf") {
      return { kind: kind, x: rand(0, w), y: rand(0, h), s: rand(6, 11), vy: rand(14, 26), sway: rand(10, 20), spin: rand(-0.7, 0.7), rot: rand(0, 6.28), t: rand(0, 6), a: rand(0.4, 0.62), color: pick(colors) };
    }
    if (kind === "bat") {
      return { kind: kind, x: rand(0, w), y: rand(h * 0.06, h * 0.78), s: rand(0.7, 1), vx: rand(18, 32) * (Math.random() < 0.5 ? -1 : 1), phase: rand(0, 6.28), a: rand(0.42, 0.6) };
    }
    return { kind: kind, x: rand(0, w), y: rand(0, h), s: rand(0.7, 1.9), vy: rand(10, 24), sway: rand(8, 18), t: rand(0, 6), a: rand(0.32, 0.62) };
  }

  function drawLeaf(ctx, p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -p.s);
    ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.15, p.s * 0.75, p.s * 0.45, 0, p.s);
    ctx.bezierCurveTo(-p.s * 0.75, p.s * 0.45, -p.s * 0.95, -p.s * 0.15, 0, -p.s);
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 42, 16, .4)";
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, -p.s * 0.65);
    ctx.lineTo(0, p.s * 0.7);
    ctx.stroke();
    ctx.restore();
  }

  function drawBat(ctx, p, time) {
    var flap = Math.sin(time * 7 + p.phase);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.scale(p.s, p.s);
    if (p.vx < 0) ctx.scale(-1, 1);
    ctx.globalAlpha = p.a;
    ctx.fillStyle = "#2a2436";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-6, -7 - flap * 3, -12, -1);
    ctx.quadraticCurveTo(-7, -1, -3, 2);
    ctx.quadraticCurveTo(-1.5, 0.4, 0, 0);
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(6, -7 - flap * 3, 12, -1);
    ctx.quadraticCurveTo(7, -1, 3, 2);
    ctx.quadraticCurveTo(1.5, 0.4, 0, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0.4, 1.7, 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSnow(ctx, p) {
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.fillStyle = "#fffaf2";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function Field(host) {
    var canvas = document.createElement("canvas");
    canvas.className = "season-field";
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    this.canvas = canvas;
    this.host = host;
    this.ctx = canvas.getContext("2d");
    this.parts = [];
    this.w = 1;
    this.h = 1;
    this.resize();
    this.seed();
  }

  Field.prototype.resize = function () {
    var rect = this.host.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  Field.prototype.seed = function () {
    var colors = LEAF[season] || LEAF.halloween;
    var plan = season === "christmas" ? { leaf: 0, bat: 0, snow: 8 } : season === "halloween" ? { leaf: 3, bat: 2, snow: 0 } : { leaf: 4, bat: 0, snow: 0 };
    var kind, n, i;
    this.parts = [];
    for (kind in plan) {
      for (i = 0, n = plan[kind]; i < n; i++) this.parts.push(spawn(kind, this.w, this.h, colors));
    }
  };

  Field.prototype.step = function (dt, time) {
    var ctx = this.ctx, w = this.w, h = this.h, i, p;
    ctx.clearRect(0, 0, w, h);
    for (i = 0; i < this.parts.length; i++) {
      p = this.parts[i];
      if (p.kind === "leaf") {
        p.t += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(p.t * 1.3) * p.sway * dt;
        p.rot += p.spin * dt;
        if (p.y > h + 14) { p.y = -14; p.x = rand(0, w); }
        if (p.x < -14) p.x = w + 14;
        if (p.x > w + 14) p.x = -14;
        drawLeaf(ctx, p);
      } else if (p.kind === "bat") {
        p.x += p.vx * dt;
        p.y += Math.sin(time * 1.4 + p.phase) * 8 * dt;
        if (p.x < -18) p.x = w + 18;
        if (p.x > w + 18) p.x = -18;
        if (p.y < 6) p.y = 6;
        if (p.y > h - 6) p.y = h - 6;
        drawBat(ctx, p, time);
      } else {
        p.t += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(p.t) * p.sway * dt;
        if (p.y > h + 4) { p.y = -4; p.x = rand(0, w); }
        drawSnow(ctx, p);
      }
    }
  };

  function boot() {
    if (still()) return;
    var hosts = document.querySelectorAll(".hero .testcard, .hero .scene");
    if (!hosts.length) return;
    var fields = [];
    var i;
    for (i = 0; i < hosts.length; i++) fields.push(new Field(hosts[i]));
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function () {
        for (i = 0; i < fields.length; i++) fields[i].resize();
      });
      for (i = 0; i < hosts.length; i++) ro.observe(hosts[i]);
    } else {
      window.addEventListener("resize", function () {
        for (i = 0; i < fields.length; i++) fields[i].resize();
      });
    }
    var last = 0;
    var on = true;
    document.addEventListener("visibilitychange", function () { on = document.visibilityState !== "hidden"; });
    function frame(now) {
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (on) {
        for (var n = 0; n < fields.length; n++) fields[n].step(dt, now / 1000);
      }
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
