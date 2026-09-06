import catalog from '../game/commands.json' with {type:'json'};
export const commands=catalog.map(c=>c.id);
export function validateEvent(value) {
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
    if (now - last < 700) return 'limited';
    seen.set(event.id, now); last = now; return 'accepted';
  };
}
