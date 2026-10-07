/* Tests du moteur L'Affût : node tests/affut.test.js */
const AF = require('../affut.js');
let ok = 0, ko = 0;
const t = (n, f) => { try { f(); ok++; console.log('✓ ' + n) } catch (e) { ko++; console.log('✗ ' + n + ' : ' + e.message) } };
const eq = (a, b, m) => { if (a !== b) throw new Error((m || '') + ' attendu ' + b + ', obtenu ' + a) };
const C = (id, st, k, p = 'Savane', r = 'bronze') => ({ id, n: id, st, k, p, r });
const many = (n, k = 4) => Array.from({ length: n }, (_, i) => C('a' + i, [4, 4, 4], k));
const T = AF.TERRAINS.find(x => x.id === 'savane');

t('valeur : stat doublée par le terrain et bonus chez soi', () => {
  eq(AF.value(C('x', [5, 6, 7], 5), 'V', T), 6 * 2 + AF.CFG.HOME);
  eq(AF.value(C('x', [5, 6, 7], 5, 'Océans'), 'P', T), 5);
});
t('outsider plafonné', () => { eq(AF.outsider(C('a', [1, 1, 1], 1), C('b', [9, 9, 9], 9)), AF.CFG.OUT); eq(AF.outsider(C('b', [9, 9, 9], 9), C('a', [1, 1, 1], 1)), 0) });
t('check : deck valide de 12 cartes dans le budget', () => { const r = AF.check(many(12, 4)); eq(r.ok, true); eq(r.cost, 48) });
t('check : budget dépassé', () => eq(AF.check(many(12, 5)).ok, false));
t('canAdd : légende, noires, stars, doublon', () => {
  const d = [C('L', [9, 9, 9], 6, 'Savane', 'legende')];
  if (!AF.canAdd(d, C('L2', [9, 9, 9], 6, 'Savane', 'legende'))) throw new Error('2e légende acceptée');
  if (!AF.canAdd(d, d[0])) throw new Error('doublon accepté');
  const s = [C('s1', [9, 9, 9], 8), C('s2', [9, 9, 9], 8)];
  if (!AF.canAdd(s, C('s3', [9, 9, 9], 9))) throw new Error('3e star acceptée');
  const n = [C('n1', [5, 5, 5], 3, 'Savane', 'noire'), C('n2', [5, 5, 5], 3, 'Savane', 'noire')];
  if (!AF.canAdd(n, C('n3', [5, 5, 5], 3, 'Savane', 'noire'))) throw new Error('3e noire acceptée');
});
t('autoDeck respecte toutes les règles', () => {
  const pool = Array.from({ length: 60 }, (_, i) => C('p' + i, [1 + i % 10, 1 + (i * 3) % 10, 1 + (i * 7) % 10], 1 + i % 10, 'Savane', i % 13 === 0 ? 'legende' : i % 7 === 0 ? 'noire' : 'or'));
  const d = AF.autoDeck(pool); const r = AF.check(d); if (!r.ok) throw new Error(r.errs.join(', '));
});
t('instinct : budget non dépensé', () => { const G = AF.newGame(many(12, 3), many(12, 4)); eq(G.s[0].inst, Math.floor((50 - 36) / AF.CFG.INSTINCT)); eq(G.s[1].inst, 0) });
t('même épreuve : la plus forte gagne, carte défaussée et pioche', () => {
  const G = AF.newGame(many(12), many(12)); G.terrains[0] = T; G.s[0].inst = G.s[1].inst = 0;
  const a = G.s[0].hand[0], b = G.s[1].hand[0]; a.st = [8, 4, 4]; b.st = [5, 4, 4];
  const r = AF.resolve(G, { card: a, stat: 'P' }, { card: b, stat: 'P' });
  eq(r.mode, 'face'); eq(r.r, 1); eq(G.s[0].pts, 1); eq(G.s[0].hand.length, 5); eq(G.s[0].played[0], a);
});
t('épreuves différentes : la plus grande avance gagne', () => {
  const G = AF.newGame(many(12), many(12)); G.terrains[0] = T; G.s[0].inst = G.s[1].inst = 0;
  const a = G.s[0].hand[0], b = G.s[1].hand[0]; a.st = [9, 2, 2]; b.st = [3, 5, 2]; a.p = b.p = 'Océans';
  const r = AF.resolve(G, { card: a, stat: 'P' }, { card: b, stat: 'V' });
  eq(r.mode, 'ecart'); eq(r.ra, 6); eq(r.rb, 6); /* égalité, même coût */ eq(r.tie, 'draw');
});
t('égalité : la moins chère gagne', () => {
  const G = AF.newGame(many(12), many(12)); G.terrains[0] = T; G.s[0].inst = G.s[1].inst = 0;
  const a = G.s[0].hand[0], b = G.s[1].hand[0]; a.st = [7, 1, 1]; b.st = [6, 1, 1]; a.k = 5; b.k = 4; a.p = b.p = 'Océans';
  const r = AF.resolve(G, { card: a, stat: 'P' }, { card: b, stat: 'P' }); /* 7 contre 6+1 outsider */
  eq(r.tie, 'cheap'); eq(r.r, -1);
});
t('partie complète : finit en 3 à 5 manches', () => {
  for (let g = 0; g < 200; g++) { const G = AF.newGame(many(12), many(12)); let n = 0;
    while (!G.over) { AF.resolve(G, AF.ai(G, 0, 'normal'), AF.ai(G, 1, 'expert')); n++ }
    if (n < 3 || n > 5) throw new Error(n + ' manches'); }
});
t('carte hors main refusée', () => { const G = AF.newGame(many(12), many(12)); let e; try { AF.resolve(G, { card: C('z', [1, 1, 1], 1), stat: 'P' }, { card: G.s[1].hand[0], stat: 'P' }) } catch (x) { e = x } if (!e) throw new Error('acceptée') });
console.log(ok + ' réussis, ' + ko + ' échoués'); process.exit(ko ? 1 : 0);
