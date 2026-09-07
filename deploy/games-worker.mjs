/** Static files are served first. Legacy URLs redirect entirely at the edge. */
export default {
  fetch(request) {
    const url=new URL(request.url);
    const legacy='/games/night-shift';
    if(url.hostname==='api.liveinteractivegame.com' && (url.pathname===legacy||url.pathname.startsWith(legacy+'/'))){
      const suffix=url.pathname.slice(legacy.length);
      return new Response(null,{status:308,headers:{Location:'https://games.liveinteractivegame.com/night-shift'+(suffix||'/')+url.search,'Cache-Control':'public, max-age=300','X-Night-Shift-Hosting':'cloudflare-redirect'}});
    }
    // The route wildcard also matches unrelated suffixes such as night-shift-2.
    // Preserve their original origin routing; actual Night Shift paths return above.
    if(url.hostname==='api.liveinteractivegame.com')return fetch(request);
    return new Response('Not found',{status:404,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }
};
