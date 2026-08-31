'use strict';
/* =========================================================
   world.js — terrain generation, collision, decor, portals,
   chests, traps, day/night. Builds zones on demand.
   ========================================================= */

/* tile codes */
const TT = { GRASS:0, DIRT:1, STONE:2, WATER:3, WALL:4, SAND:5, SNOW:6, CAVE:7, CRYPT:8, BRIDGE:9, LAVA:10, TGRASS:11 };
const SOLID_TILES = {};
SOLID_TILES[TT.WATER]=1; SOLID_TILES[TT.WALL]=1; SOLID_TILES[TT.LAVA]=1;

function hashStr(s){ let h=2166136261; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

function envWrap(modelRoot, opts){
  opts=opts||{};
  const b1=new THREE.Box3().setFromObject(modelRoot);
  const s1=b1.getSize(new THREE.Vector3());
  let s = opts.h ? opts.h/(s1.y||1) : opts.d ? opts.d/(Math.max(s1.x,s1.z)||1) : (opts.s||1);
  if(opts.d && opts.maxH && s1.y*s>opts.maxH) s=opts.maxH/(s1.y||1);
  modelRoot.scale.multiplyScalar(s);
  const b2=new THREE.Box3().setFromObject(modelRoot);
  modelRoot.position.x -= (b2.min.x+b2.max.x)/2;
  modelRoot.position.z -= (b2.min.z+b2.max.z)/2;
  modelRoot.position.y -= b2.min.y;
  const wrap=new THREE.Group();
  wrap.add(modelRoot);
  wrap.userData.env=true;
  return wrap;
}

/* ---------- shared three resources ---------- */
const GEO = {}; const MAT = {};
function initSharedResources(){
  GEO.box = new THREE.BoxGeometry(1,1,1);
  GEO.cyl = new THREE.CylinderGeometry(0.5,0.5,1,8);
  GEO.cyl6 = new THREE.CylinderGeometry(0.4,0.5,1,6);
  GEO.cone = new THREE.ConeGeometry(0.5,1,8);
  GEO.cone4 = new THREE.ConeGeometry(0.75,1,4);
  GEO.cone5 = new THREE.ConeGeometry(0.5,1,5);
  GEO.ico = new THREE.IcosahedronGeometry(0.5,0);
  GEO.sph = new THREE.SphereGeometry(0.5,8,6);
  GEO.plane = new THREE.PlaneGeometry(1,1);
}
function mat(color, opts){
  const key = color + '|' + JSON.stringify(opts||{});
  if(!MAT[key]){
    MAT[key] = new THREE.MeshLambertMaterial(Object.assign({ color }, opts||{}));
  }
  return MAT[key];
}
function emissiveMat(color, opts){
  const key = 'e'+color + '|' + JSON.stringify(opts||{});
  if(!MAT[key]) MAT[key] = new THREE.MeshBasicMaterial(Object.assign({ color }, opts||{}));
  return MAT[key];
}

/* theme palettes */
const THEMES = {
  town:     { base:[0.30,0.48,0.22], sky:0x8fb4d8, fog:0x9db8cf, fogD:34, grass:[0.30,0.48,0.22], dirt:[0.52,0.44,0.30], stone:[0.55,0.54,0.52], water:[0.18,0.34,0.55], trees:22, rocks:8, flowers:true },
  fields:   { base:[0.34,0.55,0.24], sky:0x9cc0dd, fog:0xa8c4d8, fogD:40, grass:[0.34,0.55,0.24], dirt:[0.55,0.46,0.30], stone:[0.55,0.54,0.5], water:[0.16,0.36,0.6], trees:26, rocks:14, flowers:true },
  forest:   { base:[0.13,0.28,0.13], sky:0x4f6a60, fog:0x3c5548, fogD:26, grass:[0.13,0.28,0.13], dirt:[0.30,0.24,0.15], stone:[0.4,0.4,0.38], water:[0.1,0.2,0.25], trees:120, rocks:20, flowers:false },
  mine:     { base:[0.32,0.26,0.20], sky:0x1a140f, fog:0x14100c, fogD:22, grass:[0.32,0.26,0.20], dirt:[0.32,0.26,0.20], stone:[0.24,0.20,0.16], water:[0.1,0.12,0.15], trees:0, rocks:0, flowers:false },
  swamp:    { base:[0.20,0.26,0.14], sky:0x6a7a6a, fog:0x55614f, fogD:24, grass:[0.20,0.26,0.14], dirt:[0.24,0.20,0.13], stone:[0.35,0.36,0.33], water:[0.12,0.20,0.16], trees:34, rocks:8, flowers:false },
  ruins:    { base:[0.28,0.36,0.20], sky:0x8a9ab0, fog:0x93a0b2, fogD:36, grass:[0.28,0.36,0.20], dirt:[0.45,0.40,0.30], stone:[0.52,0.51,0.5], water:[0.15,0.28,0.45], trees:10, rocks:26, flowers:false },
  crypt:    { base:[0.20,0.20,0.26], sky:0x0c0c14, fog:0x0e0e16, fogD:18, grass:[0.20,0.20,0.26], dirt:[0.20,0.20,0.26], stone:[0.16,0.16,0.22], water:[0.05,0.08,0.12], trees:0, rocks:0, flowers:false },
  snow:     { base:[0.85,0.88,0.94], sky:0xbcd0e8, fog:0xc8d8ea, fogD:32, grass:[0.85,0.88,0.94], dirt:[0.6,0.62,0.7], stone:[0.62,0.65,0.72], water:[0.3,0.45,0.65], trees:34, rocks:26, flowers:false },
  volcanic: { base:[0.22,0.15,0.13], sky:0x4a2018, fog:0x3a1a14, fogD:28, grass:[0.22,0.15,0.13], dirt:[0.28,0.18,0.14], stone:[0.16,0.13,0.13], water:[0.1,0.1,0.12], trees:4, rocks:40, flowers:false },
};

/* ---------- procedural ground texture atlas ----------
   One per-theme canvas atlas of tileable sub-patterns, one cell per
   floor type. UVs sample each tile's cell so every floor type reads
   as its own texture. */
const GA_COLS=4, GA_ROWS=3, GA_CELL=128;
const GROUND_ORDER=[TT.GRASS,TT.DIRT,TT.STONE,TT.WATER,TT.WALL,TT.SAND,TT.SNOW,TT.CAVE,TT.CRYPT,TT.BRIDGE,TT.LAVA,TT.TGRASS];

function gTypeColor(type, t){
  switch(type){
    case TT.GRASS: case TT.TGRASS: return t.grass;
    case TT.DIRT: return t.dirt;
    case TT.STONE: case TT.WALL: return t.stone;
    case TT.WATER: return t.water;
    case TT.SAND: return [0.42,0.38,0.26];
    case TT.SNOW: return [0.9,0.92,0.97];
    case TT.CAVE: return [0.30,0.24,0.18];
    case TT.CRYPT: return [0.24,0.24,0.32];
    case TT.BRIDGE: return [0.45,0.32,0.18];
    case TT.LAVA: return [1.0,0.35,0.08];
  }
  return [0.5,0.5,0.5];
}
function gRgb(a,al){ return 'rgba('+Math.round(a[0]*255)+','+Math.round(a[1]*255)+','+Math.round(a[2]*255)+','+(al==null?1:al)+')'; }
function gShade(a,f){ return [clamp(a[0]*f,0,1), clamp(a[1]*f,0,1), clamp(a[2]*f,0,1)]; }
function gWrap(cell,x,y,fn){ for(let dy=-cell;dy<=cell;dy+=cell) for(let dx=-cell;dx<=cell;dx+=cell) fn(x+dx, y+dy); }

function drawGroundCell(ctx, ox, oy, type, c, seed){
  ctx.save(); ctx.translate(ox,oy);
  const cell=GA_CELL, rng=mulberry32(seed>>>0);
  ctx.fillStyle=gRgb(c); ctx.fillRect(0,0,cell,cell);
  switch(type){
    case TT.GRASS:
      for(let i=0;i<54;i++){ const x=4+rng()*(cell-8), y=6+rng()*(cell-8), h=3+rng()*4, w=(rng()-0.5)*2, l=0.82+rng()*0.3;
        gWrap(cell,x,y,(px,py)=>{ ctx.strokeStyle=gRgb(gShade(c,l)); ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(px,py); ctx.quadraticCurveTo(px+w*2,py-h*0.5,px+w,py-h); ctx.stroke(); }); }
      for(let i=0;i<10;i++){ ctx.fillStyle=gRgb(gShade(c,1.12),0.16); ctx.beginPath(); ctx.ellipse(rng()*cell,rng()*cell,3+rng()*4,2+rng()*3,0,0,7); ctx.fill(); }
      break;
    case TT.TGRASS:
      for(let i=0;i<30;i++){ const x=6+rng()*(cell-12), y=8+rng()*(cell-10), h=7+rng()*6, l=0.78+rng()*0.34;
        gWrap(cell,x,y,(px,py)=>{ ctx.strokeStyle=gRgb(gShade(c,l)); ctx.lineWidth=1.4; for(let b=-1;b<=1;b++){ ctx.beginPath(); ctx.moveTo(px,py); ctx.quadraticCurveTo(px+b*3,py-h*0.6,px+b*2,py-h); ctx.stroke(); } }); }
      break;
    case TT.DIRT:
      for(let i=0;i<70;i++){ const s=1+rng()*2.6, l=0.68+rng()*0.6; const x=rng()*cell, y=rng()*cell;
        gWrap(cell,x,y,(px,py)=>{ ctx.fillStyle=gRgb(gShade(c,l)); ctx.beginPath(); ctx.ellipse(px,py,s,s*0.8,0,0,7); ctx.fill(); }); }
      for(let i=0;i<16;i++){ ctx.fillStyle=gRgb(gShade(c,0.55),0.5); gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.fillRect(px,py,2,2); }); }
      break;
    case TT.STONE: case TT.WALL: {
      const mortar=gRgb(gShade(c,0.70)); ctx.strokeStyle=mortar; ctx.lineWidth=3;
      const bh=32, bw=64;
      for(let y=0;y<=cell;y+=bh){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cell,y); ctx.stroke(); }
      for(let row=0;row<cell/bh;row++){ const off=(row%2)*(bw/2); for(let x=-off;x<=cell;x+=bw){ ctx.beginPath(); ctx.moveTo(x,row*bh); ctx.lineTo(x,(row+1)*bh); ctx.stroke(); } }
      for(let row=0;row<cell/bh;row++) for(let x=-bw;x<cell+bw;x+=bw){ ctx.fillStyle=gRgb(gShade(c,0.9+rng()*0.2),0.22); ctx.fillRect(x,row*bh,bw,bh); }
      break; }
    case TT.WATER:
      for(let b=0;b<4;b++){ const yy=b*(cell/4); ctx.strokeStyle=gRgb(gShade(c,1.35),0.5); ctx.lineWidth=2; ctx.beginPath();
        for(let x=0;x<=cell;x+=4){ const y=yy+Math.sin((x/cell)*Math.PI*2)*3; if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.stroke(); }
      for(let i=0;i<24;i++){ ctx.fillStyle=gRgb(gShade(c,1.5),0.55); gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.fillRect(px,py,2,1); }); }
      break;
    case TT.SAND:
      for(let i=0;i<130;i++){ ctx.fillStyle=gRgb(gShade(c,0.82+rng()*0.34)); gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.fillRect(px,py,1.5,1.5); }); }
      for(let b=0;b<2;b++){ const yy=32+b*64; ctx.strokeStyle=gRgb(gShade(c,1.12),0.4); ctx.lineWidth=1.5; ctx.beginPath();
        for(let x=0;x<=cell;x+=3){ const y=yy+Math.sin((x/cell)*Math.PI*2+b*1.7)*2; if(x===0)ctx.moveTo(x,y); else ctx.lineTo(x,y); } ctx.stroke(); }
      break;
    case TT.SNOW:
      for(let i=0;i<60;i++){ const s=0.8+rng()*1.4, l=1.0+rng()*0.18; gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.fillStyle=gRgb(gShade(c,l)); ctx.fillRect(px,py,s,s); }); }
      for(let i=0;i<12;i++){ ctx.fillStyle=gRgb(gShade(c,0.85),0.5); gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.fillRect(px,py,2,1); }); }
      break;
    case TT.CAVE:
      for(let i=0;i<60;i++){ const s=2+rng()*4, l=0.55+rng()*0.6; gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.fillStyle=gRgb(gShade(c,l),0.5); ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+s,py+s*0.5); ctx.lineTo(px+s*0.5,py+s); ctx.closePath(); ctx.fill(); }); }
      for(let i=0;i<9;i++){ ctx.strokeStyle=gRgb(gShade(c,0.45),0.6); ctx.lineWidth=1.5; gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+6+rng()*8,py+4); ctx.lineTo(px+10+rng()*8,py-3); ctx.stroke(); }); }
      break;
    case TT.CRYPT: {
      const mortar=gRgb(gShade(c,0.58)); ctx.strokeStyle=mortar; ctx.lineWidth=2;
      const bh=32, bw=64;
      for(let y=0;y<=cell;y+=bh){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cell,y); ctx.stroke(); }
      for(let row=0;row<cell/bh;row++){ const off=(row%2)*(bw/2); for(let x=-off;x<=cell;x+=bw){ ctx.beginPath(); ctx.moveTo(x,row*bh); ctx.lineTo(x,(row+1)*bh); ctx.stroke(); } }
      for(let i=0;i<6;i++){ ctx.fillStyle=gRgb(gShade(c,1.3),0.5); ctx.fillRect((rng()*cell)|0,(rng()*cell)|0,2,2); }
      break; }
    case TT.BRIDGE: {
      const pw=cell/4;
      ctx.fillStyle=gRgb(gShade(c,0.85)); for(let p=0;p<4;p++) ctx.fillRect(p*pw,0,pw,cell);
      ctx.strokeStyle=gRgb(gShade(c,0.5)); ctx.lineWidth=3;
      for(let p=0;p<=4;p++){ ctx.beginPath(); ctx.moveTo(p*pw,0); ctx.lineTo(p*pw,cell); ctx.stroke(); }
      ctx.strokeStyle=gRgb(gShade(c,0.7),0.5); ctx.lineWidth=1;
      for(let p=0;p<4;p++) for(let g=0;g<3;g++){ const gx=p*pw+6+rng()*(pw-12); ctx.beginPath(); ctx.moveTo(gx,4); ctx.lineTo(gx+(rng()-0.5)*6,cell-4); ctx.stroke(); }
      ctx.fillStyle=gRgb(gShade(c,0.38));
      for(let p=0;p<4;p++){ ctx.fillRect(p*pw+pw/2-1,6,2,2); ctx.fillRect(p*pw+pw/2-1,cell-8,2,2); }
      break; }
    case TT.LAVA:
      for(let i=0;i<12;i++){ ctx.fillStyle=gRgb(gShade(c,0.22),0.7); gWrap(cell,rng()*cell,rng()*cell,(px,py)=>{ ctx.beginPath(); ctx.ellipse(px,py,3+rng()*5,2+rng()*4,rng()*3,0,7); ctx.fill(); }); }
      for(let i=0;i<6;i++){ let x=rng()*cell, y=rng()*cell; ctx.strokeStyle='rgba(255,225,90,'+(0.7+rng()*0.3)+')'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(x,y);
        for(let s=0;s<4;s++){ x+=(rng()-0.5)*24; y+=8+rng()*14; ctx.lineTo(x,y); } ctx.stroke(); }
      break;
  }
  ctx.restore();
}

