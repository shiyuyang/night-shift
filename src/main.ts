import {t,setLocale,getLocale,stageName,type MessageKey} from './i18n';
import {lessons,type Lesson} from './runtime/tutorial';
import {campaign} from './campaign';
import {makeLevel} from './levels';
import {roundRules} from './run-rules';
import {bootGame,type Command} from './endless';
import {Ambience} from './ambience';
import commandCatalog from '../game/commands.json' with {type:'json'};
import './style.css';
import './game-ui.css';
import './immersive.css';
import './presentation.css';
import './hud-feedback.css';
import './watch-desk.css';
import './field-hud.css';
import './result-screen.css';
import './tutorial-ui.css';
import {drawSurvey} from './ui/survey';
import {fitDesk} from './ui/fit-desk';
const DEV=(import.meta as unknown as {env:{DEV:boolean}}).env.DEV;
const $=(selector:string)=>document.querySelector<HTMLElement>(selector)!;
const pixelIcon=(path:string)=>`<svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="${path}"/></svg>`;
const flash=pixelIcon('M10 2h7l-5 8h6L7 23l3-10H5z');
const decoy=pixelIcon('M10 3h4v3h3v10h3v2H4v-2h3V6h3zM10 20h4v2h-4z');
const bandage=pixelIcon('M3 6H8V2H16V6H21V21H3zM10 4V6H14V4zM10 9V12H7V15H10V18H14V15H17V12H14V9z').replace('<path ', '<path fill-rule="evenodd" ');
const key=pixelIcon('M3 4h8v2h2v5h8v3h-2v4h-2v-4h-4v-1h-2v2H3v-2H1V6h2zM4 7v5h6V7z');
const segments=(id:string,count=10)=>`<span id="${id}" class="pixel-segments" role="progressbar" aria-valuemin="0" aria-valuemax="100">${'<i></i>'.repeat(count)}</span>`;
const slots=[['F','闪光器',flash,'flash-count'],['R','诱饵',decoy,'decoy-count'],['Q','绷带',bandage,'bandage-count']];
document.querySelector('#app')!.innerHTML=`<main><div class="workspace console-closed"><section class="left"><div class="game-wrap" id="game-wrap"><div id="game"></div><div class="game-vignette"></div>
<div id="play-hud"><div class="screen-heading"><span id="night-name">夜班档案</span><nav>${DEV?'<button id="console-toggle" aria-expanded="false">开发控制</button>':''}<button id="pause" aria-expanded="false" aria-controls="pause-menu">菜单 · Esc</button></nav></div>
<div class="game-hud"><span>● REC</span><span id="timer">00:00</span></div><div class="location"><b></b></div><div id="game-message" aria-live="polite"></div>
<div class="game-bottom status-panel"><div class="vital-row"><span>生命 <b id="health">100</b></span><span id="health-bar" class="solid-health" role="progressbar" aria-label="生命值" aria-valuemin="0" aria-valuemax="100"><span class="health-loss" aria-hidden="true"></span><span class="health-fill" aria-hidden="true"></span></span><small id="health-caption">稳定</small></div><div class="vital-row"><span>体力 <b id="stamina">100</b></span>${segments('stamina-bar')}<small id="stamina-caption">可疾跑</small></div><button id="flashlight-toggle" type="button" aria-label="开关手电（T）" aria-pressed="true"><svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" d="M7 2H17V5H19V10H17V22H7V10H5V5H7ZM9 11V20H15V11ZM8 5V8H16V5Z"/><path class="torch-ray" fill="currentColor" d="M1 1H3V4H1ZM21 1H23V4H21Z"/></svg><span class="flashlight-heading">手电电量</span><span class="flashlight-charge"><b id="battery">100</b>%</span><span id="flashlight-mode">开启 · 120 秒</span></button><div class="minor-status"><span>保险丝 <b id="fuses">0 / 3</b></span></div></div>
<div id="vital-distress" aria-hidden="true"></div><section id="power-countdown" hidden role="timer" aria-label="出口供电倒计时"><small id="power-label">应急供电正在接通</small><b id="power-seconds">08</b>${segments('power-progress',8)}<span id="power-hint">保持移动</span></section>
<div class="inventory-hud" aria-label="随身道具">${slots.map(([binding,label,icon,id])=>`<button class="item-slot" data-item="${binding}" title="${binding} · ${label}" aria-label="使用${label}"><kbd>${binding}</kbd>${icon}<span>${label}</span><b id="${id}">0</b></button>`).join('')}<div class="item-slot key-slot" title="持有的专用钥匙">${key}<span id="key-label">钥匙</span><b id="key-count">0</b></div></div>
<div class="phase-hud"><span id="run-phase">搜寻</span><span id="objective"></span></div>
</div><div class="start-layer" id="start-layer">
<div class="desk-scene" aria-hidden="true"></div><div class="desk-interference" aria-hidden="true"></div>
<div class="desk-content"><div class="desk-title"><span class="desk-kicker">圣艾格尼斯医院 / 夜间值守</span><h2>夜班尚未结束<span>。</span></h2><p>交班的人，一直没有来。</p></div>
<section class="patrol-book" aria-label="巡查档案"><div class="book-header"><span>夜间巡查记录簿</span><span id="stage-progress"></span></div><nav class="book-tabs"><button id="book-guide"></button><button id="desk-settings"></button><label for="menu-language" id="language-label"></label><select id="menu-language" aria-labelledby="language-label"><option value="zh-CN">简体中文</option><option value="en">English</option></select></nav>
<div class="book-body"><div class="archive-index"><div class="index-label">编号 / 巡查区域</div><div class="night-select" id="stage-list"></div><div class="stage-pages"><button id="stage-prev" aria-label="上一页档案">←</button><span id="stage-page"></span><button id="stage-next" aria-label="下一页档案">→</button></div></div>
<div class="archive-sheet"><span class="file-code" id="file-code"></span><h3 id="file-title"></h3><div class="survey-frame"><canvas id="survey" width="240" height="144" aria-label="所选区域监控留档"></canvas><span>监控留档 / 非实时画面</span></div><p id="file-note"></p><p id="stage-detail"></p><span class="file-stamp" id="file-stamp"></span></div></div>
<div class="book-footer"><button id="start" disabled>正在调阅档案…</button></div></section>
<div class="desk-footnote"><span>不要回应走廊里的呼唤。</span><span class="desk-clock">02:17</span></div></div>
<div class="monitor-caption" aria-hidden="true"><i></i> CAM 04 · 信号不稳定<span>02:17 / 值班室</span></div></div>
<section id="pause-menu" hidden aria-label="游戏菜单"><h2>值班记录</h2><button id="resume">返回游戏</button><button id="guide">操作与生存手册</button><button id="sound">♫ 声音开启</button><label><span id="volume-label">音量</span> <input id="music-volume" type="range" min="0" max="100" value="42" aria-label="配乐音量"></label><small id="music-track">配乐：夜班接待室</small><small id="music-status">点击开始后播放配乐</small><button id="fullscreen">浏览器全屏</button><button id="menu-stages">返回选关</button><p id="round-rule"></p></section>
<section id="tutorial-card" hidden role="dialog" aria-modal="true" aria-labelledby="tutorial-title"><small>值班手册 / 现场指导 · 已暂停</small><h2 id="tutorial-title"></h2><p id="tutorial-copy"></p><div><button id="tutorial-continue">知道了，试一下</button><button id="tutorial-practice-skip" hidden>等受伤后再学</button><button id="tutorial-skip">跳过本次引导</button></div></section><section id="result-screen" hidden aria-labelledby="result-title"><div class="result-document"><div class="document-head" id="result-kicker">夜间巡逻档案</div><h2 id="result-title"></h2><section id="run-result" hidden></section><div class="result-actions"><button id="next-night" hidden>下一关</button><button id="result-retry">重试本关</button><button id="result-menu">返回选关</button></div></div></section>
<div class="threat-screen" id="threat-screen" aria-hidden="true"></div><div class="danger-flash" id="flash" aria-hidden="true"><i></i><i></i><i></i></div></div></section>
${DEV?`<aside class="interaction"><div class="panel-heading"><h2>开发控制</h2><small>仅开发构建可见</small></div><div class="gift-list">${commandCatalog.map(c=>`<button class="gift-card" data-command="${c.id}"><div class="gift-icon">${c.icon}</div><div class="gift-copy"><h3>${c.label} · ${c.kind==='buff'?'增益':'减益'}</h3><p>${c.description}</p></div></button>`).join('')}</div></aside>`:''}</div></main>
<dialog id="guide-dialog"><h2>活着离开。</h2><p>WASD / 方向键移动，Shift 疾跑，E 拾取、开箱、开关门。疾跑消耗体力，耗尽后恢复到 30% 才能再跑。</p><p>F 闪光击退近处怪物，R 放下诱饵后离开，Q 绷带恢复 40 生命。也可点击画面下方道具使用。钥匙各有对应的门或箱子，首次开锁消耗。</p><p>T 开关手电，也可点击右上角的手电电量。普通关卡满电可照明 120 秒，关灯或藏身停止耗电。暗处只能辨认脚下，手电可照清前方；固定灯具附近可借光搜寻。</p><p>每次开箱都会提高警戒。最后一枚保险丝启动出口供电，8 秒后可逃生，期间可以移动。听声者在远处会丢失你的踪迹；畏光者被手电照射减速；所有怪物均受墙、家具和关闭的门阻挡。</p><p>第二关起基础携带闪光、诱饵、绷带各 1 个（补给关多 1 个闪光）。带十字的矮药柜按 E 领取一次补给；带人形标牌的高柜按 E 藏身，最多 8 秒。被怪物看见时不能藏入，先用闪光或诱饵拉开距离。普通床、货架和机器只是障碍与装饰。</p><button id="close-guide">返回菜单</button></dialog><dialog id="puzzle-dialog" hidden></dialog><div id="toast" role="status"></div>`;
fitDesk($('#start-layer'),$('.desk-content'));
const fieldBelt=document.createElement('div');fieldBelt.className='field-belt';fieldBelt.setAttribute('aria-label','快捷道具');$('#play-hud').append(fieldBelt);fieldBelt.append($('.inventory-hud'));
const mission=document.createElement('section');mission.id='mission-hud';mission.setAttribute('aria-label','撤离物资');mission.innerHTML='<small>撤离准备</small>';mission.append($('.minor-status'),$('.key-slot'),$('#flashlight-toggle'));$('#play-hud').append(mission);
$('.status-panel').insertAdjacentHTML('afterbegin','<small class="monitor-label">生命监测 <i aria-hidden="true"></i></small>');
const receipt=document.createElement('section');receipt.id='receipt-message';receipt.hidden=true;receipt.setAttribute('role','status');$('#play-hud').append(receipt);
let environmentMessage='';let receiptMessage='';
function renderMessage(){
 for(const [selector,text] of [['#game-message',environmentMessage],['#receipt-message',receiptMessage]]){
  const el=$(selector);el.hidden=!text;if(el.dataset.copy===text)continue;el.dataset.copy=text;el.replaceChildren();
  if(selector==='#receipt-message'){const mark=document.createElement('div');mark.className='receipt-mark';mark.innerHTML=text.includes('闪光器')?flash:text.includes('诱饵')?decoy:text.includes('绷带')?bandage:pixelIcon('M8 2h8v3h2v14h-2v3H8v-3H6V5h2zM9 6h6v12H9z');mark.setAttribute('aria-hidden','true');el.append(mark);}
  const lines=text.split('\n'),copy=document.createElement('div');copy.className='message-copy';const title=document.createElement('span');title.className='message-title';title.textContent=lines[0];copy.append(title);
  if(lines.length>1){const detail=document.createElement('span');detail.className='message-detail';detail.textContent=lines.slice(1).join(' ');copy.append(detail);}el.append(copy);
 }
}
let previousHealth=100;let lastFeedbackTime=0;let barHealth=100;let teaching:Lesson|null=null;let giftQueue:{command:Command;viewer:string}[]=[];let nextGiftAt=0;let running=false,paused=false,audioOn=true,selectedNight=campaign.unlocked,stagePage=Math.floor((selectedNight-1)/6),toastTimer:ReturnType<typeof setTimeout>;
document.body.dataset.ui='title';
const ambience=new Ambience();
let currentTrack='menu',currentChase=false;
const trackNames:Record<string,string>={menu:'夜班接待室',ward:'病房 · 夜巡', 'ward-alt':'病房 · 隔离区',warehouse:'药库 · 空货架','warehouse-alt':'药库 · 玻璃回声',plant:'机房 · 电流','plant-alt':'机房 · 故障管道'};
ambience.onTrack=(id,chasing)=>{currentTrack=id;currentChase=chasing;$('#music-track').textContent=t('audio.track',{name:trackNames[id]?t(('music.'+id) as MessageKey):id})+(chasing?t('audio.chase'):'');$('#music-track').dataset.track=id;};
function toast(text:string){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),2500);}
const game=bootGame({onReady(){$('#start').removeAttribute('disabled');},onMonitor(){},onPuzzle(){},onCue(kind,pan){ambience.cue(kind,pan);},onState(s){
 receiptMessage=s.feedback.receipt?.text??'';renderMessage();
 const flashlight=$('#flashlight-toggle'),lightMode=s.flashlightBlocked?'藏身遮光':s.battery<=0?'电量耗尽':!s.flashlightOn?'T 开启 · 已关灯':s.battery<=20?`T 开关 · 仅剩 ${s.lightSeconds} 秒`:`T 开关 · 剩余 ${s.lightSeconds} 秒`;$('#flashlight-mode').textContent=lightMode;flashlight.setAttribute('aria-pressed',String(s.flashlightOn));flashlight.setAttribute('aria-label',`手电 ${Math.ceil(s.battery)}%，${lightMode}，按 T 或点击切换`);flashlight.dataset.empty=String(s.battery<=0);flashlight.dataset.low=String(s.battery>0&&s.battery<=20);flashlight.dataset.blocked=String(s.flashlightBlocked);
 const changed=teaching!==s.tutorial;teaching=s.tutorial;$('#tutorial-card').hidden=!teaching||(teaching==='exit'&&s.exitTour!=='hold');document.body.classList.toggle('teaching',!!teaching);document.querySelectorAll('.tutorial-target').forEach(e=>e.classList.remove('tutorial-target'));if(teaching){const lesson=lessons[teaching];$('#tutorial-title').textContent=lesson.title;$('#tutorial-copy').textContent=teaching==='exit'?t('tutorial.exitText'):lesson.text;if(teaching==='exit')$('#tutorial-title').textContent=t('tutorial.exitTitle');if(teaching==='health'||teaching==='flashlight'){$('#tutorial-title').textContent=t(('tutorial.'+teaching+'Title') as MessageKey);$('#tutorial-copy').textContent=t(('tutorial.'+teaching+'Text') as MessageKey);}$('#tutorial-continue').textContent=teaching==='exit'?t('tutorial.exitReturn'):teaching==='practice'?'模拟轻伤，练习包扎':'知道了，试一下';$('#tutorial-practice-skip').hidden=teaching!=='practice';const target=lesson.target;if(target!=='world')document.querySelector(target==='stamina'?'.game-bottom':target==='key'?'.key-slot':target==='health'?'#health-bar':target==='light'?'#flashlight-toggle':`[data-item="${target}"]`)?.classList.add('tutorial-target');if(changed){$('#tutorial-continue').focus({preventScroll:true});ambience.setRunning(false);}}else if(changed){nextGiftAt=s.elapsed+3;ambience.setRunning(running&&!paused);}if(!teaching&&!s.tutorialPracticing&&running&&!paused&&giftQueue.length&&s.elapsed>=nextGiftAt){const gift=giftQueue.shift()!;nextGiftAt=s.elapsed+3;queueMicrotask(()=>receive(gift.command,gift.viewer));}
 document.body.dataset.frozen=String(paused||!!teaching||!running);
 const dt=Math.max(0,s.elapsed-lastFeedbackTime);if(s.elapsed<lastFeedbackTime){barHealth=s.health;previousHealth=s.health;}lastFeedbackTime=s.elapsed;barHealth=s.health>barHealth?Math.min(s.health,barHealth+dt*65):s.health;
 for(const [id,value] of [['stamina-bar',s.stamina],['power-progress',(8-s.exitStartup)/8*100]] as const){const bar=$('#'+id),cells=bar.children;bar.setAttribute('aria-valuenow',String(Math.round(value)));for(let i=0;i<cells.length;i++){(cells[i] as HTMLElement).dataset.filled=String(i<Math.ceil(value/100*cells.length));}}
 const healthBar=$('#health-bar');healthBar.setAttribute('aria-valuenow',String(Math.ceil(s.health)));
 const healthColumns=Math.ceil(Math.max(0,Math.min(100,barHealth))*60/100),lossColumns=Math.ceil(Math.max(0,Math.min(100,s.feedback.damage>0?Math.max(s.health,previousHealth):s.health))*60/100);
 healthBar.style.setProperty('--health-fill',`${healthColumns/60*100}%`);healthBar.style.setProperty('--health-loss',`${lossColumns/60*100}%`);

 if(s.feedback.damage===0)previousHealth=s.health;
 $('.status-panel').dataset.danger=String(s.health<=30);$('.status-panel').dataset.healing=String(s.feedback.heal>0);$('#health-caption').textContent=s.feedback.heal>0?`恢复 +${s.feedback.healAmount}`:s.health<=30?'失血危险':s.health<60?'负伤':'稳定';$('.status-panel').dataset.staminaActive=String(s.stamina<100||s.exhausted||!!s.tutorial);$('#stamina-caption').textContent=s.exhausted?'需要喘息':s.stamina<30?'体力不足':'可疾跑';$('#stamina-bar').dataset.low=String(s.stamina<30);$('#vital-distress').style.opacity=String(running&&!paused&&!teaching?Math.max(s.health<=30?.4:0,s.feedback.damage*.9):0);$('#vital-distress').dataset.side=s.feedback.hitSide;
 const power=s.exitStartup>0||s.feedback.exitReady>0;$('#power-countdown').hidden=!power||!!teaching||!running;$('#power-countdown').dataset.urgent=String(s.exitStartup>0&&s.exitStartup<=3);$('#power-countdown').dataset.ready=String(s.exitStartup===0);$('#power-countdown').dataset.beat=String(Math.floor(s.elapsed*5)%2);$('#power-seconds').textContent=s.exitStartup>0?String(Math.ceil(s.exitStartup)).padStart(2,'0'):'OPEN';$('#power-label').textContent=s.exitStartup>0?'应急供电正在接通':'出口已通电';$('#power-hint').textContent=s.exitStartup>0?'保持移动 · 准备撤离':'前往 EXIT · 按 E 逃生';
 for(const binding of ['F','R','Q'] as const){const slot=document.querySelector<HTMLElement>(`[data-item="${binding}"]`)!;slot.dataset.used=String(s.feedback.used[binding]>0);slot.dataset.available=String(binding==='Q'?s.health<100&&s.bandages>0:false);}
 $('#health').textContent=String(Math.ceil(s.health));$('#battery').textContent=String(Math.ceil(s.battery));$('#fuses').textContent=`${s.fuses} / 3`;$('#stamina').textContent=String(Math.ceil(s.stamina));$('#stamina').dataset.low=String(s.stamina<30);$('#run-phase').textContent=s.phase;$('#objective').textContent=s.objective;$('#round-rule').textContent=s.rule+' ｜ 生命 '+Math.ceil(s.health)+' / 100 · 体力 '+Math.ceil(s.stamina)+' / 100';$('#night-name').textContent=`第 ${s.night} 关 · ${s.map}`;$('.location>b').textContent=s.map;
 $('#flash-count').textContent=String(s.flashes);$('#decoy-count').textContent=String(s.decoys);$('#bandage-count').textContent=String(s.bandages);$('#key-count').textContent=String(s.keyCount);$('#key-label').textContent=s.keyNames||'钥匙';for(const [binding,count] of [['F',s.flashes],['R',s.decoys],['Q',s.bandages]] as const)document.querySelector<HTMLButtonElement>(`[data-item="${binding}"]`)!.disabled=count===0;
 for(const binding of ['F','R','Q'] as const)$(`[data-item="${binding}"]`).dataset.received=String(s.feedback.received[binding]>0);
 $('#timer').textContent=`${Math.floor(s.elapsed/60).toString().padStart(2,'0')}:${Math.floor(s.elapsed%60).toString().padStart(2,'0')}`;$('#threat-screen').style.opacity=String(running&&!paused&&!teaching?s.pressure:0);ambience.setScene(running?s.theme:-2,running?s.pressure:0,running?s.exitStartup:0,s.night,running?s.fuses:0);
},onMessage(text){environmentMessage=text;renderMessage();},onHit(){$('#flash').classList.remove('hit');void $('#flash').offsetWidth;$('#flash').classList.add('hit');},onEnd(result){
 running=false;paused=false;selectedNight=result.night;$('#pause-menu').hidden=true;$('#pause').setAttribute('aria-expanded','false');$('#result-screen').hidden=false;$('#result-screen').dataset.outcome=result.won?'won':'lost';$('#game-wrap').classList.add('run-ended');$('#result-kicker').textContent=result.won?'生还记录 / 本层结束':'失联记录 / 无人应答';$('#result-title').textContent=result.won?'你逃出了这一层。':'巡逻信号已中断。';$('#run-result').hidden=false;$('#run-result').innerHTML=`<h3>第 ${result.night} 关 · ${result.map}</h3><div class="result-stats"><span><b>${Math.floor(result.elapsed)} 秒</b>值班用时</span><span><b>${Math.ceil(result.health)}</b>剩余生命</span><span><b>${result.fuses} / 3</b>保险丝</span></div>${result.night>1?`<p>额外搜寻 ${result.rogue.cachesOpened} 次 · 藏身 ${result.rogue.hides} 次</p>`:''}`;$('#next-night').hidden=!result.won;$('#next-night').textContent=`进入第 ${result.night+1} 关 →`;$('#threat-screen').style.opacity='0';$('#flash').classList.remove('hit');ambience.setScene(-2,0,0);ambience.setRunning(true);$(result.won?'#next-night':'#result-retry').focus({preventScroll:true});
}});
function menu(open:boolean){if(teaching)return;$('#pause-menu').hidden=!open;$('#pause').setAttribute('aria-expanded',String(open));if(running){paused=open;game.setPaused(open);ambience.setRunning(!open);}if(open&&DEV)$('.workspace').classList.add('console-closed');}
function enterAudio(){if(audioOn){ambience.setRunning(true);void ambience.setEnabled(true).catch(()=>toast('点击菜单中的声音按钮重试'));}}
function start(){giftQueue=[];if(!campaign.canPlay(selectedNight))return;document.body.dataset.ui='playing';$('#start-layer').classList.add('hidden');$('#result-screen').hidden=true;$('#game-wrap').classList.remove('run-ended');running=true;menu(false);ambience.beginRun(makeLevel(selectedNight).theme,selectedNight);game.startRun(selectedNight);enterAudio();}
$('#flashlight-toggle').onclick=()=>game.toggleFlashlight();let signing=false;$('#start').onclick=()=>{if(signing)return;signing=true;enterAudio();$('.patrol-book').classList.add('signing');$('#file-stamp').textContent=t('menu.signed');setTimeout(()=>{signing=false;$('.patrol-book').classList.remove('signing');start();},420);};$('#result-retry').onclick=start;
$('#pause').onclick=()=>menu($('#pause-menu').hidden);$('#resume').onclick=()=>menu(false);
$('#book-guide').onclick=()=>document.querySelector<HTMLDialogElement>('#guide-dialog')!.showModal();
$('#guide').onclick=()=>document.querySelector<HTMLDialogElement>('#guide-dialog')!.showModal();$('#close-guide').onclick=()=>document.querySelector<HTMLDialogElement>('#guide-dialog')!.close();
$('#sound').onclick=()=>{audioOn=!audioOn;void ambience.setEnabled(audioOn).catch(()=>toast('音频未能开启，请重试'));};ambience.onStatus=status=>{$('#music-status').dataset.status=status;$('#music-status').textContent=audioStatus(status);audioOn=ambience.enabled;$('#sound').textContent=t(audioOn?'settings.soundOn':'settings.soundOff');};$('#music-volume').oninput=e=>ambience.setVolume(Number((e.target as HTMLInputElement).value)/100);$('#desk-settings').onclick=()=>menu(true);$('#start-layer').addEventListener('pointerdown',()=>{if(audioOn)enterAudio();},{once:true});
$('#fullscreen').onclick=()=>{if(document.fullscreenElement)void document.exitFullscreen();else void $('#game-wrap').requestFullscreen().catch(()=>toast('当前浏览器不支持全屏'));};
function renderStages(){
 const pages=Math.ceil((campaign.unlocked+1)/6);stagePage=Math.max(0,Math.min(stagePage,pages-1));
 $('#stage-progress').textContent=t('menu.archive',{count:String(campaign.unlocked-1).padStart(2,'0')});
 $('#stage-list').innerHTML=Array.from({length:6},(_,i)=>{const n=stagePage*6+i+1;return `<button data-night="${n}" ${campaign.canPlay(n)?'':'disabled'} class="${n===selectedNight?'selected':''}" aria-pressed="${n===selectedNight}"><span class="stage-number">${String(n).padStart(2,'0')}</span><b>${stageName(makeLevel(n).theme)}</b><small>${t(n<campaign.unlocked?'menu.filed':campaign.canPlay(n)?'menu.available':'menu.locked')}</small></button>`;}).join('');
 $('#stage-page').textContent=t('menu.page',{page:String(stagePage+1).padStart(2,'0'),total:String(pages).padStart(2,'0')});
 $('#stage-prev').toggleAttribute('disabled',stagePage===0);$('#stage-next').toggleAttribute('disabled',stagePage>=pages-1);
 const rule=roundRules(selectedNight),level=makeLevel(selectedNight);
 $('#file-code').textContent=t('menu.record',{number:String(selectedNight).padStart(3,'0')});$('#file-title').textContent=stageName(level.theme);
 $('#file-note').textContent=t(('note.'+level.theme) as MessageKey);
 $('#stage-detail').textContent=t('menu.anomaly',{threat:t(('threat.'+rule.threat) as MessageKey),event:t(('event.'+rule.event) as MessageKey)});
 $('#file-stamp').textContent=t(selectedNight<campaign.unlocked?'menu.complete':'menu.pending');
 $('#file-stamp').dataset.complete=String(selectedNight<campaign.unlocked);
 $('#start').textContent=t('menu.start',{number:selectedNight});
 drawSurvey(document.querySelector<HTMLCanvasElement>('#survey')!,level);
 document.querySelectorAll<HTMLButtonElement>('[data-night]').forEach(b=>b.onclick=()=>{selectedNight=Number(b.dataset.night);renderStages();document.querySelector<HTMLButtonElement>(`[data-night="${selectedNight}"]`)?.focus({preventScroll:true});ambience.setScene(-2,0,0);});
}
function title(){ambience.setScene(-2,0,0);giftQueue=[];running=false;paused=false;game.setPaused(true);menu(false);document.body.dataset.ui='title';$('#result-screen').hidden=true;$('#game-wrap').classList.remove('run-ended');$('#start-layer').classList.remove('hidden');selectedNight=campaign.unlocked;stagePage=Math.floor((selectedNight-1)/6);renderStages();ambience.setRunning(true);}
$('#menu-stages').onclick=title;$('#result-menu').onclick=title;$('#stage-prev').onclick=()=>{stagePage--;turnPage();};$('#stage-next').onclick=()=>{stagePage++;turnPage();};applyMenuLanguage();
$('#next-night').onclick=()=>{if(!game.continueRun())return;ambience.beginRun(makeLevel(selectedNight+1).theme,selectedNight+1);running=true;paused=false;document.body.dataset.ui='playing';$('#result-screen').hidden=true;$('#game-wrap').classList.remove('run-ended');ambience.setRunning(true);};
document.querySelectorAll<HTMLButtonElement>('[data-item]').forEach(b=>b.onclick=()=>{if(running&&!paused)game.useItem(b.dataset.item as 'F'|'R'|'Q');b.blur();});
function receive(command:Command,viewer:string){if(teaching){if(giftQueue.length<8)giftQueue.push({command,viewer});return;}if(!running||paused)return;game.command(command);const entry=commandCatalog.find(c=>c.id===command);if(entry)toast(`${viewer} · ${entry.label}`);}
if(DEV){$('#console-toggle').onclick=()=>{const closed=$('.workspace').classList.toggle('console-closed');$('#console-toggle').setAttribute('aria-expanded',String(!closed));};document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(b=>b.onclick=()=>{receive(b.dataset.command as Command,'测试观众');b.disabled=true;setTimeout(()=>b.disabled=false,800);});}
// The Vite webhook is a local test adapter; production requires an explicit event endpoint.
const eventsUrl=(import.meta as unknown as {env:{VITE_EVENTS_URL?:string}}).env.VITE_EVENTS_URL;
let stream:EventSource|undefined;
if(DEV||eventsUrl){stream=new EventSource(eventsUrl||'/api/events');stream.onmessage=e=>{try{const data=JSON.parse(e.data);if(commandCatalog.some(c=>c.id===data.command)&&typeof data.viewer==='string')receive(data.command,data.viewer);}catch{}};}
window.addEventListener('keydown',e=>{if(teaching){if(e.key==='Escape')e.preventDefault();return;}if(e.key==='Escape'&&!document.querySelector('dialog[open]')){if(DEV&&!$('.workspace').classList.contains('console-closed')){$('#console-toggle').click();return;}menu($('#pause-menu').hidden);}if(e.key.toLowerCase()==='j'&&!e.repeat){menu(true);document.querySelector<HTMLDialogElement>('#guide-dialog')!.showModal();}});
window.addEventListener('pagehide',()=>{stream?.close();ambience.dispose();},{once:true});

