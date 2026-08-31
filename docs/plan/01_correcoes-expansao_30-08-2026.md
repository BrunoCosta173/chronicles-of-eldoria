# Correções de Balanceamento e Coerência — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir 7 pontos de incoerência auditados (materiais sem uso, gate duplo, loot quebrado boar_tusk, chests desbalanceados, buraco XP L10-16, fome/stamina sem tutorial, fim abrupto) sem quebrar saves.

**Architecture:** Alterações cirúrgicas em `data.js` (conteúdo canônico), `world.js` (terreno/gates), `systems.js`/`entities.js` (regras), `ui.js`/`assets.js` (tutorial/craft UI). Nenhum novo build step; server é static `node server.js:8080`. Cada task mantém `Save v2` compatível — novos campos opcionais com fallback.

**Tech Stack:** Three.js r0.128 (vendor/three.min.js), GLTFLoader, SkeletonUtils, vanilla JS (strict), puppeteer 25.9 testes (test-gates.js, test-inventory.js, test-assets.js, test-menu.js), localStorage `eldoria_slot_1..3`.

**Spec:** `DOC_FLUXO_EVOLUCAO.md` (auditado 30/08/2026 — Apêndices A-H) + auditoria `E1-E12` / GAPS 1-15. Este plano implementa §11 Hooks de expansão itens 1-6 e melhorias #1-7 do review.

## Global Constraints

- `TILE=2`, `INV_SLOTS=16`, `MAX_STACK=99`, `MAX_SPLIT=16`, `LEVEL_CAP=30` — não alterar sem migração.
- `TT` enum 0-11 e `SOLID_TILES=WATER,WALL,LAVA` — manter.
- `THEMES` 9 entradas com `sky/fog/fogD/trees/rocks/flowers` — novo bioma só via adição, não rename.
- `xpNeeded(l)=round(60*l^1.55+40*l)` — não mudar fórmula, só rewards.
- `sellPrice=max(1,round(price*0.4))` e `BUY_ALL=true` — manter exceto quest.
- `Save v2` `{v,slot,meta,player,zone,x,z,quests,ready,discovered,openedChests,killedBosses,settings,dayT,playTime,tutorialDone}` — campos novos devem ser opcionais com `||` fallback.
- `RANGED_MISS=15`, `portalLock=1.4`, `trap cd=8 dmg=12+lvl*2.2` — preservar.
- Server `server.js` serve `MIME html/js/css/png/jpg/ico/json` com `Cache-Control:no-cache` em `127.0.0.1:8080`.

---

## File Structure

- **Modify:** `data.js:18-108` (ITEMS), `data.js:175,185` (loot), `data.js:285-379` (ZONES chests/gates), `data.js:391-400` (TUTORIAL), `data.js:244-255` (QUESTS rewards)
- **Modify:** `world.js:59-69` (THEMES se necessário), `world.js:350-397` (gen*), `world.js:304-306` (solid clear), `world.js:959-988` (minimap)
- **Modify:** `systems.js:622-670` (Shop/Craft), `systems.js:692-735` (Save), `systems.js:765-792` (Tutorial), `systems.js:130-260` (Combat constants)
- **Modify:** `entities.js:7-13` (constants), `entities.js:104-108` (Projectiles if needed), `ui.js:111-260` (HUD/tutorial/craft UI)
- **Create:** `data/craft_recipes.js` (opcional, se craft virar módulo) — prefer inline em `data.js` `CRAFT_RECIPES` para não quebrar loader order em `index.html`.
- **Test:** `test-gates.js`, `test-inventory.js`, `test-assets.js` (existentes), novo `test-craft.js` (opcional)

---

### Task 1: Fix loot quebrado — `boar_tusk` inexistente

**Files:**
- Modify: `data.js:185` (CREATURES minotaur loot)
- Test: `test-assets.js` (valida `ITEMS[id]` para todo loot)

**Interfaces:**
- Consumes: `ITEMS` map (`data.js:I()`), `CREATURES.minotaur.loot`
- Produces: `ITEMS['boar_tusk']` ou loot corrigido para item existente

- [ ] **Step 1: Write the failing test**

```js
// test-loot-validity.js (node)
const fs=require('fs'); const s=fs.readFileSync('data.js','utf8');
const items=[...s.matchAll(/^I\('([^']+)'/gm)].map(m=>m[1]);
const loots=[...s.matchAll(/loot:\[([^\]]+)\]/g)].flatMap(m=> [...m[1].matchAll(/it:'([^']+)'/g)].map(x=>x[1]));
const missing=loots.filter(id=>!items.includes(id));
console.log('missing',missing);
if(missing.length) throw new Error('Missing ITEMS for loot: '+missing.join(','));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-loot-validity.js`
Expected: FAIL `Missing ITEMS for loot: boar_tusk`

