// --- CONFIGURACIÓN DE ENLACES Y CÓDIGOS VIP ---
const VIP_CONFIG = {
    // 1. Enlace del video tutorial (Embed)
    tutorialVideo: "https://dropload.pro/e/289c0csjj3bd", 

    // 2. Configuración por Días (7 Días)
    // El sistema busca la fecha de hoy. Si coincide, usa ese código y enlace.
    days: [
        {
            date: "2026-02-13", // DÍA 1 (Hoy según sistema)
            code: "402",
            link: "https://google.com/search?q=codigo_dia_1" 
        },
        {
            date: "2026-02-14", // DÍA 2
            code: "LOVE26",
            link: "https://google.com/search?q=codigo_dia_2"
        },
        {
            date: "2026-02-15", // DÍA 3
            code: "DOMINGO",
            link: "https://google.com/search?q=codigo_dia_3"
        },
        {
            date: "2026-02-16", // DÍA 4
            code: "LUNESVIP",
            link: "https://google.com/search?q=codigo_dia_4"
        },
        {
            date: "2026-02-17", // DÍA 5
            code: "MARTES2",
            link: "https://google.com/search?q=codigo_dia_5"
        },
        {
            date: "2026-02-18", // DÍA 6
            code: "MIERCOLES3",
            link: "https://google.com/search?q=codigo_dia_6"
        },
        {
            date: "2026-02-19", // DÍA 7
            code: "JUEVES4",
            link: "https://google.com/search?q=codigo_dia_7"
        }
    ],

    // 3. Configuración por Defecto (Seguridad)
    // Se usa si la fecha actual NO está en la lista de arriba.
    default: {
        code: "FALLBACK2026", 
        link: "https://google.com/search?q=codigo_por_defecto"
    }
};

// --- LÓGICA DEL SISTEMA (NO MODIFICAR ABAJO) ---

let vipInterval;

document.addEventListener('DOMContentLoaded', () => {
    setupVipEvents();
    checkVipTimerUI(); // Verificar estado al cargar la página
});

function setupVipEvents() {
    // 1. Botón "Ser VIP" en el perfil (Abre el modal)
    const btnBecome = document.getElementById('btnBecomeVip');
    if (btnBecome) {
        btnBecome.onclick = () => {
            document.getElementById('vipModal').style.display = 'flex';
        };
    }

    // 2. Botón Cerrar Modal VIP
    const btnCloseVip = document.getElementById('closeVipModal');
    if (btnCloseVip) btnCloseVip.onclick = () => document.getElementById('vipModal').style.display = 'none';

    // 3. Botón Tutorial (Abre modal de video)
    const btnTutorial = document.getElementById('btnVipTutorial');
    if (btnTutorial) {
        btnTutorial.onclick = () => {
            document.getElementById('vipModal').style.display = 'none'; // Ocultar VIP momentáneamente
            const container = document.getElementById('tutorialVideoContainer');
            if (container) {
                container.innerHTML = `<iframe src="${VIP_CONFIG.tutorialVideo}" allowfullscreen frameborder="0" style="width:100%; height:100%; position:absolute; top:0; left:0;"></iframe>`;
                document.getElementById('tutorialModal').style.display = 'flex';
            }
        };
    }

    // 4. Cerrar Tutorial
    const btnCloseTutorial = document.getElementById('closeTutorialBtn');
    if (btnCloseTutorial) {
        btnCloseTutorial.onclick = () => {
            document.getElementById('tutorialModal').style.display = 'none';
            const container = document.getElementById('tutorialVideoContainer');
            if(container) container.innerHTML = ''; // Limpiar video para que deje de sonar
            document.getElementById('vipModal').style.display = 'flex'; // Volver al modal VIP
        };
    }

    // 5. Botón Conseguir Código (Redirige al link correspondiente en navegador externo)
    const btnGetCode = document.getElementById('btnGetVipCode');
    if (btnGetCode) {
        btnGetCode.onclick = () => {
            const activeData = getActiveVipData();
            if (activeData && activeData.link) {
                // _blank fuerza a abrir en navegador externo en la mayoría de WebViews
                window.open(activeData.link, '_blank');
            } else {
                alert("Error: Enlace no configurado.");
            }
        };
    }

    // 6. Botón Activar VIP (Valida el código)
    const btnActivate = document.getElementById('activateVipBtn');
    if (btnActivate) {
        btnActivate.onclick = () => {
            const input = document.getElementById('vipCodeInput');
            const codeWritten = input.value.trim();
            const activeData = getActiveVipData();

            if (!codeWritten) {
                alert("Por favor escribe un código.");
                return;
            }

            // Normalización para comparar sin importar mayúsculas/minúsculas
            const inputClean = codeWritten.toLowerCase();
            const correctClean = activeData.code.toLowerCase();

            if (inputClean === correctClean) {
                activateVipMode();
                document.getElementById('vipModal').style.display = 'none';
                input.value = '';
                alert("¡Felicidades! Ahora eres VIP por 24 horas.");
            } else {
                alert("Código incorrecto para el día de hoy.");
            }
        };
    }
}

