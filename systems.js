'use strict';
/* =========================================================
   systems.js — Combat, Loot, Quests, Shop, Save, Audio, Tutorial
   ========================================================= */

/* ---------------- AUDIO ---------------- */
const AudioSys = {
  ctx:null, master:null, enabled:true,
  init(){
    try{
      const AC = window.AudioContext || window.webkitAudioContext;
      if(!AC) { this.enabled=false; return; }
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = (Settings?Settings.volume:0.7);
      this.master.connect(this.ctx.destination);
    }catch(e){ this.enabled=false; }
  },
  resume(){
    if(this.ctx && this.ctx.state==='suspended') this.ctx.resume().catch(()=>{});
    if(this.ctx && this.ctx.state==='running' && !this.titleOn && typeof G!=='undefined' && G.state==='title') this.titleStart();
  },
  /* title ambience: wind loop + distant bell + birds, fade-out on game start */
  titleOn:false, _titleNodes:null, _titleTimers:[],
  titleStart(){
    if(!this.enabled||!this.ctx||this.titleOn) return;
    if(this.ctx.state!=='running') return;
    try{
      this.titleOn=true;
      const n=Math.floor(this.ctx.sampleRate*3);
      const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
      const d=buf.getChannelData(0);
      let last=0;
      for(let i=0;i<n;i++){ const w=Math.random()*2-1; last=last*0.97+w*0.03; d[i]=last*3.2; }
      const src=this.ctx.createBufferSource(); src.buffer=buf; src.loop=true;
      const f=this.ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=420;
      const g=this.ctx.createGain(); g.gain.value=0.0001;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start();
      g.gain.linearRampToValueAtTime(0.055, this.ctx.currentTime+1.5);
      this._titleNodes={src,g};
      const bell=()=>{
        if(!this.titleOn) return;
        const f0=392;
        this.tone(f0,2.8,'sine',0.045); this.tone(f0*2.01,2.8,'sine',0.018);
        this._titleTimers.push(setTimeout(bell, 14000+Math.random()*13000));
      };
      this._titleTimers.push(setTimeout(bell, 3000));
      const chirp=()=>{
        if(!this.titleOn) return;
        const base=1700+Math.random()*900;
        this.tone(base,0.08,'sine',0.02,base*1.35);
        this._titleTimers.push(setTimeout(()=>{ if(this.titleOn) this.tone(base*1.12,0.1,'sine',0.016,base*0.75); },130));
        this._titleTimers.push(setTimeout(chirp, 5000+Math.random()*9000));
      };
      this._titleTimers.push(setTimeout(chirp, 6000));
    }catch(e){ this.titleOn=false; }
  },
  titleStop(){
    if(!this.titleOn) return;
    this.titleOn=false;
    for(const t of this._titleTimers) clearTimeout(t);
    this._titleTimers.length=0;
    if(this._titleNodes){
      const nd=this._titleNodes; this._titleNodes=null;
      try{
        nd.g.gain.cancelScheduledValues(this.ctx.currentTime);
        nd.g.gain.setValueAtTime(nd.g.gain.value, this.ctx.currentTime);
        nd.g.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime+2);
        setTimeout(()=>{ try{ nd.src.stop(); }catch(e){} }, 2300);
      }catch(e){}
    }
  },
  setVol(v){ if(this.master) this.master.gain.value=v; },
  tone(freq, dur, type, vol, slideTo){
    if(!this.enabled||!this.ctx) return;
    try{
      const o=this.ctx.createOscillator(), g=this.ctx.createGain();
      o.type=type||'square'; o.frequency.value=freq;
      if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), this.ctx.currentTime+dur);
      g.gain.value=(vol||0.12);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime+dur);
      o.connect(g); g.connect(this.master);
      o.start(); o.stop(this.ctx.currentTime+dur);
    }catch(e){}
  },
  noise(dur, vol, freq){
    if(!this.enabled||!this.ctx) return;
    try{
      const n=Math.floor(this.ctx.sampleRate*dur);
      const buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate);
      const d=buf.getChannelData(0);
      for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
      const src=this.ctx.createBufferSource(); src.buffer=buf;
      const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq||800;
      const g=this.ctx.createGain(); g.gain.value=vol||0.1;
      src.connect(f); f.connect(g); g.connect(this.master); src.start();
    }catch(e){}
  },
  play(name){
    if(!this.enabled||!this.ctx) return;
    switch(name){
      case 'swing': this.noise(0.12,0.06,1400); break;
      case 'hit': this.tone(180,0.09,'square',0.1,90); this.noise(0.06,0.05,600); break;
      case 'crit': this.tone(240,0.14,'sawtooth',0.12,60); this.noise(0.12,0.08,900); break;
      case 'hurt': this.tone(120,0.15,'sawtooth',0.1,50); break;
      case 'enemyAtk': this.noise(0.1,0.05,500); break;
      case 'aggro': this.tone(300,0.12,'triangle',0.07,420); break;
      case 'death': this.tone(160,0.4,'sawtooth',0.1,40); this.noise(0.3,0.06,300); break;
      case 'coin': this.tone(1300,0.06,'square',0.06); setTimeout(()=>this.tone(1750,0.09,'square',0.06),60); break;
      case 'rare': this.tone(700,0.1,'triangle',0.08,1100); setTimeout(()=>this.tone(1100,0.14,'triangle',0.08,1600),90); break;
      case 'levelup': [520,660,780,1040].forEach((f,i)=>setTimeout(()=>this.tone(f,0.22,'triangle',0.1),i*110)); break;
      case 'spell': this.tone(500,0.25,'sine',0.08,1400); break;
      case 'buff': this.tone(400,0.2,'sine',0.07,800); break;
      case 'click': this.tone(900,0.04,'square',0.05); break;
      case 'drink': this.tone(300,0.15,'sine',0.07,150); break;
      case 'equip': this.tone(700,0.05,'square',0.06); this.noise(0.08,0.05,2200); break;
      case 'quest': this.tone(600,0.12,'triangle',0.08); setTimeout(()=>this.tone(900,0.18,'triangle',0.08),110); break;
      case 'buy': this.tone(880,0.06,'square',0.06); setTimeout(()=>this.tone(660,0.08,'square',0.06),60); break;
      case 'sell': this.tone(660,0.06,'square',0.06); setTimeout(()=>this.tone(880,0.08,'square',0.06),60); break;
      case 'error': this.tone(160,0.15,'square',0.07); break;
      case 'open': this.tone(440,0.08,'triangle',0.06,660); break;
      case 'portal': this.tone(300,0.35,'sine',0.08,900); break;
      case 'trap': this.noise(0.2,0.1,250); this.tone(90,0.2,'sawtooth',0.08); break;
    }
  },
};
const Audio = { play:(n)=>AudioSys.play(n) };

