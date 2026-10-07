/* Le Vivant : duel « Chaîne alimentaire » et Marché (repris de ClubDeck : enchères, achat immédiat, vente, défis du jour).
   Ce fichier se charge après le script principal et utilise ses outils : CARDS, BY, col, sv, ld, $, esc, card, show, toast, render, tab. */

/* ================= valeur d'un animal (sert à la cote du Marché) ================= */
const FORCE=(()=>{const sc=c=>c.s.reduce((a,b)=>a+b,0)+RAR[c.r].o*25,ord=CARDS.slice().sort((a,b)=>sc(a)-sc(b)),f={};
  ord.forEach((c,i)=>f[c.id]=1+Math.floor(i*10/ord.length));return f})();
const fOf=c=>FORCE[c.id];

/* ================= points ================= */
let pts=ld('pts',100);
function setPts(v){pts=Math.max(0,Math.round(v));sv('pts',pts);const e=$('ptsN');if(e)e.textContent=pts.toLocaleString('fr-FR')}
setPts(pts);
const fr=v=>v.toLocaleString('fr-FR');
function giveOne(id){col[id]=(col[id]||0)+1;sv('col',col)}
function takeOne(id){if(!col[id])return false;col[id]--;if(!col[id])delete col[id];sv('col',col);return true}

