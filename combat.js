/* Le Vivant : duel façon Pokémon TCG Pocket, avec de vrais animaux.
   Ce fichier ne touche pas à la page : il calcule les fiches de combat et fait avancer la partie.
   Il a besoin de CARDS et RAR (script principal). Il sert aussi aux simulations d'équilibre. */

/* ---------- types et faiblesses (+20 dégâts), d'après la nature ---------- */
const TYPES={
  eau:{n:'Eau',e:'💧',weak:'foret',why:'les ours et les loutres pêchent'},
  foret:{n:'Forêt',e:'🌿',weak:'venin',why:'les serpents se cachent sous les feuilles'},
  savane:{n:'Savane',e:'☀️',weak:'eau',why:'les crocodiles guettent au point d\'eau'},
  glace:{n:'Glace',e:'❄️',weak:'savane',why:'la chaleur fait fondre la glace'},
  ciel:{n:'Ciel',e:'🌪️',weak:'glace',why:'le froid cloue les oiseaux au sol'},
  venin:{n:'Venin',e:'☠️',weak:'ciel',why:'l\'aigle et le serpentaire chassent les serpents'},
  insecte:{n:'Insecte',e:'🐞',weak:'ciel',why:'les oiseaux mangent les insectes'},
  domestique:{n:'Domestique',e:'🏠',weak:'venin',why:'une seule morsure suffit'},
  ancien:{n:'Ancien',e:'🦴',weak:'glace',why:'l\'ère glaciaire les a fait disparaître'}
};
const FAM_TYPE={'Océans':'eau','Rivières':'eau','Forêts':'foret','Savane':'savane','Montagnes':'glace','Ciel':'ciel','Reptiles':'venin','Petites bêtes':'insecte','Chiens':'domestique','Chats':'domestique','Disparus':'ancien','Préhistoire':'ancien'};
const r10=v=>Math.round(v/10)*10;

/* ---------- fiche de combat d'un animal, tirée de ses stats ---------- */
function makeFiche(c){
  const fx=c.fx||{},bonus=fx.self||0;
  const [VIT,FOR,TAI,LON,VEN,DEF]=c.s.map(v=>Math.min(99,v+bonus));
  const type=(VEN>=50&&c.p!=='Petites bêtes')?'venin':FAM_TYPE[c.p]||'foret';
  const hp=Math.max(40,Math.min(180,r10(40+TAI*.75+DEF*.55+LON*.15)));
  const pow=FOR*.6+VEN*.45+VIT*.25+TAI*.15;
  const cost=pow<45?1:pow<75?2:3;
  const dmg=Math.max(10,r10(cost===1?10+pow*.45:cost===2?30+pow*.4:50+pow*.55));
  let eff=null;
  if(VEN>=40)eff={k:'poison',t:'Empoisonne : 10 dégâts à la fin de chaque tour adverse.'};
  else if(fx.allyPack)eff={k:'meute',p:c.p,t:'+10 dégâts par '+c.p.replace(/s$/,'')+' sur votre banc.'};
  else if(fx.immune||DEF>=80)eff={k:'armure',t:'Subit 20 dégâts de moins.'};
  else if(fx.revenge||fx.revive)eff={k:'revanche',t:'+30 dégâts si un de vos animaux a été mis KO au tour d\'avant.'};
  else if(VIT>=85)eff={k:'vif',t:'Retraite gratuite.'};
  const retreat=eff&&eff.k==='vif'?0:VIT>=65?1:VIT>=25?2:3;
  return{type,hp,cost,dmg,eff,retreat,atk:c.pw||'Attaque',pts:hp>=150?2:1};
}
const FICHE={};CARDS.forEach(c=>FICHE[c.id]=makeFiche(c));
const fiche=c=>FICHE[c.id];

