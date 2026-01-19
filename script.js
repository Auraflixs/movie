// Variables globales
let continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
let myFavorites = JSON.parse(localStorage.getItem('myFavorites')) || [];
let currentUser = JSON.parse(localStorage.getItem('auraflixUser')) || null;

// Estas se llenarán cuando arranque la app
let moviesListInternal = [];
let seriesListInternal = [];
let featuredList = [];

let currentHeroIndex = 0;
let autoSlideInterval;
let currentModalItem = null;
let isPlayingTrailer = false; 
let currentView = 'home';
let selectedAvatarTemp = null;
let touchStartX = 0;
let touchEndX = 0;

const GALLERY_BTN_ID = "gallery-upload-btn-id";

// ESPERAR A QUE CARGUE TODO EL HTML Y LOS SCRIPTS
document.addEventListener('DOMContentLoaded', () => {
    // Aquí "agarramos" los datos de window que vienen de los otros archivos .js
    // Si usas window.moviesList en tus otros archivos, esto lo captura correctamente.
    moviesListInternal = window.moviesList || [];
    seriesListInternal = window.seriesList || [];

    // Verificación de emergencia por si los archivos no cargaron
    if (moviesListInternal.length === 0 && seriesListInternal.length === 0) {
        console.warn("¡Atención! Las listas de películas parecen estar vacías. Revisa que peli1.js, etc, estén cargados.");
    }

    checkLoginStatus();
    window.history.replaceState({ view: 'home', modal: false, search: false, history: false }, '');
    
    // Listeners globales
    document.getElementById('customAvatarInput').addEventListener('change', handleImageUpload);
    setupEventListeners();
});

function checkLoginStatus() {
    if (!currentUser) {
        document.getElementById('loginScreen').style.display = 'flex';
        renderAvatarSelection('avatarGrid', 'login');
    } else {
        loadUserDataInUI();
        initApp();
    }
}

function initApp() {
    renderHomeView();
    
    // Lógica para "Recién agregadas"
    let allContent = [...moviesListInternal, ...seriesListInternal];
    if (window.allContentSequence && window.allContentSequence.length > 0) {
        // Si tienes una secuencia manual
        let strictList = [];
        // Mapeamos los IDs a objetos reales
        window.allContentSequence.forEach(id => {
            const item = allContent.find(i => String(i.id) === String(id));
            if(item) strictList.push(item);
        });
        renderList('newlyAddedRow', strictList.reverse().slice(0, 20));
    } else {
        // Fallback: usar todo invertido
        renderList('newlyAddedRow', allContent.reverse().slice(0, 20));
    }

    setupHero(); 
}

