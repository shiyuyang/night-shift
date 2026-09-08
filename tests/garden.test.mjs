import test from 'node:test';import assert from 'node:assert/strict';
import {makeLevel} from '../src/levels.ts';import {EventRuntime} from '../src/runtime/event-runtime.ts';import {patrolPath} from '../src/patrol.ts';import {feetAt,monsterFeetAt,monsterArchitecture} from '../src/collision.ts';
test('courtyard has two routes around the basin for both actor sizes',()=>{
 const l=makeLevel(7);
 for(const footprint of [feetAt,monsterFeetAt]){
  const solids=[...l.walls.map(w=>footprint===monsterFeetAt?monsterArchitecture(w):w),...l.props,l.door];
  for(const points of [[[450,460],[450,290],[820,290],[820,575],[450,575],[450,460]],[[800,460],[980,460],[1126,370]]])for(let i=1;i<points.length;i++){
   const a={x:points[i-1][0],y:points[i-1][1]},b={x:points[i][0],y:points[i][1]},path=patrolPath(a,b,solids,l.bounds,footprint);
   assert.ok(path.length&&Math.hypot(path.at(-1).x-b.x,path.at(-1).y-b.y)<1,JSON.stringify({a,b}));
  }
 }
 assert.equal(l.props.filter(p=>p.kind==='fountain').length,1);assert.ok(l.props.some(p=>p.kind==='wheelchair'));
});
test('garden wave dims lamps in order, preserves exit light and restores every lamp',()=>{
 const l=makeLevel(7),out=[],runtime=new EventRuntime(l.events,a=>out.push(a)),state={flags:{first_box:true},zones:{NorthPathZone:true}};
 runtime.tick(.01,state);assert.deepEqual(out.filter(a=>a.type==='light').map(a=>a.target),['LampEast']);
 runtime.tick(.4,state);assert.equal(out.filter(a=>a.type==='light').length,1);runtime.tick(0,state);assert.equal(out.filter(a=>a.type==='light').length,1);
 for(let i=0;i<110;i++)runtime.tick(.1,state);
 const lights=out.filter(a=>a.type==='light');assert.deepEqual(lights.slice(0,5).map(a=>a.target),['LampEast','LampNorth','LampCenter','LampWest','LampSouth']);assert.ok(lights.slice(0,5).every(a=>a.strength===.06));assert.ok(lights.slice(5).every(a=>a.strength===.65));assert.equal(lights.some(a=>a.target==='LampExit'),false);assert.equal(lights.length,10);
 for(let i=0;i<100;i++)runtime.tick(.1,state);assert.equal(out.filter(a=>a.type==='light').length,10);
});
