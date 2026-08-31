'use strict';
/* =========================================================
   CHRONICLES OF ELDORIA — data.js
   Static game data: items, creatures, skills, quests, NPCs,
   zones, vocations. No logic beyond small helpers.
   ========================================================= */

const TILE = 2; // world units per tile

const RARITY = { common:'Common', uncommon:'Uncommon', rare:'Rare', epic:'Epic', legendary:'Legendary' };
const RARITY_CLASS = { common:'tt-c', uncommon:'tt-u', rare:'tt-r', epic:'tt-e', legendary:'tt-l' };

/* ---------------- ITEMS ----------------
   type: weapon|shield|armor|helmet|legs|boots|ring|amulet|potion|food|material|quest
   weapon: wkind sword|axe|bow|staff, dmg:[min,max], range (ranged only)
   stats: {def,hp,mp,str,dex,int,vit,crit}
------------------------------------------ */
const ITEMS = {};
function I(id, o){ o.id = id; ITEMS[id] = o; }

// --- swords
I('rusty_sword',   { name:'Rusty Sword',      icon:'🗡️', type:'weapon', wkind:'sword', rarity:'common',    price:25,   dmg:[4,7],    lvl:1,  desc:'It has seen better decades.', stats:{} });
I('iron_sword',    { name:'Iron Sword',       icon:'🗡️', type:'weapon', wkind:'sword', rarity:'uncommon',  price:110,  dmg:[7,11],   lvl:3,  desc:'Reliable city-forged steel.', stats:{str:1} });
I('steel_sword',   { name:'Steel Longsword',  icon:'⚔️', type:'weapon', wkind:'sword', rarity:'rare',      price:340,  dmg:[11,16],  lvl:7,  desc:'Balanced for a duelist grip.', stats:{str:2} });
I('knightblade',   { name:'Knightblade',      icon:'⚔️', type:'weapon', wkind:'sword', rarity:'epic',      price:900,  dmg:[16,22],  lvl:12, desc:'Once carried by the Order of the Dawn.', stats:{str:3,vit:1} });
I('dragonsfang',   { name:'Dragonsfang',      icon:'🔥', type:'weapon', wkind:'sword', rarity:'legendary', price:4200, dmg:[24,32],  lvl:18, desc:'Forged from a shed tooth of the Wyrm.', stats:{str:5,crit:3} });
// --- axes
I('hand_axe',      { name:'Hand Axe',         icon:'🪓', type:'weapon', wkind:'axe', rarity:'common',    price:40,   dmg:[5,9],   lvl:2,  desc:'More woodcutter than warrior.', stats:{} });
I('battle_axe',    { name:'Battle Axe',       icon:'🪓', type:'weapon', wkind:'axe', rarity:'uncommon',  price:200,  dmg:[9,15],  lvl:6,  desc:'Heavy. Satisfying. Messy.', stats:{str:2} });
I('the_reaver',    { name:'The Reaver',       icon:'🪓', type:'weapon', wkind:'axe', rarity:'epic',      price:1100, dmg:[15,23], lvl:12, desc:'It hums when blood is near.', stats:{str:4} });
// --- bows
I('short_bow',     { name:'Short Bow',        icon:'🏹', type:'weapon', wkind:'bow', rarity:'common',    price:35,   dmg:[3,6],   lvl:1,  range:14, desc:'Hunting grade.', stats:{} });
I('long_bow',      { name:'Long Bow',         icon:'🏹', type:'weapon', wkind:'bow', rarity:'uncommon',  price:180,  dmg:[6,9],   lvl:5,  range:15, desc:'Needs a strong back.', stats:{dex:2} });
I('yew_composite', { name:'Yew Composite',    icon:'🏹', type:'weapon', wkind:'bow', rarity:'rare',      price:520,  dmg:[9,13],  lvl:10, range:16, desc:'Layered horn and yew.', stats:{dex:3} });
I('windsinger',    { name:'Windsinger',       icon:'🏹', type:'weapon', wkind:'bow', rarity:'epic',      price:1300, dmg:[13,19], lvl:16, range:18, desc:'Arrows leave a silver thread behind.', stats:{dex:4,crit:4} });
// --- staves
I('apprentice_staff', { name:'Apprentice Staff', icon:'🪄', type:'weapon', wkind:'staff', rarity:'common',   price:40,   dmg:[3,5],   lvl:1,  range:14, desc:'A stick with ambition.', stats:{int:1}, mcost:1 });
I('oak_staff',        { name:'Oak Channeler',    icon:'🪄', type:'weapon', wkind:'staff', rarity:'uncommon', price:170,  dmg:[6,8],   lvl:5,  range:14, desc:'Heartwood of a storm-struck oak.', stats:{int:2,mp:15}, mcost:1 });
I('arcane_staff',     { name:'Arcane Focus',     icon:'🔮', type:'weapon', wkind:'staff', rarity:'rare',     price:540,  dmg:[8,13],  lvl:10, range:15, desc:'The crystal drinks the light.', stats:{int:3,mp:25}, mcost:1 });
I('stormcaller',      { name:'Stormcaller',      icon:'🌩️', type:'weapon', wkind:'staff', rarity:'epic',    price:1400, dmg:[13,18], lvl:16, range:17, desc:'Thunder answers it.', stats:{int:5,mp:40}, mcost:2 });
// --- shields
I('wooden_shield', { name:'Wooden Shield',  icon:'🛡️', type:'shield', rarity:'common',   price:30,  lvl:1,  stats:{def:3} });
I('iron_shield',   { name:'Iron Shield',    icon:'🛡️', type:'shield', rarity:'uncommon', price:160, lvl:5,  stats:{def:6,vit:1} });
I('knight_shield', { name:'Knight Bulwark', icon:'🛡️', type:'shield', rarity:'rare',     price:520, lvl:10, stats:{def:10,vit:2} });
// --- armor
I('cloth_tunic',     { name:'Traveler Tunic',   icon:'🧥', type:'armor', rarity:'common',   price:20,  lvl:1,  stats:{def:2,hp:10} });
I('leather_armor',   { name:'Leather Armor',    icon:'🦺', type:'armor', rarity:'common',   price:90,  lvl:2,  stats:{def:5} });
I('studded_leather', { name:'Studded Leather',  icon:'🦺', type:'armor', rarity:'uncommon', price:240, lvl:5,  stats:{def:8,vit:1} });
I('chainmail',       { name:'Chainmail',        icon:'🦺', type:'armor', rarity:'rare',     price:600, lvl:8,  stats:{def:12,vit:2} });
I('knight_plate',    { name:'Knightly Plate',   icon:'🛡️', type:'armor', rarity:'epic',     price:1500,lvl:13, stats:{def:18,vit:4,hp:30} });
I('mages_robe',      { name:'Adept Robe',       icon:'🥼', type:'armor', rarity:'uncommon', price:280, lvl:4,  stats:{def:4,mp:40,int:2} });
I('druidic_vest',    { name:'Druidic Vest',     icon:'🥼', type:'armor', rarity:'rare',     price:560, lvl:8,  stats:{def:7,hp:25,vit:2,int:1} });
// --- helmets
I('leather_cap', { name:'Leather Cap',   icon:'🧢', type:'helmet', rarity:'common',   price:35,  lvl:1,  stats:{def:1,hp:5} });
I('iron_helm',   { name:'Iron Helm',     icon:'⛑️', type:'helmet', rarity:'uncommon', price:170, lvl:5,  stats:{def:3,hp:10} });
I('knight_helm', { name:'Knight Helm',   icon:'🪖', type:'helmet', rarity:'rare',     price:480, lvl:10, stats:{def:6,hp:20,vit:1} });
// --- legs
I('cloth_legs',    { name:'Travel Pants',   icon:'👖', type:'legs', rarity:'common',   price:15,  lvl:1,  stats:{def:1} });
I('leather_legs',  { name:'Leather Legs',   icon:'👖', type:'legs', rarity:'common',   price:80,  lvl:2,  stats:{def:3} });
I('chain_legs',    { name:'Chain Legs',     icon:'👖', type:'legs', rarity:'uncommon', price:260, lvl:6,  stats:{def:6,vit:1} });
I('knight_legs',   { name:'Knightly Greaves',icon:'👖', type:'legs', rarity:'rare',    price:640, lvl:11, stats:{def:9,vit:2} });
// --- boots
I('worn_boots',   { name:'Worn Boots',     icon:'🥾', type:'boots', rarity:'common',   price:18,  lvl:1,  stats:{def:1,spd:2} });
I('leather_boots',{ name:'Leather Boots',  icon:'🥾', type:'boots', rarity:'common',   price:70,  lvl:2,  stats:{def:2,spd:3} });
I('swift_boots',  { name:'Swift Boots',    icon:'👟', type:'boots', rarity:'uncommon', price:230, lvl:5,  stats:{def:2,spd:8} });
I('knight_boots', { name:'Knight Boots',   icon:'🥾', type:'boots', rarity:'rare',     price:560, lvl:10, stats:{def:5,spd:4,vit:1} });
// --- rings
I('copper_ring',     { name:'Copper Band',     icon:'💍', type:'ring', rarity:'common',   price:45,  lvl:1,  stats:{str:1} });
I('ring_of_might',   { name:'Ring of Might',   icon:'💍', type:'ring', rarity:'rare',     price:420, lvl:7,  stats:{str:3,dex:1} });
I('signet_of_focus', { name:'Signet of Focus', icon:'💍', type:'ring', rarity:'rare',     price:430, lvl:7,  stats:{int:4} });
I('vampire_band',    { name:'Vampire Band',    icon:'🩸', type:'ring', rarity:'epic',     price:1200,lvl:12, stats:{str:2,hp:30} });
// --- amulets
I('beaded_charm',    { name:'Beaded Charm',       icon:'📿', type:'amulet', rarity:'common',    price:40,  lvl:1,  stats:{vit:1} });
I('amulet_of_might', { name:'Amulet of the Boar', icon:'📿', type:'amulet', rarity:'uncommon',  price:210, lvl:4,  stats:{str:2,vit:2} });
I('dragonfire_amulet',{ name:'Dragonfire Ward',   icon:'🔥', type:'amulet', rarity:'epic',      price:1350,lvl:12, stats:{int:3,vit:3,hp:30} });
I('heart_of_eldoria',{ name:'Heart of Eldoria',   icon:'💎', type:'amulet', rarity:'legendary', price:6000,lvl:18, stats:{str:4,dex:4,int:4,vit:4,hp:50,mp:50}, desc:'The mountain stolen heart, beating still.' });
// --- potions & food
I('minor_potion',    { name:'Minor Healing Potion', icon:'🧪', type:'potion', rarity:'common',   price:25,  heal:45,  stack:true, desc:'Bitter, but it knits flesh.' });
I('healing_potion',  { name:'Healing Potion',       icon:'🧪', type:'potion', rarity:'common',   price:70,  heal:110, stack:true, desc:'Standard adventurer fare.' });
I('greater_healing', { name:'Greater Healing Draught', icon:'🍷', type:'potion', rarity:'uncommon', price:180, heal:230, stack:true, desc:'Tastes of iron and sunlight.' });
I('minor_mana',      { name:'Minor Mana Potion',    icon:'🔷', type:'potion', rarity:'common',   price:40,  mana:60,  stack:true, desc:'Cool and faintly electric.' });
I('greater_mana',    { name:'Greater Mana Draught', icon:'🔷', type:'potion', rarity:'uncommon', price:120, mana:150, stack:true, desc:'The world goes sharp for a moment.' });
I('antidote',        { name:'Antidote Vial',        icon:'🟢', type:'potion', rarity:'common',   price:35,  heal:15, cure:true, stack:true, desc:'Cures venom.' });
I('bread',           { name:'Hardtack Bread',       icon:'🍞', type:'food',   rarity:'common',   price:8,   heal:20, stack:true, desc:'Keeps for years. Tastes like none of them.' });
I('raw_meat',        { name:'Raw Meat',             icon:'🥩', type:'food',   rarity:'common',   price:6,   heal:12, stack:true, desc:'Better cooked. It is not.' });
I('cooked_meat',     { name:'Roasted Haunch',       icon:'🍖', type:'food',   rarity:'common',   price:22,  heal:55, stack:true, desc:'Tavern quality.' });
I('elven_crisps',    { name:'Elven Crisps',         icon:'🥮', type:'food',   rarity:'uncommon', price:90,  heal:90, mana:40, stack:true, desc:'Paper-thin and sweet.' });
// --- quest items
I('supply_crate',    { name:'Stolen Supply Crate', icon:'📦', type:'quest', rarity:'common', price:0, stack:true, lvl:1, desc:'Mira missing stock. Goblins took it.' });
I('ancient_relic',   { name:'Ancient Relic',       icon:'🏺', type:'quest', rarity:'legendary', price:0, lvl:1, desc:'A ward-key of the old kingdom. It is warm.' });
I('chieftain_trophy',{ name:'Chieftain Skull',   icon:'💀', type:'quest', rarity:'rare', price:0, lvl:1, desc:'Proof, in case anyone doubts you.' });
// --- materials
I('wolf_pelt',    { name:'Wolf Pelt',     icon:'🐺', type:'material', rarity:'common', price:18, stack:true, desc:'Thick grey fur.' });
I('wolf_fang',    { name:'Wolf Fang',     icon:'🦷', type:'material', rarity:'common', price:12, stack:true, desc:'Still a little damp.' });
I('spider_silk',  { name:'Spider Silk',   icon:'🕸️', type:'material', rarity:'common', price:16, stack:true, desc:'Stronger than it looks.' });
I('deer_antler', { name:'Deer Antler',   icon:'🦔', type:'material', rarity:'common', price:14, stack:true, desc:'Proud and pronged.' });
I('rat_tail',     { name:'Rat Tail',      icon:'🪢', type:'material', rarity:'common', price:4,  stack:true, desc:'Proof of veracity.' });
I('goblin_ear',   { name:'Goblin Ear',    icon:'👂', type:'material', rarity:'common', price:10, stack:true, desc:'Pointy. Obviously.' });
I('bone_shard',   { name:'Bone Shard',    icon:'🦴', type:'material', rarity:'common', price:12, stack:true, desc:'Bone that never stopped being cold.' });
I('ectoplasm',    { name:'Ectoplasm',     icon:'🫧', type:'material', rarity:'uncommon', price:45, stack:true, desc:'It giggles, faintly.' });
I('troll_hide',   { name:'Troll Hide',    icon:'🟫', type:'material', rarity:'uncommon', price:60, stack:true, desc:'Knitted moss and leather.' });
I('golem_core',   { name:'Golem Core',    icon:'⚙️', type:'material', rarity:'rare',    price:160, stack:true, desc:'A rune-still turning.' });
I('wyvern_scale', { name:'Wyvern Scale',  icon:'🪶', type:'material', rarity:'rare',    price:120, stack:true, desc:'Light as a leaf and twice as sharp.' });
I('dragon_scale', { name:'Dragon Scale',  icon:'🔶', type:'material', rarity:'epic',    price:500, stack:true, desc:'Warm forever.' });
I('swamp_herb',   { name:'Bogwort',       icon:'🌿', type:'material', rarity:'common', price:9,  stack:true, desc:'Smells of pennies and rain.' });
I('iron_ore',     { name:'Iron Ore',      icon:'⛏️', type:'material', rarity:'common', price:15, stack:true, desc:'Borin pays well for this.' });
I('shadow_dust',  { name:'Shadow Dust',   icon:'🌑', type:'material', rarity:'uncommon', price:40, stack:true, desc:'Elara buys it by the dram.' });

