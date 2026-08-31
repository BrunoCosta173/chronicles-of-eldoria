# Chronicles of Eldoria — AGENTS.md

> README para agentes. Este arquivo é auto-suficiente: instruções aqui sobrescrevem defaults. `AGENTS.md` vence `CLAUDE.md`; o mais próximo da pasta vence. Ver https://agents.md e https://opencode.ai/docs/rules

## Projeto Overview

Single-player RPG isométrico browser (Three.js r128) — **Chronicles of Eldoria**. Código em vanilla JS strict (`'use strict'`), sem bundler. Assets glTF obrigatórios (KayKit + Quaternius CC0) baixados via scripts `fetch-*.js`. Server estático `node server.js` em `127.0.0.1:8080`. Saves em `localStorage` 3 slots (`eldoria_slot_1..3`).

Stack: `Three.js (vendor/three.min.js) + GLTFLoader + SkeletonUtils`, `puppeteer ^25.9` apenas para testes, `PowerShell 5.1` no host win32.

## Setup & Run

```bash
# deps (só puppeteer p/ testes)
npm install

# baixar assets (OBRIGATÓRIO antes de rodar — sem eles o jogo mostra tela de erro)
node fetch-env-assets.js
node fetch-creature-assets.js

# iniciar server (persiste após fechar launcher)
./start-server.bat            # ou: node server.js
# → http://localhost:8080
# parar
./stop-server.bat             # ou taskkill por porta 8080
```

Porta `8080` em `127.0.0.1`. Se `EADDRINUSE`, matar processo: `for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8080') do taskkill /F /PID %%p`. Server serve com `Cache-Control:no-cache` e MIME `html/js/css/png/jpg/ico/json`.

## Arquitetura & Estrutura

```
index.html      # canvas + HUD + 12 modais (newgame/load/inventory/character/skills/quests/map/menu/dialogue/shop/depot/vocation/death/victory)
style.css       # tema RPG (rpg-panel, bar, inv-grid 4x4, etc.)
server.js       # http static 8080, sem framework
data.js         # CANÔNICO: ITEMS 73, CREATURES 16+3 bosses, QUESTS 11, NPCS 7, ZONES 9, CLASSES 5, SKILLS 16, TUTORIAL 8, THEMES 9, RARITY, TILE=2, LEVEL_CAP=30
assets.js       # ASSET_MANIFEST 28 (knight/rogue/mage/barbarian/skeleton×2/birds×3/q_*×6/m_*×13) + ENV_MANIFEST 60 + AnimUnit (ANIM_WANT/MODEL_ANIM)
world.js        # TT 0-11, SOLID=WATER,WALL,LAVA, Zone, World, GroundAtlas 4x3 128px, DayNight 900s, buildTown/Fields/Forest/Swamp/Ruins/Dungeon
entities.js     # Player (INV 16, depot 40, MAX_STACK 99, MAX_SPLIT 16, FOOD_DEPLETE 0.208, HUNGER 37.5), Creature AI, NPC, FX, Proj, ModelBuilder
systems.js      # AudioSys, Combat (RANGED_MISS 15), Loot, Quests, Shop, Depot, Save v2, Tutorial
game.js         # G global, Input (WASD camera-relative yaw π/4, Shift sprint, wheel 8-36, portalLock 1.4), TitleFX, Game.boot/loop/enterZone
ui.js           # HUD, Drag & Drop, tooltip, minimap/worldmap, dialogue/shop/depot
vendor/         # three.min.js, GLTFLoader.js, SkeletonUtils.js
assets/         # Knight.glb etc. (gerado, não commitar se >100MB — ver .gitignore)
docs/plan/      # plans ##_descrição_DD-MM-AAAA.md
docs/reports/   # reports ##_descrição_DD-MM-AAAA.md
```

Ordem de load em `index.html` **importa**: `three → GLTFLoader → SkeletonUtils → data → assets → world → entities → systems → ui → game`. Não reordenar.

## Convenções de Código

- JS strict, sem transpiler. `const`/`let`, `function`, `class`. Sem `import/export` (globals `THREE`, `ITEMS`, `G`, etc.).
- Nomes: `UPPER_SNAKE` para consts (`TILE`, `TT`, `THEMES`), `PascalCase` para classes (`Zone`, `Player`), `camelCase` para funções/vars.
- Drag & Drop usa `Drag` global (`ui.js:13`). Skills em `SKILLS` com `kind: melee/proj/proj3/aoe_self/aoe_ground/heal/buff/cloud/root/dash/chain`.
- Zonas: `ZONES[id] = {name,w,h,theme,spawns:[{c,x,z,w,h,n}], chests:[{x,z,items}], traps:[{x,z}], exits:[{x,z,to,tx,tz,label,gate}]}`. Coordenadas em **tiles** (×`TILE` para mundo).
- Saves `v2` — campos novos devem ser opcionais com `||` fallback para não quebrar `Player.deserialize`.

## Comandos de Teste & Verificação

```bash
# testes puppeteer (precisam server em 8080)
node test-assets.js      # valida Assets.ok && EnvAssets.ok
node test-gates.js       # checa Wall/gates/portais caminháveis
node test-inventory.js   # 16 slots, move/split/equip/deposit/sell/sort/drop
node test-menu.js        # modais newgame/load
node test-title.js       # title FX + boot

# checagens estáticas rápidas (sem browser)
node -e "const fs=require('fs'); let s=fs.readFileSync('data.js','utf8'); console.log('items', (s.match(/^I\(/gm)||[]).length)"
node -e "const fs=require('fs'); let s=fs.readFileSync('assets.js','utf8'); console.log('assets', (s.match(/:'assets\//g)||[]).length)"
```

