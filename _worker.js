import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export default {
  async fetch(request, env) {
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);
    const url = new URL(request.url);
    
    if (url.pathname === '/webhook') {
      const update = await request.json().catch(()=>({}));
      if (update.message?.text === '/start') {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({chat_id:update.message.chat.id, text:'Selamat datang! Buka Mini App untuk main.'})
        });
      }
      return new Response('ok');
    }
    return new Response('Hamster Farm API');
  }
}
