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
  await sleep(1500);

  // 1. title screen state: world behind, orbit camera, fireflies
  const t1=await page.evaluate(()=>({
    titleVisible: !$('title-screen').classList.contains('hidden'),
    worldLoaded: !!World.current,
    worldProps: World.current ? World.current.group.children.length : 0,
    creatures: G.creatures.length,
    npcs: G.npcs.length,
    birds: G.birds.length,
    fireflies: TitleFX.pts ? TitleFX.pts.geometry.attributes.position.count : 0,
    state: G.state,
  }));
  console.log('TITLE BACKDROP:', JSON.stringify(t1));
  const cam1=await page.evaluate(()=>({x:Math.round(camera.position.x),y:Math.round(camera.position.y),z:Math.round(camera.position.z)}));
  await sleep(1500);
  const cam2=await page.evaluate(()=>({x:Math.round(camera.position.x),y:Math.round(camera.position.y),z:Math.round(camera.position.z)}));
  console.log('ORBIT MOVING:', JSON.stringify(cam1), '->', JSON.stringify(cam2), 'moved:', cam1.x!==cam2.x||cam1.z!==cam2.z);
  await page.screenshot({path:'v3_title.png'});

  // 2. NEW GAME modal: empty slots, create in slot 1
  await page.click('#btn-new');
  await sleep(300);
  const t2=await page.evaluate(()=>({
    modalOpen: !$('newgame-modal').classList.contains('hidden'),
    cards: document.querySelectorAll('#ng-slots .slot-card').length,
    emptyCards: document.querySelectorAll('#ng-slots .slot-card.empty').length,
    selected: document.querySelectorAll('#ng-slots .slot-card.selected').length,
    fullMsgHidden: $('ng-full-msg').classList.contains('hidden'),
    createDisabled: $('ng-create').disabled,
  }));
  console.log('NEW MODAL:', JSON.stringify(t2));
  await page.evaluate(()=>{ $('ng-name').value='Bruno'; });
  await page.click('#ng-create');
  await sleep(4500);
  const t3=await page.evaluate(()=>({
    state:G.state, name:G.player&&G.player.name, slot:Save.active,
    titleHidden: $('title-screen').classList.contains('hidden'),
    hudVisible: !$('hud').classList.contains('hidden'),
    firefliesHidden: TitleFX.pts ? !TitleFX.pts.visible : 'n/a',
  }));
  console.log('AFTER CREATE:', JSON.stringify(t3));

  // 3. save exists in slot 1 with meta
  const t4=await page.evaluate(()=>({ meta:Save.meta(1), hasAny:Save.hasAny() }));
  console.log('SLOT1 META:', JSON.stringify(t4));

  // 4. reload -> title -> LOAD modal shows slot 1 -> load it
  await page.reload({waitUntil:'load'});
  await page.waitForFunction('Assets.ok && EnvAssets.ok && !$("btn-new").disabled',{timeout:30000});
  await sleep(1500);
  const t5=await page.evaluate(()=>({ loadDisabled:$('btn-load').disabled }));
  console.log('AFTER RELOAD loadDisabled:', JSON.stringify(t5));
  await page.click('#btn-load');
  await sleep(300);
  const t6=await page.evaluate(()=>({
    modalOpen: !$('load-modal').classList.contains('hidden'),
    occupied: document.querySelectorAll('#load-slots .slot-card.occupied').length,
    firstName: (document.querySelector('#load-slots .slot-card.occupied .sc-name')||{}).textContent,
  }));
  console.log('LOAD MODAL:', JSON.stringify(t6));
  await page.click('#load-slots .slot-card.occupied');
  await sleep(4000);
  const t7=await page.evaluate(()=>({ state:G.state, name:G.player&&G.player.name, slot:Save.active }));
  console.log('AFTER LOAD:', JSON.stringify(t7));

  // 5. fill slots 2 and 3 -> new-game modal shows FULL message + create disabled + delete works
  await page.evaluate(()=>{
    localStorage.setItem('eldoria_slot_2', JSON.stringify({v:2,player:{name:'Kai',level:3},zone:'asterfall',meta:{name:'Kai',level:3,zone:'Asterfall',playTime:500,savedAt:Date.now()}}));
    localStorage.setItem('eldoria_slot_3', JSON.stringify({v:2,player:{name:'Rex',level:5},zone:'asterfall',meta:{name:'Rex',level:5,zone:'Asterfall',playTime:900,savedAt:Date.now()}}));
  });
  await page.reload({waitUntil:'load'});
  await page.waitForFunction('Assets.ok && EnvAssets.ok && !$("btn-new").disabled',{timeout:30000});
  await sleep(1500);
  await page.click('#btn-new');
  await sleep(300);
  const t8=await page.evaluate(()=>({
    cards: document.querySelectorAll('#ng-slots .slot-card').length,
    occupied: document.querySelectorAll('#ng-slots .slot-card.occupied').length,
    fullMsgVisible: !$('ng-full-msg').classList.contains('hidden'),
    createDisabled: $('ng-create').disabled,
  }));
  console.log('FULL STATE:', JSON.stringify(t8));
  await page.screenshot({path:'v3_full.png'});
  // delete slot 2 -> create becomes possible again
  await page.evaluate(()=>{ document.querySelectorAll('#ng-slots .slot-card.occupied .sc-del')[1].click(); });
  await sleep(300);
  await page.evaluate(()=>{ $('confirm-yes').click(); });
  await sleep(400);
  const t9=await page.evaluate(()=>({
    slot2Gone: !localStorage.getItem('eldoria_slot_2'),
    fullMsgHidden: $('ng-full-msg').classList.contains('hidden'),
    createDisabled: $('ng-create').disabled,
    selected: document.querySelectorAll('#ng-slots .slot-card.selected').length,
  }));
  console.log('AFTER DELETE:', JSON.stringify(t9));

  // 6. settings global persistence
  const t10=await page.evaluate(()=>{
    Settings.volume=0.35; syncSettings();
    return JSON.parse(localStorage.getItem('eldoria_settings')).volume;
  });
  console.log('SETTINGS GLOBAL volume:', t10);

  // 7. ESC closes modal
  await page.keyboard.press('Escape');
  await sleep(200);
  const t11=await page.evaluate(()=>({ closed: $('newgame-modal').classList.contains('hidden') }));
  console.log('ESC CLOSES:', JSON.stringify(t11));

  console.log('ERRORS('+errors.length+'):');
  for(const e of errors.slice(0,12)) console.log('  '+e);
  await browser.close();
})().catch(e=>{ console.error('HARNESS FAIL', e); process.exit(1); });
