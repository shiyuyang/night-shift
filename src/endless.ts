import {doorApproach} from './runtime/door-approach';
import {DoorBreach} from './runtime/door-breach';
import {choosePursuitEntry,chooseFinaleEntry,PursuitSearch} from './runtime/pursuit';
import {AtmosphereColors} from './runtime/atmosphere-colors';
import {BloodMoon} from './runtime/blood-moon';
import {drawGardenGround,drawGardenWall,drawGardenProp,drawGardenLamps,gardenKinds} from './garden-art';
import {SceneAudio} from './runtime/scene-audio';
import {MorgueDrawer} from './runtime/morgue-drawer';
import {drawClinicalProp,drawMorgueDrawer} from './clinical-art';
import {drawIndustrialProp,drawFloorPipes} from './industrial-art';
import {t as msg,canvasFont,getLocale,direction,formatList} from './i18n.ts';
import {assetUrl} from './runtime/asset-url';
import {LightFear} from './runtime/light-fear';
import {registerHospitalPatient} from './hospital-art';
import {Blackouts} from './runtime/blackouts';
import encounterRules from '../game/encounters.json' with {type:'json'};
import {flashlightDrain,flashlightRemaining} from './runtime/flashlight';
import {Weeper} from './runtime/weeper';
import {chooseWeeper,weeperRoamPoints} from './runtime/weeper-placement';
import {registerWeeper} from './weeper-art';
import {recordRun} from './runtime/run-history';
import {RogueRun,type RogueEvent,waterPhase} from './runtime/rogue-run';
import {center} from './runtime/rogue-content';
import {drawRogue} from './rogue-art';
import {SprintInput} from './runtime/sprint-input';
import {Feedback} from './runtime/feedback';
import {Tutorial,isMonsterLesson,type Lesson} from './runtime/tutorial';
import {Stamina,encounterProfile,tuning} from './runtime/pacing';
import {EnvironmentState} from './runtime/environment-state';
import {Interference} from './runtime/interference';
import {SignalNoise} from './signal-noise';
import {drawKey,drawChest} from './item-art';
import {EventRuntime,parseEvents} from './runtime/event-runtime';

