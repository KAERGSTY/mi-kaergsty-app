const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs'); // Herramienta para leer/escribir archivos
const app = express();

app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
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

    try {
        // ¿Ya tenemos el tema guardado?
        if (temas[nombreAnime]) {
            try {
                // TRUCO: Intentamos "editar" el nombre al mismo nombre. 
                // Si el tema fue borrado, Telegram dará error y saltará al 'catch'.
                await bot.editForumTopic(chatId, temas[nombreAnime], { name: nombreAnime });
                
                const linkExistente = `https://t.me/c/${chatId.toString().replace("-100", "")}/${temas[nombreAnime]}`;
                return res.json({ success: true, link: linkExistente });
            } catch (error) {
                // Si llegamos aquí, es que el tema NO existe en Telegram.
                console.log(`El tema de ${nombreAnime} fue borrado. Creando uno nuevo...`);
                delete temas[nombreAnime]; // Lo borramos de nuestra memoria
            }
        }

        // Crear un nuevo tema si no existía o si fue borrado
        const topic = await bot.createForumTopic(chatId, nombreAnime);
        temas[nombreAnime] = topic.message_thread_id;

        // Guardar en el archivo para no olvidar
        fs.writeFileSync('./temas.json', JSON.stringify(temas, null, 2));

        const nuevoLink = `https://t.me/c/${chatId.toString().replace("-100", "")}/${topic.message_thread_id}`;
        res.json({ success: true, link: nuevoLink });

    } catch (error) {
        console.error("Error general:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor con memoria activo en puerto ${PORT}`));
