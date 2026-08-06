/**
 * Flixnest — Movie Discovery App
 * Powered by TMDB API & Firebase (v8 Direct Script)
 */

const TMDB_API_KEY = 'cabe5308c13c33800e064dad84ba30b8';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const EMBED_PROVIDERS = [
  "https://vidsrc.sbs/embed/movie/",
  "https://vidsrc.online/embed/movie/4k/",
  "https://vidsrc.online/embed/movie/",
  "https://vidsrc.to/embed/movie/",
  "https://vsembed.ru/embed/movie/"
];
let currentProviderIndex = 0; 

const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'w1280';
const THUMB_SIZE = 'w342';

/* ─── State ─────────────────────────────────────────────────────────── */
const state = {
  movies: [],
  page: 1,
  totalPages: 1,
  query: '',
  vibe: 'all',
  loading: false,
  hasMore: true,
  watchlist: [],
  currentModalMovie: null,
  currentWatchMovieId: null,
  wheelSpinning: false,
  watchlistOnly: false,
};

/* ─── DOM Refs ──────────────────────────────────────────────────────── */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  searchInput: $('#search-input'),
  voiceBtn: $('#voice-search-btn'),
  movieGrid: $('#movie-grid'),
  skeletonGrid: $('#skeleton-grid'),
  scrollSentinel: $('#scroll-sentinel'),
  loadMoreSpinner: $('#load-more-spinner'),
  sectionTitle: $('#section-title'),
  resultsCount: $('#results-count'),
  movieModal: $('#movie-modal'),
  watchModal: $('#watch-modal'),
  watchModalBackdrop: $('#watch-modal-backdrop'),
  watchModalPanel: $('#watch-modal-panel'),
  watchModalTitle: $('#watch-modal-title'),
  watchModalClose: $('#watch-modal-close'),
  watchModalDetails: $('#watch-modal-details'),
  
  // 🔥 New Premium Player Refs 🔥
  mainVideo: $('#mainVideo'),
  videoContainer: $('#videoContainer'),
  centerPlayBtn: $('#centerPlayBtn'),
  playPauseBtn: $('#playPauseBtn'),
  fullScreenBtn: $('#fullScreenBtn'),
  
  modalBackdrop: $('#modal-backdrop'),
  modalPanel: $('#modal-panel'),
  modalClose: $('#modal-close'),
  modalHero: $('#modal-hero'),
  modalBackdropImg: $('#modal-backdrop-img'),
  modalPoster: $('#modal-poster'),
  modalTitle: $('#modal-title'),
  modalMeta: $('#modal-meta'),
  modalRatingValue: $('#modal-rating-value'),
  modalImdb: $('#modal-imdb'),
  modalImdbRating: $('#modal-imdb-rating'),
  modalOverview: $('#modal-overview'),
  modalTrailerSection: $('#modal-trailer-section'),
  modalTrailer: $('#modal-trailer'),
  modalProviders: $('#modal-providers'),
  modalProvidersEmpty: $('#modal-providers-empty'),
  modalWatchlistBtn: $('#modal-watchlist-btn'),
  toastContainer: $('#toast-container'),
  watchlistToggle: $('#watchlist-toggle'),
  watchlistCount: $('#watchlist-count'),
  watchlistDrawer: $('#watchlist-drawer'),
  watchlistOverlay: $('#watchlist-overlay'),
  watchlistClose: $('#watchlist-close'),
  watchlistItems: $('#watchlist-items'),
  watchlistEmpty: $('#watchlist-empty'),
  luckyBtn: $('#lucky-btn'),
  wheelModal: $('#wheel-modal'),
  wheelClose: $('#wheel-close'),
  spinBtn: $('#spin-btn'),
  luckyWheel: $('#lucky-wheel'),
  wheelSegments: $('#wheel-segments'),
  apiNotice: $('#api-notice'),
};

