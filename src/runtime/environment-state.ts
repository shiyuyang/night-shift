/** Event light changes are run-local; reset restores authored lamp strengths. */
export class EnvironmentState {
 private overrides=new Map<string,number>();
 setLight(id:string,strength:number){this.overrides.set(id,strength);}
 strength(id:string,base:number){return this.overrides.get(id)??base;}
 reset(){this.overrides.clear();}
 get snapshot(){return Object.fromEntries(this.overrides);}
}