for (const k in ITEMS){ const it = ITEMS[k]; if(!it.desc) it.desc = ''; if(!it.stats) it.stats = {}; if(!it.lvl) it.lvl = 1; it.sprite='assets/icons/'+k+'.png'; }
function spriteIcon(id, cls){ const sp=ITEMS[id]?.sprite; if(sp) return '<img class="item-sprite'+(cls?' '+cls:'')+'" src="'+sp+'" alt="'+esc(ITEMS[id].name)+'" loading="lazy" onerror="this.style.display=\'none\';this.nextSibling&&this.nextSibling.classList.remove(\'hidden\')"> <span class="hidden">'+esc(ITEMS[id].icon)+'</span>'; return esc(ITEMS[id]?.icon||''); }
function sellPrice(id){ return Math.max(1, Math.round((ITEMS[id].price||10) * 0.4)); }

/* ---------------- VOCATIONS / CLASSES ---------------- */
const CLASSES = {
  adventurer: { name:'Adventurer', icon:'✜', desc:'Unknown, untested.', skills:[],
    growth:{hp:12,mp:5,str:1,dex:1,int:1,vit:1,pts:2} },
  vanguard: { name:'Vanguard', icon:'🛡️', desc:'Iron discipline. Front line. Swords, axes and shields.',
    start:{hp:70,mp:10,str:6,dex:1,int:0,vit:6}, growth:{hp:16,mp:4,str:2,dex:1,int:0,vit:2,pts:2},
    skills:['heavy_strike','shield_bash','whirlwind','war_cry'] },
  ranger: { name:'Ranger', icon:'🏹', desc:'Eyes like hawks. Bows, speed and the critical shot.',
    start:{hp:30,mp:20,str:2,dex:7,int:1,vit:2}, growth:{hp:11,mp:6,str:1,dex:2,int:1,vit:1,pts:2},
    skills:['power_shot','multishot','poison_arrow','dash_shot'] },
  arcanist: { name:'Arcanist', icon:'🔥', desc:'Fragile body, terrifying mind. Elemental destruction.',
    start:{hp:5,mp:70,str:0,dex:1,int:8,vit:0}, growth:{hp:8,mp:14,str:0,dex:1,int:3,vit:1,pts:2},
    skills:['fireball','ice_shard','lightning','meteor'] },
  warden: { name:'Warden', icon:'🌿', desc:'The wild answers. Healing, poison and root magic.',
    start:{hp:30,mp:45,str:1,dex:2,int:5,vit:4}, growth:{hp:12,mp:9,str:1,dex:1,int:2,vit:2,pts:2},
    skills:['heal','poison_cloud','root','natures_blessing'] },
};

