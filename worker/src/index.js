// Collier Entertainment sign-in API (Cloudflare Worker + D1).
// Email magic link + 6-digit code, no passwords. Routes (an /api prefix also works):
//   POST /auth/start {email, return, updates}  email a one-time sign-in link and code
//   GET  /auth/verify?token=          sign in, set cookie, go back to the page they came from
//   POST /auth/verify {email, code}   sign in with the 6-digit code (iPhone home-screen app); returns {.., token}
//   GET  /me                          {email, member:true, updates, created} or 401 (the Club is free: signed in = member)
//   POST /account/updates {on}        turn email updates on/off
//   GET  /unsubscribe?token=          one-click unsubscribe (GET shows a page, POST is RFC 8058 one-click)
//   GET  /admin/subscribers.csv       opted-in list; needs header Authorization: Bearer <ADMIN_TOKEN>
//   POST /auth/logout                 sign out
//   POST /account/delete              delete the account and all its data
//   GET  /reactions?ids=a,b           public like counts + rating averages (+ your own if signed in)
//   POST /like {id, on}               like/unlike (sign-in required)
//   POST /rate {id, stars}            rate 1-5 (sign-in required, re-rating replaces)

const LINK_MINUTES = 15;
const MAX_CODE_TRIES = 5;
const SESSION_DAYS = 30;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;
const COOKIE = "__Host-ce_session";

const now = () => Math.floor(Date.now() / 1000);
const randomToken = () => btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
  .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const safeReturn = (r) => (typeof r === "string" && r.length < 300 && /^\/(?![\/\\])[^\s\\]*$/.test(r) ? r : "/account.html");

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function cors(env) {
  return {
    "Access-Control-Allow-Origin": env.SITE,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}
function json(env, data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...cors(env), ...extra } });
}
function redirect(location, setCookie) {
  const h = { Location: location, "Cache-Control": "no-store" };
  if (setCookie) h["Set-Cookie"] = setCookie;
  return new Response(null, { status: 303, headers: h });
}
const sessionCookie = (token, maxAge) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function currentUser(request, env) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  const b = (request.headers.get("Authorization") || "").match(/^Bearer\s+([A-Za-z0-9_-]{20,100})$/);
  const tok = (b && b[1]) || (m && m[1]);
  if (!tok) return null;
  return env.DB.prepare(
    "SELECT u.id, u.email, u.member, u.updates, u.created, s.token_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires > ?"
  ).bind(await sha256(tok), now()).first();
}

