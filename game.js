'use strict';
/* =========================================================
   game.js — settings, game state, input, camera, main loop,
   zone transitions, interaction, boot.
   ========================================================= */

const Settings = { volume:0.7, shadows:true, dmgNums:true, bars:true };
const BIRD_SIZE = 1.2; // target max dimension (world units) for ambient birds

let camera;
const G = {
  state:'title',
  renderer:null, scene:null, camera:null,
  sun:null, hemi:null, playerLight:null,
  player:null,
  creatures:[], npcs:[], piles:[], clouds:[], tickers:new Set(), birds:[],
  target:null, ring:null,
  zoneId:'asterfall',
  quests:{}, _ready:{},
  discovered:new Set(['asterfall']),
  openedChests:new Set(),
  killedBosses:{},
  skillCd:{}, hotbarSlots:[],
  playTime:0, lastSave:0,
  tutorial:Tutorial,
  movedOnce:false,
  zoneCreaturesBuilt:{},
  softCam:false,
  camYaw:Math.PI/4, camDist:20, camDrag:false,
};
window.G = G;

/* ---------------- INPUT ---------------- */
const Input = {
  keys:{}, moveDir:new THREE.Vector3(),
  clickMove:null, autoWalk:false,
  init(){
    window.addEventListener('keydown', e=>{
      const k=e.key.toLowerCase();
      if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault();
      if(this.keys[k]) return;
      this.keys[k]=true;
      AudioSys.resume();
      if(typeof UI!=='undefined' && UI.menuKey(e)){ delete this.keys[k]; return; }
      if(G.state!=='playing') return;
      if(k==='i'){ UI.togglePanel('panel-inventory'); }
      else if(k==='c'){ UI.togglePanel('panel-character'); }
      else if(k==='k'){ UI.togglePanel('panel-skills'); }
      else if(k==='q'){ UI.togglePanel('panel-quests'); }
      else if(k==='m'){ UI.togglePanel('panel-map'); }
      else if(k==='f'){ Game.interact(); }
      else if(k==='tab'){ e.preventDefault(); Game.tabTarget(); }
      else if(k===' '){ Game.spaceAttack(); }
      else if(k==='escape'){ this.escape(); }
      else if(k>='1'&&k<='6'){ Combat.useHotbar(+k); }
      else if(k==='r'){ G.camYaw=Math.PI/4; G.camDist=20; }
      // any manual movement cancels auto-walk
      if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){ this.clickMove=null; this.autoWalk=false; }
    });
    window.addEventListener('keyup', e=>{ this.keys[e.key.toLowerCase()]=false; });
    window.addEventListener('blur', ()=>{ this.keys={}; });
    window.addEventListener('wheel', e=>{
      if(G.state!=='playing') return;
      G.camDist=clamp(G.camDist + (e.deltaY>0?2:-2), 8, 36);
    }, {passive:true});
    window.addEventListener('contextmenu', e=>e.preventDefault());
    const cv=()=>G.renderer.domElement;
    window.addEventListener('mousedown', e=>{
      if(G.state!=='playing') return;
      if(e.button===1){ G.camDrag=true; e.preventDefault(); }
    });
    window.addEventListener('mouseup', e=>{ if(e.button===1) G.camDrag=false; });
    window.addEventListener('mousemove', e=>{
      if(G.camDrag){ G.camYaw -= e.movementX*0.006; }
      Input._mx=e.clientX; Input._my=e.clientY;
    });
    G.renderer.domElement.addEventListener('click', e=>{
      if(G.state!=='playing'||UI.modalOpen()) return;
      Game.worldClick(e.clientX, e.clientY);
    });
  },
  escape(){
    if(!$('dialogue').classList.contains('hidden')){ $('dialogue').classList.add('hidden'); return; }
    if(!$('shop').classList.contains('hidden')){ $('shop').classList.add('hidden'); return; }
    if(!$('depot').classList.contains('hidden')){ $('depot').classList.add('hidden'); return; }
    if(UI.anyPanelOpen()){ for(const n of UI.modalNames) $(n).classList.add('hidden'); return; }
    UI.togglePanel('panel-menu');
  },
  poll(){
    const v=new THREE.Vector3();
    if(this.keys['w']||this.keys['arrowup']) v.z-=1;
    if(this.keys['s']||this.keys['arrowdown']) v.z+=1;
    if(this.keys['a']||this.keys['arrowleft']) v.x-=1;
    if(this.keys['d']||this.keys['arrowright']) v.x+=1;
    if(v.lengthSq()>0){
      // camera-relative
      const yaw=G.camYaw;
      const fwd=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw));
      const right=new THREE.Vector3(Math.cos(yaw),0,-Math.sin(yaw));
      const mv=new THREE.Vector3().addScaledVector(fwd,-v.z).addScaledVector(right,v.x);
      if(mv.lengthSq()>0) mv.normalize();
      this.moveDir.copy(mv);
    } else this.moveDir.set(0,0,0);
  },
};

