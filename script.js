// Variables Globales
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
    // Estado inicial del historial para evitar bucles
    window.history.replaceState({ view: 'home', modal: false, search: false }, '');
    setTimeout(() => { initApp(); }, 200);
});

// --- GESTIÓN DEL BOTÓN ATRÁS (POPSTATE) ---
window.addEventListener('popstate', (event) => {
    const modal = document.getElementById('videoModal');
    const searchOverlay = document.getElementById('searchOverlay');
    
    // Si en el estado NO hay modal activo, aseguramos que visualmente se cierre
    if (!event.state || !event.state.modal) {
        if (modal.style.display === 'flex') {
            closeModalInternal(); 
        }
    }
    
    // Si en el estado NO hay búsqueda activa, cerramos overlay
    if (!event.state || !event.state.search) {
         if (searchOverlay.style.display === 'block') {
            searchOverlay.style.display = 'none';
         }
    }

    // Navegación entre vistas (Home, Movies, Series)
    if (event.state && event.state.view) {
        currentView = event.state.view;
        switchView(currentView, false); // false = no agregar otro pushState
    }
});

function initApp() {
    renderHomeView();
    
    // Lógica para "Recién Agregadas" (Orden estricto de carga, límite 20)
    if (window.allContentSequence && window.allContentSequence.length > 0) {
        const strictOrderList = [...window.allContentSequence].reverse();
        renderList('newlyAddedRow', strictOrderList.slice(0, 20));
    } else {
        const allContent = [...moviesListInternal, ...seriesListInternal];
        renderList('newlyAddedRow', allContent.reverse().slice(0, 20));
    }

    renderContinueWatching();
    setupHero(); 
    setupEventListeners();
    switchView('home', false);
}

// --- HERO: ARREGLADO PARA LEER ID.JS ---
function setupHero() {
    const allContent = [...moviesListInternal, ...seriesListInternal];
    featuredList = [];

    // 1. Verificamos si existe window.HERO_IDS definido en id.js
    if (window.HERO_IDS && Array.isArray(window.HERO_IDS) && window.HERO_IDS.length > 0) {
        // Filtramos para asegurar que son objetos válidos
        featuredList = window.HERO_IDS.filter(item => item && typeof item === 'object');
    }

    // 2. Si id.js está vacío o falló, usar fallback (las marcadas como featured)
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
    if (!container || featuredList.length === 0) return;
    
    container.innerHTML = featuredList.map((item, i) => `
        <div class="carousel-slide ${i === 0 ? 'active' : ''}">
            <img src="${item.image}" alt="Hero Image">
        </div>
    `).join('');
    
    dots.innerHTML = featuredList.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('');
}

// --- VISTAS ---
function renderHomeView() {
    const moviesShuffled = [...moviesListInternal];
    const seriesShuffled = [...seriesListInternal];
    
    // Aleatorio cada vez que se carga el home
    shuffleArray(moviesShuffled);
    shuffleArray(seriesShuffled);

    renderMultiRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    renderMultiRow('homeSeriesRow', seriesShuffled.slice(0, 30));
}

function switchView(viewName, pushToHistory = true) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-movies').classList.add('hidden');
    document.getElementById('view-series').classList.add('hidden');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    
    window.scrollTo({top: 0, behavior: 'auto'});
    currentView = viewName;

    if (viewName === 'home') {
        document.getElementById('view-home').classList.remove('hidden');
        document.getElementById('nav-home').classList.add('active');
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

    if (pushToHistory) {
        window.history.pushState({ view: viewName, modal: false }, '');
    }
}

// --- FUNCIONES DE AYUDA (HELPERS) ---
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

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function renderList(containerId, list) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map(item => createItemHTML(item)).join('');
}

function createItemHTML(item) {
    const type = item.seasons ? 'series' : 'movies';
    return `
        <div class="item" onclick="openModal('${item.id}', '${type}')">
            <img src="${item.image}" loading="lazy" alt="${item.title}">
            <div class="item-title">${item.title}</div>
        </div>
    `;
}

