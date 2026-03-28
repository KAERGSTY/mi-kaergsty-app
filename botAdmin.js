const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf');
const express = require('express');

// Configuración de variables de entorno
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- SERVIDOR PARA RENDER (Soporte Vital) ---
const app = express();
app.get('/', (req, res) => res.send('Bot AnimeKaergsty está Vivo! ✅'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de vida activo en puerto ${PORT}`));

// --- COMANDOS DEL BOT ---
bot.start((ctx) => {
    const mensaje = `
¡Panel Administrativo Activo! ⚙️

Comandos disponibles:
1. /nuevo - Registra un anime completo.
2. /temp - Añade una temporada y sus enlaces.
3. /editar - Corrige un dato específico.
4. /formato - Muestra la plantilla para crear un anime.
    `;
    ctx.reply(mensaje);
});

// 1. COMANDO FORMATO (Ayuda visual)
bot.command('formato', (ctx) => {
    const plantilla = `/nuevo
Nombre: Universo Anime
Estado: En emisión
Generos: Accion, Aventura, Fantasia
Nombres: Japones: Anime Universe, Ingles: Anime Universe
Sinopsis: Aquí va toda la historia del anime...`;
    ctx.reply(`Copia esta plantilla, llénala y envíala:\n\n${plantilla}`);
});

// 2. COMANDO NUEVO (Crear un anime desde cero)
bot.command('nuevo', async (ctx) => {
    const texto = ctx.message.text.replace('/nuevo\n', '').trim();
    
    try {
        // Extraer los datos usando expresiones regulares para mayor seguridad
        const nombreMatch = texto.match(/Nombre:\s*(.+)/i);
        const estadoMatch = texto.match(/Estado:\s*(.+)/i);
        const generosMatch = texto.match(/Generos:\s*(.+)/i);
        const nombresMatch = texto.match(/Nombres:\s*(.+)/i);
        const sinopsisMatch = texto.match(/Sinopsis:\s*([\s\S]+)/i);

        if (!nombreMatch || !estadoMatch || !sinopsisMatch) {
            return ctx.reply('❌ Faltan datos obligatorios. Usa /formato para ver la plantilla.');
        }

        const nombre = nombreMatch[1].trim();
        const estado = estadoMatch[1].trim(); // En emisión, Finalizado, Pausado
        const sinopsis = sinopsisMatch[1].trim();
        
        // Procesar Géneros (Convertir a Array)
        const generos = generosMatch ? generosMatch[1].split(',').map(g => g.trim()) : [];

        // Procesar Nombres Alternativos (Convertir a Objeto JSON)
        const nombresObj = {};
        if (nombresMatch) {
            nombresMatch[1].split(',').forEach(p => {
                const [k, v] = p.split(':').map(i => i.trim());
                if (k && v) nombresObj[k] = v;
            });
        }

        // Insertar en Supabase
        const { error } = await supabase.from('AKnime').insert([{
            nombre,
            estado,
            sinopsis,
            generos,
            nombresAlternativos: nombresObj,
            temporadas_data: [] // Inicia vacío, se llena con /temp
        }]);

        if (error) throw error;
        ctx.reply(`✅ Anime "${nombre}" registrado exitosamente en el catálogo.`);

    } catch (error) {
        ctx.reply('❌ Error al registrar: ' + error.message);
    }
});

// 3. COMANDO TEMPORADAS
bot.command('temp', async (ctx) => {
    const texto = ctx.message.text.replace('/temp ', '');
    const partes = texto.split('|').map(p => p.trim());
    
    // Uso: /temp Nombre Anime | Temporada 1 | url_imagen.jpg | Latino: link1, Subtitulado: link2
    if (partes.length < 4) return ctx.reply('❌ Usa el formato:\n/temp Nombre | TempX | URL_Imagen | Idioma1: Link1, Idioma2: Link2');

    const [nombre, nTemp, img, links] = partes;
    
    // Construir el objeto de enlaces
    const linksObj = {};
    links.split(',').forEach(p => {
        const indexSeparador = p.indexOf(':'); // Usamos indexOf por si el link tiene "https://"
        if (indexSeparador > -1) {
            const idi = p.slice(0, indexSeparador).trim();
            const url = p.slice(indexSeparador + 1).trim();
            if(idi && url) linksObj[idi] = url;
        }
    });

    try {
        // Buscar el anime actual
        const { data: anime, error: errorBusqueda } = await supabase.from('AKnime').select('*').eq('nombre', nombre).single();
        
        if (errorBusqueda || !anime) return ctx.reply('❌ No existe ese anime en la base de datos.');

        const temps = anime.temporadas_data || [];
        temps.push({ nombre: nTemp, imagen: img, enlaces: linksObj });

        // Actualizar Supabase
        const { error: errorUpdate } = await supabase.from('AKnime').update({ temporadas_data: temps }).eq('id', anime.id);
        
        if (errorUpdate) throw errorUpdate;
        ctx.reply(`✅ "${nTemp}" añadida correctamente a ${nombre}.`);

    } catch (error) {
        ctx.reply('❌ Error: ' + error.message);
    }
});

// 4. COMANDO EDITAR (Corregir errores rápidos)
bot.command('editar', async (ctx) => {
    const texto = ctx.message.text.replace('/editar ', '');
    const partes = texto.split('|').map(p => p.trim());
    
    // Uso: /editar Nombre | campo | nuevo_valor
    if (partes.length < 3) return ctx.reply('❌ Usa: /editar Nombre | campo | nuevo_valor');

    const [nombre, campo, valorBruto] = partes;
    let valorFinal = valorBruto;

    // Si se editan los géneros, hay que convertirlos de texto a un Array
    if (campo.toLowerCase() === 'generos') {
        valorFinal = valorBruto.split(',').map(g => g.trim());
    }

    try {
        const { error } = await supabase.from('AKnime').update({ [campo]: valorFinal }).eq('nombre', nombre);
        if (error) throw error;
        ctx.reply(`✅ Campo "${campo}" actualizado para ${nombre}.`);
    } catch (error) {
        ctx.reply('❌ Error al editar: ' + error.message);
    }
});

bot.launch();
console.log("Bot arrancado y esperando comandos...");

// Permite detener el bot de forma limpia si Render reinicia el servidor
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));