$('#tutorial-continue').onclick=()=>game.resumeTutorial();$('#tutorial-practice-skip').onclick=()=>game.resumeTutorial(false);$('#tutorial-skip').onclick=()=>game.skipTutorial();

function audioStatus(status:string){return t(status==='配乐已就绪'?'audio.ready':status==='配乐载入中'?'audio.loading':status.includes('失败')?'audio.failed':status==='声音关闭'?'settings.soundOff':'audio.waiting');}
function turnPage(){renderStages();const book=$('.patrol-book');book.classList.remove('turning');void book.offsetWidth;book.classList.add('turning');}
function applyMenuLanguage(){
 setLocale(getLocale());document.title=t('menu.title');
 const labels:Record<string,MessageKey>={'.desk-kicker':'menu.hospital','.desk-title h2':'menu.title','.desk-title p':'menu.subtitle','.book-header>span:first-child':'menu.book','.index-label':'menu.index','.survey-frame>span':'menu.sketch','.desk-footnote>span:first-child':'menu.warning','#desk-settings':'menu.settings','#book-guide':'menu.guide','#language-label':'menu.language','#pause-menu h2':'settings.title','#resume':'settings.resume','#guide':'settings.guide','#volume-label':'settings.volume','#fullscreen':'settings.fullscreen','#menu-stages':'settings.stages','#guide-dialog h2':'guide.title','#close-guide':'guide.close'};
 for(const [selector,key] of Object.entries(labels))$(selector).textContent=t(key);
 $('#stage-prev').setAttribute('aria-label',t('menu.previous'));$('#stage-next').setAttribute('aria-label',t('menu.next'));$('.patrol-book').setAttribute('aria-label',t('menu.book'));$('#pause-menu').setAttribute('aria-label',t('settings.title'));
 $('.monitor-caption').textContent=t('menu.desk');
 document.querySelectorAll('#guide-dialog p').forEach((el,i)=>el.textContent=t(('guide.'+(i+1)) as MessageKey));
 $('#sound').textContent=t(audioOn?'settings.soundOn':'settings.soundOff');$('#music-status').textContent=audioStatus($('#music-status').dataset.status??'');ambience.onTrack(currentTrack,currentChase);
 (document.querySelector('#menu-language') as HTMLSelectElement).value=getLocale();renderStages();
}
$('#menu-language').onchange=()=>{setLocale((document.querySelector('#menu-language') as HTMLSelectElement).value==='en'?'en':'zh-CN');applyMenuLanguage();};
