import {isTauri} from '@tauri-apps/api/core';

/** Native window fullscreen on desktop; element fullscreen on the website. */
export async function toggleFullscreen(element:HTMLElement){
 if(isTauri()){
  const {getCurrentWindow}=await import('@tauri-apps/api/window');
  const window=getCurrentWindow();
  await window.setFullscreen(!await window.isFullscreen());
 }else if(document.fullscreenElement){
  await document.exitFullscreen();
 }else{
  await element.requestFullscreen();
 }
}
