import {decodeAudioAsset} from './runtime/audio-asset.ts';
import {decodeSoundEffects} from './runtime/audio-pack.ts';
import effects from '../game/audio-sfx.json' with {type:'json'};
import music from '../game/music.json' with {type:'json'};
// New clinical areas reuse existing hospital music beds.
export const musicTheme=(theme:number)=>theme===3?0:theme===4?2:theme===5?0:theme===6?0:theme;
interface LoopLayer { id: string; buffer: AudioBuffer; gain: GainNode; nextStart: number; active?:boolean; sources?:Set<AudioBufferSourceNode>; }
/** Local generated music only. API credentials are never used by the browser. */
export class Ambience {
  private effects=new Map<string,AudioBuffer>();
  private voices=new Set<AudioBufferSourceNode>();
  private patientVoices=new Set<AudioBufferSourceNode>();
  private context?: AudioContext;
  private master?: GainNode;
  private musicBus?: GainNode;
  private musicDucked=false;
  onTrack:(id:string,chasing:boolean)=>void=()=>{};
  private reportedTrack='';
  private reportedChase=false;
  private layers: LoopLayer[] = [];
  private loading?: Promise<void>;
  private scheduler?: ReturnType<typeof setInterval>;
  private running = false;
  private tension = 0;
  private theme = -2;
  private night = 1;
  private searchProgress=0;
  private runTheme?:number;
  private runVariant=0;
  private previousThemes:Record<string,string>={};
  constructor(){try{const saved=JSON.parse(localStorage.getItem('night-shift-music-rotation-v1')??'{}');if(saved&&typeof saved==='object'&&!Array.isArray(saved))this.previousThemes=Object.fromEntries(Object.entries(saved).filter(([,value])=>typeof value==='string')) as Record<string,string>;}catch{}}
  beginRun(theme:number,night:number){
    theme=musicTheme(theme);
    const variants=music.filter(track=>track.theme===theme);if(!variants.length)return;
    const choices=variants.filter(track=>track.id!==this.previousThemes[theme]);
    const selected=choices.length?choices[Math.floor(Math.random()*choices.length)]:variants[0];
    this.runTheme=theme;this.runVariant=variants.indexOf(selected);this.previousThemes[theme]=selected.id;
    try{localStorage.setItem('night-shift-music-rotation-v1',JSON.stringify(this.previousThemes));}catch{}
    this.setScene(theme,0,0,night,0);
  }
  private powerRemaining = 0;
  private powerBuffer?: AudioBuffer;
  private powerVoice?: { source: AudioBufferSourceNode; gain: GainNode; started: number; offset: number };
  setScene(theme: number, tension: number, powerRemaining: number, night = 1, searchProgress = 0) {
    this.theme = musicTheme(theme);this.night = night;this.searchProgress=searchProgress;
    this.tension = Math.max(0, Math.min(1, tension));
    this.powerRemaining = Math.max(0, powerRemaining);
    this.mix(); this.syncPower();
  }
  private stopPower() {
    const voice = this.powerVoice;
    if (!voice || !this.context) return;
    this.powerVoice = undefined;
    const now = this.context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setTargetAtTime(0, now, .025);
    voice.source.stop(now + .12);
  }
  private syncPower() {
    if (!this.context || !this.master || !this.powerBuffer) return;
    if (!this.enabled || !this.running || this.powerRemaining <= 0) { this.stopPower(); return; }
    const ctx = this.context, offset = Math.max(0, 8 - this.powerRemaining);
    if (this.powerVoice && Math.abs(this.powerVoice.offset + ctx.currentTime - this.powerVoice.started - offset) < .3) return;
    this.stopPower();
    // Seek from game time when resumed: tutorial/menu pauses cannot skip the climax.
    if (offset >= this.powerBuffer.duration) return;
    const source = ctx.createBufferSource(), gain = ctx.createGain();
    source.buffer = this.powerBuffer; source.connect(gain).connect(this.musicBus??this.master);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(.9*(music.find(track=>track.id==='power')?.mixGain??1), ctx.currentTime + .06);
    const voice = {source, gain, started: ctx.currentTime, offset};
    this.powerVoice = voice;
    source.onended = () => {source.disconnect(); gain.disconnect(); if (this.powerVoice === voice) this.powerVoice = undefined;};
    source.start(ctx.currentTime, offset);
  }
  private volume = .42;
  enabled = false;
  onStatus: (status: string) => void = () => {};
  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {this.setRunning(this.running); return;}
    this.context ??= new AudioContext();
    await this.context.resume();
    if (!this.master) {
      this.master = this.context.createGain(); this.master.gain.value = 0;
      const limiter = this.context.createDynamicsCompressor();
      limiter.threshold.value = -16; limiter.knee.value = 12; limiter.ratio.value = 5;
      this.master.connect(limiter).connect(this.context.destination);
      this.musicBus=this.context.createGain();this.musicBus.gain.value=1;this.musicBus.connect(this.master);
    }
    if (!this.layers.length) {
      this.onStatus('loading');
      this.loading ??= this.loadMusic();
      try { await this.loading; } catch {
        this.loading = undefined; this.enabled = false;
        this.onStatus('failed'); this.setRunning(this.running); return;
      }
    }
    this.onStatus(this.enabled ? 'ready' : 'off');
    this.setRunning(this.running);
  }
  private async loadMusic() {
    const ctx = this.context!;
    const [buffers,effectBuffers] = await Promise.all([
      Promise.all(music.map(track=>decodeAudioAsset(ctx,track.opusFile.replace(/\.opus$/,'.ogg')))),
      decodeSoundEffects(ctx)
    ]);
    this.effects=effectBuffers;
    this.powerBuffer = buffers[music.findIndex(track => track.id === 'power')];
    this.layers = buffers.flatMap((buffer, i) => {
      if (music[i].id === 'power') return [];
      const gain = ctx.createGain(); gain.gain.value = 0; gain.connect(this.musicBus??this.master!);
      return [{ id: music[i].id, buffer, gain, nextStart: Infinity }];
    });
    this.schedule();
    this.scheduler = setInterval(() => this.schedule(), 200);
    this.mix(); this.syncPower();
  }
  private schedule() {
    if (!this.context || this.context.state !== 'running') return;
    const ctx = this.context;
    for (const layer of this.layers) {
      if(!layer.active)continue;
      if (layer.nextStart < ctx.currentTime - .1) layer.nextStart = ctx.currentTime + .04;
      if (layer.nextStart > ctx.currentTime + .7) continue;
      const fade = 1.4, source = ctx.createBufferSource(), envelope = ctx.createGain();
      source.buffer = layer.buffer; source.connect(envelope).connect(layer.gain);
      const t = layer.nextStart, end = t + layer.buffer.duration;
      envelope.gain.setValueAtTime(0,t); envelope.gain.linearRampToValueAtTime(1,t+fade);
      envelope.gain.setValueAtTime(1,end-fade); envelope.gain.linearRampToValueAtTime(0,end);
      (layer.sources??=new Set()).add(source);source.start(t); source.stop(end);
      source.onended = () => {layer.sources?.delete(source);source.disconnect(); envelope.disconnect();};
      layer.nextStart = end-fade;
    }
  }
  setVolume(value: number) { this.volume = Math.max(0,Math.min(1,value)); this.setRunning(this.running); }
  setTension(value: number) { this.tension = Math.max(0,Math.min(1,value)); this.mix(); }
  private mix() {
    if (!this.context) return;
    const t = this.context.currentTime, powering = this.powerRemaining > 0;
    const variants=music.filter(track=>track.theme===this.theme);
    const themeId=variants[((this.runTheme===this.theme?this.runVariant:Math.floor(Math.max(0,this.night-1)/3))+(this.searchProgress>0?1:0))%variants.length]?.id??'menu';
    const chase=Math.max(0,(this.tension-.35)/.65);
    if(this.reportedTrack!==themeId||this.reportedChase!==(chase>0)){this.reportedTrack=themeId;this.reportedChase=chase>0;this.onTrack(themeId,chase>0);}
    for (const layer of this.layers) {
      const target = layer.id === 'pursuit' ? (powering ? 0 : .52*chase)
        : layer.id === themeId ? .98*(1-chase*.35)*(powering ? .22 : 1) : 0;
      const active=target>0;
      if(active!==!!layer.active){
        for(const source of layer.sources??[])source.stop(t+(active?.02:3));
        if(active){layer.sources=new Set();layer.nextStart=t+.04;}else layer.nextStart=Infinity;
        layer.active=active;
      }
      layer.gain.gain.setTargetAtTime(target*(music.find(track=>track.id===layer.id)?.mixGain??1), t, powering ? .2 : .8);
    }
    if(this.context.state==='running')this.schedule();
  }
  private updateMusicDucking(){
    const ducked=this.patientVoices.size>0&&this.running&&this.enabled;
    if(!this.musicBus||!this.context||ducked===this.musicDucked)return;
    this.musicDucked=ducked;
    // Patient cues bypass this bus. Full reverb tails keep priority until onended.
    this.musicBus.gain.setTargetAtTime(ducked?.2:1,this.context.currentTime,ducked?.035:1.1);
  }
  setRunning(running: boolean) {
    this.running = running;
    if(!running){for(const voice of this.patientVoices)voice.stop();this.patientVoices.clear();}
    this.updateMusicDucking();this.syncPower();
    if (this.context && this.master) this.master.gain.setTargetAtTime(this.enabled && running ? this.volume : 0,this.context.currentTime,.12);
  }
  cue(kind: string, pan = 0) {
    if(kind==='patient-stop'){for(const voice of this.patientVoices)voice.stop();this.patientVoices.clear();this.updateMusicDucking();return;}
    if(kind==='sting')kind='impact';
    if(!this.enabled||!this.running||!this.context||!this.master)return;
    const buffer=this.effects.get(kind),definition=effects.find(effect=>effect.id===kind);if(!buffer||!definition)return;
    // Bound overlapping footsteps and gift bursts without synthesizing fallback sounds.
    if(this.voices.size>=12){const oldest=this.voices.values().next().value;oldest?.stop();if(oldest)this.voices.delete(oldest);}
    const ctx=this.context,source=ctx.createBufferSource(),gain=ctx.createGain(),stereo=ctx.createStereoPanner();source.buffer=buffer;source.playbackRate.value=kind==='step'?.96+Math.random()*.08:1;gain.gain.value=definition.gain;stereo.pan.value=Math.max(-1,Math.min(1,pan));source.connect(gain).connect(stereo).connect(this.master);this.voices.add(source);if(kind.startsWith('patient-')){this.patientVoices.add(source);this.updateMusicDucking();if(kind==='patient-lunge')this.musicBus?.gain.setTargetAtTime(.2,ctx.currentTime,.01);}source.start();source.onended=()=>{this.patientVoices.delete(source);this.updateMusicDucking();this.voices.delete(source);source.disconnect();gain.disconnect();stereo.disconnect();};
  }
  dispose() {if(this.scheduler)clearInterval(this.scheduler);void this.context?.close();}
}
