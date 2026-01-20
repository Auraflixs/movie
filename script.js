let continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
let myFavorites = JSON.parse(localStorage.getItem('myFavorites')) || [];
let currentUser = JSON.parse(localStorage.getItem('auraflixUser')) || null;

let moviesListInternal = [];
let seriesListInternal = [];
let featuredList = [];

let currentHeroIndex = 0;
let autoSlideInterval;
let currentModalItem = null;
let currentSeasonIndex = 0;
let isPlayingTrailer = false; 
let currentView = 'home';
let selectedAvatarTemp = null; 
let touchStartX = 0;
let touchEndX = 0;

const GALLERY_BTN_ID_LOGIN = "gallery-upload-btn-id-login";
const GALLERY_BTN_ID_MODAL = "gallery-upload-btn-id-modal";

const ALL_GENRES = [
    "Acción", "Aventura", "Animación", "Comedia", "Crimen", "Documental", 
    "Drama", "Familia", "Fantasía", "Historia", "Terror", "Música", 
    "Misterio", "Romance", "Ciencia ficción", "Película de TV", 
    "Suspenso", "Bélica", "Western"
];
let movieFilters = [];
let seriesFilters = [];
let tempFilters = [];
let currentFilterContext = '';

const normalizeText = (text) => {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

document.addEventListener('DOMContentLoaded', () => {
    moviesListInternal = window.moviesList || [];
    seriesListInternal = window.seriesList || [];
    
    checkLoginStatus();
    
    window.history.replaceState({ view: 'home', modal: false, search: false, history: false }, '');
    
    const avatarInput = document.getElementById('customAvatarInput');
    if(avatarInput) {
        avatarInput.addEventListener('change', handleImageUpload);
    }
    
    setupEventListeners();
});

function checkLoginStatus() {
    if (!currentUser) {
        document.getElementById('loginScreen').style.display = 'flex';
        renderAvatarSelection('avatarGrid', 'login');
    } else {
        document.getElementById('loginScreen').style.display = 'none';
        loadUserDataInUI();
        initApp();
    }
}

function initApp() {
    renderHomeView();
    
    let orderedContent = [];
    if (window.globalContent && window.globalContent.length > 0) {
        orderedContent = [...window.globalContent];
    } else {
        orderedContent = [...moviesListInternal, ...seriesListInternal];
    }
    
    renderList('newlyAddedRow', orderedContent.reverse().slice(0, 20));
    
    setupHero(); 
}

function renderAvatarSelection(containerId, context) {
    const grid = document.getElementById(containerId);
    if(!grid) return;
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
    addBtn.id = context === 'login' ? GALLERY_BTN_ID_LOGIN : GALLERY_BTN_ID_MODAL;
    addBtn.innerHTML = `<div class="upload-btn"><i class="fas fa-plus"></i></div>`;
    addBtn.onclick = () => document.getElementById('customAvatarInput').click();
    grid.appendChild(addBtn);
}

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
            activeBtnId = GALLERY_BTN_ID_LOGIN;
        } else if (document.getElementById('changeAvatarModal').style.display === 'flex') {
            activeGridId = 'changeAvatarGrid';
            activeBtnId = GALLERY_BTN_ID_MODAL;
        }
        if (activeGridId && activeBtnId) {
            const grid = document.getElementById(activeGridId);
            const btn = document.getElementById(activeBtnId);
            grid.querySelectorAll('.avatar-option').forEach(el => el.classList.remove('selected'));
            if(btn) {
                btn.innerHTML = `<img src="${selectedAvatarTemp}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                btn.classList.add('selected');
            }
        }
    };
    reader.readAsDataURL(file);
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

function setupHero() {
    const allContent = [...moviesListInternal, ...seriesListInternal];
    featuredList = [];
    if (window.HERO_IDS && Array.isArray(window.HERO_IDS) && window.HERO_IDS.length > 0) {
        window.HERO_IDS.forEach(targetId => {
            const foundItem = allContent.find(item => String(item.id) === String(targetId));
            if (foundItem) featuredList.push(foundItem);
        });
    }
    if (featuredList.length === 0) featuredList = allContent.filter(i => i.featured);
    if (featuredList.length === 0 && allContent.length > 0) featuredList = allContent.slice(0, 5);
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
function nextHeroSlide() { updateHeroVisuals((currentHeroIndex + 1) % featuredList.length); }
function prevHeroSlide() { updateHeroVisuals((currentHeroIndex - 1 + featuredList.length) % featuredList.length); }
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

function renderHomeView() {
    const moviesShuffled = [...moviesListInternal];
    const seriesShuffled = [...seriesListInternal];
    shuffleArray(moviesShuffled);
    shuffleArray(seriesShuffled);
    renderMultiRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    renderMultiRow('homeSeriesRow', seriesShuffled.slice(0, 30));
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
    const type = item.seasons ? 'series' : 'movies';
    const safeId = String(item.id).replace(/'/g, "\\'");
    return `
        <div class="item" onclick="openModal('${safeId}', '${type}')">
            <img src="${item.image}" loading="lazy" alt="${item.title}">
            <div class="item-title">${item.title}</div>
        </div>
    `;
}

function openFilterModal(context) {
    currentFilterContext = context;
    const modal = document.getElementById('filterModal');
    if (context === 'movies') tempFilters = [...movieFilters];
    else tempFilters = [...seriesFilters];
    renderFilterChips();
    modal.style.display = 'flex';
}
function renderFilterChips() {
    const container = document.getElementById('genresContainer');
    container.innerHTML = '';
    ALL_GENRES.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = `genre-tag ${tempFilters.includes(genre) ? 'selected' : ''}`;
        btn.innerText = genre;
        btn.onclick = () => {
            if (tempFilters.includes(genre)) {
                tempFilters = tempFilters.filter(g => g !== genre);
                btn.classList.remove('selected');
            } else {
                tempFilters.push(genre);
                btn.classList.add('selected');
            }
        };
        container.appendChild(btn);
    });
}
function applyFilters() {
    if (currentFilterContext === 'movies') {
        movieFilters = [...tempFilters];
        renderFilteredMovies();
    } else {
        seriesFilters = [...tempFilters];
        renderFilteredSeries();
    }
    document.getElementById('filterModal').style.display = 'none';
}
function clearFilters() {
    tempFilters = [];
    if (currentFilterContext === 'movies') { movieFilters = []; renderFilteredMovies(); } 
    else { seriesFilters = []; renderFilteredSeries(); }
    document.getElementById('filterModal').style.display = 'none';
}
function getItemGenres(item) {
    if (Array.isArray(item.genres)) return item.genres;
    if (typeof item.genre === 'string') return item.genre.split(',').map(g => g.trim());
    if (Array.isArray(item.genre)) return item.genre;
    return [];
}
function renderFilteredMovies() {
    const container = document.getElementById('allMoviesGrid');
    const displayFilterText = document.getElementById('activeFiltersMovies');
    let listToShow = [...moviesListInternal];
    if (movieFilters.length > 0) {
        displayFilterText.innerText = "Filtros: " + movieFilters.join(", ");
        displayFilterText.style.display = 'block';
        listToShow = listToShow.filter(item => {
            const itemGenres = getItemGenres(item);
            return movieFilters.some(filter => itemGenres.some(ig => ig.toLowerCase().trim() === filter.toLowerCase().trim()));
        });
    } else {
        displayFilterText.style.display = 'none';
        shuffleArray(listToShow);
    }
    if (listToShow.length === 0) container.innerHTML = '<p style="padding:20px; color:#666; width:100%; text-align:center;">No hay resultados.</p>';
    else renderList('allMoviesGrid', listToShow);
}
function renderFilteredSeries() {
    const container = document.getElementById('allSeriesGrid');
    const displayFilterText = document.getElementById('activeFiltersSeries');
    let listToShow = [...seriesListInternal];
    if (seriesFilters.length > 0) {
        displayFilterText.innerText = "Filtros: " + seriesFilters.join(", ");
        displayFilterText.style.display = 'block';
        listToShow = listToShow.filter(item => {
            const itemGenres = getItemGenres(item);
            return seriesFilters.some(filter => itemGenres.some(ig => ig.toLowerCase().trim() === filter.toLowerCase().trim()));
        });
    } else {
        displayFilterText.style.display = 'none';
        shuffleArray(listToShow);
    }
    if (listToShow.length === 0) container.innerHTML = '<p style="padding:20px; color:#666; width:100%; text-align:center;">No hay resultados.</p>';
    else renderList('allSeriesGrid', listToShow);
}

function openModal(id, typeHint) {
    document.getElementById('searchOverlay').style.display = 'none';
    document.getElementById('historyOverlay').style.display = 'none';

    if (!document.body.classList.contains('modal-open')) {
        window.history.pushState({ view: currentView, modal: true }, '');
    }

    const idStr = String(id);
    const allContent = [...moviesListInternal, ...seriesListInternal];
    const item = allContent.find(i => String(i.id) === idStr);
    
    if (!item) return;

    currentModalItem = item;
    const isSeries = (item.seasons && item.seasons.length > 0) || typeHint === 'series';

    const modal = document.getElementById('videoModal');
    const titleEl = document.getElementById('modalTitle');
    const descEl = document.getElementById('modalDesc');
    const actionBtn = document.getElementById('modalActionBtn');
    const episodesDiv = document.getElementById('seriesEpisodeSelector');
    const favBtn = document.getElementById('modalFavBtn');
    const yearEl = document.getElementById('modalYear');
    const sepEl = document.getElementById('modalSeparator');
    const genresEl = document.getElementById('modalGenres');

    document.body.classList.add('modal-open');
    document.querySelector('.modal-content').scrollTop = 0;

    titleEl.innerText = item.title;
    yearEl.innerText = item.year || '';
    descEl.innerText = item.info || '';

    let genreText = "";
    const g = getItemGenres(item);
    if (g.length > 0) genreText = g.slice(0, 3).join(' / ');
    if (genreText) {
        genresEl.innerText = genreText;
        sepEl.style.display = 'inline';
        genresEl.style.display = 'inline';
    } else {
        sepEl.style.display = 'none';
        genresEl.style.display = 'none';
    }

    const isFav = myFavorites.some(i => String(i.id) === String(item.id));
    if(isFav) favBtn.classList.add('active'); else favBtn.classList.remove('active');
    favBtn.onclick = toggleFavorite;
    
    if (isSeries) {
        episodesDiv.classList.remove('hidden');
        
        if (item.seasons && item.seasons.length > 0) {
            currentSeasonIndex = 0;
            document.getElementById('currentSeasonText').innerText = `Temporada ${item.seasons[0].season}`;
            renderEpisodes(item.seasons[0], item, 0); 

            document.getElementById('btnOpenSeasonModal').onclick = () => {
                openSeasonSelectorModal();
            };
        }
        
        actionBtn.innerHTML = '<i class="fas fa-film"></i> Ver Tráiler';
        actionBtn.onclick = () => {
             setPlayerVideo(item.trailer, "Tráiler");
             document.querySelectorAll('.episode-button').forEach(b => b.classList.remove('active'));
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

function openSeasonSelectorModal() {
    if (!currentModalItem || !currentModalItem.seasons) return;
    
    const seasonModal = document.getElementById('seasonSelectorModal');
    const container = document.getElementById('seasonListContainer');
    container.innerHTML = '';

    currentModalItem.seasons.forEach((seasonObj, index) => {
        const itemBtn = document.createElement('button');
        itemBtn.className = `season-modal-item ${index === currentSeasonIndex ? 'active' : ''}`;
        
        itemBtn.innerHTML = `
            <span>Temporada ${seasonObj.season}</span>
            <div class="season-radio-circle"></div>
        `;
        
        itemBtn.onclick = () => {
            currentSeasonIndex = index;
            document.getElementById('currentSeasonText').innerText = `Temporada ${seasonObj.season}`;
            renderEpisodes(seasonObj, currentModalItem, 0); 
            seasonModal.style.display = 'none';
        };
        
        container.appendChild(itemBtn);
    });

    seasonModal.style.display = 'flex';
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
    const container = document.createElement('div');
    container.className = 'video-container';
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    iframe.setAttribute('allowfullscreen', 'true');
    iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin allow-presentation');
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
    if (!container) return;
    let allContent = [...moviesListInternal, ...seriesListInternal];
    let filtered = allContent.filter(i => String(i.id) !== String(currentId));
    shuffleArray(filtered);
    const selection = filtered.slice(0, 6);
    container.innerHTML = selection.map(item => createItemHTML(item)).join('');
}

function closeModalInternal() {
    const modal = document.getElementById('videoModal');
    modal.style.display = 'none';
    document.getElementById('modalContentPlayer').innerHTML = ''; 
    document.body.classList.remove('modal-open');
}

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

function renderPopularSearches() {
    const container = document.getElementById('popularTags');
    const input = document.getElementById('searchInput');
    if (!container || !window.busquedasPopulares) return;

    container.innerHTML = window.busquedasPopulares.map(term => `
        <span class="pop-tag">${term}</span>
    `).join('');

    container.querySelectorAll('.pop-tag').forEach(tag => {
        tag.onclick = () => {
            input.value = tag.innerText;
            input.dispatchEvent(new Event('input'));
        };
    });
}

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
        renderFilteredMovies();
    } else if (viewName === 'series') {
        document.getElementById('view-series').classList.remove('hidden');
        document.getElementById('nav-series').classList.add('active');
        renderFilteredSeries();
    } else if (viewName === 'profile') {
        document.getElementById('view-profile').classList.remove('hidden');
        document.getElementById('nav-profile').classList.add('active');
        renderMyList(); 
    }
    if (pushToHistory) window.history.pushState({ view: viewName, modal: false }, '');
}

function setupEventListeners() {
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

    document.getElementById('nav-home').onclick = (e) => { e.preventDefault(); switchView('home'); };
    document.getElementById('nav-movies').onclick = (e) => { e.preventDefault(); switchView('movies'); };
    document.getElementById('nav-series').onclick = (e) => { e.preventDefault(); switchView('series'); };
    document.getElementById('nav-profile').onclick = (e) => { e.preventDefault(); switchView('profile'); };
    
    document.getElementById('btnFilterMovies').onclick = () => openFilterModal('movies');
    document.getElementById('btnFilterSeries').onclick = () => openFilterModal('series');
    document.getElementById('applyFiltersBtn').onclick = applyFilters;
    document.getElementById('clearFiltersBtn').onclick = clearFilters;
    document.getElementById('closeFilterModal').onclick = () => document.getElementById('filterModal').style.display = 'none';

    document.getElementById('topSearchBtn').onclick = (e) => {
        e.preventDefault();
        document.getElementById('searchOverlay').style.display = 'block';
        document.getElementById('searchInput').focus();
        renderPopularSearches();
        window.history.pushState({ view: currentView, modal: false, search: true }, '');
    };
    document.getElementById('topHistoryBtn').onclick = (e) => {
        e.preventDefault();
        renderHistoryOverlayContent(); 
        document.getElementById('historyOverlay').style.display = 'block';
        window.history.pushState({ view: currentView, modal: false, history: true }, '');
    };
    document.getElementById('searchInput').addEventListener('input', (e) => {
        const val = normalizeText(e.target.value);
        const container = document.getElementById('searchResults');
        container.innerHTML = '';
        if (val.length < 2) return;
        
        const all = [...moviesListInternal, ...seriesListInternal];
        
        const filtered = all.filter(item => {
            const titleMatch = normalizeText(item.title).includes(val);
            let tagsMatch = false;
            if (item.tags && Array.isArray(item.tags)) {
                tagsMatch = item.tags.some(tag => normalizeText(tag).includes(val));
            }
            return titleMatch || tagsMatch;
        });
        
        renderList('searchResults', filtered);
    });

    document.getElementById('closeSearch').onclick = () => window.history.back();
    document.getElementById('closeHistory').onclick = () => window.history.back();
    document.getElementById('closeModal').addEventListener('click', () => { closeModalInternal(); window.history.back(); });
    
    document.getElementById('closeSeasonSelector').onclick = () => document.getElementById('seasonSelectorModal').style.display = 'none';

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
    
    document.getElementById('btnSupport').onclick = () => document.getElementById('supportModal').style.display = 'flex';
    document.getElementById('closeSupportBtn').onclick = () => document.getElementById('supportModal').style.display = 'none';
    document.getElementById('btnBroadcast').onclick = () => window.open('https://t.me/Auraflixpeli', '_blank');
    document.getElementById('btnTerms').onclick = () => document.getElementById('termsModal').style.display = 'flex';
    document.getElementById('closeTermsBtn').onclick = () => document.getElementById('termsModal').style.display = 'none';
    document.getElementById('btnSettings').onclick = () => document.getElementById('settingsModal').style.display = 'flex';
    document.getElementById('closeSettingsBtn').onclick = () => document.getElementById('settingsModal').style.display = 'none';
    
    document.getElementById('btnCache').onclick = () => {
        if(confirm("¿Borrar historial de visualización y favoritos?")) {
            localStorage.removeItem('continueWatching');
            localStorage.removeItem('myFavorites');
            continueWatching = []; myFavorites = [];
            renderMyList();
            alert("Caché borrada.");
            document.getElementById('settingsModal').style.display = 'none';
        }
    };
    
    document.getElementById('btnShare').onclick = () => {
        document.getElementById('shareModal').style.display = 'flex';
    };
    document.getElementById('closeShareModal').onclick = () => {
        document.getElementById('shareModal').style.display = 'none';
    };
    const shareContent = async (title, text, url) => {
        if (navigator.share) {
            try { await navigator.share({ title, text, url }); } catch (error) { console.log('Error', error); }
        } else {
            navigator.clipboard.writeText(url);
            alert("Enlace copiado: " + url);
        }
        document.getElementById('shareModal').style.display = 'none';
    };
    document.getElementById('btnShareAppVersion').onclick = () => shareContent('Auraflix App', 'Descarga Auraflix', 'https://auraflix.com/descarga');
    document.getElementById('btnShareWebVersion').onclick = () => shareContent('Auraflix Web', 'Mira Auraflix', 'https://auraflix.com');
    
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if(confirm("¿Cerrar sesión?")) { localStorage.clear(); location.reload(); }
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

window.addEventListener('popstate', (event) => {
    const modal = document.getElementById('videoModal');
    if (!event.state || !event.state.modal) {
        if (modal.style.display === 'flex') closeModalInternal(); 
        document.getElementById('termsModal').style.display = 'none';
        document.getElementById('settingsModal').style.display = 'none';
        document.getElementById('supportModal').style.display = 'none';
        document.getElementById('filterModal').style.display = 'none';
        document.getElementById('changeAvatarModal').style.display = 'none';
        document.getElementById('shareModal').style.display = 'none';
        document.getElementById('seasonSelectorModal').style.display = 'none'; 
    }
    if (!event.state || !event.state.search) document.getElementById('searchOverlay').style.display = 'none';
    if (!event.state || !event.state.history) document.getElementById('historyOverlay').style.display = 'none';
    if (event.state && event.state.view) switchView(event.state.view, false);
});