/* ---------------- SKILLS ----------------
   kind: melee | proj | proj3 | aoe_self | aoe_ground | heal | buff | cloud | root | dash | chain
------------------------------------------ */
const SKILLS = {
  heavy_strike:  { name:'Heavy Strike',    cls:'vanguard', icon:'⚔️', cost:29, cd:6,  kind:'melee',   mult:2.3, range:3.2, base:10, perLvl:2, unlock:3,  desc:'A two-handed blow with bone in it.' },
  shield_bash:   { name:'Shield Bash',     cls:'vanguard', icon:'🛡️', cost:21, cd:9,  kind:'melee',   mult:1.1, stun:2.0, range:3.2, base:20, perLvl:2.5, unlock:6,  desc:'Stuns the target.' },
  whirlwind:     { name:'Whirlwind',       cls:'vanguard', icon:'🌀', cost:39, cd:11, kind:'aoe_self', mult:1.7, radius:4.2, base:30, perLvl:3, unlock:9,   desc:'Spin, cutting everything nearby.' },
  war_cry:       { name:'War Cry',         cls:'vanguard', icon:'📣', cost:33, cd:22, kind:'buff', unlock:12, buff:{atk:.35,def:.35,dur:9}, desc:'Adrenaline and defiance: +35% ATK/DEF.' },
  power_shot:    { name:'Power Shot',      cls:'ranger',   icon:'🎯', cost:23, cd:5,  kind:'proj',    mult:2.4, range:17, speed:26, base:10, perLvl:2, unlock:3,  desc:'A drawn-back, focused arrow.' },
  multishot:     { name:'Multishot',       cls:'ranger',   icon:'🏹', cost:39, cd:9,  kind:'proj3',   mult:1.2, range:16, speed:24, base:20, perLvl:2.5, unlock:6,  desc:'Three arrows, one breath.' },
  poison_arrow:  { name:'Poison Arrow',    cls:'ranger',   icon:'☠️', cost:29, cd:7,  kind:'proj',    mult:1.0, poison:{dps:5,dur:6}, range:17, speed:26, base:30, perLvl:3, unlock:9,  desc:'Venom that keeps working.' },
  dash_shot:     { name:'Blink Step',      cls:'ranger',   icon:'💨', cost:16, cd:6,  kind:'dash',    dist:9, unlock:12, desc:'Vault away from danger.' },
  fireball:      { name:'Fireball',        cls:'arcanist', icon:'🔥', cost:33, cd:5,  kind:'proj',    mult:2.6, range:16, speed:20, base:10, perLvl:2, unlock:3,  desc:'A rolling sphere of flame.' },
  ice_shard:     { name:'Ice Shard',       cls:'arcanist', icon:'❄️', cost:23, cd:4,  kind:'proj',    mult:1.5, slow:{f:.5,dur:3.5}, range:16, speed:22, base:20, perLvl:2.5, unlock:6,  desc:'Chills to the marrow.' },
  lightning:     { name:'Lightning',       cls:'arcanist', icon:'⚡', cost:42, cd:8,  kind:'chain',   mult:2.2, range:15, magic:true, base:30, perLvl:3, unlock:9, desc:'Instant bolt that arcs to a second foe.' },
  meteor:        { name:'Meteor',          cls:'arcanist', icon:'☄️', cost:78, cd:15, kind:'aoe_ground', mult:3.0, radius:5, range:16, speed:30, base:40, perLvl:3.5, unlock:12, desc:'Call the sky down on your enemy.' },
  heal:          { name:'Mend Wounds',     cls:'warden',   icon:'💚', cost:34, cd:8,  kind:'heal',    power:34, perInt:3.2, unlock:3,  desc:'Green light closes your wounds.' },
  poison_cloud:  { name:'Poison Cloud',    cls:'warden',   icon:'🟢', cost:39, cd:11, kind:'cloud',   dps:6, dur:6, radius:4, range:12, unlock:6, desc:'A creeping miasma.' },
  root:          { name:'Grasp of Roots',  cls:'warden',   icon:'🌱', cost:26, cd:9,  kind:'root',    dur:3.5, range:14, unlock:9,  desc:'The earth holds them fast.' },
  natures_blessing:{ name:'Nature Blessing', cls:'warden', icon:'✨', cost:52, cd:24, kind:'buff', buff:{regen:7,dur:10}, unlock:12, desc:'Regenerate 7 HP/s for 10s.' },
};

