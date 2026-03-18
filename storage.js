const tg = window.Telegram.WebApp;
const cloud = tg.CloudStorage;

// 1. Función principal del botón
function toggleVisto(animeId) {
    if (!animeId) return;

    cloud.getItem('vistos_anime', (err, value) => {
        let vistos = value ? JSON.parse(value) : [];
        const index = vistos.indexOf(animeId);

        if (index === -1) {
            vistos.push(animeId);
            console.log(`Marcado: ${animeId}`);
        } else {
            vistos.splice(index, 1);
            console.log(`Quitado: ${animeId}`);
        }

        cloud.setItem('vistos_anime', JSON.stringify(vistos), (err, success) => {
            if (success) {
                actualizarUIBoton(vistos.includes(animeId));
            }
        });
    });
}

// 2. Función para chequear el estado al abrir el anime
function chequearEstadoVisto(animeId) {
    cloud.getItem('vistos_anime', (err, value) => {
        const vistos = value ? JSON.parse(value) : [];
        actualizarUIBoton(vistos.includes(animeId));
    });
}

// 3. Función que cambia el diseño del botón
function actualizarUIBoton(estaVisto) {
    const btn = document.getElementById('btn-visto-nube');
    if (btn) {
        if (estaVisto) {
            btn.classList.add('visto-activo');
            btn.innerHTML = '✅ Anime Visto';
        } else {
            btn.classList.remove('visto-activo');
            btn.innerHTML = '👁️ Marcar como visto';
        }
    }
}