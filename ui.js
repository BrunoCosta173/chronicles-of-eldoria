'use strict';
/* =========================================================
   ui.js — HUD, panels, inventory, dialogue, shop, minimap,
   tooltips, floating text, banners.
   ========================================================= */

function $(id){ return document.getElementById(id); }
function el(tag, cls, html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

/* ---------- drag & drop ---------- */
/* src: {kind:'inv'|'equip'|'depot', idx} ; cell carries data-kind + data-idx (inv/depot) or data-slot (equip) */
const Drag = {
  src:null, item:null, qty:1, zone:null, el:null,

  begin(e, src, item, split){
    this.src=src; this.item={id:item.id, qty:item.qty}; this.qty=item.qty; this.split=!!split;
    this.el=el('div','drag-ghost', (typeof spriteIcon!=='undefined'?spriteIcon(item.id,'drag-icon'):esc(ITEMS[item.id].icon))+(item.qty>1?'<span class="qty">'+item.qty+'</span>':''));
    document.body.appendChild(this.el);
    e.preventDefault();
  },
  setZone(cell){
    if(this.zone===cell) return;
    if(this.zone) this.zone.classList.remove('drag-over');
    this.zone=cell;
    if(cell) cell.classList.add('drag-over');
  },
  move(x,y){
    if(!this.el) return;
    this.el.style.left=x+'px'; this.el.style.top=y+'px';
    const under=document.elementFromPoint(x,y);
    if(!under){ this.setZone(null); return; }
    const dz=under.closest('#drop-zone');
    if(dz){ this.setZone(dz); return; }
    const cell=under.closest('.inv-cell,.eq-cell');
    if(cell){ this.setZone(cell); return; }
    if(under.closest('.shop-panel') && !under.closest('#shop-buy-list')){ this.setZone(document.getElementById('shop-sell-list')); return; }
    this.setZone(null);
  },
  end(x,y){
    const under=document.elementFromPoint(x,y);
    const result = Drag.resolveTarget(under);
    this.cleanup();
    return result;
  },
  cleanup(){ if(this.el){ this.el.remove(); this.el=null; } this.setZone(null); this.src=null; this.item=null; this._candidate=null; this._started=false; const dz=document.getElementById('drop-zone'); if(dz) dz.classList.add('hidden'); },
  resolveTarget(under){
    if(!under||!this.src||!this.item) return false;
    const P=G.player, it=ITEMS[this.item.id], n=this.qty;
    if(under.closest('#drop-zone')){ P.dropItem(this.src.idx, n); return true; }
    const eq=under.closest('.eq-cell');
    if(eq && this.src.kind==='inv') return this.equip(eq);
    const cell=under.closest('.inv-cell');
    if(cell){
      const toKind=cell.dataset.kind, toIdx=+cell.dataset.idx;
      if(this.src.kind==='equip'){
        if(toKind==='inv'){ P.unequip(this.src.idx); return true; }
        return false;
      }
      if(this.src.kind==='inv' && toKind==='inv'){
        if(this.split && n<this.item.qty && !P.inv[toIdx]){ Drag.pendingSplit={from:this.src.idx, to:toIdx}; UI.openSplit(it, n); return true; }
        return P.moveItem(this.src.idx,toIdx);
      }
      if(this.src.kind==='inv' && toKind==='depot') return this.deposit(toIdx);
      if(this.src.kind==='depot' && toKind==='inv') return P.moveItem(this.src.idx,toIdx);
      if(this.src.kind==='depot' && toKind==='depot') return false;
    }
    if(under.closest('.shop-panel') && !under.closest('#shop-buy-list') && this.src.kind==='inv'){ return this.sell(it); }
    return false;
  },
  equip(eqCell){
    const P=G.player, stype=eqCell.dataset.slot;
    if(ITEMS[this.item.id].type!==stype){ UI.toast('Cannot equip there','bad'); Audio.play('error'); return false; }
    const bad=P.meetsReq(ITEMS[this.item.id]);
    if(bad){ UI.toast(bad,'bad'); Audio.play('error'); return false; }
    const prev=P.equip[stype];
    P.equip[stype]=this.item.id;
    P.inv[this.src.idx]=null;
    if(prev) P.addItem(prev,1);
    P.recalc(); P.rebuildGear(); Audio.play('equip');
    UI.refreshInventory(); UI.refreshHUD(); UI.refreshCharacter();
    return true;
  },
  deposit(targetIdx){
    const P=G.player, slot=P.inv[this.src.idx];
    if(!slot) return false;
    const n=this.qty;
    let to=P.depot.findIndex(s=>s&&s.id===slot.id&&ITEMS[slot.id].stack&&s.qty<MAX_STACK);
    if(to<0 && targetIdx!=null && targetIdx<P.depot.length && !P.depot[targetIdx]) to=targetIdx;
    if(to<0) to=P.depot.findIndex(s=>!s);
    if(to<0){ UI.toast('Vault is full','bad'); return false; }
    if(P.depot[to]) P.depot[to].qty+=n; else P.depot[to]={id:slot.id,qty:n};
    slot.qty-=n;
    if(slot.qty<=0) P.inv[this.src.idx]=null;
    Audio.play('coin'); UI.refreshDepot(); UI.refreshInventory();
    return true;
  },
  sell(it){
    if(it.type==='quest'){ UI.toast('Quest items cannot be sold','bad'); Audio.play('error'); return false; }
    const P=G.player, n=this.qty, gain=sellPrice(it.id)*n;
    P.removeItem(it.id, n);
    P.gold+=gain;
    Audio.play('sell');
    UI.toast('Sold '+it.name+' ×'+n+' for '+gain+' gold');
    UI.refreshHUD(); UI.refreshInventory();
    if(Shop.current) UI.openShop(Shop.current);
    return true;
  },
};

const UI = {
  ftPool:[], labels:[],
  modalNames:['panel-inventory','panel-character','panel-skills','panel-quests','panel-map','panel-menu'],

  init(){
    // hotbar clicks
    document.querySelectorAll('.hb-slot').forEach(b=>{
      b.addEventListener('click', ()=>{ AudioSys.resume(); Combat.useHotbar(+b.dataset.slot); });
    });
    // title
    $('btn-new').addEventListener('click', ()=>{ AudioSys.resume(); Audio.play('click'); UI.openNewGameModal(); });
    $('btn-load').addEventListener('click', ()=>{ AudioSys.resume(); Audio.play('click'); UI.openLoadModal(); });
    $('btn-settings-title').addEventListener('click', ()=>{ $('title-menu').classList.add('hidden'); $('title-settings').classList.remove('hidden'); });
    $('btn-settings-back').addEventListener('click', ()=>{ $('title-settings').classList.add('hidden'); $('title-menu').classList.remove('hidden'); });
    // slot modals
    $('ng-create').addEventListener('click', ()=>{
      if($('ng-create').disabled||!UI._ngSlot) return;
      const name=$('ng-name').value.trim()||'Aldwin';
      Audio.play('click');
      UI.closeNewGameModal();
      Game.newGame(name, UI._ngSlot);
    });
    $('ng-cancel').addEventListener('click', ()=>{ Audio.play('click'); UI.closeNewGameModal(); });
    $('load-cancel').addEventListener('click', ()=>{ Audio.play('click'); UI.closeLoadModal(); });
    window.addEventListener('keydown', e=>{
      if(e.key!=='Escape') return;
      if(!$('newgame-modal').classList.contains('hidden')) UI.closeNewGameModal();
      else if(!$('load-modal').classList.contains('hidden')) UI.closeLoadModal();
    });
    $('btn-respawn').addEventListener('click', ()=>{ G.player.respawn(); });
    $('btn-vic-continue').addEventListener('click', ()=>{ $('victory-screen').classList.add('hidden'); });
    $('btn-save-now').addEventListener('click', ()=>{
      if(Save.save()) UI.toast('Game saved. — '+UI.saveLabel(), 'q');
    });
    $('btn-open-settings').addEventListener('click', ()=>{ UI.showMenuView('settings'); });
    $('btn-menu-settings-back').addEventListener('click', ()=>{ UI.showMenuView('home'); });
    $('btn-return-title').addEventListener('click', ()=>{
      UI.confirm('Return to title? progress is saved to '+UI.saveLabel()+'.', ()=>{ Save.save(); location.reload(); });
    });
    // settings sliders (both copies)
    {
      $('set-vol').addEventListener('input', e=>{ Settings.volume=e.target.value/100; AudioSys.setVol(Settings.volume); syncSettings(); });
      document.querySelector('.set-vol-x').addEventListener('input', e=>{ Settings.volume=e.target.value/100; AudioSys.setVol(Settings.volume); syncSettings(); });
      $('set-shadows').addEventListener('change', e=>{ Settings.shadows=e.target.checked; applySettings(); syncSettings(); });
      document.querySelector('.set-shadows-x').addEventListener('change', e=>{ Settings.shadows=e.target.checked; applySettings(); syncSettings(); });
      $('set-dmg').addEventListener('change', e=>{ Settings.dmgNums=e.target.checked; syncSettings(); });
      document.querySelector('.set-dmg-x').addEventListener('change', e=>{ Settings.dmgNums=e.target.checked; syncSettings(); });
      $('set-bars').addEventListener('change', e=>{ Settings.bars=e.target.checked; syncSettings(); });
      document.querySelector('.set-bars-x').addEventListener('change', e=>{ Settings.bars=e.target.checked; syncSettings(); });
    }
    // inventory buttons
    $('btn-sort').addEventListener('click', ()=>{ UI.sortInventory(); });
    // equip cells -> unequip
    document.querySelectorAll('.eq-cell').forEach(c=>{
      c.addEventListener('click', ()=>{ G.player.unequip(c.dataset.slot); });
      c.addEventListener('mouseenter', e=>{ const id=G.player.equip[c.dataset.slot]; if(id) UI.showTooltip(e, id, true); });
      c.addEventListener('mousemove', e=>UI.moveTooltip(e));
      c.addEventListener('mouseleave', ()=>UI.hideTooltip());
    });
    // sort button
    $('btn-sort').addEventListener('click', ()=>{ UI.sortInventory(); });
    // split modal
    $('split-cancel').addEventListener('click', ()=>UI.closeSplit());
    $('split-ok').addEventListener('click', ()=>{ UI.commitSplit(); });
    $('split-range').addEventListener('input', e=>{ $('split-amount').textContent=e.target.value; });
    // drop-zone reveal while dragging
    UI.hintDrop();
    // drag lifecycle
    window.addEventListener('mousemove', e=>{ if(Drag.el) Drag.move(e.clientX, e.clientY); });
    window.addEventListener('mouseup', e=>{ if(Drag.el) Drag.end(e.clientX, e.clientY); });
    // attr alloc
    document.querySelectorAll('.alloc-btn').forEach(b=>{
      b.addEventListener('click', ()=>{
        const P=G.player;
        if(P.points<=0) return;
        P.points--; P.attrs[b.dataset.attr]++;
        P.recalc(); P.hp=Math.min(P.hp+8,P.derived.maxHp);
        Audio.play('click'); UI.refreshCharacter(); UI.refreshHUD(); UI.refreshInventory();
      });
    });
    // dialogue
    $('dlg-options').addEventListener('click', e=>{
      const o=e.target.closest('.dlg-opt');
      if(!o||!o._act) return;
      o._act();
    });
    $('shop-close').addEventListener('click', ()=>{ $('shop').classList.add('hidden'); });
    $('depot-close').addEventListener('click', ()=>{ $('depot').classList.add('hidden'); });
    // confirm modal
    $('confirm-yes').addEventListener('click', ()=>{ $('confirm-modal').classList.add('hidden'); const cb=UI._confirmCb; UI._confirmCb=null; cb&&cb(); });
    $('confirm-no').addEventListener('click', ()=>{ $('confirm-modal').classList.add('hidden'); UI._confirmCb=null; });
    // close panels on background click of panel header x? (Esc handled by input)
    UI.buildVocationCards();
    UI.refreshHotbar();
  },

  confirm(text, cb){ $('confirm-text').textContent=text; UI._confirmCb=cb; $('confirm-modal').classList.remove('hidden'); },

  /* ---------- save slot modals ---------- */
  _ngSlot:0,
  fmtPlayTime(s){ s=Math.floor(s||0); if(s<60) return s+'s'; const m=Math.floor(s/60), h=Math.floor(m/60); return h>0 ? h+'h '+(m%60)+'m' : m+'m'; },
  fmtDate(ts){ try{ const d=new Date(ts); return d.toLocaleDateString()+' '+d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}); }catch(e){ return ''; } },
  saveLabel(){
    const m=Save.meta(Save.active);
    const slot='Slot '+Save.active;
    if(m&&m.savedAt) return slot+' · '+UI.fmtDate(m.savedAt);
    return slot;
  },
  showMenuView(view){
    const home=$('menu-home'), settings=$('menu-settings'), p=$('panel-menu');
    if(!home||!settings) return;
    const isHome = view==='home';
    home.classList.toggle('hidden', !isHome);
    settings.classList.toggle('hidden', isHome);
    if(p) p.dataset.title = isHome ? 'Menu' : 'Settings';
    Audio.play('click');
  },
  menuOpen(){ return !$('panel-menu').classList.contains('hidden'); },
  resetMenu(){
    const p=$('panel-menu'); if(p) p.dataset.title='Menu';
    $('menu-home').classList.remove('hidden');
    $('menu-settings').classList.add('hidden');
  },
  renderMenuMeta(){
    const m=Save.meta(Save.active);
    const box=$('menu-save-meta'); if(!box) return;
    if(!m){ box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    box.textContent='Last save — Slot '+Save.active+' · '+UI.fmtDate(m.savedAt)+' · '+UI.fmtPlayTime(m.playTime);
  },
  menuKey(e){
    if(!UI.menuOpen()) return false;
    const k=e.key.toLowerCase();
    if(k==='escape'){
      if(!$('menu-settings').classList.contains('hidden')){ UI.showMenuView('home'); return true; }
      return false;
    }
    const scope = $('menu-home').classList.contains('hidden') ? $('menu-settings') : $('menu-home');
    const btns = Array.from(scope.querySelectorAll('.menu-btn:not(:disabled)'));
    if(!btns.length) return false;
    const idx = btns.indexOf(document.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){
      e.preventDefault();
      const d=e.key==='ArrowDown'?1:-1;
      const n = idx<0 ? (d>0?0:btns.length-1) : (idx+d+btns.length)%btns.length;
      btns[n].focus();
      return true;
    }
    if(e.key==='Enter'||k===' '){
      if(idx>=0 && document.activeElement){ e.preventDefault(); document.activeElement.click(); return true; }
    }
    return true;
  },
  openNewGameModal(){
    UI._ngSlot=0;
    $('ng-name').value='Aldwin';
    $('newgame-modal').classList.remove('hidden');
    UI.renderSlotCards($('ng-slots'), 'new');
    try{ $('ng-name').focus(); }catch(e){}
  },
  closeNewGameModal(){ $('newgame-modal').classList.add('hidden'); },
  openLoadModal(){
    $('load-modal').classList.remove('hidden');
    UI.renderSlotCards($('load-slots'), 'load');
  },
  closeLoadModal(){ $('load-modal').classList.add('hidden'); },
  renderSlotCards(container, mode){
    container.innerHTML='';
    let anyEmpty=false;
    for(let i=1;i<=SAVE_SLOTS;i++){
      const meta=Save.meta(i);
      const card=el('div','slot-card'+(meta?' occupied':' empty'));
      if(meta){
        card.innerHTML='<div class="sc-name">'+esc(meta.name)+'</div>'+
          '<div class="sc-info">Lv. '+esc(meta.level)+' &bull; '+esc(meta.zone)+'</div>'+
          '<div class="sc-info dim">'+UI.fmtPlayTime(meta.playTime)+' &bull; '+UI.fmtDate(meta.savedAt)+'</div>';
      } else {
        anyEmpty=true;
        card.innerHTML='<div class="sc-name dim">Empty Slot</div><div class="sc-info dim">&mdash;</div>';
      }
      if(mode==='new'){
        if(meta){
          const del=el('button','menu-btn small danger sc-del','DEL');
          del.addEventListener('click', ev=>{
            ev.stopPropagation();
            UI.confirm('Delete '+meta.name+'&#39;s save permanently?', ()=>{
              Save.del(i);
              if(UI._ngSlot===i) UI._ngSlot=0;
              UI.renderSlotCards(container, mode);
              UI.toast('Save deleted.','bad');
            });
          });
          card.appendChild(del);
        } else {
          card.classList.add('selectable');
          if(!UI._ngSlot) UI._ngSlot=i;
          if(UI._ngSlot===i) card.classList.add('selected');
          card.addEventListener('click', ()=>{
            UI._ngSlot=i;
            container.querySelectorAll('.slot-card').forEach(c=>c.classList.remove('selected'));
            card.classList.add('selected');
            $('ng-create').disabled=false;
            Audio.play('click');
          });
        }
      } else {
        if(meta){
          card.classList.add('selectable');
          card.addEventListener('click', ()=>{
            Audio.play('click');
            UI.closeLoadModal();
            Game.continueGame(i);
          });
        } else card.classList.add('disabled');
      }
      container.appendChild(card);
    }
    if(mode==='new'){
      $('ng-full-msg').classList.toggle('hidden', anyEmpty);
      $('ng-create').disabled=!(anyEmpty&&UI._ngSlot);
    }
    $('btn-load').disabled=!Save.hasAny();
  },

  /* ---------- modal state ---------- */
  anyPanelOpen(){ return UI.modalNames.some(n=>!$(n).classList.contains('hidden')); },
  modalOpen(){
    return UI.anyPanelOpen() || !$('dialogue').classList.contains('hidden') || !$('shop').classList.contains('hidden') ||
      !$('depot').classList.contains('hidden') || !$('vocation-modal').classList.contains('hidden') ||
      !$('death-screen').classList.contains('hidden') || !$('confirm-modal').classList.contains('hidden') ||
      !$('newgame-modal').classList.contains('hidden') || !$('load-modal').classList.contains('hidden') ||
      !$('title-screen').classList.contains('hidden') || !$('victory-screen').classList.contains('hidden');
  },
  closeAllModals(){
    for(const n of UI.modalNames) $(n).classList.add('hidden');
    $('dialogue').classList.add('hidden');
    $('shop').classList.add('hidden');
    $('depot').classList.add('hidden');
  },
  togglePanel(name){
    const p=$(name);
    if(!p) return;
    const wasOpen=!p.classList.contains('hidden');
    for(const n of UI.modalNames) $(n).classList.add('hidden');
    $('dialogue').classList.add('hidden');
    if(!wasOpen){
      p.classList.remove('hidden');
      Audio.play('open');
      if(name==='panel-inventory'){ UI.refreshInventory(); Tutorial.note('inventory_open'); }
      if(name==='panel-character') UI.refreshCharacter();
      if(name==='panel-skills') UI.refreshSkills();
      if(name==='panel-quests'){ UI.refreshQuests(); Tutorial.note('quest_open'); }
      if(name==='panel-map') UI.drawWorldMap();
      if(name==='panel-menu'){
        UI.resetMenu();
        UI.renderMenuMeta();
        setTimeout(()=>{ const b=document.querySelector('#menu-home .menu-btn:not(:disabled)'); if(b) b.focus(); }, 30);
      }
    }
  },

  /* ---------- HUD ---------- */
  refreshHUD(){
    const P=G.player; if(!P) return;
    const hp=P.hp/P.derived.maxHp, mp=P.mp/P.derived.maxMp;
    $('hp-fill').style.width=(hp*100)+'%'; $('hp-text').textContent=Math.max(0,Math.ceil(P.hp))+' / '+P.derived.maxHp;
    $('mp-fill').style.width=(mp*100)+'%'; $('mp-text').textContent=Math.floor(P.mp)+' / '+P.derived.maxMp;
    const need=xpNeeded(P.level);
    $('xp-fill').style.width=Math.min(100,(P.xp/need*100))+'%';
    $('xp-text').textContent=P.level>=LEVEL_CAP?'MAX':Math.floor(P.xp/need*100)+'%';
    $('pf-name').textContent=P.name;
    $('pf-level').textContent='Lv. '+P.level;
    $('pf-class').textContent=CLASSES[P.cls].name;
    $('pf-class-icon').textContent=CLASSES[P.cls].icon;
    $('gold-text').textContent=P.gold;
    UI.refreshTracker();
  },
  refreshStamina(){
    const P=G.player; if(!P) return;
    const f=$('st-fill'); if(!f) return;
    f.style.width=(P.stamina/P.maxStamina*100)+'%';
    f.classList.toggle('low', P.exhausted || P.stamina<P.maxStamina*0.25);
    const t=$('st-text'); if(t) t.textContent=Math.floor(P.stamina)+' / '+P.maxStamina;
  },
  refreshBuffs(){
    const box=$('pf-buffs'); box.innerHTML='';
    for(const b of G.player.buffs){ const s=el('span','buff-chip', b.icon+' '+Math.ceil(b.t)+'s'); s.title=b.name; box.appendChild(s); }
    if(G.player.status.poison>0){ const s=el('span','buff-chip','🤢 '+Math.ceil(G.player.status.poison)+'s'); s.style.borderColor='#3f8f3f'; box.appendChild(s); }
    if(G.player.hungerLevel()>=2){ const s=el('span','buff-chip',G.player.hungerLevel()===3?'☠️':'🍖'); s.style.borderColor=G.player.hungerLevel()===3?'#c04040':'#d9b23a'; s.title=G.player.hungerLevel()===3?'Starving':'Hungry'; box.appendChild(s); }
  },
  refreshTarget(){
    const t=G.target;
    const tf=$('target-frame');
    if(!t||!t.alive){ tf.classList.add('hidden'); UI.hideBossBar(); return; }
    tf.classList.remove('hidden');
    $('target-name').innerHTML=esc(t.def.name)+' <span class="tlv">Lv.'+t.def.lvl+(t.def.boss?' ★':'')+'</span>';
    $('target-fill').style.width=Math.max(0,(t.hp/t.maxHp*100))+'%';
    $('target-text').textContent=Math.max(0,Math.ceil(t.hp))+' / '+t.maxHp;
    if(t.def.boss){ UI.showBossBar(t); } else UI.hideBossBar();
  },
  showBossBar(t){ $('boss-bar-box').classList.remove('hidden'); $('boss-name').textContent=t.def.name.toUpperCase(); },
  hideBossBar(){ $('boss-bar-box').classList.add('hidden'); },
  updateBossBar(){
    const t=G.target;
    if(t&&t.def&&t.def.boss&&t.alive){
      $('boss-fill').style.width=Math.max(0,(t.hp/t.maxHp*100))+'%';
      $('boss-text').textContent=Math.max(0,Math.ceil(t.hp))+' / '+t.maxHp;
    }
  },
  refreshHotbar(){
    if(!G||!G.player) return;
    const P=G.player;
    const cls=CLASSES[P.cls];
    const skills=cls.skills||[];
    // slots: 1-4 = skills ; 5 = eat any food ; 6 = potion
    G.hotbarSlots=[skills[0],skills[1],skills[2],skills[3],'_food','_potion'];
    const foodIdx=P.inv.findIndex(s=>s&&ITEMS[s.id].type==='food');
    const food = foodIdx>=0 ? ITEMS[P.inv[foodIdx].id] : null;
    document.querySelectorAll('.hb-slot').forEach(b=>{
      const n=+b.dataset.slot;
      const icon=b.querySelector('.hb-icon'), name=b.querySelector('.hb-name');
      if(n===6){ const pot=ITEMS['healing_potion']||ITEMS['minor_potion']; icon.innerHTML=(typeof spriteIcon!=='undefined'&&pot?spriteIcon(pot.id||'healing_potion'): '🧪'); name.textContent='Potion'; b.classList.remove('disabled'); b.title='Healing Potion'; return; }
      if(n===5){
        if(food){ icon.innerHTML=(typeof spriteIcon!=='undefined'?spriteIcon(food.id):esc(food.icon)); name.textContent=food.name; b.classList.remove('disabled'); b.title='Eat '+food.name; }
        else { icon.innerHTML='🍖'; name.textContent='Eat'; b.classList.add('disabled'); b.title='No food'; }
        return;
      }
      const sid=G.hotbarSlots[n-1];
      if(sid){ const sk=SKILLS[sid]; icon.innerHTML=(typeof skillIcon!=='undefined'&&sk.sprite?skillIcon(sid):esc(sk.icon)); name.textContent=sk.name; const locked=sk.unlock&&P.level<sk.unlock; b.classList.toggle('disabled',locked); b.title=(locked?'Unlocks at level '+sk.unlock+' — ':'')+sk.name+' — '+sk.cost+' MP — '+sk.cd+'s — '+sk.desc; }
      else { icon.innerHTML=''; name.textContent=''; b.classList.add('disabled'); b.title=''; }
    });
  },
  refreshHotbarCd(){
    document.querySelectorAll('.hb-slot').forEach(b=>{
      const n=+b.dataset.slot; const cd=b.querySelector('.hb-cd');
      let t=0, max=1;
      if(n===6){ t=G.skillCd._potion||0; max=1.5; }
      else if(n===5){ t=G.skillCd._food||0; max=1.2; }
      else { const sid=G.hotbarSlots[n-1]; if(sid){ t=G.skillCd[sid]||0; max=SKILLS[sid].cd; } }
      if(t>0){ cd.style.display='flex'; cd.textContent=Math.ceil(t); cd.style.height=Math.max(0,(t/max*100))+'%'; }
      else cd.style.display='none';
    });
  },
  refreshTracker(){
    const list=$('qt-list'); list.innerHTML='';
    let n=0;
    for(const id in G.quests){
      const st=G.quests[id]; if(st.status!=='active') continue;
      const q=QUESTS[id];
      const div=el('div','qtr');
      div.innerHTML='<div>'+(q.main?'★ ':'')+esc(q.name)+'</div>';
      q.obj.forEach((o,i)=>{
        const done=st.prog[i]>=o.n;
        div.appendChild(el('div','qobj'+(done?' qdone':''), (done?'☑ ':'☐ ')+esc(o.label)+' '+(st.prog[i])+'/'+o.n));
      });
      list.appendChild(div); n++;
      if(n>=3) break;
    }
    if(!n) list.innerHTML='<div class="qobj">None active</div>';
  },

  /* ---------- floating text ---------- */
  floatText(x,y,z,text,cls,color){
    if(!Settings.dmgNums && cls!=='xp') return;
    let e=UI.ftPool.find(f=>!f._on);
    if(!e){
      if(UI.ftPool.length>=50){ e=UI.ftPool[0]; }
      else { e=el('div','dmg-text'); $('fx-layer').appendChild(e); UI.ftPool.push(e); }
    }
    e._on=true;
    e.className='dmg-text'+(cls?' '+cls:'');
    if(color) e.style.color='#'+color.toString(16).padStart(6,'0'); else e.style.color='';
    e.textContent=text;
    const v=new THREE.Vector3(x,y,z).project(camera);
    if(v.z>1){ e._on=false; e.style.display='none'; return; }
    const sx=(v.x*0.5+0.5)*innerWidth, sy=(-v.y*0.5+0.5)*innerHeight;
    e.style.display='block';
    e.style.left=sx+'px'; e.style.top=sy+'px';
    e._t=0; e._x=sx+(Math.random()-0.5)*30; e._y=sy;
  },
  updateFloatTexts(dt){
    for(const e of UI.ftPool){
      if(!e._on) continue;
      e._t+=dt;
      if(e._t>1.1){ e._on=false; e.style.display='none'; continue; }
      e.style.top=(e._y-e._t*46)+'px';
      e.style.opacity=Math.max(0,1.1-e._t);
    }
  },

  /* ---------- name labels ---------- */
  updateLabels(){
    const P=G.player.mesh.position;
    let idx=0;
    const getSlot=()=>{
      if(UI.labels[idx]) return UI.labels[idx++];
      const d=el('div','ent-label'); $('name-layer').appendChild(d); UI.labels.push(d); idx++;
      return UI.labels[idx-1];
    };
    const show=(x,y,z,text,cls)=>{
      const v=new THREE.Vector3(x,y,z).project(camera);
      if(v.z>1){ return; }
      const e=getSlot();
      e.className='ent-label'+(cls?' '+cls:'');
      e.style.display='block';
      e.style.left=((v.x*0.5+0.5)*innerWidth)+'px';
      e.style.top=((-v.y*0.5+0.5)*innerHeight)+'px';
      e.innerHTML=text;
    };
    if(G.player && G.player.mesh){
      const pp=G.player.mesh.position;
      show(pp.x, pp.y+2.9, pp.z, esc(G.player.name)+'<br><span style="font-size:9px;color:#7f93a5">'+esc(CLASSES[G.player.cls].name)+' · Lv.'+G.player.level+'</span>', 'player');
    }
    for(const c of G.creatures){
      if(c.zoneId!==G.zoneId || !c.alive) continue;
      const p=c.mesh.position;
      if(Math.hypot(p.x-P.x,p.z-P.z)>18) continue;
      const pct=Math.max(0,Math.min(1,c.hp/c.maxHp));
      const col=pct>0.5?'#30b030':(pct>0.25?'#d0a020':'#d03030');
      const hpBar=Settings.bars?'<span class="hpb"><span class="hpf" style="width:'+(pct*100)+'%;background:'+col+'"></span></span>':'';
      show(p.x, p.y + 2.4*c.def.scale + 0.5, p.z, esc(c.def.name)+'<br><span style="font-size:9px;color:#b07a3a">Lv.'+c.def.lvl+(c.def.boss?' · Boss':'')+'</span>'+hpBar, 'creature');
    }
    for(const npc of G.npcs){
      if(npc.def.zone!==G.zoneId) continue;
      const p=npc.mesh.position;
      if(Math.hypot(p.x-P.x,p.z-P.z)>22) continue;
      const st=Quests.npcState(npc.id);
      const mark=st==='available'?'<span class="qmark">!</span>':(st==='complete'?'<span class="qmark qdone">?</span>':'');
      show(p.x,p.y+3.4,p.z, mark+' '+esc(npc.def.name)+'<br><span style="font-size:9px;color:#9a8a5e">'+esc(npc.def.title)+'</span>', 'npc');
    }
    if(World.current){
      for(const po of World.current.portalObjs){
        const p=po.mesh.position;
        if(Math.hypot(p.x-P.x,p.z-P.z)>16) continue;
        show(p.x,p.y+3.6,p.z, '<span style="color:#8fd6ff">'+esc(po.ex.label)+'</span><br><span style="font-size:9px;color:#9a8a5e">[F / walk in]</span>', '');
      }
      for(const ch of World.current.chestObjs){
        if(ch.opened) continue;
        const p=ch.mesh.position;
        if(Math.hypot(p.x-P.x,p.z-P.z)>8) continue;
        show(p.x,p.y+1.6,p.z,'<span style="color:#ffd75e">Chest [F]</span>','');
      }
    }
    for(let i=idx;i<UI.labels.length;i++) UI.labels[i].style.display='none';
  },

  /* ---------- toasts ---------- */
  toast(msg, kind){
    const t=el('div','toast'+(kind?' '+kind:''), esc(msg));
    $('toasts').appendChild(t);
    setTimeout(()=>{ t.style.opacity='0'; t.style.transition='opacity .4s'; setTimeout(()=>t.remove(),450); }, 3400);
    const box=$('toasts');
    while(box.children.length>6) box.removeChild(box.firstChild);
  },
  notifyLoot(it, qty, rar){
    const k = rar==='legendary'?'legendary':(rar==='epic'?'epic':(rar==='rare'?'rare':''));
    UI.toast((k?'✨ ':'')+it.name+(qty>1?' ×'+qty:'')+(k?' ['+RARITY[rar]+']':''), k||undefined);
  },
  levelUpBanner(lvl, text){
    $('lu-text').textContent='LEVEL '+lvl+' — '+text;
    const b=$('levelup-banner');
    b.classList.remove('hidden');
    clearTimeout(UI._luT);
    UI._luT=setTimeout(()=>b.classList.add('hidden'), 2600);
  },
  flashScreen(){
    document.body.style.boxShadow='inset 0 0 120px rgba(255,30,20,.35)';
    clearTimeout(UI._flashT);
    UI._flashT=setTimeout(()=>{ document.body.style.boxShadow=''; }, 160);
  },
  zoneBanner(name){
    $('zone-banner-main').textContent=name;
    const b=$('zone-banner');
    b.classList.remove('hidden'); b.classList.add('show');
    clearTimeout(UI._zbT);
    UI._zbT=setTimeout(()=>{ b.classList.remove('show'); setTimeout(()=>b.classList.add('hidden'),900); }, 2400);
  },
  showTutorial(text){ $('tutorial-box').classList.remove('hidden'); $('tutorial-text').textContent=text; },
  hideTutorial(){ $('tutorial-box').classList.add('hidden'); },
  showDeath(){ $('death-screen').classList.remove('hidden'); },
  hideDeath(){ $('death-screen').classList.add('hidden'); },
  showVictory(){ $('victory-screen').classList.remove('hidden'); },

  /* ---------- tooltip ---------- */
  tooltipItem(id, compareSlot){
    const it=ITEMS[id];
    const rc=RARITY_CLASS[it.rarity];
    let h='<div class="tt-name '+rc+'">'+(typeof spriteIcon!=='undefined'?spriteIcon(id):esc(it.icon))+' '+esc(it.name)+'</div>';
    h+='<div class="tt-rar '+rc+'">'+RARITY[it.rarity]+(it.lvl>1?' • Level '+it.lvl:'')+'</div>';
    if(it.dmg) h+='<div class="tt-stat">Damage '+it.dmg[0]+'–'+it.dmg[1]+(it.range?' • Range '+it.range:'')+'</div>';
    const st=it.stats||{};
    const names={def:'Defense',hp:'Max HP',mp:'Max MP',str:'Strength',dex:'Dexterity',int:'Intelligence',vit:'Vitality',crit:'Crit %',spd:'Speed'};
    for(const k in st) if(st[k]) h+='<div class="tt-stat">'+(st[k]>0?'+':'')+st[k]+' '+names[k]+'</div>';
    if(it.heal) h+='<div class="tt-stat">Restores '+it.heal+' HP</div>';
    if(it.mana) h+='<div class="tt-stat">Restores '+it.mana+' MP</div>';
    if(it.cure) h+='<div class="tt-stat">Cures poison</div>';
    const P=G.player;
    if(it.lvl>P.level) h+='<div class="tt-req">Requires level '+it.lvl+'</div>';
    // stat comparison vs currently equipped item
    if(compareSlot){
      const curId=P.equip[compareSlot];
      if(curId && curId!==id){
        const cur=ITEMS[curId];
        const cum={};
        for(const k in it.stats||{}) cum[k]=(cum[k]||0)+it.stats[k];
        for(const k in (cur.stats||{})) cum[k]=(cum[k]||0)-(cur.stats[k]||0);
        const order=['def','hp','mp','str','dex','int','vit','crit','spd'];
        let diff='';
        for(const k of order){ if(cum[k]){ diff+='<div class="tt-stat tt-diff'+(cum[k]>0?' up':' down')+'">'+(cum[k]>0?'+':'')+cum[k]+' '+names[k]+' vs '+esc(cur.name)+'</div>'; } }
        if(diff) h+='<div class="tt-cmp">'+diff+'</div>';
      }
    }
    h+='<div class="tt-desc">'+esc(it.desc||'')+'</div>';
    if(it.type!=='quest'&&it.price) h+='<div style="color:#ffd75e;margin-top:4px">Value '+it.price+' g • Sells '+sellPrice(it.id)+' g</div>';
    return h;
  },
  showTooltip(e, id, equipped){
    const t=$('tooltip');
    const slot = equipped && G.player ? equipped : (ITEMS[id].type in G.player.equip ? ITEMS[id].type : null);
    t.innerHTML=UI.tooltipItem(id, equipped?null:slot)+(equipped?'<div style="color:#9a8a5e;font-size:10px;margin-top:3px">Equipped — click to unequip</div>':'');
    t.classList.remove('hidden');
    UI.moveTooltip(e);
  },
  moveTooltip(e){
    const t=$('tooltip');
    if(t.classList.contains('hidden')) return;
    let x=e.clientX+16, y=e.clientY+10;
    const r=t.getBoundingClientRect();
    if(x+r.width>innerWidth-8) x=e.clientX-r.width-12;
    if(y+r.height>innerHeight-8) y=innerHeight-r.height-8;
    t.style.left=x+'px'; t.style.top=y+'px';
  },
  hideTooltip(){ $('tooltip').classList.add('hidden'); },

  /* ---------- inventory ---------- */
  refreshInventory(){
    if(!G||!G.player) return;
    const P=G.player;
    const grid=$('inv-grid');
    grid.innerHTML='';
    let count=0;
    P.inv.forEach((s,i)=>{
      const c=el('div','inv-cell');
      c.dataset.kind='inv'; c.dataset.idx=i;
      if(s){
        const it=ITEMS[s.id];
        count++;
        c.classList.add('r-'+it.rarity);
        c.innerHTML=(typeof spriteIcon!=='undefined'?spriteIcon(s.id):esc(it.icon))+(s.qty>1?'<span class="qty">'+s.qty+'</span>':'');
        c.addEventListener('dblclick', ()=>{ P.useItem(i); UI.refreshInventory(); });
        UI.attachDrag(c,{kind:'inv',idx:i},s);
      } else {
        c.classList.add('empty');
      }
      c.addEventListener('mouseenter', e=>{ if(s) UI.showTooltip(e,s.id); });
      c.addEventListener('mousemove', e=>UI.moveTooltip(e));
      c.addEventListener('mouseleave', ()=>UI.hideTooltip());
      grid.appendChild(c);
    });
    $('inv-count').textContent='('+count+'/'+INV_SLOTS+')';
    // capacity bar
    const cap=$('inv-cap-bar'), capT=$('inv-cap-text');
    if(cap){ cap.style.width=(count/INV_SLOTS*100)+'%'; }
    if(capT){ capT.textContent=count+'/'+INV_SLOTS+' slots'; }
    // equipment
    const GHOST={weapon:'🗡️',shield:'🛡️',helmet:'🪖',armor:'🦺',legs:'👖',boots:'🥾',ring:'💍',amulet:'📿'};
    document.querySelectorAll('.eq-cell').forEach(cell=>{
      const id=P.equip[cell.dataset.slot];
      cell.classList.remove('filled','r-common','r-uncommon','r-rare','r-epic','r-legendary');
      if(id){
        const it=ITEMS[id];
        cell.innerHTML=(typeof spriteIcon!=='undefined'?spriteIcon(id):esc(it.icon));
        cell.classList.add('filled','r-'+it.rarity);
        UI.attachDrag(cell,{kind:'equip',idx:cell.dataset.slot},{id, qty:1});
      } else {
        cell.innerHTML='<span class="eq-ghost">'+GHOST[cell.dataset.slot]+'</span>';
      }
    });
    // mini stats
    const sm=$('char-stats-mini');
    sm.innerHTML='';
    const mkStat=(ico,label,val)=>el('div','stat', '<span class="stat-ico">'+ico+'</span><span class="stat-label">'+label+'</span><b>'+val+'</b>');
    sm.appendChild(mkStat('⚔️','Attack',P.derived.maxAtk));
    sm.appendChild(mkStat('🛡️','Defense',P.derived.maxDef));
    sm.appendChild(mkStat('💥','Crit',P.derived.crit.toFixed(1)+'%'));
    sm.appendChild(mkStat('👟','Speed',P.derived.spd.toFixed(1)));
    UI.refreshHUD();
  },

  /* ---------- drag helpers ---------- */
  attachDrag(cell, src, item){
    cell.addEventListener('pointerdown', e=>{
      if(e.button!==0) return;
      Drag._downX=e.clientX; Drag._downY=e.clientY; Drag._started=false;
      Drag._candidate={e, src, item, split:e.shiftKey && !!ITEMS[item.id].stack && item.qty>1};
    });
    cell.addEventListener('pointermove', e=>{
      if(!Drag._candidate || Drag._started) return;
      if(Math.hypot(e.clientX-Drag._downX, e.clientY-Drag._downY) < 12) return;
      Drag._started=true;
      const c=Drag._candidate;
      Drag.begin(e, c.src, c.item, c.split);
      Audio.play('click');
      const dz=$('drop-zone'); if(dz) dz.classList.remove('hidden');
    });
    if(!cell._dragReleaseHooked){
      cell._dragReleaseHooked=true;
      const release=()=>{ if(!Drag._started){ Drag._candidate=null; } };
      cell.addEventListener('pointerup', release);
      cell.addEventListener('pointercancel', release);
      cell.addEventListener('pointerleave', release);
    }
  },
  hintDrop(){
    const dz=$('drop-zone'); if(!dz) return;
    dz.addEventListener('pointerdown', e=>e.preventDefault());
  },
  openSplit(it, avail){
    const n=Math.min(Math.max(1,avail-1||1), MAX_SPLIT);
    const r=$('split-range'); r.max=n; r.value=Math.floor(n/2)||1;
    $('split-amount').textContent=r.value;
    Drag._splitAvail=avail;
    $('split-modal').classList.remove('hidden');
  },
  closeSplit(){ $('split-modal').classList.add('hidden'); Drag.pendingSplit=null; Drag._splitAvail=null; },
  commitSplit(){
    const ps=Drag.pendingSplit; if(!ps) return;
    const qty=+$('split-range').value;
    const P=G.player;
    if(P.splitItem(ps.from, ps.to, qty)){ Audio.play('coin'); }
    UI.closeSplit();
  },
  sortInventory(){
    const P=G.player;
    const items=P.inv.filter(s=>s);
    const order={'weapon':0,'shield':1,'armor':2,'helmet':3,'legs':4,'boots':5,'ring':6,'amulet':7,'potion':8,'food':9,'material':10,'quest':11};
    const rar={'legendary':0,'epic':1,'rare':2,'uncommon':3,'common':4};
    items.sort((a,b)=>{
      const A=ITEMS[a.id], B=ITEMS[b.id];
      return (order[A.type]-order[B.type]) || (rar[A.rarity]-rar[B.rarity]) || a.id.localeCompare(b.id);
    });
    P.inv=new Array(INV_SLOTS).fill(null);
    items.forEach((s,i)=>{ if(i<INV_SLOTS) P.inv[i]=s; });
    Audio.play('click');
    UI.refreshInventory();
  },

  /* ---------- character ---------- */
  refreshCharacter(){
    const P=G.player;
    $('char-class-name').textContent=CLASSES[P.cls].name+' '+P.name;
    $('char-level').textContent='Level '+P.level+(P.level>=LEVEL_CAP?' (max)':'');
    const need=xpNeeded(P.level);
    $('char-xp-fill').style.width=Math.min(100,P.xp/need*100)+'%';
    $('char-xp-text').textContent=P.level>=LEVEL_CAP?'MAX':P.xp+' / '+need+' XP';
    $('char-attrs').innerHTML=
      '<div>Strength <span class="av">'+P.attrs.str+'</span></div>'+
      '<div>Dexterity <span class="av">'+P.attrs.dex+'</span></div>'+
      '<div>Intelligence <span class="av">'+P.attrs.int+'</span></div>'+
      '<div>Vitality <span class="av">'+P.attrs.vit+'</span></div>';
    $('attr-points-note').textContent=P.points>0?P.points+' attribute point'+(P.points>1?'s':'')+' available':'';
    document.querySelectorAll('.alloc-btn').forEach(b=>b.disabled=P.points<=0);
    const d=P.derived;
    $('char-derived').innerHTML=
      '<h4>Vitals</h4>'+
      '<div>Health <span class="dv">'+Math.ceil(P.hp)+' / '+d.maxHp+'</span></div>'+
      '<div>Mana <span class="dv">'+Math.floor(P.mp)+' / '+d.maxMp+'</span></div>'+
      '<h4>Combat</h4>'+
      '<div>Weapon damage <span class="dv">'+d.dmgMin+'–'+d.dmgMax+'</span></div>'+
      '<div>Attack power <span class="dv">'+d.maxAtk+'</span></div>'+
      '<div>Defense <span class="dv">'+d.maxDef+'</span></div>'+
      '<div>Critical <span class="dv">'+d.crit.toFixed(1)+'%</span></div>'+
      '<div>Dodge <span class="dv">'+d.dodge.toFixed(1)+'%</span></div>'+
      '<div>Speed <span class="dv">'+d.spd.toFixed(1)+'</span></div>'+
      '<h4>Journey</h4>'+
      '<div>Gold <span class="dv">'+P.gold+'</span></div>'+
      '<div>Time played <span class="dv">'+Math.floor(G.playTime/60)+'m</span></div>';
  },

  /* ---------- skills ---------- */
  refreshSkills(){
    const P=G.player;
    const list=$('skills-list'); list.innerHTML='';
    const mine=CLASSES[P.cls].skills||[];
    for(const id in SKILLS){
      const sk=SKILLS[id];
      const has=mine.includes(id);
      const locked=has && sk.unlock && P.level<sk.unlock;
      const row=el('div','skill-row'+(has&&!locked?'':' locked'));
      const meta = (has?(locked?'Unlocks at lv '+sk.unlock:sk.cost+' MP<br>'+sk.cd+'s CD'):CLASSES[sk.cls].name);
      const ico=(typeof skillIcon!=='undefined'&&sk.sprite?skillIcon(id):esc(sk.icon));
      row.innerHTML='<div class="skill-ico">'+ico+'</div><div class="skill-info"><div class="skill-name">'+esc(sk.name)+(has&&!locked?'':' <span style="font-size:10px;color:#9a8a5e">'+(locked?'(Locked)':CLASSES[sk.cls].name)+'</span>')+'</div><div class="skill-desc">'+esc(sk.desc)+'</div></div><div class="skill-meta">'+meta+'</div>';
      list.appendChild(row);
    }
  },

  /* ---------- quests ---------- */
  refreshQuests(){
    const list=$('quests-list'); list.innerHTML='';
    let any=false;
    for(const id in G.quests){
      const st=G.quests[id]; const q=QUESTS[id];
      any=true;
      const card=el('div','quest-card'+(st.status==='done'?' done':'')+(q.main?' main':''));
      let h='<div class="qc-tag">'+(st.status==='done'?'Complete':(q.main?'Main':'Side'))+'</div><div class="qc-name">'+esc(q.name)+'</div><div class="qc-desc">'+esc(q.desc)+'</div>';
      q.obj.forEach((o,i)=>{
        const done=st.prog[i]>=o.n;
        h+='<div class="qc-obj'+(done?' ok':'')+'">'+(done?'☑':'☐')+' '+esc(o.label)+' — '+Math.min(st.prog[i],o.n)+'/'+o.n+'</div>';
      });
      const r=q.reward||{};
      h+='<div class="qc-reward">Reward: '+r.xp+' XP'+(r.gold?', '+r.gold+' gold':'')+(r.items?', '+r.items.map(x=>ITEMS[x.id].name).join(', '):'')+'</div>';
      card.innerHTML=h;
      list.appendChild(card);
    }
    if(!any) list.innerHTML='<div class="qc-desc">No quests yet. Speak with Captain Arlen.</div>';
  },

  /* ---------- world map ---------- */
  drawWorldMap(){
    const c=$('world-map'), g=c.getContext('2d');
    g.fillStyle='#0d0c08'; g.fillRect(0,0,c.width,c.height);
    const L={ greenfields:[420,190], asterfall:[250,190], dark_forest:[80,190], frost_peaks:[80,50], murkwater:[250,300], ancient_ruins:[250,400], dragon_mountain:[250,455], goblin_mine:[80,105], forgotten_crypt:[150,400] };
    const links=[['dark_forest','asterfall'],['asterfall','greenfields'],['asterfall','murkwater'],['dark_forest','frost_peaks'],['dark_forest','goblin_mine'],['murkwater','ancient_ruins'],['ancient_ruins','dragon_mountain'],['ancient_ruins','forgotten_crypt']];
    g.lineWidth=3; g.strokeStyle='#3d3320';
    for(const [a,b] of links){
      if(!G.discovered.has(a)||!G.discovered.has(b)) continue;
      g.beginPath(); g.moveTo(L[a][0]+45,L[a][1]+25); g.lineTo(L[b][0]+45,L[b][1]+25); g.stroke();
    }
    for(const z in L){
      const [x,y]=L[z];
      const known=G.discovered.has(z);
      g.fillStyle=known?'#2c2618':'#15130e';
      g.strokeStyle=known?'#6b5a32':'#2a2618';
      g.fillRect(x,y,90,50); g.strokeRect(x,y,90,50);
      g.fillStyle=known?'#e0cfa0':'#4a4434';
      g.font='12px Georgia'; g.textAlign='center';
      g.fillText(known?ZONES[z].name:'???', x+45, y+28);
      if(z===G.zoneId){ g.fillStyle='#6fd6ff'; g.beginPath(); g.arc(x+45,y+42,4,0,7); g.fill(); }
    }
    $('map-legend').textContent='Blue dot — you. Regions appear as you discover them.';
  },

  /* ---------- minimap ---------- */
  updateMinimap(){
    const z=World.current; if(!z) return;
    const c=$('minimap'), g=c.getContext('2d');
    const S=c.width;
    g.clearRect(0,0,S,S);
    const scale=Math.min(S/(z.w*TILE), S/(z.h*TILE));
    const P=G.player.mesh.position;
    const view=44; // tiles visible
    const px=P.x/TILE, pz=P.z/TILE;
    const ox=px-view/2, oz=pz-view/2;
    const toX=tx=>(tx-ox)*(S/view), toY=tz=>(tz-oz)*(S/view);
    g.drawImage(z.minimapBase, -ox*(S/view), -oz*(S/view), z.w*(S/view), z.h*(S/view));
    g.save(); g.beginPath(); g.rect(0,0,S,S); g.clip();
    for(const npc of G.npcs){ if(npc.def.zone!==G.zoneId) continue; g.fillStyle='#6fd6ff'; g.beginPath(); g.arc(toX(npc.def.x+0.5),toY(npc.def.z+0.5),3,0,7); g.fill(); }
    for(const po of z.portalObjs){ g.fillStyle='#40ffd0'; g.beginPath(); g.arc(toX(po.ex.x+0.5),toY(po.ex.z+0.5),3,0,7); g.fill(); }
    for(const ch of z.chestObjs){ if(ch.opened) continue; g.fillStyle='#ffd75e'; g.fillRect(toX(ch.def.x)-2,toY(ch.def.z)-2,4,4); }
    for(const cr of G.creatures){ if(!cr.alive||cr.zoneId!==G.zoneId) continue; const d=Math.hypot(cr.mesh.position.x-P.x,cr.mesh.position.z-P.z); if(d>26*TILE) continue; g.fillStyle=cr.def.boss?'#ff4040':'#c05050'; g.beginPath(); g.arc(toX(cr.mesh.position.x/TILE),toY(cr.mesh.position.z/TILE),cr.def.boss?4:2.5,0,7); g.fill(); }
    g.fillStyle='#ffffff'; g.strokeStyle='#000'; g.beginPath(); g.arc(S/2,S/2,3.5,0,7); g.fill(); g.stroke();
    g.restore();
  },

  /* ---------- dialogue ---------- */
  openDialogue(npcId){
    const npc=NPCS[npcId];
    $('dialogue').classList.remove('hidden');
    $('dlg-name').textContent=npc.name.toUpperCase()+' — '+npc.title;
    const portrait=$('dlg-portrait');
    if(portrait){ portrait.src='assets/npc/'+npcId+'.png'; portrait.alt=npc.name; portrait.style.display='block'; }
    const opts=[];
    const line=npc.lines[0];
    let text=line;
    const st=Quests.npcState(npcId);
    // quest offers
    const offers=Quests.offerableFor(npcId);
    const readys=Quests.readyFor(npcId);
    if(npcId==='aldric' && G.quests['q_class'] && G.quests['q_class'].status==='active' && Quests.allDone('q_class')){
      // handled below via ready
    }
    for(const id of readys){
      opts.push({label:'Turn in: '+QUESTS[id].name, act:()=>{
        if(id==='q_class'){ UI.openVocation(); }
        else Quests.turnIn(id, npcId);
        $('dialogue').classList.add('hidden');
      }});
    }
    for(const id of offers){
      opts.push({label:'Ask about work: '+QUESTS[id].name, act:()=>{ Quests.accept(id); $('dialogue').classList.add('hidden'); }});
    }
    if(npcId==='aldric' && G.quests['q_class'] && G.quests['q_class'].status==='active' && !Quests.allDone('q_class')){
      text='“Your path is not yet chosen. Finish your first deeds, then return — the temple light will show you what you are meant to become.”';
    }
    if(npc.role==='healer'){
      opts.push({label:'Heal me (free)', act:()=>{ G.player.heal(G.player.derived.maxHp); G.player.mp=G.player.derived.maxMp; G.player.status.poison=0; Audio.play('buff'); UI.toast('The temple light mends you.','q'); }});
    }
    if(npc.shop){
      opts.push({label:'Trade', act:()=>{ UI.openShop(npcId); }});
    }
    if(npc.role==='bank'){
      opts.push({label:'Access the vault', act:()=>{ UI.openDepot(); }});
    }
    opts.push({label:'Goodbye', act:()=>{ $('dialogue').classList.add('hidden'); }});
    $('dlg-text').textContent=text;
    const box=$('dlg-options'); box.innerHTML='';
    for(const o of opts){
      const b=el('button','dlg-opt','» '+esc(o.label));
      b._act=o.act;
      box.appendChild(b);
    }
    Quests.onTalk(npcId);
    Tutorial.note('talk_'+npcId);
  },
  closeDialogue(){ $('dialogue').classList.add('hidden'); },

  /* ---------- shop ---------- */
  openShop(npcId){
    Shop.current=npcId;
    Tutorial.note('shop_open');
    const npc=NPCS[npcId];
    $('shop').classList.remove('hidden');
    $('dialogue').classList.add('hidden');
    $('shop-title').textContent=npc.name+' — '+(npcId==='borin'?'Smith & Armory':npcId==='elara'?'Arcane Goods':npcId==='rowan'?'Ranger Outfitter':'General Store');
    $('shop-gold').textContent='Your gold: '+G.player.gold+' 🪙';
    const buy=$('shop-buy-list'); buy.innerHTML='';
    const seen=new Set();
    for(const id of npc.shop){
      if(seen.has(id)) continue; seen.add(id);
      const it=ITEMS[id];
      const row=el('div','shop-item');
      row.innerHTML='<span class="si-ico">'+(typeof spriteIcon!=='undefined'?spriteIcon(id,'shop-icon'):esc(it.icon))+'</span><span class="si-name '+RARITY_CLASS[it.rarity]+'">'+esc(it.name)+'</span><span class="si-price">'+it.price+' g</span>';
      const b=el('button',null,'Buy');
      b.disabled=G.player.gold<it.price;
      b.addEventListener('click', ()=>Shop.buy(npcId,id));
      row.appendChild(b);
      row.addEventListener('mouseenter', e=>UI.showTooltip(e,id));
      row.addEventListener('mousemove', e=>UI.moveTooltip(e));
      row.addEventListener('mouseleave', ()=>UI.hideTooltip());
      buy.appendChild(row);
    }
    const sell=$('shop-sell-list'); sell.innerHTML='';
    const P=G.player;
    P.inv.forEach((s,i)=>{
      if(!s) return;
      const it=ITEMS[s.id];
      if(it.type==='quest'){ return; }
      const row=el('div','shop-item');
      row.innerHTML='<span class="si-ico">'+(typeof spriteIcon!=='undefined'?spriteIcon(s.id,'shop-icon'):esc(it.icon))+'</span><span class="si-name '+RARITY_CLASS[it.rarity]+'">'+esc(it.name)+(s.qty>1?' ×'+s.qty:'')+'</span><span class="si-price">'+sellPrice(s.id)+' g</span>';
      const b=el('button',null,'Sell');
      b.addEventListener('click', ()=>Shop.sell(i));
      row.appendChild(b);
      row.addEventListener('mouseenter', e=>UI.showTooltip(e,s.id));
      row.addEventListener('mousemove', e=>UI.moveTooltip(e));
      row.addEventListener('mouseleave', ()=>UI.hideTooltip());
      sell.appendChild(row);
    });
    if(!sell.children.length) sell.innerHTML='<div class="qc-desc">Nothing to sell.</div>';
  },

  /* ---------- depot ---------- */
  openDepot(){
    $('depot').classList.remove('hidden');
    $('dialogue').classList.add('hidden');
    UI.refreshDepot();
  },
  refreshDepot(){
    const bp=$('depot-backpack'); bp.innerHTML='';
    const P=G.player;
    P.inv.forEach((s,i)=>{
      const c=el('div','inv-cell'); c.dataset.kind='inv'; c.dataset.idx=i;
      if(s){
        const it=ITEMS[s.id];
        c.classList.add('r-'+it.rarity);
        c.innerHTML=(typeof spriteIcon!=='undefined'?spriteIcon(s.id):esc(it.icon))+(s.qty>1?'<span class="qty">'+s.qty+'</span>':'');
        UI.attachDrag(c,{kind:'inv',idx:i},s);
      } else c.classList.add('empty');
      c.addEventListener('mouseenter', e=>{ if(s) UI.showTooltip(e,s.id); });
      c.addEventListener('mousemove', e=>UI.moveTooltip(e));
      c.addEventListener('mouseleave', ()=>UI.hideTooltip());
      bp.appendChild(c);
    });
    const grid=$('depot-grid'); grid.innerHTML='';
    P.depot.forEach((s,i)=>{
      const c=el('div','inv-cell'); c.dataset.kind='depot'; c.dataset.idx=i;
      if(s){
        const it=ITEMS[s.id];
        c.classList.add('r-'+it.rarity);
        c.innerHTML=(typeof spriteIcon!=='undefined'?spriteIcon(s.id):esc(it.icon))+(s.qty>1?'<span class="qty">'+s.qty+'</span>':'');
        UI.attachDrag(c,{kind:'depot',idx:i},s);
      } else c.classList.add('empty');
      c.addEventListener('mouseenter', e=>{ if(s) UI.showTooltip(e,s.id); });
      c.addEventListener('mousemove', e=>UI.moveTooltip(e));
      c.addEventListener('mouseleave', ()=>UI.hideTooltip());
      grid.appendChild(c);
    });
  },

  /* ---------- vocation ---------- */
  buildVocationCards(){
    const box=$('voc-cards'); box.innerHTML='';
    const icons={vanguard:'🛡️',ranger:'🏹',arcanist:'🔥',warden:'🌿'};
    for(const id of ['vanguard','ranger','arcanist','warden']){
      const c=CLASSES[id];
      const card=el('div','voc-card');
      card.innerHTML='<div class="voc-icon">'+icons[id]+'</div><div class="voc-name">'+c.name+'</div><div class="voc-desc">'+c.desc+'</div>'+
        '<div class="voc-desc" style="margin-top:8px;color:#8fc8ff">'+c.skills.map(s=>SKILLS[s].icon+' '+SKILLS[s].name).join('<br>')+'</div>';
      card.addEventListener('click', ()=>UI.chooseVocation(id));
      box.appendChild(card);
    }
  },
  openVocation(){ $('vocation-modal').classList.remove('hidden'); },
  chooseVocation(id){
    const P=G.player;
    if(P.cls!=='adventurer') return;
    P.cls=id;
    const start=CLASSES[id].start;
    P.attrs.str+=start.str; P.attrs.dex+=start.dex; P.attrs.int+=start.int; P.attrs.vit+=start.vit;
    P.recalc();
    P.hp=P.derived.maxHp; P.mp=P.derived.maxMp;
    P.rebuildMesh();
    UI.refreshHotbar();
    $('vocation-modal').classList.add('hidden');
    Quests.turnIn('q_class');
    Audio.play('levelup');
    FX.levelFX(P.mesh.position.x,1,P.mesh.position.z);
    UI.toast('You are now a '+CLASSES[id].name+'! The roads beyond Asterfall open before you.','q');
    Tutorial.note('vocation_done');
    Save.save();
  },
};

/* ---------- settings sync (module-level helpers) ---------- */
function syncSettings(){
  $('set-vol').value=Settings.volume*100;
  document.querySelector('.set-vol-x').value=Settings.volume*100;
  $('set-shadows').checked=Settings.shadows; document.querySelector('.set-shadows-x').checked=Settings.shadows;
  $('set-dmg').checked=Settings.dmgNums; document.querySelector('.set-dmg-x').checked=Settings.dmgNums;
  $('set-bars').checked=Settings.bars; document.querySelector('.set-bars-x').checked=Settings.bars;
  if(typeof Save!=='undefined') Save.settingsSave();
}
function applySettings(){
  if(!G||!G.renderer) return;
  G.renderer.shadowMap.enabled=Settings.shadows;
  if(G.sun) G.sun.castShadow=Settings.shadows;
  G.scene.traverse(o=>{ if(o.isMesh&&o.material&&o.material.needsUpdate!==undefined) o.material.needsUpdate=true; });
}
