const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf');

// Configuración de llaves
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => ctx.reply('¡Panel Kaergsty Activo! Usa /subir para añadir contenido.'));

// Comando para subir animes
bot.command('subir', async (ctx) => {
    const texto = ctx.message.text.replace('/subir ', '');
    const partes = texto.split('|').map(p => p.trim());

    if (partes.length < 6) {
        return ctx.reply('❌ Formato incorrecto. Usa:\n/subir Nombre | Sinopsis | Portada | Estado | Carpeta | Género1, Género2');
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

    if (error) return ctx.reply('❌ Error al guardar: ' + error.message);
    ctx.reply(`✅ ¡${nombre} ha sido agregado al catálogo exitosamente!`);
});

// NUEVO: Comando para descargar tus datos en formato JS
bot.command('respaldo', async (ctx) => {
    const { data, error } = await supabase.from('AKnime').select('*');
    if (error) return ctx.reply('❌ Error al respaldar: ' + error.message);

    const contenidoJS = `const animesTodo = ${JSON.stringify(data, null, 2)};`;
    
    // El bot te envía un archivo real listo para descargar y guardar en tu PC
    const buffer = Buffer.from(contenidoJS, 'utf-8');
    ctx.replyWithDocument({ source: buffer, filename: 'animeTODO.js' }, { caption: '✅ Aquí tienes tu archivo de respaldo.' });
});

bot.launch();
console.log("Bot Administrador Kaergsty funcionando...");