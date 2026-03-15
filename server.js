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

    // 1. VERIFICAR EN BASE DE DATOS PRIMERO (antes del bloqueo)
    let temas = leerBaseDatos();

    if (temas[nombreAnime]) {
        const threadId = temas[nombreAnime];
        const linkExistente = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${threadId}`;
        return res.json({ success: true, link: linkExistente });
    }

    // 2. BLOQUEO ANTI-SPAM: Si ya se está procesando este anime, ignorar
    if (bloqueos.has(nombreAnime)) {
        // Esperar hasta que el otro proceso termine y devolver el resultado
        let intentos = 0;
        while (bloqueos.has(nombreAnime) && intentos < 20) {
            await new Promise(resolve => setTimeout(resolve, 300));
            intentos++;
        }
        // Después de esperar, leer el resultado ya guardado
        temas = leerBaseDatos();
        if (temas[nombreAnime]) {
            const threadId = temas[nombreAnime];
            const link = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${threadId}`;
            return res.json({ success: true, link: link });
        }
        return res.status(429).json({ success: false, error: "Intenta de nuevo" });
    }

    bloqueos.add(nombreAnime);

    try {
        // 3. VOLVER A VERIFICAR después de obtener el bloqueo (double-check)
        temas = leerBaseDatos();
        if (temas[nombreAnime]) {
            const threadId = temas[nombreAnime];
            const linkExistente = `https://t.me/c/${GROUP_ID.replace("-100", "")}/${threadId}`;
            bloqueos.delete(nombreAnime);
            return res.json({ success: true, link: linkExistente });
        }

        // 4. CREAR TEMA NUEVO
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