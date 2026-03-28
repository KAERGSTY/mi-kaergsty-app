const { createClient } = require('@supabase/supabase-js');
const { Telegraf } = require('telegraf');
const express = require('express'); // Añadimos esto para que Render no lo apague

// Configuración
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Telegraf(process.env.BOT_TOKEN);

// --- SERVIDOR PARA RENDER (Soporte Vital) ---
const app = express();
app.get('/', (req, res) => res.send('Bot Kaergsty está Vivo! ✅'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor de vida activo en puerto ${PORT}`));

// --- COMANDOS DEL BOT ---
bot.start((ctx) => ctx.reply('¡Panel Kaergsty Activo!\n\n1. /subir (Crear)\n2. /temp (Temporadas/Idiomas)\n3. /editar (Corregir)\n4. /nombres (Nombres alternos)'));

// COMANDO EDITAR (Para tu portada)
bot.command('editar', async (ctx) => {
    const texto = ctx.message.text.replace('/editar ', '');
    const partes = texto.split('|').map(p => p.trim());
    if (partes.length < 3) return ctx.reply('❌ Usa: /editar Nombre | campo | nuevo_valor');

    const [nombre, campo, valor] = partes;
    const { error } = await supabase.from('AKnime').update({ [campo]: valor }).eq('nombre', nombre);

    if (error) return ctx.reply('❌ Error: ' + error.message);
    ctx.reply(`✅ Actualizado: ${campo} de ${nombre}.`);
});

// COMANDO NOMBRES
bot.command('nombres', async (ctx) => {
    const texto = ctx.message.text.replace('/nombres ', '');
    const partes = texto.split('|').map(p => p.trim());
    if (partes.length < 2) return ctx.reply('❌ Usa: /nombres Nombre | Japones:..., Ingles:... ');

    const [nombre, nombresStr] = partes;
    const nombresObj = {};
    nombresStr.split(',').forEach(p => {
        const [k, v] = p.split(':').map(i => i.trim());
        if(k && v) nombresObj[k] = v;
    });

    const { error } = await supabase.from('AKnime').update({ nombresAlternativos: nombresObj }).eq('nombre', nombre);
    if (error) return ctx.reply('❌ Error: ' + error.message);
    ctx.reply(`✅ Nombres actualizados para ${nombre}.`);
});

// COMANDO TEMPORADAS
bot.command('temp', async (ctx) => {
    const texto = ctx.message.text.replace('/temp ', '');
    const partes = texto.split('|').map(p => p.trim());
    if (partes.length < 4) return ctx.reply('❌ Usa: /temp Nombre | TempX | Imagen | Idioma:Link');

    const [nombre, nTemp, img, links] = partes;
    const linksObj = {};
    links.split(',').forEach(p => {
        const [idi, url] = p.split(':').map(i => i.trim());
        if(idi && url) linksObj[idi] = url;
    });

    const { data: anime } = await supabase.from('AKnime').select('*').eq('nombre', nombre).single();
    if (!anime) return ctx.reply('❌ No existe ese anime.');

    const temps = anime.temporadas_data || [];
    temps.push({ nombre: nTemp, imagen: img, enlaces: linksObj });

    const { error } = await supabase.from('AKnime').update({ temporadas_data: temps }).eq('id', anime.id);
    if (error) return ctx.reply('❌ Error: ' + error.message);
    ctx.reply(`✅ Temporada añadida a ${nombre}.`);
});

bot.launch();
console.log("Bot arrancado...");