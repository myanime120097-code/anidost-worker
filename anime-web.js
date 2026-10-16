/* ============================================================
   anime.js — Browse page render
============================================================ */

var allAnime = [];
var filteredAnime = [];
var displayedCount = 0;
var ITEMS_PER_PAGE = 30;

var urlParams = new URLSearchParams(window.location.search);
var filterType = urlParams.get('type') || 'all';
var filterGenre = urlParams.get('genre') || '';
var searchQuery = urlParams.get('q') || '';
var sortBy = urlParams.get('sort') || 'latest';

var SAVED_KEY = 'aniDostSaved';
var HISTORY_KEY = 'aniDostHistory';

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function posterOrPlaceholder(poster) {
  return poster || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="300"%3E%3Crect fill="%231A181C" width="200" height="300"/%3E%3Ctext x="100" y="150" fill="%23EDE7DA" opacity="0.3" text-anchor="middle"%3ENo Poster%3C/text%3E%3C/svg%3E';
}
function getEpisodeDisplay(anime) {
  if (!anime || anime.type !== 'Series') return '';
  var episodes = anime.episodes_list || [];
  if (!episodes.length && Array.isArray(anime.seasons)) {
    anime.seasons.forEach(function (s) {
      if (s && s.episodes) episodes = episodes.concat(s.episodes);
    });
  }
  if (!episodes.length) return '';
  return 'E' + String(episodes.length).padStart(2, '0');
}

function mapBundleAnime(v) {
  if (!v || !v.title) return null;
  var episodesList = Array.isArray(v.episodes_list) ? v.episodes_list : [];

  var seasons = [];
  if (episodesList.length > 0) {
    seasons.push({
      name: "Season 1",
      episodes: episodesList.map(function (ep) {
        return {
          episodeNumber: ep.number,
          linkId: ep.linkId || "",
          duration: ep.duration || "24",
          created_at: ep.created_at || ""
        };
      })
    });
  } else if (Array.isArray(v.seasons)) {
    seasons = v.seasons;
  }

  var latestEpisodeTime = v.latestEpisodeTime || 0;
  if (!latestEpisodeTime && episodesList.length > 0) {
    episodesList.forEach(function (ep) {
      if (ep.created_at) {
        var t = new Date(ep.created_at).getTime();
        if (!isNaN(t) && t > latestEpisodeTime) latestEpisodeTime = t;
      }
    });
  }

  return {
    id:     v.slug || v.id || '',
    title:  v.title || 'Untitled',
    poster: v.poster_2_3 || v.poster || v.banner || '',
    banner: v.banner || v.poster_2_3 || '',
    type:   v.type || (v.format && String(v.format).toUpperCase() === 'MOVIE' ? 'Movie' : 'Series'),
    status: v.status || '',
    year:   v.year || '',
    rating: v.rating || '',
    genres: v.genres || '',
    seasons: seasons,
    episodes_list: episodesList,
    uploadTime: v.created_at_ms || v.upload_time || v.uploadTime || 0,
    editTime:   v.updated_at_ms || v.editTime || 0,
    created_at_ms: v.created_at_ms || 0,
    updated_at_ms: v.updated_at_ms || 0,
    latestEpisodeTime: latestEpisodeTime
  };
}

