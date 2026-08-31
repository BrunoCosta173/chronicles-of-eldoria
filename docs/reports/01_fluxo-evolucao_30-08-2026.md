# Chronicles of Eldoria — Documentação do Fluxo de Evolução In-Game

> **Objetivo:** condensar toda a lógica canônica extraída do código (`data.js`, `world.js`, `entities.js`, `systems.js`, `game.js`, `assets.js`, `ui.js`) para servir de **base para expansão**.  
> Versão do dump: 30/08/2026 — nível cap 30, 9 zonas, 3 bosses. Auditado 30/08/2026: 73 itens, 11 chests, 28 assets + 60 env props.

---

## 1. Visão Geral

- **Gênero:** RPG single-player isométrico/3ª pessoa (Three.js), estilo Tibia + Diablo simplificado.
- **Loop central:** `Explorar zona → Matar / Coletar → Loot → Equipar / Vender → Subir nível → Liberar gate → Avançar zona → Boss`.
- **Persistência:** 3 slots de save (`localStorage` `eldoria_slot_1..3` + `eldoria_settings`), save auto a cada 30s e em transições. Migração legada `eldoria_save_v1`.
- **Ciclo dia/noite:** 900s (15 min) por dia completo, `DayNight.t`. Outdoor afeta `fog`, `sky`, `sun.intensity`; indoor fixa luz (fog density 0).
- **Morte:** perde 5% gold, respawn em Asterfall (28,28) com 50% HP/100% MP, buffs limpos.

---

## 2. História (Lore implícita nas quests)

```
Chegada em Asterfall (q_first_steps)
  -> Porões de ratos (q_rats) - teste do recém-chegado
  -> Escolha de Vocação no Templo (q_class) - Aldric revela seu destino
  -> Greenfields saqueada por Goblins (q_lost_supplies) - Mira perdeu 3 crates
  -> Lobos deslocados pela pressão Goblin (q_wolves - 4 Dire Wolf em Dark Forest)
  -> Descoberta da Goblin Mine (q_goblin_threat / q_into_the_mine) - Chieftain atrás
  -> Chieftain cavava algo: a ward-key do Antigo Reino (q_ancient -> Forgotten Crypt)
  -> Crypt Guardian guarda a Ancient Relic (q_relic) - levar a Arlen
  -> A Relic era um cadeado; Dragon Mountain acordou (q_dragon_wake / q_dragon_slayer)
  -> Caldeira final vs Ancient Dragon (ancient_dragon Lv22) - "The Last Flame"
  | Side: Bogwort no Swamp para Elara (q_herbs, após q_ancient) e Treino de Rowan (q_training - 12 abates mistos em Greenfields)
```

Essência narrativa: **Asterfall depende de campos e minas; ambos falham por pressão goblin; por trás dos goblins há uma escavação arqueológica que libera uma ameaça dracônica selada.**

---

## 3. Mapa de Zonas — Grafo de Progressão

```
Frost Peaks (snow) ──gate(q_relic)── Dark Forest (forest) ──vocation── Asterfall (town) ──vocation── Murkwater Swamp (swamp)
      │                                  │  │                          │                          │
      │                                  │  └── q_wolves → Goblin Mine (mine/indoor, boss Goblin Chieftain)
      │                                  │                              └─ Greenfields (fields, pond+bridge chest 48,14)
      │                                  └── q_ancient → Ancient Ruins (ruins) ──q_into_the_mine── Forgotten Crypt (crypt/indoor, boss Crypt Guardian)
      │                                                                   │
      │                                                                   └─ q_relic → Dragon Mountain (volcanic, boss Ancient Dragon + arena 22,36 18x16)
      └── (snow chest 50,50)           (portais são cilindros emissivos; gate bloqueia fisicamente + empurra player de volta)
```

### 3.1 Tabela detalhada de Zonas

