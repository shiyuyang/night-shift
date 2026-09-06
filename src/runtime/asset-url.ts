/** Keep each game under its own URL namespace; optional CDN for runtime media. */
const env=(import.meta as ImportMeta & {env?:{BASE_URL?:string;VITE_ASSET_BASE_URL?:string}}).env;
export function assetUrl(file:string){
 if(/^(?:https?:|data:|blob:)/.test(file))return file;
 const base=env?.VITE_ASSET_BASE_URL||env?.BASE_URL||'/';
 return base.replace(/\/$/,'')+'/'+file.replace(/^\//,'');
}
