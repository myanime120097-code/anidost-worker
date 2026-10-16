/* ============================================================
   home.js — Pure render logic for home page
============================================================ */

var allAnime = [];
var featuredAnime = [];

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

  var latestEpisodeTime = v.latestEpisodeTime || 0;
  if (!latestEpisodeTime) {
    episodesList.forEach(function (ep) {
      if (ep.created_at) {
        var t = new Date(ep.created_at).getTime();
        if (!isNaN(t) && t > latestEpisodeTime) latestEpisodeTime = t;
      }
    });
  }

  return {
    id:     v.slug || v.id || '',
    slug:   v.slug || v.id || '',
    title:  v.title || 'Untitled',
    poster: v.poster_2_3 || v.poster || v.banner || '',
    banner: v.banner || v.poster_2_3 || '',
    type:   v.type || (v.format && String(v.format).toUpperCase() === 'MOVIE' ? 'Movie' : 'Series'),
    format: v.format || '',
    status: v.status || '',
    year:   v.year || '',
    rating: v.rating || '',
    genres: v.genres || '',
    synopsis: v.synopsis || '',
    source: v.source || '',
    studios: v.studios || '',
    total_episodes: v.total_episodes || '',
    episode_duration: v.episode_duration || '',
    trailer_embed: v.trailer_embed || '',
    characters: v.characters || [],
    episodes_list: episodesList,
    uploadTime: v.created_at_ms || 0,
    editTime:   v.updated_at_ms || 0,
    created_at_ms: v.created_at_ms || 0,
    updated_at_ms: v.updated_at_ms || 0,
    latestEpisodeTime: latestEpisodeTime
  };
}

var HISTORY_KEY = 'aniDostHistory';
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
function saveWatchProgress(animeId, progress) {
  if (!animeId) return;
  var history = readHistory().filter(function (h) { return h.animeId !== animeId; });
  history.unshift({ animeId: animeId, progress: Math.max(0, Math.min(1, progress || 0)), timestamp: Date.now() });
  writeHistory(history.slice(0, 50));
  renderHistoryRows();
}
function recordHistoryClick(animeId) {
  if (!animeId) return;
  var all = readHistory();
  var existing = all.find(function (h) { return h.animeId === animeId; });
  var history = all.filter(function (h) { return h.animeId !== animeId; });
  history.unshift({ animeId: animeId, progress: existing ? existing.progress : 0, timestamp: Date.now() });
  writeHistory(history.slice(0, 50));
}
window.saveWatchProgress = saveWatchProgress;
window.recordHistoryClick = recordHistoryClick;

var SAVED_KEY = 'aniDostSaved';
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
function findAnime(id) {
  for (var i = 0; i < allAnime.length; i++) {
    if (allAnime[i].id === id) return allAnime[i];
  }
  return null;
}