/* ─── Vibe Mapping ──────────────────────────────────────────────────── */
const VIBE_CONFIG = {
  all: { title: 'Trending Now', endpoint: '/trending/movie/week' },
  viral: { title: 'Viral Section', endpoint: '/trending/movie/day' },
  'mind-bending': { title: 'Mind-bending Picks', discover: { with_genres: '878,9648,53', sort_by: 'vote_average.desc', 'vote_count.gte': 200 } },
  'action-packed': { title: 'Action-packed Thrills', discover: { with_genres: '28,12', sort_by: 'popularity.desc' } },
  'feel-good': { title: 'Feel-good Favorites', discover: { with_genres: '35,10751,16', sort_by: 'popularity.desc' } },
  'top-rated': { title: 'Top Rated Masterpieces', discover: { sort_by: 'vote_average.desc', 'vote_count.gte': 1000 } },
};

/* ─── Firebase Setup (v8) ───────────────────────────────────────────── */
const firebaseConfig = {
  apiKey: "AIzaSyC149Y2CR46kYH2StZCJXc-87BP9EroIcg",
  authDomain: "flixrel.firebaseapp.com",
  projectId: "flixrel",
  storageBucket: "flixrel.firebasestorage.app",
  messagingSenderId: "838788026123",
  appId: "1:838788026123:web:dfca0835a24b4816499c0e"
};
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* ─── Utilities ─────────────────────────────────────────────────────── */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

const debouncedSearch = debounce((query) => {
  state.query = query.trim();
  fetchMovies(true);
}, 300);

function posterUrl(path, size = POSTER_SIZE) {
  return path ? `${TMDB_IMG}/${size}${path}` : placeholderPoster();
}

function backdropUrl(path) {
  return path ? `${TMDB_IMG}/${BACKDROP_SIZE}${path}` : '';
}

function placeholderPoster() {
  return `data:image/svg+xml,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" fill="#1a1f2e"><rect width="300" height="450"/><text x="50%" y="50%" fill="#4b5563" font-size="14" text-anchor="middle" dy=".3em">No Poster</text></svg>'
  )}`;
}

function formatYear(dateStr) {
  return dateStr ? dateStr.slice(0, 4) : 'N/A';
}

function getVidsrcUrl(movieId) {
  const baseUrl = EMBED_PROVIDERS[currentProviderIndex];
  return `${baseUrl}${movieId}`;
}

window.switchServer = function() {
  if (!state.currentWatchMovieId) return;
  currentProviderIndex = (currentProviderIndex + 1) % EMBED_PROVIDERS.length;
  // This will need adjustment if dealing with raw mp4s later
  if(els.mainVideo) els.mainVideo.src = getVidsrcUrl(state.currentWatchMovieId);
  showToast('Server switched successfully!', 'info');
};

function isApiConfigured() {
  return TMDB_API_KEY && TMDB_API_KEY !== 'YOUR_TMDB_API_KEY_HERE';
}

async function tmdbFetch(path, params = {}) {
  if (!isApiConfigured()) throw new Error('API_KEY_MISSING');
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB ${res.status}`);
  return res.json();
}

function showToast(message, type = 'success') {
  const icons = {
    success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
    info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    remove: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>',
  };
  const colors = {
    success: 'border-emerald-500/30 text-emerald-300',
    info: 'border-indigo-500/30 text-indigo-300',
    remove: 'border-rose-500/30 text-rose-300',
  };

  const toast = document.createElement('div');
  toast.className = `pointer-events-auto glass-strong rounded-xl px-4 py-3 flex items-center gap-3 border ${colors[type]} shadow-xl animate-toast-in`;
  toast.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">${icons[type]}</svg>
    </div>
    <p class="text-sm text-white/85">${message}</p>
  `;
  els.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('animate-toast-in');
    toast.classList.add('animate-toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3200);
}

/* ─── Watchlist ─────────────────────────────────────────────────────── */
const WATCHLIST_KEY = 'flixnest_watchlist';

function loadWatchlist() {
  try {
    state.watchlist = JSON.parse(localStorage.getItem(WATCHLIST_KEY)) || [];
  } catch {
    state.watchlist = [];
  }
  updateWatchlistUI();
}

function saveWatchlist() {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(state.watchlist));
  updateWatchlistUI();
}

function isInWatchlist(id) {
  return state.watchlist.some((m) => m.id === id);
}

function toggleWatchlist(movie) {
  const idx = state.watchlist.findIndex((m) => m.id === movie.id);
  if (idx >= 0) {
    state.watchlist.splice(idx, 1);
    showToast(`Removed "${movie.title}" from watchlist`, 'remove');
  } else {
    state.watchlist.unshift({
      id: movie.id,
      title: movie.title,
      poster_path: movie.poster_path,
      vote_average: movie.vote_average,
      release_date: movie.release_date,
    });
    showToast(`Added "${movie.title}" to watchlist`, 'success');
  }
  saveWatchlist();
  syncWatchlistButtons(movie.id);
}

