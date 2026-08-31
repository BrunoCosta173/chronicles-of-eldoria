'use strict';
/* =========================================================
   entities.js — models, FX, projectiles, Creature, NPC, Player
   ========================================================= */

/* ---------------- hunger ---------------- */
const FOOD_DEPLETE = 100/480; // satiation depletes per second (~0.208): hungry at 5min, starving at 8min
const HUNGER_THRESH = 37.5;   // level2 (hungry) when satiation <= this; level3 (starving) at 0

/* ---------------- inventory ---------------- */
const INV_SLOTS = 16;         // backpack capacity
const MAX_STACK = 99;         // per-stack cap
const MAX_SPLIT = 16;         // split picker ceiling (units per split)

/* ---------------- Model builder ---------------- */
function box(c,x,y,z,sx,sy,sz){ const m=new THREE.Mesh(GEO.box, mat(c,{flatShading:true})); m.position.set(x,y,z); m.scale.set(sx,sy,sz); m.castShadow=true; return m; }
function sph(c,x,y,z,s){ const m=new THREE.Mesh(GEO.sph, mat(c,{flatShading:true})); m.position.set(x,y,z); m.scale.setScalar(s); m.castShadow=true; return m; }
function cone(c,x,y,z,s,h){ const m=new THREE.Mesh(GEO.cone, mat(c,{flatShading:true})); m.position.set(x,y,z); m.scale.set(s,h,s); m.castShadow=true; return m; }
function glow(c,x,y,z,s){ const m=new THREE.Mesh(GEO.sph, emissiveMat(c)); m.position.set(x,y,z); m.scale.setScalar(s); return m; }

const ModelBuilder = {
  build(model, colors, scale){
    const g = new THREE.Group();
    const inner = new THREE.Group();
    g.add(inner);
    const [bc, hc, ac] = colors;
    const B = ModelBuilder;
    switch(model){
      case 'rat':
        inner.add(sph(bc,0,0.35,0,0.55)); inner.add(sph(hc,0,0.42,0.45,0.3));
        inner.add(glow(0xff3030,0,0.45,0.6,0.05)); inner.add(box(bc,0,0.3,-0.55,0.06,0.06,0.5));
        for(const s of[-1,1]) inner.add(box(hc,s*0.2,0.12,0.2,0.1,0.2,0.1)), inner.add(box(hc,s*0.2,0.12,-0.15,0.1,0.2,0.1));
        break;
      case 'snake': {
        // thin, continuous, linear body (head at +z, tail at -z) with subtle banding
        const segs=[]; const N=20;
        for(let i=0;i<N;i++){
          const t=i/(N-1);
          const z=-1.0 + t*1.65;
          const x=Math.sin(t*Math.PI*2 - 1.0) * 0.05*(0.3+0.7*(1-t)); // near-linear, tail eases
          const r=0.085 - 0.02*t;                                    // thin, barely-tapering tube
          const seg=sph(i%2?bc:hc, x, r, z, r*2);                    // heavy overlap -> smooth tube
          seg.userData.x0=x; seg.userData.y0=r;
          inner.add(seg); segs.push(seg);
        }
        // small proportional head + snout (barely wider than the body)
        const head=sph(hc, 0, 0.115, 0.76, 0.20); head.scale.set(0.20,0.15,0.28);
        const snout=sph(hc, 0, 0.10, 0.92, 0.14); snout.scale.set(0.14,0.10,0.19);
        inner.add(head, snout);
        // glowing eyes
        inner.add(glow(ac,0.09,0.155,0.82,0.045), glow(ac,-0.09,0.155,0.82,0.045));
        // forked tongue
        const tu1=box(ac, 0.025,0.10,1.0, 0.015,0.015,0.10), tu2=box(ac,-0.025,0.10,1.0, 0.015,0.015,0.10);
        inner.add(tu1,tu2);
        inner.userData.segments=segs;
        break; }
      case 'boar':
        inner.add(box(bc,0,0.5,0,0.7,0.6,1.1)); inner.add(box(hc,0,0.55,0.62,0.45,0.4,0.4));
        inner.add(box(ac,0.12,0.45,0.85,0.06,0.25,0.06), box(ac,-0.12,0.45,0.85,0.06,0.25,0.06));
        for(const s of[-1,1]) inner.add(box(hc,s*0.28,0.18,0.3,0.14,0.36,0.14), box(hc,s*0.28,0.18,-0.3,0.14,0.36,0.14));
        break;
      case 'wolf':
        inner.add(box(bc,0,0.62,0,0.5,0.5,1.2)); inner.add(box(hc,0,0.85,0.68,0.38,0.36,0.4));
        inner.add(box(hc,0.13,1.08,0.62,0.1,0.2,0.1), box(hc,-0.13,1.08,0.62,0.1,0.2,0.1));
        inner.add(box(bc,0,0.7,-0.75,0.12,0.12,0.5));
        for(const s of[-1,1]) inner.add(box(hc,s*0.2,0.22,0.35,0.12,0.5,0.12), box(hc,s*0.2,0.22,-0.35,0.12,0.5,0.12));
        break;
      case 'spider':
        inner.add(sph(bc,0,0.45,0.15,0.4)); inner.add(sph(hc,0,0.5,-0.35,0.55));
        for(let i=0;i<4;i++)for(const s of[-1,1]){ const l=box(bc,s*0.5,0.35,-0.1+i*0.18,0.9,0.07,0.07); l.rotation.y=s*(0.5+i*0.12); inner.add(l); }
        inner.add(glow(0xff3030,0.1,0.55,0.45,0.05), glow(0xff3030,-0.1,0.55,0.45,0.05));
        break;
      case 'goblin': case 'orc': case 'troll': case 'skeleton': {
        const big = model==='troll'?1.25:(model==='orc'?1.1:1);
        const thin = model==='skeleton'?0.6:1;
        inner.add(box(bc,0,0.95*big,0,0.5*thin*big,0.6*big,0.32*big));
        inner.add(box(hc,0,1.45*big,0,0.34*big,0.34*big,0.3*big));
        inner.add(box(bc,0.38*big,0.95*big,0,0.12*thin*big,0.5*big,0.12*thin*big));
        inner.add(box(bc,-0.38*big,0.95*big,0,0.12*thin*big,0.5*big,0.12*thin*big));
        inner.add(box(hc,0.13*big,1.5*big,0.16*big,0.07,0.07,0.05), box(hc,-0.13*big,1.5*big,0.16*big,0.07,0.07,0.05));
        for(const s of[-1,1]) inner.add(box(hc,s*0.15*big,0.35*big,0,0.14*thin*big,0.7*big,0.14*thin*big));
        if(model==='skeleton') inner.add(box(ac,0,1.05*big,0.18*big,0.3*thin,0.35*big,0.05));
        if(model==='troll') inner.add(cone(hc,0,1.75*big,0,0.12,0.2));
        break; }
      case 'hag':
        inner.add(cone(bc,0,0.7,0,0.5,1.4)); inner.add(box(hc,0,1.5,0,0.3,0.3,0.28));
        inner.add(cone(ac,0,1.95,0,0.4,0.7)); inner.add(box(bc,0.35,1.1,0.1,0.1,0.5,0.1), box(bc,-0.35,1.1,0.1,0.1,0.5,0.1));
        break;
      case 'mage':
        inner.add(cone(bc,0,0.75,0,0.55,1.5)); inner.add(box(hc,0,1.6,0,0.3,0.3,0.3));
        inner.add(box(0x2a2018,0.4,1.0,0.15,0.06,1.6,0.06)); inner.add(glow(ac,0.4,1.85,0.15,0.12));
        break;
      case 'minotaur':
        inner.add(box(bc,0,1.1,0,0.85,0.9,0.6)); inner.add(box(hc,0,1.75,0.15,0.45,0.4,0.45));
        inner.add(cone(ac,0.3,1.95,0.15,0.09,0.4), cone(ac,-0.3,1.95,0.15,0.09,0.4));
        for(const s of[-1,1]) inner.add(box(hc,s*0.28,0.4,0,0.2,0.8,0.2));
        break;
      case 'golem':
        inner.add(box(bc,0,1.1,0,1.0,1.1,0.7)); inner.add(box(hc,0,2,0,0.55,0.5,0.5));
        inner.add(box(bc,0.75,1.15,0,0.3,1.0,0.3), box(bc,-0.75,1.15,0,0.3,1.0,0.3));
        inner.add(glow(ac,0,1.2,0.36,0.16));
        for(const s of[-1,1]) inner.add(box(hc,s*0.3,0.3,0,0.35,0.6,0.35));
        break;
      case 'wyvern':
        inner.add(box(bc,0,1.0,0,0.55,0.5,1.0)); inner.add(box(hc,0,1.25,0.75,0.3,0.3,0.5));
        inner.add(cone(hc,0,1.25,1.15,0.12,0.35));
        for(const s of[-1,1]){ const w=box(ac,s*0.9,1.15,-0.1,1.5,0.08,0.8); w.rotation.z=s*0.35; inner.add(w); }
        inner.add(box(bc,0,1.0,-0.85,0.15,0.15,0.9));
        break;
      case 'chieftain':
        inner.add(box(bc,0,1.2,0,0.75,0.85,0.5)); inner.add(box(hc,0,1.95,0,0.45,0.45,0.4));
        inner.add(glow(0xffd700,0,2.25,0,0.18)); inner.add(cone(0xffd700,0,2.2,0,0.35,0.35));
        inner.add(box(0x2a2018,0.55,1.1,0.15,0.08,1.5,0.08)); inner.add(box(ac,0.55,1.7,0.15,0.3,0.35,0.12));
        for(const s of[-1,1]) inner.add(box(hc,s*0.22,0.45,0,0.18,0.9,0.18));
        break;
      case 'guardian':
        inner.add(cone(bc,0,1.1,0,0.9,2.2)); inner.add(box(hc,0,2.3,0,0.5,0.55,0.45));
        inner.add(glow(ac,0.15,2.35,0.24,0.08), glow(ac,-0.15,2.35,0.24,0.08));
        inner.add(box(0x556,0.85,1.3,0.2,0.12,1.3,0.35), box(0x556,-0.85,1.3,0.2,0.12,1.3,0.35));
        inner.add(glow(ac,0,1.2,0.45,0.2));
        break;
      case 'dragon':
        inner.add(box(bc,0,1.7,0,1.2,1.1,2.4)); inner.add(box(hc,0,2.3,1.5,0.55,0.5,1.0));
        inner.add(cone(hc,0,2.35,2.25,0.2,0.6)); inner.add(glow(0xffdd44,0.18,2.45,1.9,0.07), glow(0xffdd44,-0.18,2.45,1.9,0.07));
        for(const s of[-1,1]){ const w=box(ac,s*1.9,2.5,-0.4,2.6,0.1,1.6); w.rotation.z=s*0.4; w.rotation.y=s*0.3; inner.add(w); }
        inner.add(box(bc,0,1.7,-1.7,0.3,0.3,1.4));
        for(let i=0;i<4;i++) inner.add(cone(ac,0,2.35+i*-0.02,-0.6+i*0.5,0.12,0.4));
        for(const s of[-1,1]){ inner.add(box(hc,s*0.5,0.5,0.6,0.3,1.0,0.3)); inner.add(box(hc,s*0.5,0.5,-0.6,0.3,1.0,0.3)); }
        break;
      default:
        inner.add(box(bc,0,0.8,0,0.6,1.6,0.6));
    }
    g.scale.setScalar(scale);
    g.userData.inner = inner;
    return g;
  }
};

