const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN
const BOT_TOKEN = process.env.BOT_TOKEN;
const GROUP_ID = '-1003769953279'; 
const DATABASE_FILE = 'temas.json';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Sistema Anti-Spam en memoria
const bloqueos = new Set();

// Funciones de Base de Datos
const leerBaseDatos = () => {
    if (!fs.existsSync(DATABASE_FILE)) {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify({}));
        return {};
    }
    try {
        return JSON.parse(fs.readFileSync(DATABASE_FILE, 'utf-8'));
    } catch (e) {
        return {};
    }
};

const guardarBaseDatos = (data) => {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
};

app.post('/crear-topic', async (req, res) => {
    const { nombreAnime } = req.body;

    if (!nombreAnime) return res.status(400).json({ success: false, error: "Falta nombre" });

    // 1. BLOQUEO ANTI-SPAM: Si ya se está procesando este anime, ignorar
    if (bloqueos.has(nombreAnime)) {
        return res.status(429).json({ success: false, error: "Ya se está creando, espera..." });
    }
    bloqueos.add(nombreAnime);

    try {
        let temas = leerBaseDatos(); // Cargamos los datos guardados

        // 2. DETECTAR SI YA EXISTE
        if (temas[nombreAnime]) {
            const threadId = temas[nombreAnime];
            try {
                // Verificamos si el tema sigue existiendo en Telegram
                await axios.post(`${TELEGRAM_API}/editForumTopic`, {
                    chat_id: GROUP_ID,
                    message_thread_id: threadId,
                    name: nombreAnime
                });
                
                const linkExistente = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${threadId}`;
                bloqueos.delete(nombreAnime);
                return res.json({ success: true, link: linkExistente });
            } catch (error) {
                // Si da error 400 es que el tema fue borrado en Telegram
                console.log("Tema no encontrado en Telegram, creando uno nuevo...");
                delete temas[nombreAnime];
            }
        }

        // 3. CREAR TEMA NUEVO (Si no existía o fue borrado)
        const response = await axios.post(`${TELEGRAM_API}/createForumTopic`, {
            chat_id: GROUP_ID,
            name: nombreAnime
        });

        if (response.data && response.data.result) {
            const nuevoThreadId = response.data.result.message_thread_id;
            
            // Guardar inmediatamente en el JSON
            temas[nombreAnime] = nuevoThreadId;
            guardarBaseDatos(temas);

            const nuevoLink = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${nuevoThreadId}`;
            bloqueos.delete(nombreAnime);
            return res.json({ success: true, link: nuevoLink });
        }

    } catch (error) {
        console.error("Error crítico:", error.response?.data || error.message);
        bloqueos.delete(nombreAnime);
        res.status(500).json({ success: false, error: "Error en el servidor" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));