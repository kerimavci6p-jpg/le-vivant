/* Le Vivant : duel « Chaîne alimentaire » et Marché (repris de ClubDeck : enchères, achat immédiat, vente, défis du jour).
   Ce fichier se charge après le script principal et utilise ses outils : CARDS, BY, col, sv, ld, $, esc, card, show, toast, render, tab. */

/* ================= valeur d'un animal (sert à la cote du Marché) ================= */
/* force 1 à 10 = le coût de la carte (tiré de ses 3 stats) */
const fOf=c=>c.k||1;

/* ================= points ================= */
let pts=ld('pts',100);
function setPts(v){pts=Math.max(0,Math.round(v));sv('pts',pts);const e=$('ptsN');if(e)e.textContent=pts.toLocaleString('fr-FR')}
setPts(pts);
const fr=v=>v.toLocaleString('fr-FR');
function giveOne(id){col[id]=(col[id]||0)+1;sv('col',col)}
function takeOne(id){if(!col[id])return false;col[id]--;if(!col[id])delete col[id];sv('col',col);return true}

/* ================= WILD DUEL (moteur dans duel.js) : une seule carte active par joueur ================= */
const DECK_N=30,DAILY=5,HAND=5;
let team=ld('deck30',[]),DU=null,teamEdit=false,wdLevel=ld('wdlevel','normal');
const today=()=>{const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
let dw=ld('dw',{d:0,n:0});
const stv=(c,k)=>c.st[{P:0,V:1,I:2}[k]];
const sum3=c=>c.st[0]+c.st[1]+c.st[2];
const wdCard=c=>({id:c.id,name:c.n,cost:c.k||1,stats:{power:c.st[0],speed:c.st[1],intelligence:c.st[2]}});
const ownList=()=>owned().map(c=>({c,n:col[c.id]}));
function buildDeck(pool){
  const out=[];pool.slice().sort((a,b)=>sum3(b)/b.c.k-sum3(a)/a.c.k||sum3(b.c)-sum3(a.c)).forEach(x=>{for(let i=0;i<Math.min(2,x.n);i++)if(out.length<DECK_N)out.push(x.c)});
  return out;
}
/* deck automatique : une vraie courbe d'énergie (des petites cartes pour les premiers tours), les meilleures stats par coût */
function autoTeam(){
  const want={1:2,2:4,3:5,4:5,5:5,6:4,7:3,8:2,9:0,10:0},out=[];
  const by=k=>ownList().filter(x=>x.c.k===k).sort((a,b)=>sum3(b.c)-sum3(a.c));
  Object.keys(want).forEach(k=>{let n=want[k];by(+k).forEach(x=>{for(let i=0;i<Math.min(2,x.n)&&n>0;i++){out.push(x.c.id);n--}})});
  ownList().sort((a,b)=>sum3(b.c)/b.c.k-sum3(a.c)/a.c.k).forEach(x=>{const have=out.filter(id=>id===x.c.id).length;for(let i=have;i<Math.min(2,x.n)&&out.length<DECK_N;i++)out.push(x.c.id)});
  team=out.slice(0,DECK_N);sv('deck30',team)}
function deckCards(){
  const cnt={},cs=[];team.forEach(id=>{if(BY[id]&&(cnt[id]||0)<Math.min(2,col[id]||0)){cnt[id]=(cnt[id]||0)+1;cs.push(BY[id])}});
  const loan=shuffle(CARDS.filter(c=>c.k<=5)).slice(0,Math.max(0,DECK_N-cs.length));
  return{cs:cs.concat(loan),loans:loan.length};
}
function oppDeck(n){const pool=shuffle(CARDS.slice()).slice(0,Math.max(30,n||owned().length)),want={1:2,2:4,3:5,4:5,5:5,6:4,7:3,8:2},out=[];
  Object.keys(want).forEach(k=>{let c=want[k];pool.filter(x=>x.k===+k).sort((a,b)=>sum3(b)-sum3(a)).forEach(x=>{for(let i=0;i<2&&c>0;i++){out.push(x);c--}})});
  pool.sort((a,b)=>sum3(b)/b.k-sum3(a)/a.k).forEach(x=>{if(out.filter(y=>y===x).length<2&&out.length<DECK_N)out.push(x)});
  while(out.length<DECK_N)out.push(pool[out.length%pool.length]);return out.slice(0,DECK_N)}
function curve(cs){const h={};cs.forEach(c=>h[c.k]=(h[c.k]||0)+1);const mx=Math.max(1,...Object.values(h));
  return `<div class="curve">${Array.from({length:10},(_,i)=>i+1).map(k=>`<span><i style="height:${(h[k]||0)/mx*100}%"></i><small>${k}</small></span>`).join('')}</div>`}
const avgCost=cs=>cs.length?(cs.reduce((a,c)=>a+c.k,0)/cs.length).toFixed(1):'0';

/* --- sons --- */
function sfx(k){try{audio();({play:()=>{note(523,0,.18,.08);note(784,.08,.25,.07)},hit:()=>noise(0,.18,300,900,.18),win:()=>{note(659,0,.15,.08);note(880,.1,.3,.08)},
  turn:()=>note(440,0,.12,.05),victory:()=>[523,659,784,1047].forEach((f,i)=>note(f,i*.12,.4,.08)),defeat:()=>[392,330,262].forEach((f,i)=>note(f,i*.15,.4,.06))})[k]()}catch(e){}}

/* --- état d'écran --- */
let WDV={screen:'menu',sel:null,mull:[],flash:null,timer:0,tick:0,tuto:0,emote:null,emoteAt:0,log:false};
const ME=0,AI=1;
function wdNew(){
  const mine=deckCards().cs.map(wdCard),theirs=oppDeck(owned().length).map(wdCard);
  const G=WD.newGame(mine,theirs,{nameA:'Vous',nameB:'La Naturaliste'});
  WD.aiMulligan(G,AI);
  DU={G,start:Date.now()};WDV=Object.assign(WDV,{screen:'vs',sel:null,mull:[],flash:null,emote:null,log:false});
  rDuel();setTimeout(()=>{if(DU&&WDV.screen==='vs'){WDV.screen=ld('wdtuto',0)?'mull':'tuto';WDV.tuto=0;rDuel()}},1600);
}
function wdStartTimer(){clearInterval(WDV.tick);WDV.timer=WD.CONFIG.TURN_SECONDS;
  WDV.tick=setInterval(()=>{if(!DU||DU.G.phase!=='PLAY'||DU.G.active!==ME||WDV.screen!=='play'){return}
    WDV.timer--;const t=$('wdTime');if(t){t.textContent='00:'+String(Math.max(0,WDV.timer)).padStart(2,'0');t.classList.toggle('hot',WDV.timer<=10)}
    if(WDV.timer===10)sfx('turn');if(WDV.timer<=0){wdEnd()}},1000)}
function wdAfter(){
  const G=DU.G;
  if(G.phase==='GAME_OVER'){clearInterval(WDV.tick);WDV.screen='over';const r=G.winner===ME?1:G.winner===AI?-1:0;
    if(dw.d!==today())dw={d:today(),n:0};let g=r>0?(dw.n<DAILY?60:10):r===0?20:10;if(r>0){dw.n++;wins++;sv('wins',wins)}sv('dw',dw);
    DU.res=r;DU.gain=g;setPts(pts+g);sfx(r>0?'victory':'defeat')}
  rDuel();
}
function wdEnd(){
  const G=DU.G;if(G.phase!=='PLAY'||G.active!==ME)return;
  WD.endTurn(G,ME);WDV.sel=null;WDV.banner='Tour de la Naturaliste';sfx('turn');rDuel();
  setTimeout(()=>{if(!DU||DU.G!==G)return;const before=G.events.length;WD.aiTurn(G,AI,wdLevel);
    const cb=G.events.slice(before).filter(e=>e.type==='COMBAT_RESOLVED').pop();
    if(cb){WDV.flash={who:AI,a:cb.a,b:cb.b,stat:cb.stat,dmg:G.events.slice(before).filter(e=>e.type==='DAMAGE_DEALT').map(e=>({p:e.player,v:e.value}))};sfx('hit')}
    if(G.phase==='PLAY'){WDV.banner='À vous';WDV.top=1;wdStartTimer();if(Math.random()<.12)wdEmote(AI,['Bien joué !','Impressionnant !','Bonne chance !'][Math.random()*3|0])}
    wdAfter();setTimeout(()=>{WDV.banner=null;const b=$('wdBanner');if(b)b.remove()},900)},1100);
}
function wdEmote(who,t){WDV.emote={who,t,at:Date.now()};if(who===ME)WDV.emoteAt=Date.now();rDuel();setTimeout(()=>{if(WDV.emote&&Date.now()-WDV.emote.at>=2400){WDV.emote=null;const e=document.querySelector('.wd-emo');if(e)e.remove()}},2500)}
const STK=[['power','Puissance','PUI'],['speed','Vitesse','VIT'],['intelligence','Intelligence','INT']];
function wdMini(ci,cls){if(!ci)return `<div class="wd-empty ${cls||''}">aucun animal</div>`;return `<button class="wd-act ${cls||''}" data-z="${ci.uid}">${card(BY[ci.id],true)}</button>`}
function hpBar(P){return `<span class="wd-hp"><b>♥ ${P.health}</b><i><u style="width:${P.health/WD.CONFIG.HP*100}%"></u></i></span>`}

function rDuel(){
  const m=$('main');
  if(teamEdit)return rTeam();
  if(!DU||WDV.screen==='menu'){
    if(team.filter(id=>col[id]).length<DECK_N&&owned().length>new Set(team).size)autoTeam();
    const d=deckCards();if(dw.d!==today())dw={d:today(),n:0};
    m.innerHTML=`<div class="wd-title"><b>${WD.CONFIG.name}</b><span>${WD.CONFIG.subtitle}</span></div>
      <div class="nat"><img src="art/naturaliste.webp" alt="La Naturaliste"><div><b>Entraînement contre la Naturaliste</b><span>Une seule carte active chacun. Réduisez ses PV de 20 à 0.</span></div></div>
      <div class="seg wd-lv">${[['facile','Facile'],['normal','Normal'],['expert','Expert']].map(x=>`<button data-lv="${x[0]}" aria-pressed="${wdLevel===x[0]}">${x[1]}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="go">Jouer</button><button class="btn ghost" id="edit">Mon deck</button><button class="btn ghost" id="tut">Tutoriel</button></div>
      <p class="lead" style="text-align:center;margin-top:10px">Victoire : ${dw.n<DAILY?60:10} points (${Math.max(0,DAILY-dw.n)} à plein tarif aujourd'hui). Nul : 20. Défaite : 10.</p>
      <details class="rules"><summary>Règles</summary>
      <p><b>Une seule carte active</b> par joueur. Vous pouvez la remplacer une fois par tour (l'ancienne part à la défausse).</p>
      <p><b>Énergie</b> : 1 au premier tour, +1 à chaque tour, 10 au plus. Une carte coûte son nombre d'énergie.</p>
      <p><b>Duel</b> : une fois par tour, choisissez Puissance, Vitesse ou Intelligence. Écart 1-2 : 1 dégât, 3-4 : 2, 5-6 : 3, 7+ : 4. Si votre animal est plus faible, il subit une riposte de 1. Pas d'animal en face : attaque directe de 1.</p>
      <p><b>Fatigue</b> : la stat utilisée est bloquée au tour suivant (sauf si vous changez d'animal).</p>
      <p><b>Outsider</b> : la carte la moins chère gagne +1 par point de coût d'écart, +2 au plus. Un petit animal peut battre un grand.</p>
      <p>Deck de ${DECK_N} cartes, 2 exemplaires au plus. Main de ${HAND}, une carte piochée par tour, 8 en main au plus. ${WD.CONFIG.TURN_SECONDS} secondes par tour.</p></details>
      <h3 class="h3">Mon deck · ${d.cs.length} cartes · coût moyen ${avgCost(d.cs)}${d.loans?` · ${d.loans} prêtée${d.loans>1?'s':''}`:''}</h3>${curve(d.cs)}`;
    m.querySelectorAll('[data-lv]').forEach(b=>b.addEventListener('click',()=>{wdLevel=b.dataset.lv;sv('wdlevel',wdLevel);rDuel()}));
    $('go').addEventListener('click',()=>{audio();wdNew()});
    $('edit').addEventListener('click',()=>{teamEdit=true;rDuel()});
    $('tut').addEventListener('click',()=>{sv('wdtuto',0);audio();wdNew()});
    return;
  }
  const G=DU.G,v=WD.view(G,ME),me=v.me,op=v.opponent;
  if(WDV.screen==='vs'){
    m.innerHTML=`<div class="wd-vs"><div class="wd-av"><span class="wd-me">🧭</span><b>Vous</b></div><i>VS</i><div class="wd-av"><img src="art/naturaliste.webp" alt=""><b>La Naturaliste</b><small>${wdLevel}</small></div></div>
      <p class="lead" style="text-align:center">Mélange des decks… distribution de ${HAND} cartes…</p><p class="lead" style="text-align:center">${G.first===ME?'Vous commencez.':'La Naturaliste commence.'}</p>`;return;
  }
  if(WDV.screen==='tuto'){
    const T=[['Votre carte active','Vous ne pouvez avoir qu\'un seul animal actif à la fois. Il affronte directement celui de l\'adversaire.'],
      ['L\'énergie','Chaque carte coûte de l\'énergie. Vous en avez 1 au premier tour, puis 1 de plus à chaque tour.'],
      ['Le duel','Choisissez Puissance, Vitesse ou Intelligence pour défier l\'animal adverse. Plus l\'écart est grand, plus il perd de PV.'],
      ['Le but','Réduisez les PV adverses de 20 à 0. Attention : la stat utilisée se fatigue un tour.']];
    const t=T[WDV.tuto];
    m.innerHTML=`<div class="wd-tuto"><small>Tutoriel ${WDV.tuto+1}/4</small><h2>${t[0]}</h2><p>${t[1]}</p><div class="row"><button class="btn" id="tn">${WDV.tuto<3?'Suivant':'C\'est parti'}</button><button class="btn ghost" id="ts">Passer</button></div></div>`;
    $('tn').addEventListener('click',()=>{if(WDV.tuto<3){WDV.tuto++;rDuel()}else{sv('wdtuto',1);WDV.screen='mull';rDuel()}});
    $('ts').addEventListener('click',()=>{sv('wdtuto',1);WDV.screen='mull';rDuel()});return;
  }
  if(WDV.screen==='mull'){
    m.innerHTML=`<h2>Votre main de départ</h2><p class="lead">Touchez jusqu'à 3 cartes à remplacer, puis « Remplacer ». Ou gardez votre main.</p>
      <div class="grid dgrid">${me.hand.map(c=>`<button data-u="${c.uid}" class="${WDV.mull.includes(c.uid)?'pick':''}">${card(BY[c.id],true)}${WDV.mull.includes(c.uid)?'<span class="cnt">↺</span>':''}</button>`).join('')}</div>
      <div class="row" style="margin-top:14px"><button class="btn" id="mk">${WDV.mull.length?'Remplacer '+WDV.mull.length+' carte'+(WDV.mull.length>1?'s':''):'Garder ma main'}</button></div>`;
    m.querySelectorAll('[data-u]').forEach(b=>b.addEventListener('click',()=>{const u=b.dataset.u,k=WDV.mull.indexOf(u);if(k>=0)WDV.mull.splice(k,1);else if(WDV.mull.length<3)WDV.mull.push(u);rDuel()}));
    $('mk').addEventListener('click',()=>{WD.mulligan(G,ME,WDV.mull);WDV.screen='play';WDV.top=1;WDV.banner=G.active===ME?'À vous':'Tour de la Naturaliste';
      if(G.active===AI){rDuel();setTimeout(()=>{const b=G.events.length;WD.aiTurn(G,AI,wdLevel);WDV.banner='À vous';wdStartTimer();wdAfter();setTimeout(()=>{WDV.banner=null;const x=$('wdBanner');if(x)x.remove()},900)},1200)}
      else{wdStartTimer();rDuel();setTimeout(()=>{WDV.banner=null;const x=$('wdBanner');if(x)x.remove()},900)}});
    return;
  }
  if(WDV.screen==='over'){
    const r=DU.res,P=G.players[ME],mv=Object.entries(G.players[r>=0?ME:AI].mvp).sort((a,b)=>b[1]-a[1])[0],win=G.players[G.winner>=0?G.winner:ME].activeCard;
    m.innerHTML=`<div class="end"><div class="big${r<0?' ko':''}">${r>0?'Victoire':r<0?'Défaite':'Match nul'}</div>
      ${win?`<div class="wd-wincard">${card(BY[win.id])}</div>`:''}
      <div class="wd-res"><span>Tours<b>${G.turn}</b></span><span>Dégâts infligés<b>${P.dealt}</b></span><span>Dégâts reçus<b>${P.taken}</b></span><span>Carte MVP<b>${mv?esc(mv[0]):'—'}</b></span></div>
      <p class="lead">+${DU.gain} points pour la Salle des ventes.</p>
      <div class="row"><button class="btn" id="again">Revanche</button><button class="btn ghost" id="back">Retour au menu</button></div></div>`;
    $('again').addEventListener('click',()=>wdNew());$('back').addEventListener('click',()=>{DU=null;WDV.screen='menu';rDuel()});return;
  }
  /* ---------- plateau : carte adverse en haut, carte du joueur en bas ---------- */
  const myTurn=v.myTurn&&G.phase==='PLAY',sel=WDV.sel&&me.hand.find(c=>c.uid===WDV.sel);
  const F=WDV.flash,canStat=myTurn&&me.activeCard&&!me.attackedThisTurn;
  const val=(P,s)=>P.activeCard?P.activeCard.stats[s]+((P===me&&me.temp[s])||0):'–';
  m.innerHTML=`<div class="wd">
    ${WDV.banner?`<div class="wd-banner" id="wdBanner">${WDV.banner}</div>`:''}
    <div class="wd-bar op"><img class="wd-ava" src="art/naturaliste.webp" alt=""><b>Naturaliste</b>${hpBar(op)}<span class="wd-backs">${'<i></i>'.repeat(Math.min(8,op.handCount))}</span><small>Deck ${op.deckCount}</small></div>
    ${WDV.emote&&WDV.emote.who===AI?`<div class="wd-emo op">${esc(WDV.emote.t)}</div>`:''}
    <div class="wd-field">
      <div class="wd-slot">${wdMini(op.activeCard,F&&F.who===ME?'hit':'')}</div>
      <div class="wd-mid"><span class="wd-turn">${myTurn?'Votre tour':'Tour adverse'} · tour ${G.turn}</span>
        ${F?`<span class="wd-clash">${F.stat?WD.STAT_FR[F.stat]+' : ':''}${F.who===ME?F.a:F.b} ${F.b==null?'· attaque directe':((F.who===ME?F.a:F.b)>(F.who===ME?F.b:F.a)?'>':(F.who===ME?F.a:F.b)<(F.who===ME?F.b:F.a)?'<':'=')+' '+(F.who===ME?F.b:F.a)}${F.dmg.map(d=>` <em class="${d.p===ME?'me':'op'}">${d.p===ME?'vous':'adv.'} −${d.v}</em>`).join('')}</span>`:'<i class="wd-vsx">VS</i>'}
        ${myTurn?`<span class="wd-time" id="wdTime">00:${String(Math.max(0,WDV.timer)).padStart(2,'0')}</span>`:''}</div>
      <div class="wd-slot">${wdMini(me.activeCard,(F&&F.who===AI?'hit ':'')+(WDV.entered===(me.activeCard&&me.activeCard.uid)?'enter':''))}</div>
    </div>
    ${WDV.emote&&WDV.emote.who===ME?`<div class="wd-emo me">${esc(WDV.emote.t)}</div>`:''}
    <div class="wd-stats">${STK.map(([k,n,ab])=>{const lock=me.lockedStat===k,dis=!canStat||lock;return `<button data-st="${k}"${dis?' disabled':''} class="${lock?'lock':''}"><b>${val(me,k)}</b><span>${n}${lock?' ⏳':''}</span><small>adv. ${val(op,k)}</small></button>`}).join('')}</div>
    <div class="wd-bar me">${hpBar(me)}<span class="wd-en">⚡ ${me.energy}/${me.maxEnergy}<i>${Array.from({length:10},(_,i)=>`<u class="${i<me.energy?'on':i<me.maxEnergy?'used':''}"></u>`).join('')}</i></span><small>Défausse ${me.discardCount} · Deck ${me.deckCount}</small></div>
    <div class="wd-hand">${me.hand.map(c=>{const ok=c.cost<=me.energy;return `<button data-h="${c.uid}" class="${WDV.sel===c.uid?'sel':''}${ok?'':' off'}">${card(BY[c.id],true)}</button>`}).join('')||'<p class="lead">Main vide.</p>'}</div>
    <div class="wd-acts">
      ${sel?`<button class="btn" id="playB"${myTurn&&sel.cost<=me.energy&&(!me.activeCard||!me.replacementUsedThisTurn)?'':' disabled'}>${me.activeCard?'Remplacer':'Jouer'} ${esc(sel.name)} (⚡${sel.cost})</button><button class="btn ghost" id="zoom">Voir</button>`:''}
      <button class="btn${myTurn&&!sel?'':' ghost'}" id="endB"${myTurn?'':' disabled'}>Terminer le tour</button>
    </div>
    ${me.peek?`<p class="lead" style="text-align:center">Vision : votre prochaine carte est ${esc(me.peek.name)}.</p>`:''}
    <div class="wd-foot">${WDV.emos?`<span class="wd-emos">${['Bonjour !','Bien joué !','Impressionnant !','Bonne chance !'].map(t=>`<button data-em="${t}">${t}</button>`).join('')}</span>`:''}
      <button class="btn ghost" id="emoB">💬</button><button class="btn ghost" id="logB">${WDV.log?'Masquer':'Journal'}</button><button class="btn ghost" id="sndB">${soundOn?'🔊':'🔇'}</button><button class="btn ghost" id="quit">Abandonner</button></div>
    ${WDV.log?`<div class="wd-log">${v.log.slice().reverse().map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:''}
  </div>`;
  WDV.entered=null;if(WDV.top){m.scrollTop=0;WDV.top=0}
  m.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{WDV.sel=WDV.sel===b.dataset.h?null:b.dataset.h;rDuel()}));
  m.querySelectorAll('[data-z]').forEach(b=>b.addEventListener('click',()=>{const ci=[me.activeCard,op.activeCard].find(x=>x&&x.uid===b.dataset.z);if(ci)show(BY[ci.id])}));
  if($('zoom'))$('zoom').addEventListener('click',()=>show(BY[sel.id]));
  if($('playB'))$('playB').addEventListener('click',()=>{const r=WD.playCard(G,ME,WDV.sel);if(!r.ok){toast(r.error);return}WDV.entered=r.card.uid;WDV.sel=null;WDV.flash=null;sfx('play');buzz(25);wdAfter()});
  m.querySelectorAll('[data-st]').forEach(b=>b.addEventListener('click',()=>{const before=G.events.length,r=WD.attack(G,ME,b.dataset.st);if(!r.ok){toast(r.error);return}
    const cb=G.events.slice(before).find(e=>e.type==='COMBAT_RESOLVED');WDV.flash={who:ME,a:cb.a,b:cb.b,stat:cb.stat,dmg:G.events.slice(before).filter(e=>e.type==='DAMAGE_DEALT').map(e=>({p:e.player,v:e.value}))};
    sfx(WDV.flash.dmg.some(d=>d.p===AI)?'win':'hit');buzz(40);wdAfter()}));
  $('endB').addEventListener('click',wdEnd);
  m.querySelectorAll('[data-em]').forEach(b=>b.addEventListener('click',()=>{if(Date.now()-WDV.emoteAt<5000){toast('Attendez un peu avant un autre message');return}wdEmote(ME,b.dataset.em);
    if(Math.random()<.5)setTimeout(()=>wdEmote(AI,b.dataset.em==='Bonjour !'?'Bonjour !':['Merci !','Bonne chance !','Impressionnant !'][Math.random()*3|0]),1400)}));
  $('logB').addEventListener('click',()=>{WDV.log=!WDV.log;rDuel()});
  $('emoB').addEventListener('click',()=>{WDV.emos=!WDV.emos;rDuel()});
  $('sndB').addEventListener('click',()=>{soundOn=!soundOn;rDuel()});
  $('quit').addEventListener('click',()=>{if($('quit').dataset.ok){WD.surrender(G,ME);wdAfter()}else{$('quit').dataset.ok=1;$('quit').textContent='Vraiment abandonner ?'}});
}
function rTeam(){
  const m=$('main'),own=owned().slice().sort((a,b)=>a.k-b.k||sum3(b)-sum3(a));
  const cnt={};team.forEach(id=>cnt[id]=(cnt[id]||0)+1);const cs=team.filter(id=>BY[id]).map(id=>BY[id]);
  m.innerHTML=`<h2>Mon deck</h2><p class="lead"><b>${team.length} / ${DECK_N}</b> cartes · coût moyen ${avgCost(cs)}. Touchez une carte pour en mettre 1, 2 ou 0. Il manque des cartes ? La Naturaliste prête des cartes simples.</p>
    ${curve(cs)}
    <div class="row"><button class="btn" id="ok">Valider le deck</button><button class="btn ghost" id="auto">Deck automatique</button><button class="btn ghost" id="clr">Vider</button></div>
    <div class="tools" style="margin-top:12px"><input class="search" id="q" type="search" placeholder="Rechercher un animal" autocomplete="off"></div>
    <div class="grid">${own.map(c=>`<button data-id="${c.id}" data-n="${esc(norm(c.n))}"${cnt[c.id]?' class="pick"':''}>${card(c,true)}${cnt[c.id]?`<span class="cnt">×${cnt[c.id]}</span>`:''}</button>`).join('')}</div>
    ${own.length?'':'<p class="lead">Votre album est vide : ouvrez des sachets.</p>'}`;
  $('ok').addEventListener('click',()=>{teamEdit=false;sv('deck30',team);rDuel()});
  $('auto').addEventListener('click',()=>{autoTeam();rTeam()});
  $('clr').addEventListener('click',()=>{team=[];sv('deck30',team);rTeam()});
  m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id,n=cnt[id]||0,max=Math.min(2,col[id]||0);
    if(n<max&&team.length<DECK_N)team.push(id);else if(n>0)team=team.filter(x=>x!==id);else{toast(DECK_N+' cartes au plus');return}
    const y=m.scrollTop;sv('deck30',team);rTeam();m.scrollTop=y}));
  bindSearch(m,()=>{});
}
if(!team.length&&owned().length)autoTeam();

/* ================= actions sur une carte (fiche en grand), comme dans ClubDeck ================= */
const defVal=c=>r5(cote(c)/10);
function viewActs(c){
  const box=$('viewAct'),n=col[c.id]||0;
  if(!n||tab==='demo'||!ST.hidden){box.innerHTML='';return}
  box.innerHTML=`<div class="vact"><span>${n} exemplaire${n>1?'s':''} · cote ${fr(cote(c))} </span>
    <div class="row"><button class="btn" data-v="sell">Vendre</button><button class="btn ghost" data-v="del">Défausser : +${defVal(c)} points</button></div></div>`;
  box.querySelectorAll('[data-v]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();
    if(b.dataset.v==='sell'){$('view').hidden=true;sellSel=c.id;mkTab='sell';tab='marche';render();return}
    if(n===1&&!b.dataset.ok){b.dataset.ok=1;b.textContent='Dernier exemplaire : touchez encore';return}
    takeOne(c.id);setPts(pts+defVal(c));toast(c.n+' défaussé : +'+defVal(c)+' points');
    if(col[c.id])viewActs(c);else $('view').hidden=true;render()}));
}