/* ---------------- HP bar sprite ---------------- */
function makeHPBar(width){
  const g=new THREE.Group();
  const bg=new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({color:0x120f0a, depthTest:false}));
  bg.scale.set(width,0.16,1);
  const fg=new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({color:0xd03030, depthTest:false}));
  fg.scale.set(width,0.13,1); fg.position.z=0.01;
  g.add(bg,fg);
  g.userData={bg,fg,width};
  g.renderOrder=999;
  return g;
}
function setHPBar(bar, pct){
  const {fg,width}=bar.userData;
  pct=Math.max(0,Math.min(1,pct));
  fg.scale.x=width*pct;
  fg.position.x=-width*(1-pct)/2;
  fg.material.color.setHex(pct>0.5?0x30b030:(pct>0.25?0xd0a020:0xd03030));
}

/* ---------------- FX (particles + projectiles) ---------------- */
const FX = {
  particles:[], projectiles:[],
  scene:null,
  pGeo:null, pMats:{}, vfxTex:{},
  init(scene){
    this.scene=scene;
    this.pGeo=new THREE.PlaneGeometry(0.3,0.3);
    // Load hand-painted VFX sprites if present in assets/fx/
    const loader=new THREE.TextureLoader();
    const vfxMap={hit:'hit_spark',crit:'crit_star',heal:'heal_burst',poison:'poison_bubbles',fire:'fire_explosion',ice:'ice_frost'};
    for(const k in vfxMap){
      const tex=loader.load('assets/fx/'+vfxMap[k]+'.png', (t)=>{ t.minFilter=THREE.LinearFilter; t.magFilter=THREE.LinearFilter; });
      tex.minFilter=THREE.LinearFilter; tex.magFilter=THREE.LinearFilter;
      this.vfxTex[k]=tex;
    }
  },
  _pmat(color){
    if(!this.pMats[color]) this.pMats[color]=new THREE.MeshBasicMaterial({color, transparent:true, depthWrite:false});
    return this.pMats[color];
  },
  _vfxMat(kind){
    const tex=this.vfxTex[kind];
    if(!tex) return null;
    const key='vfx_'+kind;
    if(!this.pMats[key]){
      this.pMats[key]=new THREE.MeshBasicMaterial({map:tex, transparent:true, depthWrite:false});
    }
    return this.pMats[key];
  },
  burst(x,y,z,color,n,spread,up,life){
    if(this.particles.length>160) return;
    for(let i=0;i<n;i++){
      let m;
      if(this.particles.length<220){ m=new THREE.Mesh(this.pGeo, this._pmat(color)); this.scene.add(m); }
      else { const old=this.particles.shift(); m=old.m; }
      m.visible=true; m.position.set(x,y,z);
      m.scale.setScalar(0.6+Math.random()*0.8);
      this.particles.push({m, vx:(Math.random()-0.5)*spread, vy:Math.random()*up+1, vz:(Math.random()-0.5)*spread, life:(life||0.7)*(0.6+Math.random()*0.8), max:life||0.7});
    }
  },
  _burstVFX(x,y,z,kind,n,spread,up,life,scale){
    const mat=this._vfxMat(kind);
    if(!mat) return false;
    if(this.particles.length>160) return true;
    for(let i=0;i<n;i++){
      let m;
      if(this.particles.length<220){ m=new THREE.Mesh(this.pGeo, mat); this.scene.add(m); }
      else { const old=this.particles.shift(); m=old.m; m.material=mat; }
      m.visible=true; m.position.set(x,y,z);
      m.scale.setScalar((scale||0.7)+Math.random()*0.6);
      this.particles.push({m, vx:(Math.random()-0.5)*spread, vy:Math.random()*up+1, vz:(Math.random()-0.5)*spread, life:(life||0.7)*(0.6+Math.random()*0.8), max:life||0.7});
    }
    return true;
  },
  hitFX(x,y,z,color){ if(this._burstVFX(x,y,z,'hit',8,5,4,0.45,0.7)) return; this.burst(x,y,z,color||0xffdd88,8,5,4,0.45); },
  critFX(x,y,z){ if(this._burstVFX(x,y,z,'crit',14,6,5,0.6,0.9)) return; this.burst(x,y,z,0xffd75e,14,6,5,0.6); },
  deathFX(x,y,z,color){ this.burst(x,y,z,color||0x888888,16,4,3,0.8); this.burst(x,y,z,0xffffff,6,3,4,0.5); },
  levelFX(x,y,z){ if(this._burstVFX(x,y,z,'crit',30,3,6,1.2,1.0)) { this.burst(x,y+1,z,0xffffff,12,2,5,1); return; } this.burst(x,y,z,0xffd75e,30,3,6,1.2); this.burst(x,y+1,z,0xffffff,12,2,5,1); },
  magicFX(x,y,z,color){ if(color===0x7fd63a || color===0x7fd6ff){ if(this._burstVFX(x,y,z,'poison',6,3,4,0.6,0.8)) return; } this.burst(x,y,z,color,10,4,4,0.5); },
  update(dt, camera){
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];
      p.life-=dt;
      if(p.life<=0){ p.m.visible=false; this.scene.remove(p.m); this.particles.splice(i,1); continue; }
      p.vy-=9*dt;
      p.m.position.x+=p.vx*dt; p.m.position.y+=p.vy*dt; p.m.position.z+=p.vz*dt;
      if(p.m.position.y<0.05){ p.m.position.y=0.05; p.vy*=-0.4; }
      p.m.material.opacity=Math.min(1,p.life/p.max*2);
      p.m.quaternion.copy(camera.quaternion);
    }
    Proj.update(dt);
  },
};

