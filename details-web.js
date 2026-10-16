/* ============================================================
   details.js — Pure render logic for detail page
============================================================ */

var _eps = [];
var _epsChunk = 50;
var _epBanner = "";
var _anime = null;
var SAVED_KEY = 'aniDostSaved';
var HISTORY_KEY = 'aniDostHistory';
var SITE_NAME = 'AniDost';

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function fmtDur(d) {
  d = String(d == null ? "" : d).trim();
  if (!d) return "24:00";
  if (d.indexOf(":") === -1) {
    var n = parseInt(d, 10);
    return isNaN(n) ? d : pad2(n) + ":00";
  }
  var p = d.split(":").map(function (x) { return parseInt(x, 10) || 0; });
  return p.length >= 2 ? pad2(p[0]) + ":" + pad2(p[1]) : d;
}
function isMovie(a) {
  return (a.type || "").toLowerCase() === "movie" ||
         (a.format || "").toUpperCase() === "MOVIE";
}
function getRating(a) {
  var r = parseFloat(a.rating);
  return isNaN(r) ? null : r;
}
function buildEpFilename(animeTitle, epNum) {
  var t = String(animeTitle || "").trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ");
  return SITE_NAME + " - " + t + " - Episode " + epNum + ".mkv";
}
function normalizeTrailerUrl(url) {
  var u = String(url || "").trim();
  if (!u) return "";
  if (u.indexOf('http') !== 0 && u.length === 11) {
    return 'https://www.youtube.com/embed/' + u;
  }
  var yt1 = u.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (yt1) return 'https://www.youtube.com/embed/' + yt1[1];
  var yt2 = u.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (yt2) return 'https://www.youtube.com/embed/' + yt2[1];
  return u;
}

function readSaved() {
  try {
    var raw = localStorage.getItem(SAVED_KEY);
    var p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch (e) { return []; }
}
function writeSaved(ids) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch (e) {}
}
function isSaved(id) { return readSaved().indexOf(id) !== -1; }
function toggleSaved(id) {
  if (!id) return false;
  var s = readSaved();
  var i = s.indexOf(id);
  if (i === -1) s.unshift(id); else s.splice(i, 1);
  writeSaved(s);
  return s.indexOf(id) !== -1;
}
function readHistory() {
  try {
    var raw = localStorage.getItem(HISTORY_KEY);
    var p = raw ? JSON.parse(raw) : [];
    return Array.isArray(p) ? p : [];
  } catch (e) { return []; }
}
function writeHistory(entries) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch (e) {}
}
function recordHistoryClick(animeId) {
  if (!animeId) return;
  var all = readHistory();
  var existing = all.find(function (h) { return h.animeId === animeId; });
  var history = all.filter(function (h) { return h.animeId !== animeId; });
  history.unshift({ animeId: animeId, progress: existing ? existing.progress : 0, timestamp: Date.now() });
  writeHistory(history.slice(0, 50));
}

var SVG = {
  play:  '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>',
  star:  '<svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="currentColor" stroke="none"/></svg>',
  user:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  film:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/></svg>',
  save:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
};

function getSlugFromURL() {
  var params = new URLSearchParams(window.location.search);
  return params.get("slug") || params.get("id") || "";
}

function findAnimeBySlug(rawList, slug) {
  if (!slug) return null;
  for (var i = 0; i < rawList.length; i++) {
    var v = rawList[i];
    if ((v.slug && v.slug === slug) || (v.id && v.id === slug)) {
      return v;
    }
  }
  return null;
}

