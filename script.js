// script.js - Final Corregido

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
    window.history.replaceState({ view: 'home', modal: false }, '');
    setTimeout(() => { initApp(); }, 200);
});

function initApp() {
    renderHomeView();
    // Renderizar newly added en orden estricto (último js agregado sale primero)
    if (window.allContentSequence && window.allContentSequence.length > 0) {
        const strictOrderList = [...window.allContentSequence].reverse();
        renderList('newlyAddedRow', strictOrderList.slice(0, 15));
    } else {
        const allContent = [...moviesListInternal, ...seriesListInternal];
        renderList('newlyAddedRow', allContent.reverse().slice(0, 15));
    }
    renderContinueWatching();
    setupHero();
    setupEventListeners();
    switchView('home', false);
}

function setupHero() {
    const allFeatured = [...moviesListInternal, ...seriesListInternal].filter(i => i.featured);
    shuffleArray(allFeatured);
    featuredList = allFeatured.slice(0, 5);
    renderHero();
    startAutoSlide();
}

// --- NAVEGACIÓN Y BOTÓN ATRÁS ---
window.onpopstate = function(event) {
    const state = event.state;
    const modal = document.getElementById('videoModal');
    const search = document.getElementById('searchOverlay');

    // Cerrar modal si está abierto
    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open'); // Restaurar scroll
        document.getElementById('modalContentPlayer').innerHTML = '';
        return; 
    }

    // Cerrar búsqueda si está abierta
    if (search.style.display === 'block') {
        search.style.display = 'none';
        document.body.classList.remove('modal-open');
        return;
    }

    if (state && state.view) {
        if (state.view === 'home') switchView('home', false);
        else switchView(state.view, false);
    } else {
        switchView('home', false);
    }
};

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

function renderHomeView() {
    const moviesShuffled = [...moviesListInternal];
    const seriesShuffled = [...seriesListInternal];
    shuffleArray(moviesShuffled);
    shuffleArray(seriesShuffled);
    renderList('homeMoviesRow', moviesShuffled.slice(0, 9));
    renderList('homeSeriesRow', seriesShuffled.slice(0, 9));
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
    window.history.pushState({ view: currentView, modal: true }, '');

    // Convertimos ID a string para comparar seguramente
    const idStr = String(id);
    const list = type === 'movies' ? moviesListInternal : seriesListInternal;
    const item = list.find(i => String(i.id) === idStr) || [...moviesListInternal, ...seriesListInternal].find(i => String(i.id) === idStr);
    
    if (!item) return;

    currentModalItem = item;
    currentModalType = type;

    const modal = document.getElementById('videoModal');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDesc');
    const actionBtn = document.getElementById('modalActionBtn');
    const episodesDiv = document.getElementById('seriesEpisodeSelector');

    // Bloquear scroll del fondo
    document.body.classList.add('modal-open');

    titleEl.innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalType').innerText = type === 'movies' ? 'Película' : 'Serie';
    descEl.innerText = item.info;
    
    // Configuración Series vs Películas
    if (type === 'series') {
        episodesDiv.classList.remove('hidden');
        const select = document.getElementById('modalSeasonSelect');
        
        // CORRECCIÓN: Generar opciones de temporada
        select.innerHTML = item.seasons.map(s => `<option value="${s.season}">Temporada ${s.season}</option>`).join('');
        
        // Renderizar primera temporada por defecto
        renderEpisodes(item.seasons[0], item, 0); 

        actionBtn.innerHTML = '<i class="fas fa-film"></i> Ver Tráiler';
        actionBtn.onclick = () => {
             setPlayerVideo(item.trailer, "Tráiler");
             document.querySelectorAll('.episode-button').forEach(b => b.classList.remove('active'));
        };

        // CORRECCIÓN: Evento de cambio de temporada
        select.onchange = (e) => {
            const val = e.target.value;
            // Buscamos convirtiendo ambos a string para evitar error tipo '1' vs 1
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
    container.innerHTML = ''; // Limpiar anterior

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
    // Filtrar string vs number ID
    let allContent = [...moviesListInternal, ...seriesListInternal].filter(i => String(i.id) !== String(currentId));
    shuffleArray(allContent);
    const selection = allContent.slice(0, 6);
    container.innerHTML = selection.map(item => `
        <div class="item" onclick="openModal('${item.id}', '${item.seasons ? 'series' : 'movies'}')">
            <img src="${item.image}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
    // Scroll modal to top
    const modalContent = document.querySelector('.modal-content');
    if(modalContent) modalContent.scrollTop = 0;
}

// --- HERO (CARRUSEL) ---
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

// --- CONTINUAR VIENDO ---
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

// --- EVENTS ---
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
        if (touchStartX - touchEndX > 50) { nextHeroSlide(); clearInterval(autoSlideInterval); startAutoSlide(); }
        if (touchEndX - touchStartX > 50) { prevHeroSlide(); clearInterval(autoSlideInterval); startAutoSlide(); }
    }, {passive: true});

    document.getElementById('closeModal').onclick = () => { 
        window.history.back();
    };

    document.getElementById('nav-home').onclick = (e) => { 
        e.preventDefault(); 
        if(currentView !== 'home') switchView('home');
    };
    document.getElementById('nav-movies').onclick = (e) => {
        e.preventDefault();
        if(currentView !== 'movies') switchView('movies');
    };
    document.getElementById('nav-series').onclick = (e) => {
        e.preventDefault();
        if(currentView !== 'series') switchView('series');
    };
    document.getElementById('nav-search').onclick = (e) => {
        e.preventDefault();
        window.history.pushState({ view: currentView, modal: false }, ''); 
        document.getElementById('searchOverlay').style.display = 'block';
        document.body.classList.add('modal-open');
        document.getElementById('searchInput').focus();
    };
    document.getElementById('closeSearch').onclick = () => {
        window.history.back();
    };
    document.getElementById('searchInput').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const all = [...moviesListInternal, ...seriesListInternal];
        const results = all.filter(i => i.title.toLowerCase().includes(query));
        document.getElementById('searchResults').innerHTML = results.map(i => createItemHTML(i)).join('');
    };
}