/* ================= Marché (repris de ClubDeck) ================= */
const SELLERS=['Mowgli_75','LaBuse','Kiki_Koala','Renardo','Capitaine_Croc','Lynx_B','Mika_92','Bxl_Safari','Nono','Zebrinette','Le_Gorille','Tika-Toucan'];
const DUR=[[60,'1 h'],[480,'8 h'],[1440,'24 h']];
const BASE={bronze:40,argent:90,or:200,noire:450,legende:1000};
const r5=v=>Math.max(5,Math.round(v/5)*5);
const cote=c=>r5(BASE[c.r]*(0.85+fOf(c)*0.03));
let mk=ld('mk',{bots:[],mine:[]}),mkTab='buy',mkF={p:'',q:''},sellSel=null;
if(!mk||!Array.isArray(mk.bots)||!Array.isArray(mk.mine))mk={bots:[],mine:[]};
const step=b=>Math.max(5,Math.round(b*.1/5)*5);
function genBot(){
  const odds={bronze:30,argent:30,or:24,noire:12,legende:4};let r=Math.random()*100,t;for(t in odds){r-=odds[t];if(r<=0)break}
  const pool=CARDS.filter(c=>c.r===t),c=pool[Math.random()*pool.length|0],d=DUR[Math.random()*DUR.length|0][0],now=Date.now(),price=r5(cote(c)*(.9+Math.random()*.5));
  return{id:now+'-'+Math.random().toString(36).slice(2,7),c:c.id,price,bid:Math.min(price-5,r5(price*(.35+Math.random()*.35))),me:false,
    end:now+Math.max(60000,Math.random()*d*60000),seller:SELLERS[Math.random()*SELLERS.length|0]};
}
function mkSync(){
  const now=Date.now();let ch=false;
  mk.bots=mk.bots.filter(l=>{
    const c=BY[l.c];if(!c)return false;
    if(l.end<=now){if(l.me){giveOne(l.c);track('bought');toast('Enchère remportée : '+c.n)}ch=true;return false}
    if(l.me&&Math.random()<(l.bid<cote(c)*.7?.1:.03)){setPts(pts+l.bid);l.bid=Math.min(l.price-5,l.bid+step(l.bid));l.me=false;ch=true;toast('Surenchère sur '+c.n+' : mise remboursée')}
    return true});
  while(mk.bots.length<20){mk.bots.push(genBot());ch=true}
  mk.mine=mk.mine.filter(l=>{
    if(l.soldAt&&l.soldAt<=now){setPts(pts+l.sp);track('sold');toast(BY[l.c].n+' vendu : +'+l.sp+' points');ch=true;return false}
    if(l.end<=now){giveOne(l.c);toast(BY[l.c].n+' invendu, retour dans l\'album');ch=true;return false}
    return true});
  if(ch)sv('mk',mk);return ch;
}
function leftTxt(end){const t=Math.max(0,Math.round((end-Date.now())/1000)),h=t/3600|0,m=(t%3600)/60|0,sec=t%60;return h?h+' h '+String(m).padStart(2,'0'):m?m+' min '+String(sec).padStart(2,'0'):sec+' s'}
const cdSpan=end=>`<span class="cd${end-Date.now()<300000?' hot':''}" data-end="${end}">${leftTxt(end)}</span>`;
function lsRow(l,mine){
  const c=BY[l.c],nb=l.bid+step(l.bid);
  return `<div class="ls" data-l="${l.id}"><button class="lsc" data-v="${c.id}">${card(c,true)}</button>
    <div class="inf"><b>${esc(c.n)}</b><span>${esc(c.p)} · ${mine?'votre annonce':esc(l.seller)}</span><span>Cote ${fr(cote(c))}</span>
      <span>${mine?'Départ':'Enchère'} <b>${fr(mine?l.start:l.bid)}</b> · Achat <b>${fr(l.price)}</b> · ⏱ ${cdSpan(l.end)}</span></div>
    <div class="acts">${mine?'<button class="buy" data-a="cancel">Retirer</button>'
      :`<button class="buy" data-a="bid"${l.me||nb>=l.price?' disabled':''}>${l.me?'Vous êtes en tête':nb>=l.price?'Enchère max':'Enchérir '+fr(nb)}</button><button class="buy" data-a="buy">Acheter ${fr(l.price)}</button>`}</div></div>`;
}
/* défis du jour, les mêmes pour tout le monde (tirage fixé par la date) */
function rng(seed){let s=seed%2147483647;if(s<=0)s+=2147483646;return()=>(s=s*16807%2147483647)/2147483647}
let defis=ld('defis',{d:0,done:[]});
function defisToday(){
  const d=today();if(defis.d!==d){defis={d,done:[]};sv('defis',defis)}
  const R=rng(d),packs=Object.keys(PACK),fam=packs[R()*packs.length|0];
  return[
    {id:'fam',titre:`5 cartes de la famille ${fam}`,detail:`Rendez 5 cartes ${fam} (doublons d'abord).`,n:5,f:c=>c.p===fam,gain:{txt:`1 carte ${fam} rare`,card:()=>{const p=CARDS.filter(c=>c.p===fam&&RAR[c.r].o>=3);const nw=p.filter(c=>!col[c.id]);const L=nw.length?nw:p;return L[Math.random()*L.length|0]}}},
    {id:'dbl',titre:'6 doublons',detail:'Rendez 6 cartes en double (jamais votre dernier exemplaire).',n:6,dupOnly:true,f:()=>true,gain:{txt:'300 points',pts:300}},
    {id:'big',titre:'10 cartes au choix',detail:'Rendez 10 cartes : doublons d\'abord, puis les plus faibles.',n:10,f:()=>true,gain:{txt:'1 carte très rare',card:()=>{const p=CARDS.filter(c=>RAR[c.r].o>=4);const nw=p.filter(c=>!col[c.id]);const L=nw.length?nw:p;return L[Math.random()*L.length|0]}}}
  ];
}
function defiPick(d){
  /* doublons d'abord, puis les plus faibles ; jamais une carte de l'équipe de duel en dernier exemplaire */
  const list=[];const left=Object.assign({},col);
  const cands=CARDS.filter(c=>left[c.id]&&d.f(c)).sort((a,b)=>fOf(a)-fOf(b));
  for(const c of cands){while(left[c.id]>1&&list.length<d.n){left[c.id]--;list.push({c,dup:true})}}
  if(!d.dupOnly)for(const c of cands){if(list.length>=d.n)break;if(left[c.id]===1&&!team.includes(c.id)){left[c.id]--;list.push({c,dup:false})}}
  return{have:list.length,list:list.length>=d.n?list:null};
}
function rMarche(){
  mkSync();const m=$('main');
  const tabs=[['buy','Enchères'],['mine','Mes enchères'],['noir','Marché noir'],['sell','Vendre'],['defis','Défis']];
  if(mkTab==='noir')return rNoir(m,tabs);
  let h=`<h2>Salle des ventes</h2><p class="lead">Vous avez <b>${fr(pts)}</b> points. On en gagne en duel, en vendant des cartes et avec les défis.</p>
    <div class="packs">${tabs.map(t=>`<button class="chip" data-m="${t[0]}" aria-pressed="${mkTab===t[0]}">${t[1]}</button>`).join('')}</div>`;
  if(mkTab==='buy'||mkTab==='mine'){
    const all=mkTab==='mine'?mk.bots.filter(l=>l.me).map(l=>[l,false]).concat(mk.mine.map(l=>[l,true])):mk.bots.map(l=>[l,false]);
    const rows=all.filter(x=>{const c=BY[x[0].c];return(!mkF.p||c.p===mkF.p)&&(!mkF.q||norm(c.n).includes(norm(mkF.q)))}).sort((a,b)=>a[0].end-b[0].end);
    h+=`<div class="tools"><select class="search" id="mkp" aria-label="Famille"><option value="">Toutes les familles</option>${Object.keys(PACK).map(p=>`<option${mkF.p===p?' selected':''}>${p}</option>`).join('')}</select></div>
      <div id="lst">${rows.length?rows.map(x=>lsRow(x[0],x[1])).join(''):(mkTab==='mine'?'<p class="lead">Vous n\'êtes en tête d\'aucune enchère et vous n\'avez rien en vente.</p>':'<p class="lead">Aucune annonce ne correspond.</p>')}</div>`;
    m.innerHTML=h;
    $('mkp').addEventListener('change',e=>{mkF.p=e.target.value;rMarche()});
    m.querySelectorAll('.ls').forEach(r=>{const id=r.dataset.l,l=mk.bots.find(x=>x.id===id)||mk.mine.find(x=>x.id===id);
      r.querySelector('.lsc').addEventListener('click',()=>show(BY[l.c]));
      r.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>{const c=BY[l.c],a=b.dataset.a;
        if(a==='cancel'){mk.mine=mk.mine.filter(x=>x.id!==id);giveOne(l.c);toast(c.n+' retiré de la vente')}
        if(a==='bid'){const nb=l.bid+step(l.bid);if(pts<nb)return toast('Pas assez de points');setPts(pts-nb);l.bid=nb;l.me=true;toast('Vous êtes en tête sur '+c.n)}
        if(a==='buy'){const due=l.price-(l.me?l.bid:0);if(pts<due)return toast('Pas assez de points');setPts(pts-due);giveOne(l.c);track('bought');mk.bots=mk.bots.filter(x=>x.id!==id);toast(c.n+' rejoint votre album');buzz(40)}
        sv('mk',mk);rMarche()}))});
  }else if(mkTab==='sell'){
    const own=owned().slice().sort((a,b)=>(col[b.id]-col[a.id])||fOf(b)-fOf(a));
    if(sellSel&&!col[sellSel])sellSel=null;
    const c=sellSel&&BY[sellSel],co=c?cote(c):0;
    h+=`<p class="lead">Touchez une de vos cartes pour la mettre en vente. Places : ${mk.mine.length}/5.</p>`;
    if(c){h+=`<div class="sellbox"><div class="sbc">${card(c,true)}</div><div><b>${esc(c.n)}</b><p class="lead" style="margin:2px 0 8px">Cote ${fr(co)} · vous en avez ${col[c.id]}</p>
      <div class="sbr"><span>Départ</span>${[.6,.8,1].map(f=>`<button class="chip" data-s="${r5(co*f)}">${fr(r5(co*f))}</button>`).join('')}</div>
      <div class="sbr"><span>Achat</span>${[1,1.3,1.6].map(f=>`<button class="chip" data-b="${r5(co*f)}">${fr(r5(co*f))}</button>`).join('')}</div>
      <div class="sbr"><span>Durée</span>${DUR.map(d=>`<button class="chip" data-d="${d[0]}">${d[1]}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-start;margin-top:8px"><button class="btn" id="put">Mettre en vente</button><button class="btn ghost" id="rec">Défausser : +${r5(co/10)} points</button></div></div></div>`}
    h+=`<div class="grid">${own.map(o=>`<button data-id="${o.id}"${o.id===sellSel?' class="pick"':''}>${card(o,true)}${col[o.id]>1?`<span class="cnt">×${col[o.id]}</span>`:''}</button>`).join('')}</div>
      ${own.length?'':'<p class="lead">Votre album est vide.</p>'}`;
    m.innerHTML=h;
    m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>{sellSel=b.dataset.id;rMarche();$('main').scrollTop=0}));
    if(c){const o={s:r5(co*.8),b:r5(co*1.3),d:480};
      const mark=()=>m.querySelectorAll('.sbr .chip').forEach(x=>x.setAttribute('aria-pressed',(+x.dataset.s===o.s&&x.dataset.s)||(+x.dataset.b===o.b&&x.dataset.b)||(+x.dataset.d===o.d&&x.dataset.d)?'true':'false'));mark();
      m.querySelectorAll('.sbr .chip').forEach(x=>x.addEventListener('click',()=>{if(x.dataset.s)o.s=+x.dataset.s;if(x.dataset.b)o.b=+x.dataset.b;if(x.dataset.d)o.d=+x.dataset.d;if(o.b<=o.s)o.b=r5(o.s*1.2);mark()}));
      $('put').addEventListener('click',()=>{if(mk.mine.length>=5)return toast('5 annonces au plus');if(!takeOne(c.id))return;
        /* un acheteur se présente si le prix est raisonnable */
        const now=Date.now(),end=now+o.d*60000,l={id:now+'-m',c:c.id,start:o.s,price:o.b,end};
        if(o.b<=co*1.35&&Math.random()<.85){l.soldAt=now+Math.random()*o.d*60000*.7;l.sp=o.b}
        else if(o.s<=co&&Math.random()<.7){l.soldAt=end-1000;l.sp=r5(o.s+(co-o.s)*Math.random())}
        mk.mine.push(l);sv('mk',mk);sellSel=null;toast(c.n+' est en vente');rMarche()});
      $('rec').addEventListener('click',()=>{if(!takeOne(c.id))return;setPts(pts+r5(co/10));toast('Défaussé : +'+r5(co/10)+' points');if(!col[c.id])sellSel=null;rMarche()});}
  }else{
    const ds=defisToday();
    h+=`<p class="lead">Trois défis par jour, les mêmes pour tout le monde. Rendez les cartes demandées pour gagner la récompense. Les doublons partent en premier.</p><div id="trs">${ds.map(d=>{
      const done=defis.done.includes(d.id),pk=defiPick(d),st=done?'Fait aujourd\'hui':pk.list?'Prêt':pk.have+'/'+d.n+' cartes';
      return `<div class="tr" data-d="${d.id}"><div>${esc(d.titre)}<small>${esc(d.detail)}<br>Récompense : <b>${esc(d.gain.txt)}</b> · ${st}</small><small class="dl" hidden></small></div>
        <button class="buy"${done||!pk.list?' disabled':''}>${done?'Fait':'Voir'}</button></div>`}).join('')}</div>`;
    m.innerHTML=h;
    m.querySelectorAll('.tr').forEach(r=>{const d=ds.find(x=>x.id===r.dataset.d),b=r.querySelector('button');
      b.addEventListener('click',()=>{const dl=r.querySelector('.dl'),pk=defiPick(d);if(!pk.list)return;
        if(dl.hidden){dl.hidden=false;dl.textContent='Cartes rendues : '+pk.list.map(x=>x.c.n+(x.dup?'':' (dernière)')).join(', ');b.textContent='Valider';return}
        pk.list.forEach(x=>takeOne(x.c.id));defis.done.push(d.id);track('defis');sv('defis',defis);
        if(d.gain.pts){setPts(pts+d.gain.pts);toast('Défi réussi : +'+d.gain.pts+' points')}
        else{const c=d.gain.card();giveOne(c.id);show(c);toast('Défi réussi : '+c.n)}
        buzz(40);rMarche()})});
  }
  m.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>{mkTab=b.dataset.m;rMarche()}));
}
setInterval(()=>{const ch=mkSync(),a=document.activeElement;if(ch&&tab==='marche'&&$('view').hidden&&!(a&&a.tagName==='SELECT'))rMarche()},15000);

