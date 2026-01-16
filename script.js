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
    
    // Renderizar 3 filas de 10 para Películas
    renderTripleRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    
    // Renderizar 3 filas de 10 para Series
    renderTripleRow('homeSeriesRow', seriesShuffled.slice(0, 30));
}

function renderTripleRow(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; // Limpiar

    // Dividimos los 30 items en 3 grupos de 10
    for (let i = 0; i < 3; i++) {
        const group = items.slice(i * 10, (i + 1) * 10);
        if (group.length > 0) {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'sub-row-10';
            rowDiv.innerHTML = group.map(item => createItemHTML(item)).join('');
            container.appendChild(rowDiv);
        }
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
    
    descEl.innerText = item.description || 'Sin descripción disponible.';
    
    // Configurar botón de acción
    actionBtn.innerHTML = `<i class="fas fa-film"></i> Ver Tráiler`;
    actionBtn.onclick = () => playTrailer(item);
    
    // Mostrar/ocultar selector de episodios para series
    if (type === 'series' && item.seasons) {
        episodesDiv.classList.remove('hidden');
        renderSeasonSelector(item);
    } else {
        episodesDiv.classList.add('hidden');
    }
    
    // Renderizar recomendaciones
    renderRecommendations(item, type);
    
    // Mostrar modal
    modal.style.display = 'flex';
}

function renderSeasonSelector(item) {
    const select = document.getElementById('modalSeasonSelect');
    const episodesContainer = document.getElementById('modalEpisodesContainer');
    
    select.innerHTML = '';
    episodesContainer.innerHTML = '';
    
    item.seasons.forEach((season, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = `Temporada ${index + 1}`;
        select.appendChild(option);
    });
    
    // Renderizar episodios de la primera temporada por defecto
    renderEpisodes(item, 0);
    
    select.onchange = (e) => {
        renderEpisodes(item, parseInt(e.target.value));
    };
}

function renderEpisodes(item, seasonIndex) {
    const episodesContainer = document.getElementById('modalEpisodesContainer');
    episodesContainer.innerHTML = '';
    
    const season = item.seasons[seasonIndex];
    if (!season || !season.episodes) return;
    
    season.episodes.forEach((episode, epIndex) => {
        const button = document.createElement('button');
        button.className = 'episode-button';
        button.innerText = epIndex + 1;
        button.onclick = () => playEpisode(item, seasonIndex, epIndex);
        episodesContainer.appendChild(button);
    });
}

function playEpisode(item, seasonIndex, episodeIndex) {
    const modalContentPlayer = document.getElementById('modalContentPlayer');
    const season = item.seasons[seasonIndex];
    const episode = season.episodes[episodeIndex];
    
    if (episode.trailer) {
        modalContentPlayer.innerHTML = `
            <div class="video-container">
                <iframe src="${episode.trailer}" frameborder="0" allowfullscreen></iframe>
                <div class="video-overlay-label">Episodio ${episodeIndex + 1}: ${episode.title || ''}</div>
            </div>
        `;
    }
}

function playTrailer(item) {
    const modalContentPlayer = document.getElementById('modalContentPlayer');
    
    if (item.trailer) {
        modalContentPlayer.innerHTML = `
            <div class="video-container">
                <iframe src="${item.trailer}" frameborder="0" allowfullscreen></iframe>
                <div class="video-overlay-label">Tráiler</div>
            </div>
        `;
        isPlayingTrailer = true;
    }
}

function renderRecommendations(currentItem, type) {
    const container = document.getElementById('modalRecommendations');
    const allItems = type === 'movies' ? moviesListInternal : seriesListInternal;
    
    // Filtrar recomendaciones (excluir el actual)
    const recommendations = allItems
        .filter(item => item.id !== currentItem.id)
        .slice(0, 6);
    
    container.innerHTML = recommendations.map(item => createItemHTML(item)).join('');
}

function renderHero() {
    const container = document.querySelector('.carousel-container');
    const dotsContainer = document.getElementById('heroDots');
    
    if (!container || !dotsContainer) return;
    
    container.innerHTML = '';
    dotsContainer.innerHTML = '';
    
    featuredList.forEach((item, index) => {
        // Crear slide
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
        slide.innerHTML = `<img src="${item.image}" alt="${item.title}">`;
        container.appendChild(slide);
        
        // Crear dot
        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => goToSlide(index);
        dotsContainer.appendChild(dot);
    });
}

function goToSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    
    if (index >= slides.length) index = 0;
    if (index < 0) index = slides.length - 1;
    
    slides.forEach(slide => slide.classList.remove('active'));
    dots.forEach(dot => dot.classList.remove('active'));
    
    slides[index].classList.add('active');
    dots[index].classList.add('active');
    currentHeroIndex = index;
}

function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
        goToSlide((currentHeroIndex + 1) % featuredList.length);
    }, 5000);
}

function renderContinueWatching() {
    const container = document.getElementById('continueWatching');
    const parentContainer = document.getElementById('continueWatchingContainer');
    
    if (!container || !parentContainer) return;
    
    if (continueWatching.length === 0) {
        parentContainer.classList.add('hidden');
        return;
    }
    
    parentContainer.classList.remove('hidden');
    container.innerHTML = continueWatching.map(item => createItemHTML(item)).join('');
}

function setupEventListeners() {
    // Navegación
    document.getElementById('nav-home').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('home');
    });
    
    document.getElementById('nav-movies').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('movies');
    });
    
    document.getElementById('nav-series').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('series');
    });
    
    document.getElementById('nav-search').addEventListener('click', (e) => {
        e.preventDefault();
        openSearch();
    });
    
    // Cerrar modal
    document.getElementById('closeModal').addEventListener('click', () => {
        const modal = document.getElementById('videoModal');
        modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        document.getElementById('modalContentPlayer').innerHTML = '';
        window.history.back();
    });
    
    // Buscador
    document.getElementById('closeSearch').addEventListener('click', closeSearch);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Gestos táctiles para carrusel hero
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        });
        
        hero.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        });
    }
}

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe izquierda
            goToSlide(currentHeroIndex + 1);
        } else {
            // Swipe derecha
            goToSlide(currentHeroIndex - 1);
        }
        startAutoSlide(); // Reiniciar auto slide
    }
}

function openSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    searchOverlay.style.display = 'block';
    document.body.classList.add('modal-open');
    document.getElementById('searchInput').focus();
    document.getElementById('searchInput').value = '';
    document.getElementById('searchResults').innerHTML = '';
    window.history.pushState({ view: 'search', modal: true }, '');
}

function closeSearch() {
    const searchOverlay = document.getElementById('searchOverlay');
    searchOverlay.style.display = 'none';
    document.body.classList.remove('modal-open');
    window.history.back();
}

function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    const resultsContainer = document.getElementById('searchResults');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }
    
    const allContent = [...moviesListInternal, ...seriesListInternal];
    const filtered = allContent.filter(item => 
        item.title.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
    );
    
    // Renderizar resultados con evento onclick corregido
    resultsContainer.innerHTML = filtered.map(item => {
        const type = item.seasons ? 'series' : 'movies';
        return `
            <div class="item" onclick="openModal('${item.id}', '${type}')">
                <img src="${item.image}" loading="lazy" alt="${item.title}">
                <div class="item-title">${item.title}</div>
            </div>
        `;
    }).join('');
}