| ID | Nome | Dim | Tema | Indoor | Spawns (n, rect) | Chests | Traps | Exits (x,z → to tx,tz, gate) |
|---|---|---|---|---|---|---|---|---|
| `asterfall` | Asterfall | 56x56 | town | não | cave_rat 6 (16,42 16x10) | — | — | 52,28→greenfields 1,28 ; 28,3→dark_forest 28,57 (vocation) ; 28,52→murkwater 28,1 (vocation) |
| `greenfields` | Greenfields | 60x60 | fields | não | cave_rat 7 (30,6 22x16), forest_snake 6 (6,34 22x18), wild_boar 6 (36,36 18x18), goblin_scout 3 (44,10 12x10) | **1:** 48,14 (ponte) copper_ring + minor_potion×2 | — | 1,28→asterfall 53,28 |
| `dark_forest` | Dark Forest | 60x60 | forest | não | dire_wolf 8, giant_spider 7, goblin_scout 6, orc_raider 4 | 10,10 iron_sword+healing×2 ; 48,48 leather_cap+minor×2 | — | 28,58→asterfall ; 28,1→frost_peaks (quest q_relic) ; 47,20→goblin_mine 4,4 (quest q_wolves) |
| `goblin_mine` | Goblin Mine | 44x44 | mine | **sim** | goblin_scout 5, goblin_warrior 6, goblin_shaman 3 | 12,32 iron_shield+healing×3 ; 34,8 ring_of_might | 5 traps | 4,4→dark_forest + bossSpawn 33,33 goblin_chieftain |
| `murkwater` | Murkwater Swamp | 60x60 | swamp | não | forest_snake 7, giant_spider 6, swamp_hag 6, dire_wolf 4 | 8,50 druidic_vest+antidote×3 | — | 28,1→asterfall ; 28,58→ancient_ruins (quest q_ancient) |
| `ancient_ruins` | Ancient Ruins | 60x60 | ruins | não | skeleton_warrior 8, dark_mage 4, troll 5, orc_raider 5 | 50,6 chainmail+greater_healing×2 | 28,24 26,26 | 28,1→murkwater ; 28,58→dragon_mountain (quest q_relic) ; 12,30→forgotten_crypt 4,4 (quest q_into_the_mine) |
| `forgotten_crypt` | Forgotten Crypt | 44x44 | crypt | **sim** | skeleton_warrior 9, dark_mage 4, giant_spider 5 | 20,8 ectoplasm×3+greater_mana×2 ; 6,20 signet_of_focus | 5 traps | 4,4→ancient_ruins + boss 33,33 crypt_guardian |
| `frost_peaks` | Frost Peaks | 60x60 | snow | não | stone_golem 6, troll 6, dire_wolf 6, minotaur 4 | 50,50 knight_helm+greater_healing×3 | — | 28,58→dark_forest |
| `dragon_mountain` | Dragon Mountain | 60x60 | volcanic | não | minotaur 6, wyvern 5, stone_golem 4, dark_mage 4 | 6,6 dragonfire_amulet+greater×3 | 3 traps | 28,1→ancient_ruins + boss 30,44 ancient_dragon |

**Geração procedural (world.js):**
- `genTown`: plaza pedra 20,20 16x16 + roads + 6 buildings (church/tavern/blacksmith/market/home) via `envProp` glTF, bank procedural, fountain animada (28,28), benches/planters.
- `genFields`: road 0,27 60x3 + 28,0 4x60, 4 fazendas, pond 44,12 9x7 + bridge 47,10 2x11, tallgrass patches.
- `genForest`: roads cruz + camp 44,16 8x8.
- `genSwamp`: sand roads + 46 lagoas water + 30 sand patches.
- `genRuins`: muros quebrados + temple 22,22 16x16 + crypt plaza 8,26 9x9.
- `genSnow`/`genVolcanic`: variações com lava/moors.
- `genDungeon(crypt)`: fill WALL, carve **8 rooms** + 8 corredores (2,2 6x6; 16,6 10x8; 30,6 8x8; 6,22 8x8; 20,20 8x8; 30,20 8x8; 28,28 12x12; 4,32 8x8), sarcófagos em crypt.

**Gates (game.js:tryPortal):**
- `vocation`: exige `player.cls !== 'adventurer'` senão mensagem + empurrão 2.5u.
- `quest`: exige `G.quests[id].status==='done'`.

---

## 4. Quests — Fluxo Canônico (data.js:QUESTS)

### 4.1 Main Chain (★)

| Quest | Nome | Tipo | Objetivo (kind) | Reward | Next |
|---|---|---|---|---|---|
| `q_first_steps` | The Road to Asterfall | main, starter | talk arlen×1 | 60 XP 20g | q_rats |
| `q_rats` | Rats in the Cellar | — | kill cave_rat×5 | 120 XP 40g minor_potion×3 | q_class |
| `q_class` | A Path Chosen | main, prereq q_rats | talk aldric×1 | 60 XP | q_lost_supplies |
| `q_lost_supplies` | Lost Supplies | prereq q_class | collect supply_crate×3 (goblin_scout 30%) | 260 XP 80g studded_leather | q_wolves |
| `q_wolves` | The Wolf Problem | — | kill dire_wolf×4 | 320 XP 100g | q_goblin_threat |
| `q_goblin_threat` | Goblin Threat | main | zone goblin_mine×1 | 280 XP | q_into_the_mine |
| `q_into_the_mine` | Into the Mine | main | kill goblin_chieftain×1 | 650 XP 220g healing×4 | q_ancient |
| `q_ancient` | The Forgotten Crypt | main | zone forgotten_crypt×1 | 420 XP | q_relic |
| `q_relic` | The Ancient Relic | main | kill crypt_guardian + collect ancient_relic + talk arlen | 1400 XP 400g greater×4 | q_dragon_wake |
| `q_dragon_wake` | Dragon Awakening | main | zone dragon_mountain×1 | 900 XP 300g | q_dragon_slayer |
| `q_dragon_slayer` | The Last Flame | main | kill ancient_dragon×1 | 5000 XP 1500g | (victory screen) |