/* ================= sachets spéciaux (gagnés au marché noir et avec les classeurs) ================= */
const SPEC={
  rare:{n:'Sachet rare',d:'5 cartes, dont 1 très rare garantie',draw:()=>[1,1,2,3,4].map(o=>drawCard(o))},
  legende:{n:'Sachet Légende',d:'5 cartes, dont 1 Légende garantie',draw:()=>{const L=CARDS.filter(c=>c.r==='legende');return[1,2,3,4].map(o=>drawCard(o)).concat([L[Math.random()*L.length|0]])}},
  disparus:{n:'Sachet des Disparus',d:'5 animaux Disparus ou de la Préhistoire',draw:()=>{const L=CARDS.filter(c=>c.p==='Disparus'||c.p==='Préhistoire');return[0,1,2,3,4].map(()=>L[Math.random()*L.length|0])}}
};
let spec=ld('spec',[]);if(!Array.isArray(spec))spec=[];
function giveSpec(k){spec.push(k);sv('spec',spec)}
function rSpec(){
  const box=$('spec');if(!box)return;
  if(!spec.length){box.innerHTML='';return}
  box.innerHTML=`<h3 class="h3" style="text-align:center">Sachets spéciaux</h3><div class="specs">${spec.map((k,i)=>`<button class="spk spk-${k}" data-i="${i}"><b>${SPEC[k].n}</b><small>${SPEC[k].d}</small><span>Ouvrir</span></button>`).join('')}</div>`;
  box.querySelectorAll('[data-i]').forEach(b=>b.addEventListener('click',()=>{const k=spec.splice(+b.dataset.i,1)[0];sv('spec',spec);
    track('packs');const got=shuffle(SPEC[k].draw());addHist(got);const P=got.map(c=>{const isNew=!col[c.id];col[c.id]=(col[c.id]||0)+1;return{c,isNew}});sv('col',col);TEST=false;openStage(P)}));
}