const GroundAtlas = {
  cache:{},
  get(themeId){
    if(this.cache[themeId]) return this.cache[themeId];
    const t=THEMES[themeId];
    const cv=document.createElement('canvas');
    cv.width=GA_CELL*GA_COLS; cv.height=GA_CELL*GA_ROWS;
    const ctx=cv.getContext('2d');
    const rects={};
    GROUND_ORDER.forEach((type,k)=>{
      const col=k%GA_COLS, row=Math.floor(k/GA_COLS);
      drawGroundCell(ctx, col*GA_CELL, row*GA_CELL, type, gTypeColor(type,t), hashStr(themeId+'|'+type));
      rects[type]={ u0:col/GA_COLS, u1:(col+1)/GA_COLS, v0:1-(row+1)/GA_ROWS, v1:1-row/GA_ROWS };
    });
    const tex=new THREE.CanvasTexture(cv);
    tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
    tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter;
    tex.generateMipmaps=false; tex.anisotropy=4; tex.needsUpdate=true;
    const entry={ texture:tex, rects, canvasW:cv.width, canvasH:cv.height, canvas:cv, ctx };
    this.cache[themeId]=entry;
    // Try to overlay hand-painted tile for base grass (if exists in assets/tiles/)
    try{
      const tileName=themeId.charAt(0).toUpperCase()+themeId.slice(1);
      const img=new Image();
      img.onload=()=>{
        try{
          const grassIdx=GROUND_ORDER.indexOf(TT.GRASS);
          if(grassIdx<0) return;
          const col=grassIdx%GA_COLS, row=Math.floor(grassIdx/GA_COLS);
          // clear and draw tile scaled to cell
          ctx.clearRect(col*GA_CELL, row*GA_CELL, GA_CELL, GA_CELL);
          ctx.drawImage(img, col*GA_CELL, row*GA_CELL, GA_CELL, GA_CELL);
          tex.needsUpdate=true;
        }catch(e){}
      };
      img.onerror=()=>{};
      img.src='assets/tiles/'+tileName+'.png';
    }catch(e){}
    return entry;
  },
};

/* ---------- ground transition shader (fragment helpers) ----------
   Crossfades each floor tile into its 4 neighbours, so distinct
   patterns blend gradually across tile edges instead of hard cuts.
   Assumes GROUND_ORDER layout: 4 cols x 3 rows, types 0..11. */
const GROUND_SHADER_MAP_FN = `
float geType(vec2 ti){ return round(texture2D(uTypeTex,(ti+0.5)/uTypeSize).r*255.0); }
vec2  geCellCenter(float ti){ float col=mod(ti,4.0); float row=floor(ti/4.0); return vec2((col+0.5)/4.0, 1.0-(row+0.5)/3.0); }
vec2  geCellSize(){ return vec2(1.0/4.0, 1.0/3.0); }
vec3  geSample(vec2 ti, vec2 fr){
  float ci=geType(ti);
  vec2 h=geCellSize()*0.5;
  vec2 cen=geCellCenter(ci);
  vec2 uv=cen + (fr-0.5)*geCellSize();
  uv=clamp(uv, cen-h*0.99, cen+h*0.99);
  return texture2D(map, uv).rgb;
}
vec3 geBlend(){
  vec2 base=floor(vTile);
  vec2 fr=fract(vTile);
  const float T=0.16;
  float wE=smoothstep(1.0-T,1.0,fr.x);
  float wW=smoothstep(1.0-T,1.0,1.0-fr.x);
  float wS=smoothstep(1.0-T,1.0,fr.y);
  float wN=smoothstep(1.0-T,1.0,1.0-fr.y);
  vec3 c0=geSample(base,fr);
  vec3 cE=geSample(base+vec2(1.0,0.0),fr);
  vec3 cW=geSample(base+vec2(-1.0,0.0),fr);
  vec3 cS=geSample(base+vec2(0.0,1.0),fr);
  vec3 cN=geSample(base+vec2(0.0,-1.0),fr);
  float wsum=1.0+wE+wW+wS+wN;
  return (c0 + cE*wE + cW*wW + cS*wS + cN*wN)/wsum;
}
`;