function updateWatchlistUI() {
  if (!els.watchlistCount) return;
  els.watchlistCount.textContent = state.watchlist.length;
  els.watchlistEmpty.classList.toggle('hidden', state.watchlist.length > 0);
  els.watchlistItems.innerHTML = '';

  state.watchlist.forEach((movie) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all duration-200 text-left group';
    item.innerHTML = `
      <img src="${posterUrl(movie.poster_path, THUMB_SIZE)}" alt="" class="w-12 h-18 rounded-lg object-cover border border-white/5" loading="lazy" />
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium truncate group-hover:text-indigo-300 transition-colors duration-200">${movie.title}</p>
        <p class="text-xs text-white/35">${formatYear(movie.release_date)} · ★ ${movie.vote_average?.toFixed(1) ?? '—'}</p>
      </div>
    `;
    item.addEventListener('click', () => openWatchModal(movie.id, movie.title));
    els.watchlistItems.appendChild(item);
  });
}

function syncWatchlistButtons(movieId) {
  const saved = isInWatchlist(movieId);
  els.modalWatchlistBtn?.classList.toggle('saved', saved);
  document.querySelectorAll(`[data-watchlist-id="${movieId}"]`).forEach((btn) => {
    btn.classList.toggle('saved', saved);
  });
}

/* ─── Skeletons & Tilt ──────────────────────────────────────────────── */
function renderSkeletons(count = 10) {
  els.skeletonGrid.classList.remove('hidden');
  els.skeletonGrid.innerHTML = Array.from({ length: count }, () => `
    <div class="rounded-2xl overflow-hidden glass">
      <div class="aspect-[2/3] skeleton"></div>
      <div class="p-3 space-y-2">
        <div class="h-3 skeleton rounded w-3/4"></div>
        <div class="h-2 skeleton rounded w-1/2"></div>
      </div>
    </div>
  `).join('');
}

function hideSkeletons() {
  els.skeletonGrid.classList.add('hidden');
  els.skeletonGrid.innerHTML = '';
}

function extractDominantColor(imgEl) {
  return new Promise((resolve) => {
    if (!imgEl.complete || !imgEl.naturalWidth) {
      imgEl.addEventListener('load', () => resolve(sampleColor(imgEl)), { once: true });
      imgEl.addEventListener('error', () => resolve('#6366f1'), { once: true });
    } else {
      resolve(sampleColor(imgEl));
    }
  });
}

function sampleColor(img) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 40;
    canvas.height = 40;
    ctx.drawImage(img, 0, 0, 40, 40);
    const data = ctx.getImageData(0, 0, 40, 40).data;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < data.length; i += 16) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      count++;
    }
    r = Math.round(r / count);
    g = Math.round(g / count);
    b = Math.round(b / count);
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return '#6366f1';
  }
}

function attachTilt(card, inner) {
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    inner.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
  });
  card.addEventListener('mouseleave', () => {
    inner.style.transform = '';
  });
}

