import Phaser from 'phaser';
import { Progression, type Night } from './progression';
import { registerAtlas, directionRow } from './art';
import { feetAt, moveWithCollision, gaitFrame } from './collision';
import { WardEvents } from './ward-events';
import { shadowHull } from './lighting';
export type Command='blackout'|'ghost'|'battery'|'sanctuary';
interface State{pressure:number;health:number;battery:number;fuses:number;elapsed:number;fear:number;noise:number;inventory:string;objective:string;night:Night}
export interface RunResult {won:boolean;night:Night;elapsed:number;health:number;fuses:number;cabinet:boolean;barrier:boolean;powered:boolean}
interface Hooks{onMonitor:(feed:string,bell:boolean)=>void;onState:(s:State)=>void;onMessage:(m:string)=>void;onEnd:(result:RunResult)=>void;onHit:()=>void;onReady:()=>void;onPuzzle:(clue:string)=>void;onCue:(kind:string,pan?:number)=>void}
const W=960,H=576;
export function bootGame(hooks:Hooks){
 class Hospital extends Phaser.Scene{
  playerSprite!:Phaser.GameObjects.Image; playerLegs!:Phaser.GameObjects.Image; walkDistance=0; playerWalking=false; monsterSprite!:Phaser.GameObjects.Image;
  playerShadow!:Phaser.GameObjects.Image; monsterShadow!:Phaser.GameObjects.Image;
  props: {image:Phaser.GameObjects.Image,x:number,y:number,w:number,h:number}[]=[]; furniture:Phaser.Geom.Rectangle[]=[];
  player!:Phaser.GameObjects.Container; ghost!:Phaser.GameObjects.Container; dark!:Phaser.GameObjects.Graphics; effects!:Phaser.GameObjects.Graphics;
  keys!:Record<string,Phaser.Input.Keyboard.Key>; state:State={pressure:0,health:100,battery:100,fuses:0,elapsed:0,fear:8,noise:0,inventory:'',objective:'',night:1};activeRun=false;paused=false;blackout=0;protection=0;ghostTime=0;hitTime=0;facing=1;hudTick=0;
  items:Phaser.GameObjects.Container[]=[]; walls:Phaser.Geom.Rectangle[]=[];
  progression = new Progression();
  wardEvents=new WardEvents(); monitorOpen=false; extraBed!:Phaser.GameObjects.Image; bedEvidence!:Phaser.GameObjects.Graphics;
  barrier!: Phaser.GameObjects.Graphics;
  details!: Phaser.GameObjects.Graphics;
  darkness!: Phaser.Textures.CanvasTexture;
  lantern!: Phaser.GameObjects.Image;
  angle = 0; stepTime = 0; ambienceTime = 0; ghostCooldown = 0; lureTime = 0; lure = {x:0,y:0};
  warningSeen=false; warningAt=-1; scareAt=-1; scareUntil=0; scareCount=0; scareFace!:Phaser.GameObjects.Image;
  apparition!:Phaser.GameObjects.Image; sawApparition=false; apparitionUntil=0;
  message = ''; messageUntil = 0; frame = 0; interactQueued = false; puzzleOpen = false; puzzleCommands = new Set<Command>();
  preload(){this.load.image('watchman','/assets/watchman-sheet-v4.png');this.load.image('patient','/assets/patient-sheet-v4.png');this.load.image('bed-v4','/assets/bed-overhead-v4.png');}
  create(){
   const watchmanHeight=registerAtlas(this,'watchman',4,4,false),patientHeight=registerAtlas(this,'patient',4,4,false);registerAtlas(this,'bed-v4',1,1);
   const g=this.add.graphics();const rect=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
   // Authored clusters: restrained tile variation, no photo noise at gameplay scale.
   for(let y=96;y<508;y+=24)for(let x=36;x<924;x+=24){const corridor=y>=288&&y<360,n=(x/24*13+y/24*7)%9;rect(x,y,24,24,corridor?0x202225:0x1a2023);rect(x+1,y+1,22,22,n<3?(corridor?0x2d2e30:0x252b2d):(corridor?0x282b2d:0x20272a));rect(x+2,y+2,20,1,0x373b3d);if(n===0){rect(x+6,y+15,6,1,0x202c28);rect(x+11,y+16,2,2,0x202c28);}if(n===4)rect(x+18,y+4,3,2,0x303638);}

   const wall=(x:number,y:number,w:number,h:number)=>{this.walls.push(new Phaser.Geom.Rectangle(x,y,w,h));rect(x,y,w,h,0x182720);for(let yy=y;yy<y+h-8;yy+=12)for(let xx=x;xx<x+w;xx+=32){rect(xx+(yy%24?0:8),yy,Math.min(30,x+w-xx),10,yy%24?0x373638:0x303235);}rect(x,y+h-9,w,5,0x4b4948);rect(x,y+h-4,w,4,0x0b1b12);rect(x+2,y+2,w-4,2,0x64605a);};
   wall(22,61,916,36);wall(22,97,14,420);wall(924,97,14,420);wall(22,508,916,18);
   wall(36,263,190,26);wall(307,263,180,26);wall(580,263,139,26);wall(803,263,121,26);
   wall(342,97,17,88);wall(342,224,17,39);wall(650,97,17,81);wall(650,224,17,39);
   wall(265,362,18,146);wall(527,365,17,143);wall(758,361,17,147);
   const text=(x:number,y:number,s:string,size=10,color='#708574')=>this.add.text(x,y,s,{fontFamily:'monospace',fontSize:size,color,letterSpacing:2});
   // Fixed architectural wear: broad stains and deliberate pixel clusters, never photographic noise.
   for(const wall of this.walls){
    if(wall.width<70)continue;
    for(let i=0;i<Math.floor(wall.width/39);i++){const x=wall.x+12+i*39,y=wall.y+3;
     rect(x,y,8,Math.max(3,wall.height-9),0x333c31);rect(x+4,y+5,11,5,0x454b38);rect(x+7,y+8,3,Math.max(2,wall.height-17),0x303a2e);
     rect(x+19,y+2,9,3,0x55514b);rect(x+22,y+5,4,2,0x41413f);
    }
   }
   // Wall-mounted sealed observation windows; they don't create invisible floor obstacles.
   for(const x of [79,189,421,539,732,844]){rect(x,73,39,18,0x111b17);rect(x+2,75,35,12,0x070e0d);rect(x+3,76,1,9,0x82816a);rect(x+18,75,2,13,0x434e3e);rect(x+2,88,36,2,0x87836a);}
   // Damp grout islands and parallel wheel tracks lead to the ward, with the walking route intact.
   for(const [x,y]of [[152,330],[383,249],[560,368],[790,246]]){
    rect(x-17,y,47,7,0x1b2825);rect(x-24,y+7,64,11,0x182522);rect(x-9,y+18,38,4,0x22312b);rect(x-10,y+4,28,1,0x556153);
    for(let j=0;j<7;j++){rect(x+4,y+23+j*5,2,3,0x1c2723);rect(x+15,y+23+j*5,2,3,0x1c2723);}
   }
   for(const [x,y]of [[388,186],[693,182]]){this.furniture.push(new Phaser.Geom.Rectangle(x-3,y,28,66));rect(x,y,2,63,0x727966);rect(x+2,y+2,21,3,0x61615a);for(let k=0;k<5;k++){rect(x+2+k*4,y+5,4,48-k%2*3,k%2?0x2b3437:0x404b4b);}rect(x-3,y+64,10,2,0x202d26);}
   text(105,112,'WARD 01');text(425,112,'WARD 02');text(746,112,'ISOLATION');text(54,473,'RECEPTION',9);text(355,483,'PHARMACY',9);text(586,484,'STORAGE',9);
   const addSolid=(sprite:Phaser.GameObjects.Image,box:Phaser.Geom.Rectangle)=>{this.furniture.push(box);sprite.setDepth(2+box.bottom*.01);this.props.push({image:sprite,x:box.x,y:box.y,w:box.width,h:box.height});};
   for(const [x,y]of [[110,226],[223,226],[429,222],[563,222],[734,221],[863,221]]){
    const bed=this.add.image(x,y,'bed-v4',0).setOrigin(.5,1).setDisplaySize(42,84).setTint(0x91999e);
    addSolid(bed,new Phaser.Geom.Rectangle(x-21,y-84,42,84));
    g.fillStyle(0x0b1812,.5);g.fillRect(x-18,y,40,4);
   }
   this.extraBed=this.add.image(296,226,'bed-v4',0).setOrigin(.5,1).setDisplaySize(42,84).setTint(0x91999e).setDepth(4.26).setVisible(false);this.bedEvidence=this.add.graphics().setDepth(4.27);
   // Axis-aligned overhead cabinets and wheelchairs share the bed's camera and 1px accents.
   const cabinet=(x:number,y:number)=>{rect(x-23,y-34,46,34,0x111f1b);rect(x-21,y-32,42,29,0x343b3c);rect(x-20,y-31,40,3,0x555956);rect(x-19,y-24,38,19,0x293234);rect(x-17,y-7,34,2,0x4b5250);rect(x-4,y-5,8,2,0x858277);rect(x-13,y-29,5,5,0x7b6750);rect(x+10,y-28,4,5,0xb7b59a);this.furniture.push(new Phaser.Geom.Rectangle(x-23,y-34,46,34));};
   for(const [x,y]of [[105,412],[348,413],[453,412],[638,476],[846,414]])cabinet(x,y);
   const chair=(x:number,y:number)=>{rect(x-18,y-27,5,28,0x142320);rect(x+13,y-27,5,28,0x142320);rect(x-16,y-26,2,24,0x5b6260);rect(x+14,y-26,2,24,0x5b6260);rect(x-11,y-28,22,6,0x4b4140);rect(x-10,y-21,20,17,0x332e2e);rect(x-8,y-20,16,2,0x675b50);rect(x-12,y-19,3,21,0x515855);rect(x+9,y-19,3,21,0x515855);rect(x-8,y+2,6,4,0x677a65);rect(x+3,y+2,6,4,0x677a65);this.furniture.push(new Phaser.Geom.Rectangle(x-18,y-28,36,34));};
   for(const [x,y]of [[201,469],[471,467],[818,481]])chair(x,y);
   rect(480,124,32,24,0x1d2b26);rect(482,126,28,20,0x5d6a57);rect(485,129,22,14,0x1d2a24);for(const x of [488,495,502]){rect(x,132,3,7,0xbabd9b);rect(x,131,3,1,0x81775a);}this.furniture.push(new Phaser.Geom.Rectangle(480,124,32,24));
   rect(61,414,112,36,0x303a2d);rect(63,416,108,6,0x728166);rect(65,424,104,22,0x4a5b42);rect(78,411,23,17,0x737567);rect(81,412,17,12,0x192b28);rect(83,414,11,2,0x7b8f75);
   this.furniture.push(new Phaser.Geom.Rectangle(61,383,112,67));
   for(let i=0;i<30;i++){const x=50+(i*137)%850,y=302+(i*67)%188;rect(x,y,5+i%5,3, i%4===0?0x64705b:0x354c3b);}
   for(const [x,y]of [[156,260],[505,260],[742,260]]){rect(x,y,48,5,0x655c42);rect(x+4,y+5,3,5,0x7c7354);}
   for(const x of [165,494,790]){rect(x-21,278,42,6,0x151f1d);rect(x-17,280,34,2,0xcac7a0);rect(x-19,283,38,2,0x606753);}
   rect(889,302,32,57,0x284b36);rect(894,308,23,46,0x172d23);rect(898,331,3,3,0xbdca87);text(883,288,'EXIT',9,'#b4d987');
   text(362,326,'←  W E S T     ·     E A S T  →',8,'#506248');
   for(const [x,y]of [[311,128],[612,130],[865,445]]){rect(x,y,14,17,0x73806b);rect(x+6,y+3,3,11,0x314d37);rect(x+2,y+7,11,3,0x314d37);}
   this.items=[[239,233],[609,415],[848,235]].map(([x,y])=>{const item=this.add.container(x,y);const glow=this.add.graphics();glow.fillStyle(0xf5dfa1);glow.fillRect(-3,-6,6,12);glow.fillStyle(0x82986c);glow.fillRect(-4,-7,8,3);glow.fillRect(-4,4,8,3);item.add(glow);this.tweens.add({targets:item,alpha:.4,duration:1000,yoyo:true,repeat:-1});return item;});
   this.ghost=this.add.container(810,324).setVisible(false);
   this.monsterSprite=this.add.image(0,17,'patient',0).setOrigin(.5,.95).setScale(60/patientHeight);
   this.ghost.add(this.monsterSprite);
   this.scareFace=this.add.image(0,0,'patient',1).setOrigin(.5,.55).setScale(185/patientHeight).setTint(0xb28a81).setDepth(22).setVisible(false);
   this.apparition=this.add.image(793,223,'patient',1).setOrigin(.5,.95).setScale(60/patientHeight).setDepth(4.23).setTint(0x7d9186).setVisible(false);
   this.monsterShadow=this.add.image(810,342,'patient',0).setOrigin(.5,1).setTint(0x010506).setAlpha(.7).setScale(65/patientHeight,22/patientHeight).setDepth(.5).setVisible(false);
   this.player=this.add.container(458,323);
   this.playerLegs=this.add.image(0,16,'watchman',5).setOrigin(.5,.95).setScale(57/watchmanHeight);
   this.playerSprite=this.add.image(0,16,'watchman',5).setOrigin(.5,.95).setScale(57/watchmanHeight);this.playerSprite.setTint(0xb5bdc2);this.playerLegs.setTint(0xb5bdc2);this.player.add([this.playerLegs,this.playerSprite]);
   this.posePlayer(false);

   this.playerShadow=this.add.image(458,341,'watchman',4).setOrigin(.5,1).setTint(0x010506).setAlpha(.72).setScale(55/watchmanHeight,18/watchmanHeight).setAngle(-14).setDepth(.5);
   this.cameras.main.setZoom(1.65).setBounds(20,60,920,468).startFollow(this.player,true,.09,.09);
   this.barrier=this.add.graphics();this.details=this.add.graphics();
   this.darkness=this.textures.createCanvas('darkness-v2',480,288)!;
   this.lantern=this.add.image(0,0,'darkness-v2').setOrigin(0).setScale(2).setDepth(20);
   this.effects=this.add.graphics().setDepth(21);

   this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SHIFT,Q,R') as Record<string,Phaser.Input.Keyboard.Key>;
   this.input.keyboard!.addCapture(['UP','DOWN','LEFT','RIGHT']);
   this.input.keyboard!.on('keydown-E', (event:KeyboardEvent)=>{if(!event.repeat)this.interactQueued=true;});
   if((import.meta as unknown as {env:{DEV:boolean}}).env.DEV)(window as unknown as {__nightshift:()=>unknown}).__nightshift=()=>this.snapshot();
   hooks.onState(this.state);hooks.onReady();
  }
  posePlayer(moving:boolean){
   if(!this.playerSprite)return;const row=directionRow(this.angle),frame=row*4+gaitFrame(this.walkDistance,moving);
   this.playerWalking=moving;this.playerSprite.setFrame(row*4+1);this.playerLegs.setFrame(frame);
   const upper=this.playerSprite.frame,lower=this.playerLegs.frame;
   this.playerSprite.setCrop(0,0,upper.width,Math.floor(upper.height*.63));
   const side=row===1||row===3;this.playerLegs.setCrop(lower.width*(side?.12:.29),Math.floor(lower.height*.63),lower.width*(side?.78:.43),Math.ceil(lower.height*.37));
  }
  snapshot(){return {player:{x:this.player.x,y:this.player.y},feet:feetAt(this.player.x,this.player.y),solids:this.colliders().map(b=>({x:b.x,y:b.y,width:b.width,height:b.height})),moving:this.playerWalking,frame:this.playerLegs.frame.name,walkDistance:this.walkDistance,night:this.progression.night,wardEvents:{...this.wardEvents},monitorOpen:this.monitorOpen,scareCount:this.scareCount,scareVisible:this.scareFace.visible,warningSeen:this.warningSeen,puzzleOpen:this.puzzleOpen,elapsed:this.state.elapsed,health:this.state.health,battery:this.state.battery,protection:this.protection,ghost:{x:this.ghost.x,y:this.ghost.y,time:this.ghostTime}};}
  say(message:string,duration=3){this.message=message;this.messageUntil=this.state.elapsed+duration;hooks.onMessage(message);}
  startRun(night:Night=1){
   this.wardEvents.reset();this.monitorOpen=false;this.extraBed.setVisible(false);this.progression.reset(night);this.state={pressure:0,health:100,battery:100,fuses:0,elapsed:0,fear:8,noise:0,inventory:'',objective:'',night};
   this.blackout=0;this.protection=0;this.ghostTime=0;this.hitTime=0;this.ghostCooldown=night===2?25:45;
   this.lureTime=0;this.stepTime=0;this.ambienceTime=0;this.interactQueued=false;this.puzzleOpen=false;this.puzzleCommands.clear();
   this.ghost.setVisible(false);this.monsterShadow.setVisible(false);this.items.forEach(i=>i.setVisible(true));this.player.setPosition(458,323);
   this.warningSeen=false;this.warningAt=-1;this.scareAt=-1;this.scareUntil=0;this.scareCount=0;this.scareFace.setVisible(false);this.sawApparition=false;this.apparitionUntil=0;this.apparition.setVisible(false);this.walkDistance=0;this.angle=0;this.posePlayer(false);this.activeRun=true;this.paused=false;this.say(night===2?'出口电闸烧毁了。备用保险丝锁在药柜里；西北病历记着密码，西南接待室有撬棍。':'交班记录：本层 6 张病床。西南护士站可按 E 查看监控和呼叫记录。');this.sync();
  }
  setPaused(v:boolean){this.paused=v;this.interactQueued=false;this.sync();}
  sync(){const p=this.progression;this.state.inventory=`撬棍 ${p.crowbar?'✓':'—'}  /  病历 ${p.noteRead?'✓':'—'}  /  Q 绷带 ×${p.bandages}  /  R 诱饵 ×${p.decoys}`;this.state.objective=p.objective;hooks.onState(this.state);}
  closePuzzle(){
   if(!this.puzzleOpen)return;
   this.puzzleOpen=false;this.interactQueued=false;
   for(const command of this.puzzleCommands)this.command(command);
   this.puzzleCommands.clear();this.protection=Math.max(this.protection,3);
   this.say(this.progression.cabinetOpen?'药柜已解锁。按 E 取出保险丝；你有 3 秒撤离保护。':'已离开药柜。你有 3 秒撤离保护。');this.sync();
  }
  submitCode(code:string){if(!this.puzzleOpen||!this.activeRun)return false;const ok=this.progression.unlock(code);if(ok){this.say('药柜解锁。靠近按 E 取出保险丝。');}else{this.say('密码错误。离开药柜后会触发警报。');this.puzzleCommands.add('ghost');}this.sync();return ok;}
  command(c:Command){
   if(!this.activeRun||this.paused)return;
   if(this.puzzleOpen||this.monitorOpen){this.puzzleCommands.add(c);return;}
   if(c==='blackout'){this.blackout=8;this.say('电流停了。你身后，却有呼吸声。');hooks.onCue('metal');}
   if(c==='ghost'){this.ghostTime=22;this.ghost.setPosition(this.player.x>480?65:883,325).setVisible(true);this.say('走廊里出现了另一个脚步声。');hooks.onCue('ghost',this.ghost.x>this.player.x?1:-1);}
   if(c==='battery'){this.state.battery=Math.min(100,this.state.battery+30);this.say('应急电源已送达。电量 +30%。');}
   if(c==='sanctuary'){this.protection=10;this.say('你被光保护着。10 秒内免受伤害。');}
  }
  colliders(){const extra=this.wardEvents.extraBed?[new Phaser.Geom.Rectangle(275,142,42,84)]:[];return this.progression.night===2&&!this.progression.barricadeOpen?[...extra,...this.walls,...this.furniture,new Phaser.Geom.Rectangle(719,263,84,26),new Phaser.Geom.Rectangle(650,178,17,46)]:[...extra,...this.walls,...this.furniture];}
  monitorFeed(haunted:boolean){
   const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;ctx.fillStyle='#121b1d';ctx.fillRect(0,0,320,180);
   for(let y=20;y<180;y+=16)for(let x=0;x<320;x+=16){ctx.fillStyle=(x+y)%32?'#273230':'#202c2b';ctx.fillRect(x,y,15,15);}
   ctx.fillStyle='#404843';ctx.fillRect(0,0,320,22);
   const bed=this.textures.get('bed-v4'),frame=bed.get(0),source=bed.getSourceImage() as HTMLImageElement;
   ctx.drawImage(source,frame.cutX,frame.cutY,frame.cutWidth,frame.cutHeight,139,40,42,84);
   if(haunted){const patient=this.textures.get('patient'),pose=patient.get(1);ctx.drawImage(patient.getSourceImage() as HTMLImageElement,pose.cutX,pose.cutY,pose.cutWidth,pose.cutHeight,132,41,56,84);}
   ctx.fillStyle='#bac4b1';ctx.font='8px monospace';ctx.fillText('CAM 01 / BED 01',9,14);ctx.fillText('02:17:00',260,14);
   ctx.fillStyle='#050b0b55';for(let y=0;y<180;y+=3)ctx.fillRect(0,y,320,1);
   return canvas.toDataURL();
  }
  closeMonitor(){if(!this.monitorOpen)return;this.monitorOpen=false;this.interactQueued=false;for(const c of this.puzzleCommands)this.command(c);this.puzzleCommands.clear();this.protection=Math.max(this.protection,3);}
  acknowledgeBell(){return this.monitorOpen&&this.wardEvents.acknowledge(this.state.elapsed);}
  interact(){
   const p=this.player,pr=this.progression,near=(x:number,y:number,r=36)=>Phaser.Math.Distance.Between(p.x,p.y,x,y)<r;
   if(pr.night===1){
    if(near(113,446,40)){const haunted=this.wardEvents.inspectMonitor(this.state.fuses);this.monitorOpen=true;this.posePlayer(false);hooks.onMonitor(this.monitorFeed(haunted),this.wardEvents.bell==='isolation');return;}
    if(this.wardEvents.extraBed&&near(296,240,32)){this.wardEvents.badgeRead=true;this.say('床头卡：夜班值班员 / 工号 07。入院时间：02:19。',6);hooks.onCue('metal',.5);return;}
    if(this.wardEvents.bell==='west'&&near(110,239,34)){this.wardEvents.bell='finished';this.say('01 床呼叫已取消。床单还是温的。',4);return;}
    if(this.wardEvents.monitorWitnessed&&near(110,239,34)){this.say('床上没有人。床垫中间留着一道凹痕。',4);return;}
   }
   if(pr.night===2){
    if(near(113,446)&&!pr.crowbar){pr.crowbar=true;this.say('获得撬棍。可以拆除隔离病区的封板。');return;}
    if(near(235,233)&&!pr.noteRead){pr.noteRead=true;this.say('找到值班病历。按 J 可随时查阅床位与药柜顺序。',5);hooks.onCue('metal');return;}
    if(near(760,281,47)&&!pr.barricadeOpen){if(pr.crowbar){pr.barricadeOpen=true;this.state.noise=100;this.say('封板被撬开了。整条走廊都听见了。');this.command('ghost');}else this.say('木板钉死了入口。需要撬棍。');return;}
    if(near(609,415)&&!pr.cabinetOpen){if(!pr.noteRead)this.say('药柜需要三位密码。西北病历也许有线索。');else{this.puzzleOpen=true;this.posePlayer(false);hooks.onPuzzle(pr.clue);}return;}
    if(near(496,151)){if(pr.restorePower(this.state.fuses)){this.say('配电箱已送电。东侧出口打开了。');hooks.onCue('metal');}else this.say('需要解锁药柜、打开隔离区并集齐 3 个保险丝，才能送电。');return;}
   }
   const item=this.items.find(i=>i.visible&&near(i.x,i.y,32));
   if(item&&!pr.canCollectFuse(this.items.indexOf(item))){this.say(this.items.indexOf(item)===1?'备用保险丝锁在药柜里。需要病历上的密码。':'隔离区的保险丝无法取出，先撬开封板。');return;}
   if(item){item.setVisible(false);this.state.fuses++;if(this.state.fuses===1){if(pr.night===1)this.wardEvents.collectFirst();this.blackout=1.3;if(pr.night===1)this.scareAt=this.state.elapsed+1.15;hooks.onCue('metal',-1);}this.say(this.state.fuses===3?(pr.night===2?'全部收集。去北侧配电箱按 E 送电。':'电力已恢复！前往右侧 EXIT，按 E 逃离。'):`已收集 ${this.state.fuses} / 3 个保险丝。`);hooks.onCue('pickup');}
   else if(p.x>861&&p.y>290&&p.y<372){if(pr.canEscape(this.state.fuses)){this.finish(true);}else this.say(pr.night===2?'出口断电。需要集齐保险丝并手动送电。':'出口没有电。还需要更多保险丝。');}
  }
  drawDetails(time:number){
   const g=this.details;g.clear();this.barrier.clear();const pr=this.progression;
   const r=(x:number,y:number,w:number,h:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,h);};
   if(pr.night===2){
    if(!pr.crowbar){r(109,435,4,24,0xb5b9af);r(112,433,9,4,0xb5b9af);r(108,450,5,10,0x775a4a);}
    if(!pr.noteRead){r(229,226,12,15,0xbebaa4);r(232,230,6,1,0x393f3a);r(232,234,6,1,0x393f3a);}
    if(!pr.cabinetOpen){r(595,397,29,32,0x293435);r(598,399,23,25,0x68706a);r(603,409,14,11,0x151e20);r(608,412,4,3,0xb15c49);}
    r(510,139,3,3,pr.powered?0xaccb9c:0xa34537);
    if(!pr.barricadeOpen){this.barrier.fillStyle(0x1b2020);this.barrier.fillRect(719,263,84,26);this.barrier.fillRect(650,178,17,46);this.barrier.lineStyle(7,0x7b6450);this.barrier.lineBetween(721,267,800,284);this.barrier.lineBetween(721,284,800,267);this.barrier.lineStyle(2,0xa39175);this.barrier.lineBetween(724,267,800,284);}
    for(let i=0;i<18;i++){g.fillStyle(0xa3b8b4,.65);const x=363+i*4,y=304+(i*7)%28;g.fillTriangle(x,y,x+5,y+2,x+2,y+6);}
    const live=time%7<2.5;r(681,293,8,47,0x302d25);r(684,299,2,29,live?0xc2ccd0:0x736249);
    if(live){g.lineStyle(1,0xc9e1df,.8);g.lineBetween(684,305,695,311);g.lineBetween(695,311,680,321);g.lineBetween(680,321,690,330);}
   }
   this.bedEvidence.clear();this.extraBed.setVisible(this.wardEvents.extraBed);
   if(pr.night===1){const e=this.wardEvents;
    if(e.monitorWitnessed){this.bedEvidence.fillStyle(0x172023,.8);this.bedEvidence.fillEllipse(110,184,16,29);this.bedEvidence.lineStyle(1,0x737571,.6);this.bedEvidence.lineBetween(102,171,99,194);}
    if(e.extraBed){this.bedEvidence.fillStyle(0xa6a292);this.bedEvidence.fillRect(288,214,16,9);this.bedEvidence.fillStyle(0x302e2d);this.bedEvidence.fillRect(291,217,10,2);}
    if(e.wheelMarks)for(const x of [279,310])for(const y of [151,218])r(x,y,3,7,0x57413e);
    if(e.bell==='isolation'||e.bell==='west'){const x=e.bell==='west'?110:848,y=235;r(x-5,y+1,10,5,0x312526);if(time%1.8<.75)r(x-3,y+2,6,2,0xbe6752);}
   }
   // Bed-to-door evidence: broken drag strokes, dried edges, interrupted finger marks.
   for(let i=0;i<17;i++){const x=218+Math.floor(i*1.7),y=228+i*3;r(x,y,4+i%3,2,0x512e32);if(i%3!==0)r(x+8,y+1,2,4,0x342329);if(i%4===0)r(x-4,y+2,2,2,0x75413d);}
   for(let i=0;i<4;i++){r(283+i*3,248+i%2,2,7+i,0x603537);r(284+i*3,259,1,5,0x38252a);}r(281,255,14,4,0x4b2d32);
   r(246,259,9,2,this.warningSeen?0x8c3533:0x47262b);
   // Dry smears, dripping pipes and drag marks are environmental storytelling, not damage zones.
   for(const [x,y]of [[189,243],[545,202],[795,421]]){g.fillStyle(0x512e29,.5);g.fillEllipse(x,y,31,12);g.fillRect(x-2,y,3,26);g.fillRect(x+6,y+3,2,18);}
   if(this.state.fuses>0){for(let i=0;i<12;i++){const x=453+i*8,y=294+i%2*7;r(x,y,3,6,0x482c27);r(x+1,y+6,2,2,0x382720);}}
   if(this.lureTime>0){g.lineStyle(1,0xb7c3bb,.4);g.strokeCircle(this.lure.x,this.lure.y,14+Math.sin(time*7)*9);r(this.lure.x-2,this.lure.y-3,4,7,0xa7b7ac);}
  }
  light(){
   const ctx=this.darkness.context,blocks=this.walls,time=this.state.elapsed;
   ctx.clearRect(0,0,480,288);ctx.globalCompositeOperation='source-over';
   // Ambient fill preserves architectural information; lamps create contrast instead of a black lid.
   ctx.fillStyle=this.blackout>0?'rgba(3,6,9,.96)':'rgba(2,4,7,.96)';ctx.fillRect(0,0,480,288);
   const illuminate=(x:number,y:number,radius:number,angle:number,spread:number,strength:number,color:string)=>{
    const px=x/2,py=y/2;ctx.save();ctx.beginPath();ctx.moveTo(px,py);
    for(let i=0;i<=88;i++){
     const a=angle-spread/2+spread*i/88,cos=Math.cos(a),sin=Math.sin(a);let d=0;
     for(d=0;d<radius;d+=4)if(blocks.some(w=>w.contains(x+cos*d,y+sin*d)))break;
     ctx.lineTo(px+cos*d/2,py+sin*d/2);
    }
    ctx.closePath();ctx.clip();ctx.globalCompositeOperation='destination-out';
    const gradient=ctx.createRadialGradient(px,py,0,px,py,radius/2);
    gradient.addColorStop(0,`rgba(0,0,0,${strength})`);gradient.addColorStop(.28,`rgba(0,0,0,${strength*.87})`);gradient.addColorStop(.7,`rgba(0,0,0,${strength*.27})`);gradient.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=gradient;ctx.fillRect(0,0,480,288);
    ctx.globalCompositeOperation='source-over';const tint=ctx.createRadialGradient(px,py,0,px,py,radius/2);tint.addColorStop(0,`rgba(${color},.025)`);tint.addColorStop(.6,`rgba(${color},.008)`);tint.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=tint;ctx.fillRect(0,0,480,288);ctx.restore();
   };
   const warningAge=time-this.warningAt;
   // Two local power dips, separated by more than one second; never a full-screen strobe.
   const powerDip=this.warningAt>=0&&((warningAge>.4&&warningAge<.75)||(warningAge>1.8&&warningAge<2.2));
   const flicker=powerDip?.18:1;
   const lamps=[{x:165,y:297,r:94,c:'160,153,132'},{x:494,y:297,r:78,c:'134,146,155'},{x:790,y:297,r:88,c:'155,148,129'},
    {x:173,y:119,r:87,c:'145,173,177'},{x:494,y:116,r:65,c:'144,179,175'},{x:818,y:115,r:72,c:'172,178,151'},{x:898,y:316,r:73,c:'173,78,50'}];
   if(this.blackout<=0)for(const lamp of lamps){const failed=lamp.x===494&&this.state.fuses>0;const dim=lamp.x===790&&Math.sin(time*.7)>.7;illuminate(lamp.x,lamp.y,lamp.r,0,Math.PI*2,(failed?.04:dim?.15:.48)*flicker,lamp.c);}
   else illuminate(898,316,48,0,Math.PI*2,.24,'173,78,50');
   illuminate(this.player.x,this.player.y+6,this.blackout>0?48:64,0,Math.PI*2,.43,'138,148,157');
   if(this.blackout<=0&&this.state.battery>0)illuminate(this.player.x,this.player.y+6,205,this.angle,.78,.91,'185,187,179');
   // A narrow emergency-light spill at the first ward entrance, occluded by the walls.
   if(this.progression.night===1){const strength=this.warningSeen?.48+Math.sin(time*1.2)*.08:.22;
    illuminate(250,257,95,Math.PI/2,Math.PI*1.35,strength,'145,24,29');
    ctx.globalCompositeOperation='source-over';const red=ctx.createRadialGradient(125,137,2,125,137,40);red.addColorStop(0,`rgba(115,8,16,${this.warningSeen?.24:.11})`);red.addColorStop(1,'rgba(35,0,7,0)');ctx.fillStyle=red;ctx.fillRect(112,130,42,42);
   }
   // Each heavy object casts a directional floor shadow away from its strongest nearby light.
   if(this.blackout<=0)for(const prop of this.props){
    const center={x:prop.x+prop.w/2,y:prop.y+prop.h};
    const sources=[...lamps,{x:this.player.x,y:this.player.y,r:200,c:''}];
    const source=sources.reduce((best,l)=>Phaser.Math.Distance.Between(l.x,l.y,center.x,center.y)<Phaser.Math.Distance.Between(best.x,best.y,center.x,center.y)?l:best);
    const distance=Phaser.Math.Distance.Between(center.x,center.y,source.x,source.y);if(distance>205)continue;
    const hull=shadowHull({x:prop.x,y:prop.y,width:prop.w,height:prop.h},source,30);
    ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(1,6,8,.34)';ctx.beginPath();
    hull.forEach((point,index)=>{if(index===0)ctx.moveTo(point.x/2,point.y/2);else ctx.lineTo(point.x/2,point.y/2);});ctx.closePath();
    ctx.rect(prop.x/2,prop.y/2,prop.w/2,prop.h/2);ctx.fill('evenodd');

   }
   // Very faint dust in the lit corridor, with no opaque fog disc around enemies.
   ctx.globalCompositeOperation='source-over';ctx.fillStyle='rgba(194,199,170,.045)';
   for(let i=0;i<24;i++){const x=(i*41+time*2)%440+20,y=150+(i*13)%20+Math.sin(time*.3+i)*3;ctx.fillRect(x,y,1,1);}
   // Low-resolution drifting fog field: broad layers, dithered edges, no glowing circles.
   ctx.globalCompositeOperation='source-over';
   for(let y=49;y<254;y+=3)for(let x=19;x<461;x+=3){
    if(blocks.some(b=>b.contains(x*2,y*2)))continue;
    const distance=Math.hypot(x*2-this.player.x,y*2-this.player.y),near=Math.min(1,Math.max(0,(distance-42)/170));
    const field=Math.sin(x*.029+time*.065)+Math.sin(y*.057-time*.09)+Math.sin((x+y)*.022+time*.04);
    const density=Math.max(0,field*.012+.022)*near;
    if(density<.008)continue;ctx.fillStyle=`rgba(67,76,85,${density.toFixed(3)})`;ctx.fillRect(x,y,3,3);
   }
   this.darkness.refresh();
  }
  update(_time:number,delta:number){
   if(!this.player)return;const dt=Math.min(delta/1000,.05),p=this.player,pr=this.progression;
   if(this.activeRun&&!this.paused&&!this.puzzleOpen&&!this.monitorOpen){
    this.state.elapsed+=dt;
    if(pr.night===1){const e=this.wardEvents;e.update(this.state.elapsed,p.y>300||p.x>360);if((e.bell==='isolation'||e.bell==='west')&&this.state.elapsed>=e.nextRing){e.nextRing=this.state.elapsed+3.8;const source=e.bell==='west'?110:848;hooks.onCue('call-bell',Phaser.Math.Clamp((source-p.x)/320,-1,1));}}

    if(pr.night===1&&!this.warningSeen&&Phaser.Math.Distance.Between(p.x,p.y,239,233)<125){this.warningSeen=true;this.warningAt=this.state.elapsed;hooks.onCue('ghost',-.8);this.say('门后的灯亮了。值班表上，这间病房应该是空的。',4);}
    if(this.scareAt>=0&&this.state.elapsed>=this.scareAt){this.scareAt=-1;this.scareCount++;this.scareUntil=this.state.elapsed+.48;this.scareFace.setPosition(p.x+25,p.y-25).setVisible(true);hooks.onCue('sting');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)this.cameras.main.shake(180,.005);}
    this.scareFace.setVisible(this.state.elapsed<this.scareUntil&&this.scareCount>0).setAlpha(Math.min(1,Math.max(0,(this.scareUntil-this.state.elapsed)*5)));

    if(!this.sawApparition&&this.state.elapsed>7&&this.ghostTime<=0){
     // A nearby unobstructed silhouette, instead of a timed event in an offscreen room.
     const candidates=[this.angle,this.angle+.65,this.angle-.65,0,Math.PI];
     for(const a of candidates){const x=p.x+Math.cos(a)*115,y=p.y+Math.sin(a)*115;
      if(x<45||x>915||y<115||y>487)continue;
      if(Array.from({length:12},(_,i)=>({x:p.x+(x-p.x)*i/11,y:p.y+(y-p.y)*i/11})).some(q=>this.colliders().some(b=>b.contains(q.x,q.y+12))))continue;
      this.apparition.setPosition(x,y+17).setDepth(2+(y+17)*.01).setAlpha(.8).setVisible(true);this.apparitionUntil=this.state.elapsed+3;this.sawApparition=true;hooks.onCue('ghost',Math.cos(a));break;
     }
    }
    if(this.apparition.visible){const remaining=this.apparitionUntil-this.state.elapsed;this.apparition.setAlpha(Math.min(.8,Math.max(0,remaining)));
     if(remaining<=0){this.apparition.setVisible(false);hooks.onCue('metal',-1);}}

    this.blackout=Math.max(0,this.blackout-dt);this.protection=Math.max(0,this.protection-dt);this.hitTime=Math.max(0,this.hitTime-dt);this.lureTime=Math.max(0,this.lureTime-dt);this.ghostCooldown-=dt;
    let dx=Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),dy=Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown);
    const moving=!!(dx||dy)&&!this.puzzleOpen,sprint=this.keys.SHIFT.isDown&&this.state.battery>0,speed=sprint?133:83;
    if(moving){this.angle=Math.atan2(dy,dx);const len=Math.hypot(dx,dy);dx=dx/len*speed*dt;dy=dy/len*speed*dt;if(dx)this.facing=dx>0?1:-1;
     const before={x:p.x,y:p.y},next=moveWithCollision(before,dx,dy,this.colliders());p.setPosition(next.x,next.y);
     const travelled=Phaser.Math.Distance.Between(before.x,before.y,p.x,p.y);this.walkDistance+=travelled;this.posePlayer(travelled>.05);
     this.stepTime+=travelled>.05?dt:0;if(this.stepTime>(sprint?.24:.44)){this.stepTime=0;hooks.onCue('step');}
    }
    if(!moving)this.posePlayer(false);
    this.state.battery=Math.max(0,this.state.battery-dt*(sprint&&moving?.65:.16));
    const glass=pr.night===2&&p.x>358&&p.x<438&&p.y>299&&p.y<340&&moving;
    this.state.noise=Phaser.Math.Clamp(this.state.noise+dt*(moving&&(sprint||glass)?(glass?55:25):-17),0,100);
    if(this.state.noise>85&&this.ghostTime<=0&&this.ghostCooldown<10){this.command('ghost');this.ghostCooldown=35;}
    if(this.ghostCooldown<=0&&this.ghostTime<=0){this.command('ghost');this.ghostCooldown=pr.night===2?38:45;}
    if(Phaser.Input.Keyboard.JustDown(this.keys.Q)&&pr.bandages>0&&this.state.health<100&&!this.puzzleOpen){pr.bandages--;this.state.health=Math.min(100,this.state.health+35);this.say('使用绷带，恢复 35 生命。');}
    if(Phaser.Input.Keyboard.JustDown(this.keys.R)&&pr.decoys>0&&!this.puzzleOpen){pr.decoys--;this.lureTime=7;this.lure={x:p.x,y:p.y};this.say('留下发条诱饵。7 秒内吸引追逐者，趁现在离开。');hooks.onCue('metal');}
    if(this.interactQueued&&!this.puzzleOpen)this.interact();this.interactQueued=false;
    if(this.puzzleOpen||this.monitorOpen){this.sync();return;}
    if(this.ghostTime>0){this.ghostTime-=dt;const target=this.lureTime>0?this.lure:p,dist=Phaser.Math.Distance.Between(p.x,p.y,this.ghost.x,this.ghost.y),a=Phaser.Math.Angle.Between(this.ghost.x,this.ghost.y,target.x,target.y),v=pr.night===2?64:48;
     this.ghost.x+=Math.cos(a)*v*dt;this.ghost.y+=Math.sin(a)*v*dt;this.monsterSprite.setFrame(directionRow(a)*4+Math.floor(this.state.elapsed*4)%4);
     if(dist<25&&this.hitTime<=0&&this.protection<=0){this.damage(15);this.say('它就在你身后。不要停！');}if(this.ghostTime<=0)this.ghost.setVisible(false);
    }
    if(pr.night===2&&this.state.elapsed%7<2.5&&p.x>675&&p.x<702&&p.y>291&&p.y<342&&this.hitTime<=0&&this.protection<=0){this.damage(12);this.say('电缆漏电！等电弧熄灭或绕开。');}
    this.state.pressure=this.ghostTime>0?Phaser.Math.Clamp(1-Phaser.Math.Distance.Between(p.x,p.y,this.ghost.x,this.ghost.y)/260,0,1)*(this.protection>0?.25:1):0;
    this.state.fear=Phaser.Math.Clamp(10+(this.blackout>0?28:0)+(this.ghostTime>0?45:0)+(100-this.state.health)*.25+this.state.noise*.15-(this.protection>0?30:0),0,100);
    this.ambienceTime+=dt;if(this.ambienceTime>(this.ghostTime>0?1.1:8)){this.ambienceTime=0;hooks.onCue(this.state.pressure>.2?'heartbeat':'metal',Math.sin(this.state.elapsed));}
    if(this.messageUntil<this.state.elapsed){let hint='';if(this.items.some(i=>i.visible&&Phaser.Math.Distance.Between(p.x,p.y,i.x,i.y)<32))hint='调查附近的物品 · E';if(pr.night===2&&Phaser.Math.Distance.Between(p.x,p.y,760,281)<47&&!pr.barricadeOpen)hint='隔离区封板 · E';if(pr.night===1&&Phaser.Math.Distance.Between(p.x,p.y,113,446)<40)hint='护士站监控 / 呼叫记录 · E';if(pr.night===1&&this.wardEvents.extraBed&&Phaser.Math.Distance.Between(p.x,p.y,296,240)<32)hint='查看床头卡 · E';if(pr.night===1&&this.wardEvents.bell==='west'&&Phaser.Math.Distance.Between(p.x,p.y,110,239)<34)hint='01 床呼叫按钮 · E';hooks.onMessage(hint||pr.objective);}
    if(this.state.health<=0||this.state.elapsed>=(pr.night===2?480:300)){this.finish(false);}
   }else this.interactQueued=false;
   this.player.setDepth(2+(p.y+16)*.01);this.ghost.setDepth(2+(this.ghost.y+17)*.01);
   this.playerShadow.setPosition(p.x+5,p.y+18).setFrame(this.playerLegs.frame.name);
   this.monsterShadow.setPosition(this.ghost.x+5,this.ghost.y+19).setFrame(this.monsterSprite.frame.name).setVisible(this.ghost.visible);
   this.drawDetails(this.state.elapsed);if(this.frame++%2===0)this.light();
   this.effects.clear();if(this.protection>0){this.effects.lineStyle(1,0xa5c6c2,.7);for(const side of [-1,1]){this.effects.lineBetween(p.x+side*22,p.y+10,p.x+side*22,p.y+19);this.effects.lineBetween(p.x+side*22,p.y+19,p.x+side*13,p.y+19);}}
   this.hudTick+=dt;if(this.hudTick>.15){this.hudTick=0;this.sync();}
  }
  finish(won:boolean){this.scareFace.setVisible(false);this.scareAt=-1;this.activeRun=false;this.posePlayer(false);hooks.onEnd({won,night:this.progression.night,elapsed:this.state.elapsed,health:this.state.health,fuses:this.state.fuses,cabinet:this.progression.cabinetOpen,barrier:this.progression.barricadeOpen,powered:this.progression.powered});}
  damage(amount:number){this.state.health=Math.max(0,this.state.health-amount);this.hitTime=1.4;hooks.onHit();hooks.onCue('impact');this.cameras.main.shake(240,.007);}

 }
 const scene=new Hospital('Hospital');new Phaser.Game({type:Phaser.AUTO,parent:'game',width:W,height:H,backgroundColor:'#0b1510',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});return {closeMonitor:()=>scene.closeMonitor(),acknowledgeBell:()=>scene.acknowledgeBell(),startRun:(night:Night=1)=>scene.startRun(night),setPaused:(v:boolean)=>scene.setPaused(v),command:(c:Command)=>scene.command(c),submitCode:(code:string)=>scene.submitCode(code),closePuzzle:()=>scene.closePuzzle(),getClue:()=>scene.progression.noteRead?scene.progression.clue:'尚未找到病历。第二夜：调查西北病房。'};
}