### 4.2 Side Quests

| Quest | Nome | Prereq | Objetivo | Reward |
|---|---|---|---|---|
| `q_herbs` | Bitter Leaves (Elara) | q_ancient | collect swamp_herb×8 (murkwater) | 300 XP 120g minor_mana×3 |
| `q_training` | Rowan Training | q_class | kill wild_boar×4 + forest_snake×4 + giant_spider×4 | 260 XP swift_boots |

**Sistema (systems.js:Quests):**
- `accept` cria `{status:'active', prog:[0...]}`.
- `onKill/onCollect/onZoneEnter/onTalk` incrementam prog.
- `allDone` → `_ready` → `giverOf` decide quem entrega (map fixo + NPC.quest).
- Se não há giver (ex: q_wolves), `ready` auto `turnIn`.
- `turnIn` dá XP/gold/items, `gainXp` pode causar level up, aceita `q.next`.

---

## 5. NPCs (data.js:NPCS)

| ID | Nome | Título | Zona (x,z) | Papel | Shop / Quest | Frase |
|---|---|---|---|---|---|---|
| `arlen` | Captain Arlen | Warden of the Gate | asterfall 30,24 | quest | q_first_steps | "...fields feed them and mines arm them..." |
| `aldric` | Brother Aldric | Keeper of the Temple | 18,17 | healer+vocation | q_class | cura free (HP/MP/poison) + abre `vocation-modal` |
| `borin` | Borin | Master Blacksmith | 36,20 | shop | 21 itens (swords/axes/shields/armors) | "Steel sings..." |
| `elara` | Elara | Arcanist | 20,35 | shop | 17 itens (staves/robes/potions/rings) + q_herbs giver | "Magic is a debt..." |
| `mira` | Mira | General Store | 35,35 | shop | 13 itens + q_lost_supplies giver | "Rations, rope, rumors..." |
| `rowan` | Rowan | Ranger Trainer | 45,11 | trainer+shop | 5 itens bow/swift_boots + q_training | "Dead eye, quiet feet..." |
| `talia` | Talia | Bank of Asterfall | 19,21 | bank | depot 40 slots | "Gold sleeps safer..." |

NPC visuals: `NPC_MODEL` mapeia para Knight/Rogue/Mage/Barbarian glb; `NPC_LOADOUT` aplica arma+escudo.

---

## 6. Vocações & Skills

### 6.1 Vocações (CLASSES)

| ID | Nome | Ícone | Desc | Stats iniciais (hp,mp,str,dex,int,vit) | Crescimento/nível (hp,mp,str,dex,int,vit,pts) | Skills |
|---|---|---|---|---|---|---|
| `adventurer` | Adventurer | ✜ | starter bloqueado fora de Asterfall | — | 12,5,1,1,1,1, pts2 | — |
| `vanguard` | Vanguard | 🛡️ | swords/axes+shield | 70,10,6,1,0,6 | 16,4,2,1,0,2, pts2 | heavy_strike(3) shield_bash(6) whirlwind(9) war_cry(12) |
| `ranger` | Ranger | 🏹 | bow/speed/crit | 30,20,2,7,1,2 | 11,6,1,2,1,1, pts2 | power_shot(3) multishot(6) poison_arrow(9) dash_shot(12) |
| `arcanist` | Arcanist | 🔥 | elemental | 5,70,0,1,8,0 | 8,14,0,1,3,1, pts2 | fireball(3) ice_shard(6) lightning(9) meteor(12) |
| `warden` | Warden | 🌿 | heal/poison/root | 30,45,1,2,5,4 | 12,9,1,1,2,2, pts2 | heal(3) poison_cloud(6) root(9) natures_blessing(12) |

**Escolha:** ao completar `q_class` falando com Aldric → `vocation-modal` (4 cards) → `chooseVocation` aplica `start` nos attrs, `recalc`, `rebuildMesh`, `turnIn q_class` + toast + save. **Irreversível.**

### 6.2 Skills detalhadas (SKILLS)