function buildCard(anime, progress) {
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

function renderTrack(trackEl, items, limit) {
  if (!trackEl) return 0;
  trackEl.innerHTML = '';
  var count = 0;
  var max = limit || items.length;
  for (var i = 0; i < items.length && count < max; i++) {
    trackEl.appendChild(buildCard(items[i], 0));
    count++;
  }
  return count;
}

function sortByLatestEpisode(a, b) {
  var ta = a.latestEpisodeTime || Math.max(a.uploadTime || 0, a.editTime || 0);
  var tb = b.latestEpisodeTime || Math.max(b.uploadTime || 0, b.editTime || 0);
  return tb - ta;
}
function renderAllRows() {
  var recent = allAnime.slice().sort(sortByLatestEpisode);
  var series = recent.filter(function (a) { return a.type === 'Series'; });
  var movies = recent.filter(function (a) { return a.type === 'Movie'; });

  var sCount = renderTrack(document.getElementById('seriesTrack'), series, 15);
  var sRow = document.getElementById('seriesRecentRow');
  if (sRow) sRow.style.display = sCount ? '' : 'none';

  var mCount = renderTrack(document.getElementById('moviesTrack'), movies, 15);
  var mRow = document.getElementById('moviesRecentRow');
  if (mRow) mRow.style.display = mCount ? '' : 'none';

  renderHistoryRows();
}
function renderHistoryRows() {
  var history = readHistory();
  var histRow = document.getElementById('watchHistoryRow');
  var histTrack = document.getElementById('watchHistoryTrack');

  if (histRow && histTrack) {
    if (!history.length) {
      histRow.style.display = 'none';
    } else {
      var sorted = history.slice().sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
      histTrack.innerHTML = '';
      var histCount = 0;
      for (var i = 0; i < sorted.length && histCount < 15; i++) {
        var anime = findAnime(sorted[i].animeId);
        if (!anime) continue;
        histTrack.appendChild(buildCard(anime, sorted[i].progress));
        histCount++;
      }
      histRow.style.display = histCount ? '' : 'none';
    }
  }
  renderSavedRow();
}
function renderSavedRow() {
  var savedRow = document.getElementById('savedRow');
  var savedTrack = document.getElementById('savedTrack');
  if (!savedRow || !savedTrack) return;
  var savedIds = readSaved();
  savedTrack.innerHTML = '';
  var count = 0;
  for (var i = 0; i < savedIds.length && count < 15; i++) {
    var anime = findAnime(savedIds[i]);
    if (!anime) continue;
    savedTrack.appendChild(buildCard(anime, 0));
    count++;
  }
  savedRow.style.display = count ? '' : 'none';
}

function renderFilterCounts() {
  var total = allAnime.length;
  var seriesCount = 0, movieCount = 0;
  var genreSet = {};

  allAnime.forEach(function (a) {
    if (a.type === 'Series') seriesCount++;
    else if (a.type === 'Movie') movieCount++;

    if (a.genres) {
      a.genres.split(',').forEach(function (g) {
        var t = g.trim();
        if (t) genreSet[t] = (genreSet[t] || 0) + 1;
      });
    }
  });

  var elAll = document.getElementById('countAll');
  var elSeries = document.getElementById('countSeries');
  var elMovies = document.getElementById('countMovies');
  if (elAll) elAll.textContent = total;
  if (elSeries) elSeries.textContent = seriesCount;
  if (elMovies) elMovies.textContent = movieCount;

  var container = document.getElementById('genrePillsContainer');
  if (!container) return;
  container.innerHTML = '';

  var genres = Object.keys(genreSet).sort(function (a, b) {
    return genreSet[b] - genreSet[a];
  });

  genres.forEach(function (g) {
    var a = document.createElement('a');
    a.className = 'pill';
    // ✅ .html সরানো হয়েছে
    a.href = 'anime.html?genre=' + encodeURIComponent(g);
    a.dataset.genre = g;
    a.innerHTML = escapeHtml(g) + ' <span style="opacity:0.6;font-size:0.75em;margin-left:2px;">' + genreSet[g] + '</span>';
    container.appendChild(a);
  });
}

function pickFeatured(list, count) {
  var copy = list.slice();
  for (var i = copy.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp;
  }
  return copy.slice(0, Math.min(count, copy.length));
}

function renderHero() {
  var heroInner = document.getElementById('heroInner');
  var heroBg = document.getElementById('heroBg');
  if (!heroInner || !heroBg) return;

  if (!featuredAnime.length) {
    heroInner.innerHTML =
      '<div class="empty-state" style="padding:60px 20px;">' +
        '<span class="icon">—</span>' +
        '<p style="font-size:1rem;font-weight:600;color:rgba(237,231,218,0.5);margin-bottom:8px;">No anime found</p>' +
        '<p style="font-size:0.875rem;color:rgba(237,231,218,0.25);">Add anime from admin panel</p>' +
      '</div>';
    return;
  }

  var html = '';
  html += '<div class="hero-top">';
  html += '<div class="hero-eyebrow">Featured / <span id="heroIndexLabel">01</span></div>';
  html += '<div class="hero-count">' + featuredAnime.length + ' Total</div>';
  html += '</div>';

  html += '<div class="hero-deck" id="heroDeck">';
  for (var i = 0; i < featuredAnime.length; i++) {
    var s = featuredAnime[i];
    var posterUrl = escapeHtml(s.poster || '');
    html += '<div class="deck-card" data-index="' + i + '" style="background-image:url(\'' + posterUrl + '\')" onclick="goToSlide(' + i + ')"></div>';
  }
  html += '</div>';

  html += '<div class="hero-info">';
  for (var k = 0; k < featuredAnime.length; k++) {
    var slide = featuredAnime[k];
    var episodeCount = (slide.episodes_list && slide.episodes_list.length) || 0;
    var epDisplay = '';
    if (slide.type === 'Series' && episodeCount > 0) {
      epDisplay = 'E' + String(episodeCount).padStart(2, '0');
    }

    var genresStr = slide.genres || '';
    var genreArray = genresStr.split(',').map(function (g) { return g.trim(); }).filter(Boolean);

    html += '<div class="hero-panel" data-index="' + k + '" style="' + (k === 0 ? '' : 'display:none;') + '">';
    html += '<div class="hero-meta-row">';
    if (slide.status) {
      var st = String(slide.status).toLowerCase();
      var statusClass = (st === 'ongoing' || st === 'releasing') ? 'ongoing' : 'completed';
      html += '<span class="hero-status ' + statusClass + '">' + escapeHtml(String(slide.status).toUpperCase()) + '</span>';
    }
    html += '<span class="hero-pill">' + escapeHtml(String(slide.type).toUpperCase()) + '</span>';
    if (slide.year) {
      html += '<span class="hero-pill gold">' + escapeHtml(slide.year) + '</span>';
    }
    if (slide.rating) {
      html += '<span class="hero-pill rating">★ ' + escapeHtml(slide.rating) + '</span>';
    }
    if (epDisplay) {
      html += '<span class="hero-pill">' + epDisplay + '</span>';
    }
    html += '</div>';
    html += '<h1 class="hero-title">' + escapeHtml(slide.title) + '</h1>';

    if (genreArray.length) {
      html += '<div class="hero-genres">';
      genreArray.forEach(function (g) {
        // ✅ .html সরানো হয়েছে
        html += '<a class="hero-genre-link" href="anime.html?genre=' + encodeURIComponent(g) + '">' + escapeHtml(g) + '</a>';
      });
      html += '</div>';
    }

    html += '<div class="hero-actions">';
    // ✅ .html সরানো হয়েছে
    html += '<a href="details.html?slug=' + encodeURIComponent(slide.id) + '" class="btn-watch" data-anime-id="' + escapeHtml(slide.id) + '">';
    html += '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21"/></svg> Watch Now';
    html += '</a>';
    var heroSaved = isSaved(slide.id);
    html += '<button type="button" class="btn-save-hero' + (heroSaved ? ' saved' : '') + '" data-anime-id="' + escapeHtml(slide.id) + '" aria-label="Save">';
    html += '<svg width="18" height="18" viewBox="0 0 24 24" fill="' + (heroSaved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
    html += '<span>' + (heroSaved ? 'Saved ✓' : 'Save') + '</span>';
    html += '</button>';
    html += '</div>';
    html += '</div>';
  }
  html += '<div class="hero-ghost-num" id="heroGhostNum">01</div>';
  html += '</div>';

  if (featuredAnime.length > 1) {
    html += '<div class="hero-dots" id="heroDots">';
    for (var d = 0; d < featuredAnime.length; d++) {
      html += '<button class="hero-dot' + (d === 0 ? ' active' : '') + '" data-index="' + d + '" onclick="goToSlide(' + d + ')"></button>';
    }
    html += '</div>';
  }

  heroInner.innerHTML = html;
  initHeroSlider();
}

var currentSlide = 0;
var slideInterval = null;
var deckCards = [];
var heroPanels = [];
var heroIndexLabel = null;
var heroGhostNum = null;
var heroDots = [];

function updateHeroBg(index) {
  var heroBg = document.getElementById('heroBg');
  if (!heroBg || !featuredAnime[index]) return;
  var bannerUrl = featuredAnime[index].banner || featuredAnime[index].poster || '';
  heroBg.style.backgroundImage = 'url(\'' + bannerUrl + '\')';
}

function goToSlide(index) {
  if (!deckCards.length) return;
  var totalSlides = deckCards.length;
  index = ((index % totalSlides) + totalSlides) % totalSlides;

  deckCards.forEach(function (card) {
    var cardIndex = parseInt(card.dataset.index, 10);
    var offset = cardIndex - index;
    if (offset > totalSlides / 2) offset -= totalSlides;
    if (offset < -totalSlides / 2) offset += totalSlides;

    card.classList.remove('pos-active', 'pos-n1', 'pos-p1', 'pos-n2', 'pos-p2', 'pos-far-n', 'pos-far-p', 'pos-far');
    if (offset === 0) card.classList.add('pos-active');
    else if (offset === -1) card.classList.add('pos-n1');
    else if (offset === 1) card.classList.add('pos-p1');
    else if (offset === -2) card.classList.add('pos-n2');
    else if (offset === 2) card.classList.add('pos-p2');
    else if (offset < -2) card.classList.add('pos-far-n');
    else if (offset > 2) card.classList.add('pos-far-p');
    else card.classList.add('pos-far');
  });

  heroPanels.forEach(function (panel) {
    panel.style.display = parseInt(panel.dataset.index, 10) === index ? '' : 'none';
  });

  heroDots.forEach(function (dot, i) {
    dot.classList.toggle('active', i === index);
  });

  var num = String(index + 1).padStart(2, '0');
  if (heroIndexLabel) heroIndexLabel.textContent = num;
  if (heroGhostNum) heroGhostNum.textContent = num;

  updateHeroBg(index);

  currentSlide = index;
  resetInterval();
}
window.goToSlide = goToSlide;

function nextSlide() {
  if (!deckCards.length) return;
  goToSlide((currentSlide + 1) % deckCards.length);
}
function prevSlide() {
  if (!deckCards.length) return;
  goToSlide((currentSlide - 1 + deckCards.length) % deckCards.length);
}
function resetInterval() {
  clearInterval(slideInterval);
  if (deckCards.length > 1) slideInterval = setInterval(nextSlide, 5000);
}
function initHeroSlider() {
  deckCards = Array.prototype.slice.call(document.querySelectorAll('.deck-card'));
  heroPanels = Array.prototype.slice.call(document.querySelectorAll('.hero-panel'));
  heroIndexLabel = document.getElementById('heroIndexLabel');
  heroGhostNum = document.getElementById('heroGhostNum');
  heroDots = Array.prototype.slice.call(document.querySelectorAll('.hero-dot'));
  if (deckCards.length > 0) goToSlide(0);
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'ArrowLeft') prevSlide();
  if (e.key === 'ArrowRight') nextSlide();
});

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

