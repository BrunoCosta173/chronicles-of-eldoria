const puppeteer=require('puppeteer');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const p=await b.newPage();
  await p.setViewport({width:1280,height:800});
  const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/index.html',{waitUntil:'load'});
  await p.waitForFunction('Assets.ok && EnvAssets.ok && !document.getElementById("btn-new").disabled',{timeout:30000});
  await sleep(1500);
  await p.screenshot({path:'v4_title_env.png'});
  console.log('TITLE SHOT OK, errors:',errs.length);

  const p2=await b.newPage();
  await p2.setViewport({width:1280,height:800});
  await p2.setRequestInterception(true);
  p2.on('request',r=>{ if(r.url().includes('Mage.glb')) r.abort(); else r.continue(); });
  await p2.goto('http://localhost:8080/index.html',{waitUntil:'load'});
  await sleep(4000);
  const st=await p2.evaluate(()=>({bodyHasError:document.body.innerHTML.includes('ASSETS FAILED TO LOAD'),failed:Assets.failed}));
  console.log('ERROR SCREEN:',JSON.stringify(st));
  await p2.screenshot({path:'v4_error.png'});
  await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