async function sendEmail(env, to, link, code) {
  const pretty = `${code.slice(0, 3)} ${code.slice(3)}`;
  const text = `Your Collier Entertainment sign-in code: ${pretty}\n\nType it in the app or on the sign-in page. Or tap this link to sign in:\n\n${link}\n\nThe code and link work once and expire in ${LINK_MINUTES} minutes. If you didn't ask for this, you can ignore this email.`;
  const html = `<div style="font-family:Georgia,serif;font-size:18px;line-height:1.5;color:#222">
<p style="font-size:22px"><b>Collier Entertainment</b></p>
<p>Your sign-in code:</p>
<p style="font-size:38px;letter-spacing:8px;font-weight:bold;font-family:Georgia,serif;margin:6px 0 18px">${pretty}</p>
<p>Type it in the app or on the sign-in page. Or tap the button to sign in.</p>
<p><a href="${link}" style="display:inline-block;background:#7a4a1c;color:#fff;padding:14px 24px;border-radius:6px;text-decoration:none;font-size:20px">Sign in</a></p>
<p>The code and link work once and expire in ${LINK_MINUTES} minutes. If you didn't ask for this, you can ignore this email.</p></div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject: `${pretty} is your Collier Entertainment sign-in code`, text, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
}

async function start(request, env) {
  let body = {};
  try { body = await request.json(); } catch {}
  const email = String(body.email || "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(env, { error: "Please enter a valid email address." }, 400);
  }
  const t = now();
  const ipHash = await sha256(request.headers.get("CF-Connecting-IP") || "unknown");
  await env.DB.prepare("DELETE FROM magic_links WHERE expires < ?").bind(t - 86400).run();
  const byEmail = await env.DB.prepare("SELECT COUNT(*) AS n FROM magic_links WHERE email = ? AND created > ?").bind(email, t - 900).first();
  const byIp = await env.DB.prepare("SELECT COUNT(*) AS n FROM magic_links WHERE ip_hash = ? AND created > ?").bind(ipHash, t - 3600).first();
  if (byEmail.n >= MAX_PER_EMAIL || byIp.n >= MAX_PER_IP) {
    return json(env, { error: "Too many tries. Please wait a few minutes and try again." }, 429);
  }
  const token = randomToken();
  const tokenHash = await sha256(token);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  await env.DB.prepare("UPDATE magic_links SET code_hash = NULL WHERE email = ? AND used = 0").bind(email).run();
  await env.DB.prepare("INSERT INTO magic_links (token_hash, email, ip_hash, return_to, created, expires, updates, code_hash, code_tries) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)")
    .bind(tokenHash, email, ipHash, safeReturn(body.return), t, t + LINK_MINUTES * 60, body.updates === true ? 1 : 0, await sha256(`${tokenHash}:${code}`)).run();
  try {
    await sendEmail(env, email, `${new URL(request.url).origin}/auth/verify?token=${token}`, code);
  } catch (e) {
    console.error(e.message);
    return json(env, { error: "We couldn't send the email. Please try again later." }, 502);
  }
  return json(env, { ok: true });
}

async function verify(request, env) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const t = now();
  const link = token && await env.DB.prepare(
    "UPDATE magic_links SET used = 1 WHERE token_hash = ? AND used = 0 AND expires > ? RETURNING email, return_to, updates"
  ).bind(await sha256(token), t).first();
  if (!link) return redirect(`${env.SITE}/account.html?signin=expired`);
  const { session } = await signInUser(env, link);
  return redirect(env.SITE + safeReturn(link.return_to), sessionCookie(session, SESSION_DAYS * 86400));
}

async function verifyCode(request, env) {
  let body = {};
  try { body = await request.json(); } catch {}
  const email = String(body.email || "").trim().toLowerCase();
  const code = String(body.code || "").replace(/\D/g, "");
  if (!email || code.length !== 6) return json(env, { error: "Enter the 6-digit code from the email." }, 400);
  const t = now();
  const link = await env.DB.prepare(
    "SELECT token_hash, code_hash, code_tries FROM magic_links WHERE email = ? AND used = 0 AND expires > ? AND code_hash IS NOT NULL ORDER BY created DESC LIMIT 1"
  ).bind(email, t).first();
  if (!link) return json(env, { error: "That code has expired. Tap Resend code for a new one." }, 400);
  if (link.code_tries >= MAX_CODE_TRIES) return json(env, { error: "Too many wrong tries. Tap Resend code for a new one." }, 429);
  const ok = await safeEqualHex(link.code_hash, await sha256(`${link.token_hash}:${code}`));
  if (!ok) {
    await env.DB.prepare("UPDATE magic_links SET code_tries = code_tries + 1 WHERE token_hash = ?").bind(link.token_hash).run();
    const left = MAX_CODE_TRIES - link.code_tries - 1;
    return json(env, { error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong tries. Tap Resend code for a new one." }, left > 0 ? 400 : 429);
  }
  const used = await env.DB.prepare(
    "UPDATE magic_links SET used = 1 WHERE token_hash = ? AND used = 0 RETURNING email, return_to, updates"
  ).bind(link.token_hash).first();
  if (!used) return json(env, { error: "That code was already used. Tap Resend code for a new one." }, 400);
  const { session, userId } = await signInUser(env, used);
  const u = await env.DB.prepare("SELECT email, updates, created FROM users WHERE id = ?").bind(userId).first();
  return json(env, { email: u.email, member: true, updates: !!u.updates, created: u.created, token: session }, 200,
    { "Set-Cookie": sessionCookie(session, SESSION_DAYS * 86400) });
}

// Create/find the user and start a session. Shared by the link and the code. Returns {session, userId}.
async function signInUser(env, link) {
  const t = now();
  const user = await env.DB.prepare(
    "INSERT INTO users (email, updates, updates_at, unsub_token) VALUES (?, ?, CASE WHEN ? = 1 THEN datetime('now') END, ?) " +
    "ON CONFLICT(email) DO UPDATE SET updates = MAX(users.updates, excluded.updates), " +
    "updates_at = CASE WHEN excluded.updates = 1 AND users.updates = 0 THEN datetime('now') ELSE users.updates_at END, " +
    "unsub_token = COALESCE(users.unsub_token, excluded.unsub_token) RETURNING id"
  ).bind(link.email, link.updates ? 1 : 0, link.updates ? 1 : 0, randomToken()).first();
  const session = randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(t),
    env.DB.prepare("INSERT INTO sessions (token_hash, user_id, expires) VALUES (?, ?, ?)").bind(await sha256(session), user.id, t + SESSION_DAYS * 86400),
  ]);
  return { session, userId: user.id };
}

const ITEM_RE = /^[a-z0-9][a-z0-9:_-]{0,79}$/;
async function reactions(request, env) {
  const ids = [...new Set((new URL(request.url).searchParams.get("ids") || "").split(",").map((s) => s.trim()).filter((s) => ITEM_RE.test(s)))].slice(0, 60);
  const out = {};
  if (!ids.length) return json(env, out);
  const q = ids.map(() => "?").join(",");
  const u = await currentUser(request, env);
  const [likes, rates, mine, mineR] = await env.DB.batch([
    env.DB.prepare(`SELECT item, COUNT(*) AS n FROM likes WHERE item IN (${q}) GROUP BY item`).bind(...ids),
    env.DB.prepare(`SELECT item, COUNT(*) AS n, AVG(stars) AS avg FROM ratings WHERE item IN (${q}) GROUP BY item`).bind(...ids),
    env.DB.prepare(`SELECT item FROM likes WHERE user_id = ? AND item IN (${q})`).bind(u ? u.id : -1, ...ids),
    env.DB.prepare(`SELECT item, stars FROM ratings WHERE user_id = ? AND item IN (${q})`).bind(u ? u.id : -1, ...ids),
  ]);
  for (const id of ids) out[id] = { likes: 0, ratings: 0, avg: 0 };
  for (const r of likes.results) out[r.item].likes = r.n;
  for (const r of rates.results) { out[r.item].ratings = r.n; out[r.item].avg = Math.round(r.avg * 10) / 10; }
  for (const r of mine.results) out[r.item].liked = true;
  for (const r of mineR.results) out[r.item].mine = r.stars;
  return json(env, out);
}
async function like(request, env) {
  const u = await currentUser(request, env);
  if (!u) return json(env, { error: "Sign in to like." }, 401);
  let b = {}; try { b = await request.json(); } catch {}
  const id = String(b.id || "");
  if (!ITEM_RE.test(id)) return json(env, { error: "Bad item." }, 400);
  if (b.on === false) await env.DB.prepare("DELETE FROM likes WHERE item = ? AND user_id = ?").bind(id, u.id).run();
  else await env.DB.prepare("INSERT OR IGNORE INTO likes (item, user_id, created) VALUES (?, ?, ?)").bind(id, u.id, now()).run();
  const c = await env.DB.prepare("SELECT COUNT(*) AS n FROM likes WHERE item = ?").bind(id).first();
  return json(env, { id, liked: b.on !== false, likes: c.n });
}
async function rate(request, env) {
  const u = await currentUser(request, env);
  if (!u) return json(env, { error: "Sign in to rate." }, 401);
  let b = {}; try { b = await request.json(); } catch {}
  const id = String(b.id || ""), stars = Number(b.stars);
  if (!ITEM_RE.test(id) || !Number.isInteger(stars) || stars < 1 || stars > 5) return json(env, { error: "Bad rating." }, 400);
  await env.DB.prepare("INSERT INTO ratings (item, user_id, stars, updated) VALUES (?, ?, ?, ?) ON CONFLICT(item, user_id) DO UPDATE SET stars = excluded.stars, updated = excluded.updated")
    .bind(id, u.id, stars, now()).run();
  const c = await env.DB.prepare("SELECT COUNT(*) AS n, AVG(stars) AS avg FROM ratings WHERE item = ?").bind(id).first();
  return json(env, { id, mine: stars, ratings: c.n, avg: Math.round(c.avg * 10) / 10 });
}

async function safeEqualHex(x, y) {
  if (typeof x !== "string" || typeof y !== "string" || x.length !== y.length) return false;
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}
async function safeEqual(a, b) {
  const [x, y] = await Promise.all([sha256(a), sha256(b)]);
  let d = 0; for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}
export function listUnsubscribeHeaders(origin, unsubToken) {
  const url = `${origin}/unsubscribe?token=${unsubToken}`;
  return { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname.replace(/^\/api(?=\/)/, "").replace(/\/+$/, "") || "/";
    const method = request.method;

    if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env) });
    if (method === "POST" && path !== "/unsubscribe" && request.headers.get("Origin") !== env.SITE) return json(env, { error: "Not allowed." }, 403);

    if (method === "POST" && path === "/auth/start") return start(request, env);
    if (method === "GET" && path === "/auth/verify") return verify(request, env);
    if (method === "POST" && path === "/auth/verify") return verifyCode(request, env);

    if (method === "GET" && path === "/reactions") return reactions(request, env);
    if (method === "POST" && path === "/like") return like(request, env);
    if (method === "POST" && path === "/rate") return rate(request, env);

    if (method === "GET" && path === "/me") {
      const u = await currentUser(request, env);
      if (!u) return json(env, { user: null }, 401);
      return json(env, { email: u.email, member: true, updates: !!u.updates, created: u.created });
    }

    if (method === "POST" && path === "/account/updates") {
      const u = await currentUser(request, env);
      if (!u) return json(env, { error: "Not signed in." }, 401);
      let b = {}; try { b = await request.json(); } catch {}
      const on = b.on === true ? 1 : 0;
      await env.DB.prepare("UPDATE users SET updates = ?, updates_at = datetime('now'), unsub_token = COALESCE(unsub_token, ?) WHERE id = ?")
        .bind(on, randomToken(), u.id).run();
      return json(env, { ok: true, updates: !!on });
    }

    if (path === "/unsubscribe" && (method === "GET" || method === "POST")) {
      const token = new URL(request.url).searchParams.get("token") || "";
      const res = token ? await env.DB.prepare("UPDATE users SET updates = 0, updates_at = datetime('now') WHERE unsub_token = ? RETURNING email").bind(token).first() : null;
      if (method === "POST") return new Response(null, { status: 204 });
      const msg = res ? "You're unsubscribed. You won't get any more update emails." : "That unsubscribe link isn't valid, but you can turn updates off on your account page.";
      return new Response(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:Georgia,serif;font-size:20px;max-width:520px;margin:3em auto;padding:0 1em;line-height:1.5"><h1>Collier Entertainment</h1><p>${msg}</p><p><a href="${env.SITE}/account.html">Your account</a></p></body>`,
        { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
    }

    if (method === "GET" && path === "/admin/subscribers.csv") {
      const auth = request.headers.get("Authorization") || "";
      if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24 || !(await safeEqual(auth, `Bearer ${env.ADMIN_TOKEN}`))) return new Response("Not allowed.", { status: 403 });
      const rows = await env.DB.prepare("SELECT email, updates_at, created, unsub_token FROM users WHERE updates = 1 ORDER BY updates_at").all();
      const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const origin = new URL(request.url).origin;
      const csv = "email,opted_in_at,signed_up,unsubscribe_url\n" + rows.results.map((r) => [r.email, r.updates_at, r.created, `${origin}/unsubscribe?token=${r.unsub_token}`].map(q).join(",")).join("\n") + "\n";
      return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="subscribers.csv"', "Cache-Control": "no-store" } });
    }

    if (method === "POST" && path === "/auth/logout") {
      const u = await currentUser(request, env);
      if (u) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(u.token_hash).run();
      return json(env, { ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
    }

    if (method === "POST" && path === "/account/delete") {
      const u = await currentUser(request, env);
      if (!u) return json(env, { error: "Not signed in." }, 401);
      await env.DB.batch([
        env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u.id),
        env.DB.prepare("DELETE FROM likes WHERE user_id = ?").bind(u.id),
        env.DB.prepare("DELETE FROM ratings WHERE user_id = ?").bind(u.id),
        env.DB.prepare("DELETE FROM magic_links WHERE email = ?").bind(u.email),
        env.DB.prepare("DELETE FROM users WHERE id = ?").bind(u.id),
      ]);
      return json(env, { ok: true, deleted: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
    }

    return json(env, { error: "Not found." }, 404);
  },
};
