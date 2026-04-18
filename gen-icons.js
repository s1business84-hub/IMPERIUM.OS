// Generates minimal valid PNG icons without any dependencies
const fs = require('fs');
const zlib = require('zlib');

function createPNG(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const s = size / 512; // scale factor

  // Shield path points (for containment check)
  const shieldTop = 72 * s;
  const shieldBottomTip = 440 * s;
  const shieldLeft = 112 * s;
  const shieldRight = 400 * s;
  const shieldMidY = 260 * s;
  const cx = 256 * s;

  function inShield(x, y) {
    if (y < shieldTop || y > shieldBottomTip) return false;
    if (y <= shieldMidY) {
      // Upper trapezoid region
      const t = (y - shieldTop) / (shieldMidY - shieldTop);
      const left = cx - (cx - shieldLeft) * (0.4 + 0.6 * t);
      const right = cx + (shieldRight - cx) * (0.4 + 0.6 * t);
      return x >= left && x <= right;
    } else {
      // Lower curved region
      const t = (y - shieldMidY) / (shieldBottomTip - shieldMidY);
      const halfW = (shieldRight - shieldLeft) / 2 * Math.pow(1 - t, 1.5);
      return x >= cx - halfW && x <= cx + halfW;
    }
  }

  // Lightning bolt polygon
  const boltPts = [
    [280*s,130*s],[216*s,268*s],[256*s,268*s],
    [236*s,390*s],[340*s,240*s],[290*s,240*s],[320*s,130*s]
  ];

  // Signal dots
  const dots = [
    { x:160*s, y:190*s, r:6*s, cr:96, cg:165, cb:250 },
    { x:352*s, y:190*s, r:6*s, cr:129, cg:140, cb:248 },
    { x:148*s, y:300*s, r:6*s, cr:20, cg:184, cb:166 },
    { x:364*s, y:300*s, r:6*s, cr:212, cg:175, cb:55 }
  ];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Rounded rect mask
      const cornerR = size * 0.22;
      const inCorner = (
        (x < cornerR && y < cornerR && Math.sqrt((x-cornerR)**2 + (y-cornerR)**2) > cornerR) ||
        (x > size-cornerR && y < cornerR && Math.sqrt((x-(size-cornerR))**2 + (y-cornerR)**2) > cornerR) ||
        (x < cornerR && y > size-cornerR && Math.sqrt((x-cornerR)**2 + (y-(size-cornerR))**2) > cornerR) ||
        (x > size-cornerR && y > size-cornerR && Math.sqrt((x-(size-cornerR))**2 + (y-(size-cornerR))**2) > cornerR)
      );
      if (inCorner) { pixels[idx]=0;pixels[idx+1]=0;pixels[idx+2]=0;pixels[idx+3]=0; continue; }

      // Background gradient
      const t = (x + y) / (size * 2);
      let r = Math.round(7 + (15 - 7) * t);
      let g = Math.round(11 + (27 - 11) * t);
      let b = Math.round(24 + (61 - 24) * t);
      let a = 255;

      // Subtle radial glow
      const dx = x - cx;
      const dy = y - 240 * s;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const glowR = 180 * s;
      if (dist < glowR) {
        const glowT = 1 - dist / glowR;
        r = Math.min(255, r + Math.round(96 * 0.12 * glowT));
        g = Math.min(255, g + Math.round(165 * 0.10 * glowT));
        b = Math.min(255, b + Math.round(250 * 0.12 * glowT));
      }

      // Shield outline (thin border glow)
      if (inShield(x, y)) {
        // Very subtle fill inside shield
        r = Math.min(255, r + 2);
        g = Math.min(255, g + 4);
        b = Math.min(255, b + 8);
      }

      // Shield border detection (approximate)
      const edgeDist = 3 * s;
      const insideNarrow = inShield(x, y);
      const outsideCheck = !inShield(x - edgeDist, y) || !inShield(x + edgeDist, y) ||
                           !inShield(x, y - edgeDist) || !inShield(x, y + edgeDist);
      if (insideNarrow && outsideCheck) {
        // Shield border — gradient blue to purple
        const borderT = y / size;
        r = Math.round(96 + (129 - 96) * borderT);
        g = Math.round(165 + (140 - 165) * borderT);
        b = Math.round(250 + (248 - 250) * borderT);
        // Half opacity blend
        const bo = 0.4;
        const bgR2 = Math.round(7 + (15 - 7) * t);
        const bgG2 = Math.round(11 + (27 - 11) * t);
        const bgB2 = Math.round(24 + (61 - 24) * t);
        r = Math.round(bgR2 * (1 - bo) + r * bo);
        g = Math.round(bgG2 * (1 - bo) + g * bo);
        b = Math.round(bgB2 * (1 - bo) + b * bo);
      }

      // Lightning bolt
      if (pointInPolygon(x, y, boltPts)) {
        const boltT = (y - 130 * s) / (390 * s - 130 * s);
        r = Math.round(255 - (255 - 224) * boltT);
        g = Math.round(255 - (255 - 231) * boltT);
        b = Math.round(255 - (255 - 255) * boltT);
        a = 255;
      }

      // Signal dots
      for (const dot of dots) {
        const ddx = x - dot.x;
        const ddy = y - dot.y;
        const dd = Math.sqrt(ddx*ddx + ddy*ddy);
        if (dd < dot.r) {
          r = dot.cr; g = dot.cg; b = dot.cb;
          a = Math.round(255 * 0.7);
        }
      }

      pixels[idx] = r;
      pixels[idx+1] = g;
      pixels[idx+2] = b;
      pixels[idx+3] = a;
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
