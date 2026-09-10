/** The enemy responsible for the lethal hit; environmental damage has no portrait. */
export type MonsterDeathKind='listener'|'light-shy'|'patroller'|'weeper';
export const deathPresentation:Record<MonsterDeathKind,{texture:string;file:string;cue:string}>={
 listener:{texture:'death-listener',file:'/assets/death-listener-v2.webp',cue:'breath'},
 'light-shy':{texture:'death-light-shy',file:'/assets/death-light-shy-v2.webp',cue:'plant-breaker-arc'},
 patroller:{texture:'death-patroller',file:'/assets/death-patroller-v1.webp',cue:'metal'},
 weeper:{texture:'death-weeper',file:'/assets/death-weeper-v2.webp',cue:'patient-lunge'},
};
