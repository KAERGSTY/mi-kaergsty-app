// 1. Función principal para marcar/desmarcar
function toggleVisto(animeId) {
    if (!animeId) {
        console.error("No se detectó ningún anime seleccionado.");
        return;
    }

    // Llamamos a Telegram directamente para evitar errores de conexión
    const webApp = window.Telegram.WebApp;
    if (!webApp || !webApp.CloudStorage) {
        console.warn("CloudStorage no disponible (¿Estás fuera de Telegram?).");
        return;
    }

    const cloud = webApp.CloudStorage;

    cloud.getItem('vistos_anime', (err, value) => {
        let vistos = value ? JSON.parse(value) : [];
        const index = vistos.indexOf(animeId);

        if (index === -1) {
            vistos.push(animeId); // Lo añade a la lista
        } else {
            vistos.splice(index, 1); // Lo quita de la lista
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
    const webApp = window.Telegram.WebApp;
    if (!webApp || !webApp.CloudStorage) return;

    webApp.CloudStorage.getItem('vistos_anime', (err, value) => {
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
            btn.innerHTML = '<img src="image_972702.jpg" class="logo-visto"> <span>✅ Visto</span>';
        } else {
            btn.classList.remove('visto-activo');
            btn.innerHTML = '<img src="image_972702.jpg" class="logo-visto"> <span>Marcar como visto</span>';
        }
    }
}