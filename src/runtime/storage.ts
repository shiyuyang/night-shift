import {isTauri,invoke} from '@tauri-apps/api/core';
let values:Record<string,string>={};let native=false;
let writes:Promise<void>=Promise.resolve();
export let desktopLaunch:{session:string;play:string;language?:string}={session:'',play:''};
export const storage={
 getItem(key:string):string|null{if(native)return values[key]??null;try{return globalThis.localStorage?.getItem(key)??null;}catch{return null;}},
 setItem(key:string,value:string){if(native){values[key]=value;persist();}else{try{globalThis.localStorage?.setItem(key,value);}catch{}}},
 removeItem(key:string){if(native){delete values[key];persist();}else{try{globalThis.localStorage?.removeItem(key);}catch{}}},
};
function persist(){const snapshot={...values};writes=writes.catch(()=>{}).then(()=>invoke('desktop_save',{values:snapshot}));void writes.catch(error=>{console.error('File save failed',error);document.body.dataset.saveError='true';window.dispatchEvent(new Event('nightshift:save-error'));});}
export async function flushSave(){await writes;}
export async function initializeStorage(){
 if(!isTauri())return;
 const boot=await invoke<{save:Record<string,string>|null;launch:typeof desktopLaunch;scoped:boolean}>('desktop_boot');
 desktopLaunch=boot.launch;
 document.body.dataset.liveSession=desktopLaunch.session;
 if(sessionStorage.getItem('night-shift-session-language')===desktopLaunch.session)desktopLaunch.language=undefined;
 values=boot.save??{};
 native=true;
 if(!boot.save){persist();await flushSave();}
 const {getCurrentWindow}=await import('@tauri-apps/api/window');
 await getCurrentWindow().onCloseRequested(async event=>{event.preventDefault();try{await flushSave();await getCurrentWindow().destroy();}catch(error){console.error('Close deferred: file save failed',error);}});
}
