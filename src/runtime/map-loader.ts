import {stageName} from '../i18n.ts';
import catalog from '../../game/maps/catalog.json' with {type:'json'};
import {parseEvents} from './event-runtime.ts';
import type {Level} from '../levels.ts';
export function loadLevel(round:number):Level {
 const data=catalog[(round-1)%catalog.length],entities=data.entities,variant=Math.floor((round-1)/catalog.length)%2?'B':'A';
 const one=(id:string)=>{const found=entities.filter(e=>e.id===id);if(found.length!==1)throw Error(`${data.id} requires exactly one ${id}`);return found[0];};
 const rect=({x,y,width,height}:{x:number;y:number;width:number;height:number})=>({x,y,width,height});
 const point=(id:string)=>{const {x,y}=one(id);return {x,y};};
 const lamps=data.lights.map(l=>({...l,...point(l.id)}));
 return {round,theme:data.theme,name:stageName(data.theme),source:data.source,width:data.width,height:data.height,bounds:rect(one('PlayBounds')),cameraBounds:rect(one('CameraBounds')),monsterSpawns:[point('MonsterLeft'),point('MonsterRight')],monsterEntries:entities.filter(e=>e.id==='MonsterEntry').map(({x,y})=>({x,y})),weeperFixed:entities.find(e=>e.id==='WeeperFixed'),weeperSpawns:entities.filter(e=>e.id==='WeeperSpawn').map(({x,y})=>({x,y})),lamps,events:parseEvents(data.events,['crt',...lamps.map(l=>l.id)]),walls:entities.filter(e=>e.id==='Wall').map(rect),props:entities.filter(e=>['Bed','Crate','Machine','Desk','Shelf','Rack','Engine','Seating','Operatingtable','ColdCabinet','ShroudedTrolley','Fountain','Hedge','Tree','GardenBench','Wheelchair','Planter'].includes(e.id)).map(e=>({...rect(e),kind:e.id.toLowerCase() as 'bed'|'crate'|'machine'|'desk'|'shelf'|'rack'|'engine'|'seating'|'operatingtable'|'coldcabinet'|'shroudedtrolley'|'fountain'|'hedge'|'tree'|'gardenbench'|'wheelchair'|'planter'})),door:rect(one('Door')),doorUse:point('DoorUse'),spawn:point('PlayerSpawn'),exit:point('Exit'),key:point('Key_'+variant),boxes:[0,1,2].map(i=>point(`Box${i}_${variant}`)),zones:Object.fromEntries([...entities.filter(e=>e.id.endsWith('Zone')).map(e=>[e.id,rect(e)]),['return_corridor',rect(one('ReturnZone'))]])};
}
