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
    // Renderizar newly added
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
    setupSearch();
    switchView('home', false);
}

function setupHero() {
    const allFeatured = [...moviesListInternal, ...seriesListInternal].filter(i => i.featured);
    shuffleArray(allFeatured);
    featuredList = allFeatured.slice(0, 5);
    renderHero();
    startAutoSlide();
}

function setupEventListeners() {
    document.getElementById('nav-home').addEventListener('click', (e) => { e.preventDefault(); switchView('home'); });
    document.getElementById('nav-movies').addEventListener('click', (e) => { e.preventDefault(); switchView('movies'); });
    document.getElementById('nav-series').addEventListener('click', (e) => { e.preventDefault(); switchView('series'); });
    document.getElementById('nav-search').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('searchOverlay').style.display = 'block';
        document.body.classList.add('modal-open');
        document.getElementById('searchInput').focus();
    });

    document.getElementById('closeSearch').addEventListener('click', () => {
        document.getElementById('searchOverlay').style.display = 'none';
        document.body.classList.remove('modal-open');
    });

    document.getElementById('closeModal').addEventListener('click', () => {
        document.getElementById('videoModal').style.display = 'none';
        document.body.classList.remove('modal-open');
        document.getElementById('modalContentPlayer').innerHTML = '';
        window.history.back(); 
    });
}

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchResults = document.getElementById('searchResults');

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        searchResults.innerHTML = '';
        
        if (query.length < 2) return;

        const allContent = [...moviesListInternal, ...seriesListInternal];
        const results = allContent.filter(item => item.title.toLowerCase().includes(query));

        if (results.length > 0) {
            searchResults.innerHTML = results.map(item => createItemHTML(item)).join('');
        } else {
            searchResults.innerHTML = '<p style="width:100%; text-align:center; color:#777;">No se encontraron resultados</p>';
        }
    });
}

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
    
    // Usamos la función para crear las 3 filas de 10
    renderTripleRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    renderTripleRow('homeSeriesRow', seriesShuffled.slice(0, 30));
}

// Función para crear la estructura de 3 filas x 10 items
function renderTripleRow(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = ''; 

    for (let i = 0; i < 3; i++) {
        const group = items.slice(i * 10, (i + 1) * 10);
        if (group.length > 0) {
            const rowDiv = document.createElement('div');
            // Esta clase ahora tiene el CSS correcto para el scroll horizontal
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

    document.body.classList.add('modal-open');
    modal.style.display = 'flex';

    titleEl.innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalType').innerText = type === 'movies' ? 'Película' : 'Serie';
    descEl.innerText = item.desc;
    
    document.getElementById('modalContentPlayer').innerHTML = `
        <div class="video-container">
            <img src="${item.image}" style="width:100%; height:100%; object-fit:cover; opacity:0.5;">
            <div class="video-overlay-label">Tráiler</div>
        </div>`;
    
    isPlayingTrailer = false;
    actionBtn.innerHTML = '<i class="fas fa-play"></i> Ver Ahora';
    actionBtn.onclick = () => loadVideo(item.video);

    if (type === 'series' && item.seasons) {
        episodesDiv.classList.remove('hidden');
        renderSeasons(item);
    } else {
        episodesDiv.classList.add('hidden');
    }

    renderRecommendations(type);
}

function renderSeasons(serie) {
    const select = document.getElementById('modalSeasonSelect');
    select.innerHTML = '';
    Object.keys(serie.seasons).forEach(seasonKey => {
        const option = document.createElement('option');
        option.value = seasonKey;
        option.innerText = seasonKey;
        select.appendChild(option);
    });

    select.onchange = () => renderEpisodes(serie, select.value);
    if (Object.keys(serie.seasons).length > 0) {
        renderEpisodes(serie, Object.keys(serie.seasons)[0]);
    }
}

function renderEpisodes(serie, seasonKey) {
    const container = document.getElementById('modalEpisodesContainer');
    container.innerHTML = '';
    const episodes = serie.seasons[seasonKey];

    episodes.forEach((ep, index) => {
        const btn = document.createElement('button');
        btn.className = 'episode-button';
        btn.innerText = index + 1;
        btn.onclick = () => {
            document.querySelectorAll('.episode-button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadVideo(ep.link);
        };
        container.appendChild(btn);
    });
}

function loadVideo(url) {
    const playerDiv = document.getElementById('modalContentPlayer');
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let videoId = url.split('v=')[1];
        if (!videoId) videoId = url.split('/').pop();
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        playerDiv.innerHTML = `<div class="video-container"><iframe src="${embedUrl}" allowfullscreen allow="autoplay"></iframe></div>`;
    } else {
        playerDiv.innerHTML = `<div class="video-container"><iframe src="${url}" allowfullscreen allow="autoplay"></iframe></div>`;
    }
    isPlayingTrailer = true;
}

function renderRecommendations(type) {
    const container = document.getElementById('modalRecommendations');
    const list = type === 'movies' ? moviesListInternal : seriesListInternal;
    const recs = list.filter(i => String(i.id) !== String(currentModalItem.id));
    shuffleArray(recs);
    container.innerHTML = recs.slice(0, 6).map(item => createItemHTML(item)).join('');
}

function renderContinueWatching() {
    const container = document.getElementById('continueWatching');
    const wrapper = document.getElementById('continueWatchingContainer');
    
    if (continueWatching.length === 0) {
        wrapper.classList.add('hidden');
        return;
    }
    
    wrapper.classList.remove('hidden');
    container.innerHTML = continueWatching.map(item => createItemHTML(item)).join('');
}

function renderHero() {
    const container = document.querySelector('.carousel-container');
    const dotsContainer = document.getElementById('heroDots');
    container.innerHTML = '';
    dotsContainer.innerHTML = '';

    featuredList.forEach((item, index) => {
        const slide = document.createElement('div');
        slide.className = `carousel-slide ${index === 0 ? 'active' : ''}`;
        slide.innerHTML = `<img src="${item.image}" alt="${item.title}">`;
        
        slide.onclick = () => openModal(item.id, item.seasons ? 'series' : 'movies');
        
        container.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = `dot ${index === 0 ? 'active' : ''}`;
        dot.onclick = () => showSlide(index);
        dotsContainer.appendChild(dot);
    });
}

function showSlide(index) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    
    if (index >= slides.length) currentHeroIndex = 0;
    else if (index < 0) currentHeroIndex = slides.length - 1;
    else currentHeroIndex = index;

    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));

    slides[currentHeroIndex].classList.add('active');
    dots[currentHeroIndex].classList.add('active');
}

function startAutoSlide() {
    if (autoSlideInterval) clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(() => {
        showSlide(currentHeroIndex + 1);
    }, 5000);
}
