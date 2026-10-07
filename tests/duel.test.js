/* Tests du moteur WILD DUEL : node tests/duel.test.js */
const assert = require('assert');
const WD = require('../duel.js');
const mk = (id, cost, p, v, i) => ({ id, name: id, cost, stats: { power: p, speed: v, intelligence: i } });
const deck = () => Array.from({ length: 30 }, (_, n) => mk('a' + n, 1 + (n % 5), 5, 5, 5));
let pass = 0;
const t = (name, f) => { f(); pass++; console.log('ok -', name) };
function ready(seed) { const G = WD.newGame(deck(), deck(), { seed: seed || 7 }); WD.mulligan(G, 0, []); WD.mulligan(G, 1, []); return G }

t('un joueur ne peut pas jouer hors de son tour', () => {
  const G = ready(); const other = 1 - G.active;
  assert.strictEqual(WD.playCard(G, other, G.players[other].hand[0].uid).ok, false);
  assert.strictEqual(WD.endTurn(G, other).ok, false);
});
t('un joueur ne peut pas payer un coût supérieur à son énergie', () => {
  const G = ready(), p = G.active, P = G.players[p];
  P.hand.push({ uid: 'cher', id: 'x', name: 'x', cost: 9, stats: { power: 1, speed: 1, intelligence: 1 }, effects: [] });
  const r = WD.playCard(G, p, 'cher'); assert.strictEqual(r.ok, false); assert.match(r.error, /énergie/);
});
t('un joueur ne peut avoir qu\'une carte active', () => {
  const G = ready(), p = G.active, P = G.players[p]; P.energy = 10;
  WD.playCard(G, p, P.hand[0].uid); WD.playCard(G, p, P.hand[0].uid);
  assert.ok(P.activeCard); assert.strictEqual(typeof P.activeCard, 'object'); assert.ok(!Array.isArray(P.activeCard));
});
t('remplacer la carte envoie l\'ancienne dans la défausse', () => {
  const G = ready(), p = G.active, P = G.players[p]; P.energy = 10;
  WD.playCard(G, p, P.hand[0].uid); const old = P.activeCard;
  assert.ok(WD.playCard(G, p, P.hand[0].uid).ok);
  assert.ok(P.discard.includes(old)); assert.notStrictEqual(P.activeCard, old);
});
t('une seule substitution par tour', () => {
  const G = ready(), p = G.active, P = G.players[p]; P.energy = 10;
  WD.playCard(G, p, P.hand[0].uid); WD.playCard(G, p, P.hand[0].uid);
  const r = WD.playCard(G, p, P.hand[0].uid); assert.strictEqual(r.ok, false); assert.match(r.error, /remplacement/);
});
t('le calcul des dégâts est correct', () => {
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5, 6, 7, 9, -2].map(WD.damageFor), [0, 1, 1, 2, 2, 3, 3, 4, 4, 0]);
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p];
  A.activeCard = { uid: 'o', name: 'Orque', cost: 6, stats: { power: 9, speed: 8, intelligence: 9 }, effects: [] };
  D.activeCard = { uid: 'r', name: 'Renard', cost: 6, stats: { power: 5, speed: 8, intelligence: 8 }, effects: [] };
  const hp = D.health; WD.attack(G, p, 'power'); assert.strictEqual(D.health, hp - 2);
});
t('riposte : l\'attaquant plus faible perd 1 PV', () => {
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p];
  A.activeCard = { uid: 'a', name: 'A', cost: 1, stats: { power: 2, speed: 2, intelligence: 2 }, effects: [] };
  D.activeCard = { uid: 'b', name: 'B', cost: 1, stats: { power: 8, speed: 8, intelligence: 8 }, effects: [] };
  const hp = A.health; WD.attack(G, p, 'power'); assert.strictEqual(A.health, hp - 1);
});
t('la statistique utilisée est verrouillée', () => {
  const G = ready(), p = G.active, P = G.players[p]; P.energy = 10;
  WD.playCard(G, p, P.hand[0].uid); WD.attack(G, p, 'power'); WD.endTurn(G, p);
  const q = G.active; WD.endTurn(G, q);
  assert.strictEqual(P.lockedStat, 'power'); const r = WD.attack(G, p, 'power'); assert.strictEqual(r.ok, false);
  assert.ok(WD.attack(G, p, 'speed').ok);
});
t('les PV ne descendent pas sous zéro', () => {
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p]; D.health = 1;
  A.activeCard = { uid: 'o', name: 'O', cost: 1, stats: { power: 10, speed: 1, intelligence: 1 }, effects: [] };
  D.activeCard = { uid: 'r', name: 'R', cost: 1, stats: { power: 1, speed: 1, intelligence: 1 }, effects: [] };
  WD.attack(G, p, 'power'); assert.strictEqual(D.health, 0);
});
t('la victoire est détectée à 0 PV', () => {
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p]; D.health = 2;
  A.activeCard = { uid: 'o', name: 'O', cost: 1, stats: { power: 10, speed: 1, intelligence: 1 }, effects: [] };
  D.activeCard = { uid: 'r', name: 'R', cost: 1, stats: { power: 1, speed: 1, intelligence: 1 }, effects: [] };
  WD.attack(G, p, 'power'); assert.strictEqual(G.phase, 'GAME_OVER'); assert.strictEqual(G.winner, p);
  assert.strictEqual(WD.endTurn(G, p).ok, false);
});
t('la main adverse reste privée', () => {
  const G = ready(); const v = WD.view(G, 0);
  assert.ok(Array.isArray(v.me.hand)); assert.strictEqual(v.opponent.hand, undefined); assert.strictEqual(v.opponent.deck, undefined);
  assert.strictEqual(typeof v.opponent.handCount, 'number');
});
t('effet : Orque gagne un duel Intelligence = +1 dégât', () => {
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p];
  A.activeCard = { uid: 'o', name: 'Orque', cost: 6, stats: { power: 9, speed: 8, intelligence: 9 }, effects: ['orca_collective_intelligence'] };
  D.activeCard = { uid: 'r', name: 'R', cost: 6, stats: { power: 1, speed: 1, intelligence: 8 }, effects: [] };
  const hp = D.health; WD.attack(G, p, 'intelligence'); assert.strictEqual(D.health, hp - 2);
});
t('effet : Carapace réduit les premiers dégâts de 1', () => {
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p];
  A.activeCard = { uid: 'o', name: 'O', cost: 5, stats: { power: 9, speed: 1, intelligence: 1 }, effects: [] };
  D.activeCard = { uid: 't', name: 'Tortue', cost: 5, stats: { power: 5, speed: 1, intelligence: 7 }, effects: ['tortoise_shell'] };
  const hp = D.health; WD.attack(G, p, 'power'); assert.strictEqual(D.health, hp - 1);
});
t('Outsider : la carte moins chère gagne +1 par point de coût d\'écart (+2 au plus)', () => {
  const G = ready(), p = G.active, A = G.players[p], D = G.players[1 - p];
  A.activeCard = { uid: 'g', name: 'Gros', cost: 8, stats: { power: 8, speed: 1, intelligence: 1 }, effects: [] };
  D.activeCard = { uid: 'p', name: 'Petit', cost: 3, stats: { power: 7, speed: 1, intelligence: 1 }, effects: [] };
  const r = WD.attack(G, p, 'power'); assert.strictEqual(r.b, 9); assert.strictEqual(r.to, p);
});
t('mulligan : 3 cartes au plus, une seule fois', () => {
  const G = WD.newGame(deck(), deck(), { seed: 3 }); const h = G.players[0].hand.map(c => c.uid);
  assert.strictEqual(WD.mulligan(G, 0, h.slice(0, 4)).ok, false);
  assert.ok(WD.mulligan(G, 0, h.slice(0, 3)).ok); assert.strictEqual(G.players[0].hand.length, 5);
  assert.strictEqual(WD.mulligan(G, 0, []).ok, false);
});
t('énergie : +1 par tour, 10 au plus', () => {
  const G = ready(); for (let i = 0; i < 30 && G.phase === 'PLAY'; i++) WD.endTurn(G, G.active);
  assert.strictEqual(Math.max(G.players[0].maxEnergy, G.players[1].maxEnergy), 10);
});
t('partie IA contre IA : se termine et respecte la règle', () => {
  for (let s = 1; s <= 50; s++) { const G = WD.newGame(deck(), deck(), { seed: s }); WD.aiMulligan(G, 0); WD.aiMulligan(G, 1);
    let n = 0; while (G.phase === 'PLAY' && n++ < 200) WD.aiTurn(G, G.active, s % 2 ? 'expert' : 'normal');
    assert.strictEqual(G.phase, 'GAME_OVER'); }
});
console.log(pass + ' tests réussis');
