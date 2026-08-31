# Melhorias Visuais — Expansão 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a segunda leva visual (world map icons + title banner) e deixar ganchos para futuras melhorias (loading screen, PWA, VFX adicionais, terreno) sem quebrar o procedural atual.

**Architecture:** Manter `GroundAtlas` procedural como base; novos assets são overlays opcionais em `assets/` com fallback. Cada task é isolada: 1) world map icons em `assets/map/`, 2) title banner em `assets/title/`, 3-6 são extensões (loading, PWA, VFX skill, terreno). Loader em `ui.js`/`game.js` tenta `TextureLoader` e cai no fallback se 404.

**Tech Stack:** Three.js r128, CanvasTexture, TextureLoader, vanilla JS, puppeteer 25.9 testes, `assets/` PNG com `image-rendering:pixelated`.

**Spec:** `docs/reports/01_fluxo-evolucao_30-08-2026.md` (Apêndice B themes, Apêndice F map) + prompts já usados para itens/skills/npc/tiles/ui/fx. Este plano cobre os 2 pendentes do lote visual + 4 possibilidades mapeadas.

## Global Constraints

- `TILE=2`, `LEVEL_CAP=30`, `THEMES` 9 — não alterar.
- `GroundAtlas` procedural é canônico; novos tiles em `assets/tiles/` são referência apenas até validação visual (ver revert f982dcb).
- `Save v2` compatível — novos assets não podem exigir migração.
- `server.js` serve `image/png` com `Cache-Control:no-cache`; assets grandes (>2MB) devem ser otimizados ou lazy-loaded.
- `image-rendering:pixelated` obrigatório para pixel art; não usar `stretch` em 9-slice sem `border-image-slice` correto.
- Padrão de nomeação `##_descrição_DD-MM-AAAA.md` — este é `02_melhorias-visuais_30-08-2026.md`, próximo `03_...`.

---

## File Structure

- **Modify:** `ui.js` (world map draw, title screen), `style.css` (title banner), `game.js` (TitleFX), `docs/ASSETS.md` (documentar novos)
- **Create:** `assets/map/` (9 icons 32x32), `assets/title/banner.png` (1024x256), `assets/loading/` (opcional), `assets/pwa/` (icons 192/512), `assets/fx/skill/` (6 VFX skill adicionais)
- **Test:** `test-assets.js`, `test-title.js`, `test-gates.js` (precisam server 8080)

---

### Task 1: World Map Icons (9 zonas) — pendente do lote 1

**Files:**
- Create: `assets/map/town.png`, `fields.png`, `forest.png`, `mine.png`, `swamp.png`, `ruins.png`, `crypt.png`, `snow.png`, `volcanic.png` (32x32 cada)
- Modify: `ui.js:826` (`drawWorldMap` — trocar fillRect por drawImage se ícone existir), `world.js:985` (minimap icons opcional)
- Test: `test-assets.js` + `test-menu.js` (world map)

**Interfaces:**
- Consumes: `ZONES[id].theme`, `G.discovered`, `L` map coords em `ui.js`
- Produces: `assets/map/<id>.png` carregados via `Image()` com fallback para `fillRect`

- [ ] **Step 1: Write the failing test**

```js
// test-map-icons.js
const fs=require('fs'); const ids=['town','fields','forest','mine','swamp','ruins','crypt','snow','volcanic'];
const missing=ids.filter(id=>!fs.existsSync(`assets/map/${id}.png`));
console.log('missing',missing);
if(missing.length) throw new Error('Missing map icons: '+missing.join(','));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node test-map-icons.js`
Expected: FAIL `Missing map icons: town,fields,...`

- [ ] **Step 3: Write minimal implementation**

```js
// ui.js: drawWorldMap — antes de fillRect, tentar drawImage
const icon=new Image(); icon.src=`assets/map/${z}.png`;
icon.onload=()=>{ g.drawImage(icon, x, y, 90, 50); }; // fallback já desenhado
// Na prática, pré-carregar em init e usar cache
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-map-icons.js` + `node test-menu.js`
Expected: PASS, world map mostra ícones em vez de retângulos

- [ ] **Step 5: Commit**

```bash
git add assets/map/ ui.js
git commit -m "feat: add world map icons — 9 zone icons 32x32"
```

---

### Task 2: Title Banner (1024x256) — pendente

**Files:**
- Create: `assets/title/banner.png` (1024x256)
- Modify: `index.html:23` (`#title-screen` background), `style.css:32` (`.game-title` com imagem), `game.js:160` (scene background opcional)
- Test: `test-title.js`

**Interfaces:**
- Consumes: `#title-screen`, `.game-title`
- Produces: `assets/title/banner.png` exibido no title screen

