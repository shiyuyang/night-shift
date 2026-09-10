/** Authored onboarding, followed by bounded endless variation. No enemy counter-rule changes. */
export function difficultyForNight(night:number){
 const n=Math.max(1,Math.floor(night));
 return {
  interceptor:n>=4,boxBlink:n>=5,blackouts:n>=5,
  weeper:n<3?'none':n<5?'fixed':'roaming',
  weeperChance:n<3?0:n<5?1:n===5?.45:n===6?.6:.75,
  weeperIntroSeconds:n===3?30:0,
  breachSeconds:n===1?4:n<=3?3:2,
  emptyTaskMin:n<=2?1:2,emptyTaskMax:n<=2?1:n===3?2:3,
  safeUntilFirstBox:n===1,openingGrace:n===1?24:n===2?18:0,
  startingFlashes:n<=2?4:2,startingDecoys:n<=2?4:2,
  speedCap:n===1?103:n===2?109:n===3?113:117,
  finaleSpeed:n===1?103:n===2?109:n===3?113:117,
  finaleRush:n>=5,
  searchMemory:n<=2?4:5,openingSeparation:n<=2?180:300,hiddenOpening:n>2,
  // Gentle endless nights do not remove learned mechanics or alter item counters.
  endlessRest:n>7&&n%4===0
 };
}
