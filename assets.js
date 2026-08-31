'use strict';
/* =========================================================
   assets.js — glTF character/creature models + animation
   system (KayKit CC0 packs). Downloaded assets are REQUIRED:
   the game refuses to start if any manifest entry fails to
   load (run `node fetch-env-assets.js` to (re)fetch them).
   ========================================================= */

const ASSET_MANIFEST = {
  knight:'assets/Knight.glb', rogue:'assets/Rogue.glb', mage:'assets/Mage.glb', barbarian:'assets/Barbarian.glb',
  skeleton_warrior:'assets/Skeleton_Warrior.glb', skeleton_mage:'assets/Skeleton_Mage.glb',
  parrot:'assets/Parrot.glb', flamingo:'assets/Flamingo.glb', stork:'assets/Stork.glb',
  q_rat:'assets/Q_Rat.glb', q_snake:'assets/Q_Snake.glb', q_spider:'assets/Q_Spider.glb',
  q_wolf:'assets/Q_Wolf.glb', q_witch:'assets/Q_Witch.glb', q_deer:'assets/Q_Deer.glb',
  m_orc:'assets/M_Orc.gltf', m_orcskull:'assets/M_OrcSkull.gltf', m_tribal:'assets/M_Tribal.gltf',
  m_wizard:'assets/M_Wizard.gltf', m_dragon:'assets/M_Dragon.gltf', m_goleling:'assets/M_Goleling.gltf',
  m_yeti:'assets/M_Yeti.gltf', m_demon:'assets/M_Demon.gltf', m_bluedemon:'assets/M_BlueDemon.gltf',
  m_ghost:'assets/M_Ghost.gltf', m_dino:'assets/M_Dino.gltf', m_alien:'assets/M_Alien.gltf',
  m_frog:'assets/M_Frog.gltf',
};
const CLASS_MODEL   = { adventurer:'rogue', vanguard:'knight', ranger:'rogue', arcanist:'mage', warden:'barbarian' };
const NPC_MODEL     = { arlen:'knight', aldric:'mage', borin:'barbarian', elara:'mage', mira:'rogue', rowan:'rogue', talia:'knight' };
const CREATURE_MODEL= { skeleton_warrior:'skeleton_warrior', dark_mage:'skeleton_mage', crypt_guardian:'skeleton_mage',
  cave_rat:'q_rat', giant_spider:'q_spider', dire_wolf:'q_wolf', swamp_hag:'m_wizard',
  orc_raider:'m_orc', goblin_chieftain:'m_orc', goblin_scout:'m_tribal', goblin_warrior:'m_orcskull',
  goblin_shaman:'m_wizard', ancient_dragon:'m_dragon', stone_golem:'m_goleling', troll:'m_yeti',
  wyvern:'m_dragon', minotaur:'m_yeti', wild_boar:'q_deer' };
const BIRD_MODEL    = { town:'parrot', fields:'stork', forest:'parrot', swamp:'flamingo', ruins:'stork', snow:'stork', volcanic:'flamingo' };
const BIRD_KEYS     = ['parrot','flamingo','stork']; // native units are huge; normalized at load
const MONSTER_KEYS  = ['q_rat','q_snake','q_spider','q_wolf','q_witch','q_deer',
  'm_orc','m_orcskull','m_tribal','m_wizard','m_dragon','m_goleling','m_yeti',
  'm_demon','m_bluedemon','m_ghost','m_dino','m_alien','m_frog']; // Quaternius CC0 monsters
