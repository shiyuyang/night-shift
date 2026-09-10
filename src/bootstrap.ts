import './style.css';
import './game-ui.css';
import './immersive.css';
import './presentation.css';
import './hud-feedback.css';
import './watch-desk.css';
import './field-hud.css';
import './result-screen.css';
import './tutorial-ui.css';
import './localization.css';
import './ui/game-ui-scale.css';
import {invoke,isTauri} from '@tauri-apps/api/core';
import {initializeStorage} from './runtime/storage';
let storageReady=false;
try {await initializeStorage();storageReady=true;await import('./main');}
catch(error){console.error('Desktop startup failed',error);if(isTauri())void invoke('desktop_diagnostic',{error:String(error)});const {t}=await import('./i18n');const p=document.createElement('p');p.textContent=t(storageReady?'desktop.startupError':'desktop.saveError');document.querySelector('#app')!.replaceChildren(p);}
