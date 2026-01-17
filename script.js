// script.js — lógica principal corregida (buscador, hero con ids, navegación atrás/adelante)

let continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
let featuredList = [];
let currentHeroIndex = 0;
let autoSlideInterval;
let moviesListInternal = window.moviesList || [];
let seriesListInternal = window.seriesList || [];
let touchStartX = 0;
let touchEndX = 0;
let currentModalItem = null;
let currentModalType = null;
let isPlayingTrailer = false; 
let currentView = 'home'; 

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar estado de historial para poder manejar back correctamente
    window.history.replaceState({ view: 'home', modal: false }, '');
    setTimeout(() => { initApp(); }, 200);
});

function initApp() {
    // Actualizar referencias internas por si los scripts añadieron items
    moviesListInternal = window.moviesList || [];
    seriesListInternal = window.seriesList || [];

    renderHomeView();

    // Recién agregadas (límite 20) usando orden de carga
    if (window.allContentSequence && window.allContentSequence.length > 0) {
        const strictOrderList = [...window.allContentSequence].reverse();
        renderList('newlyAddedRow', strictOrderList.slice(0, 20));
    } else {
        const allContent = [...moviesListInternal, ...seriesListInternal];
        renderList('newlyAddedRow', allContent.reverse().slice(0, 20));
    }

    renderContinueWatching();
    setupHero(); // Configura el Hero basado en id.js
    setupEventListeners();
    setupSearch(); // inicializa buscador
    switchView('home', false);
}

// --- HERO: acepta strings (ids) o referencias a objetos ---
function setupHero() {
    moviesListInternal = window.moviesList || [];
    seriesListInternal = window.seriesList || [];
    const allContent = [...moviesListInternal, ...seriesListInternal];

    featuredList = [];

    if (window.HERO_IDS && Array.isArray(window.HERO_IDS) && window.HERO_IDS.length > 0) {
        featuredList = window.HERO_IDS.map(entry => {
            if (!entry && entry !== 0) return null;
            if (typeof entry === 'object') return entry;       // referencia directa a objeto
            // entry es string/number: buscar en allContent por id
            const str = String(entry);
            return allContent.find(i => String(i.id) === str) || null;
        }).filter(Boolean);
    }

    // Fallback: tomar primeros featured si no se encontró nada
    if (featuredList.length === 0) {
        const allFeatured = allContent.filter(i => i.featured);
        featuredList = allFeatured.slice(0, 5);
    }

    renderHero();
    startAutoSlide();
}

