import catalog from '../game/commands.json' with {type:'json'};
export const commands=catalog.map(c=>c.id);
const gifts=new Set(['59511','59316','59319','59315','59317','59318']);
export function validateEvent(value) {
  if(value&&typeof value==='object'&&value.giftId!==undefined){
    const token=v=>typeof v==='string'&&/^[\w-]{1,100}$/.test(v);
    if(!token(value.id)||!token(value.runId)||!gifts.has(String(value.giftId))||typeof value.userId!=='string'||!value.userId.length||value.userId.length>100||typeof value.viewer!=='string'||!value.viewer.length||value.viewer.length>80||!Number.isSafeInteger(value.count)||value.count<1)throw Error('Invalid gift');
    if(value.comboId!==undefined&&!token(value.comboId))throw Error('Invalid combo');
    if(value.avatar!==undefined&&(typeof value.avatar!=='string'||value.avatar.length>2048||!/^https?:\/\//.test(value.avatar)))throw Error('Invalid avatar');
    return {id:value.id,runId:value.runId,giftId:String(value.giftId),userId:value.userId,viewer:value.viewer,avatar:value.avatar,comboId:value.comboId,count:value.count,time:Date.now()};
  }
  if (!value || typeof value !== 'object' || !commands.includes(value.command)) throw new Error('Unknown command');
  if (typeof value.id !== 'string' || !/^[\w-]{1,80}$/.test(value.id)) throw new Error('Invalid event id');
  if (value.viewer !== undefined && (typeof value.viewer !== 'string' || value.viewer.length > 40)) throw new Error('Invalid viewer');
  return { id: value.id, command: value.command, viewer: value.viewer || '神秘观众', time: Date.now() };
}
export function createGate() {
  const seen = new Map();
  let last = 0;
  return (event, now = Date.now()) => {
    for (const [id, timestamp] of seen) if (now - timestamp > 300000) seen.delete(id);
    if (seen.has(event.id)) return 'duplicate';
    if (!event.giftId && now - last < 700) return 'limited';
    seen.set(event.id, now); last = now; return 'accepted';
  };
}