/* ─── Movie Card Rendering ──────────────────────────────────────────── */
function createMovieCard(movie, index) {
  const card = document.createElement('article');
  card.className = 'movie-card stagger-item relative rounded-2xl cursor-pointer group';
  card.style.animationDelay = `${(index % 20) * 0.06}s`;
  card.dataset.movieId = movie.id;

  card.innerHTML = `
    <div class="movie-card-glow" style="background: #6366f1"></div>
    <div class="movie-card-inner relative rounded-2xl overflow-hidden glass border border-white/5 hover:border-indigo-500/30 transition-colors duration-300">
      <div class="relative aspect-[2/3] overflow-hidden bg-white/5">
        <img
          class="poster-img absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          src="${posterUrl(movie.poster_path)}"
          alt="${movie.title}"
          loading="lazy"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div>
        <button
          type="button"
          data-watchlist-id="${movie.id}"
          class="heart-btn absolute top-2.5 right-2.5 z-20 p-2 rounded-full glass opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 ${isInWatchlist(movie.id) ? 'saved opacity-100' : ''}"
        >
          <svg class="w-4 h-4" fill="${isInWatchlist(movie.id) ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
          </svg>
        </button>
        <div class="absolute bottom-0 inset-x-0 p-3 z-10 translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
          <h3 class="text-sm font-semibold leading-tight line-clamp-2 mb-1">${movie.title}</h3>
          <div class="flex items-center justify-between text-xs text-white/50">
            <span>${formatYear(movie.release_date)}</span>
            <span class="flex items-center gap-0.5 text-amber-400/90">
              ★ ${movie.vote_average?.toFixed(1) ?? '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  `;

  card.classList.add('animate-fade-slide-up');

  const inner = card.querySelector('.movie-card-inner');
  const posterImg = card.querySelector('.poster-img');
  const glow = card.querySelector('.movie-card-glow');

  attachTilt(card, inner);

  posterImg.addEventListener('load', async () => {
    const color = await extractDominantColor(posterImg);
    glow.style.background = color;
  });

  card.querySelector('.heart-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleWatchlist(movie);
  });

  card.addEventListener('click', () => openWatchModal(movie.id, movie.title, movie.embedUrl, movie.poster_path));

  return card;
}

function renderMovies(movies, append = false) {
  if (!append) els.movieGrid.innerHTML = '';
  movies.forEach((movie, i) => {
    const globalIndex = append ? els.movieGrid.children.length + i : i;
    els.movieGrid.appendChild(createMovieCard(movie, globalIndex));
  });
  els.resultsCount.textContent = state.query ? `${els.movieGrid.children.length}+ results` : '';
}

/* ─── Fetching Data (TMDB + Firebase v8) ────────────────────────────── */
async function fetchMovies(reset = false) {
  if (state.loading || (!state.hasMore && !reset)) return;
  if (!isApiConfigured()) {
    els.apiNotice?.classList.remove('hidden');
    return;
  }

  state.loading = true;
  if (reset) {
    state.page = 1;
    state.hasMore = true;
    state.movies = [];
    renderSkeletons();
  } else {
    els.loadMoreSpinner?.classList.remove('hidden');
  }

  try {
    let results = [];

    if (state.query) {
      // TMDB থেকে সার্চ ফলাফল আনা
      const data = await tmdbFetch('/search/movie', { query: state.query, page: state.page });
      let tmdbResults = data.results?.filter((m) => m.poster_path) || [];

      // প্রথম পেজে ফায়ারবেস থেকে আপনার আপলোড করা মুভি/সিরিজগুলো সার্চ করা
      if (state.page === 1) {
        try {
          const snapshot = await db.collection("episodes").get();
          const fbResults = [];
          snapshot.forEach((doc) => {
            const d = doc.data();
            const title = d.series || d.title || '';
            if (title.toLowerCase().includes(state.query.toLowerCase())) {
              fbResults.push({
                id: doc.id,
                title: title || 'Unknown Title',
                poster_path: d.posterUrl || d.image || d.poster || null,
                release_date: '2026-08-04',
                vote_average: 10.0,
                embedUrl: d.embedUrl || d.url
              });
            }
          });
          results = [...fbResults, ...tmdbResults];
        } catch (e) {
          results = tmdbResults;
        }
      } else {
        results = tmdbResults;
      }

      state.totalPages = data.total_pages || 1;
      state.hasMore = state.page < state.totalPages;

    } else if (state.vibe === 'viral') {
      const snapshot = await db.collection("episodes").where("category", "==", "viral").get();
      snapshot.forEach((doc) => {
        const d = doc.data();
        results.push({
          id: doc.id,
          title: d.series || 'Unknown Title',
          poster_path: d.posterUrl || null,
          release_date: '2026-08-04',
          vote_average: 10.0,
          embedUrl: d.embedUrl
        });
      });
      state.totalPages = 1;
      state.hasMore = false;
    } else {
      const vibe = VIBE_CONFIG[state.vibe];
      let data;
      if (vibe.endpoint) {
        data = await tmdbFetch(vibe.endpoint, { page: state.page });
      } else {
        data = await tmdbFetch('/discover/movie', { page: state.page, ...vibe.discover });
      }
      results = data.results?.filter((m) => m.poster_path) || [];
      state.totalPages = data.total_pages || 1;
      state.hasMore = state.page < state.totalPages;
    }

    if (reset) hideSkeletons();
    else els.loadMoreSpinner?.classList.add('hidden');

    if (reset) {
      state.movies = results;
      renderMovies(results);
    } else {
      state.movies.push(...results);
      renderMovies(results, true);
    }

    state.page++;
  } catch (err) {
    hideSkeletons();
    els.loadMoreSpinner?.classList.add('hidden');
    if (err.message === 'API_KEY_MISSING') {
      els.apiNotice?.classList.remove('hidden');
    } else {
      showToast('Failed to load movies. Please try again.', 'info');
    }
  } finally {
    state.loading = false;
  }
}

