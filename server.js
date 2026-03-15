const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// Configuraciones (Asegúrate de tener tu BOT_TOKEN en las variables de entorno)
const BOT_TOKEN = process.env.BOT_TOKEN; 
const GROUP_ID = '-1003769953279'; 
const DATABASE_FILE = 'temas.json';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Candado en memoria para evitar SPAM por múltiples clics
const creandoTema = new Set();

// Función para leer los temas guardados
const leerBaseDatos = () => {
    if (!fs.existsSync(DATABASE_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf-8'));
};

// Función para guardar un tema nuevo
const guardarBaseDatos = (data) => {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
};
// Usamos solo 'bloqueos' para ser consistentes
const bloqueos = new Set();

app.post('/crear-topic', async (req, res) => {
    const { nombreAnime } = req.body;

    if (!nombreAnime) {
        return res.status(400).json({ success: false, error: "Falta el nombre del anime" });
    }

    // 1. ANTI-SPAM: Verificamos si ya hay una petición en curso para este anime
    if (bloqueos.has(nombreAnime)) {
        return res.status(429).json({ 
            success: false, 
            error: "Procesando... por favor espera un momento.",
            isSpam: true
        });
    }

    // Bloqueamos el nombre del anime inmediatamente
    bloqueos.add(nombreAnime);

    try {
        let temas = leerBaseDatos(); // Cargamos la base de datos actualizada

        // 2. EVITAR COPIAS: ¿Ya tenemos el tema guardado en el JSON?
        if (temas[nombreAnime]) {
            try {
                // Verificamos si el tema sigue vivo en Telegram intentando "editarlo"
                await axios.post(`${TELEGRAM_API}/editForumTopic`, {
                    chat_id: GROUP_ID,
                    message_thread_id: temas[nombreAnime],
                    name: nombreAnime
                });
                
                const linkExistente = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${temas[nombreAnime]}`;
                
                bloqueos.delete(nombreAnime); // Liberamos el candado
                return res.json({ success: true, link: linkExistente });

            } catch (error) {
                // Si falla, es que el tema fue borrado manualmente en Telegram
                console.log(`El tema de ${nombreAnime} no existe en Telegram. Recreando...`);
                delete temas[nombreAnime]; 
            }
        }

        // 3. CREACIÓN: Si no existe, pedimos a Telegram que cree el nuevo tema
        const response = await axios.post(`${TELEGRAM_API}/createForumTopic`, {
            chat_id: GROUP_ID,
            name: nombreAnime
        });

        const threadId = response.data.result.message_thread_id;

        // Guardamos en el archivo JSON antes de responder
        temas[nombreAnime] = threadId;
        guardarBaseDatos(temas);

        const nuevoLink = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${threadId}`;
        
        bloqueos.delete(nombreAnime); // Liberamos el candado
        res.json({ success: true, link: nuevoLink });

    } catch (error) {
        bloqueos.delete(nombreAnime); // Liberamos el candado si algo sale mal
        
        const mensajeError = error.response?.data?.description || error.message;
        console.error("Error en Telegram:", mensajeError);
        res.status(500).json({ success: false, error: mensajeError });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));