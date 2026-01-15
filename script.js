// script.js - Final con reproductor MhdPlayer integrado

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

// HERO
function setupHero() {
    const allFeatured = [...moviesListInternal, ...seriesListInternal].filter(i => i.featured);
    shuffleArray(allFeatured);
    featuredList = allFeatured.slice(0, 5);
    renderHero();
    startAutoSlide();
}

// NAVEGACIÓN Y BOTÓN ATRÁS
window.onpopstate = function(event) {
    const state = event.state;
    const modal = document.getElementById('videoModal');
    const search = document.getElementById('searchOverlay');

    if (modal.style.display === 'flex') {
        modal.style.display = 'none';
        document.body.classList.remove('modal-open'); 
        document.getElementById('modalContentPlayer').innerHTML = '';
        return; 
    }

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

// MODAL
function openModal(id, type) {
    window.history.pushState({ view: currentView, modal: true }, '');
    const list = type === 'movies' ? moviesListInternal : seriesListInternal;
    const item = list.find(i => String(i.id) === String(id)) || [...moviesListInternal, ...seriesListInternal].find(i => String(i.id) === String(id));
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
            const season = item.seasons.find(s => String(s.season) === String(e.target.value));
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

// MHDPLAYER
function setPlayerVideo(url, overlayText = null) {
    const playerDiv = document.getElementById('modalContentPlayer');
    playerDiv.innerHTML = ''; 
    if (!url) {
        playerDiv.innerHTML = '<div style="color:gray; display:flex; align-items:center; justify-content:center; height:200px;">Video no disponible</div>';
        return;
    }

    // Detectar YouTube/Vimeo
    let iframe = document.createElement('iframe');
    iframe.src = url.includes('youtube') || url.includes('vimeo') ? url : '';
    iframe.allow = 'autoplay; fullscreen';
    iframe.frameBorder = 0;
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.style.border = 'none';

    // Si es video HTML
    if (!iframe.src) {
        iframe.remove();
        const video = document.createElement('video');
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        video.style.width = '100%';
        video.style.height = '100%';
        playerDiv.appendChild(video);
    } else {
        const container = document.createElement('div');
        container.className = 'video-container';
        container.appendChild(iframe);
        playerDiv.appendChild(container);
    }

    // Overlay
    if (overlayText) {
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay-label';
        overlay.innerText = overlayText;
        playerDiv.appendChild(overlay);
    }
}

// Aquí siguen tus funciones de renderEpisodes, renderRealRecommendations, hero, continue watching y setupEventListeners tal como las tenías