/* ---------- Zone ---------- */
class Zone {
  constructor(id){
    this.id = id;
    const def = ZONES[id];
    this.def = def;
    this.w = def.w; this.h = def.h;
    this.theme = THEMES[def.theme];
    this.tiles = new Uint8Array(this.w*this.h);
    this.solid = new Uint8Array(this.w*this.h);
    this.group = new THREE.Group();
    this.group.name = 'zone_'+id;
    this.waterMeshes = [];
    this.flickerers = [];
    this.portalObjs = [];
    this.chestObjs = [];
    this.trapObjs = [];
    this.blockers = []; // meshes that may hide the camera (buildings/big trees)
    this.buildings = [];
    this.lightSpots = [];
    this.lightPool = [];
    const rnd = mulberry32(hashStr(id));
    this.rnd = rnd;
    this.generate();
    this.buildMeshes();
    this.buildDecor();
    this.buildFeatures();
    this.buildLights();
    this.buildMinimap();
  }
  idx(x,z){ return z*this.w + x; }
  inB(x,z){ return x>=0 && z>=0 && x<this.w && z<this.h; }
  tile(x,z){ return this.inB(x,z) ? this.tiles[this.idx(x,z)] : TT.WALL; }
  set(x,z,t){ if(this.inB(x,z)){ this.tiles[this.idx(x,z)]=t; this.solid[this.idx(x,z)] = SOLID_TILES[t]?1:0; } }
  fill(x0,z0,w0,h0,t){ for(let z=z0;z<z0+h0;z++) for(let x=x0;x<x0+w0;x++) this.set(x,z,t); }
  rectHollow(x0,z0,w0,h0,t){ for(let x=x0;x<x0+w0;x++){ this.set(x,z0,t); this.set(x,z0+h0-1,t);} for(let z=z0;z<z0+h0;z++){ this.set(x0,z,t); this.set(x0+w0-1,z,t);} }
  solidAt(x,z){ if(!this.inB(x,z)) return true; return this.solid[this.idx(x,z)]===1; }
  envProp(key, wx, wz, opts){
    const o=EnvAssets.instance(key); if(!o) return null;
    const w=envWrap(o, opts);
    w.position.set(wx,opts&&opts.y||0,wz);
    if(opts && opts.rot!=null) w.rotation.y=opts.rot;
    this.group.add(w);
    return w;
  }
  addLightSpot(type, x, y, z){ this.lightSpots.push({type, x, y, z}); }
  buildLights(){
    const cap=12;
    const cx=(this.w/2)*TILE, cz=(this.h/2)*TILE;
    const spots=this.lightSpots.slice().sort((a,b)=>
      ((a.x-cx)*(a.x-cx)+(a.z-cz)*(a.z-cz))-((b.x-cx)*(b.x-cx)+(b.z-cz)*(b.z-cz))).slice(0,cap);
    for(const s of spots){
      const L=new THREE.PointLight(0xffc077, 1.1, 13, 2);
      L.position.set(s.x, s.y||2, s.z);
      this.group.add(L);
      this.lightPool.push({L, type:s.type, base:1.1, ph:Math.random()*6.28});
    }
  }

  generate(){
    const t = this.theme;
    this.fill(0,0,this.w,this.h,TT.GRASS);
    switch(this.def.theme){
      case 'town': this.genTown(); break;
      case 'fields': this.genFields(); break;
      case 'forest': this.genForest(); break;
      case 'mine': this.genDungeon(false); break;
      case 'swamp': this.genSwamp(); break;
      case 'ruins': this.genRuins(); break;
      case 'crypt': this.genDungeon(true); break;
      case 'snow': this.genSnow(); break;
      case 'volcanic': this.genVolcanic(); break;
    }
    // clear exit tiles + small apron
    for(const ex of (this.def.exits||[])){
      for(let dz=-1;dz<=1;dz++) for(let dx=-1;dx<=1;dx++){
        const x=ex.x+dx, z=ex.z+dz;
        if(this.inB(x,z)){ this.set(x,z, this.def.theme==='mine'||this.def.theme==='crypt'?TT.CAVE:TT.DIRT); this.solid[this.idx(x,z)]=0; }
      }
    }
    // clear chest + boss + spawn areas from solid decor (keep BRIDGE under chest if it was there)
    for(const ch of (this.def.chests||[])){ const cur=this.tile(ch.x,ch.z); const floor=cur===TT.BRIDGE?TT.BRIDGE:(this.isCave()?TT.CAVE:TT.DIRT); this.set(ch.x,ch.z,floor); this.solid[this.idx(ch.x,ch.z)]=0; }
    if(this.def.bossSpawn){ const b=this.def.bossSpawn; const floor=this.isCave()?TT.CAVE:TT.STONE; for(let z=b.z-5;z<=b.z+5;z++)for(let x=b.x-5;x<=b.x+5;x++){ this.set(x,z,floor); this.solid[this.idx(x,z)]=0; } }
    // border walls for outdoor zones
    if(!this.def.indoor){
      for(let x=0;x<this.w;x++){ this.set(x,0,TT.WALL); this.set(x,this.h-1,TT.WALL); }
      for(let z=0;z<this.h;z++){ this.set(0,z,TT.WALL); this.set(this.w-1,z,TT.WALL); }
      for(const ex of (this.def.exits||[])){ // reopen exits on border
        let x=ex.x,z=ex.z;
        if(x<=0){x=1;} if(x>=this.w-1){x=this.w-2;} if(z<=0){z=1;} if(z>=this.h-1){z=this.h-2;}
        this.set(ex.x,ex.z,TT.DIRT); this.set(x,z,TT.DIRT);
        this.solid[this.idx(ex.x,ex.z)]=0; this.solid[this.idx(x,z)]=0;
      }
    } else {
      // ensure dungeon border is wall
      for(let x=0;x<this.w;x++){ this.set(x,0,TT.WALL); this.set(x,this.h-1,TT.WALL); }
      for(let z=0;z<this.h;z++){ this.set(0,z,TT.WALL); this.set(this.w-1,z,TT.WALL); }
    }
  }
  isCave(){ return this.def.theme==='mine'||this.def.theme==='crypt'; }

