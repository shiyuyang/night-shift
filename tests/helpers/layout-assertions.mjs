import assert from 'node:assert/strict';
import {clearContact} from '../../src/collision.ts';
export function assertOpeningSearch(level){
 if(level.round<=2){assert.ok(Math.hypot(level.key.x-level.boxes[0].x,level.key.y-level.boxes[0].y)>=180);return;}
 const solids=[...level.walls,...level.props,level.door];
 assert.equal(clearContact(level.spawn,level.key,solids),false,'Opening key must require searching past cover');
 assert.equal(clearContact(level.spawn,level.boxes[0],solids),false,'First box must not face spawn');
 assert.ok(Math.hypot(level.key.x-level.boxes[0].x,level.key.y-level.boxes[0].y)>=300);
 assert.equal(clearContact(level.key,level.boxes[0],solids),false,'Key and box must require turning through the map');
}
