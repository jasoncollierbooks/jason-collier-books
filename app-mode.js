/* App mode. When a site page is shown inside the Collier Entertainment app
   (the app's in-app viewer, a ?app=1 link, or an installed home-screen app),
   outside links (Amazon, X, the games, anything off this site) open in the
   phone's own browser, and the Venmo tip link is hidden. On the normal
   website nothing changes. */
(function () {
  var app = false;
  try { if (/[?&]app=1(&|#|$)/.test(location.search)) app = true; } catch (e) {}
  try {
    if (!app && window.top !== window.self && /^\/app\//.test(window.parent.location.pathname)) app = true;
  } catch (e) {}
  try {
    if (!app && (matchMedia("(display-mode: standalone)").matches || navigator.standalone === true)) app = true;
  } catch (e) {}
  window.CE_APP_MODE = app;
  if (!app) return;

  var root = document.documentElement;
  root.classList.add("ce-app");
  var css = document.createElement("style");
  css.textContent = '.ce-app a[href*="venmo.com"],.ce-app .tip-line,.ce-app .web-only{display:none!important}';
  (document.head || root).appendChild(css);

  function outside(a) {
    var h = a.getAttribute("href");
    if (!h) return false;
    try {
      var u = new URL(h, location.href);
      return (u.protocol === "http:" || u.protocol === "https:") && u.origin !== location.origin;
    } catch (e) { return false; }
  }
  function fix(a) {
    if (!outside(a)) return;
    a.target = "_blank";
    var rel = (a.getAttribute("rel") || "").split(/\s+/).filter(Boolean);
    if (rel.indexOf("noopener") < 0) rel.push("noopener");
    a.setAttribute("rel", rel.join(" "));
  }
  function sweep() { document.querySelectorAll("a[href]").forEach(fix); }

  /* Links added later by scripts get fixed the moment they are tapped. */
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (a) fix(a);
  }, true);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", sweep);
  else sweep();
})();
