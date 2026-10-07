/* Le Vivant : duel « Chaîne alimentaire » et Marché (repris de ClubDeck : enchères, achat immédiat, vente, défis du jour).
   Ce fichier se charge après le script principal et utilise ses outils : CARDS, BY, col, sv, ld, $, esc, card, show, toast, render, tab. */

/* ================= classes, force et coût ================= */
const CL={
  pred:{n:'Prédateur',e:'🦁',bat:'proie'},
  proie:{n:'Proie rapide',e:'🐇',bat:'colosse'},
  colosse:{n:'Colosse',e:'🐘',bat:'venin'},
  venin:{n:'Venimeux',e:'🐍',bat:'charo'},
  charo:{n:'Charognard',e:'🦅',bat:'pred'},
  carap:{n:'Carapace',e:'🐢',bat:null}
};
const CL_ORDER=['pred','proie','colosse','venin','charo','carap'];
const CLASSE=/*CLASSES*/{"vaquita":"proie","calamar":"colosse","axolotl":"carap","leopardneiges":"pred","ornithorynque":"venin","komodo":"venin","guepard":"pred","faucon":"pred","baleine":"colosse","orque":"pred","cobra":"venin","mante":"pred","tardigrade":"carap","meduse":"venin","kangourou":"proie","paresseux":"carap","herisson":"carap","renard":"charo","abeille":"venin","grenouille":"proie","saola":"proie","lion":"pred","tigredesumatra":"pred","okapi":"proie","grandrequinblanc":"pred","rhinocerosdejava":"colosse","gorilledesmontagnes":"colosse","leoparddelamour":"pred","kakapo":"carap","requindugroenland":"charo","gorilledesplaines":"colosse","ourspolaire":"pred","baleinebleue":"colosse","ayeaye":"charo","pangolin":"carap","tigredubengale":"pred","jaguar":"pred","pandageant":"colosse","aigleroyal":"pred","crocodilemarin":"pred","meduseboite":"venin","oursgrizzli":"colosse","girafe":"colosse","elephantdafrique":"colosse","pygargueateteblanche":"pred","grenouilledoree":"venin","loupgris":"pred","mambanoir":"venin","bisondeurope":"colosse","hippopotame":"colosse","manchotempereur":"colosse","morse":"colosse","pieuvre":"venin","raiemanta":"colosse","dauphin":"proie","koala":"proie","anacondavert":"colosse","cameleon":"carap","martinetnoir":"proie","colibri":"proie","chouetteeffraie":"pred","scorpionempereur":"venin","mouffette":"carap","hyenetachetee":"charo","tortuegeantedesgalapagos":"carap","mygale":"venin","porcepic":"carap","poissonglobe":"venin","petitpingouin":"proie","piranha":"charo","anguilleelectrique":"venin","veuvenoire":"venin","autruche":"proie","renardpolaire":"charo","zebre":"proie","rhinocerosblanc":"colosse","macareuxmoine":"proie","loutredemer":"proie","castor":"carap","blaireau":"carap","sanglier":"charo","ecureuilroux":"proie","cerfelaphe":"proie","moineaudomestique":"charo","corbeaufreux":"charo","mesangecharbonniere":"charo","pigeonbiset":"charo","bourdon":"venin","lievre":"proie","coccinelle":"carap","libellule":"proie","papillonmonarque":"venin","fourmirousse":"venin","lombric":"charo","carpe":"charo","escargotdebourgogne":"carap","heroncendre":"charo","vipereaspic":"venin","crapaudcommun":"venin","lezarddesmurailles":"carap","goldenretriever":"proie","bergerallemand":"pred","labradorretriever":"proie","medusecommune":"venin","caniche":"proie","teckel":"proie","beagle":"proie","bouledoguefrancais":"proie","dalmatien":"proie","shibainu":"proie","corgi":"proie","bordercollie":"proie","huskysiberien":"proie","bergerbelgemalinois":"pred","levriergreyhound":"proie","schipperke":"proie","bouvierbernois":"colosse","samoyede":"proie","dogueallemand":"colosse","saintbernard":"colosse","basenji":"proie","bouvierdesflandres":"colosse","akitainu":"colosse","sphynx":"pred","chiendesainthubert":"colosse","xoloitzcuintle":"proie","lundehundnorvegien":"proie","chienlouptchecoslovaque":"pred","britishshorthair":"pred","siamois":"pred","persan":"pred","chatdegouttieretigre":"pred","bengal":"pred","ragdoll":"pred","chatdesforetsnorvegiennes":"pred","sacredebirmanie":"pred","chartreux":"pred","mauegyptien":"pred","abyssin":"pred","turcdevan":"pred","korat":"pred","chatdepallas":"pred","singapura":"pred","thylacine":"pred","dodo":"proie","serval":"pred","lynxboreal":"pred","caracal":"pred","aurochs":"colosse","quagga":"proie","rhytinedesteller":"colosse","pigeonmigrateuramericain":"proie","grandpingouin":"proie","mammouthlaineux":"colosse","tigredejava":"pred","baiji":"proie","aigledehaast":"pred","moageant":"colosse","spinosaure":"pred","paresseuxgeantmegatherium":"colosse","cerfgeantmegaceros":"colosse","rhinoceroslaineux":"colosse","smilodon":"pred","tyrannosaure":"pred","glyptodon":"carap","stegosaure":"carap","brachiosaure":"colosse","velociraptor":"pred","triceratops":"colosse","pteranodon":"proie","ankylosaure":"carap","mosasaure":"pred","paon":"proie","capybara":"proie","trilobite":"carap","archeopteryx":"proie","megalodon":"pred","titanoboa":"colosse","hippocampe":"carap","lemurcatta":"proie","fennec":"charo","flamantrose":"proie","wombat":"carap","loupacriniere":"charo","toucan":"charo","quokka":"charo","pandaroux":"proie","arahyacinthe":"proie","tapir":"colosse","harfangdesneiges":"pred","morphobleu":"proie","mantereligieuse":"pred","narval":"colosse","requinmarteau":"pred","iguanemarin":"carap","casoar":"colosse","diabledetasmanie":"charo","poulpedumbo":"proie","tarsier":"proie","baudroieabyssale":"pred","kiwi":"proie","requinbaleine":"colosse","oursesprit":"colosse","oursalunettes":"colosse"}/*FIN*/;
const clOf=c=>CLASSE[c.id]||'proie';
/* Force de 1 à 10 : rang de l'animal parmi tous (stats et rareté) ; coût selon la force */
const FORCE=(()=>{const sc=c=>c.s.reduce((a,b)=>a+b,0)+RAR[c.r].o*25,ord=CARDS.slice().sort((a,b)=>sc(a)-sc(b)),f={};
  ord.forEach((c,i)=>f[c.id]=1+Math.floor(i*10/ord.length));return f})();
