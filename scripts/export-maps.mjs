import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import Ajv from 'ajv';
const root=new URL('../',import.meta.url),read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
export function exportMaps(){
 const registry=read('game/levels.json'),schema=read('schemas/ldtk-1.5.3.json');schema.$schema='http://json-schema.org/draft-07/schema#';const validate=new Ajv({strict:false,allErrors:true}).compile(schema);
 const catalog=registry.map(config=>{
  const source=read(config.source);if(!validate(source))throw Error(config.source+': '+JSON.stringify(validate.errors));
  const level=source.levels.find(l=>l.identifier===config.level);if(!level?.layerInstances)throw Error(config.source+' requires embedded layers');
  const entities=level.layerInstances.flatMap(l=>{if(l.__type!=='Entities')throw Error('Unsupported layer type '+l.__type);return l.entityInstances.map(e=>({id:e.__identifier,x:e.px[0]+l.__pxTotalOffsetX-e.__pivot[0]*e.width,y:e.px[1]+l.__pxTotalOffsetY-e.__pivot[1]*e.height,width:e.width,height:e.height}));});
  const map={...config,width:level.pxWid,height:level.pxHei,entities,events:read(config.events)};write('game/maps/'+config.id+'.json',map);return map;
 });write('game/maps/catalog.json',catalog);
 const modules=read('game/generation/module-registry.json'),rooms=modules.flatMap(config=>{const source=read(config.source);if(!validate(source))throw Error(config.source+': '+JSON.stringify(validate.errors));return source.levels.map(level=>({id:level.identifier,theme:config.theme,source:config.source,props:level.layerInstances.flatMap(layer=>layer.entityInstances.map(e=>{if(!['Bed','Crate','Machine'].includes(e.__identifier))throw Error('Unsupported room prop');if(e.px[0]<0||e.px[1]<0||e.px[0]+e.width>level.pxWid||e.px[1]+e.height>level.pxHei)throw Error('Room prop out of bounds');return [e.px[0],e.px[1],e.width,e.height];}))}));});write('game/generation/rooms.json',rooms);

 return ['game/generation/module-registry.json',...modules.map(m=>m.source),'game/levels.json',...registry.flatMap(c=>[c.source,c.events])].map(p=>fileURLToPath(new URL(p,root)));
}
function write(path,value){const data=JSON.stringify(value,null,2)+'\n',target=new URL(path,root);let old='';try{old=readFileSync(target,'utf8');}catch{}if(old!==data)writeFileSync(target,data);}
if(process.argv[1]===fileURLToPath(import.meta.url)){exportMaps();console.log('Exported all registered LDtk maps and events.');}