| Skill (id → display) | Classe | Ícone | Custo MP | CD | Kind | Mult/efeito | Range | Unlock | Desc |
|---|---|---|---|---|---|---|---|---|---|
| heavy_strike → Heavy Strike | vanguard | ⚔️ | 29 | 6s | melee | 2.3× base10 per2 | 3.2 | 3 | blow |
| shield_bash → Shield Bash | vanguard | 🛡️ | 21 | 9s | melee | 1.1× + stun2s base20 per2.5 | 3.2 | 6 | stun |
| whirlwind → Whirlwind | vanguard | 🌀 | 39 | 11s | aoe_self | 1.7× base30 per3 | r4.2 | 9 | spin |
| war_cry → War Cry | vanguard | 📣 | 33 | 22s | buff | +35%ATK/DEF 9s | — | 12 | buff |
| power_shot → Power Shot | ranger | 🎯 | 23 | 5s | proj | 2.4× base10 per2 spd26 | 17 | 3 | focused arrow |
| multishot → Multishot | ranger | 🏹 | 39 | 9s | proj3 | 1.2× ×3 base20 per2.5 spd24 | 16 | 6 | 3 arrows |
| poison_arrow → Poison Arrow | ranger | ☠️ | 29 | 7s | proj | 1.0× + poison 5dps 6s spd26 | 17 | 9 | venom |
| dash_shot → **Blink Step** | ranger | 💨 | 16 | 6s | dash | dist9 | — | 12 | vault |
| fireball → Fireball | arcanist | 🔥 | 33 | 5s | proj | 2.6× base10 per2 spd20 | 16 | 3 | flame sphere |
| ice_shard → Ice Shard | arcanist | ❄️ | 23 | 4s | proj | 1.5× + slow 0.5 3.5s spd22 | 16 | 6 | chill |
| lightning → Lightning | arcanist | ⚡ | 42 | 8s | chain | 2.2× + chain 1 extra 0.5× | 15 | 9 | arc |
| meteor → Meteor | arcanist | ☄️ | 78 | 15s | aoe_ground | 3.0× base40 per3.5 spd30 | r5 16 | 12 | sky fall |
| heal → **Mend Wounds** | warden | 💚 | 34 | 8s | heal | 34+3.2×int | — | 3 | green light |
| poison_cloud → Poison Cloud | warden | 🟢 | 39 | 11s | cloud | 6dps 6s r4 | 12 | 6 | miasma |
| root → **Grasp of Roots** | warden | 🌱 | 26 | 9s | root | dur3.5s | 14 | 9 | earth hold |
| natures_blessing → **Nature Blessing** | warden | ✨ | 52 | 24s | buff | regen7/s 10s | — | 12 | regen |

`skillRoll = base + level*perLvl`; `dmg = roll*mult*(crit?2:1)`; `defMit = 100/(100+def*4)`.

**Hotbar:** slots 1-4 = skills da classe; 5 = Eat (primeira food no inv); 6 = Potion (primeira healing potion). `Combat.castSkill` valida mana, CD, range, target, aplica efeito e dispara anim `attack/shoot/cast`.

---

## 7. Criaturas & Bosses

### 7.1 Bestiário (CREATURES) — ordenado por Lv

| ID | Nome | Lv | HP | ATK | DEF | SPD | XP | Sight | Range | CD | Modelo / Escala | Ranged | Especiais | Gold | Loot (ch) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| cave_rat | Cave Rat |1|32|5|0|3.4|10|7|1.6|1.6|rat .55|—|—|0-3|rat_tail .45 raw_meat .15|
| forest_snake | Forest Snake |2|46|7|2|3.0|16|8|1.8|1.5|snake .8|—|poison .25|1-4|swamp_herb .25|
| wild_boar | Wild Stag |3|70|9|3|3.8|24|7|1.8|1.8|boar .8|—|—|2-6|deer_antler .35 raw_meat .45|
| dire_wolf | Dire Wolf |4|98|12|4|4.6|36|10|2.0|1.4|wolf 1.0|—|—|3-9|wolf_pelt .6 raw_meat .45 wolf_fang .15|
| giant_spider | Giant Spider |5|112|14|5|3.6|44|9|2.0|1.5|spider 1.0|—|poison .3|4-10|spider_silk .55 minor_potion .1|
| goblin_scout | Goblin Scout |5|120|14|6|4.0|50|10|1.9|1.5|goblin .85|—|—|5-14|goblin_ear .5 supply_crate .3 iron_ore .2|
| goblin_warrior | Goblin Warrior |7|175|18|9|3.8|68|10|2.0|1.5|goblin 1.0|—|—|8-20|goblin_ear .5 iron_ore .3 studded .04|
| goblin_shaman | Goblin Shaman |7|130|21|6|3.2|72|12|10|2.2|goblin .85|ranged 11|—|8-22|goblin_ear .4 minor .25 swamp_herb .4|
| orc_raider | Orc Raider |8|215|23|11|3.8|88|11|2.2|1.6|orc 1.15|—|—|10-26|iron_ore .3 hand_axe .05 **deer_antler .2**|
| skeleton_warrior | Skeleton Warrior |9|195|21|14|3.4|96|10|2.1|1.5|skeleton 1.0|—|—|12-28|bone_shard .6 iron_sword .04|
| swamp_hag | Swamp Hag |10|235|26|10|3.0|118|13|9|2.1|hag .95|ranged 10|poison .35|14-32|swamp_herb .55 minor_mana .2|
| troll | Cave Troll |12|400|33|16|3.0|170|11|2.6|2.0|troll 1.5|—|regen6|20-45|troll_hide .55 healing .15|
| dark_mage | Dark Adept |13|265|38|12|3.2|185|14|11|2.3|mage 1.0|ranged 13|—|22-50|shadow_dust .6 greater_mana .1|
| minotaur | Minotaur |14|470|41|18|4.2|225|12|2.6|1.7|minotaur 1.35|—|⚠️ loot `boar_tusk .4` **inexistente** em ITEMS (bug) + iron_ore .45 battle_axe .05|26-60|boar_tusk .4 (bug) + iron_ore .45 battle_axe .05|
| stone_golem | Stone Golem |16|720|47|30|2.4|320|10|2.8|2.4|golem 1.6|—|—|40-90|golem_core .45 iron_ore .6|
| wyvern | Ash Wyvern |18|640|53|20|4.8|400|14|2.6|1.6|wyvern 1.3|—|—|55-120|wyvern_scale .6 dragon_scale .08|

