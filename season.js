/* Seasonal look from the visitor's local date.
   Windows: Halloween Oct 1–31, Thanksgiving Nov 1–30, Christmas Dec 1–26,
   New Year Dec 27–Jan 7, 4th of July Jun 25–Jul 7. Otherwise none.
   Override: ?season=halloween|thanksgiving|christmas|newyear|july4
   Christmas is vintage Santa (no religious symbols). Halloween is 80s–90s
   trick-or-treat paper decorations. Book Worlds is left alone. */
(function () {
  var path = "";
  try { path = location.pathname || ""; } catch (e) {}
  if (/(^|\/)book-worlds(\/|$)/.test(path)) return;

  var override = "";
  try { override = (new URLSearchParams(location.search).get("season") || "").toLowerCase(); }
  catch (e) {}

  var NAMES = { halloween: 1, thanksgiving: 1, christmas: 1, newyear: 1, july4: 1 };

  function seasonFor(date) {
    var m = date.getMonth();
    var d = date.getDate();
    if (m === 9) return "halloween";
    if (m === 10) return "thanksgiving";
    if (m === 11 && d <= 26) return "christmas";
    if ((m === 11 && d >= 27) || (m === 0 && d <= 7)) return "newyear";
    if ((m === 5 && d >= 25) || (m === 6 && d <= 7)) return "july4";
    return "";
  }

  function newYearNumber(date) {
    var y = date.getFullYear();
    return date.getMonth() === 0 ? y : y + 1;
  }

  var now = new Date();
  var season = NAMES[override] ? override : seasonFor(now);
  if (!season) return;

  var year = newYearNumber(now);
  var root = document.documentElement;
  root.classList.add("season-" + season);

  var RIBBON = {
    halloween: "Happy Halloween",
    thanksgiving: "Happy Thanksgiving",
    christmas: "Merry Christmas",
    newyear: "Happy New Year " + year,
    july4: "Happy 4th of July"
  };

  function still() {
    if (root.classList.contains("reduce-motion")) return true;
    try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
    catch (e) { return false; }
  }
  function smallScreen() {
    try { return window.matchMedia("(max-width: 760px)").matches; }
    catch (e) { return true; }
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(list) { return list[(Math.random() * list.length) | 0]; }
  function uri(svg) {
    return "url(\"data:image/svg+xml," + encodeURIComponent(svg) + "\")";
  }
  function svg(body, box) {
    return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 " + box + "\" aria-hidden=\"true\" focusable=\"false\">" + body + "</svg>";
  }

  var PUMPKIN = svg(
    "<ellipse cx=\"16\" cy=\"33.2\" rx=\"7.5\" ry=\"2\" fill=\"rgba(255,150,40,.45)\"/>" +
    "<path fill=\"#2f7a32\" d=\"M16 3.6c.5 1.8 1.7 2.8 3.1 3-1.3.2-2.1 0-2.8-1-.6 1.1-1.6 1.3-2.7 1.1 1-.6 1.6-1.6 2.4-3.1z\"/>" +
    "<path fill=\"#ff7a18\" d=\"M16 7.4c-2.2 0-3.2.9-3.6 1.8C8.8 10.2 6 13.2 6 18.8 6 24.8 10.2 30 16 30s10-5.2 10-11.2c0-5.6-2.8-8.6-6.4-9.6-.4-.9-1.4-1.8-3.6-1.8z\"/>" +
    "<path fill=\"#ffb15a\" d=\"M13.2 12.2c.8 1.4.5 5.2 0 8.2-1.2-.6-2-2.2-2-4.2 0-1.8.7-3.2 2-4z\"/>" +
    "<path fill=\"#ff9a3c\" d=\"M16 9c.4 2 .5 6.2.2 14.6-1.8-.3-3-2.8-3-7.4 0-3.4 1-6 2.8-7.2z\"/>" +
    "<path fill=\"#2a140c\" d=\"M11.2 16.4h2.3l-1.15 2.3zm7.3 0H20.8l-1.15 2.3zM12.8 22.4c1 1.5 6.2 1.5 7.2 0-1 .9-5.2.9-6.2 0z\"/>",
    "32 36"
  );
  var GHOST = svg(
    "<rect x=\"11\" y=\"1\" width=\"10\" height=\"3.2\" rx=\".4\" fill=\"#f4efe4\" transform=\"rotate(-8 16 2)\"/>" +
    "<path fill=\"#f7f4ee\" d=\"M6 15.5C6 9 10 4.2 16 4.2S26 9 26 15.5V31l-3.3-2.6L19.2 31l-3.2-2.6L12.6 31 9.3 28.2 6 31z\"/>" +
    "<ellipse cx=\"12.2\" cy=\"16\" rx=\"1.7\" ry=\"2.3\" fill=\"#1a1024\"/>" +
    "<ellipse cx=\"19.6\" cy=\"16\" rx=\"1.7\" ry=\"2.3\" fill=\"#1a1024\"/>" +
    "<ellipse cx=\"16\" cy=\"21.2\" rx=\"1.7\" ry=\"2.2\" fill=\"#1a1024\"/>",
    "32 34"
  );
  var CAT = svg(
    "<circle cx=\"18\" cy=\"20\" r=\"13\" fill=\"#ff8a1e\"/>" +
    "<path fill=\"#1a1024\" d=\"M8.5 16.5 11 8.5l3.2 4.2L18 7.2l3.6 5.4 3.3-4.2 2.4 8.2c2.4 1.6 3.6 4 3.2 6.4-1.6 2.2-5 3.2-8.2 2.4-1.2 2.4-3.2 3.6-5.6 3.6-3.4 0-6-2.2-6.6-5.2-2.2-.4-4-2.2-4.2-4.6.2-2.2 1.4-3.8 3-4.7z\"/>" +
    "<path fill=\"#1a1024\" d=\"M24 22c2.2 1.2 4.6 1 6.4-.2-1.2 2.6-3.6 4.8-6.2 5.2-.2-1.8-.2-3.4-.2-5z\"/>" +
    "<circle cx=\"14.2\" cy=\"17.2\" r=\"1.15\" fill=\"#ffe14a\"/>" +
    "<circle cx=\"21.2\" cy=\"17.2\" r=\"1.15\" fill=\"#ffe14a\"/>" +
    "<path fill=\"#ff8a1e\" d=\"M17.2 19.2h1.6l-.8 1.5z\"/>",
    "36 36"
  );
  var CANDY = svg(
    "<path fill=\"#ffe14a\" d=\"M9 1 15.2 15H2.8z\"/>" +
    "<path fill=\"#ff8a1e\" d=\"M9 15 5.1 6.2h7.8z\"/>" +
    "<path fill=\"#fff\" d=\"M9 15 6.7 10.2h4.6z\"/>",
    "18 16"
  );
  var SKELLY = svg(
    "<circle cx=\"16\" cy=\"8\" r=\"5.2\" fill=\"#f4f1ea\"/>" +
    "<circle cx=\"14\" cy=\"7.4\" r=\"1\" fill=\"#1a1024\"/>" +
    "<circle cx=\"18\" cy=\"7.4\" r=\"1\" fill=\"#1a1024\"/>" +
    "<path d=\"M14.2 10.2c.8.8 2.8.8 3.6 0\" stroke=\"#1a1024\" stroke-width=\"0.8\" fill=\"none\"/>" +
    "<path stroke=\"#f4f1ea\" stroke-width=\"1.7\" stroke-linecap=\"round\" fill=\"none\" d=\"M16 13.2v12M16 16.5H9.5M16 16.5h6.5M16 24.5l-4 6M16 24.5l4 6M9.5 16.5l-2.5-3M23 16.5l2.5-3\"/>",
    "32 34"
  );
  var GOURD = svg(
    "<path fill=\"#6d8a3a\" d=\"M16 4c.4 2 1.3 3.1 2.4 3.3-1 .2-1.7 0-2.2-.9-.4.9-1.1 1.1-2 .9.8-.5 1.3-1.5 1.8-3.3z\"/>" +
    "<path fill=\"#c46a32\" d=\"M16 8.2c-3.2 0-5.2 2-5.2 4.4 0 1.7 1.2 2.8 2.3 3.4-2.5.8-4.3 2.7-4.3 5.6C8.8 25.6 12 29 16 29s7.2-3.4 7.2-7.4c0-2.9-1.8-4.8-4.3-5.6 1.1-.6 2.3-1.7 2.3-3.4 0-2.4-2-4.4-5.2-4.4z\"/>" +
    "<path fill=\"rgba(255,255,255,.2)\" d=\"M13.2 12.2c.6 1.2.4 4 0 6-1-.4-1.7-1.5-1.7-3 0-1.4.6-2.4 1.7-3z\"/>",
    "32 32"
  );
  var WHEAT = svg(
    "<path stroke=\"#d4b15a\" stroke-width=\"1.3\" fill=\"none\" d=\"M16 30V8\"/>" +
    "<g fill=\"#e6c56a\"><ellipse cx=\"16\" cy=\"8\" rx=\"2.1\" ry=\"3.2\"/>" +
    "<ellipse cx=\"11.6\" cy=\"12\" rx=\"2\" ry=\"2.8\" transform=\"rotate(-30 11.6 12)\"/>" +
    "<ellipse cx=\"20.4\" cy=\"12\" rx=\"2\" ry=\"2.8\" transform=\"rotate(30 20.4 12)\"/>" +
    "<ellipse cx=\"11.4\" cy=\"16.6\" rx=\"1.8\" ry=\"2.6\" transform=\"rotate(-28 11.4 16.6)\"/>" +
    "<ellipse cx=\"20.6\" cy=\"16.6\" rx=\"1.8\" ry=\"2.6\" transform=\"rotate(28 20.6 16.6)\"/>" +
    "<ellipse cx=\"12\" cy=\"21\" rx=\"1.7\" ry=\"2.3\" transform=\"rotate(-22 12 21)\"/>" +
    "<ellipse cx=\"20\" cy=\"21\" rx=\"1.7\" ry=\"2.3\" transform=\"rotate(22 20 21)\"/></g>",
    "32 32"
  );
  var HORN = svg(
    "<path fill=\"#c47a32\" d=\"M4 26c8 2 14-1 16-8 1.2-4-.4-8 2.2-10.2C26.6 5.6 33 7 35 11c1 2.2-.2 4.2-2.4 4.2-6.2.2-8.4 5.6-10.6 10C19.2 30.6 12 33 4 30.2 6 29.2 5 27.4 4 26z\"/>" +
    "<circle cx=\"28\" cy=\"10\" r=\"3.6\" fill=\"#ff8a2a\"/>" +
    "<circle cx=\"34\" cy=\"14\" r=\"2.6\" fill=\"#7a3db8\"/>" +
    "<circle cx=\"30\" cy=\"16.2\" r=\"2.2\" fill=\"#6fa84a\"/>" +
    "<path fill=\"#e6c56a\" d=\"M22 13c2.2-4 3.2-6.2 2-8.2-2.2 2.2-3.4 5.2-4.2 8.2z\"/>" +
    "<circle cx=\"24.5\" cy=\"11\" r=\"2\" fill=\"#e23b3b\"/>",
    "40 36"
  );
  var SANTA = svg(
    "<path fill=\"#d32f2f\" d=\"M8 20 22 3l8 17z\"/>" +
    "<circle cx=\"22\" cy=\"4.2\" r=\"3\" fill=\"#fff\"/>" +
    "<rect x=\"6\" y=\"17\" width=\"28\" height=\"5.5\" rx=\"2.6\" fill=\"#fff\"/>" +
    "<circle cx=\"20\" cy=\"28\" r=\"8.2\" fill=\"#f3c2a0\"/>" +
    "<circle cx=\"16.6\" cy=\"26.4\" r=\"1\" fill=\"#3a2418\"/>" +
    "<circle cx=\"23.2\" cy=\"26.4\" r=\"1\" fill=\"#3a2418\"/>" +
    "<circle cx=\"20\" cy=\"29.2\" r=\"1.35\" fill=\"#e09a86\"/>" +
    "<path fill=\"#fff\" d=\"M11.5 30.5c1.2 7 5.6 11 8.5 11s7.4-4 8.6-11c-2.2 2.6-5.4 4-8.6 4s-6.4-1.4-8.5-4z\"/>" +
    "<path fill=\"#fff\" d=\"M14.2 31.2c2 1.8 3.8 1.6 5.8 0 2 1.6 3.8 1.8 5.8 0-1.6.8-3.6.4-5.8.4s-4.2.4-5.8-.4z\"/>" +
    "<path fill=\"#c62828\" d=\"M6 44c1.2-6.2 5.4-9 14-9s12.8 2.8 14 9z\"/>" +
    "<rect x=\"18.2\" y=\"36.5\" width=\"3.6\" height=\"7.5\" fill=\"#fff\"/>",
    "44 46"
  );
  var TREE = svg(
    "<path fill=\"#1f7a34\" d=\"M16 3 27 16h-5l8 11H6l8-11H9z\"/>" +
    "<rect x=\"13.5\" y=\"27\" width=\"5\" height=\"6\" rx=\".4\" fill=\"#6b3e1e\"/>" +
    "<circle cx=\"16\" cy=\"5.2\" r=\"2\" fill=\"#f0d060\"/>" +
    "<circle cx=\"12.5\" cy=\"15\" r=\"1.7\" fill=\"#e53935\"/>" +
    "<circle cx=\"20\" cy=\"18\" r=\"1.7\" fill=\"#f0d060\"/>" +
    "<circle cx=\"14.5\" cy=\"23\" r=\"1.6\" fill=\"#f4f1ea\"/>" +
    "<circle cx=\"21\" cy=\"24\" r=\"1.5\" fill=\"#e53935\"/>",
    "32 36"
  );
  var CANE = svg(
    "<path d=\"M9 34V16a7 7 0 0 1 14 0\" fill=\"none\" stroke=\"#f7f4ee\" stroke-width=\"4.2\" stroke-linecap=\"round\"/>" +
    "<path d=\"M9 34V16a7 7 0 0 1 14 0\" fill=\"none\" stroke=\"#d32f2f\" stroke-width=\"4.2\" stroke-linecap=\"butt\" stroke-dasharray=\"3.1 3.1\"/>",
    "28 36"
  );
  var PRESENT = svg(
    "<rect x=\"4\" y=\"12\" width=\"24\" height=\"16\" rx=\"1\" fill=\"#c62828\"/>" +
    "<rect x=\"13.4\" y=\"12\" width=\"5.2\" height=\"16\" fill=\"#f0d060\"/>" +
    "<rect x=\"4\" y=\"17.6\" width=\"24\" height=\"4.2\" fill=\"#f0d060\"/>" +
    "<path fill=\"#f0d060\" d=\"M16 12c-3.6-5.2-9-3.4-7.2.4 1.8 1 4.4.8 7.2-.4zM16 12c3.6-5.2 9-3.4 7.2.4-1.8 1-4.4.8-7.2-.4z\"/>",
    "32 32"
  );
  var STOCKING = svg(
    "<path fill=\"#c62828\" d=\"M7 12h12v12l5.2 5.2V33H14.2l-2.2-4.2V12z\"/>" +
    "<path fill=\"#a31f1f\" d=\"M19 24.2 24.2 29.2V33H19z\"/>" +
    "<rect x=\"7\" y=\"6\" width=\"12\" height=\"7\" rx=\"1\" fill=\"#f7f4ee\"/>",
    "32 36"
  );
  var BELL = svg(
    "<rect x=\"14\" y=\"1.5\" width=\"2.4\" height=\"3\" fill=\"#f0d78a\"/>" +
    "<path fill=\"#e4b84a\" d=\"M15.2 5.2c-6 .8-8.2 6.4-8.2 11.2v3.2h16.4v-3.2c0-4.8-2.2-10.4-8.2-11.2z\"/>" +
    "<rect x=\"5\" y=\"19.4\" width=\"18.4\" height=\"3\" rx=\"1.2\" fill=\"#f6e2a2\"/>" +
    "<circle cx=\"14.2\" cy=\"25.2\" r=\"2.2\" fill=\"#e4b84a\"/>",
    "28 28"
  );
  var WEB = svg(
    "<g fill=\"none\" stroke=\"#f3efe6\" stroke-width=\"1.35\" stroke-linecap=\"round\">" +
    "<path d=\"M2 2 62 26M2 2 56 56M2 2 26 62M2 2 62 8M2 2 8 62\"/>" +
    "<path d=\"M16 4c8 10-2 20-12 14M32 6c12 16-8 34-26 26M46 10c12 20-10 40-34 34\"/>" +
    "</g>",
    "64 64"
  );
  var HOLLY = svg(
    "<path fill=\"#1f7a34\" d=\"M16 17C10 15 5.5 9 8 5.2 12.2 7.4 14.4 12 16 14.2 17.6 12 19.8 7.4 24 5.2 26.5 9 22 15 16 17z\"/>" +
    "<path fill=\"#2e9b45\" d=\"M16 19.2C12.2 22 8 26.2 10.2 30c3.6-1.6 5.2-5.2 5.8-8.2.6 3 2.2 6.6 5.8 8.2C24 26.2 19.8 22 16 19.2z\"/>" +
    "<circle cx=\"16\" cy=\"17.2\" r=\"2.3\" fill=\"#e53935\"/>" +
    "<circle cx=\"11.6\" cy=\"15.4\" r=\"1.7\" fill=\"#d32f2f\"/>" +
    "<circle cx=\"20.4\" cy=\"15.6\" r=\"1.7\" fill=\"#ef5350\"/>",
    "32 32"
  );
  var LEAF = svg(
    "<path fill=\"#e07a2a\" d=\"M16 2c6 6 11 12 0 28C5 14 10 8 16 2z\"/>" +
    "<path fill=\"none\" stroke=\"#8a3e12\" stroke-width=\"1.1\" d=\"M16 6v20M16 12 10 15M16 16l6 4M16 21l-5 3\"/>",
    "32 32"
  );
  var SPARK = svg(
    "<path fill=\"#f0d060\" d=\"M16 1 18.6 12.4 30 16 18.6 19.6 16 31 13.4 19.6 2 16 13.4 12.4z\"/>" +
    "<path fill=\"#fff6d0\" d=\"M16 7.2 17.5 14.2 24.2 16 17.5 17.8 16 24.8 14.5 17.8 7.8 16 14.5 14.2z\"/>",
    "32 32"
  );
  var STAR = svg(
    "<path fill=\"#f7f4ea\" d=\"M16 2.2 19.9 11.4 29.6 12.4 22.2 18.6 24.5 28.2 16 23.1 7.5 28.2 9.8 18.6 2.4 12.4 12.1 11.4z\"/>",
    "32 32"
  );
  var MOON_WITCH = svg(
    "<circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#f6e7b2\"/>" +
    "<circle cx=\"18\" cy=\"28\" r=\"5\" fill=\"#ead89a\"/>" +
    "<circle cx=\"76\" cy=\"30\" r=\"5.4\" fill=\"#e4cc8c\"/>" +
    "<circle cx=\"62\" cy=\"88\" r=\"3.6\" fill=\"#f4e7c2\"/>" +
    "<g fill=\"#241628\">" +
    "<path d=\"M39 11 L26 41 L53 37 Z\"/>" +
    "<path d=\"M10 45 L68 33.5 L70.4 39.6 L12.4 51.1 Z\"/>" +
    "<circle cx=\"43\" cy=\"50.5\" r=\"7\"/>" +
    "<path d=\"M48.6 47 L59.2 50.6 L49 53.4 Z\"/>" +
    "<path d=\"M46 54 L54.8 57.6 L47.4 55.6 Z\"/>" +
    "<path d=\"M37 54 L21 49 L8 61 L15 73 L31 63 L39 57 Z\"/>" +
    "<path d=\"M37 58 L50 56 L54 71 L45 79 L28 75 L18 84 L32 71 Z\"/>" +
    "<path d=\"M49.8 61.6 L77.8 65.6 L78.2 62.4 L50.2 58.4 Z\"/>" +
    "<path d=\"M40.3 73.6 L74.3 67.1 L73.7 63.9 L39.7 70.4 Z\"/>" +
    "<path d=\"M12.5 83.7 L88.5 62.7 L87.5 59.3 L11.5 80.3 Z\"/>" +
    "<path d=\"M72 57.2 L86 54.2 L88.2 61.6 L74.2 64.6 Z\"/>" +
    "<path d=\"M79.7 64.3 L82.3 49.5 L78.9 48.9 L76.3 63.7 Z\"/>" +
    "<path d=\"M79.4 65.1 L89.8 51.7 L87.1 49.5 L76.6 62.9 Z\"/>" +
    "<path d=\"M78.7 65.6 L93.8 58.9 L92.4 55.7 L77.3 62.4 Z\"/>" +
    "<path d=\"M77.8 65.7 L93.2 67.4 L93.6 63.9 L78.2 62.3 Z\"/>" +
    "<path d=\"M77 65.4 L88.7 73.9 L90.8 71.1 L79 62.6 Z\"/>" +
    "<path d=\"M44 76 L41.5 83.5 L54 81.6 L51 74.6 Z\"/>" +
    "</g>",
    "100 100"
  );
  var MOON_SLEIGH = svg(
    "<circle cx=\"62\" cy=\"48\" r=\"40\" fill=\"#f4efe4\"/>" +
    "<circle cx=\"48\" cy=\"38\" r=\"7\" fill=\"#e6dcc8\"/>" +
    "<circle cx=\"74\" cy=\"56\" r=\"9\" fill=\"#e4d8c2\"/>" +
    "<g fill=\"#2a2118\">" +
    "<ellipse cx=\"28\" cy=\"58\" rx=\"12\" ry=\"5\"/>" +
    "<path d=\"M38 55 48 44l3 2-8 12z\"/>" +
    "<ellipse cx=\"52\" cy=\"43\" rx=\"6\" ry=\"3.6\"/>" +
    "<path stroke=\"#2a2118\" stroke-width=\"1.3\" fill=\"none\" stroke-linecap=\"round\" d=\"M48 40.5 46 32M48 35.5 43 34M49 34.5 54 29\"/>" +
    "<path stroke=\"#2a2118\" stroke-width=\"1.5\" fill=\"none\" stroke-linecap=\"round\" d=\"M20 61 17 72M26 63 25 74M34 62 36 73\"/>" +
    "</g>" +
    "<path fill=\"#c62828\" d=\"M70 62h22c4 0 6 3 5 6H74c-3 0-5-2.4-4-6z\"/>" +
    "<path stroke=\"#e4c56a\" stroke-width=\"1.6\" fill=\"none\" stroke-linecap=\"round\" d=\"M66 70h36\"/>" +
    "<circle cx=\"86\" cy=\"56\" r=\"4.2\" fill=\"#f3c2a0\"/>" +
    "<path fill=\"#c62828\" d=\"M82 54 86 46l5 8z\"/>" +
    "<circle cx=\"86\" cy=\"46.2\" r=\"1.6\" fill=\"#fff\"/>" +
    "<path fill=\"#fff\" d=\"M82.2 57.5c.6 2.4 2.2 3.6 3.8 3.6s3.2-1.2 3.8-3.6c-1 .8-2.4 1.2-3.8 1.2s-2.8-.4-3.8-1.2z\"/>",
    "120 100"
  );
  var LEAF_BUNCH = svg(
    "<ellipse cx=\"34\" cy=\"40\" rx=\"16\" ry=\"8\" fill=\"#c4472a\" transform=\"rotate(-28 34 40)\"/>" +
    "<ellipse cx=\"58\" cy=\"34\" rx=\"15\" ry=\"7\" fill=\"#e07a2a\" transform=\"rotate(18 58 34)\"/>" +
    "<ellipse cx=\"48\" cy=\"54\" rx=\"14\" ry=\"7\" fill=\"#d4a017\" transform=\"rotate(-8 48 54)\"/>" +
    "<path stroke=\"#6b3a18\" stroke-width=\"1.4\" fill=\"none\" d=\"M20 70c10-12 22-22 40-28\"/>" +
    "<circle cx=\"70\" cy=\"48\" r=\"7\" fill=\"#e07a28\"/>" +
    "<path fill=\"#2f7a32\" d=\"M70 40c.3 1.4 1.2 2.2 2.2 2.4-1 .2-1.6 0-2.1-.8-.4.8-1 .9-1.8.7.7-.4 1.1-1.2 1.7-2.3z\"/>",
    "88 78"
  );
  var BURST_GOLD = svg(
    "<g fill=\"none\" stroke-linecap=\"round\">" +
    "<path stroke=\"#f0d060\" stroke-width=\"2\" d=\"M40 8v10M40 62V52M8 40h10M72 40H62M16 16l7 7M64 64l-7-7M64 16l-7 7M16 64l7-7\"/>" +
    "<circle cx=\"40\" cy=\"40\" r=\"6\" fill=\"#f6e2a4\" stroke=\"none\"/>" +
    "<circle cx=\"40\" cy=\"40\" r=\"2.4\" fill=\"#fff\" stroke=\"none\"/>" +
    "<path stroke=\"#d5d8e0\" stroke-width=\"1.4\" d=\"M40 20v6M40 54v6M22 40h6M52 40h6\"/>" +
    "</g>",
    "80 80"
  );
  var BURST_RWB = svg(
    "<g fill=\"none\" stroke-linecap=\"round\">" +
    "<path stroke=\"#e23b3b\" stroke-width=\"2.1\" d=\"M40 6v12M18 18l8 8M62 62l-8-8\"/>" +
    "<path stroke=\"#f4f1ea\" stroke-width=\"2.1\" d=\"M40 74V62M6 40h12M74 40H62\"/>" +
    "<path stroke=\"#3d5bd9\" stroke-width=\"2.1\" d=\"M18 62l8-8M62 18l-8 8\"/>" +
    "<circle cx=\"40\" cy=\"40\" r=\"5.5\" fill=\"#f4f1ea\" stroke=\"none\"/>" +
    "<circle cx=\"40\" cy=\"40\" r=\"2.6\" fill=\"#3d5bd9\" stroke=\"none\"/>" +
    "</g>",
    "80 80"
  );

  var TRIM = {
    halloween: svg("<path fill=\"#ffe14a\" d=\"M9 1 15.2 15H2.8z\"/><path fill=\"#ff8a1e\" d=\"M9 15 5.1 6.2h7.8z\"/><path fill=\"#fff\" d=\"M9 15 6.7 10.2h4.6z\"/>", "18 16"),
    thanksgiving: svg(
      "<path d=\"M0 7 Q8 14 16 7 T32 7 T48 7\" fill=\"none\" stroke=\"#6b3a18\" stroke-width=\"1.5\"/>" +
      "<ellipse cx=\"10\" cy=\"8\" rx=\"5\" ry=\"3\" fill=\"#e07a2a\" transform=\"rotate(-24 10 8)\"/>" +
      "<ellipse cx=\"27\" cy=\"9\" rx=\"5\" ry=\"3\" fill=\"#c4472a\" transform=\"rotate(16 27 9)\"/>" +
      "<ellipse cx=\"44\" cy=\"7\" rx=\"4.6\" ry=\"2.8\" fill=\"#d4a017\" transform=\"rotate(-12 44 7)\"/>",
      "54 16"
    ),
    christmas: svg(
      "<path d=\"M0 4h48\" stroke=\"#3a3228\" stroke-width=\"1.15\"/>" +
      "<circle cx=\"8\" cy=\"10\" r=\"3.3\" fill=\"#e53935\"/><circle cx=\"8\" cy=\"9\" r=\"1.05\" fill=\"#fff\" opacity=\".8\"/>" +
      "<circle cx=\"24\" cy=\"10\" r=\"3.3\" fill=\"#2e9b45\"/><circle cx=\"24\" cy=\"9\" r=\"1.05\" fill=\"#fff\" opacity=\".75\"/>" +
      "<circle cx=\"40\" cy=\"10\" r=\"3.3\" fill=\"#f0d060\"/><circle cx=\"40\" cy=\"9\" r=\"1.05\" fill=\"#fff\" opacity=\".8\"/>",
      "48 16"
    ),
    newyear: svg(
      "<path d=\"M0 5 Q10 14 20 5 T40 5\" fill=\"none\" stroke=\"#e4c56a\" stroke-width=\"2.3\"/>" +
      "<path d=\"M0 11 Q10 2 20 11 T40 11\" fill=\"none\" stroke=\"#d5d8e0\" stroke-width=\"1.7\"/>",
      "40 16"
    ),
    july4: svg(
      "<path d=\"M1 1h22\" stroke=\"#f4f1ea\" stroke-width=\"1.3\"/>" +
      "<path d=\"M2 2 12 15 22 2z\" fill=\"#1d3a8a\"/>" +
      "<path d=\"M6.2 2 12 10.4 17.8 2z\" fill=\"#f4f1ea\"/>" +
      "<path d=\"M8.8 2 12 6.6 15.2 2z\" fill=\"#c8102e\"/>",
      "24 16"
    )
  };
  var RULE = {
    halloween: svg(
      "<path fill=\"#ff8a1e\" d=\"M6 14 9 4l3 10z\"/><path fill=\"#ffe14a\" d=\"M6 14h6L10.2 8z\"/><path fill=\"#fff\" d=\"M7.2 14h3.6L9 11z\"/>" +
      "<path fill=\"#3a2458\" d=\"M24 8c2-3 5-3 6.2 0-1.6.5-2.6 2-3.1 2S25.6 8.5 24 8zm10 .4c1.6-2.4 4-2.4 5.2 0-1.2.4-2 1.5-2.6 1.5s-1.4-1.1-2.6-1.5z\"/>" +
      "<circle cx=\"46\" cy=\"9\" r=\"3.2\" fill=\"#ff7a18\"/>",
      "56 16"
    ),
    thanksgiving: TRIM.thanksgiving,
    christmas: svg(
      "<path d=\"M0 9 Q9 3 18 9 T36 9 T54 9 T72 9\" fill=\"none\" stroke=\"#1f7a34\" stroke-width=\"3.1\" stroke-linecap=\"round\"/>" +
      "<circle cx=\"14\" cy=\"6.2\" r=\"2.5\" fill=\"#e53935\"/>" +
      "<circle cx=\"36\" cy=\"11.2\" r=\"2.5\" fill=\"#f0d060\"/>" +
      "<path fill=\"#e4b84a\" d=\"M52 4.2c-2.2.3-3.2 2.4-3.2 4.2v1.2h6.4V8.4c0-1.8-1-3.9-3.2-4.2z\"/>" +
      "<rect x=\"48.2\" y=\"9.4\" width=\"7.2\" height=\"1.3\" rx=\".5\" fill=\"#f6e2a2\"/>" +
      "<circle cx=\"24\" cy=\"8\" r=\"1.7\" fill=\"#f7f4ee\"/>",
      "72 16"
    ),
    newyear: TRIM.newyear,
    july4: TRIM.july4
  };
  var CORNER = {
    halloween: WEB,
    thanksgiving: LEAF,
    christmas: HOLLY,
    newyear: SPARK,
    july4: STAR
  };
  var LOGO = {
    halloween: PUMPKIN,
    thanksgiving: HORN,
    christmas: SANTA,
    newyear: SPARK,
    july4: STAR
  };
  var TRIM_SIZE = {
    halloween: "18px 16px",
    thanksgiving: "54px 16px",
    christmas: "48px 16px",
    newyear: "40px 16px",
    july4: "24px 16px"
  };

  root.style.setProperty("--season-trim", uri(TRIM[season]));
  root.style.setProperty("--season-trim-size", TRIM_SIZE[season]);
  root.style.setProperty("--season-rule", uri(RULE[season]));
  root.style.setProperty("--season-corner", uri(CORNER[season]));
  root.style.setProperty("--season-logo", uri(LOGO[season]));

  var SPIDER = svg(
    "<path stroke=\"#e6e0d4\" stroke-width=\"0.7\" d=\"M10 0v14\"/>" +
    "<ellipse cx=\"10\" cy=\"22\" rx=\"4.6\" ry=\"3.6\" fill=\"#2a1840\"/>" +
    "<circle cx=\"10\" cy=\"17.2\" r=\"2.5\" fill=\"#1a1028\"/>" +
    "<path stroke=\"#3a2460\" stroke-width=\"0.8\" fill=\"none\" stroke-linecap=\"round\" d=\"M6.2 20 1.2 16.5M6 22.2 1 22.4M6.2 24.2 1.4 28M13.8 20 18.8 16.5M14 22.2 19 22.4M13.8 24.2 18.6 28\"/>",
    "20 32"
  );

  function el(tag, className) {
    var node = document.createElement(tag);
    node.className = className;
    node.setAttribute("aria-hidden", "true");
    return node;
  }
  function ensureRelative(node) {
    if (!node || node.classList.contains("season-rel")) return;
    var pos = "static";
    try { pos = window.getComputedStyle(node).position; } catch (e) {}
    if (pos === "static") node.classList.add("season-rel");
  }

  function mountNav() {
    var nav = document.querySelector("header.nav, .nav");
    if (!nav) return;
    var deco = el("div", "season-nav-deco");
    var trim = el("span", "season-nav-trim");
    trim.appendChild(el("i", ""));
    deco.appendChild(trim);
    if (season === "halloween") {
      var a = el("span", "season-spider a");
      var b = el("span", "season-spider b");
      a.style.left = "7%";
      b.style.left = "90%";
      a.innerHTML = SPIDER;
      b.innerHTML = SPIDER;
      deco.appendChild(a);
      deco.appendChild(b);
      var left = el("span", "season-web l");
      var right = el("span", "season-web r");
      deco.appendChild(left);
      deco.appendChild(right);
    }
    nav.appendChild(deco);
  }

  function mountRibbon(card) {
    /* Pages can keep the seasonal skin without the greeting ribbon */
    if (document.body && document.body.getAttribute("data-season-ribbon") === "off") return;
    var rib = el("div", "season-ribbon");
    var span = document.createElement("span");
    span.textContent = RIBBON[season];
    rib.appendChild(span);
    if (card) {
      rib.classList.add("in-hero");
      card.appendChild(rib);
      return;
    }
    var host = document.querySelector("main > section, main section, main");
    if (!host) return;
    ensureRelative(host);
    rib.classList.add("in-page");
    host.insertBefore(rib, host.firstChild);
    var nav = document.querySelector("header.nav, .nav");
    var navH = nav ? nav.getBoundingClientRect().height : 56;
    var pad = 0;
    try { pad = parseFloat(window.getComputedStyle(host).paddingTop) || 0; } catch (e2) {}
    var top = Math.round(navH + 6);
    if (pad > 48) top = Math.min(top, Math.max(8, Math.round(pad - 44)));
    rib.style.top = top + "px";
    var head = host.querySelector("h1, h2");
    if (head) {
      var rb = rib.getBoundingClientRect();
      var hb = head.getBoundingClientRect();
      if (rb.bottom > hb.top - 4) {
        rib.style.top = Math.max(4, top - (rb.bottom - hb.top) - 8) + "px";
      }
    }
  }

  function mountHero() {
    var card = document.querySelector(".hero .testcard");
    if (!card) {
      mountRibbon(null);
      return;
    }
    ensureRelative(card);
    var scene = {
      halloween: MOON_WITCH,
      thanksgiving: LEAF_BUNCH,
      christmas: MOON_SLEIGH,
      newyear: BURST_GOLD,
      july4: BURST_RWB
    };
    var accent = el("div", "season-accent");
    accent.innerHTML = scene[season];
    card.appendChild(accent);
    if (season === "halloween") {
      var ghost = el("div", "season-cutout ghost");
      ghost.innerHTML = GHOST;
      var cat = el("div", "season-cutout cat");
      cat.innerHTML = CAT;
      card.appendChild(ghost);
      card.appendChild(cat);
      var ledge = el("div", "season-ledge");
      ledge.innerHTML = PUMPKIN + PUMPKIN + PUMPKIN + PUMPKIN + PUMPKIN;
      card.appendChild(ledge);
    } else if (season === "thanksgiving") {
      var tledge = el("div", "season-ledge grains");
      tledge.innerHTML = WHEAT + PUMPKIN + GOURD + WHEAT + PUMPKIN;
      card.appendChild(tledge);
    } else if (season === "christmas") {
      var tree = el("div", "season-cutout tree");
      tree.innerHTML = TREE;
      card.appendChild(tree);
      card.appendChild(el("div", "season-drift"));
    }
    mountRibbon(card);
  }

  function mountRules() {
    var nodes = document.querySelectorAll("section + section");
    var i;
    for (i = 0; i < nodes.length; i++) {
      ensureRelative(nodes[i]);
      nodes[i].insertBefore(el("div", "season-rule"), nodes[i].firstChild);
    }
  }

  function mountCards() {
    var nodes = document.querySelectorAll(".choice, .catalog-card, .pi-card, .play-feature, .bcard, .mcard");
    var i;
    for (i = 0; i < nodes.length; i++) {
      nodes[i].classList.add("season-card");
      ensureRelative(nodes[i]);
      if (!nodes[i].querySelector(".season-corners")) nodes[i].appendChild(el("span", "season-corners"));
    }
    var edges = document.querySelectorAll(".ab-book, .hero-preview, .endcard");
    for (i = 0; i < edges.length; i++) edges[i].classList.add("season-edge");
  }

  function mountFooter() {
    var footer = document.querySelector("footer");
    if (!footer) return;
    ensureRelative(footer);
    if (season === "july4" || season === "newyear") {
      footer.appendChild(el("div", "season-foot-trim"));
    }
    if (season === "christmas") footer.appendChild(el("div", "season-drift"));
    var row = "";
    if (season === "halloween") row = PUMPKIN + GHOST + CAT + SKELLY + CANDY + PUMPKIN + CANDY + PUMPKIN;
    else if (season === "thanksgiving") row = PUMPKIN + WHEAT + GOURD + HORN + WHEAT + PUMPKIN + GOURD;
    else if (season === "christmas") row = TREE + CANE + PRESENT + STOCKING + BELL + SANTA + PRESENT + CANE;
    if (!row) return;
    var foot = el("div", "season-foot");
    foot.innerHTML = row;
    footer.appendChild(foot);
  }

  function mountFog() {
    if (season !== "halloween") return;
    document.body.appendChild(el("div", "season-fog"));
  }

  function startSky() {
    var canvas = el("canvas", "season-sky");
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var phone = smallScreen();
    var dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.6);
    var w = 1;
    var h = 1;
    var leaves = [];
    var flakes = [];
    var confetti = [];
    var bursts = [];
    var bat = null;
    var batWait = 0.4;
    var sleigh = null;
    var sleighWait = 8;
    var boomWait = 0.25;
    var on = true;
    var last = 0;
    var leafColors = ["#e3943c", "#d85a28", "#c4472a", "#e0b45a", "#b86a32", "#8d5a2b"];
    var golds = ["#f0d078", "#efe8d2", "#c0c6d0", "#fff8e4", "#d4af4a"];
    var rwb = ["#e23b3b", "#f4f1ea", "#3d5bd9", "#f7c9c4", "#c5d0f5"];

    function resize() {
      phone = smallScreen();
      dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.25 : 1.6);
      w = Math.max(1, window.innerWidth);
      h = Math.max(1, window.innerHeight);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function zone() {
      var node = document.querySelector(".hero .testcard") || document.querySelector(".hero");
      if (!node) return null;
      var r = node.getBoundingClientRect();
      if (r.width < 8 || r.bottom < 0 || r.top > h) return null;
      return r;
    }
    function seedLeaf() {
      return { x: rand(0, w), y: rand(0, h), s: rand(7, 12), vy: rand(14, 26), sway: rand(10, 20), spin: rand(-0.8, 0.8), rot: rand(0, 6.2), t: rand(0, 6), a: rand(0.55, 0.82), color: pick(leafColors) };
    }
    function seedFlake() {
      return { x: rand(0, w), y: rand(0, h), s: rand(1.05, 2.15), vy: rand(10, 22), sway: rand(6, 14), t: rand(0, 6), a: rand(0.4, 0.82) };
    }
    function seedConfetti(z) {
      return { x: rand(z.left, z.right), y: rand(z.top, z.bottom), s: rand(3, 5.5), vy: rand(28, 52), sway: rand(10, 22), spin: rand(-2.2, 2.2), rot: rand(0, 6), t: rand(0, 5), color: pick(golds), a: rand(0.75, 0.95) };
    }
    function spawnBat() {
      var dir = Math.random() < 0.5 ? 1 : -1;
      return { x: dir > 0 ? -20 : w + 20, y: rand(h * 0.08, Math.min(h * 0.34, 220)), s: rand(1.15, 1.55), vx: rand(28, 46) * dir, phase: rand(0, 6), a: rand(0.8, 0.95) };
    }
    function drawLeaf(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(0, -p.s);
      ctx.bezierCurveTo(p.s * 0.95, -p.s * 0.15, p.s * 0.7, p.s * 0.45, 0, p.s);
      ctx.bezierCurveTo(-p.s * 0.7, p.s * 0.45, -p.s * 0.95, -p.s * 0.15, 0, -p.s);
      ctx.fill();
      ctx.restore();
    }
    function drawBat(p, time) {
      var flap = Math.sin(time * 9 + p.phase);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s);
      if (p.vx < 0) ctx.scale(-1, 1);
      ctx.globalAlpha = p.a;
      ctx.fillStyle = "#3a2460";
      ctx.strokeStyle = "#ff8a2a";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-8, -11 - flap * 6, -18, 1);
      ctx.lineTo(-12, 2);
      ctx.quadraticCurveTo(-6, 4, 0, 1);
      ctx.closePath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(8, -11 - flap * 6, 18, 1);
      ctx.lineTo(12, 2);
      ctx.quadraticCurveTo(6, 4, 0, 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0.6, 2.1, 1.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function drawSleigh(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s);
      ctx.fillStyle = "#3a2e24";
      ctx.strokeStyle = "#3a2e24";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(16, 16, 11, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(24, 14);
      ctx.lineTo(34, 6);
      ctx.lineTo(37, 8);
      ctx.lineTo(28, 16);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(38, 6, 5.5, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(34, 4);
      ctx.lineTo(32, -2);
      ctx.moveTo(35, 1);
      ctx.lineTo(31, 0);
      ctx.moveTo(36, 0);
      ctx.lineTo(40, -4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(8, 18);
      ctx.lineTo(6, 26);
      ctx.moveTo(14, 19);
      ctx.lineTo(14, 27);
      ctx.moveTo(22, 18);
      ctx.lineTo(24, 26);
      ctx.stroke();
      ctx.fillStyle = "#c62828";
      ctx.fillRect(48, 12, 20, 8);
      ctx.strokeStyle = "#e4c56a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(44, 22);
      ctx.lineTo(74, 22);
      ctx.stroke();
      ctx.fillStyle = "#f3c2a0";
      ctx.beginPath();
      ctx.arc(58, 10, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c62828";
      ctx.beginPath();
      ctx.moveTo(55, 8);
      ctx.lineTo(58, 2);
      ctx.lineTo(62, 8);
      ctx.fill();
      ctx.restore();
    }
    function spawnBoom(x, y) {
      var colors = season === "july4" ? rwb : golds;
      var n = phone ? 14 : 22;
      var i, a, sp;
      for (i = 0; i < n; i++) {
        a = (Math.PI * 2 * i) / n + rand(-0.12, 0.12);
        sp = rand(26, phone ? 58 : 78);
        bursts.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 8, life: rand(0.75, 1.2), age: 0, color: colors[i % colors.length], r: rand(1.15, 2.15) });
      }
    }
    function reseed() {
      var i, n, z;
      leaves = [];
      flakes = [];
      confetti = [];
      if (season === "thanksgiving") {
        n = phone ? 7 : 12;
        for (i = 0; i < n; i++) leaves.push(seedLeaf());
      }
      if (season === "christmas") {
        n = phone ? 10 : 16;
        for (i = 0; i < n; i++) flakes.push(seedFlake());
      }
      if (season === "newyear") {
        z = zone();
        n = phone ? 12 : 20;
        if (z) for (i = 0; i < n; i++) confetti.push(seedConfetti(z));
      }
      if (season === "halloween") bat = spawnBat();
    }

    resize();
    reseed();
    document.addEventListener("visibilitychange", function () { on = document.visibilityState !== "hidden"; });
    window.addEventListener("resize", function () { resize(); reseed(); });

    function step(dt, time) {
      var i, p, z, mid;
      ctx.clearRect(0, 0, w, h);
      for (i = 0; i < leaves.length; i++) {
        p = leaves[i];
        p.t += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(p.t * 1.3) * p.sway * dt;
        p.rot += p.spin * dt;
        if (p.y > h + 16) { p.y = -16; p.x = rand(0, w); }
        drawLeaf(p);
      }
      for (i = 0; i < flakes.length; i++) {
        p = flakes[i];
        p.t += dt;
        p.y += p.vy * dt;
        p.x += Math.sin(p.t) * p.sway * dt;
        if (p.y > h + 4) { p.y = -4; p.x = rand(0, w); }
        ctx.globalAlpha = p.a;
        ctx.fillStyle = "#fffaf4";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      z = zone();
      if (z && confetti.length) {
        for (i = 0; i < confetti.length; i++) {
          p = confetti[i];
          p.t += dt;
          p.y += p.vy * dt;
          p.x += Math.sin(p.t * 1.4) * p.sway * dt;
          p.rot += p.spin * dt;
          if (p.y > z.bottom + 6) { p.y = z.top - 4; p.x = rand(z.left, z.right); }
          if (p.y < z.top - 8 || p.y > z.bottom) continue;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = p.a;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.s * 0.5, -p.s * 0.35, p.s, p.s * 0.7);
          ctx.restore();
        }
      } else if (season === "newyear" && !confetti.length && z) {
        for (i = 0; i < (phone ? 12 : 20); i++) confetti.push(seedConfetti(z));
      }
      if (season === "halloween") {
        if (!bat) {
          batWait -= dt;
          if (batWait <= 0) bat = spawnBat();
        } else {
          bat.x += bat.vx * dt;
          bat.y += Math.sin(time * 1.3 + bat.phase) * 10 * dt;
          if (bat.x < -30 || bat.x > w + 30) { bat = null; batWait = rand(7, 12); }
          else drawBat(bat, time);
        }
      }
      if (season === "christmas") {
        if (!sleigh) {
          sleighWait -= dt;
          if (sleighWait <= 0) sleigh = { x: -70, y: Math.max(48, Math.min(h * 0.16, 130)), s: phone ? 0.72 : 0.9 };
        } else {
          sleigh.x += 36 * dt;
          drawSleigh(sleigh);
          if (sleigh.x > w + 90) { sleigh = null; sleighWait = rand(14, 22); }
        }
      }
      if (season === "newyear" || season === "july4") {
        boomWait -= dt;
        if (boomWait <= 0 && bursts.length < (phone ? 16 : 28) && z) {
          mid = (z.left + z.right) / 2;
          var bx = rand(z.left + 20, z.right - 20);
          var by = rand(z.top + 10, z.top + Math.min(z.height * 0.38, 120));
          if (Math.abs(bx - mid) < 78) bx += bx < mid ? -50 : 50;
          spawnBoom(Math.max(z.left + 12, Math.min(z.right - 12, bx)), by);
          boomWait = rand(5.5, 8);
        }
        for (i = bursts.length - 1; i >= 0; i--) {
          p = bursts[i];
          p.age += dt;
          if (p.age > p.life) { bursts.splice(i, 1); continue; }
          p.vy += 28 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          ctx.globalAlpha = 1 - p.age / p.life;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    function frame(now) {
      var dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (on) step(dt, now / 1000);
      window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  function boot() {
    if (root.getAttribute("data-season-on") === season) return;
    root.setAttribute("data-season-on", season);
    mountNav();
    mountHero();
    mountRules();
    mountCards();
    mountFooter();
    mountFog();
    if (!still()) startSky();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