function renderDetail(a) {
  _anime = a;
  var el = document.getElementById("detailContent");
  if (!el) return;

  var mov = isMovie(a);
  var rat = getRating(a);
  var genres = (a.genres || "").split(",").map(function (g) { return g.trim(); }).filter(Boolean);
  var status = (a.status || "").toLowerCase();
  var isAiring = status.indexOf("airing") !== -1 || status === "releasing";

  document.title = (a.title || "Anime") + " - Ani Dost";

  var heroBg = a.banner || a.poster_2_3 || "";

  var html = '<div class="d-hero">'
    + '<div class="d-hero-bg" style="background-image:url(\'' + esc(heroBg) + '\')"></div>'
    + '</div>';

  html += '<div class="d-body">';

  html += '<div class="d-top">';
  html += '<div class="d-poster">';
  var initial = ((a.title || "?")[0] || "?").toUpperCase();
  if (a.poster_2_3) {
    html += '<img src="' + esc(a.poster_2_3) + '" alt="' + esc(a.title) + '" '
      + 'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      + '<div class="d-poster-ph" style="display:none">' + esc(initial) + '</div>';
  } else {
    html += '<div class="d-poster-ph">' + esc(initial) + '</div>';
  }
  html += '</div>';

  html += '<div class="d-info">';
  html += '<div class="d-badges">';
  html += '<span class="d-badge ' + (mov ? "movie" : "series") + '">' + (mov ? "Movie" : "Series") + '</span>';
  if (a.status) html += '<span class="d-badge ' + (isAiring ? "airing" : "finished") + '">' + esc(a.status) + '</span>';
  html += '</div>';
  html += '<div class="d-title">' + esc(a.title) + '</div>';
  html += '<div class="d-meta-row">';
  if (rat) html += '<span class="d-score">' + SVG.star + ' ' + rat.toFixed(2) + '</span><span class="dot"></span>';
  if (a.year) html += '<span>' + esc(a.year) + '</span><span class="dot"></span>';
  if (a.total_episodes) html += '<span>' + esc(a.total_episodes) + ' Episodes</span>';
  html += '</div>';

  if (genres.length) {
    html += '<div class="d-genres">';
    for (var g = 0; g < genres.length; g++) {
      // ✅ .html সরানো হয়েছে
      html += '<a class="d-genre" href="anime.html?genre=' + encodeURIComponent(genres[g]) + '">'
        + esc(genres[g]) + '</a>';
    }
    html += '</div>';
  }

  html += '</div>';
  html += '</div>';

  var saved = isSaved(a.slug || a.id);
  html += '<div class="d-actions">';
  if (!mov) {
    html += '<button class="d-btn watch" onclick="scrollToEpisodes()">' + SVG.play + ' Watch Now</button>';
  } else {
    html += '<button class="d-btn watch" onclick="watchMovie()">' + SVG.play + ' Watch</button>';
  }
  if (a.trailer_embed) {
    html += '<button class="d-btn trailer" onclick="scrollToTrailer()">▶ Trailer</button>';
  }
  html += '<button class="d-btn save-btn-detail' + (saved ? ' saved' : '') + '" id="detailSaveBtn" '
    + 'data-anime-id="' + esc(a.slug || a.id) + '" type="button">'
    + SVG.save + ' <span>' + (saved ? 'Saved' : 'Save') + '</span>'
    + '</button>';
  html += '</div>';

  var qualityText = '480p · 720p · 1080p';
  var audioText = a.audio || 'Hindi';

  var tiles = [
    ["Year", a.year],
    ["Format", a.format],
    ["Status", a.status],
    ["Source", a.source],
    ["Studios", a.studios],
    ["Episodes", a.total_episodes],
    ["Duration", a.episode_duration],
    ["Audio", audioText],
    ["Quality", qualityText]
  ].filter(function (t) { return t[1]; });

  if (tiles.length) {
    html += '<div class="d-info-grid">';
    for (var t = 0; t < tiles.length; t++) {
      html += '<div class="d-tile"><div class="tl">' + esc(tiles[t][0]) + '</div>'
        + '<div class="tv">' + esc(tiles[t][1]) + '</div></div>';
    }
    html += '</div>';
  }

  if (a.synopsis) {
    html += '<div class="d-section">'
      + '<div class="d-section-title">Synopsis</div>'
      + '<div class="d-synopsis" id="synBox">' + esc(a.synopsis).replace(/\n/g, "<br>") + '</div>'
      + '<button class="d-read-more" id="synBtn" onclick="toggleSyn()">Read more</button>'
      + '</div>';
  }

  if (a.trailer_embed) {
    var trailerSrc = normalizeTrailerUrl(a.trailer_embed);
    html += '<div class="d-section" id="trailerSection">'
      + '<div class="d-section-title">Official Trailer</div>'
      + '<div class="d-trailer">'
      + '<iframe src="' + esc(trailerSrc) + '" '
      + 'allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;fullscreen" '
      + 'allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>'
      + '</div></div>';
  }

  var chars = (a.characters || []).filter(function (c) { return c && c.name; });
  if (chars.length) {
    html += '<div class="d-section">'
      + '<div class="d-section-title">Characters</div>'
      + '<div class="d-chars-grid">';
    for (var c = 0; c < chars.length; c++) {
      var ch = chars[c];
      var main = (ch.role || "").toLowerCase() === "main";
      html += '<div class="d-char">';
      if (ch.image) {
        html += '<img class="d-char-img" src="' + esc(ch.image) + '" alt="' + esc(ch.name) + '" '
          + 'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
          + '<div class="d-char-ph" style="display:none">' + SVG.user + '</div>';
      } else {
        html += '<div class="d-char-ph">' + SVG.user + '</div>';
      }
      html += '<div class="d-char-name">' + esc(ch.name) + '</div>';
      html += '<div class="d-char-role ' + (main ? "main" : "sup") + '">' + (main ? "Main" : "Support") + '</div>';
      html += '</div>';
    }
    html += '</div></div>';
  }

  var eps = (a.episodes_list || []).slice().sort(function (x, y) {
    return String(x.number || "").localeCompare(String(y.number || ""), undefined, { numeric: true });
  });

  if (!mov && eps.length) {
    _eps = eps;
    _epBanner = a.banner || a.poster_2_3 || "";
    var CHUNK = 50;
    _epsChunk = CHUNK;
    var pages = Math.ceil(eps.length / CHUNK);

    html += '<div class="d-section" id="epSection">';
    html += '<div class="d-section-title">Episodes</div>';
    html += '<div class="ep-header">';
    html += '<div class="ep-pages" id="epPages">';
    if (pages > 1) {
      for (var p = 0; p < pages; p++) {
        var f = p * CHUNK + 1;
        var tt = Math.min((p + 1) * CHUNK, eps.length);
        html += '<button class="ep-page-btn' + (p === 0 ? ' on' : '') + '" '
          + 'data-page="' + p + '" onclick="renderEpPage(parseInt(this.getAttribute(\'data-page\'),10))">'
          + f + '\u2013' + tt + '</button>';
      }
    }
    html += '</div>';
    html += '<span class="ep-count">' + eps.length + ' Episodes</span>';
    html += '</div>';
    html += '<div class="ep-list" id="epList"></div>';
    html += '</div>';
  }

  html += '</div>';
  el.innerHTML = html;

  if (!mov && eps.length) renderEpPage(0);
  wireSaveButton();
}

