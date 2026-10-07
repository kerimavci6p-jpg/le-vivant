/* L'AFFÛT : écrans (menu, decks, manche, révélation, fin). Moteur dans affut.js.
   Se charge après jeu.js : réutilise rDuel (WILD DUEL), sfx, dw, setPts, owned, card, toast. */
let duelMode=ld('duelmode','wild'),AFG=null;
let afDecks=ld('afdecks',[[],[],[]]),afSlot=ld('afslot',0),afEdit=false,afLevel=ld('aflevel','normal');
let AFV={screen:'menu',sel:null,stat:null,last:null,q:''};
const rWild=rDuel;
rDuel=function(){
  if(duelMode==='affut')return rAffut();
  rWild();
  if(!teamEdit&&(!DU||WDV.screen==='menu'))$('main').insertAdjacentHTML('afterbegin',modeSeg()),bindMode();
};
function modeSeg(){return `<div class="af-mode seg">${[['wild','WILD DUEL'],['affut','L\'Affût']].map(x=>`<button data-mode="${x[0]}" aria-pressed="${duelMode===x[0]}">${x[1]}</button>`).join('')}</div>`}
function bindMode(){document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{duelMode=b.dataset.mode;sv('duelmode',duelMode);rDuel()}))}

const AFS={P:'PUI',V:'VIT',I:'INT'};
const afCards=ids=>ids.map(id=>BY[id]).filter(c=>c&&col[c.id]);
/* deck joué : le slot choisi s'il est valide, sinon un deck automatique (avec des cartes prêtées s'il en manque) */
function afPlayDeck(){
  const d=afCards(afDecks[afSlot]||[]);if(AF.check(d).ok)return{d,auto:false,loans:0};
  let pool=owned(),loans=0;
  if(pool.length<AF.CFG.DECK+4){const extra=shuffle(CARDS.filter(c=>!col[c.id]&&c.k<=3)).slice(0,AF.CFG.DECK);pool=pool.concat(extra)}
  const out=AF.autoDeck(pool);
  shuffle(CARDS.filter(c=>c.k<=3)).forEach(c=>{if(out.length<AF.CFG.DECK&&!AF.canAdd(out,c))out.push(c)});
  loans=out.filter(c=>!col[c.id]).length;return{d:out,auto:true,loans};
}
function afOpp(){return AF.autoDeck(shuffle(CARDS.slice()).slice(0,Math.max(24,owned().length)))}
function afGauges(d){const k=AF.check(d),st=d.filter(c=>c.k>=AF.CFG.STAR_COST).length,C=AF.CFG;
  return `<div class="af-gauge"><span class="${k.cost>C.BUDGET?'bad':''}">Budget<b>${k.cost}/${C.BUDGET}</b><i><u style="width:${Math.min(100,k.cost/C.BUDGET*100)}%"></u></i></span>
    <span>Cartes<b>${d.length}/${C.DECK}</b></span><span>Légende<b>${k.leg}/${C.LEG}</b></span><span>Noires<b>${k.noire}/${C.NOIRE}</b></span><span>Stars<b>${st}/${C.STARS}</b></span>
    <span>Instinct<b>+${Math.max(0,Math.floor((C.BUDGET-k.cost)/C.INSTINCT))}</b></span></div>`}
function terrainTag(T,big){return `<div class="af-ter${big?' big':''} t-${T.id}"><em>${T.e}</em><div><b>${T.n}</b>${big?`<span>${AF.SN[T.x]} ×2 · chez eux (+${AF.CFG.HOME}) : ${T.home.join(', ')}</span>`:`<span>${AFS[T.x]} ×2</span>`}</div></div>`}