const Proj = {
  list:[], pool:[],
  get(color, size){
    let m=this.pool.find(p=>!p.m.visible);
    if(!m){ m={m:new THREE.Mesh(new THREE.SphereGeometry(0.18,6,5), emissiveMat(color))}; FX.scene.add(m.m); this.pool.push(m); }
    m.m.material=emissiveMat(color);
    m.m.visible=true; m.m.scale.setScalar(size);
    m.color=color;
    return m;
  },
  spawn(from, to, opts){
    const p=this.get(opts.color||0xffaa30, opts.size||1);
    p.pos=new THREE.Vector3(from.x, from.y||1.2, from.z);
    p.target=to;
    p.speed=opts.speed||14;
    p.dmg=opts.dmg||0; p.kind=opts.kind||'phys';
    p.crit=opts.crit; p.srcCreature=opts.srcCreature;
    p.poison=opts.poison; p.slow=opts.slow; p.aoe=opts.aoe;
    p.friendly=!!opts.friendly; p.impactY=opts.impactY;
    p.dir=new THREE.Vector3(to.x-p.pos.x, ((to.y||1)-p.pos.y), to.z-p.pos.z).normalize();
    this.list.push(p);
  },
  update(dt){
    const G=window.G;
    for(let i=this.list.length-1;i>=0;i--){
      const p=this.list[i];
      const tgt=p.target;
      if(tgt && tgt.alive!==false && tgt.mesh){ p.dir.set(tgt.mesh.position.x-p.pos.x, (tgt.mesh.position.y+1)-p.pos.y, tgt.mesh.position.z-p.pos.z).normalize(); }
      p.pos.addScaledVector(p.dir, p.speed*dt);
      p.m.position.copy(p.pos);
      let hit=false;
      if(p.friendly){
        for(const c of G.creatures){
          if(!c.alive) continue;
          if(p.pos.distanceTo(c.mesh.position.clone().setY(1)) < 1.1 + c.def.scale*0.3){
            Combat.projectileHit(c, p); hit=true; break;
          }
        }
      } else {
        if(G.player.alive && p.pos.distanceTo(G.player.mesh.position.clone().setY(1)) < 1.0){
          G.player.takeDamage(p.dmg, p.srcCreature, p); hit=true;
        }
      }
      if(hit || (tgt && tgt.x!==undefined && p.pos.distanceTo(new THREE.Vector3(tgt.x, p.pos.y, tgt.z))<1.2 && p.impactY!==undefined) || p.pos.y<0.05 || p.pos.length()>400){
        FX.burst(p.pos.x,p.pos.y,p.pos.z, p.color, 8, 4, 3, 0.4);
        if(p.aoe){
          if(p.friendly){ Combat.aoeHit(p); }
          else if(G.player.alive && Math.hypot(G.player.mesh.position.x-p.pos.x, G.player.mesh.position.z-p.pos.z)<=p.aoe){
            G.player.takeDamage(p.dmg, p.srcCreature);
          }
        }
        p.m.visible=false; this.list.splice(i,1);
      }
    }
  },
};

