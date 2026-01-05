// script.js - Lógica Auraflix+ (Versión Ventana Emergente / Nueva Pestaña)

// --- 1. CONEXIÓN DE DATOS GLOBAL ---
const contentData = {
    get movies() { return typeof moviesData !== 'undefined' ? moviesData : []; },
    get series() { return typeof seriesData !== 'undefined' ? seriesData : []; }
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
    // Pequeña espera para asegurar que carguen peliculas.js y series.js
    setTimeout(() => {
        if (contentData.movies.length > 0 || contentData.series.length > 0) {
            init();
        } else {
            console.error("Error: No hay datos. Verifica que cargaste peliculas.js y series.js antes del script.");
        }
    }, 100);
});

function init() {
    // Unimos y filtramos destacados
    featuredList = [...contentData.movies, ...contentData.series]
        .filter(i => i.featured)
        .slice(0, 5); 
    
    renderHero();
    renderRows();
    renderContinueWatching();
    setupEventListeners();
    setupHeroGestures();
    startAutoSlide();
}

// --- 4. GESTOS HERO (CARRUSEL) ---
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
    if (!slides.length) return;
    slides[currentHeroIndex].style.display = 'none';
    dots[currentHeroIndex].classList.remove('active');
    currentHeroIndex = (currentHeroIndex - 1 + featuredList.length) % featuredList.length;
    slides[currentHeroIndex].style.display = 'block';
    dots[currentHeroIndex].classList.add('active');
}

function nextHeroSlide() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (!slides.length) return;
    slides[currentHeroIndex].style.display = 'none';
    dots[currentHeroIndex].classList.remove('active');
    currentHeroIndex = (currentHeroIndex + 1) % featuredList.length;
    slides[currentHeroIndex].style.display = 'block';
    dots[currentHeroIndex].classList.add('active');
}

function renderHero() {
    const container = document.querySelector('.carousel-container');
    const dots = document.getElementById('heroDots');
    if (!container || !featuredList.length) return;
    
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
            <img src="${item.image}" loading="lazy">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
}

// --- 6. REPRODUCTOR INTERNO (SOLO PARA TRAILERS) ---
function setPlayerVideo(url) {
    const playerDiv = document.getElementById('modalContentPlayer');
    playerDiv.innerHTML = ''; // Limpiar previo

    if (!url) {
        playerDiv.innerHTML = `<div class="video-container" style="display:flex;align-items:center;justify-content:center;color:#666;height:200px;background:#000;">Trailer no disponible</div>`;
        return;
    }

    // Convertir enlace normal de YouTube a Embed para el Trailer
    let finalUrl = url;
    if (url.includes('watch?v=')) finalUrl = url.replace('watch?v=', 'embed/');
    else if (url.includes('youtu.be/')) finalUrl = url.replace('youtu.be/', 'youtube.com/embed/');

    playerDiv.innerHTML = `
        <div class="video-container">
            <iframe src="${finalUrl}" allowfullscreen allow="autoplay"></iframe>
        </div>`;
}

// --- 7. APERTURA DE MODAL ---
function openModal(id, type) {
    const item = contentData[type].find(i => i.id === id);
    if (!item) return;

    const modal = document.getElementById('videoModal');
    
    // Llenar datos de texto
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    document.getElementById('modalDesc').innerText = item.info;
    document.getElementById('modalType').innerText = type === 'series' ? 'Serie' : 'Película';

    // Cargar Trailer por defecto en el modal
    setPlayerVideo(item.trailer);

    // Botones
    const playBtn = document.getElementById('modalPlayBtn');
    const trailerBtn = document.getElementById('modalTrailerBtn');
    const seriesSelector = document.getElementById('seriesEpisodeSelector');

    // Acción Botón Trailer (Siempre en el modal)
    trailerBtn.onclick = () => setPlayerVideo(item.trailer);

    renderRandomRecommendations(id);

    if (type === 'series') {
        // MODO SERIES
        seriesSelector.classList.remove('hidden');
        playBtn.classList.add('hidden'); // Ocultar botón gigante de play

        const select = document.getElementById('modalSeasonSelect');
        select.innerHTML = item.seasons.map(s => `<option value="${s.season}">Temporada ${s.season}</option>`).join('');
        
        // Renderizar episodios de la primera temporada disponible
        renderEpisodes(item.seasons[0], item);

        // Cambio de temporada
        select.onchange = (e) => {
            const season = item.seasons.find(s => s.season == e.target.value);
            renderEpisodes(season, item);
        };

    } else {
        // MODO PELÍCULAS
        seriesSelector.classList.add('hidden');
        playBtn.classList.remove('hidden');

        // *** AQUÍ ESTÁ EL CAMBIO PARA PELÍCULAS ***
        playBtn.onclick = () => {
            addToContinueWatching(item, 'movies');
            // Abre NUEVA PESTAÑA con el enlace
            window.open(item.video, '_blank');
        };
    }

    modal.style.display = 'flex';
}

