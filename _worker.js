import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
‎
‎const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
‎
‎function randomDNA(){ const c='ABCDEF0123456789'; return Array.from({length:12},()=>c[Math.floor(Math.random()*16)]).join(''); }
‎
‎export default {
‎  async fetch(request, env) {
‎    globalThis.SUPABASE_URL = env.SUPABASE_URL;
‎    globalThis.SUPABASE_KEY = env.SUPABASE_KEY;
‎    
‎    const url = new URL(request.url);
‎    
‎    // Telegram webhook
‎    if (url.pathname === '/webhook') {
‎      const update = await request.json();
‎      if (update.message?.text === '/start') {
‎        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,{
‎          method:'POST', headers:{'Content-Type':'application/json'},
‎          body: JSON.stringify({chat_id:update.message.chat.id, text:'Selamat datang! Buka Mini App untuk main.'})
‎        });
‎      }
‎      return new Response('ok');
‎    }
‎
‎    // API: init user
‎    if (url.pathname === '/api/init' && request.method === 'POST') {
‎      const {user_id, username} = await request.json();
‎      await supabase.from('users').upsert({user_id, username});
‎      const {count} = await supabase.from('hamsters').select('*',{count:'exact', head:true}).eq('owner_id',user_id);
‎      if (count === 0) {
‎        await supabase.from('hamsters').insert([{owner_id:user_id,dna:randomDNA()},{owner_id:user_id,dna:randomDNA()}]);
‎        for(let i=1;i<=9;i++) await supabase.from('plots').upsert({user_id,plot_id:i});
‎      }
‎      return Response.json({ok:true});
‎    }
‎
‎    // API: harvest
‎    if (url.pathname === '/api/harvest' && request.method === 'POST') {
‎      const {user_id} = await request.json();
‎      const {data:user} = await supabase.from('users').select('*').eq('user_id',user_id).single();
‎      const premium = new Date(user.premium_until) > new Date();
‎      const {data:plots} = await supabase.from('plots').select('*').eq('user_id',user_id).not('planted_at','is',null);
‎      let earned = 0;
‎      for(const p of plots){
‎        const diff = (Date.now() - new Date(p.planted_at))/1000;
‎        if(diff > (premium?120:240)){
‎          earned += premium?20:10;
‎          await supabase.from('plots').update({planted_at:null}).eq('user_id',user_id).eq('plot_id',p.plot_id);
‎        }
‎      }
‎      await supabase.from('users').update({coins:user.coins+earned, last_harvest:new Date()}).eq('user_id',user_id);
‎      return Response.json({earned, premium});
‎    }
‎
‎    return new Response('Hamster Farm API');
‎  }
‎}
