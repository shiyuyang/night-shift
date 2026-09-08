import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import ts from 'typescript';import {parse,TYPE} from '@formatjs/icu-messageformat-parser';import {locales} from '../../src/i18n/locales.ts';
const en=JSON.parse(fs.readFileSync('game/locales/en.json'));const errors=[];
export function argumentsOf(pattern){const args={};function walk(nodes){for(const n of nodes){if([TYPE.argument,TYPE.number,TYPE.date,TYPE.time,TYPE.select,TYPE.plural].includes(n.type)){args[n.value]=[TYPE.number,TYPE.plural].includes(n.type)?'number':n.type===TYPE.date||n.type===TYPE.time?'date':'string';}if(n.options)for(const o of Object.values(n.options))walk(o.value);if(n.children)walk(n.children);}}walk(parse(pattern,{ignoreTag:true}));return args;}
const args={};for(const [key,value]of Object.entries(en)){try{args[key]=argumentsOf(value);}catch(e){errors.push('en '+key+': '+e.message);}}
for(const l of locales){const p='game/locales/'+(l==='zh-Hans'?'zh-CN':l)+'.json';if(!fs.existsSync(p)){errors.push('Missing locale '+l);continue;}const data=JSON.parse(fs.readFileSync(p));for(const k of Object.keys(en)){if(!data[k]?.trim()){errors.push(l+' missing '+k);continue;}try{const expected=Object.entries(args[k]).sort(),actual=Object.entries(argumentsOf(data[k])).sort();if(JSON.stringify(expected)!==JSON.stringify(actual))errors.push(l+' arguments '+k);}catch(e){errors.push(l+' '+k+': '+e.message);}}for(const k of Object.keys(data))if(!(k in en))errors.push(l+' extra '+k);}
// Detect cross-language contamination in generated text, not just missing glyphs.
const scripts={ar:'Arabic',he:'Hebrew',th:'Thai',my:'Myanmar',ja:'Han|Hiragana|Katakana',ko:'Hangul','zh-Hans':'Han','zh-Hant':'Han',ru:'Cyrillic',uk:'Cyrillic',bg:'Cyrillic',el:'Greek'};
for(const l of locales){const file='game/locales/'+(l==='zh-Hans'?'zh-CN':l)+'.json';if(!fs.existsSync(file))continue;const allowed=new RegExp('^(?:'+['Latin','Common','Inherited',...(scripts[l]?.split('|')??[])].map(s=>'\\p{Script='+s+'}').join('|')+')$','u');for(const [k,v] of Object.entries(JSON.parse(fs.readFileSync(file)))){const unexpected=[...new Set([...v.replaceAll('夜勤病棟','')].filter(c=>/\p{L}/u.test(c)&&!allowed.test(c)))];if(unexpected.length)errors.push(l+' unexpected script '+k+': '+unexpected.join(''));}}
// Follow real entry-point imports; retired prototypes cannot silently re-enter production.
const seen=new Set(),dnt=new Set(JSON.parse(fs.readFileSync('game/localization-exceptions.json')).dnt.map(x=>x.text));
function scan(file){file=path.resolve(file);if(seen.has(file)||!file.endsWith('.ts')||file.includes('/i18n/'))return;seen.add(file);const s=fs.readFileSync(file,'utf8'),tree=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true);
 function walk(n){if(ts.isImportDeclaration(n)&&n.moduleSpecifier.text.startsWith('.')){let p=path.resolve(path.dirname(file),n.moduleSpecifier.text);if(!path.extname(p))p+='.ts';if(fs.existsSync(p))scan(p);}
 if(ts.isStringLiteralLike(n)&&/[\p{Script=Han}]/u.test(n.text)&&!dnt.has(n.text))errors.push(path.relative('.',file)+':'+(tree.getLineAndCharacterOfPosition(n.getStart()).line+1)+' literal player text: '+n.text.slice(0,50));
 if(ts.isPropertyAccessExpression(n)&&['textContent','innerText'].includes(n.name.text)&&ts.isBinaryExpression(n.parent)&&n.parent.left===n&&ts.isStringLiteralLike(n.parent.right)){const v=n.parent.right.text;if(/\p{L}{2}/u.test(v)&&!dnt.has(v))errors.push(path.relative('.',file)+' literal text sink: '+v);}
 if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&['setText','fillText','say','notice'].includes(n.expression.name.text)&&n.arguments[0]&&ts.isStringLiteralLike(n.arguments[0])){const v=n.arguments[0].text;if(v&&!dnt.has(v))errors.push(path.relative('.',file)+' literal Canvas text: '+v);}

 if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)){
  const method=n.expression.name.text;
  const index=method==='text'&&ts.isPropertyAccessExpression(n.expression.expression)&&n.expression.expression.name.text==='add'?2:method==='setAttribute'&&n.arguments[0]&&ts.isStringLiteralLike(n.arguments[0])&&['aria-label','title','alt','placeholder'].includes(n.arguments[0].text)?1:-1;
  const value=n.arguments[index];if(value&&ts.isStringLiteralLike(value)&&/\p{L}{2}/u.test(value.text)&&!dnt.has(value.text))errors.push(path.relative('.',file)+' literal UI text: '+value.text);
 }
if(ts.isStringLiteralLike(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n)){
 const chunk=n.text??'';
 if(chunk.includes('<')){
  for(const match of chunk.matchAll(/>([^<>]*)</g)){const copy=match[1].trim();if(/[a-z]{2}|[\p{Script=Han}]/iu.test(copy)&&!dnt.has(copy))errors.push(path.relative('.',file)+' literal HTML text: '+copy);}
  for(const match of chunk.matchAll(/(?:aria-label|title)=["']([^"']+)["']/g)){const copy=match[1];if(!copy.includes('${')&&/[a-z]{2}|[\p{Script=Han}]/iu.test(copy)&&!dnt.has(copy))errors.push(path.relative('.',file)+' literal accessible label: '+copy);}
 }
}
ts.forEachChild(n,walk);}walk(tree);}
scan('src/main.ts');
for(const file of fs.readdirSync('game/events'))if(file.endsWith('.json'))for(const event of JSON.parse(fs.readFileSync('game/events/'+file)))for(const action of event.sequence)if(action.type==='message'&&!(action.text in en))errors.push('Event text must be a catalog key: '+file+' '+action.text);
for(const command of JSON.parse(fs.readFileSync('game/commands.json')))for(const suffix of ['', '.description'])if(!en['command.'+command.id+suffix])errors.push('Missing command translation: '+command.id+suffix);
const metaPath='game/translation-status.json';if(fs.existsSync(metaPath)){const meta=JSON.parse(fs.readFileSync(metaPath));const hash=crypto.createHash('sha256').update(JSON.stringify(en)).digest('hex');if(meta.sourceHash!==hash)errors.push('Source changed: update translations and review metadata');}
if(process.argv.includes('--types')){const lines=Object.entries(args).map(([k,a])=>JSON.stringify(k)+':{'+Object.entries(a).map(([name,type])=>JSON.stringify(name)+':'+(type==='number'?'number':type==='date'?'Date|number':'string|number')).join(';')+'}');fs.writeFileSync('src/i18n/message-args.ts','// Generated by npm run i18n:types. Do not edit.\nexport interface MessageValues{\n'+lines.join('\n')+'\n}\n');}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`Localization valid: ${locales.length} locales, ${Object.keys(en).length} keys; ICU arguments and active source checked.`);