var searchInput = document.getElementById('liveSearchInput');
var searchClear = document.getElementById('searchClear');
var liveResults = document.getElementById('liveResults');
var liveList = document.getElementById('liveResultsList');
var searchLoading = document.getElementById('searchLoading');
var searchTimeout = null;

function highlightMatch(text, query) {
  var safeText = escapeHtml(text);
  var lowerText = safeText.toLowerCase();
  var lowerQuery = escapeHtml(query).toLowerCase();
  var index = lowerText.indexOf(lowerQuery);
  if (index === -1) return safeText;
  return safeText.substring(0, index) +
    '<span class="highlight">' + safeText.substring(index, index + lowerQuery.length) + '</span>' +
    safeText.substring(index + lowerQuery.length);
}

function performLiveSearch(query) {
  var trimmed = query.trim().toLowerCase();
  if (searchTimeout) { clearTimeout(searchTimeout); searchTimeout = null; }

  if (!trimmed) {
    if (liveResults) liveResults.classList.remove('active');
    if (liveList) liveList.innerHTML = '';
    if (searchLoading) searchLoading.classList.remove('active');
    return;
  }

  if (searchLoading) searchLoading.classList.add('active');
  if (liveResults) liveResults.classList.add('active');
  if (liveList) liveList.innerHTML = '';

  searchTimeout = setTimeout(function () {
    var results = allAnime.filter(function (a) {
      return String(a.title || '').toLowerCase().indexOf(trimmed) !== -1;
    });

    if (searchLoading) searchLoading.classList.remove('active');

    if (results.length === 0) {
      if (liveList) {
        liveList.innerHTML =
          '<div class="search-no-results">' +
            '<span class="icon">—</span>' +
            'No results found for "<strong style="color:rgba(237,231,218,0.5)">' + escapeHtml(query) + '</strong>"' +
          '</div>';
      }
    } else {
      var html = '';
      results.slice(0, 15).forEach(function (anime) {
        var poster = escapeHtml(posterOrPlaceholder(anime.poster));
        var highlightedTitle = highlightMatch(anime.title, query);
        var typeClass = anime.type === 'Movie' ? 'movie' : '';
        var epInfo = getEpisodeDisplay(anime);
        var safeId = escapeHtml(anime.id);
        var safeType = escapeHtml(anime.type);
        // ✅ .html সরানো হয়েছে
        html +=
          '<a href="details.html?slug=' + encodeURIComponent(anime.id) + '" class="search-result-item" data-anime-id="' + safeId + '">' +
            '<div class="result-poster" style="background-image: url(\'' + poster + '\');"></div>' +
            '<div class="result-info">' +
              '<div class="result-title">' + highlightedTitle + '</div>' +
              '<div class="result-meta">' +
                '<span class="badge ' + typeClass + '">' + safeType + '</span>' +
                (epInfo ? '<span>' + escapeHtml(epInfo) + '</span>' : '') +
              '</div>' +
            '</div>' +
            '<span class="result-arrow">→</span>' +
          '</a>';
      });
      if (liveList) liveList.innerHTML = html;
    }
  }, 150);
}

