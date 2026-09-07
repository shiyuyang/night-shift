// @ts-ignore Node-side LDtk exporter
import {exportMaps} from './scripts/export-maps.mjs';
import { defineConfig } from 'vite';
// @ts-ignore shared runtime module is also tested directly by Node
import { validateEvent, createGate } from './server/events.mjs';
import type { ServerResponse } from 'node:http';
export default defineConfig({
  base: process.env.GAME_BASE_PATH || "/",
  plugins: [{name:'cdn-css',enforce:'pre',transform(code,id){
    const base=process.env.VITE_ASSET_BASE_URL?.replace(/\/$/,'');
    if(base&&id.endsWith('.css'))return code.replace(/url\((['"]?)\/(assets|fonts)\/([^)'"\s]+)\1\)/g,(_match,quote,folder,file)=>`url(${quote}${base}/${folder}/${file}${quote})`);
  }},{name:'ldtk-content',buildStart(){exportMaps();},configureServer(server){let files=exportMaps();server.watcher.add(files);server.watcher.on('change',changed=>{if(files.includes(changed)){try{files=exportMaps();server.watcher.add(files);}catch(error){server.ws.send({type:'error',err:{message:String(error),stack:''}});}}});}}, {name:'local-webhook', configureServer(server) {
    const clients = new Set<ServerResponse>(); const gate = createGate();
    server.middlewares.use('/api/events', (req,res) => {
      if(req.method !== 'GET') { res.writeHead(405).end(); return; }
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
      res.write(': connected\n\n'); clients.add(res);
      const heartbeat = setInterval(()=>res.write(': heartbeat\n\n'),20000);
      req.on('close',()=>{clearInterval(heartbeat);clients.delete(res);});
    });
    server.middlewares.use('/api/webhook', (req,res)=>{
      res.setHeader('Content-Type','application/json');
      if(req.method !== 'POST') {res.writeHead(405).end('{"error":"POST required"}');return;}
      if(process.env.WEBHOOK_TOKEN && req.headers.authorization !== `Bearer ${process.env.WEBHOOK_TOKEN}`) {res.writeHead(401).end('{"error":"Unauthorized"}');return;}
      let body = ''; let oversized = false;
      req.on('data',chunk=>{if(oversized)return;body+=chunk;if(Buffer.byteLength(body)>4096){oversized=true;res.writeHead(413).end('{"error":"Too large"}');}});
      req.on('end',()=>{if(oversized)return;try{
        const event = validateEvent(JSON.parse(body)); const status = gate(event);
        if(status==='limited'){res.writeHead(429).end('{"error":"Rate limited"}');return;}
        if(status==='accepted') for(const client of clients) client.write(`data: ${JSON.stringify(event)}\n\n`);
        res.end(JSON.stringify({status}));
      }catch{res.writeHead(400).end('{"error":"Invalid event"}');}});
    });
  }}],
  build:{rollupOptions:{output:{manualChunks:{phaser:['phaser']}}}}
});