/* ---------------- CREATURES ----------------
   spd in units/s. sight in units. atkRange units. atkCd seconds.
   model: builder key. colors: [body, head, accent].
-------------------------------------------- */
const CREATURES = {};
function C(id, o){ o.id = id; CREATURES[id] = o; }

C('cave_rat',      { name:'Cave Rat',        lvl:1,  hp:32,  atk:5,  def:0,  spd:3.4, xp:10,  sight:7,  atkRange:1.6, atkCd:1.6, model:'rat',     scale:.55, colors:[0x8a6f52,0x6e563d,0xff9ec4],
  gold:[0,3], loot:[{it:'rat_tail',ch:.45},{it:'raw_meat',ch:.15}] });
C('forest_snake',  { name:'Forest Snake',    lvl:2,  hp:46,  atk:7,  def:2,  spd:3.0, xp:16,  sight:8,  atkRange:1.8, atkCd:1.5, model:'snake',   scale:.8,  colors:[0x4f7a3a,0x3c5e2c,0xd8ff8a], poison:.25,
  gold:[1,4], loot:[{it:'swamp_herb',ch:.25}] });
C('wild_boar',     { name:'Wild Stag',       lvl:3,  hp:70,  atk:9,  def:3,  spd:3.8, xp:24,  sight:7,  atkRange:1.8, atkCd:1.8, model:'boar',    scale:.8,  colors:[0x6b5a44,0x4a3d2c,0xe8d8b0],
  gold:[2,6], loot:[{it:'deer_antler',ch:.35},{it:'raw_meat',ch:.45}] });
C('dire_wolf',     { name:'Dire Wolf',       lvl:4,  hp:98,  atk:12, def:4,  spd:4.6, xp:36,  sight:10, atkRange:2.0, atkCd:1.4, model:'wolf',    scale:1.0, colors:[0x5a5f6a,0x42464e,0xc0c8d8],
  gold:[3,9], loot:[{it:'wolf_pelt',ch:.6},{it:'raw_meat',ch:.45},{it:'wolf_fang',ch:.15}] });
