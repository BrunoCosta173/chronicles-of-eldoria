# Testing — Chronicles of Eldoria

> Sem lint formal. Testes são puppeteer e precisam do server em `127.0.0.1:8080`.

## Rodar Local

```bash
npm install
node fetch-env-assets.js && node fetch-creature-assets.js
node server.js &            # ou ./start-server.bat
# em outro terminal:
node test-assets.js         # Assets.ok && EnvAssets.ok
node test-gates.js          # wall/gates/portais caminháveis
node test-inventory.js      # 16 slots, move/split/equip/deposit/sell/sort/drop
node test-menu.js           # modais newgame/load
node test-title.js          # title FX + boot
```

**Ordem CI mínima antes de PR:**
```bash
node test-assets.js && node test-gates.js
```

**Checagens estáticas (sem browser):**
```bash
node -e "const fs=require('fs'); let s=fs.readFileSync('data.js','utf8'); console.log('items', (s.match(/^I\(/gm)||[]).length)"  # 73
node -e "const fs=require('fs'); let s=fs.readFileSync('assets.js','utf8'); console.log('assets', (s.match(/:'assets\//g)||[]).length)"  # 28
node test-loot-validity.js  # custom: todo loot it:'...' existe em ITEMS (detecta boar_tusk)
```

## O que cada teste cobre

| Teste | O que valida | Falha típica |
|-------|--------------|--------------|
| `test-assets.js` | `Assets.ok && EnvAssets.ok` após `GLTFLoader` carregar 28+60 manifests; `waitForFunction` 30s | Tela vermelha `ASSETS FAILED TO LOAD` → rodar `fetch-*.js` |
| `test-gates.js` | `solid` em wall (10,3), gates abertos (26-30 em 3/52), corredor plaza→portal, `G.player.move` até `z<=3` | `EADDRINUSE` ou `Zone.generate` quebrou `fill`/`solid` |
| `test-inventory.js` | 16 slots, `moveItem`, `splitItem` cap 16, `Drag.equip/deposit/sell`, `sort`, `dropItem 4`, legacy 40→16, `Enter` usa potion | `MAX_STACK`/`INV_SLOTS` mudado sem migração |
| `test-menu.js` | `btn-new/btn-load` disabled até `Assets.ok`, `localStorage` clear, newgame modal | `Save` schema quebrou |
| `test-title.js` | `TitleFX` 64 fireflies, `Game.buildTitleWorld` sem `World.current` | `Assets` não carregou antes de `Game.onAssetsReady` |

## Dicas

- Porta presa após crash: `for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%p`
- Screenshots `v*.png` são gerados por `vtest.js` — são junk, gitignored. Não commitar.
- Se adicionar `CRAFT_RECIPES` ou chests, rodar `test-inventory.js` + contador estático de chests: `node -e "let s=require('fs').readFileSync('data.js','utf8'); console.log([...s.matchAll(/\{ x:\d+, z:\d+, items:/g)].length)"` (deve ser 11→13 após plan).