function readSaved() {
  try {
    var raw = localStorage.getItem(SAVED_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}
function writeSaved(ids) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(ids)); } catch (e) {}
}
function isSaved(animeId) { return readSaved().indexOf(animeId) !== -1; }
function toggleSaved(animeId) {
  if (!animeId) return false;
  var saved = readSaved();
  var idx = saved.indexOf(animeId);
  if (idx === -1) saved.unshift(animeId);
  else saved.splice(idx, 1);
  writeSaved(saved);
  return saved.indexOf(animeId) !== -1;
}
function readHistory() {
  try {
    var raw = localStorage.getItem(HISTORY_KEY);
    var parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
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
window.recordHistoryClick = recordHistoryClick;

function buildCard(anime, progress, index) {
  var poster = escapeHtml(posterOrPlaceholder(anime.poster));
  var epDisplay = getEpisodeDisplay(anime);
  var pct = Math.max(0, Math.min(1, progress || 0)) * 100;
  var safeId = escapeHtml(anime.id);
  var safeType = escapeHtml(anime.type);
  var safeTitle = escapeHtml(anime.title);
  var saved = isSaved(anime.id);

  var a = document.createElement('a');
  // ✅ .html সরানো হয়েছে
  a.href = 'details.html?slug=' + encodeURIComponent(anime.id);
  a.className = 'card';
  a.dataset.animeId = anime.id;
  if (typeof index === 'number') {
    a.style.animationDelay = Math.min(index * 20, 400) + 'ms';
  }
  a.innerHTML =
    '<div class="card-poster">' +
      '<div class="poster-bg" style="background-image: url(\'' + poster + '\');"></div>' +
      '<div class="poster-type">' + safeType + '</div>' +
      (epDisplay ? '<div class="poster-episode">' + escapeHtml(epDisplay) + '</div>' : '') +
      '<button type="button" class="save-btn' + (saved ? ' saved' : '') + '" data-anime-id="' + safeId + '" aria-label="Save">' +
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="' + (saved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>' +
      '</button>' +
      '<div class="poster-hover"><div class="play-circle"><svg width="16" height="16" viewBox="0 0 24 24" fill="#EDE7DA"><polygon points="5 3 19 12 5 21"/></svg></div></div>' +
    '</div>' +
    '<div class="card-info">' +
      '<div class="title">' + safeTitle + '</div>' +
      (pct > 0 ? '<div class="progress-bar"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' : '') +
    '</div>';
  return a;
}

function buildGenreMap() {
  var map = {};
  allAnime.forEach(function (a) {
    if (a.genres) {
      a.genres.split(',').forEach(function (g) {
        var t = g.trim();
        if (t) map[t] = (map[t] || 0) + 1;
      });
    }
  });
  return map;
}

function applyFilters() {
  var list = allAnime.slice();

  if (filterType === 'series') {
    list = list.filter(function (a) { return a.type === 'Series'; });
  } else if (filterType === 'movies') {
    list = list.filter(function (a) { return a.type === 'Movie'; });
  } else if (filterType === 'save') {
    var savedIds = readSaved();
    list = list.filter(function (a) { return savedIds.indexOf(a.id) !== -1; });
  } else if (filterType === 'history') {
    var histIds = readHistory().map(function (h) { return h.animeId; });
    list = list.filter(function (a) { return histIds.indexOf(a.id) !== -1; });
  }

  if (filterGenre) {
    var g = filterGenre.toLowerCase();
    list = list.filter(function (a) {
      return (a.genres || '').toLowerCase().split(',').map(function (s) { return s.trim(); }).indexOf(g) !== -1;
    });
  }

  if (searchQuery) {
    var q = searchQuery.toLowerCase();
    list = list.filter(function (a) {
      return String(a.title || '').toLowerCase().indexOf(q) !== -1;
    });
  }

  if (sortBy === 'title') {
    list.sort(function (a, b) { return String(a.title).localeCompare(String(b.title)); });
  } else if (sortBy === 'title-desc') {
    list.sort(function (a, b) { return String(b.title).localeCompare(String(a.title)); });
  } else if (sortBy === 'year') {
    list.sort(function (a, b) { return (parseInt(b.year) || 0) - (parseInt(a.year) || 0); });
  } else if (sortBy === 'rating') {
    list.sort(function (a, b) { return (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0); });
  } else {
    list.sort(function (a, b) {
      var ta = a.latestEpisodeTime || Math.max(a.uploadTime || 0, a.editTime || 0);
      var tb = b.latestEpisodeTime || Math.max(b.uploadTime || 0, b.editTime || 0);
      return tb - ta;
    });
  }

  filteredAnime = list;
}

function renderGrid(reset) {
  var grid = document.getElementById('browseGrid');
  if (!grid) return;

  if (reset) {
    grid.innerHTML = '';
    displayedCount = 0;
  }

  if (filteredAnime.length === 0) {
    grid.innerHTML =
      '<div class="browse-empty">' +
        '<div class="icon-wrap">' +
          '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '</div>' +
        '<h3>No results</h3>' +
        '<p>Try adjusting your filters, changing the sort order, or searching for something else.</p>' +
        // ✅ .html সরানো হয়েছে
        '<a class="reset-btn" href="anime.html">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>' +
          'Reset Filters' +
        '</a>' +
      '</div>';
    var lmw = document.getElementById('loadMoreWrap');
    if (lmw) lmw.style.display = 'none';
    updateCountLabel();
    renderActiveFilters();
    return;
  }

  var end = Math.min(displayedCount + ITEMS_PER_PAGE, filteredAnime.length);
  var frag = document.createDocumentFragment();
  for (var i = displayedCount; i < end; i++) {
    frag.appendChild(buildCard(filteredAnime[i], 0, i - displayedCount));
  }
  grid.appendChild(frag);
  displayedCount = end;

  var loadWrap = document.getElementById('loadMoreWrap');
  var loadProg = document.getElementById('loadMoreProgress');
  if (loadWrap) {
    if (displayedCount < filteredAnime.length) {
      loadWrap.style.display = 'flex';
      if (loadProg) loadProg.textContent = '· ' + displayedCount + ' / ' + filteredAnime.length;
    } else {
      loadWrap.style.display = 'none';
    }
  }

  updateCountLabel();
  renderActiveFilters();
}

function updateCountLabel() {
  var el = document.getElementById('resultCount');
  if (el) el.textContent = filteredAnime.length;

  var elAll = document.getElementById('tabCountAll');
  var elSeries = document.getElementById('tabCountSeries');
  var elMovies = document.getElementById('tabCountMovies');
  var elSaved = document.getElementById('tabCountSaved');
  var elHistory = document.getElementById('tabCountHistory');

  if (elAll) elAll.textContent = allAnime.length;
  if (elSeries) elSeries.textContent = allAnime.filter(function (a) { return a.type === 'Series'; }).length;
  if (elMovies) elMovies.textContent = allAnime.filter(function (a) { return a.type === 'Movie'; }).length;
  if (elSaved) elSaved.textContent = readSaved().length;
  if (elHistory) elHistory.textContent = readHistory().length;

  var clearBtn = document.getElementById('clearHistoryBtn');
  if (clearBtn) {
    var histCount = readHistory().length;
    if (filterType === 'history' && histCount > 0) {
      clearBtn.style.display = 'inline-flex';
    } else {
      clearBtn.style.display = 'none';
    }
  }
}

function renderGenreMenu() {
  var menu = document.getElementById('genreDdMenu');
  if (!menu) return;
  var map = buildGenreMap();
  var genres = Object.keys(map).sort(function (a, b) { return map[b] - map[a]; });

  var html = '';
  if (filterGenre) {
    html += '<button class="genre-option clear" data-genre="">✕ Clear genre filter</button>';
  }
  if (!genres.length) {
    html += '<div style="padding:14px 12px;font-size:0.8125rem;color:rgba(237,231,218,0.3);">No genres available</div>';
  } else {
    genres.forEach(function (g) {
      var active = filterGenre && filterGenre.toLowerCase() === g.toLowerCase();
      html += '<button class="genre-option' + (active ? ' active' : '') + '" data-genre="' + escapeHtml(g) + '">' +
        '<span>' + escapeHtml(g) + '</span>' +
        '<span class="num">' + map[g] + '</span>' +
      '</button>';
    });
  }
  menu.innerHTML = html;

  var label = document.getElementById('genreDdLabel');
  if (label) label.textContent = filterGenre ? filterGenre : 'Genre';
}

function closeGenreDd() {
  var dd = document.getElementById('genreDd');
  var toggle = document.getElementById('genreDdToggle');
  if (dd) dd.classList.remove('open');
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

function wireGenreDropdown() {
  var genreDdToggle = document.getElementById('genreDdToggle');
  if (genreDdToggle) {
    genreDdToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var dd = document.getElementById('genreDd');
      if (!dd) return;
      var willOpen = !dd.classList.contains('open');
      dd.classList.toggle('open', willOpen);
      this.setAttribute('aria-expanded', String(willOpen));
    });
  }
  document.addEventListener('click', function (e) {
    var dd = document.getElementById('genreDd');
    if (dd && !dd.contains(e.target)) closeGenreDd();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeGenreDd();
  });
  document.addEventListener('click', function (e) {
    var opt = e.target.closest('.genre-option');
    if (!opt) return;
    e.preventDefault();
    var g = opt.dataset.genre || '';
    setFilter('genre', g);
  });
}

function setFilter(key, value) {
  var params = new URLSearchParams(window.location.search);
  if (value) params.set(key, value);
  else params.delete(key);
  // ✅ .html সরানো হয়েছে
  window.location.href = 'anime.html?' + params.toString();
}

function renderActiveFilters() {
  var wrap = document.getElementById('activeFilters');
  if (!wrap) return;
  var chips = [];

  if (filterType !== 'all') {
    var typeLabel = filterType === 'series' ? 'Series'
                   : filterType === 'movies' ? 'Movies'
                   : filterType === 'save' ? 'Saved'
                   : filterType === 'history' ? 'History' : filterType;
    chips.push({ label: typeLabel, action: function () { setFilter('type', ''); } });
  }
  if (filterGenre) {
    chips.push({ label: filterGenre, action: function () { setFilter('genre', ''); } });
  }
  if (searchQuery) {
    chips.push({ label: '"' + searchQuery + '"', action: function () { setFilter('q', ''); } });
  }

  if (!chips.length) { wrap.innerHTML = ''; return; }

  var html = '';
  chips.forEach(function (c, i) {
    html += '<span class="filter-chip">' + escapeHtml(c.label) +
      '<button type="button" data-chip-index="' + i + '" aria-label="Remove filter">' +
        '<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
      '</button></span>';
  });
  wrap.innerHTML = html;

  wrap.querySelectorAll('[data-chip-index]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var idx = parseInt(this.dataset.chipIndex, 10);
      if (chips[idx]) chips[idx].action();
    });
  });
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
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;

