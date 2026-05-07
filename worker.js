export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/webhook') {
      const update = await request.json().catch(()=>({}));
      if (update.message?.text === '/start') {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({chat_id:update.message.chat.id, text:'Selamat datang! Bot hidup.'})
        });
      }
      return new Response('ok');
    }
    return new Response('Hamster Farm API');
  }
}