/* ---------------- Creature ---------------- */
function tintModel(root, hex){
  const c=new THREE.Color(hex);
  root.traverse(o=>{ if(o.isMesh && o.material && o.material.color){ const m=o.material.clone(); m.color.multiply(c); o.material=m; } });
}
class Creature {
  constructor(defId, zoneId, tx, tz, opts){
    this.def = CREATURES[defId];
    this.defId = defId;
    this.zoneId = zoneId;
    this.spawn = { x:(tx+0.5)*TILE, z:(tz+0.5)*TILE };
    this.alive = true;
    this.spawnBlink = 0;
    this.hp = this.def.hp; this.maxHp = this.def.hp;
    this.state = 'IDLE';
    this.t = { patrol:0, atkCd:0, detect:0, respawn:0, hitFlash:0, stun:0, slow:0, slowF:1, root:0, poison:0, poisonDps:0, special:2, phase:1 };
    this.face = Math.random()*6.28;
    const key=CREATURE_MODEL[this.defId];
    const mk=key? Assets.model(key) : null;
    if(mk){
      this.anim=new AnimUnit(mk, Assets.monsterScale(key, mk, this.def.scale));
      this.mesh=this.anim.root;
      this.mesh.userData.inner=new THREE.Object3D();
      if(this.def.tint) tintModel(this.mesh, this.def.tint);
    } else {
      this.anim=null;
      this.mesh = ModelBuilder.build(this.def.model, this.def.colors, this.def.scale);
    }
    this._meshScale=this.mesh.scale.x;
    this.mesh.position.set(this.spawn.x, 0, this.spawn.z);
    // HP bar scales with the creature's real size: small critters get a small bar,
    // large/boss monsters get a bigger one. The bar is a child of the (scaled) mesh,
    // so convert the desired world width into local units by dividing by _meshScale.
    const s = this._meshScale || this.def.scale;
    const bossK = this.def.boss ? 1.9 : 1;
    const worldW = (0.75 + this.def.scale*0.55) * bossK;
    this.bar = makeHPBar(worldW / s);
    this.bar.position.y = 1.2 + this.def.scale*0.75;
    this.bar.visible=false;
    this.mesh.add(this.bar);
    this.ring = null;
    this.lastAttacker = null;
    this.home = {x:this.spawn.x, z:this.spawn.z};
    this.patrolTarget = {x:this.spawn.x, z:this.spawn.z};
    if(this.def.boss){ this.bar.position.y=1.4 + this.def.scale*0.75; }
  }
  distTo(px,pz){ const dx=this.mesh.position.x-px, dz=this.mesh.position.z-pz; return Math.sqrt(dx*dx+dz*dz); }
  effectiveSpeed(){
    let s=this.def.spd;
    if(this.t.slow>0) s*=this.t.slowF;
    if(this.t.root>0||this.t.stun>0) s=0;
    if(this.def.boss && this.t.phase===2) s*=1.2;
    return s;
  }
  moveTo(x,z,dt){
    const spd=this.effectiveSpeed();
    if(spd<=0) return false;
    let dx=x-this.mesh.position.x, dz=z-this.mesh.position.z;
    const d=Math.sqrt(dx*dx+dz*dz);
    if(d<0.05) return true;
    dx/=d; dz/=d;
    const nx=this.mesh.position.x+dx*spd*dt, nz=this.mesh.position.z+dz*spd*dt;
    const zone=World.zones[this.zoneId];
    let moved=false;
    if(!World.blockedPoint(zone, nx, this.mesh.position.z, 0.5)){ this.mesh.position.x=nx; moved=true; }
    if(!World.blockedPoint(zone, this.mesh.position.x, nz, 0.5)){ this.mesh.position.z=nz; moved=true; }
    if(moved){
      this.face=Math.atan2(dx,dz);
      this.mesh.rotation.y=this.face;
    }
    return moved;
  }
  update(dt, player){
    const t=this.t;
    // status timers
    if(t.stun>0)t.stun-=dt; if(t.slow>0)t.slow-=dt; if(t.root>0)t.root-=dt;
    if(t.poison>0){ t.poison-=dt; this.applyPoisonTick(dt); }
    if(t.atkCd>0)t.atkCd-=dt;
    if(t.hitFlash>0){ t.hitFlash-=dt; }
    if(!this.alive){
      t.respawn-=dt;
      if(t.respawn<=0) this.respawn();
      return;
    }
    if(this.spawnBlink>0){
      this.spawnBlink-=dt;
      this.mesh.visible=(Math.floor(this.spawnBlink*7)%2)===0;
      if(this.spawnBlink<=0){ this.spawnBlink=0; this.mesh.visible=true; }
    }
    if(t.respawn>0) t.respawn=0;
    // distance to player
    const P=player.mesh.position;
    const d=this.distTo(P.x,P.z);
    const engaged = this.state==='CHASE'||this.state==='ATTACK';
    // detection
    if(!engaged){
      if(d < this.def.sight && player.alive){ this.state='CHASE'; Audio.play('aggro'); }
    }
    if(this.state==='IDLE'||this.state==='PATROL'){
      t.patrol-=dt;
      if(t.patrol<=0){
        t.patrol = 2+Math.random()*4;
        const a=Math.random()*6.28, r=2+Math.random()*5;
        this.patrolTarget={ x:clamp(this.home.x+Math.cos(a)*r, 2, World.zones[this.zoneId].w*TILE-2), z:clamp(this.home.z+Math.sin(a)*r, 2, World.zones[this.zoneId].h*TILE-2) };
        this.state='PATROL';
      }
      if(this.state==='PATROL'){
        const arrived=this.moveTo(this.patrolTarget.x, this.patrolTarget.z, dt);
        if(arrived || d>this.def.sight+8){ this.state='IDLE'; }
        if(Math.abs(this.mesh.position.x-this.home.x)>18 || Math.abs(this.mesh.position.z-this.home.z)>18){ this.goHome(); }
      }
    }
    else if(this.state==='CHASE'){
      const inRange = d <= this.def.atkRange;
      if(inRange){ this.state='ATTACK'; }
      else if(d > this.def.sight*1.8 || !player.alive){ this.goHome(); }
      else this.moveTo(P.x,P.z,dt);
    }
    else if(this.state==='ATTACK'){
      const inRange = d <= this.def.atkRange+0.4 && t.stun<=0;
      if(!inRange){ this.state='CHASE'; }
      else {
        const ang=Math.atan2(P.x-this.mesh.position.x, P.z-this.mesh.position.z);
        this.face=ang; this.mesh.rotation.y=ang;
        if(t.atkCd<=0){ this.attack(player); t.atkCd=this.def.atkCd*(t.phase===2?0.75:1); }
        if(this.def.boss) this.bossAI(dt, player, d);
      }
    }
    else if(this.state==='RETURN'){
      const arrived=this.moveTo(this.home.x, this.home.z, dt);
      if(arrived){ this.state='IDLE'; this.hp=Math.min(this.maxHp,this.hp+this.maxHp*0.5); }
    }
    // regen (trolls)
    if(this.def.regen && this.hp<this.maxHp && this.state==='IDLE') this.hp=Math.min(this.maxHp,this.hp+this.def.regen*dt);
    // animation
    const inner=this.mesh.userData.inner;
    const moving=this.state==='CHASE'||this.state==='PATROL'||this.state==='RETURN';
    if(this.anim && Object.keys(this.anim.actions).length){
      this.anim.update(dt);
      this.anim.setState(this.state==='PATROL'?'walk':(moving?'run':'idle'));
    } else if(inner.userData.segments){
      // procedural slither: traveling lateral wave along the body
      const ph=performance.now()*0.006;
      for(let i=0;i<inner.userData.segments.length;i++){
        const s=inner.userData.segments[i], u=s.userData;
        s.position.x = u.x0 + Math.sin(ph+i*0.75)*0.035;
        s.position.y = u.y0 + Math.abs(Math.sin(ph*0.9+i*0.75))*0.015;
        s.rotation.y = Math.sin(ph+i*0.75)*0.3;
      }
      inner.rotation.x=0; inner.rotation.z=0; inner.position.y=0;
    } else {
      inner.position.y = moving ? Math.abs(Math.sin(performance.now()*0.012))*0.12 : Math.sin(performance.now()*0.003)*0.03;
      inner.rotation.x = moving ? 0.12 : 0;
      if(t.hitFlash>0){ inner.rotation.z=Math.sin(performance.now()*0.05)*0.08; } else inner.rotation.z=0;
    }
    // hp bar is rendered via the DOM name-label (ui.updateLabels) for consistent size;
    // keep the legacy 3D sprite hidden.
    this.bar.visible=false;
    // boss phase
    if(this.def.boss && this.t.phase===1 && this.hp<this.maxHp*0.5){ this.t.phase=2; UI.toast(this.def.name+' enters a furious rage!', 'bad'); FX.burst(this.mesh.position.x,1.5,this.mesh.position.z,0xff5020,24,6,6,1); }
  }
  applyPoisonTick(dt){
    const dmg=5*dt*(this.t.poisonDps/5);
    this.hp-=dmg;
    if(Math.random()<dt*3) FX.burst(this.mesh.position.x,1,this.mesh.position.z,0x7fd63a,2,2,2,0.4);
    if(this.hp<=0) this.die(null);
  }
  rebuildVisual(){
    const parent=this.mesh.parent;
    const px=this.mesh.position.x, pz=this.mesh.position.z;
    if(parent) parent.remove(this.mesh);
    if(this.bar && this.bar.parent) this.bar.parent.remove(this.bar);
    this.anim=null;
    const key=CREATURE_MODEL[this.defId];
    const mk=key? Assets.model(key) : null;
    if(mk){
      this.anim=new AnimUnit(mk, Assets.monsterScale(key, mk, this.def.scale));
      this.mesh=this.anim.root;
      this.mesh.userData.inner=new THREE.Object3D();
      if(this.def.tint) tintModel(this.mesh, this.def.tint);
    } else {
      this.mesh=ModelBuilder.build(this.def.model, this.def.colors, this.def.scale);
    }
    this._meshScale=this.mesh.scale.x;
    this.mesh.position.set(px,0,pz);
    this.mesh.add(this.bar);
    if(parent) parent.add(this.mesh);
    if(this.anim) this.anim.setState('idle');
  }
  goHome(){ this.state='RETURN'; }
  attack(player){
    const inner=this.mesh.userData.inner;
    inner.rotation.x=-0.3;
    if(this.anim) this.anim.trigger(this.def.ranged?'shoot':'attack');
    if(this.def.ranged){
      Proj.spawn({x:this.mesh.position.x,z:this.mesh.position.z,y:1.5}, {x:player.mesh.position.x,z:player.mesh.position.z,y:1}, {color:this.def.ranged.color, speed:this.def.ranged.speed, dmg:this.rollDmg(), friendly:false, srcCreature:this});
    } else {
      player.takeDamage(this.rollDmg(), this);
      this.lunge();
    }
    Audio.play('enemyAtk');
  }
  lunge(){ const i=this.mesh.userData.inner; i.position.z+=0.25; }
  rollDmg(){
    const lvl=this.def.lvl;
    let d=this.def.atk*(0.85+Math.random()*0.3);
    if(this.t.phase===2) d*=1.2;
    return d;
  }
  bossAI(dt, player, d){
    const t=this.t;
    t.special-=dt;
    if(t.special>0) return;
    t.special = 6+Math.random()*4;
    const id=this.defId;
    if(id==='goblin_chieftain'){
      if(d<5){ FX.hitFX(this.mesh.position.x,1,this.mesh.position.z,0xffaa30); for(const c of G.creatures){ if(c.alive&&c.distTo(player.mesh.position.x,player.mesh.position.z)<6&&c!==this) {} } Combat.bossWhirl(this, player); }
      else { this.smashJump(player); }
      if(this.summons===undefined && this.hp<this.maxHp*0.5){ this.summons=1; Game.spawnExtras(this.zoneId, 'goblin_scout', 2, this.mesh.position.x, this.mesh.position.z); UI.toast('The Chieftain calls his guards!', 'bad'); }
    } else if(id==='crypt_guardian'){
      const n=t.phase===2?6:4;
      for(let i=0;i<n;i++){
        setTimeout(()=>{ if(this.alive) Proj.spawn({x:this.mesh.position.x,z:this.mesh.position.z,y:2.5},{x:player.mesh.position.x+(Math.random()-0.5)*3,z:player.mesh.position.z+(Math.random()-0.5)*3,y:1},{color:0x7fd6ff,speed:13,dmg:this.def.atk*0.5,friendly:false,srcCreature:this}); }, i*220);
      }
      UI.toast('Shadow bolts rain down!', 'bad');
      if(this.summons===undefined && this.hp<this.maxHp*0.5){ this.summons=1; Game.spawnExtras(this.zoneId,'skeleton_warrior',2,this.mesh.position.x,this.mesh.position.z); }
    } else if(id==='ancient_dragon'){
      if(d<9){ Combat.dragonBreath(this, player); UI.toast('The dragon breathes fire!', 'bad'); }
      else { Combat.dragonMeteors(this, player); UI.toast('Embers fall from the sky!', 'bad'); }
    }
  }
  smashJump(player){
    const from={x:this.mesh.position.x,z:this.mesh.position.z};
    const to={x:player.mesh.position.x,z:player.mesh.position.z};
    this.jumpAnim(from,to,()=>{ Combat.bossImpact(this, to, 5); });
  }
  jumpAnim(from,to,cb){
    const self=this; const dur=0.7; let e=0;
    const step=(dt)=>{ e+=dt; const k=Math.min(1,e/dur); self.mesh.position.x=from.x+(to.x-from.x)*k; self.mesh.position.z=from.z+(to.z-from.z)*k; self.mesh.position.y=Math.sin(k*Math.PI)*2.2; if(k>=1){ self.mesh.position.y=0; G.tickers.delete(step); cb&&cb(); } };
    G.tickers.add(step);
  }
  takeDamage(amount, opts){
    if(!this.alive) return;
    opts=opts||{};
    this.hp-=amount;
    this.t.hitFlash=0.25;
    if(this.state==='IDLE'||this.state==='PATROL') this.state='CHASE';
    if(this.distTo(G.player.mesh.position.x,G.player.mesh.position.z)>this.def.sight*2) this.home={x:this.mesh.position.x,z:this.mesh.position.z};
    UI.floatText(this.mesh.position.x, 1.6*this.def.scale+1, this.mesh.position.z, (opts.crit?'CRIT ':'')+Math.round(amount), opts.crit?'crit':'', opts.color);
    if(opts.crit) FX.critFX(this.mesh.position.x,1.4,this.mesh.position.z); else FX.hitFX(this.mesh.position.x,1.2,this.mesh.position.z, opts.color||0xffdd88);
    if(this.hp<=0) this.die(opts.src||G.player);
  }
  applyStatus(st){
    if(st.stun) this.t.stun=Math.max(this.t.stun,st.stun);
    if(st.slow){ this.t.slow=Math.max(this.t.slow,st.slow.dur); this.t.slowF=st.slow.f; }
    if(st.root) this.t.root=Math.max(this.t.root,st.root);
    if(st.poison){ this.t.poison=Math.max(this.t.poison,st.poison.dur); this.t.poisonDps=Math.max(this.t.poisonDps,st.poison.dps); }
  }
  die(killer){
    if(!this.alive) return;
    this.alive=false;
    this.state='DEAD';
    this.t.respawn=this.def.boss?999999:18+Math.random()*8;
    this.spawnBlink=0;
    this.mesh.visible=true;
    const canDeath = this.anim && this.anim.actions && this.anim.actions.death;
    if(canDeath){ this.anim.trigger('death', true); }
    else { this.mesh.scale.set(this._meshScale, this._meshScale*0.25, this._meshScale); }
    this.mesh.position.y=0;
    FX.deathFX(this.mesh.position.x,1,this.mesh.position.z,this.def.colors[0]);
    Audio.play('death');
    if(this.ring){ G.scene.remove(this.ring); this.ring=null; }
    if(G.target===this) Game.clearTarget();
    if(this.def.boss) UI.hideBossBar();
    this.bar.visible=false;
    Quests.onKill(this.defId, this);
    Loot.dropFrom(this);
    if(killer===G.player || (killer&&killer.mesh===G.player.mesh)){
      G.player.gainXp(this.def.xp);
    } else {
      // killed by poison/etc after handoff — still credit player
      G.player.gainXp(this.def.xp);
    }
    Tutorial.note('kill');
  }
  respawn(){
    this.alive=true; this.hp=this.maxHp;
    this.state='IDLE';
    this.mesh.position.set(this.spawn.x,0,this.spawn.z);
    this.mesh.scale.setScalar(this._meshScale);
    if(this.anim) this.anim.setState('idle');
    this.mesh.visible=true;
    this.spawnBlink=1.2;
    this.t.phase=1; this.summons=undefined;
    this.t.stun=this.t.slow=this.t.root=this.t.poison=0;
  }
}