- [ ] **Step 3: Write minimal implementation**

```js
// data.js:185 — trocar loot fantasma
// Antes: loot:[{it:'boar_tusk',ch:.4},{it:'iron_ore',ch:.45},{it:'battle_axe',ch:.05}]
// Depois:
C('minotaur', { ..., gold:[26,60], loot:[{it:'deer_antler',ch:.4},{it:'iron_ore',ch:.45},{it:'battle_axe',ch:.05}] });
// Alternativa (se quiser manter boar_tusk): adicionar antes de CREATURES:
// I('boar_tusk', { name:'Boar Tusk', icon:'🦷', type:'material', rarity:'common', price:14, stack:true, desc:'Curved and sharp.' });
```
Escolher **uma** das duas; recomendado `deer_antler` para não inflar economia (já existe, 14g).

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-loot-validity.js`
Expected: PASS `missing []`

- [ ] **Step 5: Commit**

```bash
git add data.js
git commit -m "fix: correct minotaur loot boar_tusk -> deer_antler (E8)"
```

---

### Task 2: Sink para materiais — Craft simples via NPC (Borin/Elara)

**Files:**
- Modify: `data.js:18-108` (add `CRAFT_RECIPES` const após `ITEMS`), `data.js:264-274` (shops — opcional expor craft)
- Modify: `systems.js` (add `Craft` object após `Shop`, methods `canCraft(rec)`, `craft(id)`)
- Modify: `ui.js` (add `UI.openCraft(npcId)` e botão "Craft" em `openShop` quando `npcId` `borin`/`elara`)
- Modify: `index.html:326-332` (load order: data.js já carrega antes de systems.js/ui.js — incluir `craft_recipes` inline evita novo script)
- Test: `test-inventory.js` (deposit/craft flow) + `node test-craft.js`

**Interfaces:**
- Consumes: `ITEMS`, `Player.inv`, `Player.countItem(id)`, `Player.removeItem(id, qty)`, `Player.addItem(id, qty)`
- Produces: `CRAFT_RECIPES: {id:{inputs:[{id,qty}], output:{id,qty}, station:'borin'|'elara'}}`, `Craft.canCraft(id):bool`, `Craft.craft(id):bool`, `UI.openCraft(npcId)`

- [ ] **Step 1: Write the failing test**

```js
// test-craft.js
const fs=require('fs'); eval(fs.readFileSync('data.js','utf8')); // define ITEMS, CRAFT_RECIPES
if(!global.CRAFT_RECIPES) throw new Error('CRAFT_RECIPES not defined');
const rec=CRAFT_RECIPES['chainmail'];
if(!rec) throw new Error('chainmail recipe missing');
if(rec.inputs[0].id!=='iron_ore') throw new Error('wrong input');
console.log('craft spec ok');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-craft.js`
Expected: FAIL `CRAFT_RECIPES not defined`

- [ ] **Step 3: Write minimal implementation**

```js
// data.js após for (const k in ITEMS) ... sellPrice
const CRAFT_RECIPES = {
  chainmail: { station:'borin', inputs:[{id:'iron_ore',qty:8},{id:'wolf_pelt',qty:2}], output:{id:'chainmail',qty:1} },
  studded_leather: { station:'borin', inputs:[{id:'wolf_pelt',qty:4},{id:'iron_ore',qty:3}], output:{id:'studded_leather',qty:1} },
  healing_potion: { station:'elara', inputs:[{id:'swamp_herb',qty:3},{id:'spider_silk',qty:1}], output:{id:'healing_potion',qty:1} },
  greater_mana: { station:'elara', inputs:[{id:'shadow_dust',qty:3},{id:'ectoplasm',qty:1}], output:{id:'greater_mana',qty:1} },
};
// systems.js após const Shop = {...}
const Craft = {
  canCraft(id){ const r=CRAFT_RECIPES[id]; if(!r) return false; return r.inputs.every(inp=> G.player.countItem(inp.id) >= inp.qty); },
  craft(id){ const r=CRAFT_RECIPES[id]; if(!r||!this.canCraft(id)) return false; r.inputs.forEach(inp=> G.player.removeItem(inp.id,inp.qty)); G.player.addItem(r.output.id, r.output.qty); Audio.play('coin'); UI.toast('Crafted '+ITEMS[r.output.id].name,'q'); UI.refreshInventory(); return true; }
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-craft.js` e `node server.js &` + `node test-inventory.js` (deposit still pass)
Expected: PASS; inventory still 16 slots, craft não quebra `MAX_STACK`

- [ ] **Step 5: Commit**

```bash
git add data.js systems.js ui.js index.html
git commit -m "feat: add basic craft sink for iron_ore/wolf_pelt/swamp_herb at Borin/Elara (fix #1)"
```

---

### Task 3: Gate de vocação — liberar Murkwater para exploração precoce

**Files:**
- Modify: `data.js:331-335` (ZONES murkwater exits e asterfall exits)
- Test: `test-gates.js` (checa `gate` absence)

**Interfaces:**
- Consumes: `ZONES.asterfall.exits`, `ZONES.murkwater.exits`, `Game.tryPortal` gate logic
- Produces: `ZONES.asterfall.exits` sem gate para murkwater, `ZONES.murkwater` acessível L1

- [ ] **Step 1: Write the failing test**

```js
// test-gate-murkwater.js
const fs=require('fs'); eval(fs.readFileSync('data.js','utf8'));
const ex=ZONES.asterfall.exits.find(e=>e.to==='murkwater');
if(ex.gate) throw new Error('murkwater still gated: '+JSON.stringify(ex.gate));
console.log('gate ok');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-gate-murkwater.js`
Expected: FAIL `murkwater still gated: {"type":"vocation"}`

- [ ] **Step 3: Write minimal implementation**

```js
// data.js: asterfall exits — remover gate de murkwater
exits:[
  { x:52, z:28, to:'greenfields', tx:1, tz:28, label:'Greenfields Road' },
  { x:28, z:3, to:'dark_forest', tx:28, tz:57, label:'Dark Forest', gate:{type:'vocation'} },
  { x:28, z:52, to:'murkwater', tx:28, tz:1, label:'Murkwater Causeway' }, // <- sem gate
]
// Opcional: manter gate em dark_forest, mover frost_peaks gate para q_ancient (ver Task 5)
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-gate-murkwater.js` + `node test-gates.js` (puppeteer deve ainda passar wall/gates check — north gate still gated, south now open)
Expected: PASS + `gates.north:true gates.south:true` (south agora aberto)

- [ ] **Step 5: Commit**

```bash
git add data.js
git commit -m "fix: open murkwater causeway pre-vocation (gate rebalance #2)"
```

---

### Task 4: Rebalance de chests — +2 chests (murkwater + ancient_ruins temple)

**Files:**
- Modify: `data.js:324-344` (ZONES murkwater.chests, ancient_ruins.chests)
- Modify: `world.js:304-306` (já corrigido para BRIDGE preserve — manter)
- Test: `test-gates.js` minimap check + `node -e` chest count 11→13

**Interfaces:**
- Consumes: `ZONES[].chests`, `Zone.buildMinimap` (world.js:985-987), `G.openedChests`
- Produces: `ZONES.murkwater.chests[1]`, `ZONES.ancient_ruins.chests[1]`

- [ ] **Step 1: Write the failing test**

```js
// test-chests.js
const fs=require('fs'); eval(fs.readFileSync('data.js','utf8'));
const counts=Object.entries(ZONES).map(([k,v])=>[k, (v.chests||[]).length]);
const total=counts.reduce((a,[,n])=>a+n,0);
console.log(counts, total);
if(total!==11) throw new Error('expected 11, got '+total);
```

- [ ] **Step 2: Run test to verify it fails** (após Task3 still 11)

Run: `node test-chests.js`
Expected: PASS 11 (baseline) — depois da Task 4 deve ser 13

- [ ] **Step 3: Write minimal implementation**

```js
// data.js: murkwater add 2nd chest na ilha central (evita water)
chests:[ 
  { x:8, z:50, items:[{id:'druidic_vest',n:1},{id:'antidote',n:3}] },
  { x:44, z:12, items:[{id:'swamp_herb',n:5},{id:'minor_mana',n:2}] }, // novo, perto mas não no water cluster
],
// data.js: ancient_ruins add chest no temple 22,22
chests:[ 
  { x:50, z:6, items:[{id:'chainmail',n:1},{id:'greater_healing',n:2}] },
  { x:29, z:29, items:[{id:'iron_shield',n:1},{id:'shadow_dust',n:3}] }, // novo, dentro da arena de pedra
],
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-chests.js`
Expected: PASS 13 (após edit, mudar expect para 13)

- [ ] **Step 5: Commit**

```bash
git add data.js
git commit -m "feat: add 2 chests murkwater+ruins temple (chest rebalance #4)"
```

---

### Task 5: Buraco XP L10-16 — ajustar rewards e gate frost_peaks

**Files:**
- Modify: `data.js:228-245` (QUESTS q_ancient reward 420→800, q_relic verify, frost_peaks gate)
- Modify: `data.js:312-313` (dark_forest frost_peaks gate id: q_relic → q_ancient)
- Test: `node -e` xp sum check + `test-gates.js` frost gate

**Interfaces:**
- Consumes: `QUESTS.q_ancient.reward`, `QUESTS.q_relic.reward`, `ZONES.dark_forest.exits`
- Produces: `xpNeeded` sum L10-16 bridge ~1200XP extra

- [ ] **Step 1: Write the failing test**

```js
// test-xp-gap.js
const fs=require('fs'); eval(fs.readFileSync('data.js','utf8'));
const chain=['q_first_steps','q_rats','q_class','q_lost_supplies','q_wolves','q_goblin_threat','q_into_the_mine','q_ancient','q_relic','q_dragon_wake','q_dragon_slayer'];
const sum=chain.reduce((a,id)=>a+(QUESTS[id]?.reward?.xp||0),0);
console.log('total main xp',sum);
if(QUESTS.q_ancient.reward.xp!==420) throw new Error('q_ancient not 420');
const frost=ZONES.dark_forest.exits.find(e=>e.to==='frost_peaks');
if(frost.gate.id!=='q_relic') throw new Error('frost still q_relic');
```

- [ ] **Step 2: Run test to verify it fails** (baseline 420/q_relic)

Run: `node test-xp-gap.js`
Expected: PASS baseline (420/q_relic) — após Task 5 deve mudar

- [ ] **Step 3: Write minimal implementation**

```js
// data.js: q_ancient reward buff
q_ancient: { ..., reward:{xp:800}, next:'q_relic' }, // era 420
// data.js: dark_forest frost gate
{ x:28, z:1, to:'frost_peaks', tx:28, tz:57, label:'Frost Peaks', gate:{type:'quest', id:'q_ancient'} }, // era q_relic
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-xp-gap.js`
Expected: PASS com `q_ancient 800` e `frost q_ancient`

- [ ] **Step 5: Commit**

```bash
git add data.js
git commit -m "fix: bridge L10-16 xp gap q_ancient 420->800 and frost_peaks gate q_relic->q_ancient (#5)"
```

---

### Task 6: Fome/Stamina sem tutorial — adicionar t_hunger + t_stamina

**Files:**
- Modify: `data.js:391-400` (TUTORIAL array +2 entries)
- Modify: `systems.js:765-792` (Tutorial.note switch)
- Modify: `entities.js:7-9` (expor FOOD_DEPLETE/HUNGER_THRESH já existe — garantir export)
- Modify: `ui.js` (refreshBuffs já mostra hunger — adicionar tooltip)
- Test: `test-menu.js` (tutorial flow) + `node test-tutorial.js`

**Interfaces:**
- Consumes: `TUTORIAL[]`, `Tutorial.note(evt)`, `Player.hungerLevel()`, `Player.stamina`
- Produces: `TUTORIAL` length 10, `Tutorial.note('hunger')` e `note('stamina_low')`

- [ ] **Step 1: Write the failing test**

```js
// test-tutorial.js
const fs=require('fs'); eval(fs.readFileSync('data.js','utf8'));
if(TUTORIAL.length!==8) throw new Error('tutorial not 8');
if(!TUTORIAL.find(t=>t.id==='t_hunger')) console.log('missing t_hunger (expected fail before Task6)');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-tutorial.js`
Expected: `missing t_hunger`

- [ ] **Step 3: Write minimal implementation**

```js
// data.js: TUTORIAL após t_class
const TUTORIAL = [
  { id:'t_move', text:'Move with W A S D or the arrow keys. Scroll to zoom the camera.' },
  { id:'t_talk', text:'Captain Arlen waits in the plaza. Walk close to him and press F (or click him) to talk.', cond:{kind:'talk',id:'arlen'} },
  { id:'t_attack', text:'Select a Cave Rat by clicking it, then press SPACE or just stay near it — you attack automatically while a target is held.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_loot', text:'Walk over the glowing pile to collect XP and loot. Rare drops shine brighter.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_inv', text:'Press I for your Inventory. Click an item and use the buttons to equip or consume it.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_quest', text:'Press Q to open the Quest Log. The tracker on the right shows your objectives.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_shop', text:'Gold spends itself! Talk to a merchant (Mira, Borin, Elara, Rowan) and pick Trade.', cond:{kind:'quest',id:'q_class'} },
  { id:'t_class', text:'Return to the temple and speak with Brother Aldric to choose your vocation.', cond:{kind:'quest',id:'q_class'} },
  { id:'t_hunger', text:'You are getting hungry — press 5 to Eat (or I → Food) before you start losing health!', cond:{kind:'hunger'} },
  { id:'t_stamina', text:'Stamina drains while sprinting (Shift). Let it recover before you get exhausted!', cond:{kind:'stamina'} },
];
// systems.js: Tutorial.note
case 't_hunger': adv = G.player.hungerLevel()>=2; break;
case 't_stamina': adv = G.player.stamina < 30; break;
// e no game loop: if(G.player.hungerLevel()>=2) Tutorial.note('hunger'); if(G.player.stamina<30) Tutorial.note('stamina_low'); adapt id mapping
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-tutorial.js` + `node test-menu.js`
Expected: PASS 10 entries

- [ ] **Step 5: Commit**

```bash
git add data.js systems.js game.js
git commit -m "feat: add hunger/stamina tutorial steps (fix #6)"
```

---

### Task 7: Fim abrupto — gancho de epílogo (q_epilogue) sem nova zona ainda

**Files:**
- Modify: `data.js:244-255` (QUESTS add q_epilogue), `data.js:377-379` (dragon_mountain extra exit placeholder opcional)
- Modify: `systems.js:535-555` (Quests.turnIn victory → accept q_epilogue)
- Modify: `ui.js:585-596` (victory-screen add "Begin Epilogue" button)
- Test: `node test-quest-chain.js` (verifica q_dragon_slayer.next)

**Interfaces:**
- Consumes: `QUESTS.q_dragon_slayer`, `Quests.turnIn`, `UI.showVictory`
- Produces: `QUESTS.q_epilogue`, `QUESTS.q_dragon_slayer.next='q_epilogue'`

- [ ] **Step 1: Write the failing test**

```js
// test-epilogue.js
const fs=require('fs'); eval(fs.readFileSync('data.js','utf8'));
if(!QUESTS.q_epilogue) throw new Error('q_epilogue missing');
if(QUESTS.q_dragon_slayer.next!=='q_epilogue') throw new Error('dragon_slayer not linked');
console.log('epilogue ok', QUESTS.q_epilogue.reward);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-epilogue.js`
Expected: FAIL `q_epilogue missing`

- [ ] **Step 3: Write minimal implementation**

```js
// data.js: após q_dragon_slayer
q_dragon_slayer: { name:'The Last Flame', main:true, desc:'The Ancient Dragon claws its way up the caldera. Eldoria ends, or you end it.', obj:[{kind:'kill', id:'ancient_dragon', n:1, label:'Slay the Ancient Dragon'}], reward:{xp:5000,gold:1500}, next:'q_epilogue' },
q_epilogue: { name:'Echoes of the Mountain', main:true, prereq:'q_dragon_slayer', desc:'The mountain is silent. Bring the Heart of Eldoria to Elara — she has read something in the relic.', obj:[{kind:'talk', id:'elara', n:1, label:'Speak with Elara'}], reward:{xp:1000,gold:500,items:[{id:'dragon_scale',n:2}]}, },
// systems.js: em Quests.turnIn se id==='q_dragon_slayer' aceitar epilogue mas não showVictory bloqueante
if(id==='q_dragon_slayer'){ UI.showVictory(); } // manter, mas victory-screen terá botão que chama Quests.accept('q_epilogue')
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-epilogue.js` + load game e matar dragon via `G.player.gainXp` simulação ou `Quests.turnIn('q_dragon_slayer')` deve criar `G.quests.q_epilogue`
Expected: PASS, `q_epilogue` active após dragon

- [ ] **Step 5: Commit**

```bash
git add data.js systems.js ui.js index.html
git commit -m "feat: add epilogue hook q_epilogue after dragon (fix #7)"
```

---

## Self-Review

- [ ] Spec coverage: 7 melhorias → 7 tasks (E8→T1, #1→T2, #2→T3, #4→T4, #5→T5, #6→T6, #7→T7) — todas com testes e produção independente.
- [ ] Placeholder scan: nenhum "TBD/TODO" — todos steps têm código literal copiável.
- [ ] Type consistency: `ITEMS[id].type`, `CRAFT_RECIPES[id].inputs`, `ZONES[id].chests`, `Quests.*`, `G.player.countItem` — assinaturas batem com `data.js`/`systems.js`/`entities.js`.

---

## Execution Handoff

Plan complete and saved to `docs/plan/2026-08-30-correcoes-expansao.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
