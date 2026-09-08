/** Product scope: P0 + P1, with Simplified Chinese additionally supported. */
export const localeNames={en:'English',id:'Bahasa Indonesia',es:'Español',ar:'العربية',vi:'Tiếng Việt',fr:'Français',th:'ไทย',pt:'Português',tr:'Türkçe',ru:'Русский',ja:'日本語',de:'Deutsch',it:'Italiano',ro:'Română',ms:'Bahasa Melayu','zh-Hant':'繁體中文',ko:'한국어',uk:'Українська',az:'Azərbaycanca',pl:'Polski',nl:'Nederlands',el:'Ελληνικά',bg:'Български',my:'မြန်မာဘာသာ',hu:'Magyar',he:'עברית',hr:'Hrvatski',sv:'Svenska','zh-Hans':'简体中文'} as const;
export type Locale=keyof typeof localeNames;
export const locales=Object.keys(localeNames) as Locale[];
export function resolveLocale(input:string):Locale{
 const tag=input.trim().replaceAll('_','-').toLowerCase();
 if(/^zh(?:-|$)/.test(tag)){
  const parts=tag.split('-');
  if(parts.includes('hant'))return 'zh-Hant';
  if(parts.includes('hans'))return 'zh-Hans';
  if(parts.some(p=>['cn','sg'].includes(p)))return 'zh-Hans';
  return 'zh-Hant';
 }
 const base=tag.split('-')[0];return base in localeNames?base as Locale:'en';
}
export const direction=(locale:Locale)=>locale==='ar'||locale==='he'?'rtl':'ltr';
export function fallbackChain(input:string):Locale[]{const l=resolveLocale(input);return [...new Set<Locale>(l==='zh-Hans'?[l,'zh-Hant','en']:l==='en'?['en']:[l,'en'])];}