function renderEpisodes(season, serieItem) {
    const container = document.getElementById('modalEpisodesContainer');
    container.innerHTML = season.episodes.map(ep => `<button class="episode-button">${ep.episode}</button>`).join('');
    
    const buttons = container.querySelectorAll('.episode-button');
    buttons.forEach((btn, index) => {
        // *** AQUÍ ESTÁ EL CAMBIO PARA SERIES ***
        btn.onclick = () => {
            addToContinueWatching(serieItem, 'series');
            // Abre NUEVA PESTAÑA con el enlace del capitulo
            window.open(season.episodes[index].video, '_blank');
        };
    });
}

// --- 8. RECOMENDADOS Y CONTINUAR VIENDO ---
function renderRandomRecommendations(currentId) {
    const container = document.getElementById('modalRecommendations');
    let all = [...contentData.movies, ...contentData.series].filter(i => i.id !== currentId);
    
    // Mezclar array
    for (let i = all.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [all[i], all[j]] = [all[j], all[i]];
    }
    
    container.innerHTML = all.slice(0, 6).map(item => `
        <div class="item" onclick="openModal(${item.id}, '${item.seasons ? 'series' : 'movies'}')">
            <img src="${item.image}">
            <div class="item-title">${item.title}</div>
        </div>
    `).join('');
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

// --- 9. NAVEGACIÓN Y CIERRE ---
function setupEventListeners() {
    // Cerrar Modal
    document.getElementById('closeModal').onclick = () => {
        document.getElementById('videoModal').style.display = 'none';
        document.getElementById('modalContentPlayer').innerHTML = ''; // Detener trailer si suena
    };

    // Navegación Barra Inferior
    document.getElementById('bottomMenuBtn').onclick = (e) => { e.preventDefault(); switchView('home'); };
    document.getElementById('moviesNavBtnBottom').onclick = (e) => { e.preventDefault(); switchView('movies'); };
    document.getElementById('seriesNavBtnBottom').onclick = (e) => { e.preventDefault(); switchView('series'); };
    
    // Buscador
    document.getElementById('searchNavBtn').onclick = (e) => {
        e.preventDefault();
        document.getElementById('searchOverlay').style.display = 'block';
        document.getElementById('searchInput').focus();
    };
    document.getElementById('closeSearch').onclick = () => document.getElementById('searchOverlay').style.display = 'none';

    // Click Hero (si no es en los puntos)
    document.getElementById('hero').onclick = (e) => {
        if (!e.target.classList.contains('dot') && Math.abs(touchStartX - touchEndX) < 10) {
            const current = featuredList[currentHeroIndex];
            if (current) openModal(current.id, current.seasons ? 'series' : 'movies');
        }
    };

    // Buscador Input
    document.getElementById('searchInput').oninput = (e) => {
        const q = e.target.value.toLowerCase();
        const res = [...contentData.movies, ...contentData.series].filter(i => i.title.toLowerCase().includes(q));
        document.getElementById('searchResults').innerHTML = res.map(i => `
            <div class="item" onclick="openModal(${i.id}, '${i.seasons ? 'series' : 'movies'}')">
                <img src="${i.image}">
                <div class="item-title">${i.title}</div>
            </div>`).join('');
    };
}

function switchView(view) {
    const main = document.getElementById('mainContent');
    const filter = document.getElementById('filterContent');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    if (view === 'home') {
        main.classList.remove('hidden');
        filter.classList.add('hidden');
        document.getElementById('bottomMenuBtn').classList.add('active');
    } else {
        main.classList.add('hidden');
        filter.classList.remove('hidden');
        document.getElementById('filterTitle').innerText = view === 'movies' ? "Películas" : "Series";
        document.getElementById(view === 'movies' ? 'moviesNavBtnBottom' : 'seriesNavBtnBottom').classList.add('active');
        renderList(contentData[view], 'filteredRow', view);
    }
}