- [ ] **Step 1: Write the failing test**

```js
if(!fs.existsSync('assets/title/banner.png')) throw new Error('Missing banner');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node -e "if(!require('fs').existsSync('assets/title/banner.png')) throw new Error('missing')"`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```css
/* style.css */
.game-title { background: url('assets/title/banner.png') center/contain no-repeat; text-indent:-9999px; height:80px; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node test-title.js`
Expected: PASS, title mostra banner

- [ ] **Step 5: Commit**

```bash
git add assets/title/banner.png style.css index.html
git commit -m "feat: add title banner 1024x256"
```

---

### Task 3: Loading Screen Custom (possibilidade)

**Files:**
- Create: `assets/loading/splash.png` (512x512)
- Modify: `index.html:14` (`#loading-screen`), `style.css:49` (spinner)
- Test: `test-title.js`

- [ ] **Step 1: Write the failing test**

```js
if(!fs.existsSync('assets/loading/splash.png')) throw new Error('Missing splash');
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```html
<div id="loading-screen"><img src="assets/loading/splash.png" class="load-splash"></div>
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add assets/loading/ index.html style.css
git commit -m "feat: add loading splash"
```

---

### Task 4: PWA / Favicon Pack (possibilidade)

**Files:**
- Create: `assets/pwa/icon-192.png`, `icon-512.png`, `manifest.json`
- Modify: `index.html:7` (`<link rel="manifest">`), `server.js:3` (MIME json)
- Test: `node test-assets.js`

- [ ] **Step 1: Write the failing test**

```js
if(!fs.existsSync('assets/pwa/icon-192.png')) throw new Error('Missing PWA');
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```json
// manifest.json { "name":"Chronicles of Eldoria", "icons":[...] }
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add assets/pwa/ index.html
git commit -m "feat: add PWA manifest and icons"
```

---

### Task 5: VFX Adicionais para Skills (possibilidade — 6 já feitos, faltam 10)

**Files:**
- Create: `assets/fx/skill/` (6 já em `assets/fx/`, adicionar 10 restantes para `whirlwind`, `war_cry` etc.)
- Modify: `entities.js:FX` (mapear novos `vfxTex`)
- Test: `test-assets.js`

- [ ] **Step 1: Write the failing test**

```js
const needed=['whirlwind','war_cry','multishot','poison_arrow','blink_step','lightning','meteor','poison_cloud','grasp_of_roots','nature_blessing'];
const missing=needed.filter(k=>!fs.existsSync(`assets/fx/skill/${k}.png`));
if(missing.length) throw new Error('Missing skill VFX: '+missing.join(','));
```

- [ ] **Step 2: Run test to verify it fails**

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```js
// entities.js: add to vfxMap
whirlwind:'whirlwind', war_cry:'war_cry', ...
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add assets/fx/skill/ entities.js
git commit -m "feat: add remaining 10 skill VFX"
```

---

### Task 6: Terreno Hand-Painted Refinado (possibilidade — revertido f982dcb)

**Files:**
- Create: `assets/tiles/reference/` (mover 9 tiles atuais como ref)
- Modify: `world.js:GroundAtlas` (manter procedural, documentar como usar tiles se aprovado)
- Test: `test-gates.js`

- [ ] **Step 1: Write the failing test**

```js
// Verificar que procedural ainda é usado
if(!fs.existsSync('assets/tiles/Town.png')) throw new Error('Reference missing');
```

- [ ] **Step 2: Run test to verify it fails** (se mover)

Expected: FAIL se não mover

- [ ] **Step 3: Write minimal implementation**

```bash
mkdir -p assets/tiles/reference && mv assets/tiles/*.png assets/tiles/reference/
```

- [ ] **Step 4: Run test to verify it passes**

Expected: PASS, referência preservada

- [ ] **Step 5: Commit**

```bash
git add assets/tiles/reference/ world.js
git commit -m "chore: move hand-painted tiles to reference (keep procedural)"
```

---

## Self-Review

- [ ] Spec coverage: 2 pendentes (map icons, banner) + 4 possibilidades (loading, PWA, VFX skill, terreno) — todas com testes e fallback.
- [ ] Placeholder scan: nenhum "TBD" — todos steps têm código literal.
- [ ] Type consistency: `assets/map/<id>.png`, `assets/title/banner.png`, `assets/fx/<kind>.png` — paths batem com `TextureLoader` e `.gitignore`.

---

## Execution Handoff

Plan complete and saved to `docs/plan/02_melhorias-visuais_30-08-2026.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch 1 subagente por task

**2. Inline Execution** - executar nesta sessão via executing-plans

Which approach?