C('giant_spider',  { name:'Giant Spider',    lvl:5,  hp:112, atk:14, def:5,  spd:3.6, xp:44,  sight:9,  atkRange:2.0, atkCd:1.5, model:'spider',  scale:1.0, colors:[0x3a2f3f,0x241c28,0x9a7fd0], poison:.3,
  gold:[4,10], loot:[{it:'spider_silk',ch:.55},{it:'minor_potion',ch:.1}] });
C('goblin_scout',  { name:'Goblin Scout',    lvl:5,  hp:120, atk:14, def:6,  spd:4.0, xp:50,  sight:10, atkRange:1.9, atkCd:1.5, model:'goblin',  scale:.85, colors:[0x5f8a3a,0x4a6e2c,0xc0392b],
  gold:[5,14], loot:[{it:'goblin_ear',ch:.5},{it:'supply_crate',ch:.3},{it:'iron_ore',ch:.2}] });
C('goblin_warrior',{ name:'Goblin Warrior',  lvl:7,  hp:175, atk:18, def:9,  spd:3.8, xp:68,  sight:10, atkRange:2.0, atkCd:1.5, model:'goblin',  scale:1.0, colors:[0x4f7a2c,0x3a5a1e,0x8e44ad],
  gold:[8,20], loot:[{it:'goblin_ear',ch:.5},{it:'iron_ore',ch:.3},{it:'studded_leather',ch:.04}] });
C('goblin_shaman', { name:'Goblin Shaman',   lvl:7,  hp:130, atk:21, def:6,  spd:3.2, xp:72,  sight:12, atkRange:10,  atkCd:2.2, model:'goblin',  scale:.85, colors:[0x6a8a3a,0x4a6e2c,0x27ae60], ranged:{color:0x2ecc71,speed:11},
  gold:[8,22], loot:[{it:'goblin_ear',ch:.4},{it:'minor_potion',ch:.25},{it:'swamp_herb',ch:.4}] });
C('orc_raider',    { name:'Orc Raider',      lvl:8,  hp:215, atk:23, def:11, spd:3.8, xp:88,  sight:11, atkRange:2.2, atkCd:1.6, model:'orc',     scale:1.15,colors:[0x4a6e3a,0x35502a,0x8b0000],
  gold:[10,26], loot:[{it:'iron_ore',ch:.3},{it:'hand_axe',ch:.05},{it:'deer_antler',ch:.2}] });
C('skeleton_warrior',{ name:'Skeleton Warrior', lvl:9, hp:195, atk:21, def:14, spd:3.4, xp:96, sight:10, atkRange:2.1, atkCd:1.5, model:'skeleton', scale:1.0, colors:[0xd8d0b8,0xc8c0a4,0x555566],
  gold:[12,28], loot:[{it:'bone_shard',ch:.6},{it:'iron_sword',ch:.04}] });
C('swamp_hag',     { name:'Swamp Hag',       lvl:10, hp:235, atk:26, def:10, spd:3.0, xp:118, sight:13, atkRange:9,   atkCd:2.1, model:'hag',     scale:.95, colors:[0x5a6e4a,0x41503a,0x8a2be2], ranged:{color:0x9b59b6,speed:10}, poison:.35,
  gold:[14,32], loot:[{it:'swamp_herb',ch:.55},{it:'minor_mana',ch:.2}] });
C('troll',         { name:'Cave Troll',      lvl:12, hp:400, atk:33, def:16, spd:3.0, xp:170, sight:11, atkRange:2.6, atkCd:2.0, model:'troll',   scale:1.5, colors:[0x6e7a5a,0x525c42,0x8a9a6a], regen:6,
  gold:[20,45], loot:[{it:'troll_hide',ch:.55},{it:'healing_potion',ch:.15}] });
C('dark_mage',     { name:'Dark Adept',      lvl:13, hp:265, atk:38, def:12, spd:3.2, xp:185, sight:14, atkRange:11,  atkCd:2.3, model:'mage',    scale:1.0, colors:[0x2c2440,0x1a1428,0xa05ae0], ranged:{color:0x8e44ad,speed:13},
  gold:[22,50], loot:[{it:'shadow_dust',ch:.6},{it:'greater_mana',ch:.1}] });
C('minotaur',      { name:'Minotaur',        lvl:14, hp:470, atk:41, def:18, spd:4.2, xp:225, sight:12, atkRange:2.6, atkCd:1.7, model:'minotaur',scale:1.35,colors:[0x7a4a2a,0x5c361e,0xd8d0b8], tint:0x8a5a2a,
  gold:[26,60], loot:[{it:'boar_tusk',ch:.4},{it:'iron_ore',ch:.45},{it:'battle_axe',ch:.05}] });
C('stone_golem',   { name:'Stone Golem',     lvl:16, hp:720, atk:47, def:30, spd:2.4, xp:320, sight:10, atkRange:2.8, atkCd:2.4, model:'golem',   scale:1.6, colors:[0x7a7d84,0x5c5f66,0x4fc3f7],
  gold:[40,90], loot:[{it:'golem_core',ch:.45},{it:'iron_ore',ch:.6}] });
C('wyvern',        { name:'Ash Wyvern',      lvl:18, hp:640, atk:53, def:20, spd:4.8, xp:400, sight:14, atkRange:2.6, atkCd:1.6, model:'wyvern',  scale:1.3, colors:[0x6a3a3a,0x4a2626,0xff7a3a], tint:0xff7a2a,
  gold:[55,120], loot:[{it:'wyvern_scale',ch:.6},{it:'dragon_scale',ch:.08}] });

// --- bosses
C('goblin_chieftain', { name:'Goblin Chieftain', lvl:9, hp:950, atk:26, def:13, spd:3.8, xp:420, sight:13, atkRange:2.4, atkCd:1.6, model:'chieftain', scale:1.5, colors:[0x4f7a2c,0x3a5a1e,0xffd700], boss:true,
  gold:[80,140], loot:[{it:'chieftain_trophy',ch:1},{it:'ring_of_might',ch:.35},{it:'battle_axe',ch:.35},{it:'greater_healing',ch:.5}] });
C('crypt_guardian', { name:'Crypt Guardian', lvl:15, hp:1700, atk:38, def:24, spd:3.2, xp:950, sight:15, atkRange:2.8, atkCd:1.8, model:'guardian', scale:1.8, colors:[0x3a3f52,0x23283a,0x7fd6ff], boss:true,
  gold:[180,300], loot:[{it:'ancient_relic',ch:1},{it:'vampire_band',ch:.35},{it:'knight_plate',ch:.2},{it:'ectoplasm',ch:1}] });