  genTown(){
    // central stone plaza (fountain sits at its centre, tiles 27-28)
    this.fill(20,20,16,16,TT.STONE);
    // roads to the gates, cleared of the plaza
    this.fill(26,3, 4,17,TT.DIRT);     // north road -> dark forest gate
    this.fill(26,36,4,17,TT.DIRT);     // south road -> murkwater gate
    this.fill(36,26,17,4,TT.DIRT);     // east road -> greenfields gate
    this.fill(3, 26,17,4,TT.DIRT);     // west stub
    // structures arranged around the plaza, each facing the centre
    const B = (x,z,w,h,wc,rc)=>{ this.building(x,z,w,h,wc,rc); };
    B(12,8,11,8, 0xd8d0b8, 0x8a3a3a);   // temple (Aldric) NW
    B(31,8,11,8, 0x8a6a42, 0x5a3a22);   // tavern NE
    B(38,17,8,7, 0x6a5a4a, 0x3a3a42);   // blacksmith (Borin) E
    B(38,33,10,8, 0x7a6a3a, 0x4a3a1a);  // general store (Mira) SE
    B(9,33,10,8, 0x4a3a6a, 0x2a2048);   // magic shop (Elara) SW
    B(8,44,6,5, 0x8a6a52, 0x4a3524);    // house SW
    this.bank(13,20,4,4);               // bank (Talia) W — procedural, half a street from the plaza
    this.fill(17,20,1,4,TT.STONE);      // small stone stoop in front of the bank entrance
    // ranger training field
    this.fill(44,8,9,5,TT.DIRT);
    // plaza furnishings around the fountain
    this.bench(24,28); this.bench(28,24); this.bench(32,28); this.bench(28,32);
    this.planter(21,21); this.planter(34,21); this.planter(21,34); this.planter(34,34);
    this.planter(21,27); this.planter(34,27); this.planter(27,21); this.planter(27,34);
  }
  genFields(){
    this.fill(0,27,this.w,3,TT.DIRT); // main road
    this.fill(28,0,4,this.h,TT.DIRT);
    // farm plots
    for(let i=0;i<4;i++) this.fill(8+i*10, 36, 7, 12, TT.DIRT);
    // pond
    this.fill(44,12,9,7,TT.WATER);
    this.fill(47,10,2,11,TT.BRIDGE);
    // tall grass patches
    for(let i=0;i<26;i++){ const x=2+((this.rnd()*(this.w-6))|0), z=2+((this.rnd()*(this.h-6))|0); this.fill(x,z,2,2,TT.TGRASS); }
  }
  genForest(){
    this.fill(26,0,5,this.h,TT.DIRT);
    this.fill(0,26,this.w,5,TT.DIRT);
    for(let i=0;i<40;i++){ const x=2+((this.rnd()*(this.w-6))|0), z=2+((this.rnd()*(this.h-6))|0); this.fill(x,z,2,1,TT.TGRASS); }
    this.fill(44,16,8,8,TT.DIRT); // camp clearing near mine entrance
  }
  genSwamp(){
    this.fill(26,0,5,this.h,TT.SAND);
    for(let i=0;i<46;i++){ const x=2+((this.rnd()*(this.w-10))|0), z=2+((this.rnd()*(this.h-10))|0); const r=1+((this.rnd()*3)|0); this.fill(x,z,r+2,r,TT.WATER); }
    for(let i=0;i<30;i++){ const x=2+((this.rnd()*(this.w-6))|0), z=2+((this.rnd()*(this.h-6))|0); this.fill(x,z,2,2,TT.SAND); }
  }
  genRuins(){
    this.fill(26,0,5,this.h,TT.STONE);
    // scattered broken walls
    const r=this.rnd;
    for(let i=0;i<26;i++){ const x=3+((r()*(this.w-10))|0), z=3+((r()*(this.h-10))|0); const horiz=r()<.5; for(let j=0;j<4+((r()*8)|0);j++){ if(horiz) this.set(x+j,z,TT.WALL); else this.set(x,z+j,TT.WALL);} }
    // temple platform
    this.fill(22,22,16,16,TT.STONE);
    this.rectHollow(24,24,12,12,TT.WALL);
    this.set(29,24,TT.STONE); this.set(30,24,TT.STONE);
    // crypt entrance plaza
    this.fill(8,26,9,9,TT.STONE);
  }
  genSnow(){
    this.fill(26,0,5,this.h,TT.DIRT);
    for(let i=0;i<30;i++){ const x=2+((this.rnd()*(this.w-6))|0), z=2+((this.rnd()*(this.h-6))|0); this.fill(x,z,2,2,TT.STONE); }
  }
  genVolcanic(){
    this.fill(26,0,5,this.h,TT.STONE);
    this.fill(0,26,this.w,5,TT.STONE);
    const r=this.rnd;
    for(let i=0;i<26;i++){ const x=2+((r()*(this.w-10))|0), z=2+((r()*(this.h-10))|0); const rad=1+((r()*3)|0); for(let dz=-rad;dz<=rad;dz++)for(let dx=-rad;dx<=rad;dx++){ if(dx*dx+dz*dz<=rad*rad) this.set(x+dx,z+dz,TT.LAVA);} }
    // caldera arena
    this.fill(22,36,18,16,TT.STONE);
    this.rectHollow(20,34,22,20,TT.WALL);
    this.set(30,34,TT.STONE); this.set(31,34,TT.STONE);
  }
  genDungeon(crypt){
    const r=this.rnd;
    this.fill(0,0,this.w,this.h,TT.WALL);
    const floor = crypt?TT.CRYPT:TT.CAVE;
    const rooms=[];
    const carve=(x,z,w,h)=>{ this.fill(x,z,w,h,floor); rooms.push([x,z,w,h]); };
    carve(2,2,6,6); // entrance
    carve(16,6,10,8); carve(30,6,8,8);
    carve(6,22,8,8); carve(20,20,8,8); carve(30,20,8,8);
    carve(28,28,12,12); // boss room
    carve(4,32,8,8);
    const corridors=[
      [8,5,10,2],[18,14,2,8],[26,9,6,2],[14,25,8,2],[28,24,2,6],[8,30,4,2],[34,14,2,8],[24,24,6,2]
    ];
    for(const [x,z,w,h] of corridors) this.fill(x,z,w,h,floor);
    if(crypt){ // sarcophagi
      for(const [x,z,w,h] of rooms){ if(w*h>40){ this.set(x+(w>>1), z+(h>>1), TT.WALL); } }
    }
  }

  building(x,z,w,h,wallColor,roofColor){
    const a=w*h;
    const key = a>=100?'b_church' : a>=80?'b_tavern' : a>=72?'b_blacksmith' : a>=64?'b_market' : 'b_home';
    const maxH = key==='b_church'?10.5 : key==='b_home'?7 : 8.5;
    const g=this.envProp(key,(x+w/2)*TILE,(z+h/2)*TILE,{d:Math.max(w,h)*TILE*0.92, maxH, rot:Math.PI/2});
    if(!g){ this.fill(x,z,w,h,TT.WALL); return; }
    g.updateMatrixWorld(true);
    const bb=new THREE.Box3().setFromObject(g);
    const x0=clamp(Math.round(bb.min.x/TILE),x,x+w-1), x1=clamp(Math.round(bb.max.x/TILE),x,x+w-1);
    const z0=clamp(Math.round(bb.min.z/TILE),z,z+h-1), z1=clamp(Math.round(bb.max.z/TILE),z,z+h-1);
    this.fill(x0,z0,x1-x0+1,z1-z0+1,TT.WALL);
    const mats=[]; g.traverse(o=>{ if(o.isMesh){ o.material=o.material.clone(); if(mats.indexOf(o.material)<0) mats.push(o.material); } });
    this.blockers.push(g); this.buildings.push({x,z,w,h,wall:g,roof:g,mats});
    this.addLightSpot('window', (x+w/2)*TILE, Math.min(3, maxH*0.4), (z+h/2)*TILE);
  }

  /* ---------- procedural town furnishings ---------- */
  _b(g,c,px,py,pz,sx,sy,sz){ const m=new THREE.Mesh(GEO.box,mat(c)); m.scale.set(sx,sy,sz); m.position.set(px,py,pz); m.castShadow=true; m.receiveShadow=true; g.add(m); return m; }
  _c(g,c,px,py,pz,r,h){ const m=new THREE.Mesh(GEO.cyl,mat(c)); m.scale.set(r*2,h,r*2); m.position.set(px,py,pz); m.castShadow=true; m.receiveShadow=true; g.add(m); return m; }

  bank(x,z,w,h){
    const W=w*TILE, D=h*TILE, cx=(x+w/2)*TILE, cz=(z+h/2)*TILE;
    const g=new THREE.Group();
    const S=0xbcb8ae, SM=0x9a968c, SD=0x7b776d, WINDOW=0x223243, GOLD=0xedd06a, GOLD2=0xb8933a;
    const H=3.9, m=this;
    // plinth + body
    m._b(g,SD,0,0.24,0, W+0.2,0.48,D+0.2);
    m._b(g,SM,0,0.48+H/2,0, W-0.6,H,D-0.6);
    // corner pilasters
    for(const sx of [-1,1]) for(const sz of [-1,1]) m._b(g,S, sx*(W/2-0.65),0.48+H/2, sz*(D/2-0.65), 0.7,H,0.7);
    // cornice
    m._b(g,S, 0,0.48+H-0.2,0, W-0.1,0.5,D-0.1);
    // side windows (glowing niches)
    for(const sx of [-1,1]) for(const zz of [-D/4, D/4]){
      const cw=m._b(g,WINDOW, sx*(W/2-0.55), 2.5, zz, 0.36,1.2,0.9); cw.material=cw.material.clone(); cw.material.emissive=new THREE.Color(0x8fb0d8); cw.material.emissiveIntensity=0.5;
    }
    // low cupola: drum + small faceted dome + gilded finial
    m._c(g,SM,0, 0.48+H+0.3,0, 0.9,0.7);
    const dome=new THREE.Mesh(GEO.sph, mat(S)); dome.scale.set(1.5,0.9,1.5); dome.position.set(0,0.48+H+1.0,0); dome.castShadow=true; g.add(dome);
    const fin=new THREE.Mesh(GEO.ico, mat(GOLD)); fin.scale.setScalar(0.3); fin.position.set(0,0.48+H+1.5,0); g.add(fin);
    // entrance portico (east, +x), flush
    for(const zz of [-1.5,1.5]) m._c(g,S, W/2-0.1,0.48+1.6,zz, 0.34,3.2);
    m._b(g,S, W/2-0.08,0.48+3.35,0, 0.8,0.4,4.4);
    // gilded circular vault door
    const vd=m._c(g,GOLD, W/2-0.05,2.5,0, 1.2,0.32); vd.rotation.z=Math.PI/2;
    const vr=m._c(g,GOLD2,W/2-0.02,2.5,0, 1.38,0.2); vr.rotation.z=Math.PI/2;
    const hub=m._c(g,SD, W/2+0.02,2.5,0, 0.28,0.5); hub.rotation.z=Math.PI/2;
    for(let i=0;i<4;i++){ const a=i*Math.PI/2; m._b(g,SD, W/2+0.05, 2.5+Math.sin(a)*0.78, Math.cos(a)*0.78, 0.13,0.4,0.4); }
    // gilded sign
    m._b(g,GOLD2, W/2-0.02,3.6,0, 0.24,0.5,1.4);
    // entrance step
    m._b(g,SD, W/2+0.45,0.16,0, 1.0,0.32,3.8);
    g.position.set(cx,0,cz);
    this.group.add(g);
    this.fill(x,z,w,h,TT.WALL);
    const mats=[]; g.traverse(o=>{ if(o.isMesh&&mats.indexOf(o.material)<0) mats.push(o.material); });
    this.blockers.push(g); this.buildings.push({x,z,w,h,wall:g,roof:g,mats});
  }