/* ================= marché noir : chaque soir, des sachets rares aux enchères (idée de Ciné TCG) ================= */
const NOIR_H=18;
function noirState(){
  const d=today(),now=new Date(),open=new Date(now.getFullYear(),now.getMonth(),now.getDate(),NOIR_H).getTime(),end=new Date(now.getFullYear(),now.getMonth(),now.getDate(),23,59,59).getTime();
  if(!mk.noir||mk.noir.d!==d){
    const R=rng(d*7+3);
    mk.noir={d,lots:['rare','legende','disparus'].map((k,i)=>({k,bid:r5([300,900,400][i]*(.8+R()*.4)),me:false,paid:0,who:SELLERS[R()*SELLERS.length|0]}))};sv('mk',mk);
  }
  return{open,end,isOpen:Date.now()>=open&&Date.now()<end};
}
function noirSync(){
  if(!mk.noir)return false;const st=noirState();let ch=false;
  mk.noir.lots.forEach(l=>{
    if(l.done)return;
    if(Date.now()>=st.end){l.done=1;ch=true;if(l.me){giveSpec(l.k);toast('Marché noir : vous remportez le '+SPEC[l.k].n)}return}
    if(st.isOpen&&Math.random()<(l.me?.12:.05)){if(l.me){setPts(pts+l.paid);l.paid=0;l.me=false;toast('Marché noir : surenchère sur le '+SPEC[l.k].n+', mise remboursée')}
      l.bid+=step(l.bid);l.who=SELLERS[Math.random()*SELLERS.length|0];ch=true}
  });
  if(ch)sv('mk',mk);return ch;
}
function rNoir(m,tabs){
  const st=noirState();noirSync();
  m.innerHTML=`<h2>Marché noir</h2><p class="lead">Chaque soir de ${NOIR_H} h à minuit, trois sachets rares sont mis aux enchères. Le plus offrant à minuit l'emporte. Vous avez <b>${fr(pts)}</b> points.</p>
    <div class="packs">${tabs.map(t=>`<button class="chip" data-m="${t[0]}" aria-pressed="${mkTab===t[0]}">${t[1]}</button>`).join('')}</div>
    <div class="noirst">${st.isOpen?`Ouvert · fermeture dans ⏱ ${cdSpan(st.end)}`:Date.now()<st.open?`Fermé · ouverture dans ⏱ ${cdSpan(st.open)}`:'Fermé pour ce soir'}</div>
    <div class="noirs">${mk.noir.lots.map((l,i)=>{const nb=l.bid+step(l.bid);return `<div class="noir spk-${l.k}"><b>${SPEC[l.k].n}</b><small>${SPEC[l.k].d}</small>
      <span>Enchère <b>${fr(l.bid)}</b> · ${l.done?(l.me?'gagnée':'terminée'):l.me?'vous êtes en tête':'par '+esc(l.who)}</span>
      <button class="buy" data-n="${i}"${!st.isOpen||l.me||l.done?' disabled':''}>${l.me?'En tête':'Enchérir '+fr(nb)}</button></div>`}).join('')}</div>`;
  m.querySelectorAll('[data-n]').forEach(b=>b.addEventListener('click',()=>{const l=mk.noir.lots[+b.dataset.n],nb=l.bid+step(l.bid);
    if(pts<nb)return toast('Pas assez de points');setPts(pts-nb);l.bid=nb;l.paid=nb;l.me=true;l.who='vous';sv('mk',mk);toast('Vous êtes en tête : '+SPEC[l.k].n);rMarche()}));
  m.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>{mkTab=b.dataset.m;rMarche()}));
}
/* chaque seconde : comptes à rebours en direct ; toutes les 15 s, le marché bouge */
setInterval(()=>{document.querySelectorAll('.cd[data-end]').forEach(e=>{const end=+e.dataset.end;e.textContent=leftTxt(end);e.classList.toggle('hot',end-Date.now()<300000)})},1000);
setInterval(()=>{if(noirSync()&&tab==='marche'&&mkTab==='noir'&&$('view').hidden)rMarche()},15000);

