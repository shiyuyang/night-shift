import {storage as persistentStorage} from './storage.ts';
/** Local playtest history, bounded and never transmitted. No viewer identities are stored. */
export function recordRun(record:Record<string,unknown>){try{const key='night-shift-runs-v1',previous=JSON.parse(persistentStorage.getItem(key)??'[]');persistentStorage.setItem(key,JSON.stringify([...(Array.isArray(previous)?previous.slice(-29):[]),record]));}catch{/* Storage may be disabled in a streaming WebView. */}}
