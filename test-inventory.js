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
  await page.waitForFunction('Assets.ok && EnvAssets.ok && !$("btn-new").disabled',{timeout:120000});
  await sleep(1500);
  await page.click('#btn-new'); await sleep(300);
  await page.click('#ng-create'); await sleep(4500);

  // 1. inventory has 16 slots
  const s1=await page.evaluate(()=>{ UI.togglePanel('panel-inventory'); return true; });
  await sleep(300);
  const inv=await page.evaluate(()=>({
    slots:G.player.inv.length,
    cells:document.querySelectorAll('#inv-grid .inv-cell').length,
    countText:$('inv-count').textContent,
    capText:$('inv-cap-text').textContent,
    sortBtn:!!$('btn-sort'),
  }));
  console.log('INV SLOTS:', JSON.stringify(inv));

  // give the player a potion + weapon + a stack for tests
  await page.evaluate(()=>{
    const P=G.player;
    P.inv=new Array(16).fill(null);
    P.addItem('minor_potion',5);
    P.addItem('rusty_sword',1);
    P.addItem('bread',20);
    P.addItem('wolf_pelt',3);
    UI.refreshInventory();
  });
  await sleep(200);
  const nonEmpty=await page.evaluate(()=>Array.from(document.querySelectorAll('#inv-grid .inv-cell.filled, #inv-grid .inv-cell.r-')).length);
  console.log('NON-EMPTY CELLS:', nonEmpty);

  // 2. moveItem: drag slot0(potion) onto slot1(empty via direct API) — we test moveItem directly
  const s2=await page.evaluate(()=>{
    const P=G.player;
    const from=P.inv.findIndex(s=>s&&s.id==='minor_potion');
    const to=P.inv.findIndex(s=>!s);
    const ok=P.moveItem(from,to);
    return {ok, from:P.inv[from], to:P.inv[to]&&P.inv[to].id};
  });
  console.log('MOVEITEM:', JSON.stringify(s2));

  // 3. splitItem: split a 20-stack into an empty slot (max 16)
  const s3=await page.evaluate(()=>{
    const P=G.player;
    const from=P.inv.findIndex(s=>s&&s.id==='bread'&&s.qty===20);
    const to=P.inv.findIndex(s=>!s);
    const ok=P.splitItem(from,to,10);
    return {ok, fromQ:P.inv[from]&&P.inv[from].qty, toQ:P.inv[to]&&P.inv[to].qty};
  });
  console.log('SPLIT10:', JSON.stringify(s3));

  // 4. splitItem caps at 16
  const s4=await page.evaluate(()=>{
    const P=G.player;
    const breadIdx=P.inv.findIndex(s=>s&&s.id==='bread'&&s.qty===10);
    const to=P.inv.findIndex(s=>!s);
    const ok=P.splitItem(breadIdx,to,30);
    return {ok, fromQ:P.inv[breadIdx]&&P.inv[breadIdx].qty, toQ:P.inv[to]&&P.inv[to].qty};
  });
  console.log('SPLITCAP16:', JSON.stringify(s4));

  // 5. equip via Drag.equip() — drop weapon onto weapon eq-cell
  const s5=await page.evaluate(()=>{
    const P=G.player;
    const wIdx=P.inv.findIndex(s=>s&&s.id==='rusty_sword');
    const eq=document.querySelector('.eq-cell[data-slot="weapon"]');
    Drag.src={kind:'inv',idx:wIdx}; Drag.item={id:'rusty_sword',qty:1}; Drag.qty=1;
    const ok=Drag.equip(eq);
    return {ok, equipped:P.equip.weapon, stillInInv:!!P.inv[wIdx]};
  });
  console.log('EQUIP:', JSON.stringify(s5));

  // 6. deposit via Drag.deposit()
  const s6=await page.evaluate(()=>{
    const P=G.player;
    const pIdx=P.inv.findIndex(s=>s&&s.id==='wolf_pelt');
    Drag.src={kind:'inv',idx:pIdx}; Drag.item={id:'wolf_pelt',qty:3}; Drag.qty=3;
    const ok=Drag.deposit(0);
    return {ok, depot:P.depot[0], invLeft:!!P.inv[pIdx]};
  });
  console.log('DEPOSIT:', JSON.stringify(s6));

  // 7. sell via Drag.sell() (quest blocked, material ok)
  const s7=await page.evaluate(()=>{
    const P=G.player;
    P.addItem('supply_crate',1); // quest item
    const goldBefore=P.gold;
    const crateIdx=P.inv.findIndex(s=>s&&s.id==='supply_crate');
    Drag.src={kind:'inv',idx:crateIdx}; Drag.item={id:'supply_crate',qty:1}; Drag.qty=1;
    const q=Drag.sell(ITEMS['supply_crate']);
    const peltIdx=P.inv.findIndex(s=>s&&s.id==='wolf_pelt');
    Drag.src={kind:'inv',idx:peltIdx}; Drag.item={id:'wolf_pelt',qty:1}; Drag.qty=1;
    const ok=Drag.sell(ITEMS['wolf_pelt']);
    return {questSold:q, goldGain:P.gold-goldBefore, ok};
  });
  console.log('SELL:', JSON.stringify(s7));

  // 8. sort
  const s8=await page.evaluate(()=>{
    const P=G.player;
    P.inv=new Array(16).fill(null);
    P.addItem('wolf_pelt',2); P.addItem('rusty_sword',1); P.addItem('minor_potion',3); P.addItem('iron_sword',1); P.addItem('bread',5);
    UI.sortInventory();
    return P.inv.filter(Boolean).map(s=>s.id);
  });
  console.log('SORT:', JSON.stringify(s8));

  // 9. drop-zone & dropItem with qty
  const s9=await page.evaluate(()=>{
    const P=G.player;
    P.addItem('bread',10);
    const bIdx=P.inv.findIndex(s=>s&&s.id==='bread'&&s.qty===10);
    P.dropItem(bIdx,4);
    return {remaining:P.inv[bIdx]&&P.inv[bIdx].qty, piles:G.piles.length};
  });
  console.log('DROP:', JSON.stringify(s9));

  // 9b. legacy save with 40 inv slots truncates to 16 on load
  const mig=await page.evaluate(()=>{
    const P=G.player;
    const old40=new Array(40).fill(null); old40[0]={id:'bread',qty:3}; old40[39]={id:'wolf_pelt',qty:2};
    Player.deserialize({name:'Legacy',cls:'adventurer',level:1,inv:old40,equip:{},depot:[]}, P);
    return {len:P.inv.length, first:P.inv[0]&&P.inv[0].id, last:P.inv[39]&&P.inv[39].id};
  });
  console.log('LEGACY MIGRATION:', JSON.stringify(mig));

  // 10. useItem via double-click (no selection) — consume potion directly
  const s10=await page.evaluate(()=>{
    const P=G.player;
    const p=G.player; p.hp=p.derived.maxHp-30;
    const pi=P.inv.findIndex(s=>s&&s.id==='minor_potion');
    if(pi<0){ P.addItem('minor_potion',1); }
    const idx=P.inv.findIndex(s=>s&&s.id==='minor_potion');
    const before=Math.round(p.hp);
    P.useItem(idx);
    return {idx, hpBefore:before};
  });
  await sleep(200);
  const s10b=await page.evaluate(()=>({ hpAfter:Math.round(G.player.hp) }));
  console.log('DBLCLICK USE:', JSON.stringify({...s10, ...s10b}));

  await page.screenshot({path:'v8_inventory.png'});
  console.log('ERRORS('+errors.length+'):');
  for(const e of errors.slice(0,15)) console.log('  '+e);
  await browser.close();
})();