// Determina qué configuración usar según la fecha actual
function getActiveVipData() {
    // Obtiene fecha actual local en formato YYYY-MM-DD
    // Usamos toLocaleDateString('en-CA') que suele dar formato ISO local fiable
    const today = new Date().toLocaleDateString('en-CA'); 
    
    // Buscar si la fecha coincide con la lista
    const dayConfig = VIP_CONFIG.days.find(d => d.date === today);
    
    // Si encuentra, retorna el día específico. Si no, retorna el Default (Seguridad)
    return dayConfig ? dayConfig : VIP_CONFIG.default;
}

// Activa el modo VIP guardando la hora de expiración
function activateVipMode() {
    const now = new Date().getTime();
    const expiry = now + (24 * 60 * 60 * 1000); // 24 horas exactas en milisegundos
    localStorage.setItem('auraflixVipExpiry', expiry);
    checkVipTimerUI();
    
    // Si estamos en la vista de perfil, actualizamos el badge inmediatamente
    const badge = document.getElementById('profileBadge');
    if(badge) {
        badge.innerText = "Usuario VIP";
        badge.classList.add('vip-active');
    }
}

// Verifica si el usuario sigue siendo VIP
function isUserVip() {
    const expiry = localStorage.getItem('auraflixVipExpiry');
    if (!expiry) return false;
    
    const now = new Date().getTime();
    if (now < parseInt(expiry)) {
        return true; // Aún es válido
    } else {
        localStorage.removeItem('auraflixVipExpiry'); // Expiró
        return false;
    }
}

// Actualiza la interfaz del perfil (Botón vs Reloj vs Badge)
// Esta función se hace global (window.) para que script.js pueda llamarla
window.checkVipTimerUI = function() {
    const isVip = isUserVip();
    
    const btnBecome = document.getElementById('btnBecomeVip');
    const timerContainer = document.getElementById('vipTimerContainer');
    const badge = document.getElementById('profileBadge');

    if (isVip) {
        // --- ESTADO VIP ACTIVO ---
        if (btnBecome) btnBecome.style.display = 'none'; // Ocultar botón "Ser VIP"
        if (timerContainer) timerContainer.classList.remove('hidden'); // Mostrar Reloj
        
        if (badge) {
            badge.innerText = "Usuario VIP";
            badge.classList.add('vip-active');
        }

        startTimerInterval(); // Iniciar cuenta regresiva visual
    } else {
        // --- ESTADO NO VIP ---
        if (btnBecome) btnBecome.style.display = 'inline-block'; // Mostrar botón
        if (timerContainer) timerContainer.classList.add('hidden'); // Ocultar Reloj
        
        if (badge) {
            badge.innerText = "Miembro";
            badge.classList.remove('vip-active');
        }
        
        clearInterval(vipInterval);
    }
};

// Manejo del intervalo del reloj
function startTimerInterval() {
    clearInterval(vipInterval);
    updateTimerDisplay(); // Ejecutar una vez inmediatamente
    vipInterval = setInterval(updateTimerDisplay, 1000);
}

// Cálculo visual del tiempo restante
function updateTimerDisplay() {
    const expiry = localStorage.getItem('auraflixVipExpiry');
    if (!expiry) {
        window.checkVipTimerUI(); 
        return;
    }

    const now = new Date().getTime();
    const distance = parseInt(expiry) - now;

    if (distance < 0) {
        window.checkVipTimerUI(); // Se acabó el tiempo, resetear UI
        return;
    }

    // Matemáticas para formato HH:MM:SS
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const display = document.getElementById('vipTimerDisplay');
    if (display) {
        // Aseguramos que siempre tenga 2 dígitos (09:05:01)
        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');
        display.innerText = `${h}:${m}:${s}`;
    }
}