/* ---------------- NPC ---------------- */
class NPC {
  constructor(id){
    this.id=id; this.def=NPCS[id];
    this.bob=Math.random()*6;
    this.anim=null;
    this.buildVisual();
    const zone=World.ensure(this.def.zone);
    if(zone) zone.group.add(this.mesh);
    this.ensureFreeTile();
  }
  ensureFreeTile(){
    const zone=World.zones[this.def.zone]; if(!zone) return;
    let tx=this.def.x, tz=this.def.z;
    if(!zone.solidAt(tx,tz)) return;
    outer: for(let rr=1;rr<=4;rr++){
      for(let dz=-rr;dz<=rr;dz++) for(let dx=-rr;dx<=rr;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dz))!==rr) continue;
        if(!zone.solidAt(tx+dx,tz+dz)){ tx+=dx; tz+=dz; break outer; }
      }
    }
    this.mesh.position.set((tx+0.5)*TILE,0,(tz+0.5)*TILE);
  }
  buildVisual(){
    const mk=Assets.model(NPC_MODEL[this.id]);
    this.anim=new AnimUnit(mk,1.15);
    this.mesh=this.anim.root;
    const lo=NPC_LOADOUT[NPC_MODEL[this.id]];
    if(lo) applyLoadout(this.mesh, lo[0], lo[1]);
    this.anim.setState('idle');
    this.mesh.position.set((this.def.x+0.5)*TILE,0,(this.def.z+0.5)*TILE);
    this.mesh.rotation.y = (this.def.face==='fountain') ? Math.atan2(56 - this.mesh.position.x, 56 - this.mesh.position.z) : Math.PI;
    this.mark = new THREE.Mesh(GEO.cone4, emissiveMat(0xffd75e));
    this.mark.scale.setScalar(0.5); this.mark.position.y=2.9;
    this.mesh.add(this.mark);
  }
  rebuildVisual(){
    const parent=this.mesh.parent;
    if(parent) parent.remove(this.mesh);
    this.anim=null;
    this.buildVisual();
    if(parent) parent.add(this.mesh);
    this.ensureFreeTile();
  }
  update(dt){
    if(this.anim) this.anim.update(dt);
    this.bob+=dt;
    this.mark.position.y=3.1+Math.sin(this.bob*2)*0.15;
    this.mark.rotation.y+=dt;
    const q=Quests.npcState(this.id);
    this.mark.material=emissiveMat(q==='available'?0xffd75e:(q==='complete'?0x7fd67f:0x4488ff));
  }
  refreshZone(){
    const zone=World.zones[this.def.zone];
    if(zone && this.mesh.parent!==zone.group) zone.group.add(this.mesh);
  }
}