/* ---------- partie ---------- */
const GOAL_PTS=3,DECK_N=20,BENCH=3;
function shuf(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a}
let uid=0;
const mon=c=>({u:++uid,c,f:fiche(c),dmg:0,en:0,poison:false});
function newGame(deckA,deckB,aFirst){
  const side=deck=>{const d=shuf(deck).map(mon);return{deck:d,hand:d.splice(0,5),act:null,bench:[],pts:0,koLast:false}};
  const G={s:[side(deckA),side(deckB)],turn:aFirst?0:1,n:0,energy:false,over:false,win:-1,log:[]};
  return G;
}
const other=i=>1-i;
function startTurn(G){
  const p=G.s[G.turn];
  if(p.deck.length&&p.hand.length<10)p.hand.push(p.deck.shift());
  G.energy=G.n>0; /* le tout premier joueur n'a pas d'énergie */
  G.attacked=false;G.retreated=false;
}
function canAttack(m){return m&&m.en>=m.f.cost}
function damageOf(G,i,a,d){
  let v=a.f.dmg;const me=G.s[i];
  if(a.f.eff){const k=a.f.eff.k;
    if(k==='meute')v+=10*me.bench.filter(b=>b.c.p===a.c.p).length;
    if(k==='revanche'&&me.koLast)v+=30;}
  if(TYPES[d.f.type].weak===a.f.type)v+=20;
  if(d.f.eff&&d.f.eff.k==='armure')v=Math.max(0,v-20);
  return v;
}
function ko(G,i){
  /* l'animal actif du joueur i est mis KO */
  const p=G.s[i],q=G.s[other(i)],m=p.act;
  q.pts+=m.f.pts;p.act=null;p.koLast=true;
  G.log.push({ko:m.c.id,side:i,pts:m.f.pts});
  if(q.pts>=GOAL_PTS){G.over=true;G.win=other(i);return}
  if(!p.bench.length&&!p.hand.length&&!p.deck.length){G.over=true;G.win=other(i);return}
}
function attack(G){
  const i=G.turn,a=G.s[i].act,dSide=G.s[other(i)],d=dSide.act;
  if(!canAttack(a)||!d||G.attacked)return false;
  const v=damageOf(G,i,a,d);d.dmg+=v;
  if(a.f.eff&&a.f.eff.k==='poison')d.poison=true;
  G.log.push({atk:a.c.id,to:d.c.id,v,side:i});G.attacked=true;
  if(d.dmg>=d.f.hp)ko(G,other(i));
  return v;
}
function endTurn(G){
  if(G.over)return;
  const i=G.turn,foe=G.s[other(i)];
  /* poison : l'animal empoisonné de l'adversaire perd 10 PV */
  if(foe.act&&foe.act.poison){foe.act.dmg+=10;G.log.push({poison:foe.act.c.id,side:other(i)});if(foe.act.dmg>=foe.act.f.hp)ko(G,other(i))}
  if(G.over)return;
  G.s[other(i)].koLast=G.s[other(i)].koLast; /* gardé pour la revanche au tour suivant */
  G.s[i].koLast=false;
  G.turn=other(i);G.n++;
  if(G.n>=60){G.over=true;const a=G.s[0].pts,b=G.s[1].pts;G.win=a>b?0:b>a?1:-2;return}
}
function needActive(p){return!p.act}
function promote(p,m){const k=p.bench.indexOf(m);if(k>=0)p.bench.splice(k,1);else{const h=p.hand.indexOf(m);if(h>=0)p.hand.splice(h,1)}p.act=m}
function toBench(p,m){if(p.bench.length>=BENCH)return false;const h=p.hand.indexOf(m);if(h<0)return false;p.hand.splice(h,1);p.bench.push(m);return true}
function attach(G,m){if(!G.energy)return false;m.en++;G.energy=false;return true}
function retreat(G,p,m){
  if(G.retreated||!p.act||!p.bench.includes(m))return false;
  const c=p.act.f.retreat;if(p.act.en<c)return false;
  p.act.en-=c;p.act.poison=false;const old=p.act;p.bench.splice(p.bench.indexOf(m),1);p.bench.push(old);p.act=m;G.retreated=true;return true;
}

/* ---------- adversaire (et joueur simulé) ---------- */
function aiSetup(G,i){
  const p=G.s[i];
  if(!p.act){const src=p.bench.length?p.bench:p.hand;if(!src.length)return;
    const best=src.slice().sort((a,b)=>(b.f.hp+b.f.dmg*1.5-b.f.cost*15)-(a.f.hp+a.f.dmg*1.5-a.f.cost*15))[0];promote(p,best)}
}
function aiTurn(G,i){
  const p=G.s[i],q=G.s[other(i)];
  aiSetup(G,i);if(!p.act){return}
  /* poser des animaux sur le banc */
  p.hand.slice().sort((a,b)=>b.f.hp-a.f.hp).forEach(m=>{if(p.bench.length<BENCH)toBench(p,m)});
  /* retraite si l'actif va mourir et qu'un remplaçant fait mieux */
  const d=q.act;
  if(d&&p.bench.length&&!G.retreated){
    const danger=canAttack(d)&&damageOf(G,other(i),d,p.act)>=p.act.f.hp-p.act.dmg;
    const better=p.bench.slice().sort((a,b)=>damageOf(G,i,b,d)-damageOf(G,i,a,d))[0];
    if(danger&&p.act.en>=p.act.f.retreat&&better&&better.f.hp-better.dmg>p.act.f.hp-p.act.dmg)retreat(G,p,better);
  }
  /* énergie : l'actif s'il lui en manque, sinon le banc le plus prometteur */
  if(G.energy){
    if(p.act.en<p.act.f.cost)attach(G,p.act);
    else{const b=p.bench.filter(m=>m.en<m.f.cost).sort((a,b)=>b.f.dmg-a.f.dmg)[0];attach(G,b||p.act)}
  }
  if(canAttack(p.act)&&q.act)attack(G);
}
/* pour la simulation : une partie entière entre deux IA */
function simGame(deckA,deckB){
  const G=newGame(deckA,deckB,Math.random()<.5);
  aiSetup(G,0);aiSetup(G,1);
  let guard=0;
  while(!G.over&&guard++<200){
    startTurn(G);
    aiSetup(G,G.turn);aiSetup(G,other(G.turn));
    aiTurn(G,G.turn);
    if(!G.over){const q=G.s[other(G.turn)];aiSetup(G,other(G.turn));if(!q.act&&!q.bench.length&&!q.hand.length){G.over=true;G.win=G.turn;break}}
    endTurn(G);
    if(!G.over){aiSetup(G,0);aiSetup(G,1)}
  }
  return G.win;
}
/* deck automatique : 20 cartes, 2 exemplaires au plus, meilleur rapport puissance / coût */
function autoDeck(own){
  /* own : liste de {c, n} (n = exemplaires possédés) */
  const val=c=>{const f=fiche(c);return f.hp*.5+f.dmg*1.2/f.cost+(f.eff?15:0)};
  const out=[];own.slice().sort((a,b)=>val(b.c)-val(a.c)).forEach(x=>{for(let k=0;k<Math.min(2,x.n);k++)if(out.length<DECK_N)out.push(x.c)});
  return out;
}
if(typeof module!=='undefined')module.exports={TYPES,FICHE,fiche,newGame,simGame,autoDeck,startTurn,attack,endTurn,promote,toBench,attach,retreat,aiTurn,aiSetup,damageOf,canAttack,GOAL_PTS,DECK_N,BENCH};