### 7.2 Bosses

| ID | Nome | Lv | HP | ATK | DEF | SPD | XP | Mecânicas | Loot garantido |
|---|---|---|---|---|---|---|---|---|---|
| `goblin_chieftain` | Goblin Chieftain |9|950|26|13|3.8|420| Fase2 <50% rage 1.2×spd/dmg; whirl 5.5u / smash jump; summon 2× goblin_scout <50% | chieftain_trophy, ring_of_might .35, battle_axe .35, greater_healing .5 |
| `crypt_guardian` | Crypt Guardian |15|1700|38|24|3.2|950| Shadow bolts (4/6proj) + summon 2 skeleton <50% | ancient_relic, vampire_band .35, knight_plate .2, ectoplasm×1 |
| `ancient_dragon` | Ancient Dragon |22|3400|62|32|3.6|2600| Breath <9u 1.5×dmg / meteors 5× AoE 4.5 | heart_of_eldoria, dragon_scale 2-4, dragonsfang .3, greater×2-3 |

**IA (Creature.update):** IDLE → CHASE se d < sight, PATROL aleatório 2-4s, RETURN se >18u do home, ATTACK se d≤atkRange, bossAI cada 6-10s, enrage <50%.

---

## 8. Progressão Numérica

- **XP curve:** `xpNeeded(lvl)=round(60*lvl^1.55 + 40*lvl)` — L1 100, L2 256, L3 449, L5 927, **L10 2529**, L15 4591, L20 7034, L22 8106, L30 12887. Cap 30.
- **Player base:** `hp 120+ start.hp + lvl*12 + vit*8 + eq.hp + growthDelta`; `mp 40+ start.mp + lvl*4 + int*6 + eq.mp`.
- **Dano:** `atk = ((dmgMin+dmgMax)/2 + atkStat*bonus(0.6 phys/0.9 magic) + lvl*1.5) * (1+buffAtk)`; mitigação `dmg*100/(100+def*4)`; crit cap 45% (`5+dex*0.28+eq.crit`); dodge cap 25% (`dex*0.2`).
- **Atributos:** 2 pontos por nível (via growth), alocáveis em STR/DEX/INT/VIT; VIT cura regen 0.1+vit*0.1/s fora combate & não faminto.
- **Stamina:** 100, sprint 1.7× spd, -11/s sprintando, +13/s parado; exausto <0, recupera ≥30.
- **Fome:** satiation 100→0 em 480s (0.208/s); hungry ≤37.5, starving 0 → HP drena 1/s até 20.
- **Resistências:** poison tick separado; slow/root/stun timers em `Creature.t`.

---

## 9. Itens & Economia

### 9.1 Itens (73 ids em data.js:ITEMS — corrigido de 107)

**Armas:** swords [rusty(4-7) iron(7-11) steel(11-16) knightblade(16-22) dragonsfang(24-32)]; axes [hand(5-9) battle(9-15) reaver(15-23)]; bows [short(3-6) long(6-9) yew(9-13) windsinger(13-19) r18]; staves [apprentice(3-5) oak(6-8) arcane(8-13) stormcaller(13-18)].
**Defesa:** shields (3-10def), armors (2-18def), helms, legs, boots (spd 2-8), rings/amulets (str/int/vit/crit/hp/mp).
**Consumíveis:** potions heal 45/110/230, mana 60/150, antidote, foods 20/12/55/90 (+mana), stack 99.
**Quest:** supply_crate, ancient_relic, chieftain_trophy.
**Materiais:** wolf_pelt, spider_silk, goblin_ear, bone_shard, troll_hide, golem_core, wyvern_scale, dragon_scale, swamp_herb, iron_ore, shadow_dust, etc. — usados só como loot/coleta e venda.

**Distribuição raridade (contada):** common ~36, uncommon ~19, rare ~12, epic ~7, legendary 3 (dragonsfang, heart_of_eldoria, ancient_relic). Price 4g (rat_tail) → 6000g (heart_of_eldoria); `sellPrice = max(1, round(price*0.4))`.