function wireEventHandlers() {
  var clearHistoryBtn = document.getElementById('clearHistoryBtn');
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', function () {
      if (!confirm('Clear your entire watch history? This cannot be undone.')) return;
      writeHistory([]);
      applyFilters();
      renderGrid(true);
      updateCountLabel();
      clearHistoryBtn.style.display = 'none';
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('.save-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var id = btn.dataset.animeId;
    if (!id) return;
    var nowSaved = toggleSaved(id);
    btn.classList.toggle('saved', nowSaved);
    var svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', nowSaved ? 'currentColor' : 'none');
    updateCountLabel();
  }, true);

  document.addEventListener('click', function (e) {
    if (e.target.closest('.save-btn')) return;
    var card = e.target.closest('a.card');
    if (!card) return;
    var id = card.dataset.animeId;
    if (id) recordHistoryClick(id);
  }, true);

  var sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.value = sortBy;
    sortSelect.addEventListener('change', function () {
      setFilter('sort', this.value === 'latest' ? '' : this.value);
    });
  }

  var loadMoreBtn = document.getElementById('loadMoreBtn');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', function () {
      renderGrid(false);
    });
  }
}

function updatePageHeader() {
  var title = document.getElementById('browseTitle');
  var eyebrow = document.getElementById('heroEyebrow');
  var lede = document.getElementById('browseLede');
  if (!title) return;

  var mainLabel = 'All Anime';
  var eyebrowText = 'Library';
  if (filterType === 'series') { mainLabel = 'TV <span class="accent">Series</span>'; eyebrowText = 'Browse'; }
  else if (filterType === 'movies') { mainLabel = 'Anime <span class="accent">Movies</span>'; eyebrowText = 'Browse'; }
  else if (filterType === 'save') { mainLabel = 'Your <span class="accent">Saved</span>'; eyebrowText = 'Collection'; }
  else if (filterType === 'history') { mainLabel = 'Watch <span class="accent">History</span>'; eyebrowText = 'Activity'; }

  title.innerHTML = mainLabel;
  if (eyebrow) eyebrow.textContent = eyebrowText;

  if (lede) {
    if (filterType === 'save') {
      lede.innerHTML = 'Everything you\'ve bookmarked, all in one place. Manage your <strong>Ani Dost</strong> collection.';
    } else if (filterType === 'history') {
      lede.innerHTML = 'Pick up where you left off. Your recently watched <strong>Ani Dost</strong> titles appear here.';
    } else if (filterType === 'series') {
      lede.innerHTML = 'Full-length <strong>TV series</strong> with episode tracking. Filter by genre or sort to find your next binge.';
    } else if (filterType === 'movies') {
      lede.innerHTML = 'Standalone <strong>anime films</strong> — perfect for a single-sitting watch.';
    } else {
      lede.innerHTML = 'The complete <strong>Ani Dost</strong> library. Filter by type, genre, or sort order to find your next watch.';
    }
  }
}

function hideLoading() {
  var s = document.getElementById('loadingScreen');
  if (s) {
    s.classList.add('fade');
    setTimeout(function () { s.hidden = true; }, 550);
  }
}

function renderAnimePage(rawList) {
  try {
    allAnime = (rawList || [])
      .map(mapBundleAnime)
      .filter(Boolean);

    console.log("[anime] renderAnimePage called with", allAnime.length, "anime");

    updatePageHeader();
    renderGenreMenu();
    applyFilters();
    renderGrid(true);
    updateCountLabel();
    wireEventHandlers();
    wireGenreDropdown();
    hideLoading();
  } catch (err) {
    console.error('[anime] render error:', err);
    var errEl = document.getElementById('loadError');
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = 'Failed to load anime: ' + err.message;
    }
    hideLoading();
  }
}

window.renderAnimePage = renderAnimePage;

setTimeout(function () {
  if (allAnime.length === 0) {
    hideLoading();
  }
}, 2000);