function rAffut(){
  const m=$('main');
  if(afEdit)return rAfDeck();
  if(!AFG||AFV.screen==='menu'){
    const P=afPlayDeck();if(dw.d!==today())dw={d:today(),n:0};
    m.innerHTML=modeSeg()+`<div class="wd-title"><b>L'AFFÛT</b><span>Bluff, terrain et budget</span></div>
      <div class="nat"><img src="art/naturaliste.webp" alt="La Naturaliste"><div><b>Affût contre la Naturaliste</b><span>5 manches au plus, premier à 3. Carte et épreuve choisies en secret.</span></div></div>
      <div class="seg wd-lv">${[['facile','Facile'],['normal','Normal'],['expert','Expert']].map(x=>`<button data-lv="${x[0]}" aria-pressed="${afLevel===x[0]}">${x[1]}</button>`).join('')}</div>
      <div class="row"><button class="btn" id="afGo">Jouer</button><button class="btn ghost" id="afEd">Mes decks</button></div>
      <p class="lead" style="text-align:center;margin-top:10px">Victoire : ${dw.n<DAILY?60:10} points (${Math.max(0,DAILY-dw.n)} à plein tarif aujourd'hui, partagé avec WILD DUEL). Nul : 20. Défaite : 10.</p>
      <details class="rules"><summary>Règles</summary>
      <p><b>Deck de ${AF.CFG.DECK}</b> cartes, un exemplaire par animal, <b>budget ${AF.CFG.BUDGET}</b> points de coût. Au plus 1 Légende, 2 Noires et ${AF.CFG.STARS} stars (coût ${AF.CFG.STAR_COST}+).</p>
      <p><b>Instinct</b> : chaque tranche de ${AF.CFG.INSTINCT} points de budget non dépensés donne +1 à toutes vos manches.</p>
      <p><b>Terrain</b> : chaque manche a un terrain qui double une stat. Les familles chez elles gagnent +${AF.CFG.HOME}. Vous voyez les ${AF.CFG.SHOW_NEXT} terrains suivants.</p>
      <p><b>Manche</b> : chacun pose une carte de sa main (${AF.CFG.HAND}) et choisit une épreuve en secret. Même épreuve : la plus haute valeur gagne. Épreuves différentes : chacun mesure son avance sur l'autre animal dans sa propre épreuve, la plus grande avance gagne.</p>
      <p><b>Outsider</b> : la carte la moins chère gagne +1 par point de coût d'écart (+${AF.CFG.OUT} au plus). Égalité : la moins chère gagne.</p></details>
      <h3 class="h3">Deck ${P.auto?'automatique':afSlot+1}${P.loans?` · ${P.loans} prêtée${P.loans>1?'s':''}`:''}</h3>${afGauges(P.d)}
      <div class="af-strip">${P.d.slice().sort((a,b)=>b.k-a.k).map(c=>`<span>${card(c,true)}</span>`).join('')}</div>`;
    bindMode();
    m.querySelectorAll('[data-lv]').forEach(b=>b.addEventListener('click',()=>{afLevel=b.dataset.lv;sv('aflevel',afLevel);rAffut()}));
    $('afGo').addEventListener('click',()=>{audio();afNew()});
    $('afEd').addEventListener('click',()=>{afEdit=true;rAffut()});
    return;
  }
  const G=AFG.G,A=G.s[0],B=G.s[1];
  const head=`<div class="af-head"><span class="af-sc"><small>Vous</small><b>${A.pts}</b></span><span class="af-rd">Manche ${Math.min(G.round+1,AF.CFG.ROUNDS)}/${AF.CFG.ROUNDS}<small>Premier à ${AF.CFG.WIN}</small></span><span class="af-sc"><small>Naturaliste</small><b>${B.pts}</b></span></div>`;
  if(AFV.screen==='over'){
    const r=AFG.res;
    m.innerHTML=`<div class="end"><div class="big${r<0?' ko':''}">${r>0?'Victoire':r<0?'Défaite':'Match nul'}</div>${head}
      <div class="af-hist">${G.hist.map(h=>`<p class="${h.r>0?'w':h.r<0?'l':''}"><em>${h.T.e}</em> ${esc(h.a.card.n)} (${AFS[h.a.stat]}) contre ${esc(h.b.card.n)} (${AFS[h.b.stat]}) <b>${h.r>0?'gagnée':h.r<0?'perdue':'nulle'}</b></p>`).join('')}</div>
      <p class="lead">+${AFG.gain} points pour la Salle des ventes.</p>
      <div class="row"><button class="btn" id="afA">Revanche</button><button class="btn ghost" id="afB">Retour au menu</button></div></div>`;
    $('afA').addEventListener('click',()=>afNew());$('afB').addEventListener('click',()=>{AFG=null;AFV.screen='menu';rAffut()});return;
  }
  if(AFV.screen==='reveal'){
    const h=AFV.last;
    m.innerHTML=head+terrainTag(h.T,true)+`<div class="af-duel">
      <div class="af-side op"><small>Naturaliste · ${AF.SN[h.b.stat]}</small><div class="af-flip"><div class="af-back"></div><div class="af-face">${card(h.b.card,true)}</div></div></div>
      <div class="af-cd" id="afCd">3</div>
      <div class="af-side me"><small>Vous · ${AF.SN[h.a.stat]}</small><div class="af-flip"><div class="af-back"></div><div class="af-face">${card(h.a.card,true)}</div></div></div></div>
      <div id="afRes"></div>`;
    let n=3;const cd=$('afCd');sfx('turn');
    const t=setInterval(()=>{n--;if(!document.body.contains(cd)){clearInterval(t);return}
      if(n>0){cd.textContent=n;sfx('turn');return}
      clearInterval(t);cd.textContent=h.r>0?'✓':h.r<0?'✗':'=';cd.className='af-cd '+(h.r>0?'w':h.r<0?'l':'');
      m.querySelectorAll('.af-flip').forEach(f=>f.classList.add('on'));sfx(h.r>0?'win':'hit');buzz(h.r>0?40:20);
      $('afRes').innerHTML=afExplain(h)+`<div class="row" style="margin-top:12px"><button class="btn" id="afN">${G.over?'Voir le résultat':'Manche suivante'}</button></div>`;
      $('afN').addEventListener('click',()=>{if(G.over)afFinish();else{AFV.screen='play';AFV.sel=null;AFV.stat=null;rAffut();m.scrollTop=0}})},650);
    return;
  }
  /* ---------- choix de la manche ---------- */
  const T=AF.terrain(G),next=G.terrains.slice(G.round+1,G.round+1+AF.CFG.SHOW_NEXT),sel=AFV.sel&&A.hand.find(c=>c.id===AFV.sel);
  m.innerHTML=head+terrainTag(T,true)+`<div class="af-next"><small>Ensuite</small>${next.map(x=>terrainTag(x)).join('')}</div>
    <div class="af-info"><span>Votre Instinct <b>+${A.inst}</b></span><span>Instinct adverse <b>+${B.inst}</b></span><span>Pioche <b>${A.deck.length}</b></span></div>
    ${B.played.length?`<div class="af-opp"><small>Cartes déjà jouées par la Naturaliste</small><div>${B.played.map(c=>`<span>${card(c,true)}</span>`).join('')}</div></div>`:''}
    <h3 class="h3">Votre main · choisissez une carte</h3>
    <div class="wd-hand af-hand">${A.hand.map(c=>`<button data-af="${c.id}" class="${AFV.sel===c.id?'sel':''}">${card(c,true)}${T.home.includes(c.p)?'<span class="af-home">chez lui</span>':''}</button>`).join('')}</div>
    <div class="stats af-stats">${AF.ST.map(s=>`<button data-s="${s}" aria-pressed="${AFV.stat===s}"${sel?'':' disabled'}>${AF.SN[s]}<b>${sel?AF.value(sel,s,T)+A.inst:'—'}</b>${T.x===s?'<small>×2</small>':''}</button>`).join('')}</div>
    <div class="row"><button class="btn" id="afP"${sel&&AFV.stat?'':' disabled'}>Poser face cachée</button><button class="btn ghost" id="afQ">Abandonner</button></div>`;
  m.querySelectorAll('[data-af]').forEach(b=>b.addEventListener('click',()=>{AFV.sel=AFV.sel===b.dataset.af?null:b.dataset.af;const y=m.scrollTop;rAffut();m.scrollTop=y}));
  m.querySelectorAll('[data-s]').forEach(b=>b.addEventListener('click',()=>{AFV.stat=b.dataset.s;const y=m.scrollTop;rAffut();m.scrollTop=y}));
  $('afP').addEventListener('click',()=>{if(!sel||!AFV.stat)return;const b=AF.ai(G,1,afLevel);
    AFV.last=AF.resolve(G,{card:sel,stat:AFV.stat},b);AFV.screen='reveal';sfx('play');rAffut();m.scrollTop=0});
  $('afQ').addEventListener('click',()=>{const q=$('afQ');if(q.dataset.ok){G.over=true;G.winner=1;afFinish()}else{q.dataset.ok=1;q.textContent='Vraiment abandonner ?'}});
}
/* explication claire de la manche */
function afExplain(h){
  const C=AF.CFG,G=AFG.G,side=(me,x,o,inst)=>{const base=AF.value(x.card,x.stat,h.T)-(h.T.home.includes(x.card.p)?C.HOME:0),out=AF.outsider(x.card,o.card),parts=[];
      parts.push(`${AF.SN[x.stat]} ${x.card.st[{P:0,V:1,I:2}[x.stat]]}${h.T.x===x.stat?' ×2 = '+base:''}`);
      if(h.T.home.includes(x.card.p))parts.push(`chez lui +${C.HOME}`);if(out)parts.push(`outsider +${out}`);if(inst)parts.push(`instinct +${inst}`);
      return `<b>${me}</b> : ${parts.join(' · ')}`};
  const A=G.s[0],B=G.s[1];
  let s=`<div class="af-exp"><p>${side('Vous',h.a,h.b,A.inst)} → <b>${h.va}</b></p><p>${side('Naturaliste',h.b,h.a,B.inst)} → <b>${h.vb}</b></p>`;
  if(h.mode==='face')s+=`<p class="m">Même épreuve : ${h.va} contre ${h.vb}.</p>`;
  else{const sg=v=>(v>=0?'+':'')+v;s+=`<p class="m">Épreuves différentes : chacun mesure son avance sur l'autre animal dans sa propre épreuve (bonus adverses compris).<br>
    Vous : ${h.va} − ${h.va-h.ra} (sa ${AF.SN[h.a.stat]}) = <b>${sg(h.ra)}</b> · Naturaliste : ${h.vb} − ${h.vb-h.rb} (votre ${AF.SN[h.b.stat]}) = <b>${sg(h.rb)}</b></p>`}
  if(h.tie==='cheap')s+=`<p class="m">Égalité : la carte la moins chère l'emporte.</p>`;
  s+=`<p class="v ${h.r>0?'w':h.r<0?'l':''}">${h.r>0?'Manche gagnée':h.r<0?'Manche perdue':'Manche nulle'}</p></div>`;return s;
}
function afNew(){
  const P=afPlayDeck();AFG={G:AF.newGame(P.d,afOpp()),start:Date.now()};AFV=Object.assign(AFV,{screen:'play',sel:null,stat:null,last:null});rAffut();$('main').scrollTop=0;
}
function afFinish(){
  const G=AFG.G,r=G.winner===0?1:G.winner===1?-1:0;
  if(dw.d!==today())dw={d:today(),n:0};const g=r>0?(dw.n<DAILY?60:10):r===0?20:10;if(r>0){dw.n++;wins++;sv('wins',wins)}sv('dw',dw);
  AFG.res=r;AFG.gain=g;setPts(pts+g);sfx(r>0?'victory':'defeat');AFV.screen='over';rAffut();$('main').scrollTop=0;
}
/* ---------- éditeur : 3 decks, budget et quotas ---------- */
function rAfDeck(){
  const m=$('main'),deck=afCards(afDecks[afSlot]||[]),ids=new Set(deck.map(c=>c.id)),k=AF.check(deck);
  const own=owned().slice().sort((a,b)=>b.k-a.k||sum3(b)-sum3(a));
  m.innerHTML=`<h2>Mes decks L'Affût</h2>
    <div class="seg">${[0,1,2].map(i=>`<button data-slot="${i}" aria-pressed="${afSlot===i}">Deck ${i+1}${AF.check(afCards(afDecks[i]||[])).ok?' ✓':''}</button>`).join('')}</div>
    ${afGauges(deck)}
    <p class="lead">${k.ok?'Deck valide.':'À compléter : '+k.errs.join(' · ')+'.'} Les cartes grisées ne peuvent pas entrer : touchez-les pour savoir pourquoi.</p>
    <div class="row"><button class="btn" id="afOk">Valider</button><button class="btn ghost" id="afAuto">Deck automatique</button><button class="btn ghost" id="afClr">Vider</button></div>
    <div class="tools" style="margin-top:12px"><input class="search" id="q" type="search" placeholder="Rechercher un animal" autocomplete="off"></div>
    <div class="grid">${own.map(c=>{const inD=ids.has(c.id),why=inD?null:AF.canAdd(deck,c);
      return `<button data-id="${c.id}" data-n="${esc(norm(c.n))}" class="${inD?'pick':''}${why?' af-off':''}"${why?` title="${esc(why)}"`:''}>${card(c,true)}${inD?'<span class="cnt">✓</span>':''}</button>`}).join('')}</div>
    ${own.length?'':'<p class="lead">Votre album est vide : ouvrez des sachets.</p>'}`;
  const save=()=>{afDecks[afSlot]=deck.map(c=>c.id);sv('afdecks',afDecks)};
  m.querySelectorAll('[data-slot]').forEach(b=>b.addEventListener('click',()=>{afSlot=+b.dataset.slot;sv('afslot',afSlot);rAfDeck()}));
  $('afOk').addEventListener('click',()=>{if(!k.ok&&deck.length)toast('Deck incomplet : le deck automatique sera utilisé');afEdit=false;rAffut()});
  $('afAuto').addEventListener('click',()=>{const d=AF.autoDeck(owned());deck.splice(0,deck.length,...d);save();rAfDeck();if(d.length<AF.CFG.DECK)toast('Pas assez de cartes : ouvrez des sachets')});
  $('afClr').addEventListener('click',()=>{deck.length=0;save();rAfDeck()});
  m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>{const c=BY[b.dataset.id],i=deck.findIndex(x=>x.id===c.id);
    if(i>=0)deck.splice(i,1);else{const why=AF.canAdd(deck,c);if(why){toast(why);return}deck.push(c)}
    save();const y=m.scrollTop,q=$('q').value;rAfDeck();m.scrollTop=y;if(q){$('q').value=q;$('q').dispatchEvent(new Event('input'))}}));
  bindSearch(m,()=>{});
}
