import {IntlMessageFormat} from 'intl-messageformat';
import en from '../game/locales/en.json' with {type:'json'};
import zh from '../game/locales/zh-CN.json' with {type:'json'};
import {resolveLocale,direction,fallbackChain,localeNames,type Locale} from './i18n/locales.ts';
export {resolveLocale,localeNames,direction,fallbackChain};
export type {Locale};
import type {MessageValues} from './i18n/message-args.ts';
export type MessageKey=keyof typeof en;
export type MessageArgs<K extends MessageKey>=keyof MessageValues[K] extends never?[values?:MessageValues[K],language?:string]:[values:MessageValues[K],language?:string];
export const LANGUAGE_KEY='night-shift-language-v1';
const messages:Partial<Record<Locale,Partial<Record<MessageKey,string>>>>={en,'zh-Hans':zh};
// Generated imports keep Node tests and browser builds on the same catalog.
import {catalogs} from './i18n/catalogs.ts';
Object.assign(messages,catalogs);
let locale:Locale='en';
try{locale=resolveLocale(globalThis.localStorage?.getItem(LANGUAGE_KEY)??globalThis.navigator?.language??'en');}catch{}
export const getLocale=()=>locale;
export function setLocale(value:string){locale=resolveLocale(value);try{globalThis.localStorage?.setItem(LANGUAGE_KEY,locale);}catch{}if(typeof document!=='undefined'){document.documentElement.lang=locale;document.documentElement.dir=direction(locale);document.documentElement.dataset.script=['zh-Hans','zh-Hant','ja','ko'].includes(locale)?'cjk':['ar','he','th','my'].includes(locale)?'complex':'latin';}}
const formats=new Map<string,IntlMessageFormat>();
export function formatMessage(pattern:string,values:Record<string,string|number|Date>={},language:string=getLocale()):string{
 const id=language+'\0'+pattern;let f=formats.get(id);if(!f){f=new IntlMessageFormat(pattern,language,undefined,{ignoreTag:true});formats.set(id,f);}
 return String(f.format(values));
}
export function t<K extends MessageKey>(key:K,...args:MessageArgs<K>):string;
export function t(key:MessageKey,values:Record<string,string|number|Date>={},language:string=locale):string{
 for(const candidate of fallbackChain(language)){const pattern=messages[candidate]?.[key];if(pattern!==undefined&&pattern!=='')return formatMessage(pattern,values,candidate);}
 throw new Error('Missing message: '+key);
}
/** Escape only at HTML sinks; t() always returns plain text (also safe for Canvas). */
export const escapeHtml=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function htmlMessage<K extends MessageKey>(key:K,...args:MessageArgs<K>):string{return escapeHtml(t(key,...args));}
export function stageName(theme:number){return t(('stage.'+theme) as MessageKey);}
setLocale(locale);

export function canvasFont(){return ({ar:'LocaleArabic',he:'LocaleHebrew',th:'LocaleThai',my:'LocaleMyanmar',ja:'LocaleJapanese',ko:'LocaleKorean','zh-Hans':'LocaleHans','zh-Hant':'LocaleHant'} as Partial<Record<Locale,string>>)[getLocale()]??'LocaleLatin';}

export const isolate=(value:string)=>'\u2068'+value+'\u2069';

export const formatList=(items:string[],language:string=getLocale())=>new Intl.ListFormat(language,{style:'short',type:'unit'}).format(items);
