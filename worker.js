export default {
 async fetch(request, env) {
  try {
    const url = new URL(request.url);
    if (url.pathname !== '/webhook') return new Response('ok');

    const update = await request.json();
    const msg = update?.message;
    const chatId = msg?.chat?.id;
    const text = msg?.text || '';

    if (!chatId) return new Response('ok');

    // tes env
    if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
      throw new Error('SUPABASE_URL atau KEY belum ada');
    }

    const sbUrl = env.SUPABASE_URL + '/rest/v1/users?select=count';
    const r = await fetch(sbUrl, { headers: { apikey: env.SUPABASE_KEY, Authorization: 'Bearer '+env.SUPABASE_KEY }});
    if (!r.ok) throw new Error('Supabase error '+r.status+': '+(await r.text()).slice(0,100));

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id: chatId, text: '✅ Worker hidup! Supabase konek. Ketik /farm lagi.'})
    });
  } catch(e) {
    // kirim error ke Telegram
    try {
      const chatId = (await request.clone().json())?.message?.chat?.id;
      if (chatId) await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({chat_id: chatId, text: '❌ ERROR: '+e.message})
      });
    } catch {}
  }
  return new Response('ok');
 }
}