/* ================= classeurs (un par famille, avec récompenses) ================= */
let rew=ld('rew',{});if(!rew||typeof rew!=='object')rew={};
function rBinders(m){
  m.innerHTML=`<h2>Classeurs</h2><p class="lead">Un classeur par famille. À moitié rempli : 100 points. Complet : 500 points et un Sachet rare.</p>
    <div class="seg">${[['all','Toutes'],['own','Mes cartes'],['dup','Doublons'],['bind','Classeurs']].map(x=>`<button data-f="${x[0]}" aria-pressed="${albF===x[0]}">${x[1]}</button>`).join('')}</div>
    <div class="binders">${Object.keys(PACK).map(p=>{const L=CARDS.filter(c=>c.p===p),h=L.filter(c=>col[c.id]),pc=Math.round(h.length/L.length*100),cov=(h.slice().sort((a,b)=>fOf(b)-fOf(a))[0]||null);
      const k50=p+':50',k100=p+':100',can50=pc>=50&&!rew[k50],can100=pc>=100&&!rew[k100];
      return `<div class="binder" style="--pc:${PACK[p]}"><button class="bcov" data-b="${esc(p)}">${cov?`<img src="${cov.art}" alt="" loading="lazy">`:''}<span>${esc(p)}</span></button>
        <div class="binf"><b>${h.length}/${L.length}</b><div class="prog"><i style="width:${pc}%"></i></div>
        ${can50?`<button class="buy" data-r="${esc(k50)}">Récompense : 100 points</button>`:can100?`<button class="buy" data-r="${esc(k100)}">Récompense : 500 points + Sachet rare</button>`:`<small>${rew[k100]?'Complet ✓':rew[k50]?'Moitié ✓ · complet : 500 points':'Moitié : 100 points'}</small>`}</div></div>`}).join('')}</div>`;
  m.querySelectorAll('[data-f]').forEach(b=>b.addEventListener('click',()=>{albF=b.dataset.f;rAlbum()}));
  m.querySelectorAll('[data-b]').forEach(b=>b.addEventListener('click',()=>{alb=b.dataset.b;albF='all';rAlbum()}));
  m.querySelectorAll('[data-r]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.r;rew[k]=1;sv('rew',rew);
    if(k.endsWith(':100')){setPts(pts+500);giveSpec('rare');toast('Classeur complet : +500 points et un Sachet rare')}else{setPts(pts+100);toast('Classeur à moitié : +100 points')}rBinders(m)}));
}

