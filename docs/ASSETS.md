# Assets — Chronicles of Eldoria

> Modelos 3D são CC0 e obrigatórios. Sem eles o jogo exibe `ASSETS FAILED TO LOAD` (assets.js:Game.onAssetsError).

## Origem

| Pack | Autor | Licença | Uso no jogo |
|------|-------|---------|-------------|
| KayKit Adventurers | Kay Lousberg | CC0 | `Knight.glb`, `Rogue.glb`, `Mage.glb`, `Barbarian.glb` (player/NPC) |
| KayKit Dungeon | Kay Lousberg | CC0 | `Skeleton_Warrior.glb`, `Skeleton_Mage.glb` (crypt) |
| KayKit Mini | Kay Lousberg | CC0 | `assets/env/*` — 60 props (torch, chest, barrel, pillar, tree_*, rock_*, etc.) |
| Quaternius | Quaternius | CC0 | `Q_Rat.glb`, `Q_Snake.glb`, `Q_Spider.glb`, `Q_Wolf.glb`, `Q_Witch.glb`, `Q_Deer.glb`, `M_Orc.gltf` etc. (16 criaturas + 3 birds) |

Todos CC0 — sem obrigação de crédito, mas manter `LICENSE` notice.

## Fetch

```bash
# requer Node ≥18 (fetch nativo)
node fetch-env-assets.js       # baixa 60 env props para assets/env/
node fetch-creature-assets.js  # baixa 28 creature/bird glb para assets/
# verifica
node -e "const fs=require('fs'); console.log('assets', fs.readdirSync('assets').length, 'env', fs.readdirSync('assets/env').length)"
# ou puppeteer:
node test-assets.js
```

**O que fazer se falhar:**
- Tela vermelha ao abrir `http://localhost:8080` → rodar `node fetch-*.js` de novo (timeout de fetch 5s pode falhar em CC0 CDN).
- Ver `ASSET_MANIFEST` (28) em `assets.js:9` e `ENV_MANIFEST` (60) em `assets.js:140` — cada key mapeia para `assets/<file>`.

## O que (não) commitar

- **Não commitar** `assets/*.glb` grandes (>100 MB somados) — `.gitignore` já bloqueia `assets/*.glb`, `assets/env/`. CI baixa em runtime.
- **Não commitar** `v*.png` (screenshots de teste via puppeteer).
- **Commwear** `vendor/three.min.js` etc. (r128 fixo — não atualizar sem testar `SkeletonUtils` / `GLTFLoader` compat).

## Versionamento de assets

- `vendor/three.min.js` é **r128** — não é latest. `GLTFLoader` e `SkeletonUtils` são da mesma tag. Atualizar quebra `AnimUnit` (`THREE.AnimationMixer` API).
- Se precisar novo modelo: adicionar em `ASSET_MANIFEST` ou `ENV_MANIFEST`, rodar `fetch-*.js`, testar `test-assets.js && test-title.js`.

## Crédito mínimo (se publicar)

```
3D models: KayKit (CC0) + Quaternius (CC0) — fetched via fetch-*.js
```

Ver `LICENSE` para texto completo.
