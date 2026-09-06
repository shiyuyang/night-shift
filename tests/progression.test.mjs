import test from 'node:test';
import assert from 'node:assert/strict';
import { Progression } from '../src/progression.ts';
test('the code follows the clinical order, requires a discovered clue, and resets between nights',()=>{
 const progress=new Progression();let i=0;const rolls=[.1,.5,.8];progress.reset(2,()=>rolls[i++]);
 assert.deepEqual(progress.digits,[1,5,8]);assert.equal(progress.code,'815');assert.equal(progress.unlock('815'),false);
 progress.noteRead=true;assert.equal(progress.unlock('158'),false);assert.equal(progress.unlock('815'),true);
 progress.crowbar=true;progress.barricadeOpen=true;progress.powered=true;progress.bandages=0;progress.decoys=0;
 progress.reset(1,()=>0);assert.equal(progress.cabinetOpen,false);assert.equal(progress.noteRead,false);assert.equal(progress.crowbar,false);assert.equal(progress.powered,false);assert.equal(progress.bandages,1);assert.equal(progress.decoys,2);
});
test('night two cannot bypass the cabinet or power chain even with three fuses',()=>{
 const p=new Progression();p.reset(2);assert.equal(p.canCollectFuse(1),false);assert.equal(p.canCollectFuse(2),false);assert.equal(p.canEscape(3),false);assert.equal(p.restorePower(3),false);
 p.powered=true;assert.equal(p.canEscape(3),false);p.powered=false;p.noteRead=true;p.unlock(p.code);assert.equal(p.canCollectFuse(1),true);assert.equal(p.restorePower(3),false);
 p.crowbar=true;p.barricadeOpen=true;assert.equal(p.canCollectFuse(2),true);assert.equal(p.restorePower(2),false);assert.equal(p.restorePower(3),true);assert.equal(p.canEscape(3),true);
 p.reset(1);assert.equal(p.canEscape(3),true);assert.equal(p.canEscape(2),false);
});
