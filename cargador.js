const archivosSoportados = [
    "bqdp.js",
    "perfil.js",
    "p/peli3.js",
    "s/serie3.js",
    "p/peli5.js",
    "p/peli1.js",
    "p/peli2.js",
    "p/peli4.js",
    "s/serie2.js",
    "p/peli6.js",
    "p/peli7.js",
    "s/serie4.js",
    "p/peli8.js",
    "p/peli9.js",
    "s/serie1.js",
    "p/peli10.js",
    "p/peli11.js",
    "p/peli12.js",
    "p/peli13.js",
    "p/peli14.js",
    "p/peli15.js",
    "p/peli16.js",
    "p/peli17.js",
    "p/peli18.js",
    "p/peli19.js",
    "p/peli20.js",
    "p/peli21.js",
    "s/serie5.js",
    "p/peli22.js",
    "p/peli23.js",
    "s/serie6.js",
    "id.js"
];

function cargarScripts() {
    archivosSoportados.forEach(archivo => {
        const script = document.createElement('script');
        script.src = archivo;
        script.async = false;
        document.body.appendChild(script);
    });

    const mainScript = document.createElement('script');
    mainScript.src = "script.js";
    mainScript.async = false;
    document.body.appendChild(mainScript);
}

cargarScripts();


