export const MONSTER_LESSONS_KEY='night-shift-monster-lessons-v1';
export const monsterLessons=['monster-listener','monster-light-shy','monster-patroller','monster-weeper'] as const;
export type MonsterLesson=typeof monsterLessons[number];
export function isMonsterLesson(id:string|null):id is MonsterLesson{return monsterLessons.some(value=>value===id);}
export const lessons={
 'monster-listener':{title:'听声者 · 轻走离开',text:'它看不见你，但疾跑、开箱和开关门会暴露位置。轻走离开发声处，或用 R 诱饵引开它；不要停在它正在寻找的位置。',target:'world'},
 'monster-light-shy':{title:'畏光者 · 照一下，转身跑',text:'回头用手电照它一下，它会遮脸后退。转身后仍有约 2 秒逃跑时间；它放下手臂就会恢复追逐，短时间重复照光不能延长控制。按 F 闪光可争取更长时间。',target:'world'},
 'monster-patroller':{title:'巡逻者 · 转角关门',text:'被它看见就会遭到追逐。绕过转角、按 E 关门挡住它，脱离视线后再藏身。',target:'world'},
 'monster-weeper':{title:'哭泣患者 · 别惊动它',text:'按 T 熄灯，轻走并保持距离。近处照光、疾跑和噪声会激怒它；起身扑来时按 F 闪光，或向侧面躲开。',target:'world'},
 health:{title:'留意你的生命',text:'左上方的白色长条是生命值。受伤会缩短，降到 0 就会死亡；受伤后的闪烁只是短暂无敌。负伤后用 Q 绷带恢复 40 生命。',target:'health'},
 flashlight:{title:'把光留给需要的地方',text:'右上角单独显示手电电量和剩余秒数，和生命值无关。按 T 或点击手电图标开关。现在试着关闭，再打开：关灯或藏身不耗电；需要看清前方时再开灯。',target:'light'},
 move:{title:'第一条值班守则',text:'WASD / 方向键移动。按住 Shift 可短暂疾跑，松开后恢复体力。先沿走廊走一段。',target:'stamina'},
 key:{title:'把钥匙收好',text:'靠近地上的铜钥匙，按 E 拾取。专用钥匙只开启对应的锁，第一次开锁后消耗。',target:'key'},
 box:{title:'开箱会发出声音',text:'靠近箱子按 E 搜寻。取走保险丝后，准备应对被声音引来的东西。',target:'world'},
 flash:{title:'别让它再靠近',text:'它已经进入闪光范围。按 F 或点击闪光器，击退并定身，然后离开。',target:'F'},
 decoy:{title:'让它听错方向',text:'按 R 或点击诱饵，在脚边留下声源。随后走开，让怪物追向诱饵。',target:'R'},
 heal:{title:'先处理伤口',text:'按 Q 或点击绷带恢复 40 生命。确认生命恢复，才算完成包扎。',target:'Q'},
 practice:{title:'包扎演练 · 可选',text:'你还没有受伤。可模拟一次轻伤（20 生命），再用 Q 包扎；也可以跳过，等真正受伤时再学。',target:'Q'},
 door:{title:'留好退路',text:'靠近房门按 E 开锁。已解锁的门可以反复开关；关门能挡住怪物。',target:'world'},
 exit:{title:'最后一段巡查',text:'三枚保险丝已集齐。这扇发绿光的门就是出口。镜头返回后开始计算通电的 8 秒；保持移动，通电后到这里按 E 撤离。',target:'world'}
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