C('ancient_dragon', { name:'Ancient Dragon', lvl:22, hp:3400, atk:62, def:32, spd:3.6, xp:2600, sight:18, atkRange:4.2, atkCd:1.9, model:'dragon', scale:2.6, colors:[0x8a1f1f,0x5e1414,0xff9a3a], boss:true,
  gold:[400,700], loot:[{it:'heart_of_eldoria',ch:1},{it:'dragon_scale',ch:1,min:2,max:4},{it:'dragonsfang',ch:.3},{it:'greater_healing',ch:1,min:2,max:3}] });

/* ---------------- QUESTS ---------------- */
const QUESTS = {
  q_first_steps: { name:'The Road to Asterfall', main:true,
    desc:'You arrived in Asterfall with nothing but a name. Find Captain Arlen at the plaza and offer your sword.',
    obj:[{kind:'talk', id:'arlen', n:1, label:'Speak with Captain Arlen'}],
    reward:{xp:60,gold:20}, next:'q_rats' },
  q_rats: { name:'Rats in the Cellar',
    desc:'The tavern cellar has become a rat den. Clear it out — five at least — and watch for whatever drove them mad.',
    obj:[{kind:'kill', id:'cave_rat', n:5, label:'Slay Cave Rats'}],
    reward:{xp:120,gold:40,items:[{id:'minor_potion',n:3}]}, next:'q_class' },
  q_class: { name:'A Path Chosen', main:true, prereq:'q_rats',
    desc:'Brother Aldric of the temple reads potential in you. Seek him out and choose the path you will walk.',
    obj:[{kind:'talk', id:'aldric', n:1, label:'Speak with Brother Aldric'}],
    reward:{xp:60}, next:'q_lost_supplies' },
  q_lost_supplies: { name:'Lost Supplies', prereq:'q_class',
    desc:'Mira missing supply crates were raided on the Greenfields road. Goblins are skulking near the forest edge. Recover three crates.',
    obj:[{kind:'collect', id:'supply_crate', n:3, label:'Recover Stolen Supply Crates'}],
    reward:{xp:260,gold:80,items:[{id:'studded_leather',n:1}]}, next:'q_wolves' },
  q_wolves: { name:'The Wolf Problem',
    desc:'Dire packs prowl the Dark Forest now, too bold for starving animals. Cull four of them.',
    obj:[{kind:'kill', id:'dire_wolf', n:4, label:'Slay Dire Wolves'}],
    reward:{xp:320,gold:100}, next:'q_goblin_threat' },
  q_goblin_threat: { name:'Goblin Threat', main:true,
    desc:'The wolves were fleeing something. Scouts report goblin warbands digging into the hills. Find their mine in the Dark Forest.',
    obj:[{kind:'zone', id:'goblin_mine', n:1, label:'Enter the Goblin Mine'}],
    reward:{xp:280}, next:'q_into_the_mine' },
  q_into_the_mine: { name:'Into the Mine', main:true,
    desc:'The warband answers to a Chieftain fattened on stolen iron. End him and take proof.',
    obj:[{kind:'kill', id:'goblin_chieftain', n:1, label:'Slay the Goblin Chieftain'}],
    reward:{xp:650,gold:220,items:[{id:'healing_potion',n:4}]}, next:'q_ancient' },
  q_ancient: { name:'The Forgotten Crypt', main:true,
    desc:'The Chieftain was digging for something — a ward-key of the old kingdom, sealed in a crypt beneath the Ruins. Captain Arlen sends you south. Find the crypt in the Ancient Ruins.',
    obj:[{kind:'zone', id:'forgotten_crypt', n:1, label:'Enter the Forgotten Crypt'}],
    reward:{xp:420}, next:'q_relic' },
  q_relic: { name:'The Ancient Relic', main:true,
    desc:'A guardian of bone and blue fire keeps the relic. Break it, take the relic, and bring word to Arlen.',
    obj:[{kind:'kill', id:'crypt_guardian', n:1, label:'Slay the Crypt Guardian'},{kind:'collect', id:'ancient_relic', n:1, label:'Recover the Ancient Relic'},{kind:'talk', id:'arlen', n:1, label:'Report to Captain Arlen'}],
    reward:{xp:1400,gold:400,items:[{id:'greater_healing',n:4}]}, next:'q_dragon_wake' },
  q_dragon_wake: { name:'Dragon Awakening', main:true,
    desc:'The relic was a lock. Something under Dragon Mountain has noticed it is open. Arlen begs you: do not face it unprepared. Reach Dragon Mountain.',
    obj:[{kind:'zone', id:'dragon_mountain', n:1, label:'Reach Dragon Mountain'}],
    reward:{xp:900,gold:300}, next:'q_dragon_slayer' },
  q_dragon_slayer: { name:'The Last Flame', main:true,
    desc:'The Ancient Dragon claws its way up the caldera. Eldoria ends, or you end it.',
    obj:[{kind:'kill', id:'ancient_dragon', n:1, label:'Slay the Ancient Dragon'}],
    reward:{xp:5000,gold:1500}, },
  q_herbs: { name:'Bitter Leaves',
    desc:'Elara needs bogwort from the Murkwater Swamp for a commission. The hags guard it jealously.',
    obj:[{kind:'collect', id:'swamp_herb', n:8, label:'Gather Bogwort'}],
    reward:{xp:300,gold:120,items:[{id:'minor_mana',n:3}]}, side:true, prereq:'q_ancient' },
  q_training: { name:'Rowan Training',
    desc:'Ranger Rowan will drill you in the field. Slay a mixed dozen of the Greenfields vermin and beasts.',
    obj:[{kind:'kill', id:'wild_boar', n:4, label:'Wild Stags'},{kind:'kill', id:'forest_snake', n:4, 
label:'Forest Snakes'},{kind:'kill', id:'giant_spider', n:4, label:'Giant Spiders'}],
    reward:{xp:260,items:[{id:'swift_boots',n:1}]}, side:true, prereq:'q_class' },
};

