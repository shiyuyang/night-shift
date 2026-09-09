/** The desk lamp's double failure: dark beats, a broken glimpse, then silence. */
export function giftSignalBeat(progress:number){
 if(progress<.12)return 0;
 if(progress<.28)return .72;
 if(progress<.48)return 0;
 if(progress<.59)return .58;
 if(progress<.625)return .12;
 if(progress<.77)return .7;
 if(progress<.8)return 0;
 if(progress<.9)return .42;
 return 0;
}
