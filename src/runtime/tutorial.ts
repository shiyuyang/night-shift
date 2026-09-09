import {itemRules} from '../run-rules.ts';
import {tuning} from './pacing.ts';
import {t as msg} from '../i18n.ts';
export const MONSTER_LESSONS_KEY='night-shift-monster-lessons-v1';
export const monsterLessons=['monster-listener','monster-light-shy','monster-patroller','monster-weeper'] as const;
export type MonsterLesson=typeof monsterLessons[number];
export function isMonsterLesson(id:string|null):id is MonsterLesson{return monsterLessons.some(value=>value===id);}
export const lessons={
 'monster-listener':{get title(){return msg("tutorial.monster-listenerTitle")},get text(){return msg("tutorial.monster-listenerText")},target:'world'},
 'monster-light-shy':{get title(){return msg("tutorial.monster-light-shyTitle")},get text(){return msg("tutorial.monster-light-shyText")},target:'world'},
 'monster-patroller':{get title(){return msg("tutorial.monster-patrollerTitle")},get text(){return msg("tutorial.monster-patrollerText",{seconds:itemRules.flashDuration})},target:'world'},
 'monster-weeper':{get title(){return msg("tutorial.monster-weeperTitle")},get text(){return msg("tutorial.monster-weeperText")},target:'world'},
 health:{get title(){return msg("tutorial.healthTitle")},get text(){return msg("tutorial.healthText")},target:'health'},
 flashlight:{get title(){return msg("tutorial.flashlightTitle")},get text(){return msg("tutorial.flashlightText")},target:'light'},
 move:{get title(){return msg("lesson.first-rule-of-the-night-shift")},get text(){return msg("lesson.move-with-wasd-arrows-hold-shift-for")},target:'stamina'},
 key:{get title(){return msg("lesson.keep-the-key-safe")},get text(){return msg("lesson.approach-the-brass-key-on-the-floor")},target:'key'},
 box:{get title(){return msg("lesson.searching-makes-noise")},get text(){return msg("lesson.approach-a-box-and-press-e-to")},target:'world'},
 flash:{get title(){return msg("lesson.do-not-let-it-get-closer")},get text(){return msg("lesson.it-is-within-flash-range-press-f")},target:'F'},
 decoy:{get title(){return msg("lesson.send-it-the-wrong-way")},get text(){return msg("lesson.press-r-or-click-the-decoy-to")},target:'R'},
 heal:{get title(){return msg("lesson.treat-the-wound-first")},get text(){return msg("lesson.press-q-or-click-the-bandage-to")},target:'Q'},
 practice:{get title(){return msg("lesson.bandaging-practice-optional")},get text(){return msg("lesson.you-are-unhurt-simulate-a-minor-injury")},target:'Q'},
 door:{get title(){return msg("lesson.keep-an-escape-route")},get text(){return msg("lesson.approach-the-room-door-and-press-e")},target:'world'},
 exit:{get title(){return msg("lesson.the-final-patrol")},get text(){return msg("tutorial.exitText",{seconds:tuning.exitStartup})},target:'world'}
} as const;
export type Lesson=keyof typeof lessons;
export class Tutorial {
 private storage?:Pick<Storage,'getItem'|'setItem'>;
 private learnedMonsters=new Set<MonsterLesson>();
 constructor(storage?:Pick<Storage,'getItem'|'setItem'>){
  try{this.storage=storage??globalThis.localStorage;const saved=JSON.parse(this.storage?.getItem(MONSTER_LESSONS_KEY)??'[]');if(Array.isArray(saved))for(const id of saved)if(isMonsterLesson(id))this.learnedMonsters.add(id);}catch{/* Missing or unavailable storage keeps session progress. */}
 }
 completed=new Set<Lesson>();shown=new Set<Lesson>();prompt:Lesson|null=null;enabled=false;practiceSkipped=false;
 start(round:number){this.enabled=round===1;this.completed.clear();this.shown.clear();this.prompt=null;this.practiceSkipped=false;}
 needs(id:Lesson){return isMonsterLesson(id)?!this.learnedMonsters.has(id):this.enabled&&!this.completed.has(id);}
 show(id:Lesson){if(!this.needs(id)||this.shown.has(id)||this.prompt)return false;this.prompt=id;this.shown.add(id);return true;}
 resume(){const id=this.prompt;if(isMonsterLesson(id))this.learn(id);this.prompt=null;return id;}
 learn(id:Lesson){if(!this.needs(id))return;this.completed.add(id);if(isMonsterLesson(id)){this.learnedMonsters.add(id);try{this.storage?.setItem(MONSTER_LESSONS_KEY,JSON.stringify([...this.learnedMonsters]));}catch{/* Keep session progress when saving is unavailable. */}}}
 skip(){this.enabled=false;this.prompt=null;}
 get combatTraining(){return this.enabled&&(this.needs('flash')||this.needs('decoy'));}
}
