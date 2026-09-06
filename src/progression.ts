export type Night = 1 | 2;
export class Progression {
  night: Night = 1;
  crowbar = false;
  barricadeOpen = false;
  noteRead = false;
  cabinetOpen = false;
  powered = false;
  bandages = 1;
  decoys = 2;
  digits = [4, 7, 2];
  reset(night: Night, random = Math.random) {
    this.night = night;
    this.crowbar = this.barricadeOpen = this.noteRead = this.cabinetOpen = this.powered = false;
    this.bandages = 1; this.decoys = 2;
    this.digits = Array.from({ length: 3 }, () => 1 + Math.floor(random() * 9));
  }
  get code() { return [this.digits[2], this.digits[0], this.digits[1]].join(''); }
  get clue() { return `值班记录：01 床 — ${this.digits[0]}；02 床 — ${this.digits[1]}；03 床 — ${this.digits[2]}。\n药柜检修顺序：03 → 01 → 02。不要按床号顺序输入。`; }
  unlock(code: string) {
    if (!this.noteRead || !/^\d{3}$/.test(code) || code !== this.code) return false;
    this.cabinetOpen = true; return true;
  }
  canCollectFuse(index: number) {
    return this.night === 1 || (index === 1 ? this.cabinetOpen : index === 2 ? this.barricadeOpen : true);
  }
  restorePower(fuses: number) {
    if (fuses !== 3 || (this.night === 2 && (!this.noteRead || !this.cabinetOpen || !this.crowbar || !this.barricadeOpen))) return false;
    this.powered = true; return true;
  }
  canEscape(fuses: number) {
    return fuses === 3 && (this.night === 1 || (this.noteRead && this.cabinetOpen && this.crowbar && this.barricadeOpen && this.powered));
  }
  get objective() {
    if (this.night === 1) return '收集 3 个保险丝 → 东侧出口';
    if (!this.crowbar) return '去西南接待室寻找撬棍';
    if (!this.noteRead) return '去西北病房调查病历';
    if (!this.cabinetOpen) return '用病历线索解开南侧药柜';
    if (!this.barricadeOpen) return '撬开东侧隔离病区的封板';
    if (!this.powered) return '集齐保险丝 → 北侧配电箱送电';
    return '电力恢复！前往东侧 EXIT';
  }
}