/* ---------------- Player ---------------- */
class Player {
  constructor(name){
    this.name=name||'Hero';
    this.cls='adventurer';
    this.level=1; this.xp=0;
    this.attrs={str:5,dex:5,int:5,vit:5};
    this.points=0;
    this.base={hp:120,mp:40};
    this.gold=30;
    this.inv=new Array(INV_SLOTS).fill(null); // {id,qty}
    this.equip={helmet:null,armor:null,legs:null,boots:null,weapon:null,shield:null,ring:null,amulet:null};
    this.depot=new Array(40).fill(null);
    this.buffs=[]; // {id,name,icon,t,atk,def,regen}
    this.status={poison:0,poisonDps:0,hunger:100};
    this.alive=true;
    this.stamina=100; this.maxStamina=100; this.sprint=false; this.exhausted=false;
    this.t={atkCd:0, hitFlash:0, regenAcc:0, combatCd:0};
    this.mesh=null;
    this.anim=null;
    this.face=0;
    this.pos=new THREE.Vector3();
    this.derived={};
    this.recalc();
    this.hp=this.derived.maxHp; this.mp=this.derived.maxMp;
  }
  rebuildMesh(){
    if(this.mesh && this.mesh.parent) this.mesh.parent.remove(this.mesh);
    this.anim=null;
    this.anim=new AnimUnit(Assets.model(CLASS_MODEL[this.cls]), 1.2);
    this.mesh=this.anim.root;
    this.mesh.userData.inner=new THREE.Object3D();
    G.scene.add(this.mesh);
    this.mesh.position.copy(this.pos);
    this.anim.setState('idle');
    this.rebuildGear();
  }
  rebuildGear(){
    if(this.anim){
      const w=this.equip.weapon?ITEMS[this.equip.weapon]:null;
      applyLoadout(this.mesh, w?w.wkind:null, !!this.equip.shield);
      return;
    }
    const inner=this.mesh.userData.inner;
    if(this.gearMeshes){ for(const m of this.gearMeshes) inner.remove(m); }
    this.gearMeshes=[];
    const w=this.equip.weapon;
    if(w){
      const it=ITEMS[w];
      let gm;
      if(it.wkind==='sword'||it.wkind==='axe') gm=box(it.wkind==='axe'?0x8a8a92:0xc8ccd8, 0.45,1.1,0.15, 0.1,1.1,0.12);
      else if(it.wkind==='bow') gm=box(0x6a4a28, 0.45,1.1,0.2, 0.08,1.0,0.25);
      else gm=box(0x5a4128, 0.45,1.1,0.2, 0.07,1.5,0.07);
      inner.add(gm); this.gearMeshes.push(gm);
      if(it.wkind==='staff'){ const g2=glow(0x6fd6ff,0.45,1.9,0.2,0.12); inner.add(g2); this.gearMeshes.push(g2); }
    }
    if(this.equip.shield){ const sh=box(0x7a6a52, -0.45,1.05,0.2, 0.35,0.5,0.08); inner.add(sh); this.gearMeshes.push(sh); }
    if(this.equip.helmet){ const h=box(0x9aa0ac, 0,1.78,0, 0.42,0.2,0.38); inner.add(h); this.gearMeshes.push(h); }
  }
  recalc(){
    const cls=CLASSES[this.cls];
    let eq={def:0,hp:0,mp:0,str:0,dex:0,int:0,vit:0,crit:0,spd:0};
    for(const s in this.equip){ const id=this.equip[s]; if(id){ const it=ITEMS[id]; const st=it.stats||{}; for(const k in st) eq[k]=(eq[k]||0)+st[k]; } }
    this.eqBonus=eq;
    const str=this.attrs.str+eq.str, dex=this.attrs.dex+eq.dex, int=this.attrs.int+eq.int, vit=this.attrs.vit+eq.vit;
    const maxHp=Math.round(120 + (cls.start?cls.start.hp:0) + this.level*12 + vit*8 + (eq.hp||0) + (cls.growth? (cls.growth.hp-12)*(this.level-1):0));
    const maxMp=Math.round(40 + (cls.start?cls.start.mp:0) + this.level*4 + int*6 + (eq.mp||0) + (cls.growth?(cls.growth.mp-5)*(this.level-1):0));
    const w=this.equip.weapon?ITEMS[this.equip.weapon]:null;
    const dmgMin=w?w.dmg[0]:2, dmgMax=w?w.dmg[1]:4;
    const isRanged=w&&(w.wkind==='bow'); const isMagic=w&&(w.wkind==='staff');
    const atkStat=isRanged?dex:(isMagic?int:str);
    const atkBonus=isMagic?0.9:0.6;
    const buffAtk=this.buffVal('atk'), buffDef=this.buffVal('def');
    const maxAtk=Math.round(((dmgMin+dmgMax)/2 + atkStat*atkBonus + this.level*1.5)*(1+buffAtk));
    const maxDef=Math.round((eq.def + vit*0.5 + this.level*0.8)*(1+buffDef));
    const crit=Math.min(45, 5 + dex*0.28 + (eq.crit||0));
    const dodge=Math.min(25, dex*0.2);
    const spd=5 + (eq.spd||0)*0.15;
    this.derived={maxHp, maxMp, dmgMin, dmgMax, atkStat, atkBonus, isRanged, isMagic, maxAtk, maxDef, crit, dodge, spd, wkind:w?w.wkind:null, range:w&&w.range?w.range:2.8, mcost:isMagic?(w.mcost||1):0};
    this.hp=Math.min(this.hp, maxHp); this.mp=Math.min(this.mp, maxMp);
  }
  buffVal(k){ let v=0; for(const b of this.buffs) if(b[k]) v+=b[k]; return v; }
  markCombat(){ this.t.combatCd=10; }
  hungerLevel(){ if(this.status.hunger<=0) return 3; if(this.status.hunger<=HUNGER_THRESH) return 2; return 1; }
  hasBuff(id){ return this.buffs.find(b=>b.id===id); }
  addBuff(b){ const old=this.hasBuff(b.id); if(old){ old.t=b.dur; Object.assign(old,b); } else { b.t=b.dur; this.buffs.push(b); } this.recalc(); Audio.play('buff'); UI.refreshBuffs(); }
  updateBuffs(dt){
    let changed=false;
    for(let i=this.buffs.length-1;i>=0;i--){ this.buffs[i].t-=dt; if(this.buffs[i].t<=0){ this.buffs.splice(i,1); changed=true; } }
    if(changed){ this.recalc(); UI.refreshBuffs(); }
    // regen buff
    for(const b of this.buffs) if(b.regen && this.hp>0){ this.hp=Math.min(this.derived.maxHp, this.hp+b.regen*dt); }
    // poison
    if(this.status.poison>0){
      this.status.poison-=dt;
      this.hp-=this.status.poisonDps*dt;
      if(Math.random()<dt*2) FX.burst(this.mesh.position.x,1,this.mesh.position.z,0x7fd63a,1,1,1,0.3);
      if(this.hp<=0) this.die(null);
    }
    // hunger: depletes while alive; starving drains hp to a 20 floor
    if(this.alive){
      this.status.hunger=Math.max(0,this.status.hunger-FOOD_DEPLETE*dt);
      if(this.status.hunger<=0 && this.hp>20) this.hp=Math.max(20,this.hp-1*dt);
    }
    // slow mana regen
    if(this.t.combatCd>0) this.t.combatCd-=dt;
    this.t.regenAcc+=dt;
    if(this.t.regenAcc>=1){
      this.t.regenAcc=0;
      if(this.mp<this.derived.maxMp) this.mp=Math.min(this.derived.maxMp,this.mp+2+this.attrs.int*0.3);
      // slow base HP regen, scales with vitality, only out of combat and not hungry/starving
      if(this.t.combatCd<=0 && this.hp>0 && this.hp<this.derived.maxHp && this.hungerLevel()===1) this.hp=Math.min(this.derived.maxHp,this.hp+0.1+this.attrs.vit*0.1);
      if(this.buffs.length||this.status.poison>0||this.hungerLevel()>=2) UI.refreshBuffs();
    }
  }
  move(dx,dz,dt){
    if(!this.alive) return;
    const zone=World.current;
    let spd=this.derived.spd;
    if(this.sprint && this.stamina>0) spd*=1.7;
    const nx=this.mesh.position.x+dx*spd*dt, nz=this.mesh.position.z+dz*spd*dt;
    if(dx||dz){
      this.face=Math.atan2(dx,dz);
      let cur=this.mesh.rotation.y;
      const diff=((this.face-cur+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;
      this.mesh.rotation.y=cur+diff*Math.min(1,dt*12);
    }
    if(!World.blockedPoint(zone,nx,this.mesh.position.z,0.45)) this.mesh.position.x=nx;
    if(!World.blockedPoint(zone,this.mesh.position.x,nz,0.45)) this.mesh.position.z=nz;
    const inner=this.mesh.userData.inner;
    if(dx||dz){ const b=Math.abs(Math.sin(performance.now()*0.014)); inner.position.y=(this.sprint?0.16:0.1)*b; }
    else inner.position.y=0;
    this.pos.copy(this.mesh.position);
  }
  gainXp(n){
    if(!this.alive) return;
    this.xp+=n;
    UI.floatText(this.mesh.position.x,2.6,this.mesh.position.z,'+'+n+' XP','xp');
    let leveled=false;
    while(this.level<LEVEL_CAP && this.xp>=xpNeeded(this.level)){
      this.xp-=xpNeeded(this.level);
      this.level++; leveled=true;
      const g=CLASSES[this.cls].growth;
      this.points+=g.pts;
      this.attrs.str+=g.str; this.attrs.dex+=g.dex; this.attrs.int+=g.int; this.attrs.vit+=g.vit;
      this.recalc();
      this.hp=this.derived.maxHp; this.mp=this.derived.maxMp;
    }
    if(leveled){
      Audio.play('levelup');
      FX.levelFX(this.mesh.position.x,1,this.mesh.position.z);
      const g=CLASSES[this.cls].growth;
      UI.levelUpBanner(this.level, '+'+(12+(g.hp-12))+' HP, +'+(4+(g.mp-4))+' MP, +'+g.pts+' attribute points');
      Quests.checkLevelGates();
    }
    UI.refreshHUD();
  }
  takeDamage(amount, src, proj){
    if(!this.alive) return;
    if(Math.random()*100 < this.derived.dodge){ UI.floatText(this.mesh.position.x,2,this.mesh.position.z,'MISS',''); return; }
    const def=this.derived.maxDef;
    const dmg=Math.max(1, amount*100/(100+def*4));
    this.hp-=dmg;
    this.markCombat();
    UI.floatText(this.mesh.position.x,2.2,this.mesh.position.z,'-'+Math.round(dmg),'take');
    FX.hitFX(this.mesh.position.x,1.2,this.mesh.position.z,0xff6040);
    Audio.play('hurt');
    if(this.anim) this.anim.trigger('hit');
    this.t.hitFlash=0.3;
    if(src && src.def && src.def.poison && Math.random()<src.def.poison){ this.status.poison=4; this.status.poisonDps=3; UI.toast('You are poisoned!', 'bad'); }
    if(proj && proj.poison){ this.status.poison=proj.poison.dur; this.status.poisonDps=proj.poison.dps; }
    UI.flashScreen();
    if(this.hp<=0) this.die(src);
    UI.refreshHUD();
  }
  heal(n, silent){
    this.hp=Math.min(this.derived.maxHp, this.hp+n);
    if(!silent) UI.floatText(this.mesh.position.x,2.2,this.mesh.position.z,'+'+Math.round(n),'heal');
    UI.refreshHUD();
  }
  spendMana(n){ if(this.mp<n) return false; this.mp-=n; UI.refreshHUD(); return true; }
  die(src){
    if(!this.alive) return;
    this.alive=false;
    this.hp=0;
    Audio.play('death');
    FX.deathFX(this.mesh.position.x,1,this.mesh.position.z,0xffffff);
    if(this.anim) this.anim.trigger('death', true);
    UI.showDeath();
  }
  respawn(){
    this.alive=true;
    this.hp=Math.round(this.derived.maxHp*0.5);
    this.mp=this.derived.maxMp;
    const lost=Math.round(this.gold*0.05);
    this.gold-=lost;
    this.status.poison=0;
    this.buffs=[];
    if(this.anim){ this.anim.cancel(); this.anim.setState('idle'); }
    Game.enterZone('asterfall', 28, 28, true);
    UI.hideDeath();
    UI.toast('You lost '+lost+' gold to the temple healers.', 'bad');
    UI.refreshHUD();
  }
  // ---- inventory ----
  addItem(id, qty){
    qty=qty||1;
    const it=ITEMS[id];
    const stackable=!!it.stack;
    if(stackable){
      for(let i=0;i<this.inv.length;i++){ const s=this.inv[i]; if(s&&s.id===id&&s.qty<MAX_STACK){ const add=Math.min(qty,MAX_STACK-s.qty); s.qty+=add; qty-=add; if(qty<=0){UI.refreshInventory();return true;} } }
    }
    for(let i=0;i<this.inv.length;i++){
      if(!this.inv[i]){ this.inv[i]={id, qty:Math.min(qty, stackable?MAX_STACK:1)}; qty-=this.inv[i].qty; if(qty<=0){UI.refreshInventory();return true;} }
    }
    UI.toast('Backpack full!', 'bad');
    return false;
  }
  countItem(id){ let n=0; for(const s of this.inv) if(s&&s.id===id) n+=s.qty; return n; }
  removeItem(id, qty){
    qty=qty||1;
    for(let i=0;i<this.inv.length&&qty>0;i++){
      const s=this.inv[i];
      if(s&&s.id===id){ const take=Math.min(qty,s.qty); s.qty-=take; qty-=take; if(s.qty<=0) this.inv[i]=null; }
    }
    UI.refreshInventory();
    return qty<=0;
  }
  useItem(idx){
    const slot=this.inv[idx]; if(!slot) return;
    const it=ITEMS[slot.id];
    if(it.type==='potion'||it.type==='food'){
      if(it.heal) this.heal(it.heal);
      if(it.mana){ this.mp=Math.min(this.derived.maxMp,this.mp+it.mana); UI.floatText(this.mesh.position.x,2.2,this.mesh.position.z,'+'+it.mana+' MP','mana'); }
      if(it.cure){ this.status.poison=0; UI.toast('Venom neutralized.','q'); }
      if(it.type==='food') this.status.hunger=Math.min(100,this.status.hunger+it.heal);
      this.removeItem(slot.id,1); Audio.play('drink'); UI.refreshHUD(); UI.refreshBuffs(); return;
    }
    if(['weapon','shield','armor','helmet','legs','boots','ring','amulet'].includes(it.type)){
      this.equipFromIdx(idx); return;
    }
    UI.toast('Cannot use that here.');
  }
  meetsReq(it){
    if(this.level<(it.lvl||1)) return 'Requires level '+it.lvl;
    const req=it.req||{};
    for(const k in req){ if(this.attrs[k]+(this.eqBonus[k]||0)<req[k]) return 'Requires '+k.toUpperCase(); }
    return null;
  }
  equipFromIdx(idx){
    const slot=this.inv[idx]; if(!slot) return;
    const it=ITEMS[slot.id];
    const stype = it.type==='weapon'?'weapon':it.type;
    if(!this.equip.hasOwnProperty(stype)) return;
    const bad=this.meetsReq(it);
    if(bad){ UI.toast(bad,'bad'); return; }
    const prev=this.equip[stype];
    this.equip[stype]=slot.id;
    this.inv[idx]=null;
    if(prev) this.addItem(prev,1);
    this.recalc();
    this.rebuildGear();
    Audio.play('equip');
    UI.refreshInventory(); UI.refreshHUD(); UI.refreshCharacter();
  }
  unequip(stype){
    const id=this.equip[stype]; if(!id) return;
    this.equip[stype]=null;
    this.addItem(id,1);
    this.recalc(); this.rebuildGear();
    UI.refreshInventory(); UI.refreshHUD(); UI.refreshCharacter();
  }
  moveItem(from, to){
    const s=this.inv[from]; if(!s||from===to) return false;
    const target=this.inv[to];
    if(target && !(target.id===s.id && ITEMS[s.id].stack && target.qty<MAX_STACK)) return false;
    if(target){ const add=Math.min(s.qty,MAX_STACK-target.qty); target.qty+=add; s.qty-=add; if(s.qty<=0) this.inv[from]=null; }
    else { this.inv[to]=s; this.inv[from]=null; }
    UI.refreshInventory();
    return true;
  }
  splitItem(from, to, qty){
    const s=this.inv[from]; if(!s||!ITEMS[s.id].stack||from===to||qty<1) return false;
    qty=Math.min(qty, s.qty, MAX_SPLIT);
    if(this.inv[to]) return false;
    this.inv[to]={id:s.id, qty:qty};
    s.qty-=qty;
    if(s.qty<=0) this.inv[from]=null;
    UI.refreshInventory();
    return true;
  }
  dropItem(idx, qty){
    const slot=this.inv[idx]; if(!slot) return;
    qty=qty==null?slot.qty:Math.min(qty,slot.qty);
    Loot.spawnPile(this.mesh.position.x, this.mesh.position.z, [{id:slot.id, qty:qty}], false);
    slot.qty-=qty;
    if(slot.qty<=0) this.inv[idx]=null;
    UI.refreshInventory();
  }
  serialize(){
    return { name:this.name, cls:this.cls, level:this.level, xp:this.xp, attrs:this.attrs, points:this.points,
      gold:this.gold, inv:this.inv, equip:this.equip, depot:this.depot, hp:this.hp, mp:this.mp, hunger:this.status.hunger };
  }
  static deserialize(o, p){
    p.name=o.name; p.cls=o.cls||'adventurer'; p.level=o.level||1; p.xp=o.xp||0;
    p.attrs=o.attrs||{str:5,dex:5,int:5,vit:5}; p.points=o.points||0;
    p.gold=o.gold||0;
    p.inv=(o.inv&&o.inv.length? o.inv.slice(0,INV_SLOTS) : new Array(INV_SLOTS).fill(null));
    while(p.inv.length<INV_SLOTS) p.inv.push(null);
    p.equip=o.equip||p.equip; p.depot=o.depot||new Array(40).fill(null);
    for(const s of p.inv){ if(s && !ITEMS[s.id]) s=null; }
    for(const k in p.equip){ if(p.equip[k] && !ITEMS[p.equip[k]]) p.equip[k]=null; }
    p.recalc();
    p.hp=Math.min(o.hp!=null?o.hp:p.derived.maxHp, p.derived.maxHp);
    p.mp=Math.min(o.mp!=null?o.mp:p.derived.maxMp, p.derived.maxMp);
    p.status.hunger=o.hunger!=null?o.hunger:p.status.hunger;
  }
}

/* ---------------- helpers ---------------- */
function clamp(v,a,b){ return v<a?a:(v>b?b:v); }
