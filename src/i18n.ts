import zh from '../game/locales/zh-CN.json' with {type:'json'};
import en from '../game/locales/en.json' with {type:'json'};
export type Locale='zh-CN'|'en';
export type MessageKey=keyof typeof zh;
const messages:Record<Locale,Record<MessageKey,string>>={'zh-CN':zh,en};
export const LANGUAGE_KEY='night-shift-language-v1';
let locale:Locale='zh-CN';
try{if(globalThis.localStorage?.getItem(LANGUAGE_KEY)==='en')locale='en';}catch{}
export const getLocale=()=>locale;
export function setLocale(value:Locale){locale=value;try{globalThis.localStorage?.setItem(LANGUAGE_KEY,value);}catch{}if(typeof document!=='undefined')document.documentElement.lang=value;}
export function t(key:MessageKey,values:Record<string,string|number>={},language:Locale=locale){return messages[language][key].replace(/\{(\w+)\}/g,(match,name)=>String(values[name]??match));}
export function stageName(theme:number){return t(('stage.'+theme) as MessageKey);}
