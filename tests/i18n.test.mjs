import test from 'node:test';import assert from 'node:assert/strict';
import {t,setLocale,stageName,resolveLocale,fallbackChain,formatMessage,escapeHtml,direction,formatList,isolate} from '../src/i18n.ts';
test('Chinese script precedence, regions and Traditional-first fallback',()=>{
 for(const tag of ['zh','zh-TW','zh-HK','zh-MO','zh-Hant','zh-Hant-TW','zh-Hant-CN'])assert.equal(resolveLocale(tag),'zh-Hant');
 for(const tag of ['zh-CN','zh-SG','zh-Hans','zh-Hans-HK','ZH_hans'])assert.equal(resolveLocale(tag),'zh-Hans');
 assert.deepEqual(fallbackChain('zh-CN'),['zh-Hans','zh-Hant','en']);assert.deepEqual(fallbackChain('zh'),['zh-Hant','en']);
});
test('supported regions reuse language catalogs; unknown languages fall back to English',()=>{
 for(const [input,expected]of [['es-419','es'],['pt-BR','pt'],['vi-VN','vi'],['id-ID','id'],['en-GB','en'],['fr-CA','fr'],['de-DE','de'],['xx','en'],['cs','en']])assert.equal(resolveLocale(input),expected);
 assert.equal(direction('ar'),'rtl');assert.equal(direction('he'),'rtl');assert.equal(direction('ja'),'ltr');
});
test('full sentences, missing values and literal HTML are handled explicitly',()=>{
 setLocale('en');assert.equal(stageName(1),'Medical Stores');assert.equal(t('menu.page',{page:1,total:2}),'Page 1 / 2');assert.throws(()=>t('menu.page',{}));
 assert.equal(escapeHtml('<img src=x onerror="bad">'),'&lt;img src=x onerror=&quot;bad&quot;&gt;');
 setLocale('zh-CN');assert.equal(stageName(1),'药品仓库');
});
test('ICU selects real plural categories and formats numbers and dates',()=>{
 const pattern='{count, plural, =0 {None} one {# item} other {# items}}';assert.equal(formatMessage(pattern,{count:0},'en'),'None');assert.equal(formatMessage(pattern,{count:1},'en'),'1 item');assert.equal(formatMessage(pattern,{count:3},'en'),'3 items');
 assert.equal(formatMessage('{count, plural, one {one} few {few} many {many} other {other}}',{count:2},'ru'),'few');
 assert.equal(formatMessage('{n, number}',{n:1234.5},'de'),'1.234,5');
 assert.ok(formatMessage('{date, date, short}',{date:new Date('2026-09-08T00:00:00Z')},'en').length>0);
 assert.equal(formatMessage('{state, select, open {Open} other {Closed}}',{state:'open'},'en'),'Open');
});

test('lists use locale punctuation and external names keep bidi isolation',()=>{
 assert.equal(formatList(['A','B','C'],'en'),'A, B, C');
 assert.equal(isolate('Player <1>'),'\u2068Player <1>\u2069');
});
