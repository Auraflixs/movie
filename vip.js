const VIP_CONFIG = {
    tutorialVideo: "https://www.youtube.com/embed/TU_ID_DE_VIDEO", 


    days: [
        {
            date: "2026-1-25",
            code: "A2008",
            link: "https://direct-link.net/3053707/9vmp7JlZpW15"
        },
        {
            date: "2025-10-25", // Cambia esto a la fecha del Día 2
            code: "CODIGO_DIA_2",
            link: "ENLACE_PARA_CONSEGUIR_CODIGO_2"
        },
        {
            date: "2025-10-26", // Cambia esto a la fecha del Día 3
            code: "CODIGO_DIA_3",
            link: "ENLACE_PARA_CONSEGUIR_CODIGO_3"
        }
    ],

    // Código por defecto si la fecha de hoy no coincide con ninguna de arriba
    default: {
        code: "AURA2025",
        link: "https://google.com"
    }
};

// --- LÓGICA DEL SISTEMA ---

let vipInterval;

document.addEventListener('DOMContentLoaded', () => {
    setupVipEvents();
    checkVipTimerUI(); // Verificar estado al cargar
});

function setupVipEvents() {
    // Botón "Ser VIP" en el perfil
    const btnBecome = document.getElementById('btnBecomeVip');
    if (btnBecome) {
        btnBecome.onclick = () => {
            document.getElementById('vipModal').style.display = 'flex';
        };
    }

    // Botón Cerrar Modal VIP
    const btnCloseVip = document.getElementById('closeVipModal');
    if (btnCloseVip) btnCloseVip.onclick = () => document.getElementById('vipModal').style.display = 'none';

    // Botón Tutorial
    const btnTutorial = document.getElementById('btnVipTutorial');
    if (btnTutorial) {
        btnTutorial.onclick = () => {
            const container = document.getElementById('tutorialVideoContainer');
            container.innerHTML = `<iframe src="${VIP_CONFIG.tutorialVideo}" allowfullscreen frameborder="0" style="width:100%; height:100%; position:absolute; top:0; left:0;"></iframe>`;
            document.getElementById('tutorialModal').style.display = 'flex';
        };
    }

    // Cerrar Tutorial
    const btnCloseTutorial = document.getElementById('closeTutorialBtn');
    if (btnCloseTutorial) {
        btnCloseTutorial.onclick = () => {
            document.getElementById('tutorialModal').style.display = 'none';
            document.getElementById('tutorialVideoContainer').innerHTML = ''; // Limpiar video
        };
    }

    // Botón Conseguir Código
    const btnGetCode = document.getElementById('btnGetVipCode');
    if (btnGetCode) {
        btnGetCode.onclick = () => {
            const activeData = getActiveVipData();
            window.open(activeData.link, '_blank');
        };
    }

    // Botón Activar VIP
    const btnActivate = document.getElementById('activateVipBtn');
    if (btnActivate) {
        btnActivate.onclick = () => {
            const input = document.getElementById('vipCodeInput');
            const code = input.value.trim();
            const activeData = getActiveVipData();

            // Compara el código escrito con el código del día (o el default)
            // Se usa normalizeText (definido en script.js) si está disponible, sino comparación directa
            const normalizedInput = typeof normalizeText === 'function' ? normalizeText(code) : code.toLowerCase();
            const normalizedCorrect = typeof normalizeText === 'function' ? normalizeText(activeData.code) : activeData.code.toLowerCase();

            if (normalizedInput === normalizedCorrect) {
                activateVipMode();
                document.getElementById('vipModal').style.display = 'none';
                input.value = '';
                alert("¡Código correcto! Eres VIP por 24 horas.");
            } else {
                alert("Código incorrecto. Inténtalo de nuevo.");
            }
        };
    }
}

// Obtiene los datos (código y link) correspondientes al día de hoy
function getActiveVipData() {
    const today = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const dayConfig = VIP_CONFIG.days.find(d => d.date === today);
    return dayConfig ? dayConfig : VIP_CONFIG.default;
}

function activateVipMode() {
    const now = new Date().getTime();
    const expiry = now + (24 * 60 * 60 * 1000); // 24 horas en milisegundos
    localStorage.setItem('auraflixVipExpiry', expiry);
    checkVipTimerUI();
    
    // Si hay un modal de video abierto bloqueado, recargarlo podría ser buena idea,
    // pero el usuario probablemente navegará desde el perfil.
}

function isUserVip() {
    const expiry = localStorage.getItem('auraflixVipExpiry');
    if (!expiry) return false;
    
    const now = new Date().getTime();
    if (now < parseInt(expiry)) {
        return true;
    } else {
        localStorage.removeItem('auraflixVipExpiry'); // Expiró
        return false;
    }
}

function checkVipTimerUI() {
    const isVip = isUserVip();
    const btnBecome = document.getElementById('btnBecomeVip');
    const timerContainer = document.getElementById('vipTimerContainer');
    const badge = document.getElementById('profileBadge');

    if (isVip) {
        // UI VIP ACTIVO
        if (btnBecome) btnBecome.style.display = 'none';
        if (timerContainer) timerContainer.classList.remove('hidden');
        
        if (badge) {
            badge.innerText = "VIP";
            badge.classList.add('vip-active');
        }

        startTimerInterval();
    } else {
        // UI NO VIP
        if (btnBecome) btnBecome.style.display = 'inline-block';
        if (timerContainer) timerContainer.classList.add('hidden');
        
        if (badge) {
            badge.innerText = "Miembro";
            badge.classList.remove('vip-active');
        }
        
        clearInterval(vipInterval);
    }
}

function startTimerInterval() {
    clearInterval(vipInterval);
    updateTimerDisplay(); // Ejecutar inmediatamente
    vipInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    const expiry = localStorage.getItem('auraflixVipExpiry');
    if (!expiry) {
        checkVipTimerUI();
        return;
    }

    const now = new Date().getTime();
    const distance = parseInt(expiry) - now;

    if (distance < 0) {
        checkVipTimerUI(); // Se acabó el tiempo
        return;
    }

    // Cálculos de horas, minutos y segundos
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const display = document.getElementById('vipTimerDisplay');
    if (display) {
        display.innerText = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}