import rules from '../../game/encounters.json' with {type:'json'};
export function flashlightDrain(dt:number,on:boolean,tutorial:boolean){return Math.max(0,dt)*(on?100/(tutorial?rules.tutorialFlashlightSeconds:rules.flashlightSeconds):0);}
export function flashlightRemaining(battery:number,tutorial:boolean){return Math.ceil(Math.max(0,Math.min(100,battery))/100*(tutorial?rules.tutorialFlashlightSeconds:rules.flashlightSeconds));}