const COST=[0,1,1,2,2,3,3,4,5,5,6];
const fOf=c=>FORCE[c.id],kOf=c=>COST[FORCE[c.id]];
const beats=(a,b)=>CL[a].bat===b;
function badge(c){const k=clOf(c);return `<span class="dbadge" title="${CL[k].n}">${CL[k].e}<b>${fOf(c)}</b><i>⚡${kOf(c)}</i></span>`}

/* ================= points ================= */
let pts=ld('pts',100);
function setPts(v){pts=Math.max(0,Math.round(v));sv('pts',pts);const e=$('ptsN');if(e)e.textContent=pts.toLocaleString('fr-FR')}
setPts(pts);
const fr=v=>v.toLocaleString('fr-FR');
function giveOne(id){col[id]=(col[id]||0)+1;sv('col',col)}
function takeOne(id){if(!col[id])return false;col[id]--;if(!col[id])delete col[id];sv('col',col);return true}

/* ================= duel « Chaîne alimentaire » ================= */
const TEAM=8,ENERGY=17,BONUS=3,ROUNDS=5,WIN=3,DAILY=5;
let team=ld('team',[]),DU=null,teamEdit=false;
const today=()=>{const d=new Date();return d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate()};
let dw=ld('dw',{d:0,n:0});
function autoTeam(){
  /* les plus efficaces (force par point de coût) d'abord, en gardant au plus 2 cartes à 5 ou 6 de coût */
  const own=owned().slice().sort((a,b)=>(fOf(b)/kOf(b))-(fOf(a)/kOf(a))||fOf(b)-fOf(a));
  const big=owned().filter(c=>kOf(c)>=5).sort((a,b)=>fOf(b)-fOf(a)).slice(0,2);
  const t=big.map(c=>c.id);own.forEach(c=>{if(t.length<TEAM&&!t.includes(c.id))t.push(c.id)});
  team=t.slice(0,TEAM);sv('team',team);
}
function teamCards(){
  team=team.filter(id=>col[id]&&BY[id]);
  const cs=team.map(id=>BY[id]);
  /* collection trop petite : la Naturaliste prête des cartes simples */
  const loan=shuffle(CARDS.filter(c=>fOf(c)<=4&&!team.includes(c.id))).slice(0,Math.max(0,TEAM-cs.length));
  return cs.map(c=>({c,loan:false})).concat(loan.map(c=>({c,loan:true})));
}
function oppTeam(mine){
  /* même total de force que le joueur, à 3 points près */
  const goal=mine.reduce((a,x)=>a+fOf(x.c),0);let bestT=null,bd=1e9;
  for(let t=0;t<60;t++){const cs=shuffle(CARDS.slice()).slice(0,TEAM),d=Math.abs(cs.reduce((a,c)=>a+fOf(c),0)-goal);if(d<bd){bd=d;bestT=cs}if(d<=3)break}
  return bestT.map(c=>({c}));
}
function newDuel(){
  const me=teamCards();
  DU={me:{hand:me,nrg:ENERGY,pts:0},op:{hand:oppTeam(me),nrg:ENERGY,pts:0},n:0,sel:null,last:null,over:false,log:[]};
}
/* force jouée : force de la carte, +3 si sa classe bat celle d'en face */
function val(x,y){if(!x)return{v:0,b:0};const b=y&&beats(clOf(x.c),clOf(y.c))?BONUS:0;return{v:fOf(x.c)+b,b}}
function aiPick(s,left){
  const ok=s.hand.filter(x=>kOf(x.c)<=s.nrg);if(!ok.length)return null;
  const target=s.nrg/Math.max(1,left);
  return ok.map(x=>({x,sc:fOf(x.c)-Math.abs(kOf(x.c)-target)*1.3+Math.random()*2.5})).sort((a,b)=>b.sc-a.sc)[0].x;
}
function resolve(x,y){
  const me=DU.me,op=DU.op,a=val(x,y),b=val(y,x);
  let r=a.v>b.v?1:a.v<b.v?-1:0;
  if(!r&&x&&y){const cx=clOf(x.c)==='carap',cy=clOf(y.c)==='carap';if(cx&&!cy)r=1;else if(cy&&!cx)r=-1;else r=Math.sign(kOf(y.c)-kOf(x.c));DU.tie=r?(cx||cy?'carap':'cheap'):''}else DU.tie=''
  if(x){me.hand.splice(me.hand.indexOf(x),1);me.nrg-=kOf(x.c)}
  if(y){op.hand.splice(op.hand.indexOf(y),1);op.nrg-=kOf(y.c)}
  if(r>0)me.pts++;else if(r<0)op.pts++;
  DU.n++;DU.last={x,y,a,b,r};DU.sel=null;
  if(me.pts>=WIN||op.pts>=WIN||DU.n>=ROUNDS)endDuel();
}
function playRound(x){
  const left=ROUNDS-DU.n,y=aiPick(DU.op,left);
  resolve(x,y);rDuel();
}
function endDuel(){
  DU.over=true;const r=DU.me.pts!==DU.op.pts?Math.sign(DU.me.pts-DU.op.pts):Math.sign(DU.me.nrg-DU.op.nrg);DU.res=r;
  if(dw.d!==today())dw={d:today(),n:0};
  let g=r>0?(dw.n<DAILY?60:10):r===0?20:10;if(r>0)dw.n++;sv('dw',dw);
  if(r>0){wins++;sv('wins',wins)}
  DU.gain=g;setPts(pts+g);
}
function rDuel(){
  const m=$('main');
  if(teamEdit)return rTeam();
  if(!DU){
    if(team.filter(id=>col[id]).length<TEAM&&owned().length>team.length)autoTeam();
    const me=teamCards(),loans=me.filter(x=>x.loan).length;
    if(dw.d!==today())dw={d:today(),n:0};
    m.innerHTML=`<h2>Duel · Chaîne alimentaire</h2><p class="lead">Contre la Naturaliste. Premier à ${WIN} manches gagnées.</p>
      <div class="cyc">${CL_ORDER.slice(0,5).map(k=>`<span>${CL[k].e} ${CL[k].n}</span>`).join('<i>›</i>')}<i>›</i><span>${CL.pred.e}</span></div>
      <p class="lead" style="text-align:center;margin-top:-4px">Chaque classe bat la suivante (+3). ${CL.carap.e} ${CL.carap.n} : gagne les égalités.</p>
      <h3 class="h3">Mon équipe (${TEAM} cartes)</h3>
      <div class="grid dgrid">${me.map(x=>`<button data-id="${x.c.id}">${card(x.c,true)}${badge(x.c)}${x.loan?'<span class="loan">prêt</span>':''}</button>`).join('')}</div>
      ${loans?`<p class="lead" style="margin-top:10px">Il vous manque ${loans} carte${loans>1?'s':''} : la Naturaliste vous les prête. Ouvrez des sachets pour jouer avec les vôtres.</p>`:''}
      <div class="row" style="margin-top:14px"><button class="btn" id="go">Commencer un duel</button><button class="btn ghost" id="edit">Changer mon équipe</button></div>
      <p class="lead" style="text-align:center;margin-top:10px">Victoire : ${dw.n<DAILY?60:10} points (${Math.max(0,DAILY-dw.n)} victoire${DAILY-dw.n>1?'s':''} à plein tarif aujourd'hui). Nul : 20. Défaite : 10.</p>
      <details class="rules"><summary>Comment jouer</summary>
      <p>Chaque carte a une <b>classe</b>, une <b>force</b> (de 1 à 10) et un <b>coût</b> en énergie ⚡.</p>
      <p>Vous avez ${ENERGY} ⚡ pour tout le duel. À chaque manche, chacun pose une carte en secret, puis on retourne : la plus forte gagne la manche.</p>
      <p>Si votre classe bat celle d'en face, +3 de force. En cas d'égalité, la Carapace gagne, sinon la carte la moins chère gagne.</p><p>Après 5 manches sans vainqueur, celui à qui il reste le plus d'énergie gagne.</p>
      <p>Les grosses cartes coûtent cher : gardez de l'énergie pour les dernières manches. Une petite carte bien placée bat une grande.</p></details>`;
    m.querySelectorAll('.dgrid [data-id]').forEach(b=>b.addEventListener('click',()=>show(BY[b.dataset.id])));
    $('go').addEventListener('click',()=>{newDuel();rDuel()});
    $('edit').addEventListener('click',()=>{teamEdit=true;rDuel()});
    return;
  }
  const me=DU.me,op=DU.op,L=DU.last;
  if(DU.over){
    const r=DU.res;
    m.innerHTML=`<div class="end"><p class="lead" style="margin:0">Fin du duel</p><div class="big${r<0?' ko':''}">${r>0?'Victoire':r<0?'Défaite':'Match nul'}</div>
      <p style="font-size:20px;margin:0 0 6px">${me.pts} – ${op.pts}</p><p class="lead">+${DU.gain} points pour le Marché.</p>
      <div class="row"><button class="btn" id="again">Rejouer</button><button class="btn ghost" id="back">Mon équipe</button></div></div>`;
    $('again').addEventListener('click',()=>{newDuel();rDuel()});$('back').addEventListener('click',()=>{DU=null;rDuel()});return;
  }
  const pip=n=>`<div class="pips">${Array.from({length:WIN},(_,i)=>`<i class="${i<n?'on':''}"></i>`).join('')}</div>`;
  const slot=(x,v,w)=>x?`${card(x.c,true)}${badge(x.c)}<div class="val ${w}">${v.v}</div><div class="parts">${v.b?'+'+v.b+' classe':'&nbsp;'}</div>`:`<div class="empty">${L?'aucune carte':'en attente'}</div><div class="val">${L?0:''}</div>`;
  let msg='';
  if(L){const cx=L.x&&clOf(L.x.c),cy=L.y&&clOf(L.y.c);
    msg=L.r>0?'<b>Manche gagnée</b>':L.r<0?'<b class="ko">Manche perdue</b>':'<b>Égalité</b>';
    if(L.a.b)msg+=`${CL[cx].n} bat ${CL[cy].n}.`;else if(L.b.b)msg+=`${CL[cy].n} bat ${CL[cx].n}.`;
    else if(DU.tie==='carap')msg+='La Carapace gagne l\'égalité.';else if(DU.tie==='cheap')msg+='Égalité de force : la carte la moins chère gagne.';}
  else msg='<b>Manche 1</b>Choisissez une carte, puis « Jouer ».';
  const canAny=me.hand.some(x=>kOf(x.c)<=me.nrg);
  m.innerHTML=`<div class="score"><div><b>Vous</b>${pip(me.pts)}</div><div class="sc">${me.pts} – ${op.pts}</div><div><b>Naturaliste</b>${pip(op.pts)}</div></div>
    <div class="nrg"><span>Vous ⚡ <b>${me.nrg}</b>/${ENERGY}</span><span>Manche ${Math.min(DU.n+1,ROUNDS)}/${ROUNDS}</span><span>Naturaliste ⚡ <b>${op.nrg}</b></span></div>
    <div class="arena"><div class="slot"><span class="lab">Vous</span>${L?slot(L.x,L.a,L.r>0?'w':L.r<0?'l':''):'<div class="empty">votre carte</div>'}</div>
      <div class="vs"><b>VS</b></div>
      <div class="slot"><span class="lab">Naturaliste</span>${L?slot(L.y,L.b,L.r<0?'w':L.r>0?'l':''):'<div class="empty">carte cachée</div>'}</div></div>
    <div class="msg">${msg}</div>
    <div class="grid dgrid hand8">${me.hand.map((x,i)=>{const off=kOf(x.c)>me.nrg;return `<button data-h="${i}" class="${DU.sel===x?'sel':''}"${off?' disabled':''}>${card(x.c,true)}${badge(x.c)}${off?'<span class="loan">trop cher</span>':''}</button>`}).join('')}</div>
    <div class="row" style="margin-top:12px">${canAny?`<button class="btn" id="playB"${DU.sel?'':' disabled'}>${DU.sel?'Jouer '+esc(DU.sel.c.n):'Choisissez une carte'}</button>`:'<button class="btn" id="passB">Plus assez d\'énergie : passer</button>'}
      <button class="btn ghost" id="quit">Abandonner</button></div>`;
  m.querySelectorAll('[data-h]').forEach(b=>b.addEventListener('click',()=>{const x=me.hand[+b.dataset.h];DU.sel=DU.sel===x?null:x;rDuel()}));
  if($('playB'))$('playB').addEventListener('click',()=>{if(DU.sel)playRound(DU.sel)});
  if($('passB'))$('passB').addEventListener('click',()=>playRound(null));
  $('quit').addEventListener('click',()=>{if($('quit').dataset.ok){DU.me.pts=0;DU.op.pts=WIN;endDuel();rDuel()}else{$('quit').dataset.ok=1;$('quit').textContent='Sûr ? Touchez encore'}});
}
function rTeam(){
  const m=$('main'),own=owned().slice().sort((a,b)=>fOf(b)-fOf(a)||a.n.localeCompare(b.n,'fr'));
  m.innerHTML=`<h2>Mon équipe</h2><p class="lead">Choisissez ${TEAM} cartes (${team.length}/${TEAM}). Touchez une carte pour l'ajouter ou la retirer.</p>
    <div class="row"><button class="btn" id="ok">Valider</button><button class="btn ghost" id="auto">Équipe automatique</button></div>
    <div class="tools" style="margin-top:12px"><input class="search" id="q" type="search" placeholder="Rechercher un animal" autocomplete="off"></div>
    <div class="grid dgrid">${own.map(c=>{const k=team.indexOf(c.id);return `<button data-id="${c.id}" data-n="${esc(norm(c.n))}" aria-pressed="${k>=0}"${k>=0?' class="pick"':''}>${card(c,true)}${badge(c)}</button>`}).join('')}</div>
    ${own.length?'':'<p class="lead">Votre album est vide : ouvrez des sachets.</p>'}`;
  $('ok').addEventListener('click',()=>{teamEdit=false;sv('team',team);rDuel()});
  $('auto').addEventListener('click',()=>{autoTeam();rTeam()});
  m.querySelectorAll('.grid [data-id]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.id,k=team.indexOf(id);
    if(k>=0)team.splice(k,1);else if(team.length<TEAM)team.push(id);else{toast(TEAM+' cartes au plus');return}
    const y=m.scrollTop;sv('team',team);rTeam();m.scrollTop=y}));
  bindSearch(m,()=>{});
}
if(!team.length&&owned().length)autoTeam();

/* ================= actions sur une carte (fiche en grand), comme dans ClubDeck ================= */
const defVal=c=>r5(cote(c)/10);
function viewActs(c){
  const box=$('viewAct'),n=col[c.id]||0;
  if(!n||tab==='demo'||!ST.hidden){box.innerHTML='';return}
  box.innerHTML=`<div class="vact"><span>${n} exemplaire${n>1?'s':''} · cote ${fr(cote(c))} · ${CL[clOf(c)].e} ${CL[clOf(c)].n}, force ${fOf(c)}, ⚡${kOf(c)}</span>
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