/* ---------------- NPCS ---------------- */
const NPCS = {
  arlen:  { name:'Captain Arlen', title:'Warden of the Gate', zone:'asterfall', x:30, z:24, color:0x4a6ea8, role:'quest', quest:'q_first_steps', face:'fountain',
    lines:['The walls hold because the fields feed them and the mines arm them. Lately neither is safe. Stay sharp, outsider.'] },
  aldric: { name:'Brother Aldric', title:'Keeper of the Temple', zone:'asterfall', x:18, z:17, color:0xd8d0b8, role:'healer', face:'fountain',
    lines:['The temple light heals any who kneel. And when you are ready, it will show you what you are meant to become.'] },
  borin:  { name:'Borin', title:'Master Blacksmith', zone:'asterfall', x:36, z:20, color:0x8a5a2a, role:'shop', face:'fountain',
    shop:['rusty_sword','iron_sword','steel_sword','knightblade','hand_axe','battle_axe','the_reaver','wooden_shield','iron_shield','knight_shield','leather_armor','studded_leather','chainmail','knight_plate','leather_cap','iron_helm','knight_helm','chain_legs','knight_legs','leather_boots','knight_boots'],
    lines:['Steel sings when it is honest. I only sell the honest kind.'] },
  elara:  { name:'Elara', title:'Arcanist of the Blue Door', zone:'asterfall', x:20, z:35, color:0x6a3aa8, role:'shop', face:'fountain',
    shop:['apprentice_staff','oak_staff','arcane_staff','stormcaller','mages_robe','druidic_vest','minor_potion','healing_potion','greater_healing','minor_mana','greater_mana','beaded_charm','amulet_of_might','copper_ring','signet_of_focus','dragonfire_amulet','elven_crisps'],
    lines:['Magic is a debt, dear. My prices are the polite way to pay it.'] },
  mira:   { name:'Mira', title:'General Store', zone:'asterfall', x:35, z:35, color:0x2a8a5a, role:'shop', face:'fountain',
    shop:['bread','raw_meat','cooked_meat','minor_potion','antidote','cloth_tunic','cloth_legs','worn_boots','leather_armor','leather_legs','leather_boots','short_bow','leather_cap'],
    lines:['Rations, rope, and rumors — the last one is free.'] },
  rowan:  { name:'Rowan', title:'Ranger Trainer', zone:'asterfall', x:45, z:11, color:0x3a7a3a, role:'trainer', quest:'q_training', face:'fountain',
    shop:['short_bow','long_bow','yew_composite','windsinger','swift_boots'],
    lines:['Dead eye, quiet feet. I can teach the feet. The eye is yours.'] },
  talia:  { name:'Talia', title:'Bank of Asterfall', zone:'asterfall', x:19, z:21, color:0xa8842a, role:'bank', face:'fountain',
    lines:['Gold sleeps safer here than in any boot.'] },
};

