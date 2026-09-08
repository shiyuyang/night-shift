// Editorial audit; structural errors are enforced separately by i18n:check.
import fs from 'node:fs';
import {locales} from '../../src/i18n/locales.ts';
const en=JSON.parse(fs.readFileSync('game/locales/en.json'));const findings=[];
const normalize=s=>s.replace(/[٠-٩۰-۹၀-၉]/g,c=>String(c.charCodeAt(0)-(c<='٩'?0x660:c<='۹'?0x6f0:0x1040))).replace(/\{[^}]+\}/g,'');
for(const locale of locales.filter(l=>!['en','zh-Hans','zh-Hant'].includes(l))){const data=JSON.parse(fs.readFileSync('game/locales/'+locale+'.json'));const override='game/localization-overrides/'+locale+'.json';if(fs.existsSync(override))Object.assign(data,JSON.parse(fs.readFileSync(override)));for(const [key,value] of Object.entries(data)){
 if(key==='menu.title')continue;
 if(value===en[key]&&/[A-Za-z]{3}/.test(normalize(value))&&normalize(value).length>12)findings.push({locale,key,reason:'unchanged English',source:en[key],value});
 const expected=normalize(en[key]).match(/\d+(?:\.\d+)?/g)?.sort()??[],actual=normalize(value).match(/\d+(?:\.\d+)?/g)?.sort()??[];
 if(JSON.stringify(expected)!==JSON.stringify(actual))findings.push({locale,key,reason:'review numeric facts',source:en[key],value});
 if(locale!=='ja'&&/\p{Script=Han}/u.test(value.replaceAll('夜勤病棟','')))findings.push({locale,key,reason:'unexpected Han characters',source:en[key],value});
}}
fs.mkdirSync('output/localization',{recursive:true});fs.writeFileSync('output/localization/translation-audit.json',JSON.stringify(findings,null,2)+'\n');console.log(findings.length+' editorial findings; see output/localization/translation-audit.json');
