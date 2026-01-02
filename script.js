// script.js - Lógica Optimizada Auraflix+
let continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
let currentHeroIndex = 0;
let featuredList = [];

document.addEventListener('DOMContentLoaded', () => {
    if (typeof contentData !== 'undefined') {
        init();
    }
});

function init() {
    featuredList = [...contentData.movies, ...contentData.series].filter(i => i.featured);
    renderHero();
    renderRows();
    renderContinueWatching();
    setupEventListeners();
    setInterval(nextHeroSlide, 5000);
}

function renderRows() {
    renderList(contentData.movies, 'moviesRow', 'movies');
    renderList(contentData.series, 'seriesRow', 'series');
}

function renderList(list, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = list.map(item => `
        <div class="item" onclick="openModal(${item.id}, '${type}')">
            <img src="${item.image}" alt="${item.title}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
}

// --- REPRODUCTOR ---
function setPlayerVideo(url) {
    const playerDiv = document.getElementById('modalContentPlayer');
    if (!url) {
        playerDiv.innerHTML = `<div class="video-container" style="display:flex;align-items:center;justify-content:center;color:gray;">Video no disponible</div>`;
        return;
    }

    // Limpiamos el contenedor
    playerDiv.innerHTML = '';
    
    // Creamos el iframe dinámicamente para asegurar la carga
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    
    const container = document.createElement('div');
    container.className = 'video-container';
    container.appendChild(iframe);
    
    playerDiv.appendChild(container);
}

// --- MODAL ---
function openModal(id, type) {
    const item = contentData[type].find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('videoModal');
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalType').innerText = type === 'movies' ? 'Película' : 'Serie';
    document.getElementById('modalDesc').innerText = item.info;

    // Recomendados mezclados al azar
    renderRandomRecommendations(id);

    const episodesDiv = document.getElementById('seriesEpisodeSelector');
    const playBtn = document.getElementById('modalPlayBtn');
    const trailerBtn = document.getElementById('modalTrailerBtn');

    // Al abrir, cargamos el trailer
    setPlayerVideo(item.trailer);

    trailerBtn.onclick = () => setPlayerVideo(item.trailer);

    if (type === 'series') {
        episodesDiv.classList.remove('hidden');
        playBtn.classList.add('hidden');
        const select = document.getElementById('modalSeasonSelect');
        select.innerHTML = item.seasons.map(s => `<option value="${s.season}">Temporada ${s.season}</option>`).join('');
        renderEpisodes(item.seasons[0], item);
        select.onchange = (e) => {
            const season = item.seasons.find(s => s.season == e.target.value);
            renderEpisodes(season, item);
        };
    } else {
        episodesDiv.classList.add('hidden');
        playBtn.classList.remove('hidden');
        playBtn.onclick = () => {
            addToContinueWatching(item, 'movies');
            setPlayerVideo(item.video); // Aquí carga la película
        };
    }
    modal.style.display = 'flex';
}

function renderEpisodes(season, serieItem) {
    const container = document.getElementById('modalEpisodesContainer');
    container.innerHTML = season.episodes.map(ep => `<button class="episode-button">${ep.episode}</button>`).join('');
    const buttons = container.querySelectorAll('.episode-button');
    buttons.forEach((btn, index) => {
        btn.onclick = () => {
            addToContinueWatching(serieItem, 'series');
            setPlayerVideo(season.episodes[index].video);
        };
    });
}

// --- NUEVA LÓGICA DE RECOMENDADOS AL AZAR ---
function renderRandomRecommendations(currentId) {
    const container = document.getElementById('modalRecommendations');
    
    // Unimos todo el contenido
    let allContent = [...contentData.movies, ...contentData.series];
    
    // Filtramos para quitar la que se está reproduciendo
    let filtered = allContent.filter(item => item.id !== currentId);
    
    // Mezclamos el array (Fisher-Yates Shuffle)
    for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    
    // Tomamos los primeros 6
    const selection = filtered.slice(0, 6);

    container.innerHTML = selection.map(item => `
        <div class="item" onclick="openModal(${item.id}, '${item.seasons ? 'series' : 'movies'}')">
            <img src="${item.image}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
}

// --- RESTO DE FUNCIONES (CARRUSEL, NAV, ETC) ---
function renderHero() {
    const container = document.querySelector('.carousel-container');
    const dots = document.getElementById('heroDots');
    if (!container || featuredList.length === 0) return;
    container.innerHTML = featuredList.map((item, i) => `<div class="carousel-slide ${i === 0 ? 'active' : ''}" style="display: ${i === 0 ? 'block' : 'none'}"><img src="${item.image}"></div>`).join('');
    dots.innerHTML = featuredList.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('');
    updateHeroText();
}

function updateHeroText() {
    const item = featuredList[currentHeroIndex];
    if (item) {
        document.getElementById('heroTitle').innerText = item.title;
        document.getElementById('heroDesc').innerText = item.info;
    }
}

function nextHeroSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    slides[currentHeroIndex].style.display = 'none';
    dots[currentHeroIndex].classList.remove('active');
    currentHeroIndex = (currentHeroIndex + 1) % featuredList.length;
    if(slides[currentHeroIndex]) slides[currentHeroIndex].style.display = 'block';
    if(dots[currentHeroIndex]) dots[currentHeroIndex].classList.add('active');
    updateHeroText();
}

