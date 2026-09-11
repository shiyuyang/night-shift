export const metricsVersion=7;
/** Player-wide recovery requires ALL enemies to lose cues and no nearby active danger. */
export class RecoveryWindows {
 constructor(){this.hadThreat=false;this.quietStart=null;this.windows=[];this.stage=null;}
 sample(frame){const interrupted=new Set(['stunned','hesitation','light','warning','returning']);const unsafe=frame.enemies.some(e=>e.present&&(e.cue>0||e.dangerous&&e.gap<160&&!interrupted.has(e.mode)));
  if(unsafe){if(this.quietStart!==null&&frame.time-this.quietStart>=2)this.windows.push({start:this.quietStart,end:frame.time,duration:frame.time-this.quietStart,stageAtStart:this.stage,censored:false});this.quietStart=null;this.hadThreat=true;}
  else if(this.hadThreat&&this.quietStart===null){this.quietStart=frame.time;this.stage=frame.fuses===3?'finale':'daily';}
 }
 export(time){const open=this.quietStart!==null&&time-this.quietStart>=2?{start:this.quietStart,end:time,duration:time-this.quietStart,stageAtStart:this.stage,censored:true}:null;return {windows:structuredClone(this.windows),open};}
}
