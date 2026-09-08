import {randomizeLevel} from './runtime/random-level.ts';
import {loadLevel} from './runtime/map-loader.ts';
import type {Box,Position} from './collision';
import type {EventDefinition} from './runtime/event-runtime';
import type {Lamp} from './light-renderer';
import commandCatalog from '../game/commands.json' with {type:'json'};
export type Command='blackout'|'ghost'|'drain'|'alarm'|'sanctuary'|'reveal'|'supply'|'repel';
export const commands=commandCatalog.map(c=>c.id) as Command[];
export interface Level{features?:import('./runtime/rogue-content').Feature[];generation?:{seed:number;attempts:number;fallback:boolean;modules:string[]};source:string;width:number;height:number;bounds:Box;cameraBounds:Box;monsterSpawns:Position[];monsterEntries?:Position[];weeperSpawns?:Position[];lamps:(Lamp&{id:string})[];events:EventDefinition[];zones:Record<string,Box>;round:number;name:string;theme:number;walls:Box[];door:Box;doorUse:Position;props:(Box&{kind:'bed'|'crate'|'machine'|'desk'|'shelf'|'rack'|'engine'|'seating'|'operatingtable'|'coldcabinet'|'shroudedtrolley'|'fountain'|'hedge'|'tree'|'gardenbench'|'wheelchair'|'planter'})[];key:Position;boxes:Position[];spawn:Position;exit:Position}
export function makeLevel(round:number,seed?:number):Level{const base=loadLevel(Math.max(1,Math.floor(round)));return seed===undefined||base.round===1?base:randomizeLevel(base,seed);}