  bench(x,z,rnd){
    const cx=(x+0.5)*TILE, cz=(z+0.5)*TILE;
    const rot=Math.atan2(56-cx,56-cz)+(rnd||0);
    const g=new THREE.Group();
    const WOOD=0x8a6a4a, WOOD2=0x74573a, IRON=0x50525c;
    for(const s of [-1,1]) this._b(g,IRON, s*0.92,0.38,0, 0.14,0.76,0.52);
    this._b(g,WOOD, 0,0.74,0, 2.4,0.15,0.66);
    this._b(g,WOOD2,0,1.2,-0.3, 2.4,0.55,0.14);
    g.position.set(cx,0,cz); g.rotation.y=rot;
    this.group.add(g);
  }

  planter(x,z){
    const cx=(x+0.5)*TILE, cz=(z+0.5)*TILE;
    const g=new THREE.Group();
    this._b(g,0x9a968c, 0,0.45,0, 1.8,0.9,1.8);
    this._b(g,0x3f2f1e, 0,0.93,0, 1.5,0.12,1.5);
    const petals=[0xe05656,0xe8c85a,0xb27fe0,0x7fd06a,0xe08a56,0x8ad0e0,0xf0f0f0];
    const n=4+Math.floor(Math.random()*3);
    for(let i=0;i<n;i++){
      const ox=(Math.random()-0.5)*0.7, oz=(Math.random()-0.5)*0.7, sh=0.6+Math.random()*0.6;
      const stem=new THREE.Mesh(GEO.cyl, mat(0x3a6a2e)); stem.scale.set(0.06,sh,0.06); stem.position.set(ox,0.99+sh/2,oz); stem.castShadow=true; g.add(stem);
      const head=new THREE.Mesh(GEO.ico, mat(petals[(Math.random()*petals.length)|0])); head.scale.setScalar(0.2+Math.random()*0.12); head.position.set(ox,0.99+sh,oz); head.castShadow=true; g.add(head);
    }
    g.position.set(cx,0,cz);
    this.group.add(g);
  }

