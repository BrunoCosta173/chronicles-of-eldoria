const puppeteer=require('puppeteer');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const page=await browser.newPage();
  await page.setViewport({width:1280,height:800});
  const errors=[];
  page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message));
  page.on('console',m=>{ if(m.type()==='error') errors.push('CONSOLE: '+m.text()); });
  await page.goto('http://localhost:8080/index.html',{waitUntil:'load'});
  await page.waitForFunction('Assets.ok && EnvAssets.ok',{timeout:30000});
  await sleep(2500);
  await page.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
  await page.click('#btn-new');
  await sleep(300);
  await page.click('#ng-create');
  await sleep(4000); // let assets load + onAssetsReady rebuild

  const a=await page.evaluate(()=>({
    assetsOk:Assets.ok, models:Object.keys(Assets.models),
    envOk:EnvAssets.ok, envModels:Object.keys(EnvAssets.models).length,
    playerAnim: !!G.player.anim,
    playerAnimActions: G.player.anim? Object.keys(G.player.anim.actions):[],
    npcAnim: G.npcs.filter(n=>n.anim).length+'/'+G.npcs.length,
  }));
  console.log('ASSETS/PLAYER/NPC:', JSON.stringify(a));

  // env props present in the town zone
  const envTown=await page.evaluate(()=>{
    let n=0; World.current.group.children.forEach(c=>{ if(c.userData && c.userData.env) n++; });
    return { zone:G.zoneId, envProps:n };
  });
  console.log('ENV TOWN:', JSON.stringify(envTown));

  // walk -> run state
  await page.keyboard.down('w'); await sleep(700);
  const runState=await page.evaluate(()=>G.player.anim && G.player.anim._cur);
  await page.keyboard.up('w'); await sleep(400);
  const idleState=await page.evaluate(()=>G.player.anim && G.player.anim._cur);
  console.log('MOVEMENT STATES: walking-then =>', runState, '/ idle =>', idleState);

  // equipped weapon visibility (only what is really equipped should show)
  const wep=await page.evaluate(()=>{
    const P=G.player;
    const vis=()=>{ const s=[]; P.mesh.traverse(o=>{ if(o.isMesh && WEAPON_MESHES.has(o.name) && o.visible) s.push(o.name); }); return s; };
    const before=vis();
    P.equip.weapon='rusty_sword'; P.rebuildGear(); const sword=vis();
    P.equip.shield='wooden_shield'; P.rebuildGear(); const withShield=vis();
    P.equip.weapon='short_bow'; P.equip.shield=null; P.rebuildGear(); const bow=vis();
    P.equip.weapon=null; P.rebuildGear(); const none=vis();
    return { before, sword, withShield, bow, none };
  });
  console.log('WEAPON VIS:', JSON.stringify(wep));

  // attack triggers anim
  const atk=await page.evaluate(async()=>{
    const rat=G.creatures.find(c=>c.defId==='cave_rat'&&c.alive);
    G.player.mesh.position.set(rat.mesh.position.x-1.6,0,rat.mesh.position.z);
    Game.setTarget(rat); G.player.t.atkCd=0;
    Combat.playerAttack(rat);
    await new Promise(r=>setTimeout(r,120));
    return G.player.anim && G.player.anim._cur;
  });
  console.log('ATTACK STATE:', atk);

  // death -> respawn while death clip still playing -> must stand back up
  const rev=await page.evaluate(async()=>{
    G.player.die(null);
    await new Promise(r=>setTimeout(r,80));
    G.player.respawn();
    await new Promise(r=>setTimeout(r,150));
    return { afterRespawn:G.player.anim && G.player.anim._cur, oneShot:!!(G.player.anim && G.player.anim._oneShot) };
  });
  await page.keyboard.down('w'); await sleep(600);
  const walkAfterDeath=await page.evaluate(()=>G.player.anim && G.player.anim._cur);
  await page.keyboard.up('w'); await sleep(300);
  console.log('RESPAWN AFTER DEATH:', JSON.stringify(rev), '/ walking =>', walkAfterDeath);

  // skeleton creature gets glTF in crypt
  const crypt=await page.evaluate(async()=>{
    Game.enterZone('forgotten_crypt',6,6);
    await new Promise(r=>setTimeout(r,600));
    const sk=G.creatures.filter(c=>c.zoneId==='forgotten_crypt' && (c.defId==='skeleton_warrior'||c.defId==='dark_mage'||c.defId==='crypt_guardian'));
    return { count:sk.length, withAnim:sk.filter(c=>c.anim).length };
  });
  console.log('CRYPT SKELETONS:', JSON.stringify(crypt));

  // birds spawn in outdoor zone
  const birds=await page.evaluate(async()=>{
    Game.enterZone('greenfields',10,10);
    await new Promise(r=>setTimeout(r,500));
    return G.birds.length;
  });
  console.log('BIRDS in greenfields:', birds);

  // screenshot town with animated knight
  await page.evaluate(()=>{ Game.enterZone('asterfall',28,26); });
  await sleep(1200);
  await page.screenshot({path:'v2_town.png'});
  // screenshot crypt skeletons
  await page.evaluate(()=>{
    Game.enterZone('forgotten_crypt',20,14);
    const sk=G.creatures.find(c=>c.zoneId==='forgotten_crypt'&&c.defId==='skeleton_warrior');
    if(sk){ G.player.mesh.position.set(sk.mesh.position.x-4,0,sk.mesh.position.z); }
  });
  await sleep(1000);
  await page.screenshot({path:'v2_crypt.png'});

  console.log('ERRORS('+errors.length+'):');
  for(const e of errors.slice(0,15)) console.log('  '+e);

  await browser.close();
})().catch(e=>{ console.error('HARNESS FAIL', e); process.exit(1); });