const UNIT_KEYS     = [...BIRD_KEYS, ...MONSTER_KEYS];
// per-model animation clip names (generic state -> asset clip). Quaternius clip names differ from KayKit.
const MODEL_ANIM = {
  q_rat:   { idle:'RatArmature|Rat_Idle', walk:'RatArmature|Rat_Walk', run:'RatArmature|Rat_Run',
             attack:'RatArmature|Rat_Attack', attack2:'RatArmature|Rat_Attack', cast:'RatArmature|Rat_Attack',
             shoot:'RatArmature|Rat_Attack', hit:'RatArmature|Rat_Attack', death:'RatArmature|Rat_Death' },
  q_snake: { idle:'SnakeArmature|Snake_Idle', walk:'SnakeArmature|Snake_Walk',
             attack:'SnakeArmature|Snake_Attack', attack2:'SnakeArmature|Snake_Attack', cast:'SnakeArmature|Snake_Attack',
             shoot:'SnakeArmature|Snake_Attack', hit:'SnakeArmature|Snake_Attack' },
  q_spider:{ idle:'SpiderArmature|Spider_Idle', walk:'SpiderArmature|Spider_Walk',
             attack:'SpiderArmature|Spider_Attack', attack2:'SpiderArmature|Spider_Attack', cast:'SpiderArmature|Spider_Attack',
             shoot:'SpiderArmature|Spider_Attack', hit:'SpiderArmature|Spider_Attack', death:'SpiderArmature|Spider_Death' },
  q_wolf:  { idle:'AnimalArmature|Idle', walk:'AnimalArmature|Walk', run:'AnimalArmature|Gallop', attack:'AnimalArmature|Attack', attack2:'AnimalArmature|Attack', cast:'AnimalArmature|Attack',
             shoot:'AnimalArmature|Attack', hit:'AnimalArmature|Idle_HitReact_Left', death:'AnimalArmature|Death' },
  q_witch: {},
  m_orc:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_orcskull:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_tribal:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_yeti:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_demon:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_bluedemon:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_dino:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_alien:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  m_frog:{ idle:'Idle', walk:'Walk', run:'Run', attack:'Punch', attack2:'Weapon', cast:'Punch', shoot:'Punch', hit:'HitReact', death:'Death' },
  q_deer:{ idle:'AnimalArmature|Idle', walk:'AnimalArmature|Walk', run:'AnimalArmature|Gallop', attack:'AnimalArmature|Attack_Headbutt', attack2:'AnimalArmature|Attack_Kick', cast:'AnimalArmature|Attack_Headbutt', shoot:'AnimalArmature|Attack_Headbutt', hit:'AnimalArmature|Idle_HitReact_Left', death:'AnimalArmature|Death' },
  m_wizard:{ idle:'Idle', walk:'Walk', run:'Walk', attack:'Bite_Front', attack2:'Yes', cast:'Yes', shoot:'Yes', hit:'HitRecieve', death:'Death' },
  m_dragon:{ idle:'Flying_Idle', walk:'Fast_Flying', run:'Fast_Flying', attack:'Headbutt', attack2:'Punch', cast:'Headbutt', shoot:'Headbutt', hit:'HitReact', death:'Death' },
  m_goleling:{ idle:'Flying_Idle', walk:'Fast_Flying', run:'Fast_Flying', attack:'Headbutt', attack2:'Punch', cast:'Headbutt', shoot:'Headbutt', hit:'HitReact', death:'Death' },
  m_ghost:{ idle:'Flying_Idle', walk:'Fast_Flying', run:'Fast_Flying', attack:'Headbutt', attack2:'Punch', cast:'Headbutt', shoot:'Headbutt', hit:'HitReact', death:'Death' },
};
// normalizing scale so a native-miniscule monster renders near defScale in world units
function monsterScale(key, mk, defScale){
  if(MONSTER_KEYS.indexOf(key)<0) return defScale*1.1;
  return (2.6/(mk.nativeMax||1))*defScale;
}

/* -------- weapon meshes baked into the glTF rigs (show only what's equipped) -------- */
const WEAPON_MESHES = new Set([
  '1H_Sword','2H_Sword','1H_Sword_Offhand','1H_Axe','2H_Axe','1H_Axe_Offhand',
  '1H_Crossbow','2H_Crossbow','1H_Wand','2H_Staff','Knife','Knife_Offhand','Throwable',
  'Spellbook','Spellbook_open','Mug',
  'Badge_Shield','Rectangle_Shield','Round_Shield','Spike_Shield','Barbarian_Round_Shield',
]);
const WEAPON_PREF  = {
  sword:['1H_Sword','1H_Axe','2H_Sword','Knife'],
  axe:  ['1H_Axe','2H_Axe','1H_Sword','2H_Sword'],
  bow:  ['1H_Crossbow','2H_Crossbow'],
  staff:['2H_Staff','1H_Wand'],
};
const OFFHAND_PREF = { sword:'1H_Sword_Offhand', axe:'1H_Axe_Offhand' };
const SHIELD_PREF  = ['Round_Shield','Barbarian_Round_Shield','Spike_Shield','Rectangle_Shield','Badge_Shield'];
const NPC_LOADOUT  = { knight:['sword',true], barbarian:['axe',true], mage:['staff',false], rogue:['bow',false] };
function hideWeapons(root){ root.traverse(o=>{ if(o.isMesh && WEAPON_MESHES.has(o.name)) o.visible=false; }); }
function applyLoadout(root, wkind, shield){
  hideWeapons(root);
  const pick=(names)=>{ let m=null; root.traverse(o=>{ if(!m && o.isMesh && names.indexOf(o.name)>=0) m=o; }); return m; };
  const w = wkind ? pick(WEAPON_PREF[wkind]||[]) : null;
  if(w) w.visible=true;
  if(shield){ const s=pick(SHIELD_PREF); if(s) s.visible=true; }
  else if(wkind && OFFHAND_PREF[wkind]){ const o=pick([OFFHAND_PREF[wkind]]); if(o) o.visible=true; }
}