function setupHero() {
    let allContent = [...moviesListInternal, ...seriesListInternal];
    featuredList = [];

    // 1. Intentar usar HERO_IDS definido en otro archivo
    if (window.HERO_IDS && Array.isArray(window.HERO_IDS) && window.HERO_IDS.length > 0) {
        window.HERO_IDS.forEach(targetId => {
            const foundItem = allContent.find(item => String(item.id) === String(targetId));
            if (foundItem) featuredList.push(foundItem);
        });
    }

    // 2. Si no hay, buscar propiedad .featured en los objetos
    if (featuredList.length === 0) {
        featuredList = allContent.filter(i => i.featured);
    }

    // 3. Si aun no hay nada, agarrar las primeras 5 de la mezcla
    if (featuredList.length === 0 && allContent.length > 0) {
        featuredList = allContent.slice(0, 5);
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

function renderHomeView() {
    // Clonamos para no afectar el orden original
    const moviesShuffled = [...moviesListInternal];
    const seriesShuffled = [...seriesListInternal];
    shuffleArray(moviesShuffled);
    shuffleArray(seriesShuffled);
    
    renderMultiRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    renderMultiRow('homeSeriesRow', seriesShuffled.slice(0, 30));
}

// FUNCION PRINCIPAL PARA ABRIR EL MODAL (AQUÍ ESTABA EL ERROR)
function openModal(id, typeHint) {
    // Resetear interfaces
    document.getElementById('searchOverlay').style.display = 'none';
    document.getElementById('historyOverlay').style.display = 'none';

    // Manejar historial
    if (!document.body.classList.contains('modal-open')) {
        window.history.pushState({ view: currentView, modal: true }, '');
    }

    // Buscar el item en TODAS las listas para asegurar que lo encontramos
    // Usamos String() para evitar errores de tipo (número vs texto)
    const idStr = String(id);
    const allContent = [...moviesListInternal, ...seriesListInternal];
    const item = allContent.find(i => String(i.id) === idStr);
    
    if (!item) {
        console.error("No se pudo encontrar el item con ID: " + id);
        return; // Salir si no existe
    }

    currentModalItem = item;
    
    // Determinar tipo real basado en si tiene temporadas
    const isSeries = (item.seasons && item.seasons.length > 0) || typeHint === 'series';

    const modal = document.getElementById('videoModal');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDesc');
    const actionBtn = document.getElementById('modalActionBtn');
    const episodesDiv = document.getElementById('seriesEpisodeSelector');
    const favBtn = document.getElementById('modalFavBtn');
    
    // Referencias Meta
    const yearEl = document.getElementById('modalYear');
    const sepEl = document.getElementById('modalSeparator');
    const genresEl = document.getElementById('modalGenres');

    // Llenar datos
    titleEl.innerText = item.title;
    yearEl.innerText = item.year || '';
    descEl.innerText = item.info || '';

    // LÓGICA DE GÉNEROS SEGURA
    if (item.genre && item.genre.trim().length > 0) {
        genresEl.innerText = item.genre;
        genresEl.style.display = 'inline';
        sepEl.style.display = 'inline';
    } else {
        // Si no hay género, ocultamos todo para que quede limpio
        genresEl.innerText = '';
        genresEl.style.display = 'none';
        sepEl.style.display = 'none';
    }

    // Favoritos
    const isFav = myFavorites.some(i => String(i.id) === String(item.id));
    if(isFav) favBtn.classList.add('active'); else favBtn.classList.remove('active');
    favBtn.onclick = toggleFavorite;

    document.body.classList.add('modal-open');
    document.querySelector('.modal-content').scrollTop = 0;

    // Configurar Reproductor y Botones según tipo
    if (isSeries) {
        episodesDiv.classList.remove('hidden');
        const select = document.getElementById('modalSeasonSelect');
        
        if (item.seasons) {
            select.innerHTML = item.seasons.map(s => `<option value="${s.season}">Temporada ${s.season}</option>`).join('');
            renderEpisodes(item.seasons[0], item, 0); 
            
            select.onchange = (e) => {
                const val = e.target.value;
                const season = item.seasons.find(s => String(s.season) === String(val));
                if(season) renderEpisodes(season, item, -1);
            };
        }

        actionBtn.innerHTML = '<i class="fas fa-film"></i> Ver Tráiler';
        actionBtn.onclick = () => {
             setPlayerVideo(item.trailer, "Tráiler");
             document.querySelectorAll('.episode-button').forEach(b => b.classList.remove('active'));
        };

    } else {
        // Película
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

    // Cargar Recomendaciones (pasamos ID para excluirla)
    renderRealRecommendations(item.id);
    modal.style.display = 'flex';
}

function renderRealRecommendations(currentId) {
    const container = document.getElementById('modalRecommendations');
    if (!container) return;

    let allContent = [...moviesListInternal, ...seriesListInternal];
    // Excluir la actual
    let filtered = allContent.filter(i => String(i.id) !== String(currentId));
    
    shuffleArray(filtered);
    const selection = filtered.slice(0, 6);

    container.innerHTML = selection.map(item => {
        const type = item.seasons ? 'series' : 'movies';
        return `
            <div class="item" onclick="openModal('${item.id}', '${type}')">
                <img src="${item.image}" loading="lazy">
                <div class="item-title">${item.title}</div>
            </div>
        `;
    }).join('');
}

function renderEpisodes(season, serieItem, autoPlayIndex = -1) {
    const container = document.getElementById('modalEpisodesContainer');
    container.innerHTML = ''; 
    if(!season || !season.episodes) return;
    
    container.innerHTML = season.episodes.map((ep, idx) => `
        <button class="episode-button ${idx === autoPlayIndex ? 'active' : ''}" data-idx="${idx}">${ep.episode}</button>
    `).join('');

    // Autoplay si se requiere
    if (autoPlayIndex >= 0 && season.episodes[autoPlayIndex]) {
        const ep = season.episodes[autoPlayIndex];
        setPlayerVideo(ep.video, `T${season.season}: Cap ${ep.episode}`);
        addToContinueWatching(serieItem, 'series');
    }

    // Click en episodios
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
        playerDiv.innerHTML = '<div class="video-container" style="display:flex;align-items:center;justify-content:center;color:gray;height:100%;">Video no disponible</div>';
        return;
    }
    
    const container = document.createElement('div');
    container.className = 'video-container';
    
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
    iframe.setAttribute('allowfullscreen', 'true');
    
    container.appendChild(iframe);
    
    if (overlayText) {
        const overlay = document.createElement('div');
        overlay.className = 'video-overlay-label';
        overlay.innerText = overlayText;
        container.appendChild(overlay);
    }
    playerDiv.appendChild(container);
}

// Helpers
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

function createItemHTML(item) {
    // Detectamos tipo dinámicamente
    const type = item.seasons ? 'series' : 'movies';
    // Escapamos comillas simples en el ID por si acaso
    const safeId = String(item.id).replace(/'/g, "\\'");
    return `
        <div class="item" onclick="openModal('${safeId}', '${type}')">
            <img src="${item.image}" loading="lazy" alt="${item.title}">
            <div class="item-title">${item.title}</div>
        </div>
    `;
}

// Lógica del Hero Carousel
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
    if(dots[currentHeroIndex]) dots[currentHeroIndex].classList.remove('active');
    
    currentHeroIndex = index;
    slides[currentHeroIndex].style.display = 'block';
    if(dots[currentHeroIndex]) dots[currentHeroIndex].classList.add('active');
}
function startAutoSlide() { 
    clearInterval(autoSlideInterval);
    autoSlideInterval = setInterval(nextHeroSlide, 5000); 
}

// Historial y Favoritos
function addToContinueWatching(item, type) {
    continueWatching = continueWatching.filter(i => String(i.id) !== String(item.id));
    continueWatching.unshift({ ...item, type });
    if (continueWatching.length > 20) continueWatching.pop();
    localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
}
function toggleFavorite() {
    if(!currentModalItem) return;
    const index = myFavorites.findIndex(i => String(i.id) === String(currentModalItem.id));
    const btn = document.getElementById('modalFavBtn');

    if (index === -1) {
        myFavorites.unshift(currentModalItem);
        btn.classList.add('active');
    } else {
        myFavorites.splice(index, 1);
        btn.classList.remove('active');
    }
    localStorage.setItem('myFavorites', JSON.stringify(myFavorites));
    renderMyList();
}
function renderMyList() {
    const container = document.getElementById('myListRow');
    if(!container) return;
    if(myFavorites.length === 0) {
        container.innerHTML = '<p style="padding:20px; color:#555;">No tienes favoritos aún.</p>';
        return;
    }
    container.innerHTML = myFavorites.map(item => createItemHTML(item)).join('');
}
function renderHistoryOverlayContent() {
    const container = document.getElementById('historyResults');
    if (!container) return;
    if (continueWatching.length === 0) { 
        container.innerHTML = '<p style="padding:20px; color:#aaa;">No has visto nada recientemente.</p>'; 
        return; 
    }
    container.innerHTML = continueWatching.map(item => createItemHTML(item)).join('');
}

// Event Listeners y Navegación
function switchView(viewName, pushToHistory = true) {
    document.getElementById('view-home').classList.add('hidden');
    document.getElementById('view-movies').classList.add('hidden');
    document.getElementById('view-series').classList.add('hidden');
    document.getElementById('view-profile').classList.add('hidden');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    window.scrollTo({top: 0, behavior: 'auto'});
    currentView = viewName;

    const headerIcons = document.getElementById('headerRightIcons');
    if (viewName === 'profile') headerIcons.classList.add('hidden-header-icons');
    else headerIcons.classList.remove('hidden-header-icons');

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
    } else if (viewName === 'profile') {
        document.getElementById('view-profile').classList.remove('hidden');
        document.getElementById('nav-profile').classList.add('active');
        renderMyList(); 
    }

    if (pushToHistory) window.history.pushState({ view: viewName, modal: false }, '');
}

function setupEventListeners() {
    // Hero Touch
    const hero = document.getElementById('hero');
    hero.onclick = (e) => {
        if (Math.abs(touchStartX - touchEndX) < 10 && featuredList[currentHeroIndex]) {
            const current = featuredList[currentHeroIndex];
            openModal(current.id, current.seasons ? 'series' : 'movies');
        }
    };
    hero.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX, {passive: true});
    hero.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        if (touchStartX - touchEndX > 50) nextHeroSlide();
        if (touchEndX - touchStartX > 50) prevHeroSlide();
    }, {passive: true});

    // Nav
    document.getElementById('nav-home').onclick = (e) => { e.preventDefault(); switchView('home'); };
    document.getElementById('nav-movies').onclick = (e) => { e.preventDefault(); switchView('movies'); };
    document.getElementById('nav-series').onclick = (e) => { e.preventDefault(); switchView('series'); };
    document.getElementById('nav-profile').onclick = (e) => { e.preventDefault(); switchView('profile'); };
    
    // Search & History
    document.getElementById('topSearchBtn').onclick = (e) => {
        e.preventDefault();
        document.getElementById('searchOverlay').style.display = 'block';
        document.getElementById('searchInput').focus();
        window.history.pushState({ view: currentView, modal: false, search: true }, '');
    };
    document.getElementById('topHistoryBtn').onclick = (e) => {
        e.preventDefault();
        renderHistoryOverlayContent(); 
        document.getElementById('historyOverlay').style.display = 'block';
        window.history.pushState({ view: currentView, modal: false, history: true }, '');
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

    // Modals Close
    document.getElementById('closeModal').addEventListener('click', () => { closeModalInternal(); window.history.back(); });
    document.getElementById('closeSearch').onclick = () => window.history.back();
    document.getElementById('closeHistory').onclick = () => window.history.back();

    // Perfil
    document.getElementById('saveProfileBtn').addEventListener('click', () => {
        const nameInput = document.getElementById('usernameInput');
        const name = nameInput.value.trim();
        if (name.length < 2) { alert("Escribe un nombre."); return; }
        if (!selectedAvatarTemp) { alert("Elige un avatar."); return; }
        currentUser = { name: name, avatar: selectedAvatarTemp };
        localStorage.setItem('auraflixUser', JSON.stringify(currentUser));
        document.getElementById('loginScreen').style.display = 'none';
        loadUserDataInUI();
        initApp();
    });
    
    // Perfil Avatares
    function handleImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(event) {
            selectedAvatarTemp = event.target.result; 
            let activeGridId = null;
            let activeBtnId = null;
            if (document.getElementById('loginScreen').style.display === 'flex') {
                activeGridId = 'avatarGrid';
                activeBtnId = GALLERY_BTN_ID + '-login';
            } else if (document.getElementById('changeAvatarModal').style.display === 'flex') {
                activeGridId = 'changeAvatarGrid';
                activeBtnId = GALLERY_BTN_ID + '-modal';
            }
            if (activeGridId) {
                const grid = document.getElementById(activeGridId);
                grid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                const btn = document.getElementById(activeBtnId);
                if(btn) btn.classList.add('selected');
            }
        };
        reader.readAsDataURL(file);
    }
    
    document.getElementById('profilePageImg').addEventListener('click', () => {
        document.getElementById('changeAvatarModal').style.display = 'flex';
        renderAvatarSelection('changeAvatarGrid', 'modal');
    });
    document.getElementById('closeAvatarModal').addEventListener('click', () => document.getElementById('changeAvatarModal').style.display = 'none');
    document.getElementById('confirmAvatarChange').addEventListener('click', () => {
        if(!selectedAvatarTemp) { alert("Selecciona una imagen."); return; }
        updateUserProfile(selectedAvatarTemp);
        document.getElementById('changeAvatarModal').style.display = 'none';
    });

    // Botones Varios del Perfil
    document.getElementById('btnSupport').onclick = () => document.getElementById('supportModal').style.display = 'flex';
    document.getElementById('closeSupportBtn').onclick = () => document.getElementById('supportModal').style.display = 'none';
    document.getElementById('btnBroadcast').onclick = () => window.open('https://t.me/Auraflixpeli', '_blank');
    document.getElementById('btnTerms').onclick = () => document.getElementById('termsModal').style.display = 'flex';
    document.getElementById('closeTermsBtn').onclick = () => document.getElementById('termsModal').style.display = 'none';
    document.getElementById('btnSettings').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
    document.getElementById('closeSettingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'none';
    document.getElementById('btnCache').onclick = () => {
        if(confirm("¿Borrar historial y favoritos guardados?")) {
            localStorage.removeItem('continueWatching');
            localStorage.removeItem('myFavorites');
            continueWatching = []; myFavorites = [];
            renderMyList();
            alert("Caché borrada.");
            document.getElementById('settingsModal').style.display = 'none';
        }
    };
    document.getElementById('btnShare').onclick = () => {
        const link = "https://auraflix.com"; // Pon tu link real aquí
        if (navigator.share) navigator.share({ title: 'Auraflix', text: 'App de Pelis', url: link }).catch(console.error);
        else { navigator.clipboard.writeText(link); alert("Link copiado."); }
    };
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if(confirm("¿Cerrar sesión?")) { localStorage.clear(); location.reload(); }
    });
}