  buildMeshes(){
    const t=this.theme, w=this.w, h=this.h;
    // ground: one textured quad per tile (non-shared verts) so each
    // floor type samples its own atlas cell cleanly.
    const atlas=GroundAtlas.get(this.def.theme);
    const pos=[], idxs=[], colr=[], uvs=[];
    const mu=1/atlas.canvasW, mv=1/atlas.canvasH;
    let vi=0;
    for(let j=0;j<h;j++) for(let i=0;i<w;i++){
      const R=atlas.rects[this.tile(i,j)];
      const x0=i*TILE, x1=(i+1)*TILE, z0=j*TILE, z1=(j+1)*TILE;
      const y00=this.heightAt(i,j),   y10=this.heightAt(i+1,j);
      const y01=this.heightAt(i,j+1), y11=this.heightAt(i+1,j+1);
      const v=0.94 + ((hashStr(this.id+','+i+','+j)%100)/100)*0.12;
      pos.push(x0,y00,z0, x1,y10,z0, x0,y01,z1, x1,y11,z1);
      const u0=R.u0+mu, u1=R.u1-mu, v0=R.v0+mv, v1=R.v1-mv;
      uvs.push(u0,v0, u1,v0, u0,v1, u1,v1);
      colr.push(v,v,v, v,v,v, v,v,v, v,v,v);
      idxs.push(vi,vi+2,vi+1, vi+1,vi+2,vi+3);
      vi+=4;
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colr,3));
    geo.setIndex(idxs);
    geo.computeVertexNormals();
    // per-tile type texture for the transition shader (index into GROUND_ORDER)
    const typeData=new Uint8Array(w*h*4);
    for(let k=0;k<w*h;k++){ typeData[k*4]=GROUND_ORDER.indexOf(this.tiles[k]); }
    const typeTex=new THREE.DataTexture(typeData, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
    typeTex.magFilter=typeTex.minFilter=THREE.NearestFilter;
    typeTex.needsUpdate=true;
    const gmat = new THREE.MeshLambertMaterial({map:atlas.texture, vertexColors:true});
    gmat.onBeforeCompile=(sh)=>{
      sh.uniforms.uTypeTex={value:typeTex};
      sh.uniforms.uTypeSize={value:new THREE.Vector2(w,h)};
      sh.vertexShader=sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vTile;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\n\tvTile=vec2(position.x,position.z)/2.0;');
      sh.fragmentShader=sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vTile;\nuniform sampler2D uTypeTex;\nuniform vec2 uTypeSize;')
        .replace('#include <map_pars_fragment>', '#include <map_pars_fragment>\n'+GROUND_SHADER_MAP_FN)
        .replace('#include <map_fragment>', '#ifdef USE_MAP\n\tdiffuseColor.rgb *= geBlend();\n#endif');
    };
    this.groundMesh = new THREE.Mesh(geo, gmat);
    this.groundMesh.receiveShadow = true;
    this.groundMesh.userData.ground = true;
    this.group.add(this.groundMesh);
    // walls as boxes for dungeon/ruins/crypt look
    if(this.isCave() || this.def.theme==='ruins' || this.def.theme==='volcanic'){
      const wallCol=[]; const wallPos=[]; const wallIdx=[]; let vi=0;
      const wc = this.isCave()? (this.def.theme==='crypt'?[0.2,0.2,0.28]:[0.18,0.14,0.10]) : [0.45,0.44,0.42];
      for(let z=0;z<h;z++)for(let x=0;x<w;x++){
        if(this.tiles[this.idx(x,z)]!==TT.WALL) continue;
        if(this.isCave() && this.tile(x,z+1)!==TT.WALL && this.tile(x,z-1)!==TT.WALL && this.tile(x+1,z)!==TT.WALL && this.tile(x-1,z)!==TT.WALL) { /* isolated, skip visual */ }
        const hx=x*TILE+TILE/2, hz=z*TILE+TILE/2, ht=this.isCave()?3.4:1.4;
        for(const [dx,dz,dy] of [[-1,-1,0],[1,-1,0],[1,1,0],[-1,1,0]]){
          wallPos.push(hx+dx*TILE/2, dy===0?0:ht, hz+dz*TILE/2);
          wallCol.push(wc[0],wc[1],wc[2]);
        }
        wallPos.push(hx,ht*0.55,hz); wallCol.push(wc[0]*0.8,wc[1]*0.8,wc[2]*0.8);
        wallIdx.push(vi,vi+1,vi+4, vi+1,vi+2,vi+4, vi+2,vi+3,vi+4, vi+3,vi+0,vi+4);
        vi+=5;
      }
      const wg=new THREE.BufferGeometry();
      wg.setAttribute('position',new THREE.Float32BufferAttribute(wallPos,3));
      wg.setAttribute('color',new THREE.Float32BufferAttribute(wallCol,3));
      wg.setIndex(wallIdx); wg.computeVertexNormals();
      const wm=new THREE.Mesh(wg,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));
      wm.receiveShadow=true; wm.castShadow=true;
      this.group.add(wm);
      if(this.isCave()){
        const ceil = new THREE.Mesh(GEO.plane, mat(this.def.theme==='crypt'?0x0e0e16:0x14100c));
        ceil.rotation.x = Math.PI/2;
        ceil.scale.set(w*TILE,h*TILE,1);
        ceil.position.set(w*TILE/2, 3.4, h*TILE/2);
        this.group.add(ceil);
      }
    }
  }
  heightAt(i,j){ return this.isCave()?0 : Math.sin(i*0.7)*Math.cos(j*0.6)*0.08; }

  buildTownWall(){
    // stone ring around the town; road tiles become gates, portals sit under the arches
    const inset=3, x0=inset, x1=this.w-1-inset, z0=inset, z1=this.h-1-inset;
    const ring=[], road=new Set();
    const push=(x,z)=>{
      if(this.tiles[this.idx(x,z)]===TT.DIRT){ road.add(x+','+z); return; }
      ring.push({x,z}); this.solid[this.idx(x,z)]=1;
    };
    for(let x=x0;x<=x1;x++){ push(x,z0); push(x,z1); }
    for(let z=z0+1;z<z1;z++){ push(x0,z); push(x1,z); }
    // instanced blocks: [x,z] tile, h height, w footprint (tiles), y base offset, c tone
    const mkInst=(list, baseColor)=>{
      const m=new THREE.InstancedMesh(GEO.box, mat(baseColor), list.length);
      const mtx=new THREE.Matrix4(), col=new THREE.Color();
      list.forEach((t,i)=>{
        mtx.compose(new THREE.Vector3((t.x+0.5)*TILE, (t.y||0)+(t.h||1)/2, (t.z+0.5)*TILE),
          new THREE.Quaternion(), new THREE.Vector3((t.w||1)*TILE, (t.h||1), (t.w||1)*TILE));
        m.setMatrixAt(i, mtx);
        if(t.c){ col.setHex(t.c); m.setColorAt(i,col); }
      });
      m.instanceMatrix.needsUpdate=true;
      if(m.instanceColor) m.instanceColor.needsUpdate=true;
      m.castShadow=true; m.receiveShadow=true;
      this.group.add(m);
    };
    const blocks=[], plinth=[], crens=[];
    ring.forEach((t,i)=>{
      const j=((t.x*7+t.z*13)%5)*0.16;           // hand-built height jitter
      blocks.push({x:t.x,z:t.z,h:4.3+j,w:0.98,c:i%2?0x767b85:0x7e838d});
      plinth.push({x:t.x,z:t.z,h:0.8,w:1.18,y:0,c:0x6d727c});
      if(i%2===0) crens.push({x:t.x,z:t.z,h:0.9,w:0.32,y:4.3+j,c:0x9aa0ac});
    });
    mkInst(blocks, 0xffffff);
    mkInst(plinth, 0xffffff);
    mkInst(crens, 0xffffff);
    // gate openings: contiguous road runs along the ring
    const runs=[];
    const scan=(axis, fixed, from, to)=>{
      let run=null;
      for(let v=from;v<=to;v++){
        const isRoad=axis==='x'? road.has(v+','+fixed) : road.has(fixed+','+v);
        if(isRoad){ if(run) run.b=v; else run={a:v,b:v}; }
        else if(run){ runs.push({axis,fixed,a:run.a,b:run.b}); run=null; }
      }
      if(run) runs.push({axis,fixed,a:run.a,b:run.b});
    };
    scan('x', z0, x0, x1); scan('x', z1, x0, x1);
    scan('z', x0, z0+1, z1-1); scan('z', x1, z0+1, z1-1);
    // gatehouses: two flanking towers + arch over the passage + crenellations
    for(const g of runs){
      const horiz=g.axis==='x';
      const cx=horiz? ((g.a+g.b+1)/2)*TILE : (g.fixed+0.5)*TILE;
      const cz=horiz? (g.fixed+0.5)*TILE : ((g.a+g.b+1)/2)*TILE;
      const span=(g.b-g.a+2)*TILE+1.2;
      const tws=horiz? [{x:g.a-1,z:g.fixed},{x:g.b+1,z:g.fixed}] : [{x:g.fixed,z:g.a-1},{x:g.fixed,z:g.b+1}];
      for(const t of tws){
        const tw=new THREE.Mesh(GEO.box, mat(0x767b85));
        tw.scale.set(3.0,6.4,3.0);
        tw.position.set((t.x+0.5)*TILE, 3.2, (t.z+0.5)*TILE);
        tw.castShadow=true; tw.receiveShadow=true;
        const rf=new THREE.Mesh(GEO.cone4, mat(0x5a5e66));
        rf.scale.set(2.6,2.2,2.6);
        rf.position.set((t.x+0.5)*TILE, 7.5, (t.z+0.5)*TILE);
        rf.rotation.y=Math.PI/4; rf.castShadow=true;
        this.group.add(tw,rf);
      }
      const arch=new THREE.Mesh(GEO.box, mat(0x6d727c));
      arch.scale.set(horiz?span:2.6, 1.8, horiz?2.6:span);
      arch.position.set(cx, 5.6, cz);
      arch.castShadow=true; arch.receiveShadow=true;
      this.group.add(arch);
      const n=5;
      for(let i=0;i<n;i++){
        const off=(i-(n-1)/2)*((span-2.6)/(n-1));
        const c=new THREE.Mesh(GEO.box, mat(0x9aa0ac));
        c.scale.set(horiz?1.0:1.7, 0.9, horiz?1.7:1.0);
        c.position.set(horiz?cx+off:cx, 7.0, horiz?cz:cz+off);
        c.castShadow=true;
        this.group.add(c);
      }
      // closed wooden gate at the outer face of the passage (portal sits just behind it)
      const W=(g.b-g.a+1)*TILE-0.5;
      const out=horiz? (g.fixed<this.h/2? -1:1) : (g.fixed<this.w/2? -1:1);
      const dz=horiz? (TILE/2+0.28)*out : 0;
      const dx=horiz? 0 : (TILE/2+0.28)*out;
      const mkDoor=(xoff,zoff,wLen)=>{
        const d=new THREE.Mesh(GEO.box, mat(0x6a4a28));
        d.scale.set(horiz? wLen:0.42, 4.35, horiz? 0.42:wLen);
        d.position.set(cx+dx+xoff, 2.17, cz+dz+zoff);
        d.castShadow=true; d.receiveShadow=true;
        this.group.add(d);
      };
      const half=W/4+0.03;
      if(horiz){ mkDoor(-half,0,W/2-0.06); mkDoor(half,0,W/2-0.06); }
      else { mkDoor(0,-half,W/2-0.06); mkDoor(0,half,W/2-0.06); }
      for(const by of [1.4,3.3]){
        const band=new THREE.Mesh(GEO.box, mat(0x444a52));
        band.scale.set(horiz? W-0.3:0.52, 0.3, horiz? 0.52:W-0.3);
        band.position.set(cx+dx, by, cz+dz);
        band.castShadow=true;
        this.group.add(band);
      }
    }
    // corner keeps, taller than the curtain
    for(const [tx,tz] of [[x0,z0],[x0,z1],[x1,z0],[x1,z1]]){
      const tower=new THREE.Mesh(GEO.box, mat(0x767b85));
      tower.scale.set(3.6,7.4,3.6);
      tower.position.set((tx+0.5)*TILE, 3.7, (tz+0.5)*TILE);
      tower.castShadow=true; tower.receiveShadow=true;
      const roof=new THREE.Mesh(GEO.cone4, mat(0x5a5e66));
      roof.scale.set(3.1,2.6,3.1);
      roof.position.set((tx+0.5)*TILE, 8.7, (tz+0.5)*TILE);
      roof.rotation.y=Math.PI/4; roof.castShadow=true;
      this.group.add(tower,roof);
    }
  }
  buildDecor(){
    const t=this.theme, r=this.rnd;
    if(this.def.theme==='town') this.buildTownWall();
    if(!this.isCave()){
      // trees via glTF props (downloaded assets are required)
      const nTrees = t.trees;
      let envN=0; const envCap = this.def.theme==='forest'?90:55;
      for(let i=0;i<nTrees*4;i++){
        const x=2+((r()*(this.w-4))|0), z=2+((r()*(this.h-4))|0);
        if(this.solidAt(x,z)||this.tiles[this.idx(x,z)]===TT.DIRT&&this.def.theme==='town') continue;
        if(this.tiles[this.idx(x,z)]===TT.WATER||this.tiles[this.idx(x,z)]===TT.LAVA) continue;
        if(this.tiles[this.idx(x,z)]===TT.BRIDGE) continue;
        const nearPortal=(this.def.exits||[]).some(e=>Math.abs(e.x-x)<4&&Math.abs(e.z-z)<4);
        if(nearPortal) continue;
        if((this.def.npcs||[]).length===0 && NPCS && Object.keys(NPCS).some(k=>NPCS[k].zone===this.id&&Math.abs(NPCS[k].x-x)<3&&Math.abs(NPCS[k].z-z)<3)) continue;
        if(envN++>=envCap) continue; // cap reached: skip (no invisible blockers)
        this.solid[this.idx(x,z)]=1;
        const s=0.8+r()*0.7, big=this.def.theme==='forest';
        const dark=this.def.theme==='snow'||this.def.theme==='volcanic';
        const key= dark? (r()<0.5?'tree_dead_medium':'tree_dead_small') : (big?'tree_a':'tree_b');
        this.envProp(key,(x+0.5)*TILE,(z+0.5)*TILE,{h:s*(big?6.5:4.8),rot:r()*6.28});
      }
      // rocks
      for(let i=0;i<t.rocks*3;i++){
        const x=2+((r()*(this.w-4))|0), z=2+((r()*(this.h-4))|0);
        if(this.solidAt(x,z)) continue;
        const tt=this.tiles[this.idx(x,z)];
        if(tt===TT.WATER||tt===TT.LAVA||tt===TT.DIRT||tt===TT.STONE||tt===TT.BRIDGE) continue;
        this.solid[this.idx(x,z)]=1;
        const s=0.5+r()*0.9;
        const rk='rock_'+['a','b','c','d','e'][(r()*5)|0];
        this.envProp(rk,(x+0.5)*TILE,(z+0.5)*TILE,{h:s*1.15,rot:r()*6.28});
      }
      // grass tufts + flowers (non solid)
      if(t.flowers){
        const g1=[],g2=[];
        for(let i=0;i<400;i++){
          const x=r()*this.w, z=r()*this.h;
          if(this.solidAt(x|0,z|0)) continue;
          (r()<0.85?g1:g2).push({x,z,s:0.3+r()*0.35});
        }
        this.addInstanced(g1, GEO.cone4, mat(0x3f7a2f), 0.35, 0.1);
        this.addInstanced(g2, GEO.ico, mat(0xd85a7a), 0.16, 0.05);
      }
      // water animation planes
      for(let z=0;z<this.h;z++)for(let x=0;x<this.w;x++){
        if(this.tiles[this.idx(x,z)]===TT.WATER && !(x>0&&this.tiles[this.idx(x-1,z)]===TT.WATER)){
          let run=0; while(x+run<this.w && this.tiles[this.idx(x+run,z)]===TT.WATER) run++;
          const wm = new THREE.Mesh(GEO.plane, new THREE.MeshLambertMaterial({color:0x2a5a8a, transparent:true, opacity:0.8}));
          wm.rotation.x=-Math.PI/2;
          wm.scale.set(run*TILE, TILE, 1);
          wm.position.set((x+run/2)*TILE, 0.12, (z+0.5)*TILE);
          this.group.add(wm); this.waterMeshes.push({m:wm, ph:r()*6});
        }
      }
      // lava glow planes
      for(let z=0;z<this.h;z++)for(let x=0;x<this.w;x++){
        if(this.tiles[this.idx(x,z)]===TT.LAVA && !(x>0&&this.tiles[this.idx(x-1,z)]===TT.LAVA)){
          let run=0; while(x+run<this.w && this.tiles[this.idx(x+run,z)]===TT.LAVA) run++;
          const lm = new THREE.Mesh(GEO.plane, emissiveMat(0xff5a1a,{transparent:true,opacity:0.9}));
          lm.rotation.x=-Math.PI/2;
          lm.scale.set(run*TILE, TILE, 1);
          lm.position.set((x+run/2)*TILE, 0.14, (z+0.5)*TILE);
          this.group.add(lm); this.flickerers.push({m:lm, base:0.9, ph:r()*6, planar:true});
        }
      }
      // torches along roads in town + lamp posts
      if(this.def.theme==='town'){
        const posts=[{x:19,z:19},{x:36,z:19},{x:19,z:36},{x:36,z:36},{x:28,z:18},{x:28,z:37},{x:37,z:26},{x:19,z:26}];
        for(const p of posts){
          this.envProp('post_lantern',(p.x+0.5)*TILE,(p.z+0.5)*TILE,{h:2.9,rot:r()*6.28});
          this.addLightSpot('lamp',(p.x+0.5)*TILE,3.2,(p.z+0.5)*TILE);
        }
        // fountain — grand tiered basin with animated water
        const f=new THREE.Group();
        const stoneL=0xa9b1bd, stoneM=0x8a93a3, stoneD=0x6d788a, GOLD=0xedd06a;
        const waterMat=new THREE.MeshLambertMaterial({color:0x4a90c8, transparent:true, opacity:0.78, emissive:new THREE.Color(0x1c3d5c), emissiveIntensity:0.4});
        const jetMat=new THREE.MeshLambertMaterial({color:0xaadcf2, transparent:true, opacity:0.55, emissive:new THREE.Color(0x2c4d6c), emissiveIntensity:0.35});
        const FC=(r,h,y,c)=>{ const m=new THREE.Mesh(GEO.cyl, mat(c)); m.scale.set(r*2,h,r*2); m.position.y=y; m.castShadow=true; m.receiveShadow=true; f.add(m); return m; };
        // basin
        FC(3.9,0.4,0.2,stoneD);
        FC(3.5,0.9,0.9,stoneL);
        FC(3.1,0.14,1.38,stoneM);                    // inner lip
        const pool=new THREE.Mesh(GEO.cyl, waterMat); pool.scale.set(6.2,0.14,6.2); pool.position.y=1.44; f.add(pool);
        // pedestal rising from the pool
        FC(0.75,0.95,1.62,stoneM);
        FC(2.5,0.3,2.18,stoneL);
        FC(2.25,0.12,2.38,stoneM);                   // tier-1 lip
        const w1=new THREE.Mesh(GEO.cyl, waterMat); w1.scale.set(4.6,0.1,4.6); w1.position.y=2.46; f.add(w1);
        FC(0.5,0.7,2.78,stoneD);
        FC(1.7,0.28,3.18,stoneL);
        FC(1.5,0.12,3.36,stoneM);                    // tier-2 lip
        const w2=new THREE.Mesh(GEO.cyl, waterMat); w2.scale.set(3.4,0.1,3.4); w2.position.y=3.5; f.add(w2);
        FC(0.34,0.85,3.68,stoneM);
        FC(0.22,0.7,4.34,stoneD);                    // column
        FC(0.46,0.3,4.78,GOLD);                      // gilded collar
        const cap=new THREE.Mesh(GEO.sph, mat(GOLD)); cap.scale.setScalar(0.5); cap.position.y=5.08; cap.castShadow=true; f.add(cap);
        const crystal=new THREE.Mesh(GEO.ico, new THREE.MeshLambertMaterial({color:0xbfe8ff, emissive:new THREE.Color(0x3a86c8), emissiveIntensity:0.9})); crystal.scale.setScalar(0.72); crystal.position.y=5.5; f.add(crystal);
        // gilded studs around the basin rim
        for(let i=0;i<8;i++){ const a=i/8*6.283, cx=Math.cos(a)*3.42, cz=Math.sin(a)*3.42;
          const orb=new THREE.Mesh(GEO.sph, mat(GOLD)); orb.scale.setScalar(0.22); orb.position.set(cx,1.42,cz); orb.castShadow=true; f.add(orb); }
        // central jet (animated)
        const jet=new THREE.Mesh(GEO.cyl6, jetMat); jet.scale.set(0.24,0.95,0.24); jet.position.y=6.0; f.add(jet);
        const drops=[];
        for(let i=0;i<6;i++){ const d=new THREE.Mesh(GEO.sph, jetMat); d.scale.setScalar(0.14); f.add(d); drops.push(d); }
        f.position.set(28*TILE,0,28*TILE);
        this.group.add(f);
        const dropFn=(dt)=>{
          if(!f.parent){ G.tickers.delete(dropFn); return; }
          const t=performance.now()*0.001;
          jet.scale.y=0.85+Math.sin(t*6+1)*0.2;      // jet pulse
          crystal.scale.setScalar(0.72*(0.92+Math.sin(t*2.2)*0.08)); // breathing glow crystal
          pool.position.y=1.44+Math.sin(t*1.4)*0.03;
          w1.position.y=2.46+Math.sin(t*1.4+1.6)*0.03;
          w2.position.y=3.5+Math.sin(t*1.4+3.1)*0.03;
          for(let i=0;i<drops.length;i++){
            const ph=(t*0.5+i/drops.length)%1;
            const a=i/drops.length*6.283;
            drops[i].position.set(Math.cos(a)*(0.3+ph*2.6), 5.9-ph*4.4, Math.sin(a)*(0.3+ph*2.6));
            drops[i].scale.setScalar(0.15*(1-ph*0.5));
          }
        };
        G.tickers.add(dropFn);
        for(let dz=26;dz<=29;dz++)for(let dx=26;dx<=29;dx++) this.solid[this.idx(dx,dz)]=1;
        // barrels & crates
        const props=[{x:37,z:32},{x:38,z:31},{x:19,z:32},{x:20,z:40},{x:37,z:18},{x:36,z:17}];
        const propKeys=['barrel_m','crate_big','sack','pallet','barrel_small','crate_small'];
        props.forEach((p,i)=>{
          this.envProp(propKeys[i%propKeys.length],(p.x+0.5)*TILE,(p.z+0.5)*TILE,{h:1+ r()*0.2,rot:r()*6.28}); this.solid[this.idx(p.x,p.z)]=1;
        });
      }
      // fence around town center garden
      if(this.def.theme==='fields'){
        for(let x=4;x<12;x++) this.addFencePost(x,32,0);
        for(let z=32;z<40;z++) this.addFencePost(4,z,Math.PI/2);
      }
      // swamp flora + ruins dressing via glTF props
      if(this.def.theme==='swamp'){
        let wn=0;
        for(let z=1;z<this.h-1&&wn<26;z++)for(let x=1;x<this.w-1&&wn<26;x++){
          if(this.tiles[this.idx(x,z)]===TT.WATER && (x*5+z*3)%7===0){ this.envProp('waterlily',(x+0.5)*TILE,(z+0.5)*TILE,{h:0.35,y:0.14,rot:r()*6.28}); wn++; }
        }
        for(let z=1;z<this.h-1;z++)for(let x=1;x<this.w-1;x++){
          if(this.tiles[this.idx(x,z)]!==TT.SAND||r()>0.12) continue;
          if(this.tile(x+1,z)===TT.WATER||this.tile(x-1,z)===TT.WATER||this.tile(x,z+1)===TT.WATER||this.tile(x,z-1)===TT.WATER) this.envProp('waterplant',(x+0.5)*TILE,(z+0.5)*TILE,{h:0.7,rot:r()*6.28});
        }
      }
      if(this.def.theme==='ruins'){
        this.envProp('arch',(this.w/2)*TILE,(this.h/2)*TILE,{d:TILE*5,rot:0});
        let rn=0;
        for(let z=2;z<this.h-2&&rn<30;z++)for(let x=2;x<this.w-2&&rn<30;x++){
          if(this.solidAt(x,z)||r()>0.05) continue;
          const tt=this.tiles[this.idx(x,z)];
          if(tt===TT.WATER||tt===TT.LAVA) continue;
          const pick=r();
          if(pick<0.3){ this.envProp('gravestone',(x+0.5)*TILE,(z+0.5)*TILE,{h:1.1,rot:r()*6.28}); this.solid[this.idx(x,z)]=1; }
          else if(pick<0.5){ this.envProp('grave',(x+0.5)*TILE,(z+0.5)*TILE,{h:1.2,rot:r()*6.28}); this.solid[this.idx(x,z)]=1; }
          else if(pick<0.75){ this.envProp('rubble_half',(x+0.5)*TILE,(z+0.5)*TILE,{h:0.8,rot:r()*6.28}); }
          else { this.envProp('tree_dead_small',(x+0.5)*TILE,(z+0.5)*TILE,{h:3.2,rot:r()*6.28}); this.solid[this.idx(x,z)]=1; }
          rn++;
        }
      }
    } else {
      // dungeon torches
      const torchPts=[];
      for(let z=1;z<this.h-1;z++)for(let x=1;x<this.w-1;x++){
        if(this.tiles[this.idx(x,z)]!==TT.WALL) continue;
        if(this.tile(x,z+1)!==TT.WALL && ((x*7+z*13)%11===0)) torchPts.push({x,z});
      }
      for(const p of torchPts){
        if(torchPts.indexOf(p)<40){ this.envProp('torch_mounted',(p.x+0.5)*TILE,(p.z+0.5)*TILE,{h:0.95,y:1.1}); this.addLightSpot('torch',(p.x+0.5)*TILE,2.2,(p.z+0.5)*TILE); }
      }
      // dungeon clutter via glTF props
      {
        const crypt=this.def.theme==='crypt';
        const small=crypt?['skull','bone','ribcage','rubble_half','candle_lit','sword_shield_broken']
                          :['barrel_small','box_large','trunk_small','rubble_half','torch_lit','sack'];
        const big=crypt?['coffin','pillar_decorated','barrel_large','crates_stacked']
                       :['pillar','barrel_large','crates_stacked','trunk_medium','box_large'];
        let placed=0;
        for(let z=2;z<this.h-2&&placed<40;z++)for(let x=2;x<this.w-2&&placed<40;x++){
          if(this.solidAt(x,z)||r()>0.1) continue;
          const tt=this.tiles[this.idx(x,z)];
          if(tt!==TT.CAVE&&tt!==TT.CRYPT) continue;
          if((this.def.chests||[]).some(c=>c.x===x&&c.z===z)) continue;
          const pick=r();
          if(pick<0.55){
            const key=small[(r()*small.length)|0];
            const y=(pick<0.08?1.05:0);
            this.envProp(key,(x+0.5)*TILE,(z+0.5)*TILE,{h:0.5+r()*0.5,rot:r()*6.28,y});
            if(key==='candle_lit') this.addLightSpot('candle',(x+0.5)*TILE,y+1.0,(z+0.5)*TILE);
            else if(key==='torch_lit') this.addLightSpot('torch',(x+0.5)*TILE,y+1.6,(z+0.5)*TILE);
          } else {
            const b=big[(r()*big.length)|0];
            this.envProp(b,(x+0.5)*TILE,(z+0.5)*TILE,{h:b==='pillar_decorated'||b==='pillar'?3.4:1.3,rot:r()*6.28});
            this.solid[this.idx(x,z)]=1;
          }
          placed++;
        }
      }
    }
  }
  addFencePost(x,z,rot){
    this.envProp('fence',(x+0.5)*TILE,(z+0.5)*TILE,{d:TILE*1.7,rot:rot||0});
  }
  addInstanced(list, geo, fixedMat, hScale, yOff){
    if(!list.length) return;
    const m = new THREE.InstancedMesh(geo, fixedMat || mat(0xffffff), list.length);
    const mtx = new THREE.Matrix4(); const col = new THREE.Color();
    list.forEach((it,i)=>{
      const s = it.s||1;
      mtx.compose(new THREE.Vector3((it.x+0.5)*TILE, (hScale*s)/2 + yOff, (it.z+0.5)*TILE), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), (it.x*13+it.z*7)%6.28), new THREE.Vector3(s, hScale*s, s));
      m.setMatrixAt(i, mtx);
      if(it.c!==undefined){ col.setHex(it.c); m.setColorAt(i, col); }
    });
    if(m.instanceColor) m.instanceColor.needsUpdate = true;
    m.instanceMatrix.needsUpdate = true;
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  buildFeatures(){
    // portals
    for(const ex of (this.def.exits||[])){
      const g=new THREE.Group();
      const pillar=new THREE.Mesh(GEO.cyl, emissiveMat(0x6fd6ff,{transparent:true,opacity:0.55}));
      pillar.scale.set(0.9,3,0.9); pillar.position.y=1.5;
      const base=new THREE.Mesh(GEO.cyl, mat(0x4a4a5a)); base.scale.set(1.3,0.2,1.3); base.position.y=0.1;
      g.add(pillar,base);
      g.position.set((ex.x+0.5)*TILE, 0, (ex.z+0.5)*TILE);
      g.userData.portal = ex;
      this.group.add(g);
      this.portalObjs.push({ex, mesh:g});
      this.solid[this.idx(Math.min(this.w-1,Math.max(0,ex.x)),Math.min(this.h-1,Math.max(0,ex.z)))]=0;
    }
    // chests
    (this.def.chests||[]).forEach((ch,i)=>{
      let g=null;
      const envC=EnvAssets.instance('chest');
      g=envWrap(envC,{h:0.95});
      let lid=null; g.traverse(o=>{ if(o.name==='chest_lid') lid=o; });
      g.userData.envLid=lid;
      g.position.set((ch.x+0.5)*TILE,0,(ch.z+0.5)*TILE);
      g.userData.chest={zone:this.id, idx:i, items:ch.items};
      this.group.add(g);
      this.chestObjs.push({def:ch, mesh:g, opened:false});
      this.solid[this.idx(ch.x,ch.z)]=0;
    });
    // traps (invisible tiles)
    (this.def.traps||[]).forEach((tp,i)=>{
      this.trapObjs.push({x:tp.x, z:tp.z, cd:0});
    });
  }

  buildMinimap(){
    const t=this.theme;
    const c=document.createElement('canvas'); c.width=this.w*3; c.height=this.h*3;
    const g=c.getContext('2d');
    const px=3;
    const c2=(a)=>'#'+a.map(v=>Math.round(clamp(v,0,1)*255).toString(16).padStart(2,'0')).join('');
    const grassHex=c2(t.grass), dirtHex=c2(t.dirt), stoneHex=c2(t.stone), waterHex=c2(t.water);
    for(let z=0;z<this.h;z++)for(let x=0;x<this.w;x++){
      const tt=this.tiles[this.idx(x,z)];
      let col;
      switch(tt){
        case TT.DIRT: col=dirtHex; break;
        case TT.STONE: col=stoneHex; break;
        case TT.WATER: col=waterHex; break;
        case TT.WALL: col=this.isCave()?'#17131c':'#3a3a40'; break;
        case TT.SAND: col='#4a4230'; break;
        case TT.SNOW: col='#dfe6f2'; break;
        case TT.CAVE: col='#3a2f24'; break;
        case TT.CRYPT: col='#2c2c3a'; break;
        case TT.BRIDGE: col='#724e2c'; break;
        case TT.LAVA: col='#c2380f'; break;
        case TT.TGRASS: col=c2([t.grass[0]*0.8,t.grass[1]*1.12,t.grass[2]*0.8]); break;
        default: col=grassHex;
      }
      g.fillStyle=col; g.fillRect(x*px,z*px,px,px);
    }
    for(const ex of (this.def.exits||[])){ g.fillStyle='#6fd6ff'; g.fillRect(ex.x*px-2,ex.z*px-2,px+4,px+4); }
    for(const ch of (this.def.chests||[])){ g.fillStyle='#ffd75e'; g.fillRect(ch.x*px,ch.z*px,px,px); }
    this.minimapBase=c;
  }
}