/* ================= tirages façon WikiMasters : sachet par extension, historique, succès ================= */
window.packSel=(()=>{try{return localStorage.getItem('hp:packSel')||'Tous'}catch(e){return 'Tous'}})();
if(window.packSel!=='Tous'&&!PACK[window.packSel])window.packSel='Tous';
function drawFam(fam,minO){
  if(fam==='Tous')return drawCard(minO);
  const L=CARDS.filter(c=>c.p===fam);
  for(let t=0;t<60;t++){const r=pick();if(RAR[r].o<(minO||1))continue;const P=L.filter(c=>c.r===r);if(P.length)return P[Math.random()*P.length|0]}
  const P=L.filter(c=>RAR[c.r].o>=(minO||1));const Q=P.length?P:L;return Q[Math.random()*Q.length|0];
}
function packCover(fam){const L=fam==='Tous'?[BY.leopardneiges]:CARDS.filter(c=>c.p===fam).sort((a,b)=>fOf(b)-fOf(a));return(L[0]||BY.leopardneiges).art}
let hist=ld('hist',[]);if(!Array.isArray(hist))hist=[];
function addHist(got){got.forEach(c=>hist.unshift(c.id));hist=hist.slice(0,30);sv('hist',hist)}
function rHist(){const box=$('hist');if(!box||!hist.length)return;
  box.innerHTML=`<h3 class="h3">Derniers tirages</h3><div class="hist">${hist.filter(id=>BY[id]).map(id=>`<button data-id="${id}">${card(BY[id],true)}</button>`).join('')}</div>`;
  box.querySelectorAll('[data-id]').forEach(b=>b.addEventListener('click',()=>show(BY[b.dataset.id])))}
