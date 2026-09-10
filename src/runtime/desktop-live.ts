import {isTauri,invoke} from '@tauri-apps/api/core';
import {desktopLaunch,registerBeforeClose} from './storage';
import mapping from '../../game/live-studio-instructions.json';
import {giftDefinitions,type GiftEvent} from './live-gifts';
type Game={localGift:(e:Omit<GiftEvent,'runId'>)=>Promise<boolean>;clearGifts:()=>void};
let connected=false,mode='',state='waiting';
export function desktopEvent(event:string,data:Record<string,unknown>){
 if(!isTauri()||!connected)return Promise.resolve();
 return invoke<void>('desktop_event',{event,data}).catch(error=>console.error('Desktop event failed',error));
}
/** Mode is platform-owned; preserve every string, including the default empty string. */
export function setDesktopEffectMode(value:string){mode=value;return desktopEvent('GAME_EFFECT_MODE_CHANGED',{mode});}
export function setDesktopState(value:string){if(state===value)return;state=value;void desktopEvent('GAME_STATE_CHANGED',{state});}
export function connectDesktop(game:Game){
 if(!isTauri()||!desktopLaunch.session)return;
 let stopped=false,ready=false;
 const pending=new Set<Promise<void>>();
 async function process(d:Record<string,unknown>){
  const id=String(d.interaction_id??'');let result=false;
  try{
   const effect=mapping.instructions.find(i=>i.instruction===d.instruction)?.effect;
   const giftId=Object.entries(giftDefinitions).find(([,v])=>v.kind===effect)?.[0] as GiftEvent['giftId']|undefined;
   const avatar=typeof d.trigger_avatar_url==='string'&&/^https:\/\//i.test(d.trigger_avatar_url)?d.trigger_avatar_url:undefined;
   if(giftId&&d.play_id===desktopLaunch.play&&typeof d.count==='number'&&Number.isSafeInteger(d.count)&&d.count>0&&typeof d.trigger_nick_name==='string'&&typeof d.trigger_encrypted_id==='string'){
    result=await game.localGift({id,giftId,count:d.count,viewer:d.trigger_nick_name.slice(0,128),userId:d.trigger_encrypted_id,avatar});
   }
  }catch(error){console.error('Local interaction failed',error);void desktopEvent('GAME_ERROR',{code:'INTERACTION_FAILED'});}
  await invoke('desktop_ack',{id,result}).catch(()=>{});
 }
 async function poll(){
  try{
   const data=await invoke<{status:string;reason?:string;reason_code?:number;messages:Record<string,unknown>[]}>('desktop_poll');
   if(stopped)return;
   document.body.dataset.liveStatus=data.status;
   if(data.status==='authenticated'){
    connected=true;
    if(!ready&&!document.querySelector<HTMLButtonElement>('#start')?.disabled){ready=true;await desktopEvent('GAME_READY',{});await desktopEvent('GAME_STATE_CHANGED',{state});await setDesktopEffectMode(mode);}
    for(const m of data.messages){const task=process(m);pending.add(task);void task.finally(()=>pending.delete(task));}
   }else if(data.status==='disconnected'||data.status==='invalid-launch'){
    connected=false;stopped=true;game.clearGifts();
    window.dispatchEvent(new CustomEvent('nightshift:live-disconnected',{detail:{code:data.reason_code,reason:data.reason}}));
   }
  }catch(error){console.error('Desktop polling failed',error);connected=false;game.clearGifts();stopped=true;window.dispatchEvent(new CustomEvent('nightshift:live-disconnected',{detail:{reason:'IPC_ERROR'}}));}
  if(!stopped)setTimeout(()=>void poll(),50);
 }
 registerBeforeClose(async()=>{stopped=true;game.clearGifts();await Promise.allSettled(pending);await invoke('desktop_shutdown');connected=false;});
 window.addEventListener('error',()=>{void desktopEvent('GAME_ERROR',{code:'RUNTIME_ERROR'});});
 window.addEventListener('unhandledrejection',()=>{void desktopEvent('GAME_ERROR',{code:'UNHANDLED_REJECTION'});});
 void poll();
 window.addEventListener('pagehide',()=>{stopped=true;game.clearGifts();},{once:true});
}