function renderAvatarSelection(containerId, context) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    if (typeof profileImages !== 'undefined') {
        profileImages.forEach((url) => {
            const div = document.createElement('div');
            div.className = 'avatar-option';
            div.innerHTML = `<img src="${url}" alt="Avatar">`;
            div.onclick = () => {
                grid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedAvatarTemp = url;
            };
            grid.appendChild(div);
        });
    }
    const addBtn = document.createElement('div');
    addBtn.className = 'avatar-option';
    addBtn.id = context === 'login' ? GALLERY_BTN_ID + '-login' : GALLERY_BTN_ID + '-modal';
    addBtn.innerHTML = `<div class="upload-btn"><i class="fas fa-plus"></i></div>`;
    addBtn.onclick = () => document.getElementById('customAvatarInput').click();
    grid.appendChild(addBtn);
}
function updateUserProfile(newUrl) {
    if(currentUser) {
        currentUser.avatar = newUrl;
        localStorage.setItem('auraflixUser', JSON.stringify(currentUser));
        loadUserDataInUI();
    }
}
function loadUserDataInUI() {
    if (!currentUser) return;
    const navImg = document.getElementById('navProfileImg');
    if(navImg) navImg.src = currentUser.avatar;
    const pageImg = document.getElementById('profilePageImg');
    const pageName = document.getElementById('profilePageName');
    if(pageImg) pageImg.src = currentUser.avatar;
    if(pageName) pageName.innerText = currentUser.name;
    renderMyList(); 
}
function closeModalInternal() {
    document.getElementById('videoModal').style.display = 'none';
    document.getElementById('modalContentPlayer').innerHTML = ''; 
    document.body.classList.remove('modal-open');
}
window.addEventListener('popstate', (event) => {
    if (!event.state || !event.state.modal) {
        if (document.getElementById('videoModal').style.display === 'flex') closeModalInternal();
        document.getElementById('termsModal').style.display = 'none';
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('supportModal').style.display = 'none';
    }
    if (!event.state || !event.state.search) document.getElementById('searchOverlay').style.display = 'none';
    if (!event.state || !event.state.history) document.getElementById('historyOverlay').style.display = 'none';
    if (event.state && event.state.view) switchView(event.state.view, false);
});