if (searchInput) {
  searchInput.addEventListener('input', function () {
    performLiveSearch(this.value);
    if (searchClear) searchClear.classList.toggle('visible', this.value.length > 0);
  });
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      this.value = '';
      if (searchClear) searchClear.classList.remove('visible');
      if (liveResults) liveResults.classList.remove('active');
      if (liveList) liveList.innerHTML = '';
      if (searchLoading) searchLoading.classList.remove('active');
      this.blur();
      e.preventDefault();
    }
  });
}
if (searchClear) {
  searchClear.addEventListener('click', function () {
    if (searchInput) searchInput.value = '';
    searchClear.classList.remove('visible');
    if (liveResults) liveResults.classList.remove('active');
    if (liveList) liveList.innerHTML = '';
    if (searchLoading) searchLoading.classList.remove('active');
    if (searchInput) searchInput.focus();
  });
}
document.addEventListener('click', function (e) {
  var searchSection = document.querySelector('.search-section');
  if (searchSection && !searchSection.contains(e.target)) {
    if (liveResults) liveResults.classList.remove('active');
  }
});

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
  renderSavedRow();
}, true);

document.addEventListener('click', function (e) {
  var btn = e.target.closest('.btn-save-hero');
  if (!btn) return;
  e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
  var id = btn.dataset.animeId;
  if (!id) return;
  var nowSaved = toggleSaved(id);
  btn.classList.toggle('saved', nowSaved);
  var svg = btn.querySelector('svg');
  if (svg) svg.setAttribute('fill', nowSaved ? 'currentColor' : 'none');
  var span = btn.querySelector('span');
  if (span) span.textContent = nowSaved ? 'Saved ✓' : 'Save';
  renderSavedRow();
}, true);