function addToContinueWatching(item, type) {
    continueWatching = continueWatching.filter(i => i.id !== item.id);
    continueWatching.unshift({ ...item, type });
    if (continueWatching.length > 10) continueWatching.pop();
    localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
    renderContinueWatching();
}

function renderContinueWatching() {
    const row = document.getElementById('continueWatching');
    if (!row) return;
    row.innerHTML = continueWatching.map(item => `
        <div class="item" onclick="openModal(${item.id}, '${item.type}')">
            <img src="${item.image}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
}

function setupEventListeners() {
    document.getElementById('bottomMenuBtn').onclick = (e) => { e.preventDefault(); switchView('home'); };
    document.getElementById('moviesNavBtnBottom').onclick = (e) => { e.preventDefault(); switchView('movies'); };
    document.getElementById('seriesNavBtnBottom').onclick = (e) => { e.preventDefault(); switchView('series'); };
    document.getElementById('searchNavBtn').onclick = (e) => { e.preventDefault(); document.getElementById('searchOverlay').style.display = 'block'; document.getElementById('searchInput').focus(); };
    document.getElementById('optionsNavBtn').onclick = (e) => { e.preventDefault(); document.getElementById('optionsPanel').style.display = 'block'; };
    document.getElementById('closeOptionsPanel').onclick = () => document.getElementById('optionsPanel').style.display = 'none';
    document.getElementById('closeSearch').onclick = () => document.getElementById('searchOverlay').style.display = 'none';
    document.getElementById('closeModal').onclick = () => { document.getElementById('videoModal').style.display = 'none'; document.getElementById('modalContentPlayer').innerHTML = ''; };

    document.getElementById('searchInput').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const results = [...contentData.movies, ...contentData.series].filter(i => i.title.toLowerCase().includes(query));
        document.getElementById('searchResults').innerHTML = results.map(i => `<div class="item" onclick="openModal(${i.id}, '${i.seasons ? 'series' : 'movies'}')"><img src="${i.image}"><div class="item-title">${i.title}</div></div>`).join('');
    };

    document.getElementById('hero').onclick = (e) => {
        if (!e.target.classList.contains('dot')) {
            const current = featuredList[currentHeroIndex];
            openModal(current.id, current.seasons ? 'series' : 'movies');
        }
    };
}

function switchView(viewName) {
    const main = document.getElementById('mainContent');
    const filter = document.getElementById('filterContent');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (viewName === 'home') {
        main.classList.remove('hidden');
        filter.classList.add('hidden');
        document.getElementById('bottomMenuBtn').classList.add('active');
    } else {
        main.classList.add('hidden');
        filter.classList.remove('hidden');
        document.getElementById('filterTitle').innerText = viewName === 'movies' ? "Películas" : "Series";
        document.getElementById(viewName === 'movies' ? 'moviesNavBtnBottom' : 'seriesNavBtnBottom').classList.add('active');
        renderList(contentData[viewName], 'filteredRow', viewName);
    }
}