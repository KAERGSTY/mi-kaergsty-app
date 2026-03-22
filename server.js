const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// CONFIGURACIÓN
app.get('/keep-alive', (req, res) => {
    console.log("Ping recibido: El servidor sigue despierto.");
    res.status(200).send('OK');
});

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

    if (!nombreAnime) {
        return res.status(400).json({ success: false, error: "Nombre del anime requerido" });
    }

    // 1. VERIFICAR si ya existe en la base de datos
    let temas = leerBaseDatos();
    if (temas[nombreAnime]) {
        const threadId = temas[nombreAnime];
        // CAMBIO: Ahora usa el enlace público del grupo
        const linkExistente = `https://t.me/ComentariosKaergsty/${threadId}`;
        return res.json({ success: true, link: linkExistente });
    }

    // 2. BLOQUEO para evitar creaciones duplicadas simultáneas
    if (bloqueos.has(nombreAnime)) {
        return res.status(429).json({ success: false, error: "Creación en progreso, intenta de nuevo." });
    }
    bloqueos.add(nombreAnime);

    try {
        // 3. VOLVER A VERIFICAR después de obtener el bloqueo (double-check)
        temas = leerBaseDatos();
        if (temas[nombreAnime]) {
            const threadId = temas[nombreAnime];
            // CAMBIO: Ahora usa el enlace público del grupo
            const linkExistente = `https://t.me/ComentariosKaergsty/${threadId}`;
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

            // CAMBIO: Ahora usa el enlace público del grupo
            const nuevoLink = `https://t.me/ComentariosKaergsty/${nuevoThreadId}`;
            bloqueos.delete(nombreAnime);
            return res.json({ success: true, link: nuevoLink });
        }

    } catch (error) {
        console.error("Error crítico:", error.response?.data || error.message);
        bloqueos.delete(nombreAnime);
        return res.status(500).json({ success: false, error: "No se pudo crear el tema." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
