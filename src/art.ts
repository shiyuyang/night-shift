import Phaser from 'phaser';

/** Trim individual generated atlas cells at load time; keep foot anchors stable across poses. */
export function registerAtlas(scene: Phaser.Scene, key: string, columns: number, rows: number, trim = true) {
  const texture = scene.textures.get(key);
  const source = texture.getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width; canvas.height = source.height;
  const context = canvas.getContext('2d', { willReadFrequently: true })!;
  context.drawImage(source, 0, 0);
  const data = context.getImageData(0, 0, source.width, source.height).data;
  let maximumHeight = 0;
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const left = Math.round(column * source.width / columns), top = Math.round(row * source.height / rows);
    const right = Math.round((column + 1) * source.width / columns), bottom = Math.round((row + 1) * source.height / rows);
    let x1 = right, y1 = bottom, x2 = left, y2 = top;
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
      if (data[(y * source.width + x) * 4 + 3] > 100) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    }
    if (x2 < x1 || y2 < y1) throw new Error(`Empty art frame: ${key}/${row}/${column}`);
    if(trim)texture.add(row * columns + column, 0, x1, y1, x2 - x1 + 1, y2 - y1 + 1);
    else texture.add(row * columns + column,0,left,top,right-left,bottom-top);
    maximumHeight = Math.max(maximumHeight, y2 - y1 + 1);
  }
  return trim ? maximumHeight : source.height/rows;
}

export function directionRow(angle: number) {
  if (angle > Math.PI / 4 && angle < Math.PI * 3 / 4) return 0;
  if (angle < -Math.PI / 4 && angle > -Math.PI * 3 / 4) return 2;
  return Math.cos(angle) >= 0 ? 1 : 3;
}

/** Normalize legacy generated cells once, so animation samples a stable native pixel grid. */
export function registerPixelAtlas(scene:Phaser.Scene,key:string,columns:number,rows:number,height:number,sourceRows?:{y:number;height:number}[]){
 const source=scene.textures.get(key).getSourceImage() as HTMLImageElement;
 const width=Math.round(source.width/columns/(source.height/rows)*height),target=key+'-native';
 if(scene.textures.exists(target))return {key:target,height};
 const texture=scene.textures.createCanvas(target,width*columns,height*rows)!;const ctx=texture.context;ctx.imageSmoothingEnabled=false;
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const left=Math.round(col*source.width/columns),top=sourceRows?.[row]?.y??Math.round(row*source.height/rows),right=Math.round((col+1)*source.width/columns),bottom=sourceRows?top+sourceRows[row].height:Math.round((row+1)*source.height/rows);
  ctx.drawImage(source,left,top,right-left,bottom-top,col*width,row*height,width,height);
  texture.add(row*columns+col,0,col*width,row*height,width,height);
 }
 texture.refresh();return {key:target,height};
}
