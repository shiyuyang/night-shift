export type KeyKind='brass'|'ward'|'seal';
export class Locks {
 keys:Record<KeyKind,boolean>={brass:false,ward:false,seal:false};doorUnlocked=false;
 takeBrass(){this.keys.brass=true;}
 unlockDoor(){if(this.doorUnlocked)return true;if(!this.keys.ward)return false;this.keys.ward=false;this.doorUnlocked=true;return true;}
 openBox(index:number){if(index===0){this.keys.ward=true;return true;}const key=index===1?'brass':'seal';if(!this.keys[key])return false;this.keys[key]=false;if(index===1)this.keys.seal=true;return true;}
}
