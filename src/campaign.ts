import {storage as persistentStorage} from './runtime/storage.ts';
export const CAMPAIGN_KEY='night-shift-campaign-v1';
export class Campaign {
 unlocked=1;
 private storage?:Pick<Storage,'getItem'|'setItem'>;
 constructor(storage?:Pick<Storage,'getItem'|'setItem'>){this.storage=storage;try{const value=JSON.parse(storage?.getItem(CAMPAIGN_KEY)??'null');if(Number.isSafeInteger(value?.unlocked)&&value.unlocked>=1)this.unlocked=value.unlocked;}catch{/* Missing or damaged saves start at the first stage. */}}
 canPlay(stage:number){return Number.isSafeInteger(stage)&&stage>=1&&stage<=this.unlocked;}
 complete(stage:number){if(!this.canPlay(stage)||stage!==this.unlocked)return;this.unlocked++;try{this.storage?.setItem(CAMPAIGN_KEY,JSON.stringify({unlocked:this.unlocked}));}catch{/* Progress remains available for this session. */}}
}
let storage:Pick<Storage,'getItem'|'setItem'>|undefined;try{storage=persistentStorage;}catch{}
export const campaign=new Campaign(storage);
