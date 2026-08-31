'use strict';
/* fetch-creature-assets.js - one-time downloader for CC0 Quaternius monster/animal glTFs.
   Source: github.com/trebeljahr/quaternius-showcase (Quaternius CC0 packs as .glb, raw-downloadable). */
const https=require('https'), fs=require('fs'), path=require('path');
const OUT=path.join(__dirname,'assets');
const BASE='https://raw.githubusercontent.com/trebeljahr/quaternius-showcase/main/public/glb/';
const MAP = {
  'Q_Rat.glb':'easy_enemies_pack/Rat.glb',
  'Q_Snake.glb':'easy_enemies_pack/Snake.glb',
  'Q_Spider.glb':'easy_enemies_pack/Spider.glb',
  'Q_Wolf.glb':'animals_pack/Wolf.glb',
  'Q_Witch.glb':'modular_women/Witch.glb',
};
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
    step(tries||4);
  });
}
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  let done=0, skip=0, fail=0;
  for(const [name,rel] of Object.entries(MAP)){
    const dest=path.join(OUT,name);
    if(fs.existsSync(dest) && fs.statSync(dest).size>0){ skip++; continue; }
    try{ await get(BASE+rel,dest,4); done++; process.stdout.write('.'); }
    catch(e){ fail++; console.log('\nFAIL '+rel); try{ if(fs.existsSync(dest)) fs.unlinkSync(dest);}catch(_){} }
  }
  console.log('\ndownloaded:'+done+' skipped:'+skip+' failed:'+fail+' total:'+Object.keys(MAP).length);
  if(fail) process.exit(1);
})();
