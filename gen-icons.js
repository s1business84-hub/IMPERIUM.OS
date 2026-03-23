// Generates minimal valid PNG icons without any dependencies
const fs = require('fs');
const zlib = require('zlib');

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const r = size * 0.22;
      const inCorner = (
        (x < r && y < r && Math.sqrt((x-r)**2 + (y-r)**2) > r) ||
        (x > size-r && y < r && Math.sqrt((x-(size-r))**2 + (y-r)**2) > r) ||
        (x < r && y > size-r && Math.sqrt((x-r)**2 + (y-(size-r))**2) > r) ||
        (x > size-r && y > size-r && Math.sqrt((x-(size-r))**2 + (y-(size-r))**2) > r)
      );
      if (inCorner) { pixels[idx]=0;pixels[idx+1]=0;pixels[idx+2]=0;pixels[idx+3]=0; continue; }
      const t = (x + y) / (size * 2);
      const bgR = Math.round(10 + (30-10)*t);
      const bgG = Math.round(15 + (58-15)*t);
      const bgB = Math.round(44 + (138-44)*t);
      const s = size / 512;
      const boltPts = [
        [290*s,60*s],[200*s,270*s],[255*s,270*s],
        [222*s,452*s],[390*s,220*s],[310*s,220*s],[380*s,60*s]
      ];
      const inBolt = pointInPolygon(x, y, boltPts);
      if (inBolt) {
        const gt = y / size;
        pixels[idx]   = Math.round(212 + (245-212)*gt);
        pixels[idx+1] = Math.round(175 + (226-175)*gt);
        pixels[idx+2] = Math.round(55  + (122-55)*gt);
        pixels[idx+3] = 255;
      } else {
        pixels[idx]=bgR; pixels[idx+1]=bgG; pixels[idx+2]=bgB; pixels[idx+3]=255;
      }
    }
  }
  return encodePNG(size, size, pixels);
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4);
  ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0;
  const raw = Buffer.alloc(height*(1+width*4));
  for (let y=0;y<height;y++) {
    raw[y*(1+width*4)]=0;
    rgba.copy(raw, y*(1+width*4)+1, y*width*4, (y+1)*width*4);
  }
  const compressed = zlib.deflateSync(raw, {level:6});
  return Buffer.concat([sig, makeChunk('IHDR',ihdr), makeChunk('IDAT',compressed), makeChunk('IEND',Buffer.alloc(0))]);
}

function makeChunk(type, data) {
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length,0);
  const typeB=Buffer.from(type,'ascii');
  const crcBuf=Buffer.concat([typeB,data]);
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(crcBuf),0);
  return Buffer.concat([len,typeB,data,crc]);
}

function crc32(buf) {
  const table=makeCrcTable(); let c=0xFFFFFFFF;
  for(let i=0;i<buf.length;i++) c=table[(c^buf[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
let _crcTable=null;
function makeCrcTable() {
  if(_crcTable) return _crcTable;
  _crcTable=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);_crcTable[n]=c;}
  return _crcTable;
}

console.log('Generating icons...');
fs.writeFileSync('icons/icon-192.png', createPNG(192)); console.log('done icon-192.png');
fs.writeFileSync('icons/icon-512.png', createPNG(512)); console.log('done icon-512.png');
