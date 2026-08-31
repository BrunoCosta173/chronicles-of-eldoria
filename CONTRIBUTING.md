# Contributing — Chronicles of Eldoria

## Setup

```bash
npm install
node fetch-env-assets.js
node fetch-creature-assets.js
node server.js          # http://localhost:8080
# em outro terminal
node test-assets.js && node test-gates.js
```

Requisitos: Node ≥18, PowerShell 5.1 (Windows), porta `8080` livre em `127.0.0.1`.

## Workflow com Skills

1. **Feature / ideia:** `superpowers:brainstorming` antes de codar.
2. **Bug:** `superpowers:systematic-debugging` antes de fix.
3. **Multi-step:** `superpowers:writing-plans` → salva em `docs/plan/##_descrição_DD-MM-AAAA.md`.
4. **Implementação:** `superpowers:subagent-driven-development` (1 subagente por task) ou `superpowers:executing-plans`.
5. **Docs:** `superpowers:documentation-engineer` → atualiza `docs/reports/##_descrição_DD-MM-AAAA.md`.

Padrão de nomeação adotado 30-08-2026:
- Plans: `01_correcoes-expansao_30-08-2026.md` (incrementar `##`)
- Reports: `01_fluxo-evolucao_30-08-2026.md`

## Convenções

- JS strict, sem bundler, sem `import/export`. Globals: `THREE`, `ITEMS`, `CREATURES`, `QUESTS`, `ZONES`, `G`, `World`, `Assets`.
- `UPPER_SNAKE` para consts (`TILE`, `TT`, `THEMES`, `LEVEL_CAP`), `PascalCase` classes (`Zone`, `Player`, `Creature`), `camelCase` funções.
- Ordem de `<script>` em `index.html` é **canônica** — não reordenar.
- Zonas em `ZONES[id] = {name,w,h,theme,spawns,chests,traps,exits}` com coords em tiles (×`TILE=2` mundo).
- Saves `v2` — novos campos devem usar `||` fallback em `Player.deserialize` para não quebrar saves antigos.

## Antes de Commitar

```bash
node test-gates.js && node test-assets.js
# se mexeu em inventário/craft:
node test-inventory.js
```

- Título PR: `[eldoria] <ação>` — commits curtos `fix:`, `feat:`, `docs:`.
- Não commitar `assets/*.glb`, `v*.png`, `node_modules/`, `.tmp/` (ver `.gitignore`).
- Prints `v*.png` são junk — não commitar.

## Onde está o quê

- `data.js` — **canônico** (73 ITEMS, 19 CREATURES, 11 QUESTS, 7 NPCS, 9 ZONES, 16 SKILLS, 8 TUTORIAL). Mexe aqui para balancear.
- `world.js` — `TT`, `THEMES`, `Zone`, `GroundAtlas 4×3 128px`, `DayNight 900s`.
- `entities.js` — `INV 16, depot 40, MAX_STACK 99, MAX_SPLIT 16, FOOD_DEPLETE 0.208`.
- `systems.js` — `Combat RANGED_MISS 15`, `Save v2` (`eldoria_slot_1..3`).
- Spec canônica: `docs/reports/01_fluxo-evolucao_30-08-2026.md` Apêndices A-H.

## Gotchas

- `world.js:305` preserva `TT.BRIDGE` sob chest — não voltar para `DIRT`.
- `tryPortal` empurra 2.5u se gate fechado — não colocar chest/spawn a ≤3 tiles de portal.
- `minotaur` loot `boar_tusk` inexistente — fix na Task 1 do plan ativo.

Dúvidas: `AGENTS.md` é a fonte da verdade para agentes; `README.md` para humanos.