document.addEventListener('click', function (e) {
  if (e.target.closest('.save-btn')) return;
  var card = e.target.closest('a.card');
  if (!card) return;
  var id = card.dataset.animeId;
  if (id) recordHistoryClick(id);
}, true);

document.addEventListener('click', function (e) {
  var btn = e.target.closest('.btn-watch');
  if (!btn) return;
  var id = btn.dataset.animeId;
  if (id) recordHistoryClick(id);
}, true);

document.addEventListener('click', function (e) {
  var item = e.target.closest('.search-result-item');
  if (!item) return;
  var id = item.dataset.animeId;
  if (id) recordHistoryClick(id);
}, true);

var clearHistoryBtn = document.getElementById('clearHistoryBtn');
if (clearHistoryBtn) {
  clearHistoryBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Clear your entire watch history?')) {
      writeHistory([]);
      renderHistoryRows();
    }
  });
}

function hideLoading() {
  var s = document.getElementById('loadingScreen');
  if (s) {
    s.classList.add('fade');
    setTimeout(function () { s.hidden = true; }, 550);
  }
}

function renderHome(rawList) {
  try {
    allAnime = (rawList || [])
      .map(mapBundleAnime)
      .filter(Boolean);

    console.log("[home] renderHome called with", allAnime.length, "anime");

    allAnime.sort(function (a, b) {
      return (b.updated_at_ms || b.created_at_ms || 0) - (a.updated_at_ms || a.created_at_ms || 0);
    });

    if (allAnime.length === 0) {
      var es = document.getElementById('emptyState');
      if (es) es.style.display = '';
      hideLoading();
      return;
    }

    featuredAnime = pickFeatured(allAnime, 10);

    renderHero();
    renderAllRows();
    renderFilterCounts();
    hideLoading();
  } catch (err) {
    console.error('[home] render error:', err);
    var errEl = document.getElementById('loadError');
    if (errEl) {
      errEl.style.display = 'block';
      errEl.textContent = 'Failed to load anime: ' + err.message;
    }
    hideLoading();
  }
}

window.renderHome = renderHome;

setTimeout(function () {
  if (allAnime.length === 0) {
    var es = document.getElementById('emptyState');
    if (es) es.style.display = '';
    hideLoading();
  }
}, 2000);