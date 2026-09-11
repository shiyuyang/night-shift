import test from 'node:test';import assert from 'node:assert/strict';
import {LiveGifts} from '../src/runtime/live-gifts.ts';
import {giftLanding,shadeLanding} from '../src/runtime/gift-placement.ts';
import {GiftShade} from '../src/runtime/gift-shade.ts';
import {makeLevel} from '../src/levels.ts';
import {overlaps,feetAt,clearContact} from '../src/collision.ts';
import {validateEvent,createGate} from '../server/events.mjs';
const event=(id,giftId='59319',count=1)=>({id,giftId,count,runId:'run-a',userId:'u',viewer:'Sakura',comboId:'combo'});
const tick=(g,seconds,canFail=true)=>{for(let i=0;i<Math.round(seconds*20);i++)g.tick(.05,canFail);};
test('combo delta, duplicates, out-of-order messages, and cross-run clearing',()=>{
 const g=new LiveGifts();g.begin('run-a');g.receive(event('a'));g.receive(event('b','59319',3));assert.equal(g.shade,60);
 g.receive(event('b','59319',3));g.receive(event('c','59319',2));assert.equal(g.shade,60);
 g.receive({...event('d','59319',2),userId:'other'});assert.equal(g.shade,100);
 tick(g,1);const before=g.shade;g.tick(0,true);assert.equal(g.shade,before);
 g.clear();g.begin('run-b');assert.equal(g.receive(event('late','59319',9)),null);assert.equal(g.shade,0);assert.equal(g.queue.length,0);
});
test('unbounded counted queue, same-type gaps and cross-type exclusion',()=>{
 const g=new LiveGifts();g.begin('run-a');g.receive(event('a','59315',100000));assert.equal(g.view().pending,100000);assert.equal(g.queue.length,1);
 assert.equal(g.tick(.01,true),'failure');assert.equal(g.active.remaining,10);tick(g,10.1);assert.equal(g.active,null);tick(g,9);assert.equal(g.active,null);tick(g,1.2);assert.equal(g.active.entry.kind,'failure');
});
test('blocked failure does not block warp and warp freezes shade countdown',()=>{
 const g=new LiveGifts();g.begin('run-a');g.receive(event('shade'));g.receive(event('failure','59315'));g.receive(event('warp','59318'));
 assert.equal(g.tick(.01,false),'warp');const remaining=g.shade;tick(g,1,false);assert.equal(g.shade,remaining);assert.equal(g.view().pending,1);
 tick(g,1.1,false);assert.equal(g.active,null);assert.equal(g.queue[0].kind,'failure');
});
test('transport preserves identities and accepts rapid distinct combo increments',()=>{
 const e=validateEvent({...event('a'),avatar:'https://example.com/avatar.png'});assert.equal(e.count,1);assert.equal(e.avatar,'https://example.com/avatar.png');
 assert.throws(()=>validateEvent({...e,avatar:'javascript:alert(1)'}));assert.throws(()=>validateEvent({...e,count:-1}));
 const gate=createGate();assert.equal(gate(e,1000),'accepted');assert.equal(gate({...e,id:'b',count:2},1001),'accepted');assert.equal(gate(e,1002),'duplicate');
});
test('every map has legal distance-ranked warp and shade landings across seeds',()=>{
 for(let round=1;round<=7;round++)for(const seed of [1,21,93]){
  const l=makeLevel(round,seed),solids=[...l.walls,...l.props,...l.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),l.door];
  for(const desired of [90,100,420]){const p=giftLanding(l.spawn,solids,l.bounds,desired,[l.spawn],0,()=>.5);assert.ok(!solids.some(b=>overlaps(feetAt(p.x,p.y),b)),`${round}/${seed}`);assert.ok(Math.hypot(p.x-l.spawn.x,p.y-l.spawn.y)>32);}
  for(const desired of [68,72]){const p=shadeLanding(l.spawn,solids,l.bounds,desired,0,()=>.5);assert.ok(!solids.some(b=>overlaps(feetAt(p.x,p.y),b)),`${round}/${seed} shade`);assert.ok(Math.hypot(p.x-l.spawn.x,p.y-l.spawn.y)>=55);assert.ok(clearContact(p,l.spawn,solids),`${round}/${seed} shade visible at spawn`);}
 }
});
test('shade relocates on distance, stays single, and approaches slowly without item inputs',()=>{
 const l=makeLevel(2,21),solids=[...l.walls,...l.props,l.door],s=new GiftShade();s.spawn(l.spawn,0,solids,l.bounds);
 const old=s.position;s.tick(0,l.spawn,0,solids,l.bounds);assert.deepEqual(s.position,old);
 for(let i=0;i<80;i++)s.tick(.05,l.spawn,0,solids,l.bounds);
 const p=giftLanding(s.position,solids,l.bounds,450,[],0,()=>.5);s.tick(.05,p,0,solids,l.bounds);assert.equal(s.teleports,1);assert.ok(s.tear>0);assert.ok(Math.hypot(s.position.x-p.x,s.position.y-p.y)<340);
});

test('shade appears nearby, relocates closer, and cannot touch during its flicker',()=>{
 const bounds={x:0,y:0,width:1000,height:1000},player={x:500,y:500},s=new GiftShade();s.spawn(player,0,[],bounds);
 const distance=()=>Math.hypot(s.position.x-player.x,s.position.y-player.y);
 assert.ok(distance()>=64&&distance()<=80);
 const before={...s.position};assert.equal(s.tick(.2,player,0,[],bounds),false);assert.deepEqual(s.position,before);
 s.position={x:player.x-220,y:player.y};s.teleportWait=0;s.tick(.05,player,0,[],bounds);
 assert.equal(s.teleports,1);assert.ok(distance()>=60&&distance()<=76);
 s.position={...player};assert.equal(s.tick(.05,player,0,[],bounds),false);
 s.tear=0;assert.equal(s.tick(.05,player,0,[],bounds),true);
});

test('shade favors a visible approach over the adjoining room behind the player',()=>{
 const bounds={x:0,y:0,width:400,height:300},wall={x:190,y:0,width:12,height:230},player={x:230,y:100};
 // Both rooms connect below the wall. Straight-line range alone favors the left room.
 for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2])for(const random of [0,.25,.5,.75,.999]){
  const p=shadeLanding(player,[wall],bounds,72,angle,()=>random);
  assert.ok(p.x>wall.x+wall.width,'apparition stays in the player room');
  assert.ok(clearContact(player,p,[wall]));
  assert.ok(Math.hypot(p.x-player.x,p.y-player.y)>=55);
 }
});

test('shade forces a prompt response but walking away permits repeated safe escapes',()=>{
 const bounds={x:0,y:0,width:3000,height:600};
 const still={x:300,y:300},threat=new GiftShade();threat.spawn(still,0,[],bounds);
 let contact=0;for(let i=1;i<=60;i++)if(threat.tick(.05,still,0,[],bounds)){contact=i*.05;break;}
 assert.ok(contact>=1.5&&contact<=2.5,`standing contact window: ${contact}`);
 for(const speed of [83,125]){
  const player={x:300,y:300},shade=new GiftShade();shade.spawn(player,0,[],bounds);
  for(let i=0;i<400;i++){player.x+=speed*.05;assert.equal(shade.tick(.05,player,0,[],bounds),false,`moving away at ${speed}`);}
  assert.ok(shade.teleports>=4,'running away must not remove the threat for the rest of the gift');
 }
});
