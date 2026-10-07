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

/* ================= duel « Épreuves » : deck de 20 cartes avec un budget de coût ================= */
const DECK_N=20,BUDGET=90,OUT=2,HAND=5,WIN=5,DAILY=5;
const EP=[['P','Combat','Puissance'],['V','Course','Vitesse'],['I','Ruse','Intelligence']];
let team=ld('deck2',[]),DU=null,teamEdit=false;
const today=()=>{const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
let dw=ld('dw',{d:0,n:0});
const stv=(c,k)=>c.st[{P:0,V:1,I:2}[k]];
const sum3=c=>c.st[0]+c.st[1]+c.st[2];
const deckCost=ids=>ids.reduce((a,id)=>a+(BY[id]?BY[id].k:0),0);
/* deck automatique : les cartes les plus efficaces (stats par point de coût) sans dépasser le budget */
function buildDeck(pool){
  /* pool : [{c,n}] ; renvoie une liste de cartes */
  const slots=[];pool.forEach(x=>{for(let i=0;i<Math.min(2,x.n);i++)slots.push(x.c)});
  slots.sort((a,b)=>(sum3(b)/b.k)-(sum3(a)/a.k)||sum3(b)-sum3(a));
  let out=slots.slice(0,DECK_N),cost=out.reduce((a,c)=>a+c.k,0);
  /* puis on améliore : on remplace une carte faible par une plus forte tant que le budget le permet */
  const rest=slots.slice(DECK_N).sort((a,b)=>sum3(b)-sum3(a));
  for(const r of rest){out.sort((a,b)=>sum3(a)-sum3(b));const w=out[0];if(sum3(r)>sum3(w)&&cost-w.k+r.k<=BUDGET){out[0]=r;cost+=r.k-w.k}}
  while(cost>BUDGET&&out.length){out.sort((a,b)=>b.k-a.k);cost-=out.shift().k}
  return out;
}
const ownList=()=>owned().map(c=>({c,n:col[c.id]}));
function autoTeam(){team=buildDeck(ownList()).map(c=>c.id);sv('deck2',team)}
function deckCards(){
  const cnt={},cs=[];team.forEach(id=>{if(BY[id]&&(cnt[id]||0)<Math.min(2,col[id]||0)){cnt[id]=(cnt[id]||0)+1;cs.push(BY[id])}});
  let left=BUDGET-cs.reduce((a,c)=>a+c.k,0);
  const cheap=shuffle(CARDS.filter(c=>c.k<=3));const loan=[];
  for(const c of cheap){if(cs.length+loan.length>=DECK_N)break;if(c.k<=left){loan.push(c);left-=c.k}}
  return{cs:cs.concat(loan),loans:loan.length};
}
function oppDeck(){const n=Math.max(30,owned().length);return buildDeck(shuffle(CARDS.slice()).slice(0,n).map(c=>({c,n:Math.random()<.4?2:1})))}
function newDuel(){
  const side=cs=>{const d=shuffle(cs.slice());return{deck:d,hand:d.splice(0,HAND),pts:0}};
  DU={me:side(deckCards().cs),op:side(oppDeck()),n:0,ep:EP[Math.random()*3|0],sel:null,last:null,over:false};
}
function aiChoose(h,k){
  const best=h.slice().sort((a,b)=>stv(b,k)-stv(a,k))[0];
  if(stv(best,k)>=7||Math.random()<.25)return best;
  /* sinon on sacrifie la carte la plus faible */
  return h.slice().sort((a,b)=>sum3(a)-sum3(b))[0];
}
function playRound(x){
  const me=DU.me,op=DU.op,k=DU.ep[0],y=aiChoose(op.hand,k);
  /* Outsider : la carte la moins chère gagne +1 par point de coût d'écart, +2 au plus */
  const ba=Math.min(OUT,Math.max(0,y.k-x.k)),bb=Math.min(OUT,Math.max(0,x.k-y.k));
  const a=stv(x,k)+ba,b=stv(y,k)+bb;let r=Math.sign(a-b),tie='';
  if(!r){r=Math.sign(y.k-x.k);tie=r?'cheap':'none'}
  me.hand.splice(me.hand.indexOf(x),1);op.hand.splice(op.hand.indexOf(y),1);
  if(r>0)me.pts++;else if(r<0)op.pts++;
  DU.last={x,y,a,b,ba,bb,r,tie,ep:DU.ep};DU.n++;DU.sel=null;
  [me,op].forEach(s=>{if(s.deck.length)s.hand.push(s.deck.shift())});
  if(me.pts>=WIN||op.pts>=WIN||!me.hand.length||!op.hand.length)endDuel();
  else DU.ep=EP[Math.random()*3|0];
  rDuel();
}
function endDuel(){
  DU.over=true;const r=Math.sign(DU.me.pts-DU.op.pts);DU.res=r;
  if(dw.d!==today())dw={d:today(),n:0};
  let g=r>0?(dw.n<DAILY?60:10):r===0?20:10;if(r>0)dw.n++;sv('dw',dw);
  if(r>0){wins++;sv('wins',wins)}
  DU.gain=g;setPts(pts+g);
}
function rDuel(){
  const m=$('main');
  if(teamEdit)return rTeam();
  if(!DU){
    if(team.filter(id=>col[id]).length<DECK_N&&owned().length>new Set(team).size)autoTeam();
    const d=deckCards(),cost=d.cs.reduce((a,c)=>a+c.k,0);if(dw.d!==today())dw={d:today(),n:0};
    m.innerHTML=`<h2>Duel</h2><div class="nat"><img src="art/naturaliste.webp" alt="La Naturaliste"><div><b>La Naturaliste</b><span>Exploratrice, carnet de croquis et jumelles. Elle vous attend pour un duel.</span></div></div><p class="lead">Contre la Naturaliste. À chaque manche, une épreuve : ⚔️ Combat (Puissance), 💨 Course (Vitesse) ou 🧠 Ruse (Intelligence). Chacun pose une carte, la plus forte dans cette stat gagne. Premier à ${WIN} manches.</p>
      <div class="row"><button class="btn" id="go">Commencer un duel</button><button class="btn ghost" id="edit">Modifier mon deck</button></div>
      <p class="lead" style="text-align:center;margin-top:10px">Victoire : ${dw.n<DAILY?60:10} points (${Math.max(0,DAILY-dw.n)} à plein tarif aujourd'hui). Nul : 20. Défaite : 10.</p>
      <details class="rules"><summary>Le budget de deck</summary>
      <p>Un deck compte ${DECK_N} cartes, 2 exemplaires au plus, et la somme de leurs coûts ne peut pas dépasser <b>${BUDGET}</b>. Impossible donc de mettre seulement des animaux puissants : il faut aussi des petites cartes.</p>
      <p><b>Outsider</b> : la carte la moins chère gagne +1 par point de coût d'écart, jusqu'à +2. Égalité : la carte la moins chère gagne. Gardez vos grosses cartes pour les épreuves où elles brillent, et sacrifiez une petite carte quand l'épreuve ne vous va pas.</p></details>
      <h3 class="h3">Mon deck · ${d.cs.length} cartes · coût ${cost}/${BUDGET}${d.loans?` · ${d.loans} prêtée${d.loans>1?'s':''}`:''}</h3>
      <div class="grid">${d.cs.map(c=>`<button data-id="${c.id}">${card(c,true)}</button>`).join('')}</div>`;
    m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>show(BY[b.dataset.id])));
    $('go').addEventListener('click',()=>{newDuel();rDuel()});
    $('edit').addEventListener('click',()=>{teamEdit=true;rDuel()});
    return;
  }
  const me=DU.me,op=DU.op,L=DU.last;
  if(DU.over){
    const r=DU.res;
    m.innerHTML=`<div class="end"><p class="lead" style="margin:0">Fin du duel</p><div class="big${r<0?' ko':''}">${r>0?'Victoire':r<0?'Défaite':'Match nul'}</div>
      <p style="font-size:20px;margin:0 0 6px">${me.pts} – ${op.pts}</p><p class="lead">+${DU.gain} points pour la Salle des ventes.</p>
      <div class="row"><button class="btn" id="again">Rejouer</button><button class="btn ghost" id="back">Mon deck</button></div></div>`;
    $('again').addEventListener('click',()=>{newDuel();rDuel()});$('back').addEventListener('click',()=>{DU=null;rDuel()});return;
  }
  const pip=n=>`<div class="pips">${Array.from({length:WIN},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>`;
  const k=DU.ep[0],ic={P:'⚔️',V:'💨',I:'🧠'};
  let msg='';
  if(L){msg=L.r>0?'<b>Manche gagnée</b>':L.r<0?'<b class="ko">Manche perdue</b>':'<b>Égalité</b>';
    msg+=`${esc(L.x.n)} ${L.a}${L.ba?` (dont +${L.ba} outsider)`:''} contre ${esc(L.y.n)} ${L.b}${L.bb?` (dont +${L.bb} outsider)`:''} en ${L.ep[2]}.`+(L.tie==='cheap'?' La carte la moins chère gagne.':'')}
  m.innerHTML=`<div class="score"><div><b>Vous</b>${pip(me.pts)}</div><div class="sc">${me.pts} – ${op.pts}</div><div><b>Naturaliste <img class="av" src="art/naturaliste.webp" alt=""></b>${pip(op.pts)}</div></div>
    <div class="epr"><span>${ic[k]}</span><div><b>${DU.ep[1]}</b><small>épreuve de ${DU.ep[2]} · manche ${DU.n+1}</small></div></div>
    ${L?`<div class="arena"><div class="slot"><span class="lab">Vous</span>${card(L.x,true)}<div class="val ${L.r>0?'w':L.r<0?'l':''}">${L.a}</div></div>
      <div class="vs"><b>VS</b>${L.ep[2]}</div><div class="slot"><span class="lab">Naturaliste</span>${card(L.y,true)}<div class="val ${L.r<0?'w':L.r>0?'l':''}">${L.b}</div></div></div>`:''}
    <div class="msg">${msg||'Choisissez la carte à jouer pour cette épreuve.'}</div>
    <div class="grid dgrid">${me.hand.map((x,i)=>`<button data-h="${i}" class="${DU.sel===x?'sel':''}">${card(x,true)}<span class="hv">${ic[k]} ${stv(x,k)}</span></button>`).join('')}</div>
    <div class="row" style="margin-top:14px"><button class="btn" id="playB"${DU.sel?'':' disabled'}>${DU.sel?'Jouer '+esc(DU.sel.n):'Choisissez une carte'}</button><button class="btn ghost" id="quit">Abandonner</button></div>`;
  m.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{const x=me.hand[+b.dataset.h];DU.sel=DU.sel===x?null:x;rDuel()}));
  $('playB').addEventListener('click',()=>{if(DU.sel)playRound(DU.sel)});
  $('quit').addEventListener('click',()=>{if($('quit').dataset.ok){DU.me.pts=0;DU.op.pts=WIN;endDuel();rDuel()}else{$('quit').dataset.ok=1;$('quit').textContent='Sûr ? Touchez encore'}});
}
function rTeam(){
  const m=$('main'),own=owned().slice().sort((a,b)=>b.k-a.k||sum3(b)-sum3(a));
  const cnt={};team.forEach(id=>cnt[id]=(cnt[id]||0)+1);const cost=deckCost(team);
  m.innerHTML=`<h2>Mon deck</h2><p class="lead">${team.length}/${DECK_N} cartes · coût <b style="color:${cost>BUDGET?'#ff9aa5':'var(--gold-hi)'}">${cost}/${BUDGET}</b>. Touchez une carte pour en mettre 1, 2 ou 0.</p>
    <div class="row"><button class="btn" id="ok">Valider</button><button class="btn ghost" id="auto">Deck automatique</button></div>
    <div class="tools" style="margin-top:12px"><input class="search" id="q" type="search" placeholder="Rechercher un animal" autocomplete="off"></div>
    <div class="grid">${own.map(c=>`<button data-id="${c.id}" data-n="${esc(norm(c.n))}"${cnt[c.id]?' class="pick"':''}>${card(c,true)}${cnt[c.id]?`<span class="cnt">×${cnt[c.id]}</span>`:''}</button>`).join('')}</div>
    ${own.length?'':'<p class="lead">Votre album est vide : ouvrez des sachets.</p>'}`;
  $('ok').addEventListener('click',()=>{teamEdit=false;sv('deck2',team);rDuel()});
  $('auto').addEventListener('click',()=>{autoTeam();rTeam()});
  m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id,n=cnt[id]||0,max=Math.min(2,col[id]||0);
    if(n<max&&team.length<DECK_N){if(deckCost(team)+BY[id].k>BUDGET){toast('Budget dépassé : retirez une carte chère');return}team.push(id)}
    else if(n>0)team=team.filter(x=>x!==id);else{toast(DECK_N+' cartes au plus');return}
    const y=m.scrollTop;sv('deck2',team);rTeam();m.scrollTop=y}));
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
