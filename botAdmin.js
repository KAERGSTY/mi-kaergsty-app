const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf');

// Configuración de llaves (Usa tus variables de entorno en Render)
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('¡Panel Kaergsty Activo!\n\nComandos:\n1. /subir (Crear anime)\n2. /temp (Añadir temporada/links)\n3. /nombres (Añadir nombres alternativos)'));

// 1. CREAR ANIME (EL CASCARÓN)
bot.command('subir', async (ctx) => {
    const texto = ctx.message.text.replace('/subir ', '');
    const partes = texto.split('|').map(p => p.trim());

    if (partes.length < 6) {
        return ctx.reply('❌ Usa: /subir Nombre | Sinopsis | Portada | Estado | Carpeta | Géneros');
    }

    const [nombre, sinopsis, portada, estado, carpeta, generosStr] = partes;
    const generosArray = generosStr.split(',').map(g => g.trim());

    const { error } = await supabase
        .from('AKnime')
        .insert([{ 
            nombre, 
            sinopsis, 
            portada, 
            estado, 
            carpeta, 
            generos: generosArray,
            temporadas_data: [] 
        }]);

    if (error) return ctx.reply('❌ Error: ' + error.message);
    ctx.reply(`✅ ¡${nombre} creado! Ahora usa /temp para añadir los capítulos.`);
});

// 2. AÑADIR TEMPORADA E IDIOMAS
bot.command('temp', async (ctx) => {
    const texto = ctx.message.text.replace('/temp ', '');
    const partes = texto.split('|').map(p => p.trim());

    if (partes.length < 4) {
        return ctx.reply('❌ Usa: /temp NombreAnime | NombreTemporada | URL_Imagen_Temp | Idioma1:Link1, Idioma2:Link2');
    }

    const [animeBusqueda, nombreTemp, imgTemp, linksStr] = partes;

    // Convertir linksStr (Idioma:Link, Idioma:Link) a objeto JS
    const enlacesObj = {};
    linksStr.split(',').forEach(par => {
        const [idioma, url] = par.split(':').map(i => i.trim());
        if(idioma && url) enlacesObj[idioma] = url;
    });

    // 1. Buscar el anime actual
    const { data: anime, error: errFetch } = await supabase
        .from('AKnime')
        .select('*')
        .eq('nombre', animeBusqueda)
        .single();

    if (errFetch || !anime) return ctx.reply('❌ No encontré el anime: ' + animeBusqueda);

    // 2. Actualizar el array de temporadas
    const nuevasTemporadas = anime.temporadas_data || [];
    nuevasTemporadas.push({
        nombre: nombreTemp,
        imagen: imgTemp,
        enlaces: enlacesObj
    });

    const { error: errUpd } = await supabase
        .from('AKnime')
        .update({ temporadas_data: nuevasTemporadas })
        .eq('id', anime.id);

    if (errUpd) return ctx.reply('❌ Error al actualizar: ' + errUpd.message);
    ctx.reply(`✅ Temporada "${nombreTemp}" añadida a ${animeBusqueda} con sus idiomas.`);
});

// 3. AÑADIR NOMBRES ALTERNATIVOS
bot.command('nombres', async (ctx) => {
    const texto = ctx.message.text.replace('/nombres ', '');
    const partes = texto.split('|').map(p => p.trim());

    if (partes.length < 2) {
        return ctx.reply('❌ Usa: /nombres NombreAnime | Japones:Texto, Ingles:Texto');
    }

    const [animeBusqueda, nombresStr] = partes;
    const nombresObj = {};
    nombresStr.split(',').forEach(par => {
        const [idioma, valor] = par.split(':').map(i => i.trim());
        if(idioma && valor) nombresObj[idioma] = valor;
    });

    const { error } = await supabase
        .from('AKnime')
        .update({ nombresAlternativos: nombresObj })
        .eq('nombre', animeBusqueda);

    if (error) return ctx.reply('❌ Error: ' + error.message);
    ctx.reply(`✅ Nombres alternativos actualizados para ${animeBusqueda}.`);
});

bot.command('respaldo', async (ctx) => {
    const { data, error } = await supabase.from('AKnime').select('*');
    if (error) return ctx.reply('❌ Error: ' + error.message);
    const contenidoJS = `const animesTodo = ${JSON.stringify(data, null, 2)};`;
    ctx.replyWithDocument({ source: Buffer.from(contenidoJS), filename: 'animeTODO.js' });
});

bot.launch();