/* ---------- World manager ---------- */
const World = {
  zones:{},
  current:null,
  ensure(id){
    if(!this.zones[id]){
      try { this.zones[id]=new Zone(id); }
      catch(e){ console.error('zone build failed', id, e); this.zones[id]=null; }
    }
    return this.zones[id];
  },
  load(scene, id){
    if(this.current && this.current.id!==id) scene.remove(this.current.group);
    const z=this.ensure(id);
    if(z) scene.add(z.group);
    this.current=z;
    return z;
  },
  clear(scene){ if(this.current){ scene.remove(this.current.group); this.current=null; } },
  // world-space solid test at point (px,pz) with radius
  blockedPoint(zone, px, pz, r){
    if(!zone) return false;
    const x0=Math.floor((px-r)/TILE), x1=Math.floor((px+r)/TILE);
    const z0=Math.floor((pz-r)/TILE), z1=Math.floor((pz+r)/TILE);
    for(let tz=z0;tz<=z1;tz++)for(let tx=x0;tx<=x1;tx++){
      if(zone.solidAt(tx,tz)) return true;
    }
    return false;
  },
  tileOf(px){ return Math.floor(px/TILE); },
  centerOf(tx){ return (tx+0.5)*TILE; },
};

/* ---------- Day / night ---------- */
const DAY_C=new THREE.Color(0xfff2d8), DUSK_C=new THREE.Color(0xffb060), NIGHT_C=new THREE.Color(0x6b7bb8);
const DayNight = {
  t: 0.28, // start mid-morning
  cycleLen: 900, // seconds per full day (15 min)
  daylight(){
    // continuous daylight factor 0 (midnight) .. 1 (mid-day); day peaks at t=0.5
    return 0.5*(1+Math.cos((this.t-0.5)*2*Math.PI));
  },
  phase(){
    const d=this.daylight();
    if(d>0.85) return 'Day';
    if(d>0.5) return 'Morning';
    if(d>0.2) return 'Sunset';
    return 'Night';
  },
  update(dt, scene, sun, hemi){
    this.t = (this.t + dt/this.cycleLen) % 1;
    const z = World.current;
    const theme = z? z.theme : THEMES.town;
    if(!scene.background) scene.background=new THREE.Color(theme.sky);
    if(z && z.def.indoor){
      scene.fog.color.setHex(theme.fog);
      scene.background.setHex(theme.sky);
      sun.intensity = 0.25; sun.color.setHex(0xffd0a0);
      hemi.intensity = 0.35;
      scene.fog.density = 0;
      return this.phase();
    }
    const d = this.daylight();
    const sky = scene.background;
    const fog = scene.fog.color;
    fog.setHex(theme.fog).multiplyScalar(0.25+d*0.85);
    sky.copy(fog); // background matches fog so the world reads as an endless haze
    if(scene.fog.isFogExp2) scene.fog.density = 0.008 + (1-d)*0.012;
    sun.intensity = 0.12 + d*0.85;
    if(d<0.35) sun.color.copy(NIGHT_C).lerp(DUSK_C, d/0.35);
    else sun.color.copy(DUSK_C).lerp(DAY_C, (d-0.35)/0.65);
    hemi.intensity = 0.3 + d*0.4;
    const ang = this.t*Math.PI*2;
    sun.position.set(Math.cos(ang)*60, 40+Math.sin(ang)*30, Math.sin(ang*0.7)*40);
    return this.phase();
  },
};
