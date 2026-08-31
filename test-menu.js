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
  await page.waitForFunction('Assets.ok && EnvAssets.ok && !$("btn-new").disabled',{timeout:30000});
  await sleep(1500);

  // start a game so panel-menu is usable in playing state
  await page.click('#btn-new');
  await sleep(300);
  await page.click('#ng-create');
  await sleep(4500);

  const s1=await page.evaluate(()=>({ state:G.state }));
  console.log('START:', JSON.stringify(s1));

  // open menu via 'esc'
  await page.keyboard.press('Escape');
  await sleep(300);
  const s2=await page.evaluate(()=>({
    open: UI.menuOpen(),
    homeVisible: !$('menu-home').classList.contains('hidden'),
    settingsHidden: $('menu-settings').classList.contains('hidden'),
    title: $('panel-menu').dataset.title,
    metaVisible: !$('menu-save-meta').classList.contains('hidden'),
    metaText: $('menu-save-meta').textContent,
    focused: document.activeElement ? document.activeElement.id : null,
  }));
  console.log('MENU OPEN:', JSON.stringify(s2));
  await page.screenshot({path:'v7_menu_home.png'});

  // go to settings sub-view via click
  await page.click('#btn-open-settings');
  await sleep(300);
  const s3=await page.evaluate(()=>({
    homeHidden: $('menu-home').classList.contains('hidden'),
    settingsVisible: !$('menu-settings').classList.contains('hidden'),
    title: $('panel-menu').dataset.title,
  }));
  console.log('SETTINGS VIEW:', JSON.stringify(s3));
  await page.screenshot({path:'v7_menu_settings.png'});

  // back via Escape and check it returns to home, does NOT close menu
  await page.keyboard.press('Escape');
  await sleep(300);
  const s4=await page.evaluate(()=>({
    open: UI.menuOpen(),
    homeVisible: !$('menu-home').classList.contains('hidden'),
    settingsHidden: $('menu-settings').classList.contains('hidden'),
  }));
  console.log('ESC->HOME:', JSON.stringify(s4));

  // keyboard nav: arrow down from home, enter runs Save Game (produces meta toast)
  await page.evaluate(()=>{ document.querySelector('#menu-home .menu-btn:not(:disabled)').focus(); });
  await page.keyboard.press('ArrowDown');
  const focused=await page.evaluate(()=>document.activeElement ? document.activeElement.id : null);
  console.log('KEYBOARD FOCUS AFTER DOWN:', focused);

  // esc closes the menu when on home view
  await page.keyboard.press('Escape');
  await sleep(300);
  const s5=await page.evaluate(()=>({ open: UI.menuOpen() }));
  console.log('ESC CLOSES:', JSON.stringify(s5));

  // click Save Game -> toast with slot + timestamp
  await page.evaluate(()=>{ UI.togglePanel('panel-menu'); });
  await sleep(300);
  await page.click('#btn-save-now');
  await sleep(400);
  const toast=await page.evaluate(()=>{
    const t=document.querySelector('#toasts .toast:last-child');
    return t ? t.textContent : null;
  });
  console.log('SAVE TOAST:', JSON.stringify(toast));
  const meta=await page.evaluate(()=>Save.meta(Save.active));
  console.log('SAVE META:', JSON.stringify(meta));

  // return-to-title confirm contains slot + timestamp
  await page.click('#btn-return-title');
  await sleep(300);
  const confirmText=await page.evaluate(()=>document.getElementById('confirm-text').textContent);
  console.log('RETURN CONFIRM:', JSON.stringify(confirmText));
  await page.evaluate(()=>{ $('confirm-no').click(); });

  console.log('ERRORS('+errors.length+'):');
  for(const e of errors.slice(0,15)) console.log('  '+e);
  await browser.close();
})();