/* ---------------- COMBAT ---------------- */
const RANGED_MISS = 15; // % chance a ranged (bow/staff) basic attack misses
const Combat = {
  // skill damage scales from its own base + level, independent of the weapon
  skillRoll(sk, P){
    return (sk.base||0) + P.level*(sk.perLvl||2);
  },
  update(dt){
    const P=G.player;
    if(!P.alive) return;
    if(P.t.atkCd>0) P.t.atkCd-=dt;
    if(P.t.hitFlash>0) P.t.hitFlash-=dt;
    for(const k in G.skillCd){ if(G.skillCd[k]>0) G.skillCd[k]-=dt; }
    // auto attack
    if(G.target && P.t.atkCd<=0){
      const t=G.target;
      if(t.alive && t.zoneId===G.zoneId){
        const d=t.distTo(P.mesh.position.x,P.mesh.position.z);
        const inR = d <= P.derived.range + t.def.scale*0.5;
        if(inR){ this.playerAttack(t); }
        else if(Input.autoWalk){ /* movement handled in game loop */ }
      } else Game.clearTarget();
    }
    // global cooldown UI update
    UI.refreshHotbarCd();
  },
  playerAttack(target){
    const P=G.player;
    const w=P.derived;
    const cd = w.wkind==='axe'?1.35:(w.wkind==='bow'?1.15:(w.wkind==='staff'?1.25:1.05));
    P.t.atkCd=cd;
    P.markCombat();
    const inner=P.mesh.userData.inner;
    inner.rotation.x=-0.35;
    setTimeout(()=>{ if(inner) inner.rotation.x=0; }, 180);
    Audio.play('swing');
    if(P.anim) P.anim.trigger(P.derived.isRanged?'shoot':(P.derived.isMagic?'cast':'attack'));
    // magic basic attacks cost mana (free for physical weapons)
    if(w.isMagic){
      if(!P.spendMana(w.mcost||1)){ UI.toast('Not enough mana','bad'); return; }
    }
    // ranged (bow/staff) can miss — melee never misses
    if((w.isRanged||w.isMagic) && Math.random()*100 < RANGED_MISS){
      UI.floatText(target.mesh.position.x, 1.6*target.def.scale+1, target.mesh.position.z, 'MISS', '');
      FX.hitFX(target.mesh.position.x,1.2,target.mesh.position.z,0x9a9a9a);
      Audio.play('swing');
      return;
    }
    const roll=(w.dmgMin+Math.random()*(w.dmgMax-w.dmgMin)) + w.atkStat*w.atkBonus + P.level*1.5;
    const crit=Math.random()*100<w.crit;
    const dmg=roll*(crit?2:1)*(0.9+Math.random()*0.2);
    if(w.isRanged||w.isMagic){
      Proj.spawn({x:P.mesh.position.x,z:P.mesh.position.z,y:1.3}, target, {
        color: w.isMagic?0x9b6fff:0xd8cfa8, speed:24, dmg, friendly:true, crit, kind: w.isMagic?'magic':'phys',
      });
    } else {
      this.dealTo(target, dmg, crit);
      target.lunge&&0;
    }
    Tutorial.note('attack');
  },
  dealTo(target, dmg, crit){
    const defMit=100/(100+target.def.def*4);
    const final=Math.max(1, dmg*defMit);
    target.takeDamage(final, {crit, color: crit?0xffd75e:undefined, src:G.player});
    Audio.play(crit?'crit':'hit');
    if(crit) Tutorial.note('crit');
  },
  projectileHit(c, p){
    const defMit=100/(100+c.def.def*4);
    c.takeDamage(Math.max(1,p.dmg*defMit), {crit:p.crit, src:G.player});
    Audio.play(p.crit?'crit':'hit');
    if(p.poison) c.applyStatus({poison:p.poison});
    if(p.slow) c.applyStatus({slow:p.slow});
  },
  aoeHit(p){
    for(const c of G.creatures){
      if(!c.alive) continue;
      const dx=c.mesh.position.x-p.pos.x, dz=c.mesh.position.z-p.pos.z;
      if(Math.sqrt(dx*dx+dz*dz)<=p.aoe){
        const defMit=100/(100+c.def.def*4);
        c.takeDamage(Math.max(1,p.dmg*defMit), {src:G.player});
      }
    }
    FX.burst(p.pos.x,0.4,p.pos.z,0xff7a3a,26,8,5,0.7);
    Audio.play('spell');
  },
  bossWhirl(boss, player){
    const d=boss.distTo(player.mesh.position.x,player.mesh.position.z);
    if(d<5.5 && player.alive) player.takeDamage(boss.rollDmg()*1.2, boss);
    FX.burst(boss.mesh.position.x,1,boss.mesh.position.z,0xffaa30,16,6,3,0.5);
    Audio.play('enemyAtk');
  },
  bossImpact(boss, to, r){
    const P=G.player;
    if(P.alive){
      const dx=P.mesh.position.x-to.x, dz=P.mesh.position.z-to.z;
      if(Math.sqrt(dx*dx+dz*dz)<r) P.takeDamage(boss.rollDmg()*1.4, boss);
    }
    FX.burst(to.x,0.5,to.z,0xff7a3a,20,7,5,0.6);
    Audio.play('trap');
  },
  dragonBreath(boss, player){
    const P=G.player;
    if(P.alive){
      const d=boss.distTo(P.mesh.position.x,P.mesh.position.z);
      if(d<10) P.takeDamage(boss.rollDmg()*1.5, boss);
    }
    const bx=boss.mesh.position.x, bz=boss.mesh.position.z;
    for(let i=0;i<10;i++){
      const t=boss.mesh.position.clone();
      setTimeout(()=>FX.burst(bx+(P.mesh.position.x-bx)*(i/10)+ (Math.random()-0.5)*2, 1.2, bz+(P.mesh.position.z-bz)*(i/10)+(Math.random()-0.5)*2, 0xff5a1a, 5,3,3,0.5), i*60);
    }
    Audio.play('spell');
  },
  dragonMeteors(boss, player){
    const P=G.player;
    for(let i=0;i<5;i++){
      const tx=P.mesh.position.x+(Math.random()-0.5)*14;
      const tz=P.mesh.position.z+(Math.random()-0.5)*14;
      setTimeout(()=>{
        Proj.spawn({x:tx,y:22,z:tz-6}, {x:tx,y:0,z:tz,impact:true}, {color:0xff7a2a, size:2.2, speed:30, dmg:boss.rollDmg()*0.9, aoe:4.5, friendly:false, srcCreature:boss, impactY:0});
      }, i*300);
    }
  },
  nearestCreature(maxDist){
    let best=null,bd=maxDist;
    const P=G.player.mesh.position;
    for(const c of G.creatures){
      if(!c.alive||c.zoneId!==G.zoneId) continue;
      const d=c.distTo(P.x,P.z);
      if(d<bd){ bd=d; best=c; }
    }
    return best;
  },
  castSkill(skillId){
    const P=G.player;
    if(!P.alive) return false;
    const sk=SKILLS[skillId];
    if(!sk) return false;
    if(sk.unlock && P.level<sk.unlock){ UI.toast('Unlocks at level '+sk.unlock,'bad'); Audio.play('error'); return false; }
    if(G.skillCd[skillId]>0){ return false; }
    if(P.mp<sk.cost){ UI.toast('Not enough mana','bad'); Audio.play('error'); return false; }
    if(!P.spendMana(sk.cost)) return false;
    G.skillCd[skillId]=sk.cd;
    P.markCombat();
    const target=G.target && G.target.alive ? G.target : null;
    const px=P.mesh.position.x, pz=P.mesh.position.z;
    let used=true;
    switch(sk.kind){
      case 'melee': {
        if(!target){ UI.toast('No target','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        const d=target.distTo(px,pz);
        if(d>sk.range+target.def.scale*0.5){ UI.toast('Too far','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        const roll=this.skillRoll(sk,P);
        const crit=Math.random()*100<P.derived.crit;
        this.dealTo(target, roll*sk.mult*(crit?2:1), crit);
        if(sk.stun) target.applyStatus({stun:sk.stun});
        FX.burst(target.mesh.position.x,1.3,target.mesh.position.z,0xffd75e,12,5,4,0.5);
        Audio.play('swing');
        break; }
      case 'proj': {
        if(!target){ UI.toast('No target','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        if(target.distTo(px,pz)>sk.range){ UI.toast('Too far','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        const roll=this.skillRoll(sk,P);
        const crit=Math.random()*100<P.derived.crit;
        Proj.spawn({x:px,z:pz,y:1.3}, target, {color: P.derived.isMagic?0x9b6fff:0xd8cfa8, speed:sk.speed, dmg:roll*sk.mult*(crit?2:1), crit, friendly:true, poison:sk.poison, slow:sk.slow});
        Audio.play(sk.magic?'spell':'swing');
        break; }
      case 'proj3': {
        if(!target){ UI.toast('No target','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        const roll=this.skillRoll(sk,P);
        for(let i=-1;i<=1;i++){
          const ang=Math.atan2(target.mesh.position.x-px, target.mesh.position.z-pz)+i*0.22;
          const tx=px+Math.sin(ang)*sk.range, tz=pz+Math.cos(ang)*sk.range;
          Proj.spawn({x:px,z:pz,y:1.3}, {x:tx,z:tz,y:1}, {color:0xd8cfa8, speed:sk.speed, dmg:roll*sk.mult, friendly:true});
        }
        Audio.play('swing');
        break; }
      case 'aoe_self': {
        const roll=this.skillRoll(sk,P);
        for(const c of G.creatures){
          if(!c.alive||c.zoneId!==G.zoneId) continue;
          if(c.distTo(px,pz)<=sk.radius){
            const defMit=100/(100+c.def.def*4);
            c.takeDamage(Math.max(1,roll*sk.mult*defMit), {src:P});
          }
        }
        FX.burst(px,1,pz,0x9fd6ff,22,8,3,0.6);
        Audio.play('swing');
        break; }
      case 'aoe_ground': {
        const spot = target ? {x:target.mesh.position.x,z:target.mesh.position.z} : {x:px+Math.sin(P.face)*sk.range*0.6, z:pz+Math.cos(P.face)*sk.range*0.6};
        if(Math.hypot(spot.x-px,spot.z-pz)>sk.range){ UI.toast('Too far','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        const roll=this.skillRoll(sk,P);
        Proj.spawn({x:spot.x,y:20,z:spot.z-8}, {x:spot.x,y:0,z:spot.z}, {color:0xff5a1a, size:2.4, speed:30, dmg:roll*sk.mult, aoe:sk.radius, friendly:true, impactY:0});
        Audio.play('spell');
        break; }
      case 'heal': {
        const amt=sk.power+P.attrs.int*sk.perInt;
        P.heal(amt);
        FX.burst(px,1,pz,0x7fd63a,16,3,5,0.8);
        Audio.play('buff');
        break; }
      case 'buff': {
        const b={id:skillId, name:sk.name, icon:sk.icon, atk:sk.buff.atk||0, def:sk.buff.def||0, regen:sk.buff.regen||0};
        P.addBuff(b);
        FX.burst(px,1,pz,0xffd75e,14,3,5,0.8);
        break; }
      case 'cloud': {
        const spot = target ? {x:target.mesh.position.x,z:target.mesh.position.z} : {x:px+Math.sin(P.face)*4, z:pz+Math.cos(P.face)*4};
        if(Math.hypot(spot.x-px,spot.z-pz)>sk.range){ UI.toast('Too far','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        G.clouds.push({x:spot.x,z:spot.z,r:sk.radius,t:sk.dur,dps:sk.dps,tick:0});
        Audio.play('spell');
        break; }
      case 'root': {
        if(!target){ UI.toast('No target','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        if(target.distTo(px,pz)>sk.range){ UI.toast('Too far','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        target.applyStatus({root:sk.dur});
        FX.burst(target.mesh.position.x,0.4,target.mesh.position.z,0x5a8a2a,12,3,2,0.6);
        Audio.play('spell');
        break; }
      case 'dash': {
        const ang = Input.moveDir.lengthSq()>0 ? Math.atan2(Input.moveDir.x, Input.moveDir.z) : P.face;
        const tx=px+Math.sin(ang)*sk.dist, tz=pz+Math.cos(ang)*sk.dist;
        // teleport with collision check, else shorten
        let d=sk.dist;
        for(;d>1;d-=1){
          if(!World.blockedPoint(World.current, px+Math.sin(ang)*d, pz+Math.cos(ang)*d, 0.45)) break;
        }
        FX.burst(px,1,pz,0xcfd8e8,14,4,3,0.5);
        P.mesh.position.x=px+Math.sin(ang)*Math.max(1,d); P.mesh.position.z=pz+Math.cos(ang)*Math.max(1,d);
        P.pos.copy(P.mesh.position);
        FX.burst(P.mesh.position.x,1,P.mesh.position.z,0xcfd8e8,14,4,3,0.5);
        Audio.play('spell');
        break; }
      case 'chain': {
        if(!target){ UI.toast('No target','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        if(target.distTo(px,pz)>sk.range){ UI.toast('Too far','bad'); P.mp+=sk.cost; G.skillCd[skillId]=0.5; return false; }
        const roll=this.skillRoll(sk,P)*sk.mult;
        const crit=Math.random()*100<P.derived.crit;
        this.dealTo(target, roll*(crit?2:1), crit);
        FX.burst(target.mesh.position.x,1.4,target.mesh.position.z,0xfff2a0,14,4,6,0.5);
        // chain to one more
        let second=null, sd=8;
        for(const c of G.creatures){ if(c.alive&&c!==target&&c.zoneId===G.zoneId){ const d=c.distTo(target.mesh.position.x,target.mesh.position.z); if(d<sd){sd=d;second=c;} } }
        if(second){ this.dealTo(second, roll*0.5, false); FX.burst(second.mesh.position.x,1.4,second.mesh.position.z,0xfff2a0,8,3,5,0.4); }
        Audio.play('spell');
        break; }
      default: used=false;
    }
    if(used){
      if(P.anim) P.anim.trigger((sk.kind==='melee'||sk.kind==='aoe_self')?'attack':(P.derived.isRanged?'shoot':'cast'));
      Tutorial.note('skill'); UI.refreshHotbar();
    }
    return used;
  },
  useHotbar(slot){
    if(!G.player.alive) return;
    if(slot===6){
      for(let i=0;i<G.player.inv.length;i++){
        const s=G.player.inv[i];
        if(s && (s.id==='minor_potion'||s.id==='healing_potion'||s.id==='greater_healing')){ G.player.useItem(i); G.skillCd['_potion']=1.5; return; }
      }
      UI.toast('No healing potions!','bad'); Audio.play('error'); return;
    }
    if(slot===5){
      for(let i=0;i<G.player.inv.length;i++){
        const s=G.player.inv[i];
        if(s && ITEMS[s.id].type==='food'){ G.player.useItem(i); G.skillCd['_food']=1.2; return; }
      }
      UI.toast('No food!','bad'); Audio.play('error'); return;
    }
    const map=G.hotbarSlots;
    const skId=map[slot-1];
    if(skId) this.castSkill(skId);
  },
  updateClouds(dt){
    const P=G.player;
    for(let i=G.clouds.length-1;i>=0;i--){
      const cl=G.clouds[i];
      cl.t-=dt; cl.tick-=dt;
      if(Math.random()<dt*8) FX.burst(cl.x+(Math.random()-0.5)*cl.r*2, 0.5, cl.z+(Math.random()-0.5)*cl.r*2, 0x5aa83a, 1, 1, 1, 0.5);
      if(cl.tick<=0){
        cl.tick=0.5;
        for(const c of G.creatures){
          if(!c.alive||c.zoneId!==G.zoneId) continue;
          if(Math.hypot(c.mesh.position.x-cl.x, c.mesh.position.z-cl.z)<=cl.r){
            c.takeDamage(cl.dps*0.5, {src:P, color:0x7fd63a});
          }
        }
      }
      if(cl.t<=0) G.clouds.splice(i,1);
    }
  },
};

/* ---------------- LOOT ---------------- */
const Loot = {
  dropFrom(c){
    const entries=[];
    const [ga,gb]=c.def.gold||[0,0];
    const gold=Math.round(ga+Math.random()*(gb-ga));
    if(gold>0) entries.push({id:'_gold', qty:gold});
    let rare=false;
    for(const l of c.def.loot||[]){
      if(Math.random()<l.ch){
        const n=l.min&&l.max? (l.min+((Math.random()*(l.max-l.min+1))|0)) : 1;
        entries.push({id:l.it, qty:n});
        const rar=ITEMS[l.it] && ITEMS[l.it].rarity;
        if(rar==='rare'||rar==='epic'||rar==='legendary') rare=true;
        if(c.def.boss && (rar==='epic'||rar==='legendary')) rare=true;
      }
    }
    if(entries.length) this.spawnPile(c.mesh.position.x, c.mesh.position.z, entries, rare||!!c.def.boss);
  },
  spawnPile(x,z,entries, shiny){
    const g=new THREE.Group();
    const color = shiny?0xffd75e:0xc0b080;
    const box1=new THREE.Mesh(GEO.box, emissiveMat(shiny?0xffc040:0xb8a878,{transparent:true,opacity:0.9}));
    box1.scale.setScalar(0.35); box1.position.y=0.3;
    const halo=new THREE.Mesh(GEO.plane, emissiveMat(color,{transparent:true,opacity:shiny?0.5:0.25}));
    halo.rotation.x=-Math.PI/2; halo.scale.setScalar(shiny?1.6:1);
    halo.position.y=0.05;
    g.add(box1,halo);
    g.position.set(x,0,z);
    G.scene.add(g);
    G.piles.push({mesh:g, entries, t:0, shiny});
    if(shiny) Audio.play('rare');
  },
  update(dt){
    const P=G.player;
    for(let i=G.piles.length-1;i>=0;i--){
      const pl=G.piles[i];
      pl.t+=dt;
      pl.mesh.children[0].rotation.y+=dt*2;
      pl.mesh.children[0].position.y=0.3+Math.sin(pl.t*3)*0.08;
      pl.mesh.children[1].scale.setScalar((pl.shiny?1.6:1)+Math.sin(pl.t*2.5)*0.15);
      if(P.alive && P.mesh.position.distanceTo(pl.mesh.position)<1.6){
        this.collect(pl);
        G.scene.remove(pl.mesh);
        G.piles.splice(i,1);
      }
    }
  },
  collect(pl){
    let gold=0;
    for(const e of pl.entries){
      if(e.id==='_gold'){ gold+=e.qty; continue; }
      if(G.player.addItem(e.id, e.qty)){
        const it=ITEMS[e.id];
        const rar=it.rarity;
        UI.notifyLoot(it, e.qty, rar);
        Quests.onCollect(e.id, e.qty);
      }
    }
    if(gold>0){
      G.player.gold+=gold;
      UI.toast('+'+gold+' gold', 'q');
      Audio.play('coin');
    }
    UI.refreshHUD();
    Tutorial.note('loot');
  },
};

/* ---------------- QUESTS ---------------- */
const Quests = {
  accept(id){
    const q=QUESTS[id];
    if(!q || G.quests[id]) return;
    G.quests[id]={status:'active', prog:q.obj.map(()=>0)};
    UI.toast('New quest: '+q.name, 'q');
    Audio.play('quest');
    UI.refreshQuests();
    Tutorial.note('quest_accept');
  },
  progress(id, objIdx, amount){
    const st=G.quests[id];
    if(!st||st.status!=='active') return;
    const q=QUESTS[id];
    const obj=q.obj[objIdx];
    if(!obj) return;
    st.prog[objIdx]=Math.min(obj.n, st.prog[objIdx]+amount);
    UI.refreshQuests();
    if(this.allDone(id)) this.ready(id);
  },
  allDone(id){
    const q=QUESTS[id], st=G.quests[id];
    return q.obj.every((o,i)=>st.prog[i]>=o.n);
  },
  ready(id){
    if(G._ready[id]) return;
    G._ready[id]=true;
    const q=QUESTS[id];
    const giver=this.giverOf(id);
    if(!giver){ this.turnIn(id); return; }
    UI.toast('Quest ready: '+(NPCS[giver]? NPCS[giver].name+' — ':'')+q.name, 'q');
    Audio.play('quest');
  },
  giverOf(id){
    for(const k in NPCS){ const n=NPCS[k]; if(n.quest===id) return k; }
    const map={ q_first_steps:'arlen', q_class:'aldric', q_lost_supplies:'mira', q_relic:'arlen', q_herbs:'elara' };
    return map[id]||null;
  },
  turnIn(id, npcId){
    const q=QUESTS[id];
    const st=G.quests[id];
    if(!q||!st||st.status==='done'||!this.allDone(id)) return;
    st.status='done';
    delete G._ready[id];
    const r=q.reward||{};
    let msg='Quest complete: '+q.name;
    if(r.xp) msg+=' • +'+r.xp+' XP';
    if(r.gold){ G.player.gold+=r.gold; msg+=' • +'+r.gold+' gold'; }
    if(r.items) for(const it of r.items){ G.player.addItem(it.id, it.n||1); msg+=' • '+ITEMS[it.id].name; }
    UI.toast(msg, 'q');
    Audio.play('quest');
    if(r.xp) G.player.gainXp(r.xp);
    if(q.next) this.accept(q.next);
    if(id==='q_dragon_slayer') UI.showVictory();
    UI.refreshQuests(); UI.refreshHUD();
    Tutorial.note('quest_done');
    Save.save();
  },
  onKill(defId){
    for(const id in G.quests){
      const st=G.quests[id];
      if(st.status!=='active') continue;
      QUESTS[id].obj.forEach((o,i)=>{ if(o.kind==='kill'&&o.id===defId) this.progress(id,i,1); });
    }
  },
  onCollect(itemId, qty){
    for(const id in G.quests){
      const st=G.quests[id];
      if(st.status!=='active') continue;
      QUESTS[id].obj.forEach((o,i)=>{ if(o.kind==='collect'&&o.id===itemId) this.progress(id,i,qty); });
    }
  },
  onZoneEnter(zoneId){
    for(const id in G.quests){
      const st=G.quests[id];
      if(st.status!=='active') continue;
      QUESTS[id].obj.forEach((o,i)=>{ if(o.kind==='zone'&&o.id===zoneId) this.progress(id,i,1); });
    }
  },
  onTalk(npcId){
    for(const id in G.quests){
      const st=G.quests[id];
      if(st.status!=='active') continue;
      QUESTS[id].obj.forEach((o,i)=>{ if(o.kind==='talk'&&o.id===npcId) this.progress(id,i,1); });
    }
  },
  canOffer(id){
    const q=QUESTS[id];
    if(G.quests[id]) return false;
    if(q.main) return false; // main quests arrive through the chain automatically
    if(q.prereq && (!G.quests[q.prereq]||G.quests[q.prereq].status!=='done')) return false;
    return true;
  },
  npcState(npcId){
    // 'available' (new quest), 'complete' (ready to turn in), 'info'
    for(const id in QUESTS){
      if(this.giverOf(id)!==npcId) continue;
      const st=G.quests[id];
      if(!st){ if(this.canOffer(id)) return 'available'; }
      else if(st.status==='active' && this.allDone(id)) return 'complete';
    }
    if(npcId==='aldric' && G.quests['q_class'] && G.quests['q_class'].status==='active') return 'available';
    return 'info';
  },
  checkLevelGates(){},
  offerableFor(npcId){
    const out=[];
    for(const id in QUESTS){
      const q=QUESTS[id];
      if(this.giverOf(id)!==npcId) continue;
      if(this.canOffer(id)) out.push(id);
    }
    return out;
  },
  readyFor(npcId){
    const out=[];
    for(const id in G.quests){
      const st=G.quests[id];
      if(st.status==='active'&&this.allDone(id)&&this.giverOf(id)===npcId) out.push(id);
    }
    return out;
  },
  serialize(){ const o={}; for(const k in G.quests) o[k]=G.quests[k]; return o; },
};

/* ---------------- SHOP ---------------- */
const Shop = {
  buy(npcId, itemId){
    const it=ITEMS[itemId];
    const price=it.price;
    const P=G.player;
    if(P.gold<price){ UI.toast('Not enough gold','bad'); Audio.play('error'); return; }
    if(!P.addItem(itemId,1)){ return; }
    P.gold-=price;
    Audio.play('buy');
    UI.refreshHUD(); UI.openShop(npcId);
  },
  sell(idx){
    const P=G.player;
    const slot=P.inv[idx];
    if(!slot) return;
    const it=ITEMS[slot.id];
    if(it.type==='quest'){ UI.toast('That is a quest item','bad'); Audio.play('error'); return; }
    const gain=sellPrice(slot.id)*slot.qty;
    P.removeItem(slot.id, slot.qty);
    P.gold+=gain;
    Audio.play('sell');
    UI.toast('Sold '+it.name+' x'+slot.qty+' for '+gain+' gold');
    UI.refreshHUD(); UI.openShop(Shop.current);
  },
  current:null,
};

/* ---------------- DEPOT ---------------- */
const Depot = {
  deposit(idx){
    const P=G.player;
    const slot=P.inv[idx]; if(!slot) return;
    let target=P.depot.findIndex(s=>s && s.id===slot.id && ITEMS[slot.id].stack && s.qty<99);
    if(target<0) target=P.depot.findIndex(s=>!s);
    if(target<0){ UI.toast('Vault is full','bad'); return; }
    const ex=P.depot[target];
    if(ex){ ex.qty+=slot.qty; P.inv[idx]=null; }
    else { P.depot[target]={id:slot.id,qty:slot.qty}; P.inv[idx]=null; }
    Audio.play('coin'); UI.refreshDepot(); UI.refreshInventory();
  },
  withdraw(idx){
    const P=G.player;
    const slot=P.depot[idx]; if(!slot) return;
    if(!P.addItem(slot.id, slot.qty)) return;
    P.depot[idx]=null;
    Audio.play('coin'); UI.refreshDepot(); UI.refreshInventory();
  },
};

/* ---------------- SAVE (3 slots) ---------------- */
const SAVE_SLOTS=3;
const SAVE_PREFIX='eldoria_slot_';
const SETTINGS_KEY='eldoria_settings';
const LEGACY_SAVE_KEY='eldoria_save_v1';
const Save = {
  active:1,
  slotKey(n){ return SAVE_PREFIX+n; },
  has(n){ try{ return !!localStorage.getItem(this.slotKey(n||this.active)); }catch(e){ return false; } },
  hasAny(){ for(let i=1;i<=SAVE_SLOTS;i++){ if(this.has(i)) return true; } return false; },
  meta(n){
    try{
      const raw=localStorage.getItem(this.slotKey(n));
      if(!raw) return null;
      const data=JSON.parse(raw);
      if(!data||!data.player) return null;
      if(data.meta) return data.meta;
      return { name:data.player.name||'Hero', level:data.player.level||1, zone:(ZONES[data.zone]?ZONES[data.zone].name:'Asterfall'), playTime:data.playTime||0, savedAt:Date.now() };
    }catch(e){ return null; }
  },
  save(){
    if(!G.player||G.state==='title') return;
    try{
      const data={
        v:2, slot:this.active,
        meta:{ name:G.player.name, level:G.player.level, zone:(ZONES[G.zoneId]?ZONES[G.zoneId].name:G.zoneId), playTime:G.playTime, savedAt:Date.now() },
        player:G.player.serialize(),
        zone:G.zoneId, x:G.player.mesh.position.x, z:G.player.mesh.position.z,
        quests:Quests.serialize(), ready:G._ready,
        discovered:Array.from(G.discovered),
        openedChests:Array.from(G.openedChests),
        killedBosses:Array.from(G.killedBosses),
        settings:Settings, dayT:DayNight.t, playTime:G.playTime,
        tutorialDone:G.tutorial.done,
      };
      localStorage.setItem(this.slotKey(this.active), JSON.stringify(data));
      this.settingsSave();
      G.lastSave=0;
      return true;
    }catch(e){ console.warn('save failed', e); return false; }
  },
  load(slot){
    let data=null;
    try{
      const raw=localStorage.getItem(this.slotKey(slot||this.active));
      if(!raw) return false;
      data=JSON.parse(raw);
      if(!data||!data.player) return false;
    }catch(e){ this.del(slot||this.active); return false; }
    const P=G.player;
    Player.deserialize(data.player, P);
    G.quests=data.quests||{};
    G._ready=data.ready||{};
    G.discovered=new Set(data.discovered||['asterfall']);
    G.openedChests=new Set(data.openedChests||[]);
    G.killedBosses=new Set(data.killedBosses||[]);
    if(data.settings) Object.assign(Settings, data.settings);
    DayNight.t=data.dayT||0.28;
    G.playTime=data.playTime||0;
    G.tutorial.done=!!data.tutorialDone;
    Game.enterZone(data.zone&&ZONES[data.zone]?data.zone:'asterfall', 0,0, false, data.x, data.z);
    P.rebuildMesh();
    P.mesh.position.set(data.x!=null?data.x:28*TILE, 0, data.z!=null?data.z:28*TILE);
    P.pos.copy(P.mesh.position);
    if(!G.softCam) camera.position.set(P.mesh.position.x+16, 18, P.mesh.position.z+16);
    return true;
  },
  del(n){ try{ localStorage.removeItem(this.slotKey(n)); }catch(e){} },
  migrateLegacy(){
    try{
      if(!localStorage.getItem(LEGACY_SAVE_KEY)) return;
      if(this.has(1)){ localStorage.removeItem(LEGACY_SAVE_KEY); return; }
      const raw=localStorage.getItem(LEGACY_SAVE_KEY);
      const data=JSON.parse(raw);
      if(data&&data.player){
        data.v=2;
        data.meta={ name:data.player.name||'Hero', level:data.player.level||1, zone:(ZONES[data.zone]?ZONES[data.zone].name:'Asterfall'), playTime:data.playTime||0, savedAt:Date.now() };
        localStorage.setItem(this.slotKey(1), JSON.stringify(data));
      }
      localStorage.removeItem(LEGACY_SAVE_KEY);
    }catch(e){}
  },
  settingsSave(){ try{ localStorage.setItem(SETTINGS_KEY, JSON.stringify(Settings)); }catch(e){} },
  settingsLoad(){
    try{
      const raw=localStorage.getItem(SETTINGS_KEY);
      if(!raw) return;
      const s=JSON.parse(raw);
      if(s&&typeof s==='object') Object.assign(Settings, s);
    }catch(e){}
  },
};

/* ---------------- TUTORIAL ---------------- */
const Tutorial = {
  step:-1, active:false,
  start(){ if(G.tutorial.done){ return; } this.active=true; this.next(); },
  next(){
    this.step++;
    if(this.step>=TUTORIAL.length){ this.finish(); return; }
    UI.showTutorial(TUTORIAL[this.step].text);
  },
  finish(){ this.active=false; this.done=true; G.tutorial.done=true; UI.hideTutorial(); },
  note(evt){
    if(!this.active) return;
    const cur=TUTORIAL[this.step];
    if(!cur) return;
    let adv=false;
    switch(cur.id){
      case 't_move': adv = !!G.movedOnce; break;
      case 't_talk': adv = evt==='talk_arlen'; break;
      case 't_attack': adv = evt==='attack'; break;
      case 't_loot': adv = evt==='loot'; break;
      case 't_inv': adv = evt==='inventory_open'; break;
      case 't_quest': adv = evt==='quest_open'; break;
      case 't_shop': adv = evt==='shop_open'; break;
      case 't_class': adv = evt==='vocation_done'; break;
    }
    if(adv) this.next();
  },
};