/* compteurs pour les succès */
let stats=ld('stats',{});if(!stats||typeof stats!=='object')stats={};
function track(k,n){stats[k]=(stats[k]||0)+(n||1);sv('stats',stats)}
let sucGot=ld('suc',{});if(!sucGot||typeof sucGot!=='object')sucGot={};
const famsFull=()=>Object.keys(PACK).filter(p=>CARDS.filter(c=>c.p===p).every(c=>col[c.id])).length;
const SUC=[
  ['packs1','🎴','Premier sachet','Ouvrir 1 sachet',()=>stats.packs||0,1,50],
  ['packs25','🎴','Explorateur','Ouvrir 25 sachets',()=>stats.packs||0,25,150],
  ['packs100','🎴','Grand explorateur','Ouvrir 100 sachets',()=>stats.packs||0,100,400],
  ['own50','📗','Naturaliste','Posséder 50 animaux',()=>owned().length,50,150],
  ['own100','📗','Savant','Posséder 100 animaux',()=>owned().length,100,400],
  ['ownAll','🌍','Arche complète','Posséder les '+CARDS.length+' animaux',()=>owned().length,CARDS.length,2000],
  ['fams','🧭','Tour du monde','Avoir au moins 1 animal de chaque famille',()=>Object.keys(PACK).filter(p=>CARDS.some(c=>c.p===p&&col[c.id])).length,Object.keys(PACK).length,200],
  ['bind1','📚','Classeur complet','Compléter un classeur',famsFull,1,300],
  ['win1','⚔️','Première victoire','Gagner 1 duel',()=>wins,1,50],
  ['win10','⚔️','Roi de la chaîne','Gagner 10 duels',()=>wins,10,300],
  ['sold1','🏛️','Premier vendeur','Vendre 1 carte au Marché',()=>stats.sold||0,1,50],
  ['bought1','🏛️','Premier achat','Acheter 1 carte au Marché',()=>stats.bought||0,1,50],
  ['defis3','🎯','Relever les défis','Réussir 3 défis du jour',()=>stats.defis||0,3,150]
];
function rSuc(){
  const box=$('sucIn'),n=SUC.filter(x=>sucGot[x[0]]).length;
  box.innerHTML=`<p class="lead">${n} succès sur ${SUC.length}. Touchez « Récupérer » pour gagner les points.</p><div class="sucl">${SUC.map(([id,ic,t,d,f,goal,g])=>{const v=Math.min(goal,f()),ok=v>=goal,got=sucGot[id];
    return `<div class="suci${ok?' ok':''}${got?' got':''}"><i>${ic}</i><div><b>${t}</b><small>${d} · ${v}/${goal}</small><div class="prog"><i style="width:${v/goal*100}%"></i></div></div>
      ${got?'<span>✓</span>':`<button class="buy" data-s="${id}"${ok?'':' disabled'}>+${g}</button>`}</div>`}).join('')}</div>`;
  box.querySelectorAll('[data-s]').forEach(b=>b.addEventListener('click',()=>{const x=SUC.find(y=>y[0]===b.dataset.s);sucGot[x[0]]=1;sv('suc',sucGot);setPts(pts+x[6]);toast('Succès « '+x[2]+' » : +'+x[6]+' points');buzz(40);rSuc()}));
}
function sucReady(){return SUC.filter(x=>!sucGot[x[0]]&&x[4]()>=x[5]).length}
function sucBadge(){const b=$('sucB');if(b){const n=sucReady();b.textContent=n?'🏆 '+n:'🏆';b.classList.toggle('on',!!n)}}
$('sucB').addEventListener('click',()=>{$('suc').hidden=false;rSuc()});
$('sucX').addEventListener('click',()=>{$('suc').hidden=true;sucBadge()});
setInterval(sucBadge,2000);sucBadge();