function renderHero() {
    const container = document.querySelector('.carousel-container');
    const dots = document.getElementById('heroDots');
    if (!container || featuredList.length === 0) {
        if (container) container.innerHTML = '';
        if (dots) dots.innerHTML = '';
        return;
    }

    container.innerHTML = featuredList.map((item, i) => `
        <div class="carousel-slide" data-index="${i}" style="display:${i===0 ? 'block' : 'none'}">
            <img src="${escapeHtml(item.image || '')}" alt="${escapeHtml(item.title || '')}">
        </div>
    `).join('');

    dots.innerHTML = featuredList.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`).join('');

    // listeners para dots
    Array.from(dots.querySelectorAll('.dot')).forEach(dot => {
        dot.onclick = (e) => {
            const idx = Number(e.currentTarget.getAttribute('data-index'));
            updateHeroVisuals(idx);
            startAutoSlide();
        };
    });

    currentHeroIndex = 0;
}

function updateHeroVisuals(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    slides.forEach(s => s.style.display = 'none');
    dots.forEach(d => d.classList.remove('active'));

    currentHeroIndex = ((index % slides.length) + slides.length) % slides.length;
    slides[currentHeroIndex].style.display = 'block';
    if (dots[currentHeroIndex]) dots[currentHeroIndex].classList.add('active');
}

function nextHeroSlide() {
    if (featuredList.length === 0) return;
    updateHeroVisuals(currentHeroIndex + 1);
}

function prevHeroSlide() {
    if (featuredList.length === 0) return;
    updateHeroVisuals(currentHeroIndex - 1);
}

function startAutoSlide() { 
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextHeroSlide, 5000);
}

// --- Render y utilidades ---
function renderHomeView() {
    const moviesShuffled = [...moviesListInternal];
    const seriesShuffled = [...seriesListInternal];
    shuffleArray(moviesShuffled);
    shuffleArray(seriesShuffled);

    renderMultiRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    renderMultiRow('homeSeriesRow', seriesShuffled.slice(0, 30));
}

function switchView(viewName, pushToHistory = true) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-movies').classList.add('hidden');
    document.getElementById('view-series').classList.add('hidden');
    document.getElementById('searchOverlay').style.display = 'none';
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    window.scrollTo({top: 0, behavior: 'auto'});
    currentView = viewName;

    if (viewName === 'home') {
        document.getElementById('view-home').classList.remove('hidden');
        document.getElementById('nav-home').classList.add('active');
        renderHomeView(); 
    } else if (viewName === 'movies') {
        document.getElementById('view-movies').classList.remove('hidden');
        document.getElementById('nav-movies').classList.add('active');
        const moviesShuffled = [...moviesListInternal];
        shuffleArray(moviesShuffled);
        renderList('allMoviesGrid', moviesShuffled);
    } else if (viewName === 'series') {
        document.getElementById('view-series').classList.remove('hidden');
        document.getElementById('nav-series').classList.add('active');
        const seriesShuffled = [...seriesListInternal];
        shuffleArray(seriesShuffled);
        renderList('allSeriesGrid', seriesShuffled);
    }

    if (pushToHistory) window.history.pushState({ view: viewName, modal: false }, '');
}

function renderMultiRow(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const start = i * 10;
        const end = start + 10;
        const chunk = list.slice(start, end);
        if (chunk.length === 0) break;

        const rowDiv = document.createElement('div');
        rowDiv.className = 'row horizontal-scroll';
        rowDiv.innerHTML = chunk.map(item => createItemHTML(item)).join('');
        container.appendChild(rowDiv);
    }
}

function renderList(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map(item => createItemHTML(item)).join('');
}

function createItemHTML(item) {
    const type = item.type || (item.seasons ? 'series' : 'movies');
    const idVal = item.id === undefined ? '' : String(item.id);
    return `
        <div class="item" onclick="openModal('${escapeHtml(idVal)}', '${type}')">
            <img src="${escapeHtml(item.image || '')}" loading="lazy" alt="${escapeHtml(item.title || '')}">
            <div class="item-title">${escapeHtml(item.title || '')}</div>
        </div>
    `;
}

function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
              .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Modal / Reproductor ---
function openModal(id, type) {
    // Cerrar overlay de búsqueda si está abierto
    const searchOverlay = document.getElementById('searchOverlay');
    if(searchOverlay && searchOverlay.style.display === 'block') {
        searchOverlay.style.display = 'none';
    }

    const idStr = String(id);
    // Buscar item por id
    let all = [...moviesListInternal, ...seriesListInternal];
    let item = all.find(i => String(i.id) === idStr);

    // también revisar window.HERO_IDS si por alguna razón contiene referencias
    if (!item && window.HERO_IDS && Array.isArray(window.HERO_IDS)) {
        const match = window.HERO_IDS.find(e => typeof e === 'object' && String(e.id) === idStr);
        if (match) item = match;
    }

    if (!item) {
        console.warn('openModal: no se encontró item con id=', idStr);
        return;
    }

    currentModalItem = item;
    currentModalType = item.seasons ? 'series' : 'movies';

    // pushState para permitir cerrar con back
    window.history.pushState({ view: currentView, modal: true, id: item.id }, '');

    const modal = document.getElementById('videoModal');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDesc');
    const actionBtn = document.getElementById('modalActionBtn');
    const episodesDiv = document.getElementById('seriesEpisodeSelector');
    const modalIdEl = document.getElementById('modalId');

    document.body.classList.add('modal-open');

    titleEl.innerText = item.title || '';
    modalIdEl.innerText = item.id !== undefined ? `ID: ${item.id}` : '';
    document.getElementById('modalYear').innerText = item.year || '';
    document.getElementById('modalType').innerText = (item.seasons ? 'Serie' : 'Película');
    descEl.innerText = item.info || '';
    
    if (item.seasons) {
        episodesDiv.classList.remove('hidden');
        const select = document.getElementById('modalSeasonSelect');
        select.innerHTML = item.seasons.map(s => `<option value="${s.season}">Temporada ${s.season}</option>`).join('');
        renderEpisodes(item.seasons[0], item, 0); 

        actionBtn.innerHTML = '<i class="fas fa-film"></i> Ver Tráiler';
        actionBtn.onclick = () => {
             setPlayerVideo(item.trailer, "Tráiler");
             document.querySelectorAll('.episode-button').forEach(b => b.classList.remove('active'));
        };

        select.onchange = (e) => {
            const val = e.target.value;
            const season = item.seasons.find(s => String(s.season) === String(val));
            if(season) renderEpisodes(season, item, -1);
        };
    } else {
        episodesDiv.classList.add('hidden');
        setPlayerVideo(item.video); 
        addToContinueWatching(item, 'movies');
        isPlayingTrailer = false;
        actionBtn.innerHTML = '<i class="fas fa-film"></i> Ver Tráiler';
        
        actionBtn.onclick = () => {
            if (isPlayingTrailer) {
                setPlayerVideo(item.video);
                actionBtn.innerHTML = '<i class="fas fa-film"></i> Ver Tráiler';
                isPlayingTrailer = false;
            } else {
                setPlayerVideo(item.trailer, "Tráiler");
                actionBtn.innerHTML = '<i class="fas fa-play"></i> Ver Película';
                isPlayingTrailer = true;
            }
        };
    }

    renderRealRecommendations(item.id);
    modal.style.display = 'flex';
}

function renderEpisodes(season, serieItem, autoPlayIndex = -1) {
    const container = document.getElementById('modalEpisodesContainer');
    container.innerHTML = ''; 
    if(!season || !season.episodes) return;
    container.innerHTML = season.episodes.map((ep, idx) => `
        <button class="episode-button ${idx === autoPlayIndex ? 'active' : ''}" data-idx="${idx}">${ep.episode}</button>
    `).join('');

    if (autoPlayIndex >= 0 && season.episodes[autoPlayIndex]) {
        const ep = season.episodes[autoPlayIndex];
        setPlayerVideo(ep.video, `T${season.season}: Cap ${ep.episode}`);
        addToContinueWatching(serieItem, 'series');
    }

    const buttons = container.querySelectorAll('.episode-button');
    buttons.forEach((btn, index) => {
        btn.onclick = () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const ep = season.episodes[index];
            setPlayerVideo(ep.video, `T${season.season}: Cap ${ep.episode}`);
            addToContinueWatching(serieItem, 'series');
        };
    });
}

function setPlayerVideo(url, overlayText = null) {
    const playerDiv = document.getElementById('modalContentPlayer');
    playerDiv.innerHTML = ''; 
    if (!url) {
        playerDiv.innerHTML = '<div class="video-container" style="display:flex;align-items:center;justify-content:center;color:gray;">Video no disponible</div>';
        return;
    }
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.style.width = '100%';
    iframe.style.height = '360px';
    const container = document.createElement('div');
    container.className = 'video-container';
    container.appendChild(iframe);
    if (overlayText) {
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay-label';
        overlay.innerText = overlayText;
        container.appendChild(overlay);
    }
    playerDiv.appendChild(container);
}

function renderRealRecommendations(currentId) {
    const container = document.getElementById('modalRecommendations');
    let allContent = [...moviesListInternal, ...seriesListInternal].filter(i => String(i.id) !== String(currentId));
    shuffleArray(allContent);
    const selection = allContent.slice(0, 6);
    container.innerHTML = selection.map(item => `
        <div class="item" onclick="openModal('${item.id}', '${item.seasons ? 'series' : 'movies'}')">
            <img src="${item.image || ''}">
            <div class="item-title">${item.title || ''}</div>
        </div>
    `).join('');
}

// --- Continue watching ---
function addToContinueWatching(item, type) {
    continueWatching = continueWatching.filter(i => String(i.id) !== String(item.id));
    continueWatching.unshift({ ...item, type });
    if (continueWatching.length > 10) continueWatching.pop();
    localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
    renderContinueWatching();
}

function renderContinueWatching() {
    const row = document.getElementById('continueWatching');
    const container = document.getElementById('continueWatchingContainer');
    if (!row) return;
    if (continueWatching.length === 0) { container.classList.add('hidden'); return; }
    container.classList.remove('hidden');
    row.innerHTML = continueWatching.map(item => createItemHTML(item)).join('');
}

// --- Eventos y navegación ---
function setupEventListeners() {
    const hero = document.getElementById('hero');
    if (hero) {
        hero.onclick = (e) => {
            if (Math.abs(touchStartX - touchEndX) < 10) {
                const current = featuredList[currentHeroIndex];
                if (current) openModal(current.id, current.seasons ? 'series' : 'movies');
            }
        };
        hero.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
        hero.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            const dist = touchEndX - touchStartX;
            if (Math.abs(dist) > 30) {
                if (dist < 0) nextHeroSlide(); else prevHeroSlide();
                startAutoSlide();
            }
        }, {passive: true});
    }

    // Botón cerrar modal: usa history.back() para activar popstate y unificar comportamiento
    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.onclick = () => {
            const state = window.history.state;
            if (state && state.modal) {
                window.history.back();
            } else {
                hideModal();
                window.history.replaceState({ view: currentView, modal: false }, '');
            }
        };
    }

    // Manejo popstate: cerrar modal al navegar atrás, o abrir si modal=true
    window.addEventListener('popstate', (e) => {
        const state = e.state || { view: 'home', modal: false };
        if (state.modal) {
            // Si recibimos modal=true y hay id, abrir modal del id (si no está abierto)
            if (state.id && (!currentModalItem || String(currentModalItem.id) !== String(state.id))) {
                // buscar item y abrir sin empujar otro estado (openModal empuja por sí mismo), así que abriremos directamente el modal DOM sin push
                const all = [...moviesListInternal, ...seriesListInternal];
                const item = all.find(i => String(i.id) === String(state.id));
                if (item) {
                    // abrir modal "manual" (sin pushState) para no duplicar historial
                    currentModalItem = item;
                    currentModalType = item.seasons ? 'series' : 'movies';
                    const modal = document.getElementById('videoModal');
                    document.getElementById('modalTitle').innerText = item.title || '';
                    document.getElementById('modalId').innerText = item.id ? `ID: ${item.id}` : '';
                    document.getElementById('modalYear').innerText = item.year || '';
                    document.getElementById('modalType').innerText = item.seasons ? 'Serie' : 'Película';
                    document.getElementById('modalDesc').innerText = item.info || '';
                    if (!item.seasons) setPlayerVideo(item.video);
                    renderRealRecommendations(item.id);
                    modal.style.display = 'flex';
                    document.body.classList.add('modal-open');
                }
            }
        } else {
            // modal=false => cerrar modal y navegar a la vista indicada
            hideModal();
            if (state.view) {
                switchView(state.view, false);
            } else {
                switchView('home', false);
            }
        }
    });

    // Navegación inferior
    const navHome = document.getElementById('nav-home');
    const navMovies = document.getElementById('nav-movies');
    const navSeries = document.getElementById('nav-series');
    const navSearch = document.getElementById('nav-search');

    if (navHome) navHome.onclick = (e) => { e.preventDefault(); switchView('home'); };
    if (navMovies) navMovies.onclick = (e) => { e.preventDefault(); switchView('movies'); };
    if (navSeries) navSeries.onclick = (e) => { e.preventDefault(); switchView('series'); };
    if (navSearch) navSearch.onclick = (e) => { e.preventDefault(); openSearch(); };

    // Cerrar modal al click en fondo
    const modal = document.getElementById('videoModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                const state = window.history.state;
                if (state && state.modal) window.history.back();
                else hideModal();
            }
        });
    }
}

function hideModal() {
    const modal = document.getElementById('videoModal');
    if (!modal) return;
    modal.style.display = 'none';
    document.body.classList.remove('modal-open');
    // Parar el iframe (limpiar)
    const playerDiv = document.getElementById('modalContentPlayer');
    if (playerDiv) playerDiv.innerHTML = '';
    currentModalItem = null;
    currentModalType = null;
    isPlayingTrailer = false;
}

// --- Buscador ---
function setupSearch() {
    const input = document.getElementById('searchInput');
    const closeSearch = document.getElementById('closeSearch');
    if (input) {
        input.addEventListener('input', (e) => {
            const q = String(e.target.value || '').trim().toLowerCase();
            renderSearchResults(q);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSearchOverlay();
            }
        });
    }
    if (closeSearch) closeSearch.onclick = closeSearchOverlay;
}

function openSearch() {
    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    overlay.style.display = 'block';
    const input = document.getElementById('searchInput');
    if (input) {
        input.value = '';
        input.focus();
    }
    renderSearchResults('');
}

function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    const results = document.getElementById('searchResults');
    if (results) results.innerHTML = '';
}

function renderSearchResults(query) {
    const results = document.getElementById('searchResults');
    if (!results) return;
    const all = [...moviesListInternal, ...seriesListInternal];
    if (!query) {
        results.innerHTML = '<div style="color:#ddd">Ingresa texto para buscar títulos...</div>';
        return;
    }
    const filtered = all.filter(i => (i.title || '').toLowerCase().includes(query));
    if (filtered.length === 0) {
        results.innerHTML = '<div style="color:#ddd">No se encontraron resultados</div>';
        return;
    }
    results.innerHTML = filtered.map(item => `
        <div class="item" onclick="openModal('${escapeHtml(String(item.id))}', '${item.seasons ? 'series' : 'movies'}')">
            <img src="${escapeHtml(item.image || '')}">
            <div class="item-title">${escapeHtml(item.title || '')}</div>
        </div>
    `).join('');
}

// --- Utilidades ---
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}