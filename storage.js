// No declaramos 'tg' aquí para evitar que la app se rompa por duplicados.
// Usamos directamente el 'tg' que ya definiste en tu index.html.

// 1. Función principal para marcar/desmarcar
function toggleVisto(animeId) {
    if (!animeId) return;

    // Verificamos si CloudStorage está disponible (evita errores fuera de Telegram)
    if (!window.tg || !window.tg.CloudStorage) {
        console.warn("CloudStorage no disponible.");
        return;
    }

    const cloud = window.tg.CloudStorage;

    cloud.getItem('vistos_anime', (err, value) => {
        let vistos = value ? JSON.parse(value) : [];
        const index = vistos.indexOf(animeId);

        if (index === -1) {
            vistos.push(animeId);
        } else {
            vistos.splice(index, 1);
        }

        cloud.setItem('vistos_anime', JSON.stringify(vistos), (err, success) => {
            if (success) {
                actualizarUIBoton(vistos.includes(animeId));
            }
        });
    });
}

// 2. Función para chequear el estado al abrir el detalle del anime
function chequearEstadoVisto(animeId) {
    if (!window.tg || !window.tg.CloudStorage) return;

    window.tg.CloudStorage.getItem('vistos_anime', (err, value) => {
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