CI esperado: nenhum lint formal. Rodar ao menos `test-assets.js` + `test-gates.js` antes de PR. Prints `v*.png` são junk — não commitar (gitignored).

## Workflow & Skills

- **Antes de criar feature:** `superpowers:brainstorming` (skill) para explorar intent.
- **Bug:** `superpowers:systematic-debugging` antes de fix.
- **Plano multi-step:** `superpowers:writing-plans` → salvar em `docs/plan/##_descrição_DD-MM-AAAA.md` (padrão adotado 30-08-2026).
- **Execução de plano:** `superpowers:subagent-driven-development` (1 subagente por task) ou `superpowers:executing-plans`.
- **Docs:** `superpowers:documentation-engineer` para manter `docs/reports/##_descrição_DD-MM-AAAA.md` fiel ao código.
- Nomeação: plans `01_correcoes-expansao_30-08-2026.md`, reports `01_fluxo-evolucao_30-08-2026.md` — incrementar `##`.

## Gotchas Operacionais

- **Assets faltando → tela vermelha** `ASSETS FAILED TO LOAD` (assets.js:Game.onAssetsError). Sempre `node fetch-env-assets.js` após clone.
- **Porta 8080 presa** após crash — `start-server.bat` já tenta `taskkill` mas pode precisar manual.
- **Save compat:** `localStorage` keys `eldoria_slot_1..3`, `eldoria_settings`, legacy `eldoria_save_v1` → migra para slot1 se vazio. Não limpar sem backup.
- **Chest na ponte:** `world.js:305` preserva `TT.BRIDGE` sob chest (se não, vira `DIRT` e abre buraco). Ao mover chest, verificar `cur===TT.BRIDGE`.
- **Gate pushback:** `tryPortal` empurra 2.5u se gate fechado — não colocar chest/spawn a ≤3 tiles de portal.
- **Bug conhecido:** `minotaur` loota `boar_tusk` inexistente em `ITEMS` (ver `docs/reports/01_fluxo-evolucao_30-08-2026.md` Apêndice H) — fix pendente na Task 1 do plan.
- **Fome:** `FOOD_DEPLETE 100/480` → starving em 8min drena HP 1/s até 20. Não há crafting ainda (ver plan Task 2).

## Documentação — Leitura e Atualização Rotineira

> **O diretório NÃO é um git repo** (`git status` → `fatal: not a git repository`). Isso significa: sem versionamento, sem histórico, sem backup remoto. Antes de publicar, rodar `git init && git add . && git commit -m "chore: initial dump"` e criar repo remoto.

**Regra para agentes e humanos — sempre ler antes de codar:**
1. **Leitura obrigatória no boot:** `AGENTS.md` (você está aqui) + `README.md` (humano) + `docs/reports/01_fluxo-evolucao_30-08-2026.md` (spec canônica, 73 itens / 9 zonas / XP table) + `docs/ARCHITECTURE.md` + `docs/TESTING.md`. Não inferir lore/mapa de código — a spec é a fonte da verdade.
2. **Antes de qualquer task multi-step:** escanear `docs/plan/` e `docs/reports/` — incrementar `##` no padrão `##_descrição_DD-MM-AAAA.md` (ex: próximo plan `02_...`, próximo report `02_...`). Nunca reutilizar `##` ou sobrescrever.
3. **Após cada feature/bugfix com mudança de comportamento:** atualizar `docs/reports/##_descrição_DD-MM-AAAA.md` via `superpowers:documentation-engineer` (Apêndices A-H) e, se mudar contrato, `README.md` + `docs/ARCHITECTURE.md`. Verificar com `node -e` contadores (`I(`, `:'assets/`, chests).
4. **Antes de fechar sessão:** garantir `AGENTS.md:Gotchas` reflete novos traps se mexer em `world.js`/`data.js`. Ex: ao mover chest, documentar `TT.BRIDGE` preserve em `world.js:305`.
5. **Validação cruzada:** após editar docs, rodar `node test-assets.js && node test-gates.js` se server em 8080 — docs devem bater com o que os testes provam.

**Checklist de drift:**
- [ ] `data.js` ITEMS count bate com `docs/reports` (73) e `README` badge?
- [ ] `ZONES` 9 + `chests` 11 + `traps` coords batem com `docs/reports` Apêndice F e `docs/ARCHITECTURE`?
- [ ] `ASSET_MANIFEST 28` + `ENV 60` batem com `docs/ASSETS.md`?
- [ ] Novo `##` incrementado corretamente em `docs/plan` e `docs/reports`?

## Referências

- Spec canônica: `docs/reports/01_fluxo-evolucao_30-08-2026.md` (Apêndices A-H: tutorial, themes, TT, XP, shops, traps)
- Plano ativo: `docs/plan/01_correcoes-expansao_30-08-2026.md` (7 tasks)
- Docs técnicos: `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/ASSETS.md`, `CONTRIBUTING.md`, `README.md`, `LICENSE`
- Regras OpenCode: https://opencode.ai/docs/rules — `/init` escaneia repo e sugere `AGENTS.md`

- Título: `[eldoria] <ação>`; Commits curtos: `fix:`, `feat:`, `docs:`.
- Antes de commit: `node test-gates.js && node test-assets.js` (se server rodando) + checklist de drift acima.
- Não commitar `assets/*.glb` grandes, `v*.png`, `node_modules/`, `.tmp/`.

Skills provide specialized instructions and workflows for specific tasks.
Use the skill tool to load a skill when a task matches its description.
