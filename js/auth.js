/* Collier Entertainment sign-in helper (email sign-in link).
   window.CollierAuth = { user, isMember, status, ready, onChange(fn), start(email, returnPath), logout(), deleteAccount() }
   status: "loading" | "in" | "out" | "offline" (sign-in service not set up yet or unreachable) */
(function () {
  var API = "https://api.collierentertainment.com";
  var subs = [];
  var A = window.CollierAuth = {
    API: API, user: null, isMember: false, status: "loading",
    onChange: function (fn) { subs.push(fn); if (A.status !== "loading") fn(A); },
    start: function (email, ret) { return post("/auth/start", { email: email, "return": ret || location.pathname + location.search }); },
    logout: function () { return post("/auth/logout").then(function () { set(null, "out"); }); },
    deleteAccount: function () { return post("/account/delete").then(function () { set(null, "out"); }); }
  };
  function set(user, status) {
    A.user = user; A.isMember = !!(user && user.member); A.status = status;
    subs.forEach(function (fn) { try { fn(A); } catch (e) {} });
  }
  function post(path, body) {
    return fetch(API + path, {
      method: "POST", credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) throw new Error(j.error || "Something went wrong. Please try again.");
        return j;
      });
    });
  }
  A.ready = fetch(API + "/me", { credentials: "include" }).then(function (r) {
    if (r.status === 401) return set(null, "out");
    if (!r.ok) return set(null, "offline");
    return r.json().then(function (u) { set(u, "in"); });
  }).catch(function () { set(null, "offline"); });
})();
