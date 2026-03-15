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
// Asegúrate de que estas variables estén fuera del app.post
const bloqueos = new Set();

app.post('/crear-topic', async (req, res) => {
    const { nombreAnime } = req.body;

    if (!nombreAnime) return res.status(400).json({ success: false });

    // 1. BLOQUEO INMEDIATO (Anti-clic rápido)
    if (bloqueos.has(nombreAnime)) {
        console.log(`Bloqueado por spam: ${nombreAnime}`);
        return res.status(429).json({ success: false, error: "Espera un momento..." });
    }
    bloqueos.add(nombreAnime);

    try {
        // 2. LEER BASE DE DATOS (Forzamos lectura fresca)
        let temas = leerBaseDatos(); 

        // 3. VERIFICACIÓN DOBLE
        if (temas[nombreAnime]) {
            const threadId = temas[nombreAnime];
            const linkExistente = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${threadId}`;
            
            // Intentamos verificar si el tema existe editándolo
            try {
                await axios.post(`${TELEGRAM_API}/editForumTopic`, {
                    chat_id: GROUP_ID,
                    message_thread_id: threadId,
                    name: nombreAnime
                });
                bloqueos.delete(nombreAnime);
                return res.json({ success: true, link: linkExistente });
            } catch (e) {
                // Si da error, el tema no existe en Telegram, seguimos para crear uno nuevo
                console.log("Tema en JSON pero no en Telegram. Recreando...");
            }
        }

        // 4. CREACIÓN EN TELEGRAM
        const response = await axios.post(`${TELEGRAM_API}/createForumTopic`, {
            chat_id: GROUP_ID,
            name: nombreAnime
        });

        if (response.data && response.data.result) {
            const nuevoThreadId = response.data.result.message_thread_id;
            
            // 5. ACTUALIZAR MEMORIA Y ARCHIVO AL INSTANTE
            temas[nombreAnime] = nuevoThreadId;
            guardarBaseDatos(temas); // Asegúrate que esta función use fs.writeFileSync

            const nuevoLink = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${nuevoThreadId}`;
            
            bloqueos.delete(nombreAnime);
            return res.json({ success: true, link: nuevoLink });
        }

    } catch (error) {
        console.error("Error crítico:", error.response?.data || error.message);
        bloqueos.delete(nombreAnime);
        res.status(500).json({ success: false, error: "Error de conexión" });
    }
});