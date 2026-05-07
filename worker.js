export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname!== '/webhook') return new Response('Hamster Farm API');

    const update = await request.json().catch(()=>null);
    const msg = update?.message;
    if (!msg?.text) return new Response('ok');

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username || msg.from.first_name;
    const text = msg.text.trim();
    const [cmd,...args] = text.split(' ');

    const sb = {
      url: env.SUPABASE_URL,
      key: env.SUPABASE_KEY,
      async q(path, opts={}) {
        const r = await fetch(`${this.url}/rest/v1/${path}`, {
         ...opts,
          headers: { apikey: this.key, Authorization: `Bearer ${this.key}`, 'Content-Type':'application/json', Prefer:'return=representation',...(opts.headers||{}) }
        });
        return r.ok? r.json() : null;
      }
    };

    // pastikan user ada
    let user = (await sb.q(`users?telegram_id=eq.${userId}`))?.[0];
    if (!user) {
      user = (await sb.q('users', { method:'POST', body: JSON.stringify({telegram_id:userId, username}) }))?.[0];
      // kasih 2 hamster starter
      await sb.q('hamsters', { method:'POST', body: JSON.stringify([
        {owner_id:userId, name:'Hammy', rarity:'common'},
        {owner_id:userId, name:'Nibbles', rarity:'common'}
      ])});
    }

    let reply = '';

    if (cmd === '/start') {
      reply = `🐹 Selamat datang di Hamster Farm!\n\nKoin: ${user.coins}\n\nPerintah:\n/farm - lihat farm\n/harvest - panen koin\n/breed <id1> <id2> - kawinkan\n/help - bantuan`;
    }
    else if (cmd === '/farm') {
      const hams = await sb.q(`hamsters?owner_id=eq.${userId}&select=id,name,rarity,level&order=id.asc`);
      reply = `💰 Koin: ${user.coins}\n🐹 Hamster kamu (${hams.length}):\n` + hams.map(h=>`#${h.id} ${h.name} [${h.rarity}] Lv${h.level}`).join('\n');
    }
    else if (cmd === '/harvest') {
      const hams = await sb.q(`hamsters?owner_id=eq.${userId}`);
      const earned = hams.length * 10;
      const newCoins = user.coins + earned;
      await sb.q(`users?telegram_id=eq.${userId}`, { method:'PATCH', body: JSON.stringify({coins:newCoins, last_harvest:new Date().toISOString()}) });
      reply = `✅ Panen! +${earned} koin dari ${hams.length} hamster.\nTotal: ${newCoins}`;
    }
    else if (cmd === '/breed') {
      const [id1, id2] = args.map(Number);
      if (!id1 ||!id2) { reply = 'Cara: /breed 1 2'; }
      else {
        const p1 = (await sb.q(`hamsters?id=eq.${id1}&owner_id=eq.${userId}`))?.[0];
        const p2 = (await sb.q(`hamsters?id=eq.${id2}&owner_id=eq.${userId}`))?.[0];
        if (!p1 ||!p2) reply = 'Hamster tidak ditemukan.';
        else if (user.coins < 20) reply = 'Butuh 20 koin untuk breed.';
        else {
          const success = Math.random() < 0.7;
          await sb.q(`users?telegram_id=eq.${userId}`, { method:'PATCH', body: JSON.stringify({coins:user.coins-20}) });
          if (!success) reply = '💔 Breed gagal, coba lagi!';
          else {
            const rarities = ['common','common','common','uncommon','rare'];
            const rarity = rarities[Math.floor(Math.random()*rarities.length)];
            const child = (await sb.q('hamsters', { method:'POST', body: JSON.stringify({owner_id:userId, name:`Baby${Date.now()%1000}`, rarity, parent1:id1, parent2:id2}) }))?.[0];
            reply = `🎉 Berhasil! Anak #${child.id} lahir!\nInduk: #${id1} + #${id2}\nRarity: ${rarity}`;
          }
        }
      }
    }
    else if (cmd === '/help') {
      reply = '/start, /farm, /harvest, /breed <id1> <id2>';
    }
    else reply = 'Perintah tidak dikenal. /help';

    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({chat_id: chatId, text: reply})
    });

    return new Response('ok');
  }
        }
