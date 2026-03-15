const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs'); // Herramienta para leer/escribir archivos
const app = express();

app.use(cors());
app.use(express.json());

const BOT_TOKEN = '8667538688:AAFh_7MXmJpcUEYOMQejFHcd2fTHRTOP1Gs'; 
const GROUP_ID = '-1003769953279'; // ID de Rose confirmado
const DATABASE_FILE = 'temas.json';

// Función para leer los temas guardados
const leerBaseDatos = () => {
    if (!fs.existsSync(DATABASE_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATABASE_FILE));
};

// Función para guardar un tema nuevo
const guardarBaseDatos = (data) => {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(data, null, 2));
};

app.post('/crear-topic', async (req, res) => {
    const { nombreAnime } = req.body;
    let temas = leerBaseDatos();

    // SI EL ANIME YA EXISTE, NO CREAMOS NADA NUEVO
    if (temas[nombreAnime]) {
        console.log(`El tema para ${nombreAnime} ya existe. Enviando link guardado...`);
        return res.json({ success: true, link: temas[nombreAnime] });
    }

    try {
        console.log(`Creando tema nuevo para: ${nombreAnime}`);
        const response = await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/createForumTopic`, {
            chat_id: GROUP_ID,
            name: nombreAnime
        });

        if (response.data.ok) {
            const topicId = response.data.result.message_thread_id;
            const cleanId = GROUP_ID.replace('-100', '');
            const link = `https://t.me/c/${cleanId}/${topicId}`;

            // GUARDAMOS EN LA "MEMORIA"
            temas[nombreAnime] = link;
            guardarBaseDatos(temas);

            res.json({ success: true, link: link });
        }
    } catch (error) {
        console.error("Error de Telegram:", error.response ? error.response.data : error.message);
    res.status(500).json({ success: false });
    }

});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor con memoria activo en puerto ${PORT}`));