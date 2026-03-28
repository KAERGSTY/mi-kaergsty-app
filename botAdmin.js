const { createClient } = require('@supabase/supabase-js');
const { Telegraf, Markup } = require('telegraf'); // Importamos Markup para botones
const express = require('express');

// --- CONFIGURACIÓN (Variables de Entorno obligatorias en Render) ---
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || !process.env.BOT_TOKEN) {
    console.error("❌ ERROR CRÍTICO: Faltan variables de entorno (SUPABASE_URL, SUPABASE_KEY o BOT_TOKEN).");
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- SERVIDOR DE VIDA PARA RENDER ---
const app = express();
app.get('/', (req, res) => res.send('Bot AnimeKaergsty Admin está Vivo! ✅'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de soporte activo en puerto ${PORT}`));

// --- AYUDAS VISUALES (Plantillas) ---
const plantillaNuevo = `/nuevo
Nombre: Naruto
Estado: Finalizado
Generos: Accion, Ninja, Aventura
Sinopsis: La historia de un ninja naranja que quiere ser presidente...`;

const plantillaNombres = `/nombres Nombre Exacto Anime | Japones: ナルト, Ingles: Naruto`;

// --- BLOQUE 1: INICIO Y AYUDA ---

bot.start((ctx) => {
    const mensaje = `
⚙️ **Panel Administrativo AKaergsty** ⚙️

¡Bienvenido! Usa estos comandos para gestionar tu catálogo:

1. **/formato** - Muestra las plantillas para copiar y pegar.
2. **/nuevo** - Crea un anime (sin nombres alternos ni temporadas).
3. **/nombres** - **(SOLUCIÓN)** Añade/Actualiza Nombres Japoneses/Ingleses.
4. **/temp** - Añade una temporada con su portada y links.
5. **/editar** - Corrige campos rápidos (estado, sinopsis, géneros).
6. **/borrar** - Elimina un anime permanentemente.

_Pro-Tip: Asegúrate de que el nombre del anime sea EXACTO al editar o añadir temporadas._
`;
    ctx.replyWithMarkdown(mensaje);
});

bot.command('formato', (ctx) => {
    ctx.reply(`📋 **Plantilla Crear:**\n\n${plantillaNuevo}`);
    ctx.reply(`📋 **Plantilla Nombres (Fix):**\n\n${plantillaNombres}`);
});


// --- BLOQUE 2: CREACIÓN Y ESTRUCTURA (Fase 1 y 2) ---

// 1. /nuevo - Crea la base del anime
bot.command('nuevo', async (ctx) => {
    const texto = ctx.message.text.replace('/nuevo\n', '').replace('/nuevo ', '').trim();
    
    try {
        const nombreMatch = texto.match(/Nombre:\s*(.+)/i);
        const estadoMatch = texto.match(/Estado:\s*(.+)/i);
        const generosMatch = texto.match(/Generos:\s*(.+)/i);
        const sinopsisMatch = texto.match(/Sinopsis:\s*([\s\S]+)/i);

        if (!nombreMatch || !estadoMatch || !sinopsisMatch) {
            return ctx.replyWithMarkdown('❌ Faltan datos obligatorios. Usa `/formato` para ver la plantilla.');
        }

        const nombre = nombreMatch[1].trim();
        const estado = estadoMatch[1].trim();
        const sinopsis = sinopsisMatch[1].trim();
        const generos = generosMatch ? generosMatch[1].split(',').map(g => g.trim()) : [];

        const { error } = await supabase.from('AKnime').insert([{
            nombre,
            estado,
            sinopsis,
            generos,
            temporadas_data: [] // Inicializamos vacío para evitar errores en HTML
        }]);

        if (error) throw error;
        ctx.reply(`✅ Base de "${nombre}" creada. Ahora usa /nombres y /temp.`);

    } catch (error) {
        ctx.reply('❌ Error al crear: ' + error.message);
    }
});

// 2. /nombres - (LA SOLUCIÓN AL PROBLEMA VISUAL)
// Convierte el texto "Japones: x, Ingles: y" en el objeto JSON que necesita el index.html
bot.command('nombres', async (ctx) => {
    const texto = ctx.message.text.replace('/nombres ', '');
    const partes = texto.split('|').map(p => p.trim());
    
    if (partes.length < 2) return ctx.replyWithMarkdown('❌ Uso: `/nombres Nombre Anime | Idioma1: Valor, Idioma2: Valor`');

    const [nombreAnime, datosNombres] = partes;
    const nombresObj = {};

    // Procesamos el texto para crear el objeto JSON técnico
    datosNombres.split(',').forEach(p => {
        const indexSeparador = p.indexOf(':');
        if (indexSeparador > -1) {
            const idi = p.slice(0, indexSeparador).trim();
            const val = p.slice(indexSeparador + 1).trim();
            if(idi && val) nombresObj[idi] = val;
        }
    });

    if (Object.keys(nombresObj).length === 0) {
        return ctx.reply('❌ No pude procesar los nombres. Asegúrate de usar el formato "Idioma: Valor".');
    }

    try {
        const { error } = await supabase
            .from('AKnime')
            .update({ nombresAlternativos: nombresObj }) // Subimos el objeto estructurado
            .eq('nombre', nombreAnime);

        if (error) throw error;
        ctx.reply(`✅ Nombres alternativos actualizados para "${nombreAnime}". ¡Ya deberían verse en la Miniapp!`);

    } catch (error) {
        ctx.reply('❌ Error al actualizar nombres: ' + error.message);
    }
});

// 3. /temp - Añade temporadas
bot.command('temp', async (ctx) => {
    const texto = ctx.message.text.replace('/temp ', '');
    const partes = texto.split('|').map(p => p.trim());
    
    if (partes.length < 4) return ctx.replyWithMarkdown('❌ Uso:\n`/temp Nombre Anime | Temporada X | Imagen (nombre.webp o URL) | Latino: link, Subtitulado: link`');

    const [nombreAnime, nTemp, img, links] = partes;
    const linksObj = {};
    
    // Procesamiento inteligente de links (maneja https:// con dos puntos)
    links.split(',').forEach(p => {
        const indexSeparador = p.indexOf(':');
        if (indexSeparador > -1) {
            const idi = p.slice(0, indexSeparador).trim();
            const url = p.slice(indexSeparador + 1).trim();
            if(idi && url) linksObj[idi] = url;
        }
    });

    try {
        // Obtenemos los datos actuales
        const { data: anime, error: errorBusqueda } = await supabase
            .from('AKnime')
            .select('id, temporadas_data')
            .eq('nombre', nombreAnime)
            .single();
        
        if (errorBusqueda || !anime) return ctx.reply('❌ No se encontró ese anime.');

        // Añadimos la nueva temporada
        const temps = anime.temporadas_data || [];
        temps.push({ nombre: nTemp, imagen: img, enlaces: linksObj });

        // Actualizamos
        const { error: errorUpdate } = await supabase
            .from('AKnime')
            .update({ temporadas_data: temps })
            .eq('id', anime.id);
        
        if (errorUpdate) throw errorUpdate;
        ctx.reply(`✅ Temporada "${nTemp}" añadida a "${nombreAnime}".`);

    } catch (error) {
        ctx.reply('❌ Error: ' + error.message);
    }
});


// --- BLOQUE 3: EDICIÓN Y MANTENIMIENTO ---

// 4. /editar - Correcciones rápidas con "alias" intuitivos
bot.command('editar', async (ctx) => {
    const texto = ctx.message.text.replace('/editar ', '');
    const partes = texto.split('|').map(p => p.trim());
    
    if (partes.length < 3) return ctx.replyWithMarkdown('❌ Uso: `/editar Nombre Anime | campo | nuevo_valor`');

    let [nombreAnime, campo, valorBruto] = partes;
    campo = campo.toLowerCase();
    let valorFinal = valorBruto;

    // ALIAS INTUITIVOS: Traducimos lo que escribe el usuario al nombre técnico de la columna
    if (campo === 'géneros' || campo === 'generos' || campo === 'tags') campo = 'generos';
    if (campo === 'portada' || campo === 'imagen') campo = 'portada';
    if (campo === 'sinopsis' || campo === 'historia') campo = 'sinopsis';
    if (campo === 'estado' || campo === 'status') campo = 'estado';

    // Bloqueo de nombres alternativos en /editar para forzar el uso de /nombres (el fix)
    if (campo === 'nombres' || campo === 'nombresalternativos') {
        return ctx.reply('⚠️ Para editar nombres alternativos, usa el comando exclusivo: /nombres');
    }

    // Tratamiento especial para géneros (convertir texto en Array)
    if (campo === 'generos') {
        valorFinal = valorBruto.split(',').map(g => g.trim());
    }

    try {
        const { error } = await supabase.from('AKnime').update({ [campo]: valorFinal }).eq('nombre', nombreAnime);
        if (error) throw error;
        ctx.reply(`✅ Campo "${campo}" actualizado para "${nombreAnime}".`);
    } catch (error) {
        ctx.reply('❌ Error al editar: ' + error.message);
    }
});


// --- BLOQUE 4: ELIMINACIÓN (NUEVO) ---

// 5. /borrar - Sistema seguro ID -> Confirmación
bot.command('borrar', async (ctx) => {
    const nombreAnime = ctx.message.text.replace('/borrar ', '').trim();

    if (!nombreAnime || nombreAnime === '/borrar') {
        return ctx.replyWithMarkdown('❌ Indica el nombre exacto. Uso: `/borrar Nombre Anime`');
    }

    try {
        // Primero verificamos si existe y obtenemos su ID para el botón
        const { data: anime, error: errorBusqueda } = await supabase
            .from('AKnime')
            .select('id, nombre')
            .eq('nombre', nombreAnime)
            .single();

        if (errorBusqueda || !anime) {
            return ctx.reply(`❌ No se encontró "${nombreAnime}" en la base de datos.`);
        }

        // Creamos un botón de confirmación ligado al ID para seguridad
        const tecladoConfirmacion = Markup.inlineKeyboard([
            Markup.button.callback('🗑️ SÍ, BORRAR DEFINITIVAMENTE', `confirmar_borrado:${anime.id}`),
            Markup.button.callback('❌ Cancelar', 'cancelar_borrado')
        ]);

        ctx.reply(`⚠️ **CONFIRMACIÓN REQUERIDA** ⚠️\n\n¿Estás seguro de que quieres eliminar "${anime.nombre}"? Esta acción no se puede deshacer y desaparecerá de la Miniapp inmediatamente.`, {
            parse_mode: 'Markdown',
            ...tecladoConfirmacion
        });

    } catch (error) {
        ctx.reply('❌ Error al intentar borrar: ' + error.message);
    }
});

// Acción del botón Cancelar
bot.action('cancelar_borrado', (ctx) => {
    ctx.editMessageText('❌ Borrado cancelado. El anime sigue en el catálogo.');
});

// Acción del botón Confirmar (Maneja el borrado real)
bot.action(/^confirmar_borrado:(.+)$/, async (ctx) => {
    const idAnime = ctx.match[1]; // Obtenemos el ID del callback

    try {
        // Primero obtenemos el nombre para el mensaje final (opcional pero intuitivo)
        const { data: anime } = await supabase.from('AKnime').select('nombre').eq('id', idAnime).single();

        // Ejecutamos el borrado
        const { error: errorBorrado } = await supabase
            .from('AKnime')
            .delete()
            .eq('id', idAnime);

        if (errorBorrado) throw errorBorrado;

        ctx.editMessageText(`🗑️ El anime "${anime ? anime.nombre : 'seleccionado'}" ha sido eliminado definitivamente.`);
        
    } catch (error) {
        ctx.reply('❌ Error técnico al borrar: ' + error.message);
    }
});


// --- ARRANQUE Y HERRAMIENTAS DE SISTEMA ---

bot.launch();
console.log("🚀 Bot Administrativo AKaergsty online y esperando comandos.");

// Manejo de paradas limpias (para Render)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));