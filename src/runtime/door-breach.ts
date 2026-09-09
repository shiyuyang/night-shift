/** Battering timer; the finale doorway task decides whether the attacker is in position. */
export class DoorBreach {
 progress=0;broken=false;private beat=0;
 tick(dt:number,pushing:boolean){
  if(dt<=0||this.broken)return;
  if(!pushing){this.progress=0;this.beat=0;return;}
  const old=this.beat;this.progress+=dt;this.beat=Math.floor(this.progress);
  if(this.progress>=5){this.broken=true;return 'door-breach';}
  if(this.beat!==old||this.progress===dt)return 'door-batter';
 }
}