/* ─── Watch Modal & Premium Player Logic ────────────────────────────── */
function openWatchModal(movieId, title = 'Movie', customEmbedUrl = null, posterPath = null) {
  state.currentWatchMovieId = movieId;
  els.watchModalTitle.textContent = title;
  
  // Set Video Poster
  if (posterPath && els.mainVideo) {
     els.mainVideo.poster = posterUrl(posterPath, BACKDROP_SIZE);
  }

  // Set Video Source (Temporarily using dummy link for testing)
  // In real life, here you will fetch the scraped direct .mp4 or .m3u8 link
  const dummyVideoLink = "https://www.w3schools.com/html/mov_bbb.mp4";
  if(els.mainVideo) {
      els.mainVideo.src = customEmbedUrl ? customEmbedUrl : dummyVideoLink; 
      
      // Reset Player UI
      els.centerPlayBtn.classList.remove('hidden');
      els.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
  }

  els.watchModal.classList.remove('hidden');
  els.watchModal.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

// Close Modal
els.watchModalClose.addEventListener('click', () => {
  els.watchModal.classList.add('hidden');
  els.watchModal.classList.remove('flex');
  
  if(els.mainVideo) {
      els.mainVideo.pause();
      els.mainVideo.src = '';
  }
  
  state.currentWatchMovieId = null;
  document.body.style.overflow = '';
});

// 🔥 Premium Player Play/Pause Logic
function togglePlay() {
    if (!els.mainVideo) return;
    
    if (els.mainVideo.paused) {
        els.mainVideo.play();
        els.centerPlayBtn.classList.add('hidden');
        els.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'; // Pause Icon
    } else {
        els.mainVideo.pause();
        els.centerPlayBtn.classList.remove('hidden');
        els.playPauseBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; // Play Icon
    }
}

// Attach Play events
if(els.centerPlayBtn) els.centerPlayBtn.addEventListener('click', togglePlay);
if(els.playPauseBtn) els.playPauseBtn.addEventListener('click', togglePlay);
if(els.mainVideo) els.mainVideo.addEventListener('click', togglePlay);

// 🔥 Native Full-Screen API Logic
if(els.fullScreenBtn) {
    els.fullScreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            // Enter Fullscreen
            if (els.videoContainer.requestFullscreen) {
                els.videoContainer.requestFullscreen();
            } else if (els.videoContainer.webkitRequestFullscreen) { /* Safari */
                els.videoContainer.webkitRequestFullscreen();
            } else if (els.videoContainer.msRequestFullscreen) { /* IE11 */
                els.videoContainer.msRequestFullscreen();
            }
        } else {
            // Exit Fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) { /* Safari */
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { /* IE11 */
                document.msExitFullscreen();
            }
        }
    });
}


els.searchInput?.addEventListener('input', (e) => debouncedSearch(e.target.value));

function initVibeFilters() {
  const vibeButtons = document.querySelectorAll('[data-vibe], .vibe-btn');
  vibeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      vibeButtons.forEach((b) => b.classList.remove('active', 'bg-indigo-600'));
      btn.classList.add('active', 'bg-indigo-600');
      state.vibe = btn.dataset.vibe || 'all';
      fetchMovies(true);
    });
  });
}

function initInfiniteScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && state.hasMore && !state.loading && !state.watchlistOnly) {
        fetchMovies(false);
      }
    },
    { rootMargin: '200px' }
  );
  if (els.scrollSentinel) observer.observe(els.scrollSentinel);
}

// Initialization
initVibeFilters();
initInfiniteScroll();
loadWatchlist();
fetchMovies(true);
