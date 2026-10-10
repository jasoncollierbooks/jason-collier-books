/* Collier Entertainment sign-in helper (email sign-in link).
   window.CollierAuth = { user, isMember, status, ready, onChange(fn), start(email, returnPath), logout(), deleteAccount() }
   status: "loading" | "in" | "out" | "offline" (sign-in service not set up yet or unreachable) */
(function () {
  var API = "https://api.collierentertainment.com";
  var subs = [];
  var A = window.CollierAuth = {
    API: API, user: null, isMember: false, status: "loading",
    onChange: function (fn) { subs.push(fn); if (A.status !== "loading") fn(A); },
    start: function (email, ret, updates) { return post("/auth/start", { email: email, "return": ret || location.pathname + location.search, updates: !!updates }); },
    /* 6-digit code from the email (for the iPhone home-screen app, where the emailed link opens Safari). */
    verify: function (email, code) {
      return post("/auth/verify", { email: email, code: code }).then(function (u) {
        if (u.token) { try { localStorage.setItem(TOKEN_KEY, u.token); } catch (e) {} }
        delete u.token; set(u, "in"); return u;
      });
    },
    /* Re-check who is signed in (e.g. after signing in inside the app frame). */
    refresh: function () { return check(); },
    /* Extra headers for API calls: the saved session token, if any (fallback when cookies don't stick). */
    headers: function (h) { h = h || {}; var t = token(); if (t) h.Authorization = "Bearer " + t; return h; },
    setUpdates: function (on) { return post("/account/updates", { on: !!on }); },
    logout: function () { return post("/auth/logout").then(function () { clearToken(); set(null, "out"); }); },
    deleteAccount: function () { return post("/account/delete").then(function () { clearToken(); set(null, "out"); }); }
  };
  var TOKEN_KEY = "ce-token";
  function token() { try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; } }
  function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function set(user, status) {
    A.user = user; A.status = status;
    /* The Pine Knot Club is free: every signed-in visitor is a member. */
    A.isMember = status === "in";
    /* Lightweight flag so station breaks (commercials.js) can skip members on any page without calling the API. */
    try {
      if (status === "in") localStorage.setItem("ce-member", String(Date.now() + 30 * 864e5));
      else if (status === "out") localStorage.removeItem("ce-member");
    } catch (e) {}
    subs.forEach(function (fn) { try { fn(A); } catch (e) {} });
  }
  function post(path, body) {
    return fetch(API + path, {
      method: "POST", credentials: "include",
      headers: A.headers(body ? { "Content-Type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again.");
        return j;
      });
    });
  }
  function check() {
    return fetch(API + "/me", { credentials: "include", headers: A.headers() }).then(function (r) {
    if (r.status === 401) { if (token()) clearToken(); return set(null, "out"); }
    if (!r.ok) return set(null, "offline");
    return r.json().then(function (u) { set(u, "in"); });
  }).catch(function () { set(null, "offline"); });
  }
  A.ready = check();
})();
