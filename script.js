// script.js - Lógica Auraflix+

// --- 1. CIERRE Y CONEXIÓN DE DATOS ---
// Este bloque une las variables de movies.js y series.js en el objeto que usa la app
const contentData = {
    movies: (typeof moviesList !== 'undefined') ? moviesList : [],
    series: (typeof seriesList !== 'undefined') ? seriesList : []
};

// --- 2. VARIABLES GLOBALES ---
let continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
let currentHeroIndex = 0;
let featuredList = [];
let touchStartX = 0;
let touchEndX = 0;
let autoSlideInterval;

// --- 3. INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Verificamos que existan datos antes de arrancar
    if (contentData.movies.length > 0 || contentData.series.length > 0) {
        init();
    } else {
        console.error("Error: No se detectaron películas ni series. Revisa que movies.js y series.js estén cargados en el HTML antes que este script.");
    }
});

function init() {
    // Mezcla películas y series destacadas para el Hero
    featuredList = [...contentData.movies, ...contentData.series].filter(i => i.featured);
    
    renderHero();
    renderRows();
    renderContinueWatching();
    setupEventListeners();
    setupHeroGestures();
    startAutoSlide();
}

// --- 4. GESTOS Y CARRUSEL (HERO) ---
function setupHeroGestures() {
    const hero = document.getElementById('hero');
    if (!hero) return;

    hero.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
    hero.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});
    
    hero.addEventListener('mousedown', e => touchStartX = e.screenX);
    hero.addEventListener('mouseup', e => {
        touchEndX = e.screenX;
        handleSwipe();
    });
}

function handleSwipe() {
    if (Math.abs(touchStartX - touchEndX) > 50) {
        if (touchStartX > touchEndX) nextHeroSlide();
        else prevHeroSlide();
        resetAutoSlide();
    }
}

function startAutoSlide() { autoSlideInterval = setInterval(nextHeroSlide, 6000); }
function resetAutoSlide() { clearInterval(autoSlideInterval); startAutoSlide(); }

function prevHeroSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    slides[currentHeroIndex].style.display = 'none';
    dots[currentHeroIndex].classList.remove('active');
    currentHeroIndex = (currentHeroIndex - 1 + featuredList.length) % featuredList.length;
    slides[currentHeroIndex].style.display = 'block';
    dots[currentHeroIndex].classList.add('active');
}

function nextHeroSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    slides[currentHeroIndex].style.display = 'none';
    dots[currentHeroIndex].classList.remove('active');
    currentHeroIndex = (currentHeroIndex + 1) % featuredList.length;
    slides[currentHeroIndex].style.display = 'block';
    dots[currentHeroIndex].classList.add('active');
}

function renderHero() {
    const container = document.querySelector('.carousel-container');
    const dots = document.getElementById('heroDots');
    if (!container || featuredList.length === 0) return;
    container.innerHTML = featuredList.map((item, i) => `
        <div class="carousel-slide ${i === 0 ? 'active' : ''}" style="display: ${i === 0 ? 'block' : 'none'}">
            <img src="${item.image}">
        </div>
    `).join('');
    dots.innerHTML = featuredList.map((_, i) => `<span class="dot ${i === 0 ? 'active' : ''}"></span>`).join('');
}

// --- 5. RENDERIZADO DE LISTAS ---
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

// --- 6. REPRODUCTOR ---
function setPlayerVideo(url, overlayText = null) {
    const playerDiv = document.getElementById('modalContentPlayer');
    if (!url) {
        playerDiv.innerHTML = `<div class="video-container" style="display:flex;align-items:center;justify-content:center;color:gray;background:#000;height:211px;">Video no disponible</div>`;
        return;
    }
    playerDiv.innerHTML = '';
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    
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

// --- 7. MODAL Y DETALLES ---
function openModal(id, type) {
    const item = contentData[type].find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('videoModal');
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalType').innerText = type === 'movies' ? 'Película' : 'Serie';
    document.getElementById('modalDesc').innerText = item.info;

    renderRandomRecommendations(id);

    const episodesDiv = document.getElementById('seriesEpisodeSelector');
    const playBtn = document.getElementById('modalPlayBtn');
    const trailerBtn = document.getElementById('modalTrailerBtn');

    // Por defecto cargar el trailer al abrir
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
            setPlayerVideo(item.video); 
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
            const episodeLabel = `Capítulo ${season.episodes[index].episode}`;
            setPlayerVideo(season.episodes[index].video, episodeLabel);
        };
    });
}

// --- 8. RECOMENDADOS ---
function renderRandomRecommendations(currentId) {
    const container = document.getElementById('modalRecommendations');
    let allContent = [...contentData.movies, ...contentData.series];
    let filtered = allContent.filter(item => item.id !== currentId);
    
    // Shuffle
    for (let i = filtered.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [filtered[i], filtered[j]] = [filtered[j], filtered[i]];
    }
    
    const selection = filtered.slice(0, 6);
    container.innerHTML = selection.map(item => `
        <div class="item" onclick="openModal(${item.id}, '${item.seasons ? 'series' : 'movies'}')">
            <img src="${item.image}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
}

// --- 9. CONTINUAR VIENDO ---
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

// --- 10. EVENT LISTENERS Y NAVEGACIÓN ---
function setupEventListeners() {
    document.getElementById('bottomMenuBtn').onclick = (e) => { e.preventDefault(); switchView('home'); };
    document.getElementById('moviesNavBtnBottom').onclick = (e) => { e.preventDefault(); switchView('movies'); };
    document.getElementById('seriesNavBtnBottom').onclick = (e) => { e.preventDefault(); switchView('series'); };
    
    document.getElementById('searchNavBtn').onclick = (e) => { 
        e.preventDefault(); 
        document.getElementById('searchOverlay').style.display = 'block'; 
        document.getElementById('searchInput').focus(); 
    };
    
    document.getElementById('closeSearch').onclick = () => document.getElementById('searchOverlay').style.display = 'none';
    
    document.getElementById('closeModal').onclick = () => { 
        document.getElementById('videoModal').style.display = 'none'; 
        document.getElementById('modalContentPlayer').innerHTML = ''; 
    };

    document.getElementById('searchInput').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const results = [...contentData.movies, ...contentData.series].filter(i => i.title.toLowerCase().includes(query));
        document.getElementById('searchResults').innerHTML = results.map(i => `
            <div class="item" onclick="openModal(${i.id}, '${i.seasons ? 'series' : 'movies'}')">
                <img src="${i.image}">
                <div class="item-title">${i.title}</div>
            </div>
        `).join('');
    };

    // Clic en el Hero para abrir contenido
    document.getElementById('hero').onclick = (e) => {
        if (!e.target.classList.contains('dot')) {
            if (Math.abs(touchStartX - touchEndX) < 10) {
                const current = featuredList[currentHeroIndex];
                if (current) openModal(current.id, current.seasons ? 'series' : 'movies');
            }
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