const Assets = {
  ok:false, pending:0, models:{}, failed:[],
  _report(missing, cb){
    if(this._reported) return;
    this._reported=true;
    this.failed=missing;
    this.ok=missing.length===0;
    if(window.Game && cb) cb.call(Game, this.failed.slice());
  },
  loadAll(){
    if(!window.THREE || !THREE.GLTFLoader){ this._report(['GLTFLoader'], Game.onAssetsError); return; }
    const L=new THREE.GLTFLoader();
    const keys=Object.keys(ASSET_MANIFEST);
    this.pending=keys.length;
    const finish=()=>{
      this.pending--;
      if(this.pending<=0){
        const missing=keys.filter(k=>!this.models[k]);
        this._report(missing, missing.length? Game.onAssetsError : Game.onAssetsReady);
      }
    };
    for(const k of keys){
      try{
        L.load(ASSET_MANIFEST[k], (gltf)=>{
          const root=gltf.scene;
          root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; o.frustumCulled=false; } });
          hideWeapons(root);
          let nativeMax=1;
          if(UNIT_KEYS.indexOf(k)>=0){
            root.updateWorldMatrix(true,true);
            const box=new THREE.Box3().setFromObject(root);
            const size=box.getSize(new THREE.Vector3());
            nativeMax=Math.max(size.x,size.y,size.z)||1;
          }
          this.models[k]={scene:root, clips:gltf.animations, nativeMax, key:k};
          finish();
        }, undefined, ()=>{ console.warn('asset failed:',k); finish(); });
      }catch(e){ console.warn('asset failed:',k,e); finish(); }
    }
  },
  model(key){ return this.ok? this.models[key] : null; },
  monsterScale: monsterScale,
};

/* ---------------- environment props (KayKit CC0 dungeon/hexagon/halloween) ---------------- */
const ENV_MANIFEST = {
  torch:'env/torch.gltf.glb', torch_lit:'env/torch_lit.gltf.glb', torch_mounted:'env/torch_mounted.gltf.glb',
  candle_lit:'env/candle_lit.gltf.glb', chest:'env/chest.glb', chest_gold:'env/chest_gold.glb',
  barrel_small:'env/barrel_small.gltf.glb', barrel_large:'env/barrel_large.gltf.glb',
  box_large:'env/box_large.gltf.glb', crates_stacked:'env/crates_stacked.gltf.glb',
  pillar:'env/pillar.gltf.glb', pillar_decorated:'env/pillar_decorated.gltf.glb', column:'env/column.gltf.glb',
  rubble_large:'env/rubble_large.gltf.glb', rubble_half:'env/rubble_half.gltf.glb',
  trunk_small:'env/trunk_small_A.gltf.glb', trunk_medium:'env/trunk_medium_A.gltf.glb', trunk_large:'env/trunk_large_A.gltf.glb',
  bottle:'env/bottle_A_green.gltf.glb', sword_shield_broken:'env/sword_shield_broken.gltf.glb',
  key:'env/key.gltf.glb', stairs:'env/stairs.gltf.glb', barrier:'env/barrier.gltf.glb',
  tree_dead_large:'env/tree_dead_large.gltf', tree_dead_medium:'env/tree_dead_medium.gltf', tree_dead_small:'env/tree_dead_small.gltf',
  grave:'env/grave_A.gltf', gravestone:'env/gravestone.gltf', arch:'env/arch.gltf',
  ribcage:'env/ribcage.gltf', skull:'env/skull.gltf', bone:'env/bone_A.gltf', coffin:'env/coffin.gltf',
  fence:'env/fence.gltf', fence_gate:'env/fence_gate.gltf', post_lantern:'env/post_lantern.gltf', pumpkin:'env/pumpkin_orange.gltf',
  tree_a:'env/tree_single_A.gltf', tree_b:'env/tree_single_B.gltf', tree_cut:'env/tree_single_A_cut.gltf',
  rock_a:'env/rock_single_A.gltf', rock_b:'env/rock_single_B.gltf', rock_c:'env/rock_single_C.gltf',
  rock_d:'env/rock_single_D.gltf', rock_e:'env/rock_single_E.gltf',
  waterlily:'env/waterlily_A.gltf', waterplant:'env/waterplant_A.gltf',
  barrel_m:'env/barrel.gltf', crate_big:'env/crate_A_big.gltf', crate_small:'env/crate_B_small.gltf',
  sack:'env/sack.gltf', pallet:'env/pallet.gltf', tent:'env/tent.gltf',
  b_home:'env/building_home_A_blue.gltf', b_tavern:'env/building_tavern_blue.gltf', b_well:'env/building_well_blue.gltf',
  b_blacksmith:'env/building_blacksmith_blue.gltf', b_church:'env/building_church_blue.gltf',
  b_market:'env/building_market_blue.gltf', b_tower:'env/building_tower_A_blue.gltf',
};
const EnvAssets = {
  ok:false, pending:0, models:{}, failed:[],
  _report(missing, cb){
    if(this._reported) return;
    this._reported=true;
    this.failed=missing;
    this.ok=missing.length===0;
    if(window.Game && cb) cb.call(Game, this.failed.slice());
  },
  loadAll(){
    if(!window.THREE || !THREE.GLTFLoader){ this._report(['GLTFLoader'], Game.onEnvError); return; }
    const L=new THREE.GLTFLoader();
    const keys=Object.keys(ENV_MANIFEST);
    this.pending=keys.length;
    const finish=()=>{
      this.pending--;
      if(this.pending<=0){
        const missing=keys.filter(k=>!this.models[k]);
        this._report(missing, missing.length? Game.onEnvError : Game.onEnvReady);
      }
    };
    for(const k of keys){
      try{
        L.load('assets/'+ENV_MANIFEST[k], (gltf)=>{
          const root=gltf.scene;
          root.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=false; } });
          this.models[k]={scene:root};
          finish();
        }, undefined, ()=>{ console.warn('env asset failed:',k); finish(); });
      }catch(e){ console.warn('env asset failed:',k,e); finish(); }
    }
  },
  model(key){ return this.ok? this.models[key] : null; },
  instance(key, scale){
    const m=this.model(key); if(!m) return null;
    const o=THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(m.scene) : m.scene.clone(true);
    if(scale) o.scale.setScalar(scale);
    return o;
  },
};

