let continueWatching = JSON.parse(localStorage.getItem('continueWatching')) || [];
let myFavorites = JSON.parse(localStorage.getItem('myFavorites')) || [];

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
let currentUser = JSON.parse(localStorage.getItem('auraflixUser')) || null;
let selectedAvatarTemp = null; 
const GALLERY_BTN_ID = "gallery-upload-btn-id";

document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus();
    window.history.replaceState({ view: 'home', modal: false, search: false, history: false }, '');
    
    document.getElementById('customAvatarInput').addEventListener('change', handleImageUpload);
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

function renderAvatarSelection(containerId, context) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';
    
    if (typeof profileImages !== 'undefined') {
        profileImages.forEach((url, index) => {
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
    addBtn.onclick = () => {
        document.getElementById('customAvatarInput').click();
    };
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

document.getElementById('closeAvatarModal').addEventListener('click', () => {
    document.getElementById('changeAvatarModal').style.display = 'none';
});

document.getElementById('confirmAvatarChange').addEventListener('click', () => {
    if(!selectedAvatarTemp) {
        alert("Selecciona una imagen primero.");
        return;
    }
    updateUserProfile(selectedAvatarTemp);
    document.getElementById('changeAvatarModal').style.display = 'none';
});

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

document.getElementById('btnSupport').onclick = () => {
    document.getElementById('supportModal').style.display = 'flex';
};
document.getElementById('closeSupportBtn').onclick = () => {
    document.getElementById('supportModal').style.display = 'none';
};

document.getElementById('btnBroadcast').onclick = () => {
    window.open('https://t.me/Auraflixpeli', '_blank');
};

document.getElementById('btnTerms').onclick = () => {
    document.getElementById('termsModal').style.display = 'flex';
};
document.getElementById('closeTermsBtn').onclick = () => {
    document.getElementById('termsModal').style.display = 'none';
};

document.getElementById('btnSettings').onclick = () => {
    document.getElementById('settingsModal').style.display = 'flex';
};
document.getElementById('closeSettingsBtn').onclick = () => {
    document.getElementById('settingsModal').style.display = 'none';
};

document.getElementById('btnCache').onclick = () => {
    if(confirm("¿Borrar historial y favoritos guardados?")) {
        localStorage.removeItem('continueWatching');
        localStorage.removeItem('myFavorites');
        continueWatching = [];
        myFavorites = [];
        renderMyList();
        alert("Caché borrada.");
        document.getElementById('settingsModal').style.display = 'none';
    }
};

document.getElementById('btnShare').onclick = () => {
    const link = "xxxLinkxxx";
    if (navigator.share) {
        navigator.share({
            title: 'Auraflix',
            text: 'Mira películas y series increíbles.',
            url: link,
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(link).then(() => {
            alert("Link copiado: " + link);
        });
    }
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    if(confirm("¿Cerrar sesión y borrar todos los datos?")) {
        localStorage.clear();
        location.reload();
    }
});


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

window.addEventListener('popstate', (event) => {
    const modal = document.getElementById('videoModal');
    const searchOverlay = document.getElementById('searchOverlay');
    const historyOverlay = document.getElementById('historyOverlay');
    const termsModal = document.getElementById('termsModal');
    const settingsModal = document.getElementById('settingsModal');
    const supportModal = document.getElementById('supportModal');
    
    if (!event.state || !event.state.modal) {
        if (modal.style.display === 'flex') closeModalInternal(); 
        if (termsModal.style.display === 'flex') termsModal.style.display = 'none';
        if (settingsModal.style.display === 'flex') settingsModal.style.display = 'none';
        if (supportModal.style.display === 'flex') supportModal.style.display = 'none';
    }
    if (!event.state || !event.state.search) {
         if (searchOverlay.style.display === 'block') searchOverlay.style.display = 'none';
    }
    if (!event.state || !event.state.history) {
        if (historyOverlay.style.display === 'block') historyOverlay.style.display = 'none';
   }
    if (event.state && event.state.view) {
        currentView = event.state.view;
        switchView(currentView, false); 
    }
});

function initApp() {
    renderHomeView();
    if (window.allContentSequence && window.allContentSequence.length > 0) {
        const strictOrderList = [...window.allContentSequence].reverse();
        renderList('newlyAddedRow', strictOrderList.slice(0, 20));
    } else {
        const allContent = [...moviesListInternal, ...seriesListInternal];
        renderList('newlyAddedRow', allContent.reverse().slice(0, 20));
    }
    setupHero(); 
    setupEventListeners();
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
    if (featuredList.length === 0) {
        const allFeatured = allContent.filter(i => i.featured);
        featuredList = allFeatured.length > 0 ? allFeatured.slice(0, 5) : allContent.slice(0, 5);
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
    const moviesShuffled = [...moviesListInternal];
    const seriesShuffled = [...seriesListInternal];
    shuffleArray(moviesShuffled);
    shuffleArray(seriesShuffled);
    renderMultiRow('homeMoviesRow', moviesShuffled.slice(0, 30));
    renderMultiRow('homeSeriesRow', seriesShuffled.slice(0, 30));
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
    if (viewName === 'profile') {
        headerIcons.classList.add('hidden-header-icons');
    } else {
        headerIcons.classList.remove('hidden-header-icons');
    }

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

    if (pushToHistory) {
        window.history.pushState({ view: viewName, modal: false }, '');
    }
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

function openModal(id, type) {
    document.getElementById('searchOverlay').style.display = 'none';
    document.getElementById('historyOverlay').style.display = 'none';

    if (!document.body.classList.contains('modal-open')) {
        window.history.pushState({ view: currentView, modal: true }, '');
    }

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
    const favBtn = document.getElementById('modalFavBtn');

    document.body.classList.add('modal-open');
    document.querySelector('.modal-content').scrollTop = 0;

    titleEl.innerText = item.title;
    document.getElementById('modalYear').innerText = item.year;
    
    // MODIFICACION: Usar genero en vez de Tipo, y borrar el tipo
    document.getElementById('modalGenres').innerText = item.genre || 'Género no disponible';

    descEl.innerText = item.info;

    const isFav = myFavorites.some(i => String(i.id) === String(item.id));
    if(isFav) favBtn.classList.add('active');
    else favBtn.classList.remove('active');

    favBtn.onclick = toggleFavorite;
    
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
    if (continueWatching.length > 20) continueWatching.pop();
    localStorage.setItem('continueWatching', JSON.stringify(continueWatching));
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
    document.getElementById('nav-profile').onclick = (e) => { e.preventDefault(); switchView('profile'); };
    
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

    document.getElementById('closeModal').addEventListener('click', () => window.history.back());
    document.getElementById('closeSearch').onclick = () => window.history.back();
    document.getElementById('closeHistory').onclick = () => window.history.back();

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
