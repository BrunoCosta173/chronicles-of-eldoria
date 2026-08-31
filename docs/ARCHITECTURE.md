# Architecture — Chronicles of Eldoria

> Mapa técnico do runtime. Para gameplay canônico ver `docs/reports/01_fluxo-evolucao_30-08-2026.md`.

## Runtime

```
Browser → index.html (canvas #game-container)
        → vendor/three.min.js (r128, global THREE)
        → vendor/GLTFLoader.js → vendor/SkeletonUtils.js
        → data.js (ITEMS/CREATURES/QUESTS/ZONES/CLASSES/SKILLS/TUTORIAL/THEMES)
        → assets.js (ASSET_MANIFEST 28 + ENV_MANIFEST 60 + AnimUnit)
        → world.js (Zone/World/GroundAtlas/DayNight)
        → entities.js (Player/Creature/NPC/FX/Proj/ModelBuilder)
        → systems.js (AudioSys/Combat/Loot/Quests/Shop/Depot/Save/Tutorial)
        → ui.js (HUD/Drag/tooltip/minimap/worldmap)
        → game.js (G/Input/TitleFX/Game boot/loop)
        → server.js (http static 8080, no-cache, MIME html/js/css/png/jpg/ico/json)
```

`Game.boot()` cria `THREE.WebGLRenderer` (antialias, shadow 2048, fogExp2), `HemisphereLight + DirectionalLight + PointLight (indoor)`, `FX`, `AudioSys`, `Assets.loadAll()`, `TitleFX` (64 fireflies), e loop `requestAnimationFrame` (dt cap 0.1s). `World.load()` cria `Zone` sob demanda; `G` é global único (player, creatures, npcs, piles, discovered, openedChests).

## Dados Canônicos (data.js)

- `TILE=2`, `LEVEL_CAP=30`, `RARITY 5 tiers`, `xpNeeded(l)=round(60*l^1.55+40*l)`.
- `ZONES` 9 entradas: `w,h` tiles, `theme` (9), `spawns:[{c,x,z,w,h,n}]`, `chests:[{x,z,items}]`, `traps:[{x,z}]`, `exits:[{x,z,to,tx,tz,label,gate:{type:quest|vocation}}]`, `bossSpawn?`.
- `THEMES` 9 paletas: `sky/fog/fogD/base/grass/dirt/stone/water/trees/rocks/flowers` (ver Apêndice B do report).
- `TT` 12 tipos + `SOLID=WATER,WALL,LAVA`, `GROUND_ORDER` 12 + `GroundAtlas 4×3 128px` com shader blend `T=0.16` (`uTypeTex` DataTexture).

## World (world.js:224)

`Zone(id)` → `generate()` (`fill/rectHollow/set` por tema: town/fields/forest/mine/swamp/ruins/crypt/snow/volcanic) → `buildMeshes()` (ground atlas + walls/ceil) → `buildDecor()` (trees/rocks/grass/water/lava/torches via `EnvAssets`) → `buildFeatures()` (portais/chests/traps) → `buildMinimap()` (canvas `w*3×h*3`).

Decor cap: `forest 90` env trees, outros `55`; rocks `t.rocks*3`; water/lava planes animados. Town wall em `buildTownWall()` com `InstancedMesh`. Fountain em `28,28` animada via `G.tickers`.

`DayNight` ciclo 900s: `daylight=0.5*(1+cos((t-0.5)*2π))`, phases Day>0.85/Morning>0.5/Sunset>0.2/Night, outdoor lera `fog/sky/sun/hemi`, indoor fixa.

## Entidades (entities.js)

- `Player` (INV 16, depot 40, MAX_STACK 99, MAX_SPLIT 16, `FOOD_DEPLETE 100/480`, `HUNGER 37.5`, stamina 100, `derived` via `recalc()`). `serialize()/deserialize()` limpa `!ITEMS[id]→null`.
- `Creature` (FSM IDLE/PATROL/CHASE/ATTACK/RETURN, sight 7-18, range 1.6-11, bossAI 6-10s, enrage <50% 1.2×).
- `NPC` (exibe `mark` `!`/`?` via `Quests.npcState`).

## Sistemas (systems.js)

`AudioSys` WebAudio (master gain `Settings.volume`), `Combat` (`RANGED_MISS 15`, `skillRoll=base+lvl*perLvl`, proj `Proj.spawn`), `Loot` (gold+ch rolls, pile halo), `Quests` (`accept/progress/allDone/ready/giverOf/turnIn` + `onKill/onCollect/onZoneEnter/onTalk`), `Shop` (`sellPrice`) / `Depot` (40), `Save v2` (`eldoria_slot_1..3`, `eldoria_settings`, legacy migration), `Tutorial` (8 steps cond).

## UI (ui.js) & Game (game.js)

HUD `player-frame + minimap + quest-tracker + hotbar 1-6 + gold + toasts + name-layer`. Drag `Drag` global com `inv/equip/depot/shop/drop-zone`. `Input` WASD câmera-relativo (`camYaw π/4 camDist 20`), Shift sprint, wheel 8-36, `portalLock 1.4`.

`Game.enterZone(id,tx,tz)` limpa `piles/Proj/clouds`, spawna creatures se `!zoneCreaturesBuilt`, reposiciona player, salva. Title orbita `R=0.52*min(w,h)*TILE`.
