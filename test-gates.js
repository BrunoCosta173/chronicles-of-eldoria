const puppeteer=require('puppeteer');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
  const p=await b.newPage();
  const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:8080/index.html',{waitUntil:'load'});
  await p.waitForFunction('Assets.ok && EnvAssets.ok',{timeout:30000});
  await sleep(1000);
  await p.evaluate(()=>{ try{localStorage.clear();}catch(e){} });
  await p.click('#btn-new'); await sleep(200); await p.click('#ng-create');
  await sleep(3500);
  const r=await p.evaluate(async()=>{
    const z=World.current;
    const solid=(x,z2)=>z.solid[z.idx(x,z2)];
    // gates must be open on wall lines (inset 3 / 52)
    const gates={
      north:[26,27,28,29,30].every(x=>!solid(x,3)),
      south:[26,27,28,29,30].every(x=>!solid(x,52)),
      east:[26,27,28,29,30].every(z2=>!solid(52,z2)),
      wallSample: solid(10,3)&&solid(3,40)&&solid(52,10), // wall is solid elsewhere
    };
    // corridor tiles between plaza and portals must be open (fountain at 27-28x27-28, barn x20-29 z42-49)
    const corridor={
      laneE: [4,10,20,26,30,35,40,45,50].every(z2=>!solid(30,z2)),   // east lane of the north road
      eastRoad: [40,45,50,51].every(x=>!solid(x,28)),
      preEast: !solid(53,28)&&!solid(54,28),
    };
    // walk through the north gate: portal now sits ON the wall line (z=3)
    G.player.mesh.position.set(30.5*TILE,0,30*TILE); G.player.pos.copy(G.player.mesh.position);
    let reached=false;
    for(let i=0;i<600;i++){
      G.player.move(0,-1,0.05);
      if(Math.floor(G.player.mesh.position.z/TILE)<=3){ reached=true; break; }
    }
    return {gates, corridor, walkedToZ: Math.floor(G.player.mesh.position.z/TILE), reachedNorthGate:reached};
  });
  console.log(JSON.stringify(r));
  console.log('ERRORS:',errs.length);
  await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