/* ================= duel façon Pokémon TCG Pocket (moteur dans combat.js) ================= */
const DAILY=5;
let team=ld('deck',[]),DU=null,teamEdit=false,DSEL=null;
const today=()=>{const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
let dw=ld('dw',{d:0,n:0});
const ownList=()=>owned().map(c=>({c,n:col[c.id]}));
function autoTeam(){team=autoDeck(ownList()).map(c=>c.id);sv('deck',team)}
function deckCards(){
  /* le deck sauvegardé, sans les cartes vendues ; complété par des prêts si l'album est petit */
  const cnt={},cs=[];team.forEach(id=>{if(BY[id]&&(cnt[id]||0)<Math.min(2,col[id]||0)){cnt[id]=(cnt[id]||0)+1;cs.push(BY[id])}});
  const loan=shuffle(CARDS.filter(c=>c.r==='bronze'||c.r==='argent')).slice(0,Math.max(0,DECK_N-cs.length));
  return{cs:cs.concat(loan),loans:loan.length};
}
function oppDeck(){const n=Math.max(30,owned().length);return autoDeck(shuffle(CARDS.slice()).slice(0,n).map(c=>({c,n:Math.random()<.4?2:1})))}
const typeChip=t=>`<span class="tchip" title="${TYPES[t].n}">${TYPES[t].e}</span>`;
function ficheHTML(c){const f=fiche(c),w=TYPES[f.type].weak;
  return `<div class="fiche"><div class="fh">${typeChip(f.type)}<b>${esc(c.n)}</b><span>PV <b>${f.hp}</b></span></div>
    <div class="fatk"><span class="cost">${'⚡'.repeat(f.cost)}</span><b>${esc(f.atk)}</b><span class="dmg">${f.dmg}</span></div>
    ${f.eff?`<p>${esc(f.eff.t)}</p>`:''}
    <div class="ff"><span>Faiblesse ${TYPES[w].e} +20</span><span>Retraite ${f.retreat?'⚡'.repeat(f.retreat):'gratuite'}</span>${f.pts>1?'<span>KO : 2 points</span>':''}</div></div>`}
function monHTML(m,cls,attr){
  const f=m.f,left=Math.max(0,f.hp-m.dmg),pc=left/f.hp*100;
  return `<button class="mon ${cls||''}" ${attr||''}>${pkCard(m.c,{left})}
    <span class="hpb"><i style="width:${pc}%;background:${pc>50?'#7fc79a':pc>25?'#e3b653':'#e0606e'}"></i></span>
    <span class="ens">${'<i></i>'.repeat(m.en)}${m.en<f.cost?'<i class="no"></i>'.repeat(f.cost-m.en):''}</span>
    ${m.poison?'<span class="psn">☠️</span>':''}</button>`}

/* ---------- carte de duel façon TCG : nom et PV en haut, illustration, attaque, faiblesse et retraite ---------- */
const TCOL={eau:'#3c8fd6',foret:'#4f9a4c',savane:'#d39a35',glace:'#7cc8de',ciel:'#8f9fdc',venin:'#8c52ad',insecte:'#9db53a',domestique:'#c39a74',ancien:'#8a785e'};
const nrg=n=>'<i class="pe"></i>'.repeat(n);
function pkCard(c,o){
  o=o||{};const f=fiche(c),w=TYPES[f.type].weak,hp=o.left!=null?o.left:f.hp,hurt=o.left!=null&&o.left<f.hp;
  return `<div class="pk" style="--tc:${TCOL[f.type]}"><div class="pk-in">
    <div class="pk-top"><b class="pk-n">${esc(c.n)}</b><span class="pk-hp${hurt?' hurt':''}"><small>PV</small>${hp}</span><span class="pk-ty">${TYPES[f.type].e}</span></div>
    <div class="pk-art"><img src="${c.art}" alt="" loading="lazy" draggable="false"></div>
    <div class="pk-sub">${esc(c.p)} · ${TYPES[f.type].n}${f.pts>1?' · géant':''}</div>
    <div class="pk-atk"><span class="pk-c">${nrg(f.cost)}</span><b>${esc(f.atk)}</b><span class="pk-d">${f.dmg}</span></div>
    ${f.eff?`<div class="pk-eff">${esc(f.eff.t)}</div>`:'<div class="pk-eff"></div>'}
    <div class="pk-bot"><span>Faiblesse<br>${TYPES[w].e} +20</span><span>Retraite<br>${f.retreat?nrg(f.retreat):'—'}</span><span>KO<br>${f.pts} pt${f.pts>1?'s':''}</span></div>
    <div class="pk-fl">${esc(c.f)}</div></div></div>`;
}
function showPk(c,left){$('viewCard').innerHTML=pkCard(c,{left});$('viewAct').innerHTML='';$('view').hidden=false}
const sideOf=()=>DU.G.s[0],oppOf=()=>DU.G.s[1];
const say=t=>{DU.msg=t};
function newDuel(){
  const d=deckCards();
  DU={G:newGame(d.cs,oppDeck(),Math.random()<.5),phase:'setup',mode:null,msg:'Choisissez votre animal actif dans votre main, puis ajoutez-en jusqu\'à 3 sur le banc.'};
  aiSetup(DU.G,1);const o=oppOf();o.hand.slice().sort((a,b)=>b.f.hp-a.f.hp).forEach(m=>{if(o.bench.length<2)toBench(o,m)});
}
function myStart(){DU.phase='me';startTurn(DU.G);if(DU.G.n===0)say('Vous commencez. Le premier tour se joue sans énergie.');else say('À vous : posez des animaux, attachez votre énergie ⚡, puis attaquez.')}
function afterAction(){
  const G=DU.G;
  if(G.over)return endDuel();
  if(!sideOf().act){if(sideOf().bench.length){DU.mode='promote';say('Votre animal est KO : choisissez un remplaçant sur votre banc.')}
    else{G.over=true;G.win=1;return endDuel()}}
  rDuel();
}
function lastLog(){const L=DU.G.log;return L[L.length-1]}
function logTxt(e){
  if(!e)return'';
  if(e.atk)return `${e.side?'La Naturaliste':'Vous'} : ${BY[e.atk].n} utilise ${fiche(BY[e.atk]).atk}, ${e.v} dégâts à ${BY[e.to].n}.`;
  if(e.ko)return `${BY[e.ko].n} est KO ! ${e.side?'+'+e.pts+' point'+(e.pts>1?'s':'')+' pour vous.':'+'+e.pts+' point'+(e.pts>1?'s':'')+' pour la Naturaliste.'}`;
  if(e.poison)return `${BY[e.poison].n} souffre du poison : 10 dégâts.`;return'';
}
function myEnd(){
  const G=DU.G;if(G.over)return;
  const before=G.log.length;endTurn(G);
  if(G.over)return endDuel();
  aiPhase(G.log.slice(before).map(logTxt).filter(Boolean));
}
function aiPhase(pre){
  const G=DU.G;DU.phase='ai';say((pre||[]).join(' ')||'Tour de la Naturaliste…');rDuel();
  setTimeout(()=>{if(!DU||DU.G!==G)return;
    startTurn(G);if(!oppOf().act)aiSetup(G,1);
    const b=G.log.length;aiTurn(G,1);const msgs=G.log.slice(b).map(logTxt).filter(Boolean);
    if(G.over)return endDuel();
    const b2=G.log.length;endTurn(G);msgs.push(...G.log.slice(b2).map(logTxt).filter(Boolean));
    if(G.over)return endDuel();
    if(!oppOf().act)aiSetup(G,1);
    if(!oppOf().act){G.over=true;G.win=0;return endDuel()}
    myStart();if(msgs.length)say(msgs.join(' '));
    afterAction()},900);
}
function endDuel(){
  const G=DU.G;DU.phase='over';const r=G.win===0?1:G.win===1?-1:0;DU.res=r;
  if(dw.d!==today())dw={d:today(),n:0};
  let g=r>0?(dw.n<DAILY?60:10):r===0?20:10;if(r>0)dw.n++;sv('dw',dw);
  if(r>0){wins++;sv('wins',wins)}
  DU.gain=g;setPts(pts+g);rDuel();
}
function rDuel(){
  const m=$('main');
  if(teamEdit)return rTeam();
  if(!DU){
    if(team.filter(id=>col[id]).length<DECK_N&&owned().length>new Set(team).size)autoTeam();
    const d=deckCards();if(dw.d!==today())dw={d:today(),n:0};
    m.innerHTML=`<h2>Duel</h2><p class="lead">Contre la Naturaliste. Mettez KO ses animaux : le premier à ${GOAL_PTS} points gagne. Appui long sur une carte pour la lire en grand.</p>
      <div class="row"><button class="btn" id="go">Commencer un duel</button><button class="btn ghost" id="edit">Modifier mon deck</button></div>
      <p class="lead" style="text-align:center;margin-top:10px">Victoire : ${dw.n<DAILY?60:10} points (${Math.max(0,DAILY-dw.n)} à plein tarif aujourd'hui). Nul : 20. Défaite : 10.</p>
      <details class="rules" open><summary>Comment jouer</summary>
      <p>Chaque animal a des <b>PV</b>, une <b>attaque</b> qui coûte des énergies ⚡, un <b>type</b> et une <b>faiblesse</b> (+20 dégâts).</p>
      <p>À votre tour : piochez, posez des animaux sur le banc (3 au plus), attachez <b>1 énergie</b> à un de vos animaux, puis attaquez avec votre animal actif.</p>
      <p>Un animal KO rapporte 1 point à l'adversaire, 2 pour les géants (150 PV et plus). Premier à ${GOAL_PTS} points.</p>
      <p>Faiblesses : ${Object.values(TYPES).map(t=>`${t.e} ${t.n} craint ${TYPES[t.weak].e}`).join(' · ')}.</p></details>
      <h3 class="h3">Mon deck (${DECK_N} cartes)${d.loans?` · ${d.loans} prêtée${d.loans>1?'s':''}`:''}</h3>
      <div class="grid pkgrid">${d.cs.map(c=>`<button data-id="${c.id}">${pkCard(c)}</button>`).join('')}</div>`;
    m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>showPk(BY[b.dataset.id])));
    $('go').addEventListener('click',()=>{newDuel();rDuel()});
    $('edit').addEventListener('click',()=>{teamEdit=true;rDuel()});
    return;
  }
  const G=DU.G,me=sideOf(),op=oppOf();
  if(DU.phase==='over'){
    const r=DU.res;
    m.innerHTML=`<div class="end"><p class="lead" style="margin:0">Fin du duel</p><div class="big${r<0?' ko':''}">${r>0?'Victoire':r<0?'Défaite':'Match nul'}</div>
      <p style="font-size:20px;margin:0 0 6px">${me.pts} – ${op.pts}</p><p class="lead">+${DU.gain} points pour la Salle des ventes.</p>
      <div class="row"><button class="btn" id="again">Rejouer</button><button class="btn ghost" id="back">Mon deck</button></div></div>`;
    $('again').addEventListener('click',()=>{newDuel();rDuel()});$('back').addEventListener('click',()=>{DU=null;rDuel()});return;
  }
  const pip=n=>`<span class="pips">${Array.from({length:GOAL_PTS},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</span>`;
  const myTurn=DU.phase==='me'&&!DU.mode,setup=DU.phase==='setup';
  const a=me.act,d=op.act,canAtk=myTurn&&a&&d&&canAttack(a)&&!G.attacked;
  const sel=DSEL&&[me.act,...me.bench,...me.hand].find(x=>x&&x.u===DSEL);
  m.innerHTML=`<div class="board">
    <div class="bside op"><div class="binfo"><b>Naturaliste</b>${pip(op.pts)}<span>🂠 ${op.hand.length} · pioche ${op.deck.length}</span></div>
      <div class="bench">${op.bench.map(x=>monHTML(x,'sm',`data-o="${x.u}"`)).join('')}${'<span class="slot0"></span>'.repeat(BENCH-op.bench.length)}</div>
      <div class="act">${d?monHTML(d,'big',`data-o="${d.u}"`):'<span class="slot0 big"></span>'}</div></div>
    <div class="bmsg">${esc(DU.msg||'')}</div>
    <div class="bside me"><div class="act">${a?monHTML(a,'big'+(DU.mode==='attach'?' tgt':''),`data-m="${a.u}"`):'<span class="slot0 big">votre actif</span>'}</div>
      <div class="bench">${me.bench.map(x=>monHTML(x,'sm'+((DU.mode==='attach'||DU.mode==='retreat'||DU.mode==='promote')?' tgt':''),`data-m="${x.u}"`)).join('')}${'<span class="slot0"></span>'.repeat(BENCH-me.bench.length)}</div>
      <div class="binfo"><b>Vous</b>${pip(me.pts)}<span>pioche ${me.deck.length}</span></div></div>
    <div class="bact">
      ${setup?`<button class="btn" id="ready"${a?'':' disabled'}>${a?'Prêt : commencer':'Choisissez un actif'}</button>`:''}
      ${myTurn?`<button class="btn${canAtk?'':' ghost'}" id="atk"${canAtk?'':' disabled'}>${a?`Attaquer : ${a.f.atk} (${d?damageOf(G,0,a,d):a.f.dmg})`:'Attaquer'}</button>
        <button class="btn ghost" id="en"${G.energy?'':' disabled'}>${G.energy?'⚡ Attacher':'⚡ déjà utilisée'}</button>
        <button class="btn ghost" id="ret"${a&&me.bench.length&&!G.retreated&&a.en>=a.f.retreat?'':' disabled'}>Retraite</button>
        <button class="btn ghost" id="end">Fin du tour</button>`:''}
      ${DU.mode&&DU.mode!=='promote'?'<button class="btn ghost" id="cancel">Annuler</button>':''}
      ${DU.phase==='ai'?'<p class="lead">La Naturaliste réfléchit…</p>':''}
    </div>
    <h3 class="h3">Ma main (${me.hand.length})</h3>
    <div class="hand2">${me.hand.map(x=>`<button data-h="${x.u}">${pkCard(x.c)}</button>`).join('')||'<p class="lead">Main vide.</p>'}</div>
    <div class="row" style="margin-top:14px"><button class="btn ghost" id="quit">Abandonner</button></div></div>`;
  const find=u=>[me.act,...me.bench,...me.hand].find(x=>x&&x.u===+u);
  m.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{const x=find(b.dataset.h);DSEL=x.u;
    if(setup||myTurn){if(!me.act){promote(me,x);say(x.c.n+' est votre animal actif.')}else if(me.bench.length<BENCH){toBench(me,x);say(x.c.n+' rejoint le banc.')}else say('Le banc est plein (3 animaux).')}
    rDuel()}));
  m.querySelectorAll('[data-m]').forEach(b=>b.addEventListener('click',()=>{const x=find(b.dataset.m);DSEL=x.u;
    if(DU.mode==='attach'){attach(G,x);DU.mode=null;say('Énergie attachée à '+x.c.n+'.')}
    else if(DU.mode==='retreat'&&x!==me.act){retreat(G,me,x);DU.mode=null;say(x.c.n+' passe à l\'avant.')}
    else if(DU.mode==='promote'&&x!==me.act){promote(me,x);DU.mode=null;say(x.c.n+' entre en jeu.')}
    rDuel()}));
  m.querySelectorAll('[data-o]').forEach(b=>b.addEventListener('click',()=>{const x=[op.act,...op.bench].find(y=>y&&y.u===+b.dataset.o);if(x)showPk(x.c,Math.max(0,x.f.hp-x.dmg))}));
  m.querySelectorAll('[data-m],[data-h]').forEach(b=>{let t=0;const id=b.dataset.m||b.dataset.h;
    b.addEventListener('pointerdown',()=>{t=setTimeout(()=>{b.dataset.lp=1;const x=find(id);if(x)showPk(x.c,Math.max(0,x.f.hp-x.dmg))},450)});
    ['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>clearTimeout(t)));
    b.addEventListener('contextmenu',e=>e.preventDefault());
    b.addEventListener('click',e=>{if(b.dataset.lp){delete b.dataset.lp;e.stopImmediatePropagation()}},true)});
  if($('ready'))$('ready').addEventListener('click',()=>{if(G.turn===0){myStart();rDuel()}else aiPhase(['La Naturaliste commence.'])});
  if($('atk'))$('atk').addEventListener('click',()=>{const b=G.log.length;attack(G);say(G.log.slice(b).map(logTxt).join(' '));buzz(30);
    if(G.over)return endDuel();if(!op.act)aiSetup(G,1);if(!op.act&&!op.bench.length){G.over=true;G.win=0;return endDuel()}myEnd()});
  if($('en'))$('en').addEventListener('click',()=>{DU.mode='attach';say('Touchez l\'animal qui reçoit l\'énergie.');rDuel()});
  if($('ret'))$('ret').addEventListener('click',()=>{DU.mode='retreat';say('Touchez l\'animal du banc qui prend la place. Coût : '+(a.f.retreat||'aucune')+' énergie.');rDuel()});
  if($('end'))$('end').addEventListener('click',myEnd);
  if($('cancel'))$('cancel').addEventListener('click',()=>{DU.mode=null;say('');rDuel()});
  $('quit').addEventListener('click',()=>{if($('quit').dataset.ok){G.over=true;G.win=1;endDuel()}else{$('quit').dataset.ok=1;$('quit').textContent='Sûr ? Touchez encore'}});
}
function rTeam(){
  const m=$('main'),own=owned().slice().sort((a,b)=>fiche(b).hp+fiche(b).dmg-fiche(a).hp-fiche(a).dmg);
  const cnt={};team.forEach(id=>cnt[id]=(cnt[id]||0)+1);
  m.innerHTML=`<h2>Mon deck</h2><p class="lead">${team.length}/${DECK_N} cartes, 2 exemplaires au plus. Touchez une carte pour en mettre 1, 2 ou 0.</p>
    <div class="row"><button class="btn" id="ok">Valider</button><button class="btn ghost" id="auto">Deck automatique</button></div>
    <div class="tools" style="margin-top:12px"><input class="search" id="q" type="search" placeholder="Rechercher un animal" autocomplete="off"></div>
    <div class="grid pkgrid">${own.map(c=>`<button data-id="${c.id}" data-n="${esc(norm(c.n))}"${cnt[c.id]?' class="pick"':''}>${pkCard(c)}${cnt[c.id]?`<span class="cnt">×${cnt[c.id]}</span>`:''}</button>`).join('')}</div>
    ${own.length?'':'<p class="lead">Votre album est vide : ouvrez des sachets.</p>'}`;
  $('ok').addEventListener('click',()=>{teamEdit=false;sv('deck',team);rDuel()});
  $('auto').addEventListener('click',()=>{autoTeam();rTeam()});
  m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id,n=cnt[id]||0,max=Math.min(2,col[id]||0);
    if(n<max&&team.length<DECK_N)team.push(id);else if(n>0)team=team.filter(x=>x!==id);else{toast(DECK_N+' cartes au plus');return}
    const y=m.scrollTop;sv('deck',team);rTeam();m.scrollTop=y}));
  bindSearch(m,()=>{});
}
if(!team.length&&owned().length)autoTeam();

/* ================= actions sur une carte (fiche en grand), comme dans ClubDeck ================= */
const defVal=c=>r5(cote(c)/10);
function viewActs(c){
  const box=$('viewAct'),n=col[c.id]||0;
  if(!n||tab==='demo'||!ST.hidden){box.innerHTML='';return}
  box.innerHTML=`<div class="vact"><span>${n} exemplaire${n>1?'s':''} · cote ${fr(cote(c))} </span>${ficheHTML(c)}
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