/* ---------------- TITLE FX (fireflies) ---------------- */
const TitleFX = {
  pts:null, base:null, seeds:[],
  init(scene){
    if(this.pts||!scene) return;
    const N=64;
    const zone=ZONES['asterfall'];
    const cx=(zone.w/2)*TILE, cz=(zone.h/2)*TILE, R=Math.min(zone.w,zone.h)*TILE*0.42;
    const pos=new Float32Array(N*3);
    this.seeds=[];
    for(let i=0;i<N;i++){
      const a=Math.random()*6.283, r=Math.sqrt(Math.random())*R;
      pos[i*3]=cx+Math.cos(a)*r;
      pos[i*3+1]=0.6+Math.random()*2.6;
      pos[i*3+2]=cz+Math.sin(a)*r;
      this.seeds.push({ph:Math.random()*6.283, sp:0.5+Math.random()*1.1, amp:0.35+Math.random()*0.7});
    }
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    const mat=new THREE.PointsMaterial({color:0xffd870, size:0.38, transparent:true, opacity:0.85, blending:THREE.AdditiveBlending, depthWrite:false, sizeAttenuation:true});
    this.pts=new THREE.Points(geo, mat);
    this.base=pos.slice();
    scene.add(this.pts);
  },
  update(now){
    if(!this.pts||!this.pts.visible) return;
    const arr=this.pts.geometry.attributes.position.array;
    for(let i=0;i<this.seeds.length;i++){
      const s=this.seeds[i];
      arr[i*3+1]=this.base[i*3+1]+Math.sin(now*s.sp+s.ph)*s.amp;
      arr[i*3]=this.base[i*3]+Math.sin(now*0.22+s.ph*1.7)*0.6;
      arr[i*3+2]=this.base[i*3+2]+Math.cos(now*0.19+s.ph)*0.6;
    }
    this.pts.geometry.attributes.position.needsUpdate=true;
  },
  hide(){ if(this.pts) this.pts.visible=false; },
};

