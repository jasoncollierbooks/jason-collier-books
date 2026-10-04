/* Share the current page. Home uses the site line. Inner pages use the page title. */
(() => {
  const HOME_LINE = "Jason Collier — books, audiobooks and games";
  const icon = '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 15V4m0 0 4 4m-4-4L8 8M6 11v7a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-7"/></svg>';
  function payload() {
    const home = document.body.classList.contains("home");
    const label = home ? HOME_LINE : document.title;
    return { title: label, text: label, url: location.href };
  }
  function toast(message) {
    let el = document.getElementById("link-toast");
    if (!el) {
      el = document.createElement("p");
      el.id = "link-toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("on");
    clearTimeout(el._hide);
    el._hide = setTimeout(() => el.classList.remove("on"), 2200);
  }
  async function sharePage() {
    const data = payload();
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch (err) {
        if (err && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(data.url);
      toast("Link copied");
    } catch (err) {
      const field = document.createElement("textarea");
      field.value = data.url;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-999px";
      document.body.appendChild(field);
      field.select();
      try { document.execCommand("copy"); } catch (e) {}
      field.remove();
      toast("Link copied");
    }
  }
  const nav = document.getElementById("nav");
  if (nav && !nav.querySelector(".nav-share")) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-share";
    btn.setAttribute("aria-label", "Share");
    btn.innerHTML = icon;
    const toggle = nav.querySelector(".nav-toggle");
    if (toggle) nav.insertBefore(btn, toggle);
    else nav.appendChild(btn);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      sharePage();
    });
  }
  document.addEventListener("click", (e) => {
    const btn = e.target.closest && e.target.closest("[data-share]");
    if (!btn) return;
    e.preventDefault();
    sharePage();
  });
})();

(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // nav state
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', scrollY > 40);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();

  // scroll reveal only for content that starts below the fold
  const els = [...document.querySelectorAll('.reveal')];
  if (reduce || !('IntersectionObserver' in window)) els.forEach(e => e.classList.add('in'));
  else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const sibs = [...en.target.parentElement.querySelectorAll(':scope > .reveal')];
        en.target.style.transitionDelay = Math.min(sibs.indexOf(en.target), 6) * 80 + 'ms';
        en.target.classList.add('in'); io.unobserve(en.target);
      });
    }, {threshold:.12, rootMargin:'0px 0px -40px 0px'});
    els.forEach(e => {
      const r = e.getBoundingClientRect();
      const eager = e.closest('.hero, .home-books, .book-body, .cover-wrap');
      if (eager || (r.bottom > 0 && r.top < innerHeight * 0.98)) e.classList.add('in');
      else { e.classList.add('wait'); io.observe(e); }
    });
  }
  document.getElementById('y').textContent = new Date().getFullYear();

  // 3D tilt on covers
  if (!reduce && matchMedia('(hover:hover)').matches) {
    document.querySelectorAll('.tilt').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
      });
      el.addEventListener('mouseleave', () => el.style.transform = '');
    });
  }

  // particle canvases: embers / dust / stars / snow
  if (reduce) return;
  const cfg = {
    embers:{n:70, color:()=>`hsla(${20+Math.random()*25},100%,${55+Math.random()*20}%,`, size:[1,2.6], vy:[-.9,-.25], vx:[-.25,.25], flicker:true},
    dust:{n:45, color:()=>`hsla(35,70%,75%,`, size:[.6,1.8], vy:[-.1,.1], vx:[.15,.55], flicker:false},
    stars:{n:140, color:()=>Math.random()<.3?`hsla(270,90%,85%,`:`hsla(215,100%,88%,`, size:[.4,1.7], vy:[-.03,.03], vx:[-.03,.03], flicker:true},
    snow:{n:110, color:()=>`hsla(205,40%,96%,`, size:[.8,2.6], vy:[.3,1.1], vx:[-.3,.3], flicker:false},
  };
  const rnd = ([a,b]) => a + Math.random() * (b - a);
  document.querySelectorAll('canvas.fx').forEach(cv => {
    const c = cfg[cv.dataset.fx], ctx = cv.getContext('2d'); let W, H, ps = [], vis = false;
    const size = () => { const d = Math.min(devicePixelRatio||1, 2); W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W*d; cv.height = H*d; ctx.setTransform(d,0,0,d,0,0); };
    const mk = (init) => ({x:Math.random()*W, y:init?Math.random()*H:(c.vy[0]<0?H+5:-5), r:rnd(c.size), vx:rnd(c.vx), vy:rnd(c.vy), a:Math.random()*.7+.2, t:Math.random()*6.28, col:c.color()});
    size(); ps = Array.from({length:c.n}, () => mk(true));
    addEventListener('resize', size);
    new IntersectionObserver(([e]) => vis = e.isIntersecting).observe(cv);
    (function tick(){
      requestAnimationFrame(tick); if (!vis) return;
      ctx.clearRect(0,0,W,H);
      for (const p of ps) {
        p.t += .03; p.x += p.vx + (cv.dataset.fx==='snow'?Math.sin(p.t)*.3:0); p.y += p.vy;
        if (p.y < -10 || p.y > H+10 || p.x < -10 || p.x > W+10) Object.assign(p, mk(false), cv.dataset.fx==='dust'?{x:-5,y:Math.random()*H}:{});
        const a = c.flicker ? p.a * (.6 + .4*Math.sin(p.t*2)) : p.a;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283);
        ctx.fillStyle = p.col + a + ')';
        if (cv.dataset.fx==='embers'){ctx.shadowBlur=8;ctx.shadowColor='rgba(255,120,30,.8)'} else ctx.shadowBlur=0;
        ctx.fill();
      }
    })();
  });
})();


