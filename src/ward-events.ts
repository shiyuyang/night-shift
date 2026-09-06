/** Optional first-night observations. Clues persist; inspecting never gates escape. */
export class WardEvents {
  monitorSeen=false;
  monitorWitnessed=false;
  extraBed=false;
  badgeRead=false;
  wheelMarks=false;
  bell: 'silent'|'isolation'|'waiting'|'west'|'finished'='silent';
  transferAt=0;
  nextRing=0;
  reset(){this.monitorSeen=false;this.monitorWitnessed=false;this.extraBed=false;this.badgeRead=false;this.wheelMarks=false;this.bell='silent';this.transferAt=0;this.nextRing=0;}
  collectFirst(){if(this.bell==='silent')this.bell='isolation';}
  inspectMonitor(fuses:number){this.monitorSeen=true;if(fuses>0){this.monitorWitnessed=true;if(!this.badgeRead&&!this.wheelMarks)this.extraBed=true;}return this.monitorWitnessed;}
  acknowledge(time:number){if(this.bell==='isolation'){this.bell='waiting';this.transferAt=time+2;return true;}return false;}
  update(time:number,leftWard:boolean){if(this.bell==='waiting'&&time>=this.transferAt){this.bell='west';this.nextRing=0;}if(this.extraBed&&this.badgeRead&&leftWard){this.extraBed=false;this.wheelMarks=true;}}
}