function renderEpPage(page) {
  var eps = _eps || [];
  var CHUNK = _epsChunk || 50;
  var banner = _epBanner || "";
  var list = document.getElementById("epList");
  if (!list) return;

  var btns = document.querySelectorAll(".ep-page-btn");
  for (var b = 0; b < btns.length; b++) {
    btns[b].classList.toggle("on", parseInt(btns[b].dataset.page, 10) === page);
  }

  var slice = eps.slice(page * CHUNK, (page + 1) * CHUNK);
  var html = "";
  var animeTitle = _anime ? (_anime.title || "Anime") : "Anime";
  var animeSlug = _anime ? (_anime.slug || _anime.id || "") : "";

  for (var i = 0; i < slice.length; i++) {
    var ep = slice[i];
    var epNum = ep.number != null ? String(ep.number) : String(i + 1);
    var filename = buildEpFilename(animeTitle, epNum);
    var dur = fmtDur(ep.duration || "24");

    var thumbHtml = banner
      ? '<img src="' + esc(banner) + '" alt="" loading="lazy">'
      : '<div class="ep-thumb-ph">' + SVG.film + '</div>';

    html += '<div class="ep-row" onclick="openDownloadModal(\'' + esc(animeSlug) + '\', \'' + esc(epNum) + '\')" data-anime-id="' + esc(animeSlug) + '">';
    html += '<div class="ep-thumb">';
    html += thumbHtml;
    html += '<div class="ep-duration">' + esc(dur) + '</div>';
    html += '</div>';
    html += '<div class="ep-row-info">';
    html += '<div class="ep-title">' + esc(filename) + '</div>';
    html += '<div class="ep-quality">';
    html += '<span class="ep-q">1080p</span>';
    html += '<span class="ep-q">720p</span>';
    html += '<span class="ep-q">480p</span>';
    html += '</div>';
    html += '</div>';
    html += '<div class="ep-play">' + SVG.play + '</div>';
    html += '</div>';
  }
  list.innerHTML = html;
}

