'use strict';
/* fetch-env-assets.js — one-time downloader for CC0 KayKit environment props.
   Sources (all CC0, github.com/KayKit-Game-Assets):
     - Dungeon Remastered  (self-contained .glb)
     - Halloween Bits      (.gltf + .bin + atlas png)
     - Medieval Hexagon    (.gltf + .bin + atlas png)  */
const https=require('https'), fs=require('fs'), path=require('path');
const OUT=path.join(__dirname,'assets','env');
const DK='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Dungeon-Remastered-1.0/main/addons/kaykit_dungeon_remastered/Assets/gltf/';
const HW='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Halloween-Bits-1.0/main/addons/kaykit_halloween_bits/Assets/gltf/';
const NX='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/nature/';
const PR='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/decoration/props/';
const BD='https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0/main/addons/kaykit_medieval_hexagon_pack/Assets/gltf/buildings/blue/';

const DUNGEON=['torch','torch_lit','torch_mounted','candle_lit','chest','chest_gold','barrel_small','barrel_large',
  'box_large','crates_stacked','pillar','pillar_decorated','column','rubble_large','rubble_half',
  'trunk_small_A','trunk_medium_A','trunk_large_A','bottle_A_green','sword_shield_broken','key','stairs','barrier']
  .map(n=>DK+n+(n==='chest'||n==='chest_gold' ? '.glb' : '.gltf.glb'));

const pair=(base,ns)=>ns.flatMap(n=>[base+n+'.gltf', base+n+'.bin']);
const HALLOWEEN=pair(HW,['tree_dead_large','tree_dead_medium','tree_dead_small','grave_A','gravestone','arch',
  'ribcage','skull','bone_A','coffin','fence','fence_gate','post_lantern','pumpkin_orange']).concat([HW+'halloweenbits_texture.png']);
const NATURE=pair(NX,['tree_single_A','tree_single_B','tree_single_A_cut','rock_single_A','rock_single_B','rock_single_C',
  'rock_single_D','rock_single_E','waterlily_A','waterplant_A']).concat([NX+'hexagons_medieval.png']);
const PROPS=pair(PR,['barrel','crate_A_big','crate_B_small','sack','pallet','tent']);
const BUILDINGS=pair(BD,['building_home_A_blue','building_tavern_blue','building_well_blue','building_blacksmith_blue',
  'building_church_blue','building_market_blue','building_tower_A_blue']);

const ALL=[...DUNGEON,...HALLOWEEN,...NATURE,...PROPS,...BUILDINGS];

function get(url,dest,tries){
  return new Promise((res,rej)=>{
    const step=n=>{
      if(n<=0) return rej(new Error('fail '+url));
      https.get(url,{timeout:20000},r=>{
        if(r.statusCode===301||r.statusCode===302) return step(n-1), r.resume(), void get(r.headers.location,dest,tries).then(res,rej);
        if(r.statusCode!==200){ r.resume(); return setTimeout(()=>step(n-1),400); }
        const ws=fs.createWriteStream(dest);
        r.pipe(ws); ws.on('finish',()=>ws.close(res)); ws.on('error',rej);
      }).on('error',()=>setTimeout(()=>step(n-1),400)).on('timeout',function(){ this.destroy(); step(n-1); });
    };
    step(tries||3);
  });
}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  let done=0, skip=0, fail=0;
  for(const url of ALL){
    const name=path.basename(url), dest=path.join(OUT,name);
    if(fs.existsSync(dest) && fs.statSync(dest).size>0){ skip++; continue; }
    try{ await get(url,dest,4); done++; process.stdout.write('.'); }
    catch(e){ fail++; console.log('\nFAIL '+url); fs.existsSync(dest)&&fs.unlinkSync(dest); }
  }
  console.log('\ndownloaded:'+done+' skipped:'+skip+' failed:'+fail+' total:'+ALL.length);
  if(fail) process.exit(1);
})();