/* ---------------- AnimUnit: mixer + named state machine ---------------- */
const ANIM_WANT = {
  idle:'Idle', walk:'Walking_A', run:'Running_A',
  attack:'1H_Melee_Attack_Chop', attack2:'1H_Melee_Attack_Slice_Diagonal',
  cast:'Spellcast_Shoot', shoot:'1H_Ranged_Shoot',
  hit:'Hit_A', death:'Death_A',
};
class AnimUnit {
  constructor(model, scale){
    this.root = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(model.scene) : model.scene.clone(true);
    this.root.scale.setScalar(scale||1);
    this.mixer = new THREE.AnimationMixer(this.root);
    const byName={}; for(const c of model.clips) byName[c.name]=c;
    this.actions={};
    const want=MODEL_ANIM[model.key]||ANIM_WANT;
    for(const k in want){ const c=byName[want[k]]; if(c) this.actions[k]=this.mixer.clipAction(c); }
    this.base='idle'; this._oneShot=null;
    if(!Object.keys(this.actions).length && model.clips.length){
      const a=this.mixer.clipAction(model.clips[0]);
      a.play(); this._cur='__auto';
    }
    this.mixer.addEventListener('finished', (e)=>{
      if(this._oneShot && e.action===this._oneShot){
        const keep=this._keepLast; this._oneShot=null;
        if(!keep) this.setState(this.base);
      }
    });
  }
  setState(name){
    if(this._oneShot) return;
    if(name===this._cur) return;
    this.base=name; this._play(name, false);
  }
  cancel(){
    if(!this._oneShot) return;
    const a=this._oneShot; this._oneShot=null;
    a.clampWhenFinished=false; a.stop();
  }
  trigger(name, keepLast){
    const a=this.actions[name]; if(!a) return;
    this._keepLast=!!keepLast;
    this._play(name, true);
    this._oneShot=a;
  }
  _play(name, once){
    const a=this.actions[name]; if(!a) return;
    if(this._cur===name && !once) return;
    a.reset(); a.paused=false; a.enabled=true;
    a.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat, once?1:Infinity);
    a.clampWhenFinished=once;
    const prev=this.actions[this._cur];
    if(prev && prev!==a && prev.isRunning()){ a.crossFadeFrom(prev, once?0.12:0.2, false); }
    else a.fadeIn(0.15);
    a.play();
    this._cur=name;
  }
  update(dt){ this.mixer.update(dt); }
}