**Preços:** `sellPrice = round(price*0.4)`; shops compram tudo (`BUY_ALL=true`) exceto quest items.

### 9.2 Shops (NPCs)

- **Borin:** 21 itens foco melee/tank.
- **Elara:** 17 itens magia/potions/amulets.
- **Mira:** 13 itens básicos + food/bows.
- **Rowan:** 5 itens ranger/swift_boots.
- **Talia:** vault 40 slots (Depot deposit/withdraw).

### 9.3 Chests (11 chests em 8 zonas — asterfall 0)

| Zona | Coords | Loot |
|---|---|---|
| greenfields | 48,14 (ponte) | copper_ring + minor_potion×2 |
| dark_forest | 10,10 | iron_sword + healing_potion×2 |
| dark_forest | 48,48 | leather_cap + minor_potion×2 |
| goblin_mine | 12,32 | iron_shield + healing_potion×3 |
| goblin_mine | 34,8 | ring_of_might |
| murkwater | 8,50 | druidic_vest + antidote×3 |
| ancient_ruins | 50,6 | chainmail + greater_healing×2 |
| forgotten_crypt | 20,8 | ectoplasm×3 + greater_mana×2 |
| forgotten_crypt | 6,20 | signet_of_focus |
| frost_peaks | 50,50 | knight_helm + greater_healing×3 |
| dragon_mountain | 6,6 | dragonfire_amulet + greater_healing×3 |

Visual: `env/chest.glb` com lid `chest_lid`, `openedChests` Set persiste. *Traps por zona ver Apêndice F.*

### 9.4 Loot pile

`Loot.dropFrom` rola gold + cada `loot[ch]` (com min/max); rare/epic/legendary toca som `rare`; pile é `Box + halo` emissivo; coleta por proximidade 1.6u.

---

## 10. Combate & Interação

- **Auto-attack:** se target em range, `Combat.playerAttack` a cada CD (1.05s espada, 1.35 machado, 1.15 arco, 1.25 cajado). Ranged/magic têm 15% miss e custam mana (mcost).
- **Alvo:** click raycast em creatures/NPCs, `Tab` nearest 24u, `Space` ataca/move até `range*0.8+scale*0.3`.
- **Projeteis:** `Proj.spawn` (speed 14-30), homing leve, hit 1.1+scale*0.3, FX burst.
- **Nuvens:** `poison_cloud` cria `G.clouds` (6dps 6s r4, tick 0.5s).
- **Boss barras:** `boss-bar-box` para target boss.

---

## 11. Sistemas Técnicos para Expansão

**Arquivos:**
- `index.html` — canvas Three + HUD + modais (newgame/load/inventory/character/skills/quests/map/menu/dialogue/shop/depot/vocation/death/victory/tooltip).
- `server.js` — static http 8080 (MIME html/js/css/png/jpg/ico/json, no-cache).
- `world.js` — `Zone`, `World`, `GroundAtlas` (atlas 4×3 128px, `GROUND_ORDER` 12, `GA_COLS4 GA_ROWS3 GA_CELL128`, shader blend T=0.16, DataTexture `uTypeTex`), `DayNight`, `TT` enum 0-11 (`GRASS DIRT STONE WATER WALL SAND SNOW CAVE CRYPT BRIDGE LAVA TGRASS`), `SOLID=WATER,WALL,LAVA`.
- `entities.js` — `Player` (serialize), `Creature`, `NPC`, `ModelBuilder`, `FX`, `Proj`. Consts: `TILE2, INV_SLOTS16, MAX_STACK99, MAX_SPLIT16, FOOD_DEPLETE0.208, HUNGER_THRESH37.5`.
- `systems.js` — `AudioSys` (WebAudio), `Combat` (`RANGED_MISS15`, `skillRoll`), `Loot`, `Quests`, `Shop`, `Depot`, `Save` (`SAVE_PREFIX eldoria_slot_`, `SETTINGS_KEY`, `LEGACY_SAVE_KEY`, `SAVE_SLOTS3`, `v2 meta+saves`), `Tutorial`.
- `assets.js` — `ASSET_MANIFEST` **28** glb/gltf (KayKit+Quaternius: knight/rogue/mage/barbarian/skeleton×2/birds×3/Quaternius×11/monsters×8), `ENV_MANIFEST` **60** props (torch…b_tower), `AnimUnit` state machine (`ANIM_WANT` + `MODEL_ANIM`).
- `game.js` — `G` global, `Input` (WASD camera-relative yaw π/4, Shift sprint, Tab 24u, Space, 1-6, I/C/K/Q/M/F/Esc, wheel 8-36, middle-drag yaw, click raycast, `camYaw π/4 camDist20`, `portalLock1.4`, `trap cd8 dmg12+lvl*2.2`), `TitleFX` (64 fireflies), `Game.boot/loop/enterZone`.

