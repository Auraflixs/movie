const VIP_CONFIG = {
    tutorialVideo: "https://dropload.pro/e/289c0csjj3bd", 
    days: [
        {
            date: "2026-02-13",
            code: "402",
            link: "https://google.com/search?q=codigo_dia_1" 
        },
        {
            date: "2026-02-14",
            code: "LOVE26",
            link: "https://google.com/search?q=codigo_dia_2"
        },
        {
            date: "2026-02-15",
            code: "DOMINGO",
            link: "https://google.com/search?q=codigo_dia_3"
        },
        {
            date: "2026-02-16",
            code: "LUNESVIP",
            link: "https://google.com/search?q=codigo_dia_4"
        },
        {
            date: "2026-02-17",
            code: "MARTES2",
            link: "https://google.com/search?q=codigo_dia_5"
        },
        {
            date: "2026-02-18",
            code: "MIERCOLES3",
            link: "https://google.com/search?q=codigo_dia_6"
        },
        {
            date: "2026-02-19",
            code: "JUEVES4",
            link: "https://google.com/search?q=codigo_dia_7"
        }
    ],
    default: {
        code: "FALLBACK2026", 
        link: "https://google.com/search?q=codigo_por_defecto"
    }
};

let vipInterval;

document.addEventListener('DOMContentLoaded', () => {
    setupVipEvents();
    checkVipTimerUI(); 
});

function setupVipEvents() {
    const btnBecome = document.getElementById('btnBecomeVip');
    if (btnBecome) {
        btnBecome.onclick = () => {
            document.getElementById('vipModal').style.display = 'flex';
        };
    }

    const btnCloseVip = document.getElementById('closeVipModal');
    if (btnCloseVip) btnCloseVip.onclick = () => document.getElementById('vipModal').style.display = 'none';

    const btnTutorial = document.getElementById('btnVipTutorial');
    if (btnTutorial) {
        btnTutorial.onclick = () => {
            document.getElementById('vipModal').style.display = 'none';
            const container = document.getElementById('tutorialVideoContainer');
            if (container) {
                const isVertical = VIP_CONFIG.tutorialVideo.includes('shorts') || VIP_CONFIG.tutorialVideo.includes('vertical');
                if (isVertical) {
                    container.classList.add('vertical');
                } else {
                    container.classList.remove('vertical');
                }

                container.innerHTML = `
                    <iframe 
                        src="${VIP_CONFIG.tutorialVideo}" 
                        allowfullscreen 
                        frameborder="0" 
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        style="width:100%; height:100%; position:absolute; top:0; left:0;">
                    </iframe>`;
                document.getElementById('tutorialModal').style.display = 'flex';
            }
        };
    }

    const btnCloseTutorial = document.getElementById('closeTutorialBtn');
    if (btnCloseTutorial) {
        btnCloseTutorial.onclick = () => {
            document.getElementById('tutorialModal').style.display = 'none';
            const container = document.getElementById('tutorialVideoContainer');
            if(container) container.innerHTML = ''; 
            document.getElementById('vipModal').style.display = 'flex'; 
        };
    }

    const btnGetCode = document.getElementById('btnGetVipCode');
    if (btnGetCode) {
        btnGetCode.onclick = () => {
            const activeData = getActiveVipData();
            if (activeData && activeData.link) {
                window.open(activeData.link, '_blank');
            } else {
                alert("Error: Enlace no configurado.");
            }
        };
    }

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

            const inputClean = codeWritten.toLowerCase();
            const correctClean = activeData.code.toLowerCase();

            if (inputClean === correctClean) {
                activateVipMode();
                document.getElementById('vipModal').style.display = 'none';
                input.value = '';
                alert("Felicidades! Ahora eres VIP por 12 horas.");
            } else {
                alert("Código incorrecto para el día de hoy.");
            }
        };
    }
}

function getActiveVipData() {
    const today = new Date().toLocaleDateString('en-CA'); 
    const dayConfig = VIP_CONFIG.days.find(d => d.date === today);
    return dayConfig ? dayConfig : VIP_CONFIG.default;
}

function activateVipMode() {
    const now = new Date().getTime();
    const expiry = now + (12 * 60 * 60 * 1000); 
    localStorage.setItem('auraflixVipExpiry', expiry);
    checkVipTimerUI();
    
    const badge = document.getElementById('profileBadge');
    if(badge) {
        badge.innerText = "Usuario VIP";
        badge.classList.add('vip-active');
    }
}

function isUserVip() {
    const expiry = localStorage.getItem('auraflixVipExpiry');
    if (!expiry) return false;
    
    const now = new Date().getTime();
    if (now < parseInt(expiry)) {
        return true; 
    } else {
        localStorage.removeItem('auraflixVipExpiry'); 
        return false;
    }
}

window.checkVipTimerUI = function() {
    const isVip = isUserVip();
    const btnBecome = document.getElementById('btnBecomeVip');
    const timerContainer = document.getElementById('vipTimerContainer');
    const badge = document.getElementById('profileBadge');

    if (isVip) {
        if (btnBecome) btnBecome.style.display = 'none'; 
        if (timerContainer) timerContainer.classList.remove('hidden'); 
        if (badge) {
            badge.innerText = "Usuario VIP";
            badge.classList.add('vip-active');
        }
        startTimerInterval(); 
    } else {
        if (btnBecome) btnBecome.style.display = 'inline-block'; 
        if (timerContainer) timerContainer.classList.add('hidden'); 
        if (badge) {
            badge.innerText = "Miembro";
            badge.classList.remove('vip-active');
        }
        clearInterval(vipInterval);
    }
};

function startTimerInterval() {
    clearInterval(vipInterval);
    updateTimerDisplay(); 
    vipInterval = setInterval(updateTimerDisplay, 1000);
}

function updateTimerDisplay() {
    const expiry = localStorage.getItem('auraflixVipExpiry');
    if (!expiry) {
        window.checkVipTimerUI(); 
        return;
    }

    const now = new Date().getTime();
    const distance = parseInt(expiry) - now;

    if (distance < 0) {
        window.checkVipTimerUI(); 
        return;
    }

    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    const display = document.getElementById('vipTimerDisplay');
    if (display) {
        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');
        display.innerText = `${h}:${m}:${s}`;
    }
}