/* ---------------- ZONES ----------------
   w,h in tiles. theme drives terrain colors.
   spawns: {c, x,z,w,h,n} rectangles in tiles.
   exits:  {x,z tile, to, tx,tz target tile, label, gate:{type,id}}
   chests: {x,z, items:[{id,n}]}
------------------------------------------ */
const ZONES = {
  asterfall: { name:'Asterfall', w:56, h:56, theme:'town',
    spawns:[ { c:'cave_rat', n:6, x:16, z:42, w:16, h:10 } ], chests:[], traps:[],
    exits:[
      { x:52, z:28, to:'greenfields',    tx:1,  tz:28, label:'Greenfields Road' },
      { x:28, z:3,  to:'dark_forest',    tx:28, tz:57, label:'Dark Forest', gate:{type:'vocation'} },
      { x:28, z:52, to:'murkwater',      tx:28, tz:1,  label:'Murkwater Causeway', gate:{type:'vocation'} },
    ]},
  greenfields: { name:'Greenfields', w:60, h:60, theme:'fields',
    spawns:[
      { c:'cave_rat', n:7,  x:30, z:6,  w:22, h:16 },
      { c:'forest_snake', n:6, x:6, z:34, w:22, h:18 },
      { c:'wild_boar', n:6, x:36, z:36, w:18, h:18 },
      { c:'goblin_scout', n:3, x:44, z:10, w:12, h:10 },
    ], chests:[ { x:48, z:14, items:[{id:'copper_ring',n:1},{id:'minor_potion',n:2}] } ], traps:[],
    exits:[ { x:1, z:28, to:'asterfall', tx:53, tz:28, label:'Asterfall' } ] },
  dark_forest: { name:'Dark Forest', w:60, h:60, theme:'forest',
    spawns:[
      { c:'dire_wolf', n:8, x:6, z:6, w:22, h:20 },
      { c:'giant_spider', n:7, x:34, z:30, w:20, h:20 },
      { c:'goblin_scout', n:6, x:8, z:38, w:22, h:14 },
      { c:'orc_raider', n:4, x:40, z:6, w:14, h:14 },
    ],
    chests:[ { x:10, z:10, items:[{id:'iron_sword',n:1},{id:'healing_potion',n:2}] }, { x:48, z:48, items:[{id:'leather_cap',n:1},{id:'minor_potion',n:2}] } ],
    traps:[],
    exits:[
      { x:28, z:58, to:'asterfall', tx:28, tz:2, label:'Asterfall' },
      { x:28, z:1,  to:'frost_peaks', tx:28, tz:57, label:'Frost Peaks', gate:{type:'quest', id:'q_relic'} },
      { x:47, z:20, to:'goblin_mine', tx:4, tz:4, label:'Goblin Mine', gate:{type:'quest', id:'q_wolves'} },
    ]},
  goblin_mine: { name:'Goblin Mine', w:44, h:44, theme:'mine', indoor:true,
    spawns:[
      { c:'goblin_scout', n:5, x:8, z:8, w:12, h:10 },
      { c:'goblin_warrior', n:6, x:24, z:10, w:14, h:12 },
      { c:'goblin_shaman', n:3, x:28, z:26, w:10, h:10 },
    ],
    chests:[ { x:12, z:32, items:[{id:'iron_shield',n:1},{id:'healing_potion',n:3}] }, { x:34, z:8, items:[{id:'ring_of_might',n:1}] } ],
    traps:[ {x:16,z:12},{x:22,z:20},{x:30,z:16},{x:12,z:26},{x:34,z:30} ],
    exits:[ { x:4, z:4, to:'dark_forest', tx:46, tz:20, label:'Dark Forest' } ] },
  murkwater: { name:'Murkwater Swamp', w:60, h:60, theme:'swamp',
    spawns:[
      { c:'forest_snake', n:7, x:6, z:8, w:20, h:16 },
      { c:'giant_spider', n:6, x:34, z:34, w:20, h:18 },
      { c:'swamp_hag', n:6, x:10, z:36, w:18, h:16 },
      { c:'dire_wolf', n:4, x:38, z:8, w:16, h:14 },
    ],
    chests:[ { x:8, z:50, items:[{id:'druidic_vest',n:1},{id:'antidote',n:3}] } ], traps:[],
    exits:[
      { x:28, z:1, to:'asterfall', tx:28, tz:53, label:'Asterfall' },
      { x:28, z:58, to:'ancient_ruins', tx:28, tz:2, label:'Ancient Ruins', gate:{type:'quest', id:'q_ancient'} },
    ]},
  ancient_ruins: { name:'Ancient Ruins', w:60, h:60, theme:'ruins',
    spawns:[
      { c:'skeleton_warrior', n:8, x:8, z:8, w:20, h:18 },
      { c:'dark_mage', n:4, x:36, z:10, w:16, h:14 },
      { c:'troll', n:5, x:10, z:36, w:20, h:16 },
      { c:'orc_raider', n:5, x:36, z:36, w:16, h:16 },
    ],
    chests:[ { x:50, z:6, items:[{id:'chainmail',n:1},{id:'greater_healing',n:2}] } ], traps:[ {x:28,z:24},{x:26,z:26} ],
    exits:[
      { x:28, z:1,  to:'murkwater', tx:28, tz:57, label:'Murkwater Swamp' },
      { x:28, z:58, to:'dragon_mountain', tx:28, tz:2, label:'Dragon Mountain', gate:{type:'quest', id:'q_relic'} },
      { x:12, z:30, to:'forgotten_crypt', tx:4, tz:4, label:'Forgotten Crypt', gate:{type:'quest', id:'q_into_the_mine'} },
    ]},
  forgotten_crypt: { name:'Forgotten Crypt', w:44, h:44, theme:'crypt', indoor:true,
    spawns:[
      { c:'skeleton_warrior', n:9, x:8, z:8, w:28, h:10 },
      { c:'dark_mage', n:4, x:8, z:26, w:12, h:10 },
      { c:'giant_spider', n:5, x:26, z:26, w:12, h:10 },
    ],
    chests:[ { x:20, z:8, items:[{id:'ectoplasm',n:3},{id:'greater_mana',n:2}] }, { x:6, z:20, items:[{id:'signet_of_focus',n:1}] } ],
    traps:[ {x:14,z:14},{x:22,z:14},{x:14,z:22},{x:22,z:22},{x:30,z:22} ],
    exits:[ { x:4, z:4, to:'ancient_ruins', tx:12, tz:29, label:'Ancient Ruins' } ] },
  frost_peaks: { name:'Frost Peaks', w:60, h:60, theme:'snow',
    spawns:[
      { c:'stone_golem', n:6, x:8, z:8, w:20, h:18 },
      { c:'troll', n:6, x:34, z:30, w:18, h:18 },
      { c:'dire_wolf', n:6, x:8, z:36, w:16, h:14 },
      { c:'minotaur', n:4, x:36, z:8, w:14, h:14 },
    ],
    chests:[ { x:50, z:50, items:[{id:'knight_helm',n:1},{id:'greater_healing',n:3}] } ], traps:[],
    exits:[ { x:28, z:58, to:'dark_forest', tx:28, tz:2, label:'Dark Forest' } ] },
  dragon_mountain: { name:'Dragon Mountain', w:60, h:60, theme:'volcanic',
    spawns:[
      { c:'minotaur', n:6, x:8, z:10, w:20, h:16 },
      { c:'wyvern', n:5, x:36, z:36, w:18, h:16 },
      { c:'stone_golem', n:4, x:8, z:38, w:14, h:12 },
      { c:'dark_mage', n:4, x:38, z:8, w:14, h:12 },
    ],
    chests:[ { x:6, z:6, items:[{id:'dragonfire_amulet',n:1},{id:'greater_healing',n:3}] } ],
    traps:[ {x:20,z:30},{x:38,z:20},{x:30,z:40} ],
    exits:[ { x:28, z:1, to:'ancient_ruins', tx:28, tz:57, label:'Ancient Ruins' } ],
    bossSpawn:{ c:'ancient_dragon', x:30, z:44 } },
  // boss rooms handled by world gen: chieftain in mine, guardian in crypt
};
ZONES.goblin_mine.bossSpawn = { c:'goblin_chieftain', x:33, z:33 };
ZONES.forgotten_crypt.bossSpawn = { c:'crypt_guardian', x:33, z:33 };

/* ---------------- shops: what they buy ---------------- */
const BUY_ALL = true; // shops buy any sellable item at sellPrice

/* ---------------- XP curve ---------------- */
function xpNeeded(level){ return Math.round(60 * Math.pow(level, 1.55) + 40 * level); }
const LEVEL_CAP = 30;

/* ---------------- tutorial steps ---------------- */
const TUTORIAL = [
  { id:'t_move',   text:'Move with W A S D or the arrow keys. Scroll to zoom the camera.' },
  { id:'t_talk',   text:'Captain Arlen waits in the plaza. Walk close to him and press F (or click him) to talk.', cond:{kind:'talk',id:'arlen'} },
  { id:'t_attack', text:'Select a Cave Rat by clicking it, then press SPACE or just stay near it — you attack automatically while a target is held.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_loot',   text:'Walk over the glowing pile to collect XP and loot. Rare drops shine brighter.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_inv',    text:'Press I for your Inventory. Click an item and use the buttons to equip or consume it.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_quest',  text:'Press Q to open the Quest Log. The tracker on the right shows your objectives.', cond:{kind:'quest',id:'q_rats'} },
  { id:'t_shop',   text:'Gold spends itself! Talk to a merchant (Mira, Borin, Elara, Rowan) and pick Trade.', cond:{kind:'quest',id:'q_class'} },
  { id:'t_class',  text:'Return to the temple and speak with Brother Aldric to choose your vocation.', cond:{kind:'quest',id:'q_class'} },
];
