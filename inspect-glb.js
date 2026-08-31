const fs=require('fs');
for(const f of process.argv.slice(2)){
  const buf=fs.readFileSync(f);
  const jsonLen=buf.readUInt32LE(12);
  const json=JSON.parse(buf.slice(20,20+jsonLen).toString('utf8'));
  console.log('=== '+f);
  console.log('  animations:', json.animations.map(a=>a.name||'?').join(', '));
  console.log('  meshes:', json.meshes.map(m=>m.name||m.primitives.length+'prim').join(', '));
  console.log('  nodes:', json.nodes.length, '| skins:', (json.skins||[]).length, '| materials:', (json.materials||[]).map(m=>m.name).join(','));
}