function toggleSyn() {
  var box = document.getElementById("synBox");
  var btn = document.getElementById("synBtn");
  if (!box) return;
  var open = box.classList.toggle("open");
  if (btn) btn.textContent = open ? "Show less" : "Read more";
}

function scrollToTrailer() {
  var el = document.getElementById("trailerSection");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  else alert("No trailer available.");
}

function scrollToEpisodes() {
  var el = document.getElementById("epSection");
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  else alert("No episodes available.");
}

function watchMovie() {
  alert("Movie player coming soon!");
}

function goBack() {
  if (document.referrer && document.referrer.indexOf(location.host) !== -1) {
    history.back();
  } else {
    location.href = "/";
  }
}

function toggleSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle('open');
  overlay.classList.toggle('open');
}
function closeSidebar() {
  var sidebar = document.getElementById('sidebar');
  var overlay = document.getElementById('sidebarOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.remove('open');
  overlay.classList.remove('open');
}

function wireSaveButton() {
  var btn = document.getElementById("detailSaveBtn");
  if (!btn) return;
  btn.addEventListener("click", function (e) {
    e.preventDefault(); e.stopPropagation();
    var id = btn.dataset.animeId;
    if (!id) return;
    var nowSaved = toggleSaved(id);
    btn.classList.toggle("saved", nowSaved);
    var svg = btn.querySelector("svg");
    if (svg) svg.setAttribute("fill", nowSaved ? "currentColor" : "none");
    var span = btn.querySelector("span");
    if (span) span.textContent = nowSaved ? "Saved" : "Save";
  });
}

function openDownloadModal(animeSlug, epNum) {
  var anime = _anime;
  if (!anime) return;

  var eps = anime.episodes_list || [];
  var ep = eps.find(function (e) {
    return String(e.number) === String(epNum);
  });

  var links = (ep && ep.download_links) ? ep.download_links : [];

  var qualities = ["1080p", "720p", "480p"];
  var linksHtml = "";

  qualities.forEach(function (q) {
    var match = links.find(function (l) {
      return (l.quality || "") === q && l.url && l.url.trim();
    });

    var url = match ? match.url : "";
    var disabled = url ? "" : " dl-btn-disabled";

    linksHtml += '<a class="dl-btn' + disabled + '" ' +
      (url
        ? 'href="' + esc(url) + '" target="_blank" rel="noopener" onclick="recordDownload(\'' + esc(animeSlug) + '\', \'' + esc(epNum) + '\')"'
        : 'onclick="return false;"'
      ) + '>' +
      '<span class="dl-q">' + q + '</span>' +
      '<span class="dl-icon">' + (url ? '⬇' : '✕') + '</span>' +
      '</a>';
  });

  var epTitle = buildEpFilename(anime.title, epNum);

  var modalHtml =
    '<div class="dl-modal-overlay" id="dlModalOverlay" onclick="closeDownloadModal(event)">' +
      '<div class="dl-modal" onclick="event.stopPropagation()">' +
        '<div class="dl-modal-head">' +
          '<div class="dl-modal-title">' + esc(epTitle) + '</div>' +
          '<button class="dl-modal-close" onclick="closeDownloadModal()">✕</button>' +
        '</div>' +
        '<div class="dl-modal-sub">Choose download quality</div>' +
        '<div class="dl-modal-links">' + linksHtml + '</div>' +
      '</div>' +
    '</div>';

  var old = document.getElementById("dlModalOverlay");
  if (old) old.remove();

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  document.body.style.overflow = "hidden";
}

function closeDownloadModal(e) {
  if (e && e.target && e.target.id !== "dlModalOverlay") return;
  var modal = document.getElementById("dlModalOverlay");
  if (modal) modal.remove();
  document.body.style.overflow = "";
}

function recordDownload(animeSlug, epNum) {
  var all = readHistory();
  var existing = all.find(function (h) { return h.animeId === animeSlug; });
  var history = all.filter(function (h) { return h.animeId !== animeSlug; });
  history.unshift({
    animeId: animeSlug,
    progress: existing ? existing.progress : 0,
    timestamp: Date.now(),
    lastEp: epNum
  });
  writeHistory(history.slice(0, 50));
}

function hideLoading() {
  var s = document.getElementById("loadingScreen");
  if (s) {
    s.classList.add("fade");
    setTimeout(function () { s.hidden = true; }, 550);
  }
}

function showNotSelected() {
  var el = document.getElementById("detailContent");
  if (!el) return;
  el.innerHTML =
    '<div style="text-align:center;padding:80px 20px;color:rgba(237,231,218,0.4)">'
    + '<h2 style="font-family:\'Bebas Neue\',sans-serif;font-size:1.75rem;color:var(--paper);margin-bottom:12px">No Anime Selected</h2>'
    + '<p style="margin-bottom:24px">Please select an anime from the home page.</p>'
    // ✅ .html সরানো হয়েছে
    + '<a href="index.html" style="color:var(--seal);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;font-size:0.75rem">← Go Home</a>'
    + '</div>';
  hideLoading();
}
function showNotFound() {
  var el = document.getElementById("detailContent");
  if (!el) return;
  el.innerHTML =
    '<div style="text-align:center;padding:80px 20px;color:rgba(237,231,218,0.4)">'
    + '<h2 style="font-family:\'Bebas Neue\',sans-serif;font-size:1.75rem;color:var(--paper);margin-bottom:12px">Anime Not Found</h2>'
    + '<p style="margin-bottom:24px">The anime you are looking for does not exist.</p>'
    // ✅ .html সরানো হয়েছে
    + '<a href="index.html" style="color:var(--seal);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;font-size:0.75rem">← Go Home</a>'
    + '</div>';
  hideLoading();
}

window.renderEpPage = renderEpPage;
window.toggleSyn = toggleSyn;
window.goBack = goBack;
window.scrollToEpisodes = scrollToEpisodes;
window.watchMovie = watchMovie;
window.scrollToTrailer = scrollToTrailer;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.openDownloadModal = openDownloadModal;
window.closeDownloadModal = closeDownloadModal;
window.recordDownload = recordDownload;

function renderDetailPage(rawList) {
  try {
    var slug = getSlugFromURL();
    if (!slug) {
      showNotSelected();
      return;
    }

    var a = findAnimeBySlug(rawList || [], slug);
    if (!a) {
      showNotFound();
      return;
    }

    console.log("[details] renderDetailPage for slug:", slug);
    recordHistoryClick(a.slug || a.id);
    renderDetail(a);
    hideLoading();
  } catch (err) {
    console.error('[details] render error:', err);
    hideLoading();
  }
}

window.renderDetailPage = renderDetailPage;

setTimeout(function () {
  if (!_anime) {
    hideLoading();
  }
}, 2000);