/* ---------------- GAME ---------------- */
const Game = {
  boot(){
    initSharedResources();
    const container=$('game-container');
    G.renderer=new THREE.WebGLRenderer({antialias:true, powerPreference:'high-performance'});
    G.renderer.setSize(innerWidth, innerHeight);
    G.renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
    G.renderer.shadowMap.enabled=true;
    G.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    container.appendChild(G.renderer.domElement);
    G.scene=new THREE.Scene();
    G.scene.fog=new THREE.FogExp2(0x9db8cf, 0.0065);
    // sky + endless horizon: background matches fog, terrain disk fades into it
    G.scene.background=new THREE.Color(THEMES.town.sky);
    const horizon=new THREE.Mesh(new THREE.CircleGeometry(260,48), new THREE.MeshLambertMaterial({color:0x4d7a38}));
    horizon.rotation.x=-Math.PI/2;
    horizon.position.y=-0.14;
    horizon.receiveShadow=true;
    G.scene.add(horizon);
    camera=new THREE.PerspectiveCamera(48, innerWidth/innerHeight, 0.1, 500);
    G.camera=camera;
    G.hemi=new THREE.HemisphereLight(0xbfd4e8, 0x3a3428, 0.6);
    G.scene.add(G.hemi);
    G.sun=new THREE.DirectionalLight(0xfff2d8, 1.1);
    G.sun.castShadow=true;
    G.sun.shadow.mapSize.set(2048,2048);
    G.sun.shadow.camera.left=-28; G.sun.shadow.camera.right=28;
    G.sun.shadow.camera.top=28; G.sun.shadow.camera.bottom=-28;
    G.sun.shadow.camera.near=5; G.sun.shadow.camera.far=140;
    G.sun.shadow.bias=-0.0008;
    G.scene.add(G.sun); G.scene.add(G.sun.target);
    G.playerLight=new THREE.PointLight(0xffb060, 0.9, 16);
    G.playerLight.visible=false;
    G.scene.add(G.playerLight);
    // target ring
    const ringGeo=new THREE.RingGeometry(0.85,1.15,28);
    G.ring=new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({color:0xff5050, transparent:true, opacity:0.85, side:THREE.DoubleSide, depthWrite:false}));
    G.ring.rotation.x=-Math.PI/2;
    G.ring.visible=false;
    G.scene.add(G.ring);
    FX.init(G.scene);
    AudioSys.init();
    Assets.loadAll();
    EnvAssets.loadAll();
    Input.init();
    UI.init();
    Save.migrateLegacy();
    Save.settingsLoad();
    syncSettings();
    applySettings();
    window.addEventListener('resize', ()=>{
      camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
      G.renderer.setSize(innerWidth,innerHeight);
    });
    AudioSys.resume();
    let last=performance.now();
    const loop=(now)=>{
      requestAnimationFrame(loop);
      let dt=(now-last)/1000; last=now;
      if(dt>0.1) dt=0.1;
      this.update(dt);
    };
    requestAnimationFrame(loop);
  },

  /* ---------- title backdrop: living town behind the menu ---------- */
  buildTitleWorld(){
    if(!Assets.ok || !EnvAssets.ok || World.current) return;
    const zone=World.load(G.scene, 'asterfall');
    if(!zone) return;
    G.zoneId='asterfall';
    if(!G.zoneCreaturesBuilt['asterfall']){
      for(const sp of zone.def.spawns||[]){
        for(let i=0;i<sp.n;i++){
          const spot=this.randomFreeTile(zone, sp.x, sp.z, sp.w, sp.h);
          if(!spot) continue;
          const c=new Creature(sp.c, 'asterfall', spot.x, spot.z);
          c.mesh.userData.creature=c;
          zone.group.add(c.mesh);
          G.creatures.push(c);
        }
      }
      G.zoneCreaturesBuilt['asterfall']=true;
    }
    if(!G.npcs.length){
      for(const k in NPCS){
        const n=new NPC(k);
        n.mesh.userData.npcId=k;
        G.npcs.push(n);
      }
    }
    for(const n of G.npcs) n.refreshZone();
    this.spawnBirds(zone);
    G.sun.target.position.set((zone.w/2)*TILE, 0, (zone.h/2)*TILE);
    TitleFX.init(G.scene);
  },
  animateWorldAmbient(now){
    if(!World.current) return;
    for(const f of World.current.flickerers){
      if(f.planar){ f.m.position.y=0.14+Math.sin(now*1.5+f.ph)*0.02; continue; }
      f.m.scale.setScalar((f.base||1)*(0.85+Math.sin(now*3+f.ph)*0.15+Math.sin(now*7.3+f.ph)*0.05));
    }
    for(const wm of World.current.waterMeshes){
      wm.m.position.y=0.12+Math.sin(now+wm.ph)*0.03;
    }
    const indoor=!!World.current.def.indoor;
    for(const w of World.current.lightPool){
      const fl=(w.type==='lamp'||w.type==='torch')?(0.85+Math.sin(now*6+w.ph)*0.15+Math.sin(now*11+w.ph)*0.06):1;
      w.L.intensity=w.base*(indoor?1:(1-DayNight.daylight()))*fl;
    }
  },

  newGame(name, slot){
    Save.active=slot||1;
    $('title-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
    G.state='playing';
    AudioSys.titleStop();
    TitleFX.hide();
    G.player=new Player(name);
    G.player.rebuildMesh();
    G.player.addItem('rusty_sword',1);
    G.player.addItem('cloth_tunic',1);
    G.player.addItem('minor_potion',3);
    G.player.addItem('bread',2);
    G.softCam=true;
    this.enterZone('asterfall', 28, 30);
    G.softCam=false;
    Quests.accept('q_first_steps');
    Tutorial.start();
    UI.refreshHUD(); UI.refreshHotbar(); UI.refreshInventory();
    AudioSys.resume();
  },

  continueGame(slot){
    Save.active=slot||1;
    $('title-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
    G.state='playing';
    AudioSys.titleStop();
    TitleFX.hide();
    G.player=new Player('Hero');
    G.player.rebuildMesh();
    let ok=false;
    G.softCam=true;
    try{ ok=Save.load(); }catch(e){ console.warn('load failed', e); ok=false; }
    G.softCam=false;
    if(!ok){
      UI.toast('No valid save found — starting a new game.','bad');
      if(G.player&&G.player.mesh&&G.player.mesh.parent) G.player.mesh.parent.remove(G.player.mesh);
      G.quests={}; G._ready={}; G.discovered=new Set(['asterfall']);
      G.player=new Player('Hero'); G.player.rebuildMesh();
      this.enterZone('asterfall', 28, 30);
      Quests.accept('q_first_steps'); Tutorial.start();
    } else {
      Tutorial.active=false; Tutorial.done=G.tutorial.done;
      UI.refreshHotbar(); UI.refreshHUD(); UI.refreshInventory();
      UI.toast('Welcome back, '+G.player.name+'.','q');
    }
  },

  /* ---------- zones ---------- */
  enterZone(id, tx, tz, silent, wx, wz){
    if(!ZONES[id]) id='asterfall';
    const prev=World.current;
    if(prev && prev.id!==id) G.scene.remove(prev.group);
    const zone=World.load(G.scene, id);
    if(!zone){ console.error('could not build zone', id); return; }
    G.zoneId=id;
    G.discovered.add(id);
    // clear transient
    for(const p of G.piles){ G.scene.remove(p.mesh); }
    G.piles.length=0;
    for(const p of Proj.list){ p.m.visible=false; }
    Proj.list.length=0;
    G.clouds.length=0;
    this.clearTarget();
    // chests opened state
    for(let i=0;i<zone.chestObjs.length;i++){
      if(G.openedChests.has(id+':'+i)){ zone.chestObjs[i].opened=true; this.openChestVisual(zone.chestObjs[i].mesh); }
    }
    // creatures
    if(!G.zoneCreaturesBuilt[id]){
      for(const sp of zone.def.spawns||[]){
        for(let i=0;i<sp.n;i++){
          const spot=this.randomFreeTile(zone, sp.x, sp.z, sp.w, sp.h);
          if(!spot) continue;
          const c=new Creature(sp.c, id, spot.x, spot.z);
          c.mesh.userData.creature=c;
          zone.group.add(c.mesh);
          G.creatures.push(c);
        }
      }
      if(zone.def.bossSpawn){
        const b=zone.def.bossSpawn;
        const c=new Creature(b.c, id, b.x, b.z);
        c.mesh.userData.creature=c;
        zone.group.add(c.mesh);
        G.creatures.push(c);
      }
      G.zoneCreaturesBuilt[id]=true;
    }
    // NPCs
    if(!G.npcs.length){
      for(const k in NPCS){
        const n=new NPC(k);
        n.mesh.userData.npcId=k;
        G.npcs.push(n);
      }
    }
    for(const n of G.npcs) n.refreshZone();
    // player pos
    let px, pz;
    if(wx!=null){ px=wx; pz=wz; }
    else { px=(tx+0.5)*TILE; pz=(tz+0.5)*TILE; }
    if(World.blockedPoint(zone, px, pz, 0.5)){
      const spot=this.randomFreeTile(zone, Math.floor(px/TILE)-3, Math.floor(pz/TILE)-3, 7, 7) || {x:Math.floor(zone.w/2), z:Math.floor(zone.h/2)};
      px=(spot.x+0.5)*TILE; pz=(spot.z+0.5)*TILE;
    }
    G.player.mesh.position.set(px,0,pz);
    G.player.pos.copy(G.player.mesh.position);
    if(!G.softCam) camera.position.set(px+18, 20, pz+18);
    // indoor light
    G.playerLight.visible=!!zone.def.indoor;
    G.portalLock=1.4;
    $('zone-name').textContent=zone.def.name;
    if(!silent) UI.zoneBanner(zone.def.name);
    this.spawnBirds(zone);
    Quests.onZoneEnter(id);
    Save.save();
  },
  spawnBirds(zone){
    for(const b of G.birds){ if(b.unit.root.parent) b.unit.root.parent.remove(b.unit.root); }
    G.birds.length=0;
    if(!zone || zone.def.indoor) return;
    const key=BIRD_MODEL[zone.def.theme];
    const mk=Assets.model(key);
    if(!mk) return;
    const n=4+((Math.random()*3)|0);
    const scale=BIRD_SIZE/(mk.nativeMax||1);
    for(let i=0;i<n;i++){
      const unit=new AnimUnit(mk, scale);
      const cx=(zone.w/2+(Math.random()-0.5)*zone.w*0.5)*TILE;
      const cz=(zone.h/2+(Math.random()-0.5)*zone.h*0.5)*TILE;
      const r=12+Math.random()*20, ang=Math.random()*6.28, sp=0.05+Math.random()*0.05, y=11+Math.random()*7, dir=Math.random()<0.5?1:-1;
      unit.root.position.set(cx+Math.cos(ang)*r, y, cz+Math.sin(ang)*r);
      zone.group.add(unit.root);
      G.birds.push({unit,cx,cz,r,ang,sp,y,dir});
    }
  },
  onAssetsReady(){
    this.maybeReady();
    if(G.state==='title') this.buildTitleWorld();
    if(G.player){ G.player.rebuildMesh(); if(G.player.anim) G.player.anim.setState('idle'); }
    for(const n of G.npcs) n.rebuildVisual();
    for(const c of G.creatures){ if(CREATURE_MODEL[c.defId] && !c.anim && c.alive) c.rebuildVisual(); }
    if(World.current) this.spawnBirds(World.current);
    if(G.player) UI.refreshHUD();
  },
  maybeReady(){
    if(!Assets.ok || !EnvAssets.ok) return;
    const l=$('title-loading'); if(l) l.classList.add('hidden');
    const lo=$('loading-screen'); if(lo) lo.classList.add('hide');
    $('btn-new').disabled=false;
    $('btn-load').disabled=!Save.hasAny();
  },
  onAssetsError(missing){ this.showAssetError('character & creature', missing); },
  onEnvError(missing){ this.showAssetError('environment', missing); },
  showAssetError(kind, missing){
    const list=(missing||[]).map(m=>'<li>'+esc(m)+'</li>').join('');
    document.body.innerHTML='<div style="position:fixed;inset:0;background:#0a0a12;color:#e0d0a0;font-family:Georgia,serif;display:flex;align-items:center;justify-content:center">'+
      '<div style="max-width:580px;padding:40px 44px;border:1px solid #6b5a32;border-radius:4px;background:linear-gradient(160deg,#1c1812,#100e0a);box-shadow:0 6px 24px rgba(0,0,0,.6)">'+
      '<h2 style="color:#c9a84c;letter-spacing:3px;font-weight:normal;margin-bottom:14px">ASSETS FAILED TO LOAD</h2>'+
      '<p style="margin:10px 0">The '+kind+' models could not be loaded. Chronicles of Eldoria requires its downloaded assets to run.</p>'+
      '<p style="margin:10px 0">Run <span style="color:#ffd75e;font-family:monospace">node fetch-env-assets.js</span> in the game folder, then reload this page.</p>'+
      (list?'<p style="margin:12px 0 4px;color:#9a8a5e;font-size:13px">Missing:</p><ul style="margin:0 0 10px 20px;font-size:13px;color:#9a8a5e">'+list+'</ul>':'')+
      '</div></div>';
  },
  openChestVisual(mesh){
    if(mesh.userData.envLid){ mesh.userData.envLid.rotation.x=-1.5; return; }
    mesh.children[0].position.y=0.15; mesh.children[1].position.y=0.95;
  },
  onEnvReady(){
    this.maybeReady();
    if(G.state==='title') this.buildTitleWorld();
  },
  randomFreeTile(zone, x, z, w, h){
    for(let tries=0;tries<40;tries++){
      const tx=x+((Math.random()*w)|0), tz=z+((Math.random()*h)|0);
      if(!zone.solidAt(tx,tz)) return {x:tx,z:tz};
    }
    return null;
  },
  spawnExtras(zoneId, cId, n, wx, wz){
    const zone=World.zones[zoneId];
    if(!zone) return;
    for(let i=0;i<n;i++){
      const tx=Math.floor(wx/TILE)+(Math.random()*6|0)-3, tz=Math.floor(wz/TILE)+(Math.random()*6|0)-3;
      const c=new Creature(cId, zoneId, clamp(tx,1,zone.w-2), clamp(tz,1,zone.h-2));
      c.mesh.userData.creature=c;
      c.home={x:c.mesh.position.x,z:c.mesh.position.z};
      zone.group.add(c.mesh);
      G.creatures.push(c);
    }
  },

  /* ---------- targeting & clicks ---------- */
  setTarget(c){
    if(G.target===c) return;
    this.clearTarget();
    G.target=c;
    Input.autoWalk=true;
    G.ring.visible=true;
    UI.refreshTarget();
    Audio.play('click');
  },
  clearTarget(){
    G.target=null;
    Input.autoWalk=false;
    Input.clickMove=null;
    G.ring.visible=false;
    UI.refreshTarget();
  },
  tabTarget(){
    const c=Combat.nearestCreature(24);
    if(c) this.setTarget(c);
  },
  spaceAttack(){
    if(!G.target||!G.target.alive){
      const c=Combat.nearestCreature(G.player.derived.range+1);
      if(c){ this.setTarget(c); }
    }
    if(G.target&&G.target.alive&&G.player.t.atkCd<=0){
      const d=G.target.distTo(G.player.mesh.position.x,G.player.mesh.position.z);
      if(d<=G.player.derived.range+G.target.def.scale*0.5) Combat.playerAttack(G.target);
      else Input.autoWalk=true;
    }
  },
  worldClick(sx, sy){
    const ray=new THREE.Raycaster();
    const nd=new THREE.Vector2((sx/innerWidth)*2-1, -(sy/innerHeight)*2+1);
    ray.setFromCamera(nd, camera);
    // creatures & npcs
    const meshes=[];
    for(const c of G.creatures){ if(c.alive&&c.zoneId===G.zoneId) meshes.push(c.mesh); }
    for(const n of G.npcs){ if(n.def.zone===G.zoneId) meshes.push(n.mesh); }
    const hits=ray.intersectObjects(meshes, true);
    if(hits.length){
      let o=hits[0].object;
      while(o && !o.userData.creature && !o.userData.npcId) o=o.parent;
      if(o&&o.userData.creature&&o.userData.creature.alive){ this.setTarget(o.userData.creature); return; }
      if(o&&o.userData.npcId){ const P=G.player.mesh.position, p=G.npcs.find(n=>n.id===o.userData.npcId).mesh.position; if(Math.hypot(P.x-p.x,P.z-p.z)<12){ this.setInteractNPC(o.userData.npcId); return; } }
    }
    // ground move
    const ground=ray.intersectObject(World.current.groundMesh, false);
    if(ground.length){
      Input.clickMove={x:ground[0].point.x, z:ground[0].point.z};
      Input.autoWalk=false;
    }
  },
  setInteractNPC(id){ this._npcClick=id; UI.openDialogue(id); Tutorial.note('talk_'+id); },

  interact(){
    const P=G.player.mesh.position;
    // npc
    let best=null, bd=5;
    for(const n of G.npcs){
      if(n.def.zone!==G.zoneId) continue;
      const d=n.mesh.position.distanceTo(P);
      if(d<bd){ bd=d; best=n.id; }
    }
    if(best){ UI.openDialogue(best); return; }
    // chest
    if(World.current){
      for(let i=0;i<World.current.chestObjs.length;i++){
        const ch=World.current.chestObjs[i];
        if(ch.opened) continue;
        if(ch.mesh.position.distanceTo(P)<3.2){
          ch.opened=true;
          G.openedChests.add(G.zoneId+':'+i);
          this.openChestVisual(ch.mesh);
          Loot.spawnPile(ch.mesh.position.x, ch.mesh.position.z, ch.def.items.map(x=>({id:x.id,qty:x.n})), true);
          Audio.play('open');
          return;
        }
      }
    }
    UI.toast('Nothing to interact with here.');
  },

  /* ---------- portals ---------- */
  checkPortals(){
    if(G.portalLock>0) return;
    const P=G.player.mesh.position;
    const tx=Math.floor(P.x/TILE), tz=Math.floor(P.z/TILE);
    if(!World.current) return;
    for(const po of World.current.portalObjs){
      const ex=po.ex;
      if(Math.abs(ex.x-tx)<=0 && Math.abs(ex.z-tz)<=0){
        this.tryPortal(ex);
        return;
      }
    }
  },
  tryPortal(ex){
    let reason=null;
    if(ex.gate){
      if(ex.gate.type==='vocation' && G.player.cls==='adventurer') reason='You are not ready for the wilds. Choose a vocation first (Brother Aldric at the temple).';
      if(ex.gate.type==='quest'){
        const st=G.quests[ex.gate.id];
        if(!st||st.status!=='done') reason='The way is blocked. Progress your story quests first.';
      }
    }
    if(reason){ UI.toast(reason,'bad'); Audio.play('error'); // nudge back
      const P=G.player.mesh.position;
      const away=new THREE.Vector3(P.x-ex.x*TILE,0,P.z-ex.z*TILE).normalize();
      P.x+=away.x*2.5; P.z+=away.z*2.5;
      return; }
    Audio.play('portal');
    const zdef=ZONES[ex.to];
    let ntx=ex.tx, ntz=ex.tz;
    if(ex.tx<=1) ntx=ex.tx+3; if(ex.tx>=zdef.w-2) ntx=ex.tx-3;
    if(ex.tz<=1) ntz=ex.tz+3; if(ex.tz>=zdef.h-2) ntz=ex.tz-3;
    this.enterZone(ex.to, ntx, ntz);
  },

  checkTraps(){
    const P=G.player.mesh.position;
    const tx=Math.floor(P.x/TILE), tz=Math.floor(P.z/TILE);
    if(!World.current) return;
    for(const tp of World.current.trapObjs){
      if(tp.cd>0) continue;
      if(tp.x===tx && tp.z===tz){
        tp.cd=8;
        G.player.takeDamage(12+G.player.level*2.2, null);
        FX.burst(P.x,0.3,P.z,0xc04040,14,4,5,0.5);
        Audio.play('trap');
        UI.toast('A hidden trap springs!','bad');
      }
    }
  },

  /* ---------- camera ---------- */
  updateCamera(dt){
    const P=G.player.mesh.position;
    const d=G.camDist;
    const cx=P.x+Math.sin(G.camYaw)*d*0.75;
    const cz=P.z+Math.cos(G.camYaw)*d*0.75;
    const cy=d*0.95;
    camera.position.x+=(cx-camera.position.x)*Math.min(1,dt*6);
    camera.position.y+=(cy-camera.position.y)*Math.min(1,dt*6);
    camera.position.z+=(cz-camera.position.z)*Math.min(1,dt*6);
    camera.lookAt(P.x,1,P.z);
    G.sun.target.position.copy(P);
    // building occlusion fade
    const zone=World.current;
    if(zone && zone.buildings){
      const px=Math.floor(P.x/TILE), pz=Math.floor(P.z/TILE);
      for(const b of zone.buildings){
        const near = px>=b.x-2 && px<=b.x+b.w+2 && pz>=b.z-2 && pz<=b.z+b.h+2;
        const list = b.mats || [b.wall,b.roof].map(m=>m&&m.material);
        const target=near?0.22:1;
        for(const mm of list){
          if(!mm) continue;
          if(!mm.transparent){ mm.transparent=true; }
          mm.opacity+=(target-mm.opacity)*Math.min(1,dt*8);
        }
      }
    }
  },

  /* ---------- main update ---------- */
  update(dt){
    if(G.state==='playing' && G.player){
      G.playTime+=dt;
      Input.poll();
      const P=G.player;
      if(P.alive){
        if(P.stamina<=0) P.exhausted=true;
        else if(P.exhausted && P.stamina>=30) P.exhausted=false;
        P.sprint = !!(Input.keys['shift'] && !P.exhausted && P.stamina>0 && (Input.moveDir.lengthSq()>0 || !!Input.clickMove));
        if(Input.moveDir.lengthSq()>0){
          P.move(Input.moveDir.x, Input.moveDir.z, dt);
          G.movedOnce=true;
          Input.clickMove=null;
        } else if(Input.clickMove){
          const dx=Input.clickMove.x-P.mesh.position.x, dz=Input.clickMove.z-P.mesh.position.z;
          const d=Math.hypot(dx,dz);
          if(d<0.5) Input.clickMove=null;
          else P.move(dx/d, dz/d, dt);
        } else if(Input.autoWalk && G.target && G.target.alive){
          const t=G.target;
          const d=t.distTo(P.mesh.position.x,P.mesh.position.z);
          const want=P.derived.range*0.8+t.def.scale*0.3;
          if(d>want){
            const dx=t.mesh.position.x-P.mesh.position.x, dz=t.mesh.position.z-P.mesh.position.z;
            P.move(dx/d, dz/d, dt);
          }
        }
        if(Input.moveDir.lengthSq()>0) Tutorial.note('move');
        if(P.anim){
          const mv=Input.moveDir.lengthSq()>0 || !!Input.clickMove || (Input.autoWalk && G.target && G.target.alive);
          P.anim.setState(mv?'run':'idle');
        }
        P.stamina = clamp(P.stamina + (P.sprint? -11 : 13)*dt, 0, P.maxStamina);
        UI.refreshStamina();
        this.checkPortals();
        this.checkTraps();
        for(const tp of (World.current?World.current.trapObjs:[])) if(tp.cd>0) tp.cd-=dt;
      }
      P.updateBuffs(dt);
      if(P.anim) P.anim.update(dt);
      if(G.portalLock>0) G.portalLock-=dt;
      // creatures (only current zone + nearby)
      for(const c of G.creatures){
        if(c.zoneId!==G.zoneId) continue;
        const far=c.distTo(P.mesh.position.x,P.mesh.position.z)>60;
        if(far && c.alive && (c.state==='IDLE'||c.state==='PATROL')){
          if(c.spawnBlink>0){ c.spawnBlink=0; c.mesh.visible=true; }
          continue;
        }
        c.update(dt, P);
      }
      for(const n of G.npcs){ if(n.def.zone===G.zoneId) n.update(dt); }
      for(const b of G.birds){
        b.ang+=b.sp*dt*b.dir;
        const x=b.cx+Math.cos(b.ang)*b.r, z=b.cz+Math.sin(b.ang)*b.r;
        b.unit.root.position.set(x, b.y+Math.sin(b.ang*3)*1.2, z);
        b.unit.root.rotation.y=Math.atan2(-Math.sin(b.ang)*b.dir, Math.cos(b.ang)*b.dir);
        b.unit.update(dt);
      }
      Loot.update(dt);
      Combat.update(dt);
      Combat.updateClouds(dt);
      FX.update(dt, camera);
      this.updateCamera(dt);
      if(G.ring.visible && G.target && G.target.alive){
        G.ring.position.set(G.target.mesh.position.x, 0.06, G.target.mesh.position.z);
        G.ring.scale.setScalar(1+G.target.def.scale*0.55);
      } else if(!G.target||!G.target.alive) this.clearTarget();
      // player light follows
      if(G.playerLight.visible){ G.playerLight.position.set(P.mesh.position.x, 2.4, P.mesh.position.z); }
      // flicker decor + water
      this.animateWorldAmbient(performance.now()*0.004);
      // day/night
      const phase=DayNight.update(dt, G.scene, G.sun, G.hemi);
      if(this._phase!==phase){ this._phase=phase; $('clock').textContent=phase; }
      // UI cadence
      UI.updateFloatTexts(dt);
      UI.updateLabels();
      UI.refreshTarget();
      UI.updateBossBar();
      this._mmT=(this._mmT||0)+dt;
      if(this._mmT>0.15){ this._mmT=0; UI.updateMinimap(); }
      // hp bar of player under feet? skip.
      // autosave
      G.lastSave+=dt;
      if(G.lastSave>30){ G.lastSave=0; Save.save(); }
    } else if(G.state==='title' && World.current){
      // title screen: cinematic orbit around Asterfall + living world
      const zone=World.current;
      const now=performance.now()*0.001;
      const cx=(zone.w/2)*TILE, cz=(zone.h/2)*TILE;
      const R=Math.min(zone.w,zone.h)*TILE*0.52;
      const a=now*0.055;
      camera.position.set(cx+Math.cos(a)*R, 33+Math.sin(now*0.09)*2.5, cz+Math.sin(a)*R);
      camera.lookAt(cx, 1, cz);
      G.sun.target.position.set(cx, 0, cz);
      for(const n of G.npcs){ if(n.def.zone===G.zoneId) n.update(dt); }
      for(const b of G.birds){
        b.ang+=b.sp*dt*b.dir;
        const x=b.cx+Math.cos(b.ang)*b.r, z=b.cz+Math.sin(b.ang)*b.r;
        b.unit.root.position.set(x, b.y+Math.sin(b.ang*3)*1.2, z);
        b.unit.root.rotation.y=Math.atan2(-Math.sin(b.ang)*b.dir, Math.cos(b.ang)*b.dir);
        b.unit.update(dt);
      }
      this.animateWorldAmbient(performance.now()*0.004);
      TitleFX.update(now);
    }
    if(G.renderer) G.renderer.render(G.scene, camera);
    // tickers (one-shot animations)
    for(const fn of G.tickers) fn(dt);
  },
};

window.Game = Game;

/* ---------------- boot ---------------- */
window.addEventListener('DOMContentLoaded', ()=>{
  try{ Game.boot(); }
  catch(e){
    console.error(e);
    document.body.innerHTML='<div style="color:#e0d0a0;font-family:Georgia;padding:40px;font-size:18px">Failed to start Chronicles of Eldoria:<br>'+
      (e&&e.message?e.message:e)+'<br><br>Your browser may not support WebGL.</div>';
  }
});
