/* Old-time radio on Past Inspirations.
   One native <audio> element plays direct Archive MP3s (not an iframe) so iOS
   can keep the show going with the screen locked. The first play() has to be
   inside a tap. Later episodes advance from the ended event and from the
   Media Session next/previous handlers. Position is remembered in localStorage. */
(function () {
  var audio = document.getElementById("otr-audio");
  var root = document.getElementById("radio");
  if (!audio || !root) return;

  var KEY = "pi-radio";
  var STATIONS = [
    { id: "mystery", name: "Mystery & Suspense", khz: "640" },
    { id: "westerns", name: "Westerns", khz: "760" },
    { id: "comedy", name: "Comedy", khz: "880" },
    { id: "adventure", name: "Adventure & Heroes", khz: "1020" },
    { id: "scifi", name: "Sci-Fi", khz: "1160" },
    { id: "drama", name: "Drama", khz: "1320" }
  ];
  var SHOWS = [
    { station: "mystery", identifier: "SUSPENSE", title: "Suspense", years: "1942–1962", note: "The man in black, and a different story every week." },
    { station: "mystery", identifier: "TheWhistler1947", title: "The Whistler", years: "1942–1955", note: "He walks by night, and he knows how the story ends." },
    { station: "mystery", identifier: "inner-sanctum-mysteries-radio-show-1941-episodes", title: "Inner Sanctum Mysteries", years: "1941–1952", note: "A creaking door, then the story." },
    { station: "mystery", identifier: "lights-out_20200820", title: "Lights Out", years: "1934–1947", note: "Arch Oboler’s horror half hour. Cat Wife is in the stack." },
    { station: "mystery", identifier: "Escape19491950", title: "Escape", years: "1947–1954", note: "Tired of the everyday grind? Designed to free you from it." },
    { station: "mystery", identifier: "TheMysteriousTraveler-Hideout", title: "The Mysterious Traveler", years: "1943–1952", note: "A stranger on the train, with a story for the ride." },
    { station: "mystery", identifier: "Quiet_Please", title: "Quiet, Please", years: "1947–1949", note: "Wyllis Cooper’s quiet, strange half hours." },
    { station: "mystery", identifier: "YTJD_A", title: "Yours Truly, Johnny Dollar", years: "1949–1962", note: "The man with the action-packed expense account." },
    { station: "mystery", identifier: "Dragnet_OTR", title: "Dragnet", years: "1949–1957", note: "Jack Webb, and just the facts." },
    { station: "westerns", identifier: "HaveGunWillTravel_543", title: "Have Gun, Will Travel", years: "1958–1960", note: "Wire Paladin, San Francisco." },
    { station: "westerns", identifier: "TalesOfTheTexasRangers", title: "Tales of the Texas Rangers", years: "1950–1952", note: "Joel McCrea as Ranger Jace Pearson." },
    { station: "westerns", identifier: "FortLaramie_662", title: "Fort Laramie", years: "1956", note: "Raymond Burr at a post on the frontier." },
    { station: "westerns", identifier: "HopalongCassidy", title: "Hopalong Cassidy", years: "1950–1952", note: "William Boyd’s Hoppy, this time on the radio." },
    { station: "comedy", identifier: "FibberMcGeeandMolly1941", title: "Fibber McGee and Molly", years: "1935–1959", note: "79 Wistful Vista, and the hall closet." },
    { station: "comedy", identifier: "JackBenny1", title: "The Jack Benny Program", years: "1932–1955", note: "Jack, Mary, Rochester, and the Maxwell." },
    { station: "comedy", identifier: "Abbott_And_Costello_otr", title: "Abbott and Costello", years: "1940–1949", note: "The same pair as the films up above." },
    { station: "comedy", identifier: "TheGreatGildersleeve_201606", title: "The Great Gildersleeve", years: "1941–1957", note: "Throckmorton P. Gildersleeve, water commissioner." },
    { station: "comedy", identifier: "OurMissBrooks", title: "Our Miss Brooks", years: "1948–1957", note: "Eve Arden at Madison High." },
    { station: "comedy", identifier: "TheBurnsAndAllenShow062545-22650", title: "Burns and Allen", years: "1934–1950", note: "George Burns asks. Gracie Allen answers." },
    { station: "comedy", identifier: "DuffysTavern_524", title: "Duffy’s Tavern", years: "1941–1951", note: "Where the elite meet to eat." },
    { station: "comedy", identifier: "TheLifeOfRiley", title: "The Life of Riley", years: "1944–1951", note: "William Bendix, and another scheme." },
    { station: "adventure", identifier: "TheAdventuresOfSuperman_201805", title: "The Adventures of Superman", years: "1940–1951", note: "Up in the sky. A bird, a plane, then the daily chapter." },
    { station: "adventure", identifier: "sherlockholmes_otr", title: "Sherlock Holmes", years: "1939–1946", note: "Basil Rathbone and Nigel Bruce." },
    { station: "adventure", identifier: "Box_13", title: "Box 13", years: "1947–1948", note: "Alan Ladd’s writer, waiting on a letter." },
    { station: "adventure", identifier: "BoldVenture57Episodes", title: "Bold Venture", years: "1951–1952", note: "Humphrey Bogart and Lauren Bacall, in Havana." },
    { station: "scifi", identifier: "xminusoneotr", title: "X Minus One", years: "1955–1958", note: "Stories out of Galaxy and Astounding." },
    { station: "scifi", identifier: "Dimension-X", title: "Dimension X", years: "1950–1951", note: "Adventures in time and space." },
    { station: "scifi", identifier: "WarOfTheWorlds1938RadioBroadcast256kbps", title: "The War of the Worlds", years: "1938", note: "Orson Welles and the Mercury Theatre, Halloween night.", match: /136kbps-cleaned\.mp3$/i },
    { station: "drama", identifier: "LuxRadioTheatre", title: "Lux Radio Theatre", years: "1934–1955", note: "A Hollywood picture, done in an hour." },
    { station: "drama", identifier: "You_Are_There_OTR", title: "You Are There", years: "1947–1950", note: "A news desk, reporting live from history." }
  ];

  var dial = document.getElementById("otr-dial");
  var needle = document.getElementById("otr-needle");
  var khzEl = document.getElementById("otr-khz");
  var stationEl = document.getElementById("otr-station");
  var tuneKnob = document.getElementById("otr-tune");
  var volKnob = document.getElementById("otr-vol");
  var playBtn = document.getElementById("otr-play");
  var prevBtn = document.getElementById("otr-prev");
  var nextBtn = document.getElementById("otr-next");
  var seek = document.getElementById("otr-seek");
  var timeEl = document.getElementById("otr-time");
  var nowEl = document.getElementById("otr-now");
  var setEl = document.getElementById("otr-player");
  var stationBar = document.getElementById("otr-stations");
  var showsEl = document.getElementById("otr-shows");
  var showsHead = document.getElementById("otr-shows-h");
  var epsHead = document.getElementById("otr-eps-h");
  var epsStatus = document.getElementById("otr-ep-status");
  var epsEl = document.getElementById("otr-episodes");
  var form = document.getElementById("otr-search");
  var query = document.getElementById("otr-q");
  var status = document.getElementById("otr-status");
  var results = document.getElementById("otr-results");
  var resultsHead = document.getElementById("otr-results-h");

  var stationIndex = 0;
  var show = null;
  var episodes = [];
  var index = -1;
  var listed = null;
  var listedEpisodes = [];
  var listedIndex = 0;
  var resumeAt = null;
  var seeking = false;
  var volume = 1;
  var lastSave = 0;
  var loadToken = 0;
  var metaCache = Object.create(null);
  var handlers = {};

  audio.playsInline = true;
  audio.setAttribute("playsinline", "");
  audio.setAttribute("webkit-playsinline", "");

  function text(value) {
    if (Array.isArray(value)) value = value[0];
    return value == null ? "" : String(value);
  }

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }

  function save() {
    if (!show || index < 0 || !episodes[index]) return;
    var pos = audio.ended ? 0 : (isFinite(audio.currentTime) ? Math.round(audio.currentTime * 10) / 10 : 0);
    if (resumeAt != null && pos < 1) pos = resumeAt;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        station: STATIONS[stationIndex].id,
        identifier: show.identifier,
        file: episodes[index].name,
        position: pos,
        title: show.title,
        volume: volume
      }));
    } catch (e) {}
  }

  function fmt(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "0:00";
    var s = Math.floor(seconds);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var r = s % 60;
    var tail = (m < 10 && h ? "0" : "") + m + ":" + (r < 10 ? "0" : "") + r;
    return h ? h + ":" + tail : tail;
  }

  function lengthOf(file) {
    var raw = text(file.length);
    if (/^\d+:\d+/.test(raw)) {
      var bits = raw.split(":");
      if (bits.length === 2) return bits[0] + " min";
      return bits[0] + ":" + bits[1];
    }
    var n = parseFloat(raw);
    if (!isFinite(n) || n <= 0) return "";
    var mins = Math.round(n / 60);
    return (mins < 1 ? "<1" : String(mins)) + " min";
  }

  function escapeRe(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function labelOf(file, showTitle) {
    var meta = text(file.title).replace(/\s+/g, " ").trim();
    var name = text(file.name).replace(/\.mp3$/i, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    var label = meta || name;
    if (showTitle) {
      var stripped = label.replace(new RegExp("^\\s*" + escapeRe(showTitle) + "\\s*[\\-:]*\\s*", "i"), "");
      if (stripped.length > 6) label = stripped;
    }
    label = label.replace(/\s+/g, " ").trim();
    if (label.length > 110) label = label.slice(0, 107).replace(/\s+\S*$/, "") + "…";
    return label || "Episode";
  }

  function fileUrl(identifier, name) {
    return "https://archive.org/download/" + encodeURIComponent(identifier) + "/" + encodeURIComponent(name);
  }

  function artUrl(identifier) {
    return "https://archive.org/services/img/" + encodeURIComponent(identifier);
  }

  function usableFiles(files, current) {
    var mp3 = (files || []).filter(function (file) { return /\.mp3$/i.test(text(file.name)); });
    var originals = mp3.filter(function (file) { return !file.source || file.source === "original"; });
    var list = (originals.length ? originals : mp3).filter(function (file) {
      var size = parseInt(file.size, 10) || 0;
      if (size && size < 250000) return false;
      var name = text(file.name);
      if (/OTRR Introduction|Audio Bio|\bBiography\b|\bIntro\.mp3$/i.test(name)) return false;
      if (current.match && !current.match.test(name)) return false;
      return true;
    });
    if (!list.length && current.match) {
      var copy = {};
      for (var key in current) if (Object.prototype.hasOwnProperty.call(current, key) && key !== "match") copy[key] = current[key];
      return usableFiles(files, copy);
    }
    list.sort(function (a, b) {
      return text(a.name).localeCompare(text(b.name), undefined, { numeric: true, sensitivity: "base" });
    });
    return list;
  }

  function setNeedle(angle, drag) {
    dial.classList.toggle("is-drag", !!drag);
    needle.style.setProperty("--a", angle + "deg");
  }

  function stationAngle(i) {
    return -75 + i * 30;
  }

  function paintStation(i) {
    stationIndex = i;
    var station = STATIONS[i];
    setNeedle(stationAngle(i), false);
    khzEl.textContent = station.khz;
    stationEl.textContent = station.name;
    dial.setAttribute("aria-valuenow", String(i));
    dial.setAttribute("aria-valuetext", station.name);
    tuneKnob.style.setProperty("--turn", stationAngle(i) + "deg");
    tuneKnob.setAttribute("aria-label", "Tuning. " + station.name + ". Activate for the next station.");
    stationBar.querySelectorAll("button").forEach(function (button, n) {
      var on = n === i;
      button.classList.toggle("on", on);
      button.setAttribute("aria-selected", on ? "true" : "false");
      if (on) button.setAttribute("tabindex", "0");
      else button.setAttribute("tabindex", "-1");
    });
    renderShows();
  }

  function renderShows() {
    var station = STATIONS[stationIndex];
    showsHead.textContent = station.name;
    showsEl.replaceChildren();
    SHOWS.forEach(function (item) {
      if (item.station !== station.id) return;
      showsEl.appendChild(showButton(item));
    });
  }

  function showButton(item) {
    var button = document.createElement("button");
    button.type = "button";
    button.className = "otr-show";
    button.setAttribute("data-id", item.identifier);
    if (listed && listed.identifier === item.identifier) {
      button.classList.add("on");
      button.setAttribute("aria-current", "true");
    }
    var img = document.createElement("img");
    img.alt = "";
    img.width = 64;
    img.height = 64;
    img.loading = "lazy";
    img.src = artUrl(item.identifier);
    img.addEventListener("error", function () { button.classList.add("is-missing"); });
    var textWrap = document.createElement("span");
    var title = document.createElement("strong");
    title.textContent = item.title;
    var years = document.createElement("em");
    years.textContent = item.years || "";
    var note = document.createElement("small");
    note.textContent = item.note || "";
    textWrap.appendChild(title);
    if (item.years) textWrap.appendChild(years);
    if (item.note) textWrap.appendChild(note);
    button.appendChild(img);
    button.appendChild(textWrap);
    button.addEventListener("click", function () { openShow(item, { play: false, user: true }); });
    return button;
  }

  function markShows() {
    document.querySelectorAll(".otr-show").forEach(function (button) {
      var on = listed && button.getAttribute("data-id") === listed.identifier;
      button.classList.toggle("on", !!on);
      if (on) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
  }

  function setEpStatus(message) {
    epsStatus.textContent = message || "";
  }

  function renderEpisodes() {
    epsHead.hidden = !listed;
    epsHead.textContent = listed ? listed.title : "Episodes";
    epsEl.replaceChildren();
    var playingHere = !!(show && listed && show.identifier === listed.identifier);
    listedEpisodes.forEach(function (file, i) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "otr-ep";
      if (playingHere && i === index) {
        button.classList.add("on");
        button.setAttribute("aria-current", "true");
      }
      var title = document.createElement("b");
      title.textContent = labelOf(file, listed.title);
      var len = document.createElement("i");
      len.textContent = lengthOf(file);
      button.appendChild(title);
      button.appendChild(len);
      button.addEventListener("click", function () {
        listedIndex = i;
        show = listed;
        episodes = listedEpisodes;
        startEpisode(i, true);
      });
      epsEl.appendChild(button);
    });
    var current = epsEl.querySelector(".otr-ep.on");
    if (current) {
      var top = current.offsetTop;
      if (top < epsEl.scrollTop || top > epsEl.scrollTop + epsEl.clientHeight - 48) epsEl.scrollTop = Math.max(0, top - 8);
    }
  }

  function fetchMeta(identifier) {
    if (metaCache[identifier]) return Promise.resolve(metaCache[identifier]);
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 25000);
    return fetch("https://archive.org/metadata/" + encodeURIComponent(identifier), { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error("metadata failed");
        return response.json();
      })
      .then(function (data) {
        var files = (data && data.files) || [];
        metaCache[identifier] = files;
        return files;
      })
      .finally(function () { window.clearTimeout(timer); });
  }

  function openShow(item, opts) {
    opts = opts || {};
    var token = ++loadToken;
    listed = item;
    listedEpisodes = [];
    markShows();
    epsHead.hidden = false;
    epsHead.textContent = item.title;
    epsEl.replaceChildren();
    setEpStatus("Opening " + item.title + "…");
    if (opts.user) {
      var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setEl.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }
    fetchMeta(item.identifier).then(function (files) {
      if (token !== loadToken || listed !== item) return;
      listedEpisodes = usableFiles(files, item);
      if (!listedEpisodes.length) {
        setEpStatus("No playable episodes in that show.");
        renderEpisodes();
        return;
      }
      var start = 0;
      if (opts.file) {
        listedEpisodes.forEach(function (file, i) { if (file.name === opts.file) start = i; });
      }
      listedIndex = start;
      setEpStatus(listedEpisodes.length === 1 ? "1 episode." : listedEpisodes.length + " episodes.");
      renderEpisodes();
      if (opts.play || opts.file || !audio.getAttribute("src")) {
        show = item;
        episodes = listedEpisodes;
        resumeAt = opts.position > 1 ? opts.position : null;
        armEpisode(start, !!opts.play);
      }
    }).catch(function () {
      if (token !== loadToken) return;
      setEpStatus("The archive didn’t answer. Try that show again.");
    });
  }

  function armEpisode(i, play) {
    var file = episodes[i];
    if (!file || !show) return;
    index = i;
    var url = fileUrl(show.identifier, file.name);
    var absolute = new URL(url, window.location.href).href;
    if (audio.src !== absolute) {
      audio.src = url;
    } else if (resumeAt && audio.readyState >= 1) {
      try { audio.currentTime = resumeAt; } catch (e) {}
      resumeAt = null;
    } else if (audio.ended) {
      try { audio.currentTime = 0; } catch (e) {}
    }
    renderEpisodes();
    mediaSession();
    ui();
    save();
    if (play) begin();
  }

  function startEpisode(i, play) {
    resumeAt = null;
    armEpisode(i, play);
  }

  function begin() {
    var pending = audio.play();
    if (pending && pending.catch) {
      pending.catch(function () {
        ui();
        setEpStatus("Tap play to start. The phone needs a tap before the first sound.");
      });
    }
  }

  function playCurrent() {
    if (listed && listedEpisodes.length && (!show || listed.identifier !== show.identifier || !audio.getAttribute("src"))) {
      show = listed;
      episodes = listedEpisodes;
      startEpisode(listedIndex || 0, true);
      return;
    }
    if (index < 0) {
      if (episodes.length) startEpisode(0, true);
      return;
    }
    if (audio.ended) {
      if (index + 1 < episodes.length) startEpisode(index + 1, true);
      else startEpisode(index, true);
      return;
    }
    if (!audio.getAttribute("src")) armEpisode(index, true);
    else begin();
  }

  function previous() {
    if (!episodes.length || index < 0) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      begin();
      return;
    }
    if (index > 0) startEpisode(index - 1, true);
    else begin();
  }

  function next() {
    if (index + 1 < episodes.length) startEpisode(index + 1, true);
  }

  function seekBy(delta) {
    if (!isFinite(audio.duration)) return;
    audio.currentTime = Math.min(Math.max(0, audio.currentTime + delta), Math.max(0, audio.duration - 0.25));
  }

  function seekTo(time) {
    if (!isFinite(time)) return;
    audio.currentTime = time;
  }

  function ui() {
    var playing = !audio.paused && !audio.ended;
    setEl.classList.toggle("is-on", playing);
    playBtn.classList.toggle("is-playing", playing);
    playBtn.setAttribute("aria-label", playing ? "Pause" : (audio.currentTime > 0 || resumeAt ? "Resume" : "Play"));
    nextBtn.disabled = !(index + 1 < episodes.length);
    prevBtn.disabled = index < 0;
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    paintNow();
    paintTime();
  }

  function paintNow() {
    if (!show || index < 0 || !episodes[index]) {
      nowEl.textContent = "Choose a station, then a show.";
      return;
    }
    nowEl.replaceChildren();
    var strong = document.createElement("strong");
    strong.textContent = show.title;
    nowEl.appendChild(strong);
    nowEl.appendChild(document.createTextNode(labelOf(episodes[index], show.title)));
  }

  function paintTime() {
    if (seeking) return;
    var dur = audio.duration;
    timeEl.textContent = fmt(audio.currentTime) + " / " + fmt(isFinite(dur) ? dur : 0);
    seek.value = isFinite(dur) && dur > 0 ? String(Math.round(audio.currentTime / dur * 1000)) : "0";
  }

  function positionState() {
    if (!("mediaSession" in navigator) || !navigator.mediaSession.setPositionState) return;
    if (!isFinite(audio.duration) || audio.duration <= 0) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: audio.duration,
        playbackRate: audio.playbackRate || 1,
        position: Math.min(Math.max(0, audio.currentTime), audio.duration)
      });
    } catch (e) {}
  }

  function mediaSession() {
    if (!("mediaSession" in navigator) || !show || index < 0 || !episodes[index]) return;
    var station = STATIONS[stationIndex];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: labelOf(episodes[index], show.title),
        artist: show.title,
        album: station.name + " · Old Time Radio",
        artwork: [{ src: artUrl(show.identifier), sizes: "512x512", type: "image/jpeg" }]
      });
    } catch (e) {}
    positionState();
  }

  function bindSession() {
    if (!("mediaSession" in navigator)) return;
    var ms = navigator.mediaSession;
    function set(action, fn) {
      handlers[action] = fn;
      try { ms.setActionHandler(action, fn); } catch (e) {}
    }
    set("play", function () { playCurrent(); });
    set("pause", function () { audio.pause(); });
    set("previoustrack", function () { previous(); });
    set("nexttrack", function () { next(); });
    set("seekbackward", function (details) { seekBy(-((details && details.seekOffset) || 15)); });
    set("seekforward", function (details) { seekBy((details && details.seekOffset) || 30); });
    set("seekto", function (details) { if (details && details.seekTime != null) seekTo(details.seekTime); });
  }

  function dialAngle(clientX, clientY) {
    var face = dial.querySelector(".otr-dial-face");
    var rect = face.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height * (158 / 176);
    return Math.atan2(clientX - cx, -(clientY - cy)) * 180 / Math.PI;
  }

  function nearestStation(angle) {
    var best = 0;
    var dist = Infinity;
    STATIONS.forEach(function (_, i) {
      var d = Math.abs(stationAngle(i) - angle);
      if (d < dist) { dist = d; best = i; }
    });
    return best;
  }

  function pointerAngle(event) {
    var point = event.touches ? event.touches[0] : event;
    return dialAngle(point.clientX, point.clientY);
  }

  var draggingDial = false;
  dial.addEventListener("pointerdown", function (event) {
    if (event.button != null && event.button !== 0) return;
    draggingDial = true;
    dial.setPointerCapture(event.pointerId);
    setNeedle(Math.max(-80, Math.min(80, pointerAngle(event))), true);
  });
  dial.addEventListener("pointermove", function (event) {
    if (!draggingDial) return;
    setNeedle(Math.max(-80, Math.min(80, pointerAngle(event))), true);
  });
  function endDial(event) {
    if (!draggingDial) return;
    draggingDial = false;
    paintStation(nearestStation(pointerAngle(event)));
  }
  dial.addEventListener("pointerup", endDial);
  dial.addEventListener("pointercancel", function () { draggingDial = false; paintStation(stationIndex); });
  dial.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); paintStation(Math.min(STATIONS.length - 1, stationIndex + 1)); }
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); paintStation(Math.max(0, stationIndex - 1)); }
    else if (event.key === "Home") { event.preventDefault(); paintStation(0); }
    else if (event.key === "End") { event.preventDefault(); paintStation(STATIONS.length - 1); }
  });

  tuneKnob.addEventListener("click", function () {
    paintStation((stationIndex + 1) % STATIONS.length);
  });

  function setVolume(next) {
    volume = Math.max(0, Math.min(1, next));
    try { audio.volume = volume; } catch (e) {}
    var turn = -140 + volume * 280;
    volKnob.style.setProperty("--turn", turn + "deg");
    volKnob.setAttribute("aria-valuenow", String(Math.round(volume * 100)));
    save();
  }

  var volDrag = null;
  volKnob.addEventListener("pointerdown", function (event) {
    volDrag = { x: event.clientX, v: volume };
    volKnob.setPointerCapture(event.pointerId);
  });
  volKnob.addEventListener("pointermove", function (event) {
    if (!volDrag) return;
    setVolume(volDrag.v + (event.clientX - volDrag.x) / 140);
  });
  volKnob.addEventListener("pointerup", function () { volDrag = null; });
  volKnob.addEventListener("pointercancel", function () { volDrag = null; });
  volKnob.addEventListener("keydown", function (event) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") { event.preventDefault(); setVolume(volume + 0.05); }
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") { event.preventDefault(); setVolume(volume - 0.05); }
  });

  playBtn.addEventListener("click", function () {
    if (!audio.paused && !audio.ended) audio.pause();
    else playCurrent();
  });
  prevBtn.addEventListener("click", previous);
  nextBtn.addEventListener("click", next);

  seek.addEventListener("input", function () {
    seeking = true;
    var dur = isFinite(audio.duration) ? audio.duration : 0;
    timeEl.textContent = fmt(seek.value / 1000 * dur) + " / " + fmt(dur);
  });
  seek.addEventListener("change", function () {
    seeking = false;
    if (isFinite(audio.duration) && audio.duration > 0) audio.currentTime = seek.value / 1000 * audio.duration;
  });

  audio.addEventListener("loadedmetadata", function () {
    if (resumeAt != null && isFinite(audio.duration) && resumeAt < audio.duration - 2) {
      try { audio.currentTime = resumeAt; } catch (e) {}
    }
    resumeAt = null;
    positionState();
    ui();
  });
  audio.addEventListener("play", ui);
  audio.addEventListener("pause", function () { ui(); save(); });
  audio.addEventListener("timeupdate", function () {
    paintTime();
    if (Date.now() - lastSave > 5000) { lastSave = Date.now(); save(); positionState(); }
  });
  audio.addEventListener("seeked", function () { positionState(); save(); });
  audio.addEventListener("ended", function () {
    save();
    if (index + 1 < episodes.length) startEpisode(index + 1, true);
    else ui();
  });
  audio.addEventListener("error", function () {
    if (audio.error && audio.error.code === 1) return;
    setEpStatus("That episode didn’t load. Try the next one.");
    ui();
  });
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") save(); });
  window.addEventListener("pagehide", save);

  STATIONS.forEach(function (station, i) {
    var button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.textContent = station.name;
    button.addEventListener("click", function () { paintStation(i); });
    stationBar.appendChild(button);
  });

  function setStatus(message) {
    status.textContent = message;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var term = query.value.replace(/[^\p{L}\p{N}\s'.-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!term) {
      setStatus("Type a show or a word to search.");
      resultsHead.hidden = true;
      results.replaceChildren();
      return;
    }
    var params = new URLSearchParams();
    params.set("q", "collection:oldtimeradio AND mediatype:audio AND licenseurl:*publicdomain* AND NOT identifier:OTRR* AND NOT title:(shadow OR gunsmoke) AND (" + term + ")");
    ["identifier", "title", "year", "description"].forEach(function (field) { params.append("fl[]", field); });
    params.append("sort[]", "downloads desc");
    params.set("rows", "12");
    params.set("page", "1");
    params.set("output", "json");
    var submit = form.querySelector("button[type=submit]");
    submit.disabled = true;
    results.setAttribute("aria-busy", "true");
    setStatus("Searching the archive…");
    var controller = new AbortController();
    var timer = window.setTimeout(function () { controller.abort(); }, 20000);
    fetch("https://archive.org/advancedsearch.php?" + params.toString(), { signal: controller.signal })
      .then(function (response) {
        if (!response.ok) throw new Error("search failed");
        return response.json();
      })
      .then(function (data) {
        var docs = (data && data.response && data.response.docs) || [];
        var seen = Object.create(null);
        results.replaceChildren();
        docs.forEach(function (doc) {
          var id = text(doc.identifier);
          if (!id || seen[id]) return;
          seen[id] = true;
          var year = text(doc.year).match(/\d{4}/);
          var note = text(doc.description).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          if (note.length > 140) note = note.slice(0, 137).replace(/\s+\S*$/, "") + "…";
          var item = {
            identifier: id,
            title: text(doc.title) || "Untitled",
            years: year ? year[0] : "",
            note: note,
            search: true
          };
          results.appendChild(showButton(item));
        });
        var count = results.children.length;
        resultsHead.hidden = count === 0;
        if (!count) setStatus("No shows matched that search.");
        else setStatus(count === 1 ? "1 show. Press it to open the episodes." : count + " shows. Press one to open the episodes.");
      })
      .catch(function () {
        results.replaceChildren();
        resultsHead.hidden = true;
        setStatus("The archive search is unavailable right now. Try again in a moment.");
      })
      .then(function () {
        window.clearTimeout(timer);
        submit.disabled = false;
        results.removeAttribute("aria-busy");
      });
  });

  bindSession();
  setVolume(1);
  var saved = readStore();
  if (typeof saved.volume === "number") setVolume(saved.volume);
  var savedStation = STATIONS.findIndex(function (station) { return station.id === saved.station; });
  paintStation(savedStation >= 0 ? savedStation : 0);
  if (saved.identifier) {
    var restored = null;
    SHOWS.forEach(function (item) { if (item.identifier === saved.identifier) restored = item; });
    if (!restored) {
      restored = { identifier: saved.identifier, title: saved.title || "Show", years: "", note: "Picked up where it left off.", search: true };
    } else if (restored.station) {
      var back = STATIONS.findIndex(function (station) { return station.id === restored.station; });
      if (back >= 0) paintStation(back);
    }
    openShow(restored, { file: saved.file, position: saved.position, play: false });
  }

  window.__otr = {
    audio: audio,
    handlers: handlers,
    stations: STATIONS,
    shows: SHOWS,
    next: next,
    previous: previous,
    getState: function () {
      return {
        station: STATIONS[stationIndex].id,
        identifier: show && show.identifier,
        index: index,
        count: episodes.length,
        file: episodes[index] && episodes[index].name
      };
    }
  };
})();