// --- MODAL ---
function openModal(id, type) {
    // Cerrar buscador si estaba abierto
    const searchOverlay = document.getElementById('searchOverlay');
    if(searchOverlay.style.display === 'block') {
        searchOverlay.style.display = 'none';
    }

    // IMPORTANTE: Agregamos estado al historial
    // Esto hace que al dar "Atrás" en el cel, se cierre el modal en vez de salir de la app
    window.history.pushState({ view: currentView, modal: true }, '');

    const idStr = String(id);
    const list = type === 'movies' ? moviesListInternal : seriesListInternal;
    // Búsqueda en listas
    const item = list.find(i => String(i.id) === idStr) || [...moviesListInternal, ...seriesListInternal].find(i => String(i.id) === idStr);
    
    if (!item) return;

    currentModalItem = item;
    currentModalType = type;

    const modal = document.getElementById('videoModal');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDesc');
    const actionBtn = document.getElementById('modalActionBtn');
    const episodesDiv = document.getElementById('seriesEpisodeSelector');

    document.body.classList.add('modal-open');

    titleEl.innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalType').innerText = type === 'movies' ? 'Película' : 'Serie';
    descEl.innerText = item.info;
    
    if (type === 'series') {
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

function closeModalInternal() {
    const modal = document.getElementById('videoModal');
    modal.style.display = 'none';
    const playerDiv = document.getElementById('modalContentPlayer');
    playerDiv.innerHTML = ''; 
    document.body.classList.remove('modal-open');
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
            <img src="${item.image}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
}

// --- LOGICA SLIDER ---
function nextHeroSlide() {
    let nextIndex = (currentHeroIndex + 1) % featuredList.length;
    updateHeroVisuals(nextIndex);
}

function prevHeroSlide() {
    let prevIndex = (currentHeroIndex - 1 + featuredList.length) % featuredList.length;
    updateHeroVisuals(prevIndex);
}

function updateHeroVisuals(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if(slides.length === 0) return;
    
    slides[currentHeroIndex].style.display = 'none';
    dots[currentHeroIndex].classList.remove('active');
    
    currentHeroIndex = index;
    
    slides[currentHeroIndex].style.display = 'block';
    dots[currentHeroIndex].classList.add('active');
}

function startAutoSlide() { 
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextHeroSlide, 5000); 
}

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

// --- EVENT LISTENERS ---
function setupEventListeners() {
    const hero = document.getElementById('hero');
    
    hero.onclick = (e) => {
        if (Math.abs(touchStartX - touchEndX) < 10) {
            const current = featuredList[currentHeroIndex];
            if (current) openModal(current.id, current.seasons ? 'series' : 'movies');
        }
    };
    
    hero.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
    hero.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextHeroSlide();
        if (touchEndX - touchStartX > 50) prevHeroSlide();
    }, {passive: true});

    document.getElementById('nav-home').onclick = (e) => { e.preventDefault(); switchView('home'); };
    document.getElementById('nav-movies').onclick = (e) => { e.preventDefault(); switchView('movies'); };
    document.getElementById('nav-series').onclick = (e) => { e.preventDefault(); switchView('series'); };
    
    document.getElementById('nav-search').onclick = (e) => {
        e.preventDefault();
        document.getElementById('searchOverlay').style.display = 'block';
        document.getElementById('searchInput').focus();
        // Agregamos al historial para que el botón atrás cierre el buscador
        window.history.pushState({ view: currentView, modal: false, search: true }, '');
    };

    // BOTÓN DE CERRAR MODAL:
    // En lugar de cerrar directamente, le decimos al navegador "vuelve atrás".
    // Esto activa el evento 'popstate' que definimos arriba, cerrando el modal correctamente.
    document.getElementById('closeModal').addEventListener('click', () => {
        window.history.back(); 
    });

    document.getElementById('closeSearch').onclick = () => {
        window.history.back();
    };

    document.getElementById('searchInput').addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const container = document.getElementById('searchResults');
        container.innerHTML = '';
        if (val.length < 2) return;
        
        const all = [...moviesListInternal, ...seriesListInternal];
        const filtered = all.filter(item => item.title.toLowerCase().includes(val));
        renderList('searchResults', filtered);
    });
}