// art filters + fullscreen lightbox with prev/next (all galleries)
(() => {
  const btns = document.querySelectorAll('.art-filters button');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
    document.querySelectorAll('.art-item').forEach(it => it.classList.toggle('hide', b.dataset.f !== 'all' && it.dataset.cat !== b.dataset.f));
  }));
  const lb = document.getElementById('lightbox'); if (!lb) return;
  const img = lb.querySelector('img'), cap = lb.querySelector('p');
  let list = [], idx = 0, last = null;
  const pool = () => [...document.querySelectorAll('.art-item:not(.hide) img, .gallery img, .scene-strip img, .photo-item img')];
  const full = el => el.dataset.full || el.src;
  const show = i => { idx = (i + list.length) % list.length; const el = list[idx]; img.src = full(el); img.alt = el.alt;
    [list[(idx + 1) % list.length], list[(idx - 1 + list.length) % list.length]].forEach(n => { if (n && n.dataset.full) new Image().src = n.dataset.full; });
    cap.textContent = el.closest('figure')?.querySelector('figcaption')?.textContent || el.alt || ''; };
  const open = el => { last = el; list = pool(); show(list.indexOf(el)); lb.hidden = false; document.body.style.overflow = 'hidden'; lb.querySelector('.lb-close').focus(); };
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; last && last.focus(); };
  pool().forEach(el => { el.classList.add('zoomable'); el.tabIndex = 0; el.setAttribute('role','button');
    el.addEventListener('click', () => open(el)); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el); } }); });
  lb.querySelector('.lb-close').onclick = close;
  lb.querySelector('.lb-prev').onclick = e => { e.stopPropagation(); show(idx - 1); };
  lb.querySelector('.lb-next').onclick = e => { e.stopPropagation(); show(idx + 1); };
  lb.addEventListener('click', e => { if (e.target === lb) close(); });
  // phones: swipe left/right for next/previous, swipe down to close
  let tx = 0, ty = 0, multi = false;
  lb.addEventListener('touchstart', e => { multi = e.touches.length > 1; tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, {passive: true});
  lb.addEventListener('touchend', e => { if (multi || lb.hidden) return; const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(idx + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx) * 1.3) close(); }, {passive: true});
  addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(idx - 1); if (e.key === 'ArrowRight') show(idx + 1); });
})();

// GSAP scroll-driven parallax (progressive enhancement)
addEventListener('load', () => {
  if (document.body.classList.contains('broadcast')) return;
  if (!window.gsap || !window.ScrollTrigger || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.registerPlugin(ScrollTrigger);
  if (document.querySelector('.hero')) {
  gsap.to('.hero-slides', {yPercent: 10, ease: 'none', scrollTrigger: {trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true}});
  }
  document.querySelectorAll('.book').forEach(sec => {
    const title = sec.querySelector('.title');
    if (!title) return;
    gsap.fromTo(title, {letterSpacing: '.04em'}, {letterSpacing: '0em', ease: 'none', scrollTrigger: {trigger: sec, start: 'top 85%', end: 'top 30%', scrub: true}});
  });
  gsap.utils.toArray('.gallery figure, .art-item').forEach((el, i) =>
    gsap.from(el, {y: 40, opacity: 0, duration: .8, ease: 'power3.out', delay: (i % 4) * .06, scrollTrigger: {trigger: el, start: 'top 92%'}}));
  if (document.querySelector('.rusty-art')) gsap.fromTo('.rusty-art', {rotate: -2, y: 60}, {rotate: 1.5, y: -40, ease: 'none', scrollTrigger: {trigger: '.rusty', start: 'top bottom', end: 'bottom top', scrub: true}});
});

// collapsible excerpts
document.querySelectorAll('.excerpt').forEach((ex, i) => {
  const body = ex.querySelector('.excerpt-body'); if (!body || body.textContent.trim().startsWith('[')) return;
  ex.classList.add('collapsible'); body.id = body.id || 'excerpt-' + i;
  const b = document.createElement('button'); b.className = 'more'; b.type = 'button';
  b.setAttribute('aria-controls', body.id); b.setAttribute('aria-expanded', 'false'); b.textContent = 'Continue reading ↓';
  b.onclick = () => { const o = ex.classList.toggle('open'); b.setAttribute('aria-expanded', o); b.textContent = o ? 'Show less ↑' : 'Continue reading ↓'; };
  ex.appendChild(b);
});

/* Audiobook players: one video per player, a list of parts, auto-advance */
(() => {
  document.querySelectorAll('.audiobook').forEach(box => {
    const v = box.querySelector('.ab-player video');
    if (!v) return;
    const parts = [...box.querySelectorAll('.ab-part')].filter(p => p.dataset.src && !p.disabled);
    const title = box.querySelector('.ab-now span');
    const synopsis = box.querySelector('.ab-synopsis');
    const meta = box.querySelector('.ab-meta');
    let cur = 0;
    function load(i, autoplay) {
      if (i < 0 || i >= parts.length) return;
      cur = i;
      const b = parts[i];
      parts.forEach((p, j) => { p.classList.toggle('on', j === i); if (j === i) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current'); });
      v.poster = b.dataset.poster;
      v.src = b.dataset.src;
      v.setAttribute('aria-label', b.dataset.title);
      if (title) title.textContent = b.dataset.title;
      if (synopsis) synopsis.textContent = b.dataset.synopsis || '';
      if (meta) meta.textContent = b.dataset.meta || '';
      v.load();
      if (autoplay) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
    }
    parts.forEach((b, i) => b.addEventListener('click', () => load(i, true)));
    v.addEventListener('ended', () => { if (cur < parts.length - 1) load(cur + 1, true); });
  });
})();

/* Jang & Tom audiobook tabs: one visible book at a time */
(() => {
  const tabs = [...document.querySelectorAll('.ab-tabs [role="tab"]')];
  if (!tabs.length) return;
  function select(t, focus) {
    tabs.forEach(x => {
      const on = x === t, panel = document.getElementById(x.getAttribute('aria-controls'));
      x.classList.toggle('on', on); x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
      if (!panel) return;
      panel.hidden = !on;
      const v = panel.querySelector('video');
      if (v && !on && !v.paused) v.pause();
    });
    if (focus) t.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length], true); }
    });
  });
  const fromHash = () => { const t = tabs.find(x => '#' + x.getAttribute('aria-controls') === location.hash);
    if (t) { select(t); const s = document.getElementById('jang-and-tom'); if (s) s.scrollIntoView(); } };
  fromHash(); addEventListener('hashchange', fromHash);
})();

