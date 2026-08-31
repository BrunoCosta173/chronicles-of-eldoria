# Chronicles of Eldoria

> Single-player RPG isométrico no browser — explore 9 zonas, 3 bosses, 73 itens e 5 vocações. Feito em Three.js vanilla, sem bundler.

![Three.js](https://img.shields.io/badge/Three.js-r128-049EF4) ![Node](https://img.shields.io/badge/Node-%3E%3D18-339933) ![License](https://img.shields.io/badge/License-MIT%20%2B%20CC0-lightgrey)

**Jogue:** `http://localhost:8080` após `Setup` abaixo. World map ao vivo + 11 chests + save em 3 slots.

## Setup & Run

```bash
# 1. deps (só puppeteer p/ testes)
npm install

# 2. baixar assets (OBRIGATÓRIO — sem eles o jogo mostra "ASSETS FAILED TO LOAD")
node fetch-env-assets.js
node fetch-creature-assets.js
# → cria assets/*.glb + assets/env/* (~500 MB, gitignored)

# 3. iniciar server
./start-server.bat            # Windows
# ou
node server.js                # qualquer OS → http://localhost:8080
# parar: ./stop-server.bat  ou  taskkill /F /PID <pid>
```

Se `EADDRINUSE` (porta 8080 presa):
```powershell
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%p
```

## Mapa Rápido

```
Asterfall (hub 56x56, 7 NPCs)
 ├─ Greenfields (fields, pond+bridge chest 48,14) — L1-5
 ├─ Dark Forest (forest) — L4-8 → Goblin Mine (mine, boss Chieftain L9) → Frost Peaks (snow L14-16)
 └─ Murkwater (swamp) — L10 → Ancient Ruins → Forgotten Crypt (crypt, boss Guardian L15) → Dragon Mountain (volcanic, boss Dragon L22)
```

Portais são cilindros emissivos. Gates `vocation` (precisa vocação) e `quest` (`q_wolves`, `q_ancient`, `q_relic`) bloqueiam e empurram de volta.

## Controles

`WASD` (relativo à câmera yaw π/4), `Shift` sprint, `rodinha` zoom 8-36, `1-4` skills, `5` Eat, `6` Potion, `I` inventário (16 slots), `C` character, `K` skills, `Q` quests, `M` mapa, `F` interagir, `Tab` alvo, `Space` ataque, `Esc` menu.

## Stack

- `Three.js r128` (`vendor/three.min.js` + `GLTFLoader` + `SkeletonUtils`)
- Vanilla JS strict, sem bundler — ordem em `index.html` importa: `three → GLTFLoader → SkeletonUtils → data → assets → world → entities → systems → ui → game`
- `puppeteer ^25.9` só para testes

## Docs

- **Para agentes:** `AGENTS.md` (setup técnico, gotchas, skills)
- **Spec canônica:** `docs/reports/01_fluxo-evolucao_30-08-2026.md` — história, 9 zonas, 11 quests, 16 criaturas, 73 itens, vocações/skills
- **Plano ativo:** `docs/plan/01_correcoes-expansao_30-08-2026.md` (7 tasks de balanceamento)
- **Arquitetura:** `docs/ARCHITECTURE.md` | **Testes:** `docs/TESTING.md` | **Assets:** `docs/ASSETS.md`

## Testes

```bash
# precisam do server em 8080
node test-assets.js      # Assets.ok && EnvAssets.ok
node test-gates.js       # wall/gates/portais
node test-inventory.js   # move/split/equip/deposit/sell/sort/drop
```

Prints `v*.png` são junk — não commitar (gitignored).

## Créditos

Código © MIT. Assets CC0: KayKit Dungeon, KayKit Adventurers, Quaternius (via `fetch-*.js`). Ver `LICENSE` e `docs/ASSETS.md`.

## Contributing

Ver `CONTRIBUTING.md` — padrão de branches, nomeação `##_descrição_DD-MM-AAAA`, e `superpowers:writing-plans → subagent-driven-development`.