import {PIXELS,attachPixelScale} from './pixel-scale';
import assetManifest from '../game/assets/manifest.json' with {type:'json'};
import {Locks} from './locks';
import {floorWear,smallLights} from './set-dressing';
import {LightRenderer,type Lamp} from './light-renderer';
import {campaign} from './campaign';
import Phaser from 'phaser';
import {itemRules,roundRules,lightSlows,detectsPlayer,hearsPlayer} from './run-rules';
import {patrolPath,followPatrolPath} from './patrol';
import {feetAt,monsterFeetAt,monsterArchitecture,clearContact,overlaps,moveWithCollision,gaitFrame} from './collision';
import {registerAtlas,registerPixelAtlas,directionRow} from './art';
import {makeLevel,type Level,type Command} from './levels';
export type {Command} from './levels';
interface State{bloodMoon:number;exitTour:string;lightSeconds:number;flashlightBlocked:boolean;flashlightOn:boolean;theme:number;feedback:Feedback['view'];exitStartup:number;exhausted:boolean;tutorialPracticing:boolean;tutorial:Lesson|null;flashes:number;decoys:number;bandages:number;keyCount:number;keyNames:string;stamina:number;phase:string;health:number;battery:number;fuses:number;elapsed:number;fear:number;pressure:number;noise:number;inventory:string;objective:string;night:number;map:string;rule:string}
interface Result{won:boolean;night:number;elapsed:number;health:number;fuses:number;cabinet:boolean;barrier:boolean;powered:boolean;map:string;rogue:{cachesOpened:number;alarms:number;shortcuts:number;hazardsHit:number;hides:number;viewerAccepted:number;viewerRejected:number}}
interface Hooks{onReady:()=>void;onState:(s:State)=>void;onMessage:(m:string)=>void;onEnd:(r:Result)=>void;onCue:(k:string,p?:number,volume?:number)=>void;onHit:()=>void;onPuzzle:(c:string)=>void;onMonitor:(f:string,b:boolean)=>void}
const paletteFloor=(theme:number)=>[0x384240,0x403b32,0x2c3e45,0x44463e,0x344b4c,0x354249,0x485756][theme];
export function bootGame(h:Hooks){
 class Shift extends Phaser.Scene{
  atmosphereColors=new AtmosphereColors();
  lightFear=new LightFear();
  flashlightOn=true;weeper?:Weeper;weeperSprite!:Phaser.GameObjects.Image;weeperIntroduced=false;weeperNoise=0;patrolRetreat=false;patrolUnseen=0;
  rogue=new RogueRun();blocker!:Phaser.GameObjects.Image;rogueVisual!:Phaser.GameObjects.Graphics;
  flashlightPracticeOff=false;exitTour:'none'|'out'|'hold'|'back'='none';
  sprintInput=new SprintInput();feedback=new Feedback();bodyFeedback!:Phaser.GameObjects.Graphics;healText!:Phaser.GameObjects.Text;interactionLabel!:Phaser.GameObjects.Text;breathAt=0;tutorial=new Tutorial();trainingHeal=false;trainingLure=false;itemQueue=new Set<string>();stamina=new Stamina();exitStartup=0;rules=roundRules(1);lastKnown={x:458,y:318};memory=0;route:{x:number;y:number}[]=[];routeTimer=0;blackouts=new Blackouts();ambienceAt=18;echoAt=0;ambienceIndex=0;
  level!:Level;mapSeed=0;round=1;pending=false;active=false;paused=false;
  locks=new Locks();smallLamps:Lamp[]=[];state!:State;key=false;door=false;opened=[false,false,false];bandages=2;decoys=3;flashes=3;
  player!:Phaser.GameObjects.Container;torso!:Phaser.GameObjects.Image;legs!:Phaser.GameObjects.Image;ghost!:Phaser.GameObjects.Image;
  geometry!:Phaser.GameObjects.Graphics;details!:Phaser.GameObjects.Graphics;lightImage!:Phaser.GameObjects.Image;canvas!:Phaser.Textures.CanvasTexture;
  keys!:Record<string,Phaser.Input.Keyboard.Key>;angle=0;distance=0;moving=false;ghostTime=0;ghostDelay=0;stun=0;hit=0;cooldown=35;protection=0;reveal=0;flare=0;lure=0;lurePos={x:0,y:0};step=0;pulse=0;messageUntil=0;syncTime=0;frame=0;helpCooldown=0;
  doorTarget?:{x:number;y:number};doorAttacker?:'ghost'|'weeper';doorPlanClock=0;ghostStride=0;doorBreach=new DoorBreach();finaleTarget?:{x:number;y:number};sceneAudio=new SceneAudio();bloodFlicker=false;pursuitSearch=new PursuitSearch();lastThreatAt=0;bloodMoon=new BloodMoon();morgueBody?:Phaser.GameObjects.Image;morgueDrawer=new MorgueDrawer();eventRuntime!:EventRuntime;crtStrength=.36;lighting=new LightRenderer();signal!:SignalNoise;environment=new EnvironmentState();interference=new Interference();debug!:Phaser.GameObjects.Graphics;
  preload(){this.load.image('garden-pine',assetUrl('/assets/garden-pine-v1.webp'));this.load.image('morgue-body',assetUrl('/assets/morgue-shrouded-body-v1.webp'));for(const kind of ['listener','light-shy','patroller'])this.load.image('hospital-'+kind,assetUrl('/assets/hospital-'+kind+'-v1.webp'));for(const [id,asset] of Object.entries(assetManifest.sprites))this.load.image(id,assetUrl(asset.deliveryFile));this.load.image('weeping-patient',assetUrl('/assets/weeping-patient-v1.webp'));this.load.image('bed-v4',assetUrl('/assets/bed-overhead-v4.webp'));}
  create(){
   this.doorTarget=undefined;this.doorAttacker=undefined;this.doorPlanClock=0;this.ghostStride=0;this.doorBreach=new DoorBreach();this.finaleTarget=undefined;this.sceneAudio=new SceneAudio();this.atmosphereColors=new AtmosphereColors();this.bloodFlicker=false;this.pursuitSearch.reset();this.lastThreatAt=0;this.bloodMoon.reset();this.flashlightPracticeOff=false;this.exitTour='none';this.lightFear.reset();this.flashlightOn=true;this.weeperIntroduced=false;this.weeperNoise=0;this.patrolRetreat=false;this.patrolUnseen=0;this.sprintInput.clear();this.feedback.reset();this.breathAt=0;this.tutorial.start(this.round);this.trainingHeal=false;this.trainingLure=false;this.itemQueue.clear();this.stamina.reset();this.exitStartup=0;this.level=makeLevel(this.round,this.mapSeed);this.morgueDrawer=new MorgueDrawer(this.level.zones.MorgueDrawerZone);this.rogue=new RogueRun(this.level.features??[]);this.environment.reset();this.interference.reset();this.crtStrength=.36;this.eventRuntime=new EventRuntime(this.level.events,action=>{if(action.type==='sound'){const source=this.level.lamps.find(l=>l.id===action.source);h.onCue(action.id,source?Phaser.Math.Clamp((source.x-(this.player?.x??this.level.spawn.x))/300,-1,1):action.pan);}else if(action.type==='blood-moon'){if(this.level.theme===6)this.bloodMoon.target=action.strength;}else if(action.type==='message')this.say(msg(action.text as import('./i18n').MessageKey),4);else if(action.type==='light'){this.environment.setLight(action.target,action.strength);if(action.target==='crt')this.crtStrength=action.strength;}});this.rules=roundRules(this.round);this.memory=0;this.route=[];this.routeTimer=0;this.blackouts.reset();this.ambienceAt=18+(this.round%3)*3;this.echoAt=0;this.ambienceIndex=0;this.locks=new Locks();this.key=false;this.door=false;this.opened=[false,false,false];this.bandages=itemRules.bandages;this.decoys=this.round===1?3:1;this.flashes=(this.round===1?3:1)+(this.rules.event==='supply'?1:0);this.angle=0;this.distance=0;this.moving=false;this.ghostTime=0;this.ghostDelay=0;this.stun=0;this.hit=0;this.cooldown=tuning.firstEncounter;this.protection=0;this.reveal=0;this.flare=0;this.lure=0;this.step=0;this.pulse=0;this.messageUntil=0;this.syncTime=0;this.frame=0;this.helpCooldown=0;
   this.state={bloodMoon:0,exitTour:'none',lightSeconds:120,flashlightBlocked:false,flashlightOn:true,theme:this.level.theme,feedback:this.feedback.view,exitStartup:0,exhausted:false,tutorialPracticing:false,tutorial:null,flashes:3,decoys:3,bandages:1,keyCount:0,keyNames:'',stamina:100,phase:msg("ui.search"),health:100,battery:100,fuses:0,elapsed:0,fear:8,pressure:0,noise:0,inventory:'',objective:'',night:this.round,map:this.level.name,rule:''};
   const pa=registerPixelAtlas(this,'watchman',4,4,assetManifest.sprites.watchman.framePixels,assetManifest.sprites.watchman.sourceRows),ph=pa.height;registerAtlas(this,'bed-v4',1,1);registerAtlas(this,'morgue-body',1,1);registerAtlas(this,'garden-pine',1,1);
   this.geometry=this.add.graphics();const g=this.geometry,r=(x:number,y:number,w:number,hh:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,hh);};
   const palette=[[0x303938,0x384240,0x50554e],[0x35312c,0x403b32,0x635b4a],[0x26353b,0x2c3e45,0x4c6267],[0x383d36,0x44463e,0x777766],[0x293e40,0x344b4c,0x63827c],[0x28373e,0x354249,0x61757b],[0x25322f,0x485756,0x64726c]][this.level.theme];
   if(this.level.theme===6)drawGardenGround(g,this.level);else for(let y=this.level.bounds.y;y<this.level.bounds.y+this.level.bounds.height;y+=24)for(let x=this.level.bounds.x;x<this.level.bounds.x+this.level.bounds.width;x+=24){r(x,y,24,24,palette[0]);r(x+1,y+1,22,22,palette[1]);if((x+y)%72===0){r(x+3,y+17,7,2,0x172226);r(x+12,y+18,3,3,0x1d2527);}}
   if(this.level.theme!==6){floorWear(g,this.level);drawFloorPipes(g,this.level.zones);}
   for(const b of this.level.walls){if(this.level.theme===6){drawGardenWall(g,b,this.level);continue;}r(b.x,b.y,b.width,b.height,0x172127);r(b.x,b.y,b.width,Math.max(3,b.height-5),palette[2]);r(b.x,b.y+b.height-5,b.width,3,0x69716a);for(let x=b.x+8;x<b.x+b.width-5;x+=31)r(x,b.y+3,3,Math.min(9,b.height-5),0x323b36);}
   for(const b of this.level.props){if(b.kind==='bed')this.add.image(b.x+b.width/2,b.y+b.height,'bed-v4',0).setOrigin(.5,1).setDisplaySize(b.width,b.height).setTint(0xa1a8a4).setDepth(2+(b.y+b.height)/100);
    else if(b.kind==='tree'){const frame=this.textures.get('garden-pine').get(0);this.add.image(b.x+b.width/2,b.y+b.height,'garden-pine',0).setOrigin(.5,1).setScale(Math.min(b.width/frame.width,b.height/frame.height)).setTint(0x9cafa4).setDepth(2+(b.y+b.height)/100);}
    else if(gardenKinds.includes(b.kind))drawGardenProp(g,b);
    else if(b.kind==='seating'||b.kind==='operatingtable'||b.kind==='coldcabinet'||b.kind==='shroudedtrolley')drawClinicalProp(g,{...b,kind:b.kind});
    else if(b.kind==='rack'||b.kind==='engine')drawIndustrialProp(g,{...b,kind:b.kind});
    else if(b.kind==='desk'){r(b.x,b.y,b.width,b.height,0x182a2c);r(b.x+2,b.y+2,b.width-4,b.height-7,0x697c76);r(b.x+4,b.y+b.height-6,b.width-8,3,0x354944);if(b.width>60){r(b.x+b.width-32,b.y+8,18,12,0xb5b9a3);r(b.x+b.width-30,b.y+11,12,1,0x69766c);}}
    else if(b.kind==='shelf'){r(b.x,b.y,b.width,b.height,0x253433);r(b.x+2,b.y+2,b.width-4,b.height-5,0x626e66);for(let x=b.x+6;x<b.x+b.width-12;x+=18){r(x,b.y+5,12,b.height-12,0xaaa998);r(x,b.y+9,12,2,0x6c7870);}}
    else{r(b.x,b.y,b.width,b.height,0x111d22);r(b.x+2,b.y+2,b.width-4,b.height-6,b.kind==='crate'?0x665641:0x4d686c);for(let y=b.y+8;y<b.y+b.height-5;y+=14)r(b.x+4,y,b.width-8,2,0x273434);r(b.x+4,b.y+3,b.width-8,2,0x8d8c71);if(b.kind==='machine'){r(b.x+12,b.y+10,25,15,0x111e24);r(b.x+15,b.y+13,5,2,0x6dbaa9);}}
   }
   const bodyFrame=this.textures.get('morgue-body').get(0);
   for(const b of this.level.props.filter(p=>p.kind==='shroudedtrolley')){
    const scale=Math.min((b.width-12)/bodyFrame.width,(b.height-12)/bodyFrame.height);
    this.add.image(b.x+b.width/2,b.y+4,'morgue-body',0).setOrigin(.5,0).setScale(scale).setTint(0xaebbb4).setDepth(1.2).setData('morgueBody','trolley');
   }
   this.morgueBody=this.add.image(0,0,'morgue-body',0).setOrigin(.5,0).setDepth(1.2).setTint(0xaebbb4).setVisible(false).setData('morgueBody','drawer');
   if(this.level.theme!==6)for(const {x,y}of this.level.boxes)for(let i=0;i<12;i++){r(x+i*2,y+i*3,3+i%3,2,0x613936);if(i%3===0)r(x-4+i*2,y+4+i*3,2,4,0x382d2d);}
   // Authored clusters of seepage and dragged handprints, anchored to architecture.
   if(this.level.theme!==6)for(const [i,b] of this.level.walls.entries()){if(b.width<60)continue;const x=b.x+Math.min(b.width-32,18+(i*37)%(b.width-35)),y=b.y+b.height-7;r(x,y,18,5,0x37292a);for(let n=0;n<4;n++)r(x+n*4,y+3,2,5+(n*7+i)%14,0x45282a);}
   this.add.text(this.level.bounds.x+31,this.level.bounds.y+12,this.level.name,{fontFamily:canvasFont(),fontSize:11,color:'#9caa9b'});
   this.add.text(this.level.exit.x-18,this.level.exit.y-32,'EXIT',{fontFamily:'monospace',fontSize:11,color:'#c0f3ce'}).setDepth(21);
   this.player=this.add.container(this.level.spawn.x,this.level.spawn.y);this.legs=this.add.image(0,16,pa.key,5).setOrigin(.5,.95).setScale(assetManifest.sprites.watchman.framePixels*PIXELS.worldUnitsPerPixel/ph);this.torso=this.add.image(0,16,pa.key,5).setOrigin(.5,.95).setScale(assetManifest.sprites.watchman.framePixels*PIXELS.worldUnitsPerPixel/ph);this.player.add([this.legs,this.torso]);this.pose(false);
   this.ghost=this.add.image(880,322,registerHospitalPatient(this,this.rules.threat),0).setOrigin(.5,.75).setVisible(false);
   const weeperHome=chooseWeeper(this.level,this.mapSeed);this.weeper=weeperHome?new Weeper(weeperHome,weeperRoamPoints(this.level,weeperHome)):undefined;this.weeperSprite=this.add.image(weeperHome?.x??0,weeperHome?.y??0,registerWeeper(this),0).setOrigin(.5,52/72).setVisible(!!this.weeper);
   this.blocker=this.add.image(0,0,registerHospitalPatient(this,'patroller'),0).setOrigin(.5,.75).setTint(0x8b806e).setVisible(false);this.rogueVisual=this.add.graphics().setDepth(21);
   this.details=this.add.graphics().setDepth(1);
   if(this.textures.exists('endless-light'))this.textures.remove('endless-light');this.canvas=this.textures.createCanvas('endless-light',Math.ceil(this.level.width/2),Math.ceil(this.level.height/2))!;this.lightImage=this.add.image(0,0,'endless-light').setOrigin(0).setScale(2).setDepth(20);
   this.keys=this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,F,Q,R,T,SHIFT') as Record<string,Phaser.Input.Keyboard.Key>;this.input.keyboard!.addCapture(['UP','DOWN','LEFT','RIGHT']);
   const resetInput=()=>{this.sprintInput.clear();this.input.keyboard?.resetKeys();};
   const keyDown=(event:KeyboardEvent)=>{const playable=this.active&&!this.paused&&!this.tutorial.prompt;this.sprintInput.down(event,playable);const key=event.key.toUpperCase();if(playable&&!event.repeat&&['F','R','Q','T','E'].includes(key))this.itemQueue.add(key);};
   const keyUp=(event:KeyboardEvent)=>{this.sprintInput.up(event);if(event.key==='Shift'&&!this.sprintInput.active)this.keys.SHIFT.reset();};
   const visibility=()=>{if(document.hidden)resetInput();};
   window.addEventListener('keydown',keyDown,true);window.addEventListener('keyup',keyUp,true);window.addEventListener('blur',resetInput);document.addEventListener('visibilitychange',visibility);
   this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{window.removeEventListener('keydown',keyDown,true);window.removeEventListener('keyup',keyUp,true);window.removeEventListener('blur',resetInput);document.removeEventListener('visibilitychange',visibility);this.sprintInput.clear();});
   this.cameras.main.setZoom(1/PIXELS.worldUnitsPerPixel).setBounds(this.level.cameraBounds.x,this.level.cameraBounds.y,this.level.cameraBounds.width,this.level.cameraBounds.height).startFollow(this.player,true,.1,.1);
   this.signal=new SignalNoise(this);this.debug=this.add.graphics().setDepth(110);this.bodyFeedback=this.add.graphics().setDepth(115);this.healText=this.add.text(0,0,'',{fontFamily:canvasFont()+', NightPixel, sans-serif',fontSize:12,color:'#c7ccb0',stroke:'#0b1518',strokeThickness:2}).setOrigin(.5,1).setDepth(116).setVisible(false);this.interactionLabel=this.add.text(0,0,'',{fontFamily:canvasFont()+', NightPixel, sans-serif',fontSize:12,color:'#c7ccb0',stroke:'#10191c',strokeThickness:3,align:'center',rtl:direction(getLocale())==='rtl',wordWrap:{width:200,useAdvancedWrap:true}}).setOrigin(.5,1).setDepth(116).setVisible(false);this.active=this.pending;this.paused=false;this.pending=false;this.say('',0);this.sync();h.onReady();
   if((import.meta as unknown as {env:{DEV:boolean}}).env.DEV)(window as unknown as {__nightshift:()=>unknown}).__nightshift=()=>this.snapshot();
   if((import.meta as unknown as {env:{DEV:boolean}}).env.DEV&&new URLSearchParams(location.search).has('playtest'))(window as unknown as {__nightshiftScene:unknown}).__nightshiftScene=this;
  }
  startRun(round=1){if(!campaign.canPlay(round))return;this.round=Math.max(1,Math.floor(round));this.mapSeed=crypto.getRandomValues(new Uint32Array(1))[0];this.pending=true;this.scene.restart();}
  continueRun(){if(this.active||!campaign.canPlay(this.round+1))return false;this.startRun(this.round+1);return true;}
  hear(seconds=5){this.weeperNoise=.3;if(this.ghostTime>0&&!hearsPlayer(this.rules.threat,Math.hypot(this.player.x-this.ghost.x,this.player.y-this.ghost.y)))return;this.lastKnown={x:this.player.x,y:this.player.y};this.memory=seconds;if(this.ghostTime>0&&!this.weeper?.awake){this.patrolRetreat=false;this.patrolUnseen=0;}}
  pose(moving:boolean){this.moving=moving;const row=directionRow(this.angle),frame=row*4+gaitFrame(this.distance,moving);this.torso.setFrame(row*4+1);this.legs.setFrame(frame);const f=this.torso.frame;this.torso.setCrop(0,0,f.width,Math.floor(f.height*.63));this.legs.setCrop(f.width*(row%2?.12:.29),Math.floor(f.height*.63),f.width*(row%2?.78:.43),Math.ceil(f.height*.37));}
  solids(){const blocker=this.rogue.features.find(f=>f.kind==='blocker'),body=blocker?{x:blocker.x-6,y:blocker.y,width:blocker.width+12,height:blocker.height}:undefined;const blocked=body&&this.rogue.blockerPhase==='active'&&this.player&&!overlaps(feetAt(this.player.x,this.player.y),body)&&(!this.ghost||!overlaps(monsterFeetAt(this.ghost.x,this.ghost.y),body))?[body]:[];return [...this.morgueDrawer.solids,...blocked,...this.rogue.features.filter(f=>['cache','generator','machine','locker'].includes(f.kind)).map(f=>({x:f.x,y:f.y+8,width:f.width,height:f.height-8})),...this.level.walls,...this.level.props,...this.level.boxes.map(b=>({x:b.x-13,y:b.y-9,width:26,height:21})),...(this.door?[]:[this.level.door])];}
  monsterSolids(){const architecture=[...this.level.walls,...(this.door?[]:[this.level.door])];return this.solids().map(b=>architecture.includes(b)?monsterArchitecture(b):b);}
  snapshot(){return {atmosphereColors:this.atmosphereColors.snapshot,doorTarget:this.doorTarget,doorAttacker:this.doorAttacker,doorBroken:this.doorBreach.broken,doorBreach:this.doorBreach.progress,pursuit:{lastThreatAt:this.lastThreatAt,searchRemaining:this.pursuitSearch.remaining,searchPoints:this.pursuitSearch.points},bloodMoon:{amount:this.bloodMoon.amount,target:this.bloodMoon.target},morgueDrawer:{phase:this.morgueDrawer.phase,progress:this.morgueDrawer.progress,area:this.morgueDrawer.area},exitTour:this.exitTour,camera:{x:this.cameras.main.scrollX,y:this.cameras.main.scrollY},lightSuppressed:this.lightFear.lit,lightFlinch:this.lightFear.flinch,lightPinned:this.lightFear.suppressed,lightRecovery:this.lightFear.recovery,flashlightEffective:this.flashlightEffective,flashlightOn:this.flashlightOn,patrolRetreat:this.patrolRetreat,patrolUnseen:this.patrolUnseen,weeper:this.weeper?{roaming:this.weeper.roaming,position:{...this.weeper.position},home:{...this.weeper.home},noticed:this.weeper.noticed,phase:this.weeper.phase,clock:this.weeper.clock,anger:this.weeper.anger,frame:this.weeper.frame}:null,interaction:this.interactionTarget(),rogue:{features:this.rogue.features,opened:[...this.rogue.opened],hidden:this.rogue.hidden,blockerPhase:this.rogue.blockerPhase,stats:{...this.rogue.stats},phase:this.rogue.director.phase,time:this.rogue.time},sprintHeld:this.sprintInput.active,feedback:this.feedback.view,tutorial:{prompt:this.tutorial.prompt,completed:[...this.tutorial.completed],enabled:this.tutorial.enabled},lure:this.lure,stamina:this.stamina.value,exhausted:this.stamina.exhausted,exitStartup:this.exitStartup,battery:this.state.battery,events:this.eventRuntime.completed,eventPending:this.eventRuntime.pending,eventTriggered:this.eventRuntime.triggered,environment:this.environment.snapshot,interference:{drain:this.interference.drain,alarm:this.interference.alarm},crtStrength:this.crtStrength,rules:this.rules,decoys:this.decoys,bandages:this.bandages,memory:this.memory,ghostVisible:this.ghost.visible,blockerVisible:this.blocker.visible,blockerStun:this.rogue.blockerStun,player:{x:this.player.x,y:this.player.y},feet:feetAt(this.player.x,this.player.y),solids:this.solids(),moving:this.moving,walkDistance:this.distance,frame:this.legs.frame.name,night:this.level.round,level:this.level,key:this.key,lockKeys:{...this.locks.keys},doorUnlocked:this.locks.doorUnlocked,door:this.door,opened:this.opened,flashes:this.flashes,stun:this.stun,ghostDelay:this.ghostDelay,ghost:{x:this.ghost.x,y:this.ghost.y,time:this.ghostTime,frame:this.ghost.frame.name,feet:monsterFeetAt(this.ghost.x,this.ghost.y)},health:this.state.health,elapsed:this.state.elapsed,protection:this.protection,reveal:this.reveal,blackout:this.blackout};}
  say(text:string,seconds=3){this.messageUntil=this.state.elapsed+seconds;h.onMessage(text);}
  sync(){this.state.bloodMoon=this.bloodMoon.amount;this.state.exitTour=this.exitTour;this.state.lightSeconds=flashlightRemaining(this.state.battery,this.tutorial.enabled);this.state.flashlightBlocked=!!this.rogue.hidden;this.state.flashlightOn=this.flashlightOn;this.state.theme=this.level.theme;this.state.feedback=this.feedback.view;this.state.exitStartup=this.exitStartup;this.state.exhausted=this.stamina.exhausted;this.state.tutorialPracticing=this.tutorial.enabled&&(['flash','decoy','heal'] as Lesson[]).some(id=>this.tutorial.shown.has(id)&&this.tutorial.needs(id));this.state.tutorial=this.tutorial.prompt;this.state.flashes=this.flashes;this.state.decoys=this.decoys;this.state.bandages=this.bandages;this.state.keyCount=Object.values(this.locks.keys).filter(Boolean).length;this.state.keyNames=Object.entries(this.locks.keys).filter(([,v])=>v).map(([k])=>({brass:msg("gameplay.brass"),ward:msg("gameplay.red"),seal:msg("gameplay.blue")}[k])).join(' / ');this.state.stamina=this.stamina.value;this.state.phase=this.state.fuses===3?(this.exitStartup>0?msg("gameplay.exit-power-seconds", {seconds:Math.ceil(this.exitStartup)}):msg("ui.exit-powered")):this.round>1?this.rogue.director.phase:this.state.fuses>0?msg("gameplay.alert-rising"):msg("ui.search");this.state.rule=`${this.rules.threatName} · ${this.rules.hint} ｜ ${this.rules.eventName}`;this.state.inventory=msg("gameplay.keys-f-flash-r-decoy-q-bandage", {keys:formatList([this.locks.keys.brass?msg('key.brass'):'',this.locks.keys.ward?msg('key.ward'):'',this.locks.keys.seal?msg('key.seal'):''].filter(Boolean))||msg('key.none'),flashes:this.flashes,decoys:this.decoys,bandages:this.bandages});this.state.objective=this.state.fuses===3?(this.exitStartup>0?msg("gameplay.exit-power-starts-in-seconds-dodge-and", {seconds:Math.ceil(this.exitStartup)}):msg("gameplay.exit-powered-press-e-at-the-west")):msg("gameplay.find-keys-open-doors-and-boxes-fuses", {fuses:this.state.fuses});h.onState(this.state);}
  resumeTutorial(practice=true){if(this.tutorial.prompt==='exit'&&this.exitTour!=='none'){if(this.exitTour==='hold')this.returnFromExitTour();return;}this.debug.clear();const id=this.tutorial.resume();if(id==='practice'){if(practice){this.trainingHeal=true;this.state.health=Math.min(this.state.health,80);this.bandages=Math.max(1,this.bandages);this.tutorial.show('heal');}else this.tutorial.practiceSkipped=true;}if(id==='exit'||id==='health')this.tutorial.learn(id);if(isMonsterLesson(id)){this.stun=Math.max(this.stun,2);if(this.weeper){this.weeper.grace=Math.max(this.weeper.grace,2);}}this.protection=Math.max(this.protection,2);this.itemQueue.clear();this.sprintInput.clear();this.input.keyboard?.resetKeys();this.sync();}
  skipTutorial(){if(this.exitTour!=='none'){this.cameras.main.panEffect.reset();this.exitTour='none';this.cameras.main.startFollow(this.player,true,.1,.1);}this.debug.clear();this.tutorial.skip();this.trainingHeal=false;this.protection=Math.max(this.protection,2);this.sprintInput.clear();this.input.keyboard?.resetKeys();this.sync();}
  checkTutorial(){
   const t=this.tutorial;if(t.prompt)return;const distance=(p:{x:number;y:number})=>Math.hypot(this.player.x-p.x,this.player.y-p.y);
   if(this.trainingLure&&this.lure>0&&distance(this.lurePos)>65&&Math.hypot(this.ghost.x-this.lurePos.x,this.ghost.y-this.lurePos.y)<65){t.learn('decoy');this.trainingLure=false;this.stun=Math.max(this.stun,4);}
   if(this.distance<1&&t.show('move'))return;
   if(!t.needs('move')&&t.show('health'))return;
   if(!t.needs('health')&&t.show('flashlight'))return;
   if(this.trainingHeal&&t.show('heal'))return;
   if(this.weeper&&distance(this.weeper.position)<230&&this.canSee(this.player,this.weeper.position)&&this.cameras.main.worldView.contains(this.weeper.position.x,this.weeper.position.y)&&t.show('monster-weeper'))return;
   if(this.ghost.visible&&distance(this.ghost)<200&&this.canSee(this.player,this.ghost)&&this.cameras.main.worldView.contains(this.ghost.x,this.ghost.y)&&t.show(`monster-${this.rules.threat}`))return;
   if(!t.enabled)return;
   if(this.ghost.visible&&distance(this.ghost)<150&&this.canSee(this.player,this.ghost)&&t.needs('flash')){this.flashes=Math.max(1,this.flashes);if(t.show('flash'))return;}
   if(!t.needs('flash')&&t.needs('decoy')&&this.ghost.visible&&distance(this.ghost)<175&&this.stun<.3){this.decoys=Math.max(1,this.decoys);if(t.show('decoy'))return;}
   if(this.state.health<100&&t.show('heal')){this.bandages=Math.max(1,this.bandages);return;}
   if(!t.needs('flash')&&!t.needs('decoy')&&t.needs('heal')&&!t.practiceSkipped&&t.show('practice'))return;
   if(!this.key&&distance(this.level.key)<65&&t.show('key'))return;
   if(this.level.boxes.some((b,i)=>!this.opened[i]&&distance(b)<65)&&t.show('box'))return;
   if(distance(this.level.doorUse)<65&&t.show('door'))return;
   if(this.state.fuses===3&&t.show('exit'))this.beginExitTour();
  }
  beginExitTour(){
   this.exitTour='out';this.itemQueue.clear();this.sprintInput.clear();this.input.keyboard?.resetKeys();this.pose(false);
   const camera=this.cameras.main;camera.stopFollow();
   camera.pan(this.level.exit.x,this.level.exit.y,850,'Sine.easeInOut',true,(_camera,progress)=>{if(progress===1&&this.exitTour==='out'){this.exitTour='hold';this.sync();}});
  }
  returnFromExitTour(){
   this.exitTour='back';this.sync();const camera=this.cameras.main;
   camera.pan(this.player.x,this.player.y,700,'Sine.easeInOut',true,(_camera,progress)=>{if(progress===1&&this.exitTour==='back'){this.exitTour='none';camera.startFollow(this.player,true,.1,.1);this.resumeTutorial();}});
  }
  consumeKey(key:'F'|'R'|'Q'|'T'|'E'){const queued=this.itemQueue.delete(key);return Phaser.Input.Keyboard.JustDown(this.keys[key])||queued;}
  useItem(key:'F'|'R'|'Q'){if(this.active&&!this.paused&&!this.tutorial.prompt)this.itemQueue.add(key);}
  setPaused(v:boolean){this.paused=v;this.sprintInput.clear();this.input.keyboard?.resetKeys();this.itemQueue.clear();this.sync();}
  canMonsterContact(){const p=this.player,g=this.ghost;return clearContact({x:g.x,y:g.y+10},{x:p.x,y:p.y+12},this.solids());}
  repel(){
   this.rogue.blockerStun=5;this.flare=.32;let hit=false;
   if(this.weeper?.flash(this.player,this.solids())){hit=true;h.onCue('patient-stop');h.onCue('patient-stunned');this.say(msg("gameplay.flash-suppression-the-patient-fell-to-its"),2);}
   if(this.ghostTime>0&&Math.hypot(this.player.x-this.ghost.x,this.player.y-this.ghost.y)<190&&this.canSee(this.player,this.ghost)){
    hit=true;this.stun=itemRules.flashDuration+(this.rules.threat==='light-shy'?2:0);this.protection=Math.max(this.protection,2);
    const a=Phaser.Math.Angle.Between(this.player.x,this.player.y,this.ghost.x,this.ghost.y),next=moveWithCollision(this.ghost,Math.cos(a)*65,Math.sin(a)*65,this.monsterSolids(),monsterFeetAt);this.ghost.setPosition(next.x,next.y);this.route=[];this.routeTimer=0;
   }
   h.onCue('flash');return hit;
  }
  canSee(a:{x:number;y:number},b:{x:number;y:number}){return clearContact({x:a.x,y:a.y+10},{x:b.x,y:b.y+10},this.solids());}
  get flashlightEffective(){return this.flashlightOn&&this.state.battery>0&&!this.rogue.hidden;}
  toggleFlashlight(){if(!this.active||this.paused||this.tutorial.prompt)return;this.flashlightOn=!this.flashlightOn;if(this.tutorial.enabled&&this.tutorial.shown.has('flashlight')){if(!this.flashlightOn)this.flashlightPracticeOff=true;else if(this.flashlightPracticeOff)this.tutorial.learn('flashlight');}this.say(this.flashlightOn?(this.state.battery>0?msg("gameplay.flashlight-on"):msg("gameplay.battery-depleted")):msg("gameplay.flashlight-off"),1.4);this.sync();}

  get blackout(){return this.blackouts.remaining;}
  command(c:Command,source:'viewer'|'world'='viewer'){if(!this.active||this.paused||this.tutorial.prompt)return;
   if(this.round>1&&source==='viewer'){
    const bad=['ghost','blackout','drain','alarm'].includes(c);
    if(bad&&!this.rogue.director.admit()||!bad&&this.rogue.viewerCooldown>0){this.rogue.stats.viewerRejected++;this.say(msg("gameplay.an-interference-or-aid-effect-is-still"),2);return;}
    if(!bad)this.rogue.viewerCooldown=c==='sanctuary'?12:6;this.rogue.stats.viewerAccepted++;
   }
   if(this.round>1&&source==='world'&&this.rogue.director.recovery>0&&this.state.fuses<3)return;
   if(c==='blackout'){if(this.state.fuses===3||this.weeper?.awake||!this.blackouts.start()){this.say(msg("gameplay.power-disruption-delayed-another-event-is-active"),2);return;}this.say(msg("gameplay.power-outage-seconds"));h.onCue(this.level.theme===2?'plant-breaker-arc':'metal');}
   if(c==='ghost'){if(this.weeper?.awake){this.say(msg("gameplay.the-crying-is-approaching-another-pursuit-must"),2);return;}if(this.ghostTime>0){this.ghostTime=Math.min(34,this.ghostTime+4);this.say(msg("gameplay.it-has-not-left-yet"));}else{this.patrolRetreat=false;this.patrolUnseen=0;this.ghostTime=encounterProfile(this.round,this.state.fuses).duration;this.ghostDelay=3;this.hear(12);this.routeTimer=0;const intercept=this.state.fuses===3?chooseFinaleEntry([...this.level.monsterSpawns,...this.level.monsterEntries??[]],this.player,this.level.exit,this.monsterSolids(),this.level.bounds,encounterProfile(this.round,this.state.fuses).speed,p=>this.cameras.main.worldView.contains(p.x,p.y)&&this.canSee(this.player,p)):undefined;const entry=intercept??choosePursuitEntry([...this.level.monsterSpawns,...this.level.monsterEntries??[]],this.player,this.monsterSolids(),this.level.bounds,encounterProfile(this.round,this.state.fuses).speed,p=>this.cameras.main.worldView.contains(p.x,p.y)&&Math.hypot(p.x-this.player.x,p.y-this.player.y)<300&&this.canSee(this.player,p));if(!entry){this.ghostTime=0;this.cooldown=3;return;}const spawn=entry.position;this.pursuitSearch.reset();this.ghost.setPosition(spawn.x,spawn.y);this.finaleTarget=intercept?.target;this.lastKnown=intercept?.target??{x:this.player.x,y:this.player.y};this.memory=8;this.say(msg("gameplay.footsteps-approaching", {enemy:this.rules.threatName}),3);h.onCue('ghost',Phaser.Math.Clamp((spawn.x-this.player.x)/240,-1,1));}}
   if(c==='drain'){const started=this.interference.start('drain');this.say(started?msg("gameplay.battery-leak-seconds"):msg("gameplay.the-battery-is-still-leaking"));}
   if(c==='sanctuary'){this.protection=Math.max(this.protection,8);this.rogue.blockerStun=8;this.rogue.hurtCooldown=8;this.say(msg("gameplay.protection-granted-seconds"));}
   if(c==='reveal'){this.reveal=12;const cache=this.rogue.features.filter(f=>f.kind==='cache'&&!this.rogue.opened.has(f.id)).sort((a,b)=>Math.hypot(center(a).x-this.player.x,center(a).y-this.player.y)-Math.hypot(center(b).x-this.player.x,center(b).y-this.player.y))[0];this.say(cache?msg("gameplay.viewer-scouting-supplies-marked"):msg("gameplay.viewer-scouting-supplies-marked"));}
   if(c==='supply'){if(this.round===1){this.bandages=Math.min(6,this.bandages+1);this.flashes=Math.min(5,this.flashes+1);}else{const values=[this.flashes,this.decoys,this.bandages],i=values.indexOf(Math.min(...values));if(i===0)this.flashes=Math.min(3,this.flashes+1);else if(i===1)this.decoys=Math.min(3,this.decoys+1);else this.bandages=Math.min(3,this.bandages+1);}this.say(msg("gameplay.supplies-delivered-the-item-with-the-lowest"));}
   if(c==='repel'){const hit=this.repel();this.say(hit?msg("gameplay.rescue-flash-nearby-patient-suppressed"):msg("gameplay.rescue-flash-no-nearby-target-hit"),2);}
   if(c==='alarm'){const started=this.interference.start('alarm');if(started){this.hear(6);this.cooldown=Math.min(this.cooldown,3);h.onCue('call-bell');}this.say(started?msg("gameplay.noise-exposed-you-seconds"):msg("gameplay.the-noise-continues-this-effect-will-not"));}
   this.sync();
  }
  interact(){if(this.rogue.hidden){this.handleRogue(this.rogue.interact(this.player,false));return;}const p=this.player,near=(v:{x:number;y:number},r=34)=>Math.hypot(p.x-v.x,p.y-v.y)<r;
   if(!this.key&&near(this.level.key)){this.key=true;this.tutorial.learn('key');this.locks.takeBrass();this.say(msg("gameplay.brass-key-opens-only-the-brass-locked"));h.onCue('pickup');return;}
   const doorCenter={x:this.level.door.x+this.level.door.width/2,y:this.level.door.y+this.level.door.height/2};const doorDistance=Math.hypot(p.x-doorCenter.x,p.y-doorCenter.y);
   if(near(doorCenter,45)&&!this.level.boxes.some((b,i)=>!this.opened[i]&&(i!==2||this.door)&&near(b,Math.min(44,doorDistance)))){if(this.doorBreach.broken)return;if(this.locks.doorUnlocked||this.locks.keys.ward){const b=this.level.door,f=feetAt(this.player.x,this.player.y);if(this.door&&(overlaps(f,b)||(this.ghostTime>0&&overlaps(monsterFeetAt(this.ghost.x,this.ghost.y),monsterArchitecture(b)))||(!!this.weeper&&overlaps(monsterFeetAt(this.weeper.position.x,this.weeper.position.y),monsterArchitecture(b))))){this.say(msg("gameplay.step-away-from-the-doorway-before-closing"));return;}this.locks.unlockDoor();this.tutorial.learn('door');this.door=!this.door;this.route=[];this.routeTimer=0;this.say(this.door?msg("gameplay.door-opened"):msg("gameplay.door-closed"));h.onCue('metal');this.hear();}else this.say(msg("gameplay.locked-find-the-red-ward-key-in"));return;}
   const i=this.level.boxes.findIndex((v,i)=>!this.opened[i]&&near(v,44));if(i>=0){if(i===2&&!this.door){this.say(msg("gameplay.unlock-the-room-door-first"));return;}if(!this.locks.openBox(i)){this.say(i===1?msg("gameplay.brass-locked-box-find-the-brass-key"):msg("gameplay.sealed-box-requires-the-blue-key-from"));return;}this.opened[i]=true;this.tutorial.learn('box');this.hear();this.state.fuses++;this.say(msg("gameplay.box-opened-fuses", {fuses:this.state.fuses,hint:msg(i===0?'key.redObtained':i===1?'key.blueObtained':'key.blueConsumed')}));this.feedback.notice(msg('loot.fuse',{count:this.state.fuses,key:i===0?msg('gameplay.red-key-obtained'):i===1?msg('gameplay.blue-key-obtained'):''}),this.level.boxes[i].x,this.level.boxes[i].y-28);h.onCue('pickup');this.escalateSearch();return;}
   const feature=this.rogue.near(p);if(feature){const wasHidden=!!this.rogue.hidden;this.handleRogue(this.rogue.interact(p,this.ghost.visible&&Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y)<100&&this.canMonsterContact(),{flash:this.flashes,decoy:this.decoys,bandage:this.bandages}));if(!wasHidden&&this.rogue.hidden){this.memory=Math.min(this.memory,1.2);this.patrolUnseen=Math.max(this.patrolUnseen,encounterRules.patrolSearchSeconds-1.2);this.route=[];this.routeTimer=0;}return;}
   if(near(this.level.exit,37)){if(this.state.fuses===3){if(this.exitStartup>0)this.say(msg("gameplay.exit-power-starts-in-seconds-keep-moving", {seconds:Math.ceil(this.exitStartup)}));else this.finish(true);}else this.say(msg("gameplay.exit-needs-fuses", {fuses:this.state.fuses}));}
  }
  handleRogue(events:RogueEvent[]){for(const e of events){
   if(e.type==='message')this.say(e.text,5);
   else if(e.type==='sound')h.onCue(e.id);
   else if(e.type==='loot'){
    const names={flash:msg("ui.flash-device"),decoy:msg("ui.decoy"),bandage:msg("ui.bandage")},bindings={flash:'F',decoy:'R',bandage:'Q'} as const,fields={flash:'flashes',decoy:'decoys',bandage:'bandages'} as const,field=fields[e.item],before=this[field];
    if(e.full){const text=msg('loot.full',{item:names[e.item],count:before});this.feedback.notice(text,e.at.x,e.at.y-28,bindings[e.item]);}
    else{this[field]=Math.min(3,before+1);const added=this[field]-before;this.feedback.obtain(bindings[e.item]);const text=msg('loot.obtained',{item:names[e.item],added,count:this[field]});this.feedback.notice(text,e.at.x,e.at.y-28,bindings[e.item]);h.onCue('pickup');}
   }
   else if(e.type==='alarm'){this.lastKnown={...e.at};this.memory=8;this.cooldown=Math.min(this.cooldown,3);}
   else if(e.type==='damage'&&this.protection<=0){this.rogue.stats.hazardsHit++;this.state.health=Math.max(0,this.state.health-e.amount);this.feedback.hurt('left');this.protection=2;this.rogue.director.hurt();h.onCue('impact');}
   else if(e.type==='shortcut'){const gate=e.gate;this.level.walls=this.level.walls.flatMap(w=>{if(gate.x<w.x||gate.y<w.y||gate.x+gate.width>w.x+w.width||gate.y+gate.height>w.y+w.height)return [w];return (w.width<=20?[{...w,height:gate.y-w.y},{...w,y:gate.y+gate.height,height:w.y+w.height-gate.y-gate.height}]:[{...w,width:gate.x-w.x},{...w,x:gate.x+gate.width,width:w.x+w.width-gate.x-gate.width}]).filter(b=>b.height>0&&b.width>0);});this.route=[];this.routeTimer=0;h.onCue(this.level.theme===2?'plant-breaker-arc':'metal');}
  }}
  escalateSearch(){
   this.hear(14);if(this.ghostTime<=0)this.command('ghost','world');else this.ghostTime=Math.min(34,Math.max(this.ghostTime,18)+4);
   if(this.state.fuses===3){this.exitStartup=tuning.exitStartup;this.blackouts.start(6,true);this.cooldown=0;this.patrolRetreat=false;this.patrolUnseen=0;this.lastKnown={x:this.player.x,y:this.player.y};this.memory=14;if(this.ghostTime>0){const meeting=chooseFinaleEntry([{x:this.ghost.x,y:this.ghost.y}],this.player,this.level.exit,this.monsterSolids(),this.level.bounds,encounterProfile(this.round,3).speed,()=>false,125,0);this.finaleTarget=meeting?.target;}this.route=[];this.routeTimer=0;h.onCue('relay');this.say(msg("gameplay.the-alarm-exposed-you-its-footsteps-quicken"),5);h.onCue('call-bell');}
   else this.say(msg("gameplay.it-heard-the-box-open"),4);
  }
  interactionTarget(){
   const p=this.player,near=(v:{x:number;y:number},r:number)=>Math.hypot(p.x-v.x,p.y-v.y)<r;
   if(!this.key&&near(this.level.key,34))return {...this.level.key,y:this.level.key.y-42,text:msg("gameplay.e-pick-up-brass-key")};
   const d=this.level.door,dc={x:d.x+d.width/2,y:d.y+d.height/2},distance=Math.hypot(p.x-dc.x,p.y-dc.y);
   if(!this.doorBreach.broken&&near(dc,45)&&!this.level.boxes.some((b,i)=>!this.opened[i]&&(i!==2||this.door)&&near(b,Math.min(44,distance))))return {x:dc.x,y:d.y-12,text:this.locks.doorUnlocked?(this.door?msg("gameplay.e-close-room-door"):msg("gameplay.e-open-room-door")):this.locks.keys.ward?msg("gameplay.e-unlock-door-with-red-key"):msg("gameplay.room-door-red-key-required")};
   const i=this.level.boxes.findIndex((b,i)=>!this.opened[i]&&near(b,44));if(i>=0){const b=this.level.boxes[i];return {x:b.x,y:b.y-22,text:i===0?msg("gameplay.e-search-unlocked-box"):i===1?(this.locks.keys.brass?msg("gameplay.e-unlock-brass-box"):msg("gameplay.brass-box-brass-key-required")):!this.door?msg("gameplay.sealed-box-open-the-room-door-first"):this.locks.keys.seal?msg("gameplay.e-unlock-sealed-box"):msg("gameplay.sealed-box-blue-key-required")};}
   const f=this.rogue.near(p);if(f){const c=center(f);return {x:c.x,y:f.y-(f.kind==='locker'?33:17),text:f.kind==='cache'?(this.rogue.opened.has(f.id)?msg("gameplay.medicine-cabinet-empty"):msg("gameplay.e-collect-supplies")):this.rogue.hidden?msg('interaction.leave',{seconds:Math.max(0,Math.ceil(8-this.rogue.hideTime))}):msg("gameplay.e-hide-in-locker")};}
   if(near(this.level.exit,37))return {...this.level.exit,y:this.level.exit.y-24,text:this.state.fuses<3?msg('interaction.fuses',{count:this.state.fuses}):this.exitStartup>0?msg("gameplay.exit-power-starting"):msg("gameplay.e-escape")};
   return undefined;
  }
  draw(){const g=this.details;g.clear();const r=(x:number,y:number,w:number,hh:number,c:number)=>{g.fillStyle(c);g.fillRect(x,y,w,hh);};const t=this.state.elapsed;this.smallLamps=this.level.theme===6?[]:smallLights(g,t,this.opened[0],this.level);if(this.smallLamps[1])this.smallLamps[1].strength=this.crtStrength;if(this.level.theme===6)drawGardenLamps(g,this.level,(id,fallback)=>this.blackout>0?0:this.environment.strength(id,fallback),t,this.bloodMoon.amount);
   for(const f of this.rogue.features)if(f.gate&&this.rogue.opened.has(f.id)){const b=f.gate;r(b.x,b.y,b.width,b.height,paletteFloor(this.level.theme));}
   drawRogue(g,this.rogue);
   const target=this.interactionTarget();this.interactionLabel.setVisible(this.active&&!!target&&!this.tutorial.prompt);if(target){const view=this.cameras.main.worldView;this.interactionLabel.setText(target.text).setPosition(target.x,target.y);const half=this.interactionLabel.width/2;this.interactionLabel.setX(Phaser.Math.Clamp(target.x,view.x+half+6,view.right-half-6)).setY(Math.max(target.y,view.y+this.interactionLabel.height+8));}

   if(!this.key)drawKey(g,this.level.key);
   const drawer=this.morgueDrawer;if(drawer.area)drawMorgueDrawer(g,drawer.area,drawer.phase,drawer.progress,drawer.elapsed);
   if(this.morgueBody){
    const b=drawer.area,visible=!!b&&drawer.solids.length>0;this.morgueBody.setVisible(visible);
    if(b&&visible){const frame=this.morgueBody.frame,scale=Math.min((b.width-16)/frame.width,(b.height-24)/frame.height),top=b.y+b.height*drawer.progress-b.height+10,crop=Math.min(frame.height,Math.max(0,(b.y-top)/scale));
     this.morgueBody.setPosition(b.x+b.width/2,top).setScale(scale).setCrop(0,crop,frame.width,frame.height-crop).setVisible(crop<frame.height);
    }
   }
   for(let i=0;i<3;i++)drawChest(g,this.level.boxes[i],i,this.opened[i]);
   const d={...this.level.door,x:this.level.door.x+(this.doorBreach.progress>0?Math.round(Math.sin(t*45)*2):0)};r(d.x-3,d.y-4,4,d.height+10,0x98876b);r(d.x+d.width-1,d.y-4,4,d.height+10,0x98876b);r(d.x,d.y+d.height+2,d.width,3,0x9c8c66);
   if(!this.door){r(d.x,d.y,d.width,d.height,0x714b3b);for(let x=d.x+5;x<d.x+d.width-3;x+=10)r(x,d.y+2,2,d.height-4,0x392c29);r(d.x+25,d.y+2,12,9,0xc1ad83);r(d.x+28,d.y+4,6,2,0x61342e);r(d.x+48,d.y+7,4,4,0xd6bc80);}else{r(d.x-2,d.y-27,5,27,0x714b3b);r(d.x,d.y+4,d.width,2,0x514b3b);}
   if(this.doorBreach.progress>0||this.doorBreach.broken){g.lineStyle(2,0x221a18,1);for(let i=0;i<Math.ceil(this.doorBreach.progress);i++){const x=d.x+8+i*11;g.lineBetween(x,d.y+1,x+6,d.y+d.height-2);}if(this.doorBreach.broken)for(let i=0;i<6;i++)r(d.x+i*11,d.y+8+i%2*4,8,3,0x714b3b);}
   if(Math.hypot(this.player.x-(d.x+d.width/2),this.player.y-(d.y+d.height/2))<80){g.lineStyle(1,0xc9ad78,.8);g.strokeRect(d.x-4,d.y-5,d.width+8,d.height+12);}
   const ex=this.level.exit;r(ex.x-10,ex.y-14,24,36,0x1b3432);r(ex.x-7,ex.y-11,18,2,this.state.fuses===3&&this.exitStartup===0?0x8bc1a0:0x874b40);if(this.state.fuses===3&&this.exitStartup===0){r(ex.x-8,ex.y-12,2,32,0xb2e5ba);r(ex.x-6,ex.y+20,20,2,0x8fbd9b);}
   if(this.lure>0){r(this.lurePos.x-4,this.lurePos.y-4,8,8,0xd69c65);g.lineStyle(1,0xd69c65,.4);g.strokeCircle(this.lurePos.x,this.lurePos.y,12+Math.sin(t*5)*5);}
   // Discovery markers are above darkness but use small diamonds, not a scene-wide reveal.
  }
  drawBodyFeedback(){
   const g=this.bodyFeedback,p=this.player;g.clear();this.healText.setVisible(false);if(!this.active||this.rogue.hidden)return;
   const x=Math.round(p.x),y=Math.round(p.y);
   if(this.stamina.value<99||this.feedback.staminaNotice>0){g.fillStyle(0x080f14,.9);g.fillRect(x-19,y+22,38,6);for(let i=0;i<10;i++){g.fillStyle(i<Math.ceil(this.stamina.value/10)?(this.stamina.exhausted?0xa46950:this.stamina.value<30?0xc0a16b:0x9aa58a):0x303a35);g.fillRect(x-17+Math.round(i*3.5),y+24,2,2);}}
   if(this.feedback.heal>0){const step=Math.floor((1.4-this.feedback.heal)*6);g.fillStyle(0xbfc4aa,.85);g.fillRect(x-7,y-7+step%3*3,14,2);g.fillStyle(0x627163,.8);g.fillRect(x-3,y-8,2,10);this.healText.setText('+'+this.feedback.healAmount).setPosition(x,y-39-Math.floor((1.4-this.feedback.heal)*9)).setAlpha(Math.min(1,this.feedback.heal*2)).setVisible(true);}
   const hitFrame=Math.floor((.55-this.feedback.damage)*10);const tint=this.feedback.damage>0?(hitFrame%2===0?0xad6258:0xc2b9a7):0xffffff;this.torso.setTint(tint);this.legs.setTint(tint);
  }
  updateDoor(dt:number){
   const d=this.level.door,dc={x:d.x+d.width/2,y:d.y+d.height/2};
   const w=this.weeper?.dangerous?this.weeper:undefined;
   const enemy=w?.position??(this.ghostTime>0&&this.ghostDelay<=0?this.ghost:undefined);
   const attacker=w?'weeper':'ghost';
   this.doorPlanClock-=dt;
   if(this.state.fuses!==3||this.door||!enemy){this.doorTarget=undefined;this.doorAttacker=undefined;this.doorPlanClock=0;}
   else if(this.doorPlanClock<=0||this.doorAttacker!==attacker){
    const old=this.doorTarget;
    this.doorTarget=doorApproach(enemy,this.player,monsterArchitecture(d),this.monsterSolids(),this.level.bounds);
    this.doorAttacker=this.doorTarget?attacker:undefined;this.doorPlanClock=.3;
    if(!!old!==!!this.doorTarget){this.route=[];this.routeTimer=0;if(w)w.routeClock=0;}
   }
   if(this.doorTarget&&this.doorAttacker==='ghost'){this.patrolRetreat=false;this.memory=Math.max(this.memory,1);}
   const ready=!!enemy&&!!this.doorTarget&&Math.hypot(enemy.x-this.doorTarget.x,enemy.y-this.doorTarget.y)<8;
   const interrupted=!w&&(this.stun>0||this.lightFear.suppressed);
   const cue=this.doorBreach.tick(dt,ready&&!interrupted);

   if(cue){h.onCue(cue,Phaser.Math.Clamp((dc.x-this.player.x)/240,-1,1));if(this.doorBreach.broken){this.doorTarget=undefined;this.doorAttacker=undefined;this.door=true;this.route=[];this.routeTimer=0;if(this.weeper)this.weeper.routeClock=0;}}
  }
  updateWeeper(dt:number,sprinting:boolean){
   const w=this.weeper;if(!w)return;this.weeperNoise=Math.max(0,this.weeperNoise-dt);
   const events=w.tick(dt,{pursuitTarget:this.doorAttacker==='weeper'?this.doorTarget:undefined,player:this.player,hidden:!!this.rogue.hidden,angle:this.angle,light:this.flashlightEffective,lightRange:this.state.battery<20?190:250,sprinting,noise:this.weeperNoise>0,solids:this.solids(),architecture:this.monsterSolids(),bounds:this.level.bounds,immune:this.protection>0});
   if(!this.weeperIntroduced&&Math.hypot(w.position.x-this.player.x,w.position.y-this.player.y)<230){this.weeperIntroduced=true;this.say(msg("gameplay.crying-nearby-t-to-switch-off-and"),5);}
   const cryPan=Phaser.Math.Clamp((w.position.x-this.player.x)/240,-1,1),cryVolume=Math.max(0,1-Math.hypot(w.position.x-this.player.x,w.position.y-this.player.y)/500);
   h.onCue('patient-position',cryPan,cryVolume);
   for(const event of events){if(event==='quiet')h.onCue('patient-stop');else if(event==='hit'){this.state.health=0;this.feedback.hurt(w.position.x<this.player.x?'left':'right');h.onHit();h.onCue('impact');this.finish(false);return;}else h.onCue(event==='cry'?'patient-cry':event==='warning'?'patient-rise':event==='dash'?'patient-lunge':'patient-stunned',cryPan,event==='cry'?cryVolume:1);}
   this.weeperSprite.setPosition(w.position.x,w.position.y).setDepth(2+(w.position.y+16)/100).setFrame(w.frame).setFlipX((w.roaming||w.noticed||w.phase==='alert'||w.phase==='warning'||w.phase==='dash'||w.phase==='chasing'||w.phase==='returning')&&Math.cos(w.angle)<0).setTint(w.phase==='warning'?0xeadbcb:w.phase==='stunned'?0xbec3b2:0xa7a7a0);
  }
  light(){const ctx=this.canvas.context,p=this.player,t=this.state.elapsed;
   const phase=(t+this.round*3)%19,failed=this.level.theme!==6&&(phase>15&&phase<16.2||phase>17.5&&phase<18.1);
   const lamps:Lamp[]=this.level.lamps.map(l=>({...l,strength:this.blackout>0?(l.id==='LampExit'?.24:0):this.environment.strength(l.id,l.id==='LampCenter'&&failed?.1:l.strength)*(this.level.theme===6?.58:.82)*(this.blackouts.warning>0&&Math.floor(this.blackouts.warning*4)%2===0?.2:1),radius:this.blackout>0?58:l.radius*(this.level.theme===6?.68:.8)})).map(l=>l.id==='LampExit'?l:this.atmosphereColors.light(l));
   const drawer=this.morgueDrawer;if(drawer.area&&drawer.phase!=='idle'&&drawer.phase!=='cancelled')lamps.push({x:drawer.area.x+drawer.area.width/2,y:drawer.area.y+drawer.area.height*.55,radius:115,strength:drawer.phase==='warning'?.45+Math.sin(t*10)*.15:.52,color:'#a4c3c3',colorStrength:.22});
   if(this.level.theme===6)lamps.push({x:640,y:390,radius:1000,strength:.12,color:'#8f2837',colorStrength:.12});
   lamps.push(...this.rogue.features.filter(f=>['water','generator','machine','cache'].includes(f.kind)).map(f=>({...center(f),radius:40,strength:.3,color:f.kind==='water'?'#67a9af':'#b58b57'})));
   lamps.push(...this.smallLamps.map(l=>this.atmosphereColors.light(l)),{x:this.level.door.x+this.level.door.width/2,y:this.level.door.y+this.level.door.height+8,radius:42,strength:.3,color:'#a96540'});
   if(this.exitStartup>0){const pulse=.55+.45*Math.sin((tuning.exitStartup-this.exitStartup)*Math.PI*3);for(const l of this.level.lamps)lamps.push({x:l.x,y:l.y,radius:55,strength:.12+pulse*.1,color:'#8b2028',colorStrength:.12+pulse*.12});}
   lamps.push({x:p.x,y:p.y+4,radius:44,strength:.34,color:'#a0acb4'});
   if(this.flashlightEffective)lamps.push(this.atmosphereColors.light({x:p.x,y:p.y+4,radius:this.state.battery<20?190:250,strength:.98,color:'#d4c6a0',angle:this.angle}));
   const exitReady=this.state.fuses===3&&this.exitStartup===0;lamps.push({x:this.level.exit.x,y:this.level.exit.y-18,radius:exitReady?76:46,strength:exitReady?.64:.4,color:'#79bd90',colorStrength:exitReady?.18:.1});
   if(this.weeper){const w=this.weeper,dim=w.phase==='stunned'?.2:1,pulse=1+Math.sin(t*1.7)*.06;lamps.push({x:w.position.x-5,y:w.position.y+16,radius:52,strength:.24*dim,color:'#941d27',colorStrength:.3*dim*pulse},{x:w.position.x+12,y:w.position.y+20,radius:28,strength:.12*dim,color:'#87202a',colorStrength:.16*dim});}
   const opaqueProps=this.level.props.filter(b=>b.kind==='rack'||b.kind==='engine'||b.kind==='coldcabinet');
   this.lighting.render(ctx,this.level.theme===6?lamps.map(l=>this.bloodMoon.light(l)):lamps,[...this.level.walls,...opaqueProps,...(this.door?[]:[this.level.door])],this.level.props,p,this.blackout>0);
   ctx.globalCompositeOperation='source-over';if(this.flare>0){ctx.fillStyle='rgba(170,194,184,.17)';ctx.fillRect(0,0,this.canvas.width,this.canvas.height);}if(this.reveal>0){ctx.strokeStyle='#d3b96f';ctx.lineWidth=1;for(const v of [...this.rogue.features.filter(f=>['cache','generator'].includes(f.kind)).map(center),...(!this.key?[this.level.key]:[]),...this.level.boxes.filter((_,i)=>!this.opened[i])]){ctx.beginPath();ctx.moveTo(v.x/2,v.y/2-9);ctx.lineTo(v.x/2+5,v.y/2-4);ctx.lineTo(v.x/2,v.y/2+1);ctx.lineTo(v.x/2-5,v.y/2-4);ctx.closePath();ctx.stroke();}}
   this.canvas.refresh();
  }
  update(_t:number,delta:number){if(!this.player)return;if(this.active&&!this.paused){this.checkTutorial();if(this.tutorial.prompt){const id=this.tutorial.prompt;const target=id==='monster-weeper'?this.weeper?.position:isMonsterLesson(id)?this.ghost:id==='key'?this.level.key:id==='box'?this.level.boxes.find((_,i)=>!this.opened[i]):id==='door'?this.level.doorUse:id==='exit'?this.level.exit:undefined;this.debug.clear();if(target){this.debug.lineStyle(1,0xb5a77b,.85);for(const [dx,dy]of [[-1,-1],[1,-1],[-1,1],[1,1]]){const x=target.x+dx*19,y=target.y+dy*19;this.debug.lineBetween(x,y,x-dx*7,y);this.debug.lineBetween(x,y,x,y-dy*7);}}this.draw();this.light();this.sync();return;}}const dt=Math.min(delta/1000,.05),p=this.player;if(this.active&&!this.paused){const drawerCue=this.morgueDrawer.tick(dt,this.opened.filter(Boolean).length,!!this.morgueDrawer.area&&Math.hypot(p.x-this.morgueDrawer.area.x,p.y-this.morgueDrawer.area.y)<300,[feetAt(p.x,p.y),...(this.ghost.visible?[monsterFeetAt(this.ghost.x,this.ghost.y)]:[]),...(this.weeper?[monsterFeetAt(this.weeper.position.x,this.weeper.position.y)]:[]),...(this.blocker.visible?[monsterFeetAt(this.blocker.x,this.blocker.y)]:[])]);if(drawerCue){h.onCue(drawerCue==='warning'?'morgue-knock':'morgue-slide',Phaser.Math.Clamp(((this.morgueDrawer.area?.x??p.x)-p.x)/240,-1,1));this.route=[];this.routeTimer=0;}
   this.atmosphereColors.tick(dt,!this.tutorial.enabled&&this.blackout<=0&&this.blackouts.warning<=0&&this.state.fuses<3&&this.bloodMoon.target===0&&this.bloodMoon.amount===0);this.bloodMoon.tick(dt);if(this.bloodMoon.flickering&&!this.bloodFlicker)h.onCue('blood-moon-flicker');this.bloodFlicker=this.bloodMoon.flickering;this.feedback.tick(dt);this.rogue.director.tick(dt,this.ghostTime,this.ghostDelay);this.state.elapsed+=dt;if(this.exitStartup>0){const second=Math.ceil(this.exitStartup);this.exitStartup=Math.max(0,this.exitStartup-dt);if(Math.ceil(this.exitStartup)!==second&&this.exitStartup>0)h.onCue(this.exitStartup<=3?'relay-urgent':'relay');if(this.exitStartup===0){this.feedback.exitReady=2.4;this.say(msg("gameplay.exit-powered-press-e-at-the-west-156"),4);h.onCue('call-bell');}}this.state.battery=Math.max(0,this.state.battery-this.interference.tick(dt));if(this.interference.alarm>0&&this.lure<=0)this.hear(1);if(this.level.theme===6&&this.opened.every(Boolean)){this.eventRuntime.reset();this.environment.reset();}else this.eventRuntime.tick(dt,{flags:{first_box:this.opened[0],second_box:this.opened[1],all_fuses:this.opened.every(Boolean),key_collected:this.key},zones:Object.fromEntries(Object.entries(this.level.zones??{}).map(([id,b])=>[id,p.x>=b.x&&p.x<=b.x+b.width&&p.y>=b.y&&p.y<=b.y+b.height]))});
   if(this.echoAt>0&&this.state.elapsed>=this.echoAt){this.echoAt=0;h.onCue('step',-.7);}
   if(this.state.elapsed>=this.ambienceAt&&this.ghostTime<=0){this.ambienceIndex++;this.ambienceAt=this.state.elapsed+27+(this.round*7+this.ambienceIndex*11)%18;if(this.ambienceIndex%2){h.onCue('step',.8);this.echoAt=this.state.elapsed+.65;this.say(msg("gameplay.the-footsteps-behind-the-wall-are-one"),4);}else{h.onCue('metal',-.8);this.say(msg("gameplay.something-is-dragging-in-an-empty-room"),4);}}

   const outage=this.blackouts.tick(dt,this.state.fuses,this.round,this.rules.event==='power',!!this.weeper?.awake||this.tutorial.combatTraining);if(outage==='warning')h.onCue('metal');else if(outage==='outage'){this.say(msg("gameplay.power-outage-seconds-your-flashlight-still-works", {seconds:this.round===1?4:5}),3);h.onCue(this.level.theme===2?'plant-breaker-arc':'metal');}
   for(const key of ['memory','routeTimer','hit','protection','reveal','flare','lure','stun','ghostDelay','helpCooldown'] as const)if(key!=='memory'||this.ghostDelay<=0)this[key]=Math.max(0,this[key]-dt);
   let dx=Number(this.keys.D.isDown||this.keys.RIGHT.isDown)-Number(this.keys.A.isDown||this.keys.LEFT.isDown),dy=Number(this.keys.S.isDown||this.keys.DOWN.isDown)-Number(this.keys.W.isDown||this.keys.UP.isDown);const sprint=this.sprintInput.active&&this.stamina.canSprint;let traveled=0;
   if(this.rogue.hidden&&(dx||dy))this.handleRogue(this.rogue.tick(0,p,true,false,false,false));
   if(dx||dy){this.angle=Math.atan2(dy,dx);const length=Math.hypot(dx,dy),speed=sprint?tuning.sprintSpeed:tuning.walkSpeed,next=moveWithCollision(p,dx/length*speed*dt,dy/length*speed*dt,this.solids());traveled=Math.hypot(next.x-p.x,next.y-p.y);p.setPosition(next.x,next.y);this.distance+=traveled;}const wasExhausted=this.stamina.exhausted;this.stamina.tick(dt,sprint&&traveled>.05);if(!wasExhausted&&this.stamina.exhausted){this.feedback.staminaNotice=2;h.onCue('exhausted');this.say(msg("gameplay.catch-your-breath-release-shift-to-recover"),2);}else if(wasExhausted&&!this.stamina.exhausted){this.feedback.staminaNotice=1;h.onCue('recover');}if((this.state.health<=30||this.stamina.value<30)&&this.state.elapsed>=this.breathAt){this.breathAt=this.state.elapsed+2.5;h.onCue('breath');}this.pose(traveled>.05);if(this.distance>30)this.tutorial.learn('move');if(sprint&&traveled>0)this.hear();this.step+=traveled>.05?dt:0;if(this.step>(sprint?.25:.45)){this.step=0;h.onCue('step');}
   this.handleRogue(this.rogue.tick(dt,p,traveled>.05,sprint,this.keys.E.isDown,this.ghostTime>0&&this.rogue.director.recovery===0&&this.state.fuses<3));
   this.player.setAlpha(this.rogue.hidden?0:1);
   const blockerFeature=this.rogue.features.find(f=>f.kind==='blocker');if(blockerFeature){const at=center(blockerFeature);this.blocker.setPosition(at.x,at.y).setVisible(true).setDepth(2+(at.y+16)/100).setFrame((this.rogue.blockerPhase==='idle'?8:0)+(Math.floor(this.rogue.time*3)%4)).setTint(this.rogue.blockerStun>0?0x6c9691:this.rogue.blockerPhase==='warning'?0xb28d6b:0x8b806e);}
   if(this.rogue.steamAt(p)){this.memory=0;this.rogueVisual.clear();this.rogueVisual.fillStyle(0x92a5a6,.2);for(let i=0;i<7;i++)this.rogueVisual.fillRect(p.x-30+i*8,p.y-40+(i%3)*8,16,40);}else this.rogueVisual.clear();
   this.state.battery=Math.max(0,this.state.battery-flashlightDrain(dt,this.flashlightOn&&!this.rogue.hidden,this.tutorial.enabled));this.state.noise=Phaser.Math.Clamp(this.state.noise+dt*(sprint&&traveled>0?15:-22),0,100);
   if(this.consumeKey('T'))this.toggleFlashlight();
   if(this.consumeKey('F')){if(this.flashes>0){this.flashes--;this.feedback.use('F');if(this.repel()){this.tutorial.learn('flash');if(this.weeper?.phase!=='stunned')this.say(msg("gameplay.flash-hit-leave-now"),2);}else this.say(msg("gameplay.flash-missed"),2);}else this.say(msg("gameplay.no-flashes-left-use-r-for-a"));}

   if(this.consumeKey('R')&&this.decoys>0){this.decoys--;this.feedback.use('R');if(this.tutorial.needs('decoy'))this.trainingLure=true;this.lure=itemRules.decoyDuration;this.rogue.blockerStun=Math.max(this.rogue.blockerStun,5);this.lurePos={x:p.x,y:p.y};this.say(msg("gameplay.the-decoy-lasts-seconds-leave-now", {seconds:itemRules.decoyDuration}));h.onCue('call-bell');}
   if(this.consumeKey('Q')&&this.bandages>0&&this.state.health<100){this.bandages--;const before=this.state.health;this.state.health=Math.min(100,this.state.health+40);this.feedback.healed(before,this.state.health);h.onCue('bandage');this.tutorial.learn('heal');this.trainingHeal=false;this.say(msg("gameplay.bandaging-complete-restored-health", {health:this.feedback.healAmount}));}
   if(this.consumeKey('E'))this.interact();if(!this.active)return;
   this.updateDoor(dt);this.updateWeeper(dt,sprint&&traveled>0);if(!this.active)return;const roomCue=this.sceneAudio.tick(dt,this.level,p,this.state.fuses,this.ghost.visible||!!this.weeper&&Math.hypot(this.weeper.position.x-p.x,this.weeper.position.y-p.y)<380);if(roomCue)h.onCue(roomCue.id,Phaser.Math.Clamp((roomCue.source.x-p.x)/240,-1,1),this.canSee(p,roomCue.source)?.8:.35);
   if(this.round>1&&this.state.elapsed-this.lastThreatAt>38&&this.ghostTime<=0)this.cooldown=Math.min(this.cooldown,6);
   if(this.weeper?.dangerous&&Math.hypot(p.x-this.weeper.position.x,p.y-this.weeper.position.y)<260)this.lastThreatAt=this.state.elapsed;
   if(!this.weeper?.awake&&this.ghostTime<=0&&(this.rogue.director.recovery===0||this.state.fuses===3)&&!(this.tutorial.combatTraining&&this.state.fuses===0)){this.cooldown-=dt;if(this.cooldown<=0)this.command('ghost','world');}
   if(this.ghostTime<=0||this.ghostDelay>0)this.lightFear.reset();
   if(this.ghostTime>0){if(this.ghostDelay<=0){if(Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y)<220&&this.canSee(this.ghost,p))this.lastThreatAt=this.state.elapsed;const seen=detectsPlayer(this.rules.threat,Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y),!this.rogue.hidden&&this.canSee(this.ghost,p));
    if(seen&&!this.weeper?.awake){this.finaleTarget=undefined;this.lastThreatAt=this.state.elapsed;this.pursuitSearch.reset();this.lastKnown={x:p.x,y:p.y};this.memory=this.state.fuses===3?9:encounterRules.patrolSearchSeconds;this.patrolUnseen=0;this.patrolRetreat=false;}else this.patrolUnseen+=dt;
    this.ghostTime=Math.max(.1,this.ghostTime-dt);
    const searching=!seen&&this.memory===0;
    const searchTarget=searching?this.pursuitSearch.tick(dt,this.ghost,this.lastKnown,this.monsterSolids(),this.level.bounds):this.lastKnown;
    const stranded=(this.patrolUnseen>25||this.state.elapsed-this.lastThreatAt>38)&&Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y)>300;
    if(!this.doorTarget&&(this.weeper?.awake||searching&&this.pursuitSearch.remaining===0||stranded)){if(!this.patrolRetreat){this.route=[];this.routeTimer=0;}this.patrolRetreat=true;}
    let target=this.doorAttacker==='ghost'&&this.doorTarget?this.doorTarget:this.patrolRetreat?this.level.monsterSpawns.reduce((a,b)=>Math.hypot(a.x-this.ghost.x,a.y-this.ghost.y)<Math.hypot(b.x-this.ghost.x,b.y-this.ghost.y)?a:b):this.lure>0?this.lurePos:this.rogue.distraction??this.finaleTarget??searchTarget;if(this.finaleTarget&&Math.hypot(this.ghost.x-this.finaleTarget.x,this.ghost.y-this.finaleTarget.y)<28)this.finaleTarget=undefined;
    if(this.patrolRetreat&&!this.cameras.main.worldView.contains(this.ghost.x,this.ghost.y)&&Math.hypot(this.ghost.x-p.x,this.ghost.y-p.y)>220){this.ghostTime=0;this.cooldown=encounterProfile(this.round,this.state.fuses).rest+(this.state.fuses<3&&this.rules.event==='quiet'?4:0);}

    {if(this.routeTimer<=0){this.route=patrolPath(this.ghost,target,this.monsterSolids(),this.level.bounds,monsterFeetAt);this.routeTimer=.6;}while(this.route.length&&Math.hypot(this.route[0].x-this.ghost.x,this.route[0].y-this.ghost.y)<.001)this.route.shift();target=this.route[0]??{x:this.ghost.x,y:this.ghost.y};}
    const a=Phaser.Math.Angle.Between(this.ghost.x,this.ghost.y,target.x,target.y);if(this.rogue.features.some(f=>f.kind==='water'&&waterPhase(this.rogue.time,f.roll*10)==='live'&&Math.hypot(center(f).x-this.ghost.x,center(f).y-this.ghost.y)<24))this.stun=Math.max(this.stun,.4);
    const illuminated=this.stun<=0&&!this.patrolRetreat&&this.rules.threat==='light-shy'&&lightSlows(this.angle,this.ghost.x-p.x,this.ghost.y-p.y,this.flashlightEffective?this.state.battery:0,clearContact({x:p.x,y:p.y+4},{x:this.ghost.x,y:this.ghost.y+4},this.solids()));
    if(this.patrolRetreat||this.rules.threat!=='light-shy')this.lightFear.reset();
    const speedFactor=this.lightFear.tick(dt,illuminated);
    if(this.stun<=0){const beforeGhost={x:this.ghost.x,y:this.ghost.y};const speed=encounterProfile(this.round,this.state.fuses,this.exitStartup).speed;
     if(speedFactor<0){const away=Math.atan2(this.ghost.y-p.y,this.ghost.x-p.x),next=moveWithCollision(this.ghost,Math.cos(away)*speed*(-speedFactor)*dt,Math.sin(away)*speed*(-speedFactor)*dt,this.monsterSolids(),monsterFeetAt);this.ghost.setPosition(next.x,next.y);this.routeTimer=0;}
     else{const movement=followPatrolPath(this.ghost,this.route,speed*speedFactor*dt,this.monsterSolids());this.ghost.setPosition(movement.position.x,movement.position.y);if(movement.blocked)this.routeTimer=0;}
     this.ghostStride+=Math.hypot(this.ghost.x-beforeGhost.x,this.ghost.y-beforeGhost.y);if(this.ghostStride>40){this.ghostStride=0;const gap=Math.hypot(this.ghost.x-p.x,this.ghost.y-p.y);if(gap<320&&!this.weeper?.dangerous)h.onCue('step',Phaser.Math.Clamp((this.ghost.x-p.x)/240,-1,1),Math.max(0,1-gap/320)*(this.canSee(this.ghost,p)?.7:.3));}
     this.ghost.setFrame(directionRow(this.lightFear.suppressed?Math.atan2(p.y-this.ghost.y,p.x-this.ghost.x):a)*4+(this.lightFear.suppressed?(this.lightFear.loweringArms?0:1):Math.floor(this.state.elapsed*4)%4));}if(!this.weeper?.awake&&!this.patrolRetreat&&!this.rogue.hidden&&!this.lightFear.suppressed&&this.stun<=0&&this.hit<=0&&this.protection<=0&&Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y)<26&&this.canMonsterContact()){this.state.health=Math.max(this.tutorial.combatTraining?40:0,this.state.health-tuning.contactDamage);this.hit=1.8;this.protection=1.8;this.rogue.director.hurt();this.feedback.hurt(this.ghost.x<p.x?'left':'right');h.onHit();h.onCue('impact');}}}
   this.ghost.setVisible(this.ghostTime>0&&this.ghostDelay<=0).setTint(this.stun>0?0x7fc5cd:this.lightFear.suppressed?0xd8dac7:this.rules.threat==='listener'?0xb39e88:this.rules.threat==='light-shy'?0xa5bfc8:0xc0a4a4);
   this.state.pressure=this.weeper?.dangerous?1:this.ghost.visible?Math.max(0,1-Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y)/240):0;this.state.fear=8+this.state.fuses*5+this.state.pressure*65;this.pulse+=dt;if(this.state.pressure>.3&&this.pulse>1.25){this.pulse=0;h.onCue('heartbeat');}
   if(this.messageUntil<this.state.elapsed)h.onMessage('');
   if(this.state.health<=0)this.finish(false);
  }if((import.meta as unknown as {env:{DEV:boolean}}).env.DEV&&new URLSearchParams(location.search).has('debug')){this.debug.clear();this.debug.lineStyle(1,0x59c9a3,.65);for(const b of this.solids())this.debug.strokeRect(b.x,b.y,b.width,b.height);this.debug.lineStyle(1,0xe2ac59,.8);for(const b of Object.values(this.level.zones))this.debug.strokeRect(b.x,b.y,b.width,b.height);for(const n of this.route)this.debug.strokeCircle(n.x,n.y,2);}this.signal.update(this.state.elapsed,this.active&&!this.paused, this.ghost.visible?Math.max(0,1-Math.hypot(p.x-this.ghost.x,p.y-this.ghost.y)/220):0,this.blackout>0,this.crtStrength>.5);this.player.setDepth(2+(p.y+16)/100);this.ghost.setDepth(2+(this.ghost.y+17)/100);this.draw();this.drawBodyFeedback();if(this.frame++%2===0)this.light();this.syncTime+=dt;if(this.syncTime>.12){this.syncTime=0;this.sync();}}
  finish(won:boolean){this.atmosphereColors=new AtmosphereColors();this.bloodMoon.reset();h.onCue('patient-stop');recordRun({night:this.round,seed:this.level.generation?.seed,won,elapsed:this.state.elapsed,health:this.state.health,flashes:this.flashes,decoys:this.decoys,bandages:this.bandages,...this.rogue.stats});this.blocker.setVisible(false);this.interactionLabel.setVisible(false);this.rogueVisual.clear();this.torso.clearTint();this.legs.clearTint();this.feedback.reset();this.tutorial.prompt=null;this.eventRuntime.reset();this.environment.reset();this.interference.reset();this.exitStartup=0;this.crtStrength=.36;if(won)campaign.complete(this.round);this.active=false;this.pose(false);this.sync();h.onEnd({won,night:this.round,elapsed:this.state.elapsed,health:this.state.health,fuses:this.state.fuses,cabinet:this.opened[1],barrier:this.door,powered:this.state.fuses===3,map:this.level.name,rogue:{...this.rogue.stats}});}
 }
 const scene=new Shift('Endless');const app=new Phaser.Game({type:Phaser.AUTO,parent:'game',width:PIXELS.width,height:PIXELS.height,backgroundColor:'#0b1118',pixelArt:true,roundPixels:true,antialias:false,scale:{mode:Phaser.Scale.NONE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:[scene],audio:{noAudio:true}});app.events.once(Phaser.Core.Events.READY,()=>attachPixelScale(app,document.querySelector<HTMLElement>('#game')!));
 return {toggleFlashlight:()=>scene.toggleFlashlight(),resumeTutorial:(practice=true)=>scene.resumeTutorial(practice),skipTutorial:()=>scene.skipTutorial(),useItem:(key:'F'|'R'|'Q')=>scene.useItem(key),continueRun:()=>scene.continueRun(),startRun:(n=1)=>scene.startRun(n),setPaused:(v:boolean)=>scene.setPaused(v),command:(c:Command)=>scene.command(c),closeMonitor:()=>{},acknowledgeBell:()=>false,submitCode:(_c:string)=>false,closePuzzle:()=>{},getClue:()=>msg("gameplay.stage-brass-keys-open-brass-boxes-the", {stage:scene.round,area:scene.level?.name??'',stunSeconds:itemRules.flashDuration,decoySeconds:itemRules.decoyDuration})};
}