/* One visit count for the whole site. A milestone count may play a one-time intro. */
(() => {
  const el = document.querySelector('.visit-count');
  const SEEN = 'jc-milestone-intro';
  const milestoneSrc = (document.currentScript && document.currentScript.src)
    ? new URL('assets/video/milestone-intro.mp4', document.currentScript.src).href
    : '/jason-collier-books/assets/video/milestone-intro.mp4';
  let active = false;

  const seen = () => { try { return localStorage.getItem(SEEN) === '1'; } catch (e) { return true; } };
  const markSeen = () => { try { localStorage.setItem(SEEN, '1'); } catch (e) {} };
  const isMilestone = n => n === 100 || n === 250 || n === 500 || (n >= 1000 && n % 1000 === 0);
  const testCount = () => {
    try {
      const raw = new URLSearchParams(location.search).get('milestone-test');
      if (raw == null || !/^\d+$/.test(raw)) return null;
      const n = Number(raw);
      return Number.isSafeInteger(n) && n >= 1 ? n : null;
    } catch (e) { return null; }
  };

  function showMilestone(n, preview) {
    if (active) return;
    if (!preview && (seen() || !isMilestone(n))) return;
    let video;
    try { video = document.createElement('video'); } catch (e) { return; }
    active = true;
    let gone = false;
    let overlay = null;
    let onKey = null;
    const destroy = () => {
      if (gone) return;
      gone = true;
      clearTimeout(timer);
      if (onKey) document.removeEventListener('keydown', onKey);
      document.body.classList.remove('milestone-open');
      video.removeEventListener('error', onError);
      try { video.pause(); } catch (e) {}
      video.removeAttribute('src');
      if (overlay) overlay.remove();
      overlay = null;
    };
    const onError = () => destroy();
    const timer = setTimeout(destroy, 8000);
    video.preload = 'auto';
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.addEventListener('error', onError);
    video.addEventListener('canplay', () => {
      if (gone) return;
      clearTimeout(timer);
      if (!preview) markSeen();
      const label = "You're visitor #" + n.toLocaleString('en-US') + '!';
      overlay = document.createElement('div');
      overlay.className = 'milestone';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', label);
      const card = document.createElement('div');
      card.className = 'milestone-card';
      const title = document.createElement('h2');
      title.className = 'milestone-title';
      title.id = 'milestone-title';
      title.textContent = label;
      const stage = document.createElement('div');
      stage.className = 'milestone-stage';
      const unmute = document.createElement('button');
      unmute.type = 'button';
      unmute.className = 'btn btn-fire milestone-unmute';
      unmute.textContent = 'Unmute';
      unmute.hidden = true;
      const skip = document.createElement('button');
      skip.type = 'button';
      skip.className = 'btn btn-line milestone-skip';
      skip.textContent = 'Skip';
      skip.setAttribute('aria-label', 'Skip intro');
      stage.append(video, unmute);
      card.append(title, stage);
      overlay.append(card, skip);
      onKey = e => { if (e.key === 'Escape') { e.preventDefault(); destroy(); } };
      skip.addEventListener('click', destroy);
      video.addEventListener('ended', destroy);
      unmute.addEventListener('click', () => {
        video.muted = false;
        const again = video.play();
        if (again && again.catch) again.catch(() => {});
        unmute.hidden = true;
      });
      document.addEventListener('keydown', onKey);
      document.body.classList.add('milestone-open');
      document.body.appendChild(overlay);
      skip.focus();
      video.muted = false;
      const attempt = video.play();
      if (attempt && attempt.catch) attempt.catch(() => {
        if (gone) return;
        video.muted = true;
        unmute.hidden = false;
        const retry = video.play();
        if (retry && retry.catch) retry.catch(() => { if (!gone) destroy(); });
      });
    }, {once:true});
    video.src = milestoneSrc;
  }

  const preview = testCount();
  if (preview != null) showMilestone(preview, true);

  if (!el || !window.fetch) return;
  fetch('https://countapi.mileshilliard.com/api/v1/hit/jasoncollierbooks-site')
    .then(r => r.ok ? r.json() : Promise.reject())
    .then(data => {
      const n = Math.floor(Number(data && data.value));
      if (!Number.isFinite(n) || n < 0) return;
      el.textContent = 'Visitors: ' + n.toLocaleString('en-US');
      el.hidden = false;
      if (preview == null) showMilestone(n, false);
    })
    .catch(() => {});
})();

/* Grouped nav: hover on a fine pointer, click or tap, and keyboard */
(() => {
  const nav = document.getElementById('nav');
  if (!nav || document.body.classList.contains('broadcast')) return;
  const btn = nav.querySelector('.nav-toggle');
  const groups = [...nav.querySelectorAll('.nav-group')];
  const desktop = () => matchMedia('(min-width: 861px)').matches;
  const closeGroups = (except) => {
    groups.forEach(g => {
      if (g === except) return;
      g.classList.remove('is-open');
      const b = g.querySelector('.nav-label');
      if (b) b.setAttribute('aria-expanded', 'false');
    });
  };
  const setMenu = (open) => {
    nav.classList.toggle('open', open);
    if (!btn) return;
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    if (!open) closeGroups();
  };
  if (btn) btn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  groups.forEach(g => {
    const b = g.querySelector('.nav-label');
    const links = [...g.querySelectorAll('.nav-menu a')];
    if (!b) return;
    b.addEventListener('click', () => {
      const willOpen = !g.classList.contains('is-open');
      closeGroups(willOpen ? g : null);
      g.classList.toggle('is-open', willOpen);
      b.setAttribute('aria-expanded', String(willOpen));
    });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      closeGroups(g);
      g.classList.add('is-open');
      b.setAttribute('aria-expanded', 'true');
      if (links[0]) links[0].focus();
    });
    links.forEach((a, i) => a.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); links[(i + 1) % links.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); (i === 0 ? b : links[i - 1]).focus(); }
      if (e.key === 'Escape') { closeGroups(); b.focus(); }
    }));
  });
  nav.querySelectorAll('.nav-menu a, a.nav-link').forEach(a => a.addEventListener('click', () => {
    closeGroups();
    if (!desktop()) setMenu(false);
  }));
  document.addEventListener('click', e => { if (!nav.contains(e.target)) { closeGroups(); if (!desktop()) setMenu(false); } });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const openGroup = groups.find(g => g.classList.contains('is-open'));
    if (openGroup) {
      const b = openGroup.querySelector('.nav-label');
      closeGroups();
      if (b) b.focus();
      return;
    }
    if (nav.classList.contains('open')) { setMenu(false); if (btn) btn.focus(); }
  });
  addEventListener('resize', () => { if (desktop()) setMenu(false); });
})();