**Hooks de expansão sugeridos:**
1. **Nova zona:** adicionar em `ZONES` (w,h,theme,spawns,chests,traps,exits) + `gen*()` método em `Zone` + `THEMES` se novo bioma + `ENV_MANIFEST` props. Garantir `exits` bidirecional.
2. **Nova vocação:** estender `CLASSES` + `CLASS_MODEL` + `SKILLS` + `ANIM_WANT`/`MODEL_ANIM`; atualizar `buildVocationCards` hardcode `['vanguard',...]` para incluir novo id.
3. **Nova quest:** inserir em `QUESTS` (obj kind kill/collect/talk/zone), definir `giverOf` map ou `NPC.quest`, e cadeia `next`/`prereq`. Sistema já suporta `side:true`.
4. **Novo boss:** criar `CREATURES` entry `boss:true` + `bossSpawn` na zona + `bossAI` branch em `Creature.bossAI`.
5. **Gate custom:** `gate:{type:'quest'|'vocation'}` já genérico; pode adicionar `gate:{type:'level', lvl:15}` estendendo `tryPortal`.
6. **Item:** `I(id,{...})` + adicionar em shop array ou loot table.

**Limites atuais:** inventário 16, depot 40, stack 99, split max 16, PLAY_TIME auto-save 30s, render shadow 2048, fogExp2.

---

## 12. Fluxo de Evolução Resumido (para pitch de expansão)

```
[GREENFIELDS Lv1-5]  Rat/Snake/Boar + Goblin Scout  →  Chest ponte  →  3 crates
        ↓ vocation gate
[ASTERFALL HUB]  7 NPCs, 4 shops, temple, bank, plaza+fool
        ↓ vocation gate (após Lv3-6)      ↓ vocation gate
[DARK FOREST Lv4-8] Wolf/Spider/Goblin/Orc → 2 chests → Goblin Mine (indoor Lv5-9) → Chieftain → 650XP
        ↓ q_wolves gate                    ↓ q_relic gate
[FROST PEAKS Lv16] Golem/Troll/Wolf/Minotaur  [MURKWATER Lv10] Hag/Spider/Snake → Ruins (Lv9-14)
                                                          ↓ q_ancient gate
                                              [ANCIENT RUINS] Skeleton/Mage/Troll/Orc → 2 boss gates
                                                          ↓            ↓
                                              [FORGOTTEN CRYPT] (indoor Lv9-15) → Guardian → Relic → Arlen
                                                          ↓ q_relic gate
                                              [DRAGON MOUNTAIN] volcanic arena → Ancient Dragon Lv22 → VICTORY
```

**Próxima expansão natural:** após `q_dragon_slayer`, adicionar `q_epilogue` que desbloqueia **Frost Peaks → novo continente** (ex: `sky_islands` tema `air`) ou **profundidade da Crypt** (`abyss` indoor), reaproveitando `swamp_herb`/`shadow_dust` como crafting. Manter curva XP exponencial (Lv22→30 precisa ~2000-3000 XP por lvl) e introduzir tier `mythic` acima de legendary para loot do novo boss.

---

---

## Apêndice A — Tutorial (8 steps, data.js:391)

| id | Texto exato | cond |
|---|---|---|
| t_move | "Move with W A S D or the arrow keys. Scroll to zoom the camera." | — |
| t_talk | "Captain Arlen waits in the plaza. Walk close to him and press F (or click him) to talk." | kind:talk id:arlen |
| t_attack | "Select a Cave Rat by clicking it, then press SPACE or just stay near it — you attack automatically while a target is held." | kind:quest id:q_rats |
| t_loot | "Walk over the glowing pile to collect XP and loot. Rare drops shine brighter." | kind:quest id:q_rats |
| t_inv | "Press I for your Inventory. Click an item and use the buttons to equip or consume it." | kind:quest id:q_rats |
| t_quest | "Press Q to open the Quest Log. The tracker on the right shows your objectives." | kind:quest id:q_rats |
| t_shop | "Gold spends itself! Talk to a merchant (Mira, Borin, Elara, Rowan) and pick Trade." | kind:quest id:q_class |
| t_class | "Return to the temple and speak with Brother Aldric to choose your vocation." | kind:quest id:q_class |

## Apêndice B — THEMES (world.js:59)

| theme | sky | fog | fogD | trees | rocks | flowers | base rgb |
|---|---|---|---|---|---|---|---|
| town | 0x8fb4d8 | 0x9db8cf | 34 | 22 | 8 | true | 0.30,0.48,0.22 |
| fields | 0x9cc0dd | 0xa8c4d8 | 40 | 26 | 14 | true | 0.34,0.55,0.24 |
| forest | 0x4f6a60 | 0x3c5548 | 26 | 120 | 20 | false | 0.13,0.28,0.13 |
| mine | 0x1a140f | 0x14100c | 22 | 0 | 0 | false | 0.32,0.26,0.20 |
| swamp | 0x6a7a6a | 0x55614f | 24 | 34 | 8 | false | 0.20,0.26,0.14 |
| ruins | 0x8a9ab0 | 0x93a0b2 | 36 | 10 | 26 | false | 0.28,0.36,0.20 |
| crypt | 0x0c0c14 | 0x0e0e16 | 18 | 0 | 0 | false | 0.20,0.20,0.26 |
| snow | 0xbcd0e8 | 0xc8d8ea | 32 | 34 | 26 | false | 0.85,0.88,0.94 |
| volcanic | 0x4a2018 | 0x3a1a14 | 28 | 4 | 40 | false | 0.22,0.15,0.13 |

