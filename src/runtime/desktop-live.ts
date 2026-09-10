import {isTauri,invoke} from '@tauri-apps/api/core';
import {desktopLaunch} from './storage';
import mapping from '../../game/live-studio-instructions.json';
import {giftDefinitions,type GiftEvent} from './live-gifts';
type Game={localGift:(e:Omit<GiftEvent,'runId'>)=>Promise<boolean>;cancelLocal:()=>void};
export function connectDesktop(game:Game){
 if(!isTauri()||!desktopLaunch.session)return;
 let stopped=false;
 async function process(d:Record<string,unknown>){
  const id=String(d.interaction_id??'');let result=false;
  try{
   const effect=mapping.instructions.find(i=>i.instruction===d.instruction)?.effect;
   const giftId=Object.entries(giftDefinitions).find(([,v])=>v.kind===effect)?.[0] as GiftEvent['giftId']|undefined;
   if(giftId&&d.play_id===desktopLaunch.play&&typeof d.count==='number'&&Number.isSafeInteger(d.count)&&d.count>0&&d.count<=100&&typeof d.trigger_nick_name==='string'&&typeof d.trigger_encrypted_id==='string'){
    result=await game.localGift({id,giftId,count:d.count,viewer:d.trigger_nick_name.slice(0,128),userId:d.trigger_encrypted_id});
   }
  }catch(error){console.error('Local interaction failed',error);}
  await invoke('desktop_ack',{id,result}).catch(()=>{});
 }
 async function poll(){
  try{const data=await invoke<{status:string;messages:Record<string,unknown>[]}>('desktop_poll');document.body.dataset.liveStatus=data.status;
   if(data.status==='authenticated'){for(const m of data.messages)void process(m);}
   else{game.cancelLocal();if(data.status==='disconnected'||data.status==='invalid-launch')stopped=true;}
  }catch(error){console.error('Desktop polling failed',error);game.cancelLocal();stopped=true;}
  if(!stopped)setTimeout(()=>void poll(),50);
 }
 void poll();
 window.addEventListener('pagehide',()=>{stopped=true;game.cancelLocal();},{once:true});
}