## Apêndice C — TT / SOLID / GroundAtlas

`TT: GRASS0 DIRT1 STONE2 WATER3 WALL4 SAND5 SNOW6 CAVE7 CRYPT8 BRIDGE9 LAVA10 TGRASS11`  
`SOLID_TILES: WATER,WALL,LAVA` (`world.js:10`)  
`GroundAtlas: GA_COLS4 GA_ROWS3 GA_CELL128, GROUND_ORDER=[0,1,2,3,4,5,6,7,8,9,10,11], shader T=0.16, uTypeTex DataTexture w×h, geBlend()`  
`TILE=2` world units/tile.

## Apêndice D — XP Table

| Lv | xpNeeded | Lv | xpNeeded | Lv | xpNeeded |
|---|---|---|---|---|---|
| 1 | 100 | 8 | 1799 | 16 | 4988 |
| 2 | 256 | 9 | 2142 | 18 | 5960 |
| 3 | 449 | 10 | 2529 | 20 | 7034 |
| 4 | 671 | 11 | 2960 | 22 | 8106 |
| 5 | 927 | 12 | 3435 | 24 | 9286 |
| 6 | 1218 | 13 | 3951 | 26 | 10570 |
| 7 | 1492 | 14 | 4510 | 30 | 12887 |

## Apêndice E — Shops literais (data.js:264)

- **borin (21):** rusty_sword, iron_sword, steel_sword, knightblade, hand_axe, battle_axe, the_reaver, wooden_shield, iron_shield, knight_shield, leather_armor, studded_leather, chainmail, knight_plate, leather_cap, iron_helm, knight_helm, chain_legs, knight_legs, leather_boots, knight_boots
- **elara (17):** apprentice_staff, oak_staff, arcane_staff, stormcaller, mages_robe, druidic_vest, minor_potion, healing_potion, greater_healing, minor_mana, greater_mana, beaded_charm, amulet_of_might, copper_ring, signet_of_focus, dragonfire_amulet, elven_crisps
- **mira (13):** bread, raw_meat, cooked_meat, minor_potion, antidote, cloth_tunic, cloth_legs, worn_boots, leather_armor, leather_legs, leather_boots, short_bow, leather_cap
- **rowan (5):** short_bow, long_bow, yew_composite, windsinger, swift_boots

## Apêndice F — Traps & Chests coords exatas

| Zona | Traps (x,z) | Chests (x,z) |
|---|---|---|
| asterfall | — | — |
| greenfields | — | 48,14 |
| dark_forest | — | 10,10 / 48,48 |
| goblin_mine | 16,12 22,20 30,16 12,26 34,30 | 12,32 / 34,8 |
| murkwater | — | 8,50 |
| ancient_ruins | 28,24 26,26 | 50,6 |
| forgotten_crypt | 14,14 22,14 14,22 22,22 30,22 | 20,8 / 6,20 |
| frost_peaks | — | 50,50 |
| dragon_mountain | 20,30 38,20 30,40 | 6,6 |

## Apêndice G — Save Schema v2 (systems.js:692)

`localStorage: eldoria_slot_1..3 = JSON.stringify({v:2, slot, meta:{name,level,zone,playTime,savedAt}, player:{name,cls,level,xp,attrs,points,gold,inv[16],equip{8},depot[40],hp,mp,hunger}, zone,x,z, quests{status,prog[]}, ready{}, discovered[], openedChests[], killedBosses{}, settings{volume,shadows,dmgNums,bars}, dayT, playTime, tutorialDone})`  
`SETTINGS_KEY=eldoria_settings, LEGACY=eldoria_save_v1 → migração para slot1 se vazio.`

## Apêndice H — Bugs conhecidos para corrigir na expansão

- `minotaur` loot `boar_tusk` não existe em `ITEMS` (data.js:185) — trocar para `deer_antler` ou criar `I('boar_tusk', ...)`.
- `boar` modelo é `q_deer` recolorido (ok).

---

*Gerado automaticamente por leitura de código. Para expandir, edite `data.js` (conteúdo) + `world.js` (terreno) e mantenha `ZONES` ↔ `World` ↔ `Quests` consistentes — `Save` já serializa novas zonas/quests/chests sem migração. Auditado: ver relatório acima (85%→~98% fiel após correções).*
