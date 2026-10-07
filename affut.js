/* L'AFFÛT : duel de bluff et de terrain (moteur, sans affichage).
   Chaque manche : un terrain se révèle, chacun pose une carte face cachée et choisit en secret une épreuve, puis révélation.
   Deck de 12 cartes, budget de 50 points, 2 stars (coût 8+), 1 Légende et 2 Noires au plus, 1 exemplaire par animal. Premier à 3 manches. */
(function (root) {
  const CFG = { INSTINCT: 5, DECK: 12, BUDGET: 50, LEG: 1, NOIRE: 2, STARS: 2, STAR_COST: 8, OUT: 3, HAND: 5, WIN: 3, ROUNDS: 5, HOME: 2, SHOW_NEXT: 2 };
  const ST = ['P', 'V', 'I'], SN = { P: 'Puissance', V: 'Vitesse', I: 'Intelligence' };
  /* terrains : chacun double une stat ; les familles « chez elles » y gagnent +2 */
  const TERRAINS = [
    { id: 'ocean', n: 'Océan', e: '🌊', x: 'P', home: ['Océans'] },
    { id: 'montagne', n: 'Montagne', e: '🏔️', x: 'P', home: ['Montagnes', 'Ciel'] },
    { id: 'savane', n: 'Savane', e: '🌾', x: 'V', home: ['Savane', 'Chats'] },
    { id: 'marais', n: 'Marais', e: '🪷', x: 'V', home: ['Rivières', 'Reptiles'] },
    { id: 'foret', n: 'Forêt', e: '🌲', x: 'I', home: ['Forêts', 'Petites bêtes', 'Chiens'] },
    { id: 'anciennes', n: 'Terres anciennes', e: '🦴', x: 'I', home: ['Disparus', 'Préhistoire'] }
  ];
  const sv = (c, s) => c.st[{ P: 0, V: 1, I: 2 }[s]];
  /* valeur d'une carte dans une stat, sur un terrain */
  function value(c, s, T) { return sv(c, s) * (T.x === s ? 2 : 1) + (T.home.includes(c.p) ? CFG.HOME : 0) }
  /* Outsider : la carte la moins chère gagne +1 par point de coût d'écart (CFG.OUT au plus) */
  const outsider = (c, o) => Math.min(CFG.OUT, Math.max(0, o.k - c.k));

  /* ---------- deck : budget et quotas ---------- */
  function check(deck) {
    const cost = deck.reduce((a, c) => a + c.k, 0), leg = deck.filter(c => c.r === 'legende').length, noire = deck.filter(c => c.r === 'noire').length;
    const ids = new Set(deck.map(c => c.id));
    const errs = [];
    if (deck.length !== CFG.DECK) errs.push(deck.length + '/' + CFG.DECK + ' cartes');
    if (cost > CFG.BUDGET) errs.push('budget dépassé (' + cost + '/' + CFG.BUDGET + ')');
    if (leg > CFG.LEG) errs.push('1 Légende au plus');
    if (noire > CFG.NOIRE) errs.push('2 Noires au plus');
    if (deck.filter(c => c.k >= CFG.STAR_COST).length > CFG.STARS) errs.push(CFG.STARS + ' stars (coût ' + CFG.STAR_COST + '+) au plus');
    if (ids.size !== deck.length) errs.push('1 exemplaire par animal');
    return { ok: !errs.length, errs, cost, leg, noire };
  }
  function canAdd(deck, c) {
    if (deck.length >= CFG.DECK) return 'Deck complet (' + CFG.DECK + ' cartes).';
    if (deck.some(x => x.id === c.id)) return 'Déjà dans le deck (1 exemplaire par animal).';
    if (deck.reduce((a, x) => a + x.k, 0) + c.k > CFG.BUDGET) return 'Budget dépassé : retirez une carte chère.';
    if (c.r === 'legende' && deck.filter(x => x.r === 'legende').length >= CFG.LEG) return '1 Légende au plus.';
    if (c.r === 'noire' && deck.filter(x => x.r === 'noire').length >= CFG.NOIRE) return '2 Noires au plus.';
    if (c.k >= CFG.STAR_COST && deck.filter(x => x.k >= CFG.STAR_COST).length >= CFG.STARS) return CFG.STARS + ' stars (coût ' + CFG.STAR_COST + ' et plus) au plus.';
    return null;
  }
  /* deck automatique : les meilleures stats possibles dans le budget et les quotas */
  function autoDeck(pool) {
    const val = c => c.st[0] + c.st[1] + c.st[2];
    const uniq = []; const seen = new Set(); pool.forEach(c => { if (!seen.has(c.id)) { seen.add(c.id); uniq.push(c) } });
    let out = [];
    /* d'abord 12 cartes peu chères (le deck est toujours complet), puis on les améliore dans le budget */
    uniq.slice().sort((a, b) => a.k - b.k || val(b) - val(a)).forEach(c => { if (!canAdd(out, c)) out.push(c) });
    /* améliorations : remplacer une carte faible par une plus forte si le budget le permet */
    for (let it = 0; it < 60; it++) {
      let best = null, g = 0;
      for (const r of uniq) { if (out.includes(r)) continue;
        for (let i = 0; i < out.length; i++) { const w = out[i], d = val(r) - val(w); if (d <= g) continue;
          const t = out.slice(); t.splice(i, 1); if (!canAdd(t, r)) { g = d; best = [i, r] } } }
      if (!best) break; out[best[0]] = best[1];
    }
    return out;
  }

  /* ---------- partie ---------- */
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]] } return a }
  function newGame(deckA, deckB) {
    const side = d => { const s = shuffle(d.slice()); return { deck: s, hand: s.splice(0, CFG.HAND), played: [], pts: 0 } };
    const terrains = Array.from({ length: CFG.ROUNDS + CFG.SHOW_NEXT }, () => TERRAINS[Math.random() * TERRAINS.length | 0]);
    const inst = d => Math.max(0, Math.floor((CFG.BUDGET - d.reduce((a, c) => a + c.k, 0)) / CFG.INSTINCT));
    const sa = side(deckA), sb = side(deckB); sa.inst = inst(deckA); sb.inst = inst(deckB);
    return { s: [sa, sb], terrains, round: 0, over: false, winner: null, hist: [] };
  }
  const terrain = G => G.terrains[G.round];
  /* résout une manche : a et b = { card, stat } */
  function resolve(G, a, b) {
    const T = terrain(G), A = G.s[0], B = G.s[1];
    if (!A.hand.includes(a.card) || !B.hand.includes(b.card)) throw new Error('carte hors de la main');
    const oa = outsider(a.card, b.card) + A.inst, ob = outsider(b.card, a.card) + B.inst;
    const va = value(a.card, a.stat, T) + oa, vb = value(b.card, b.stat, T) + ob;
    let ra, rb, mode;
    if (a.stat === b.stat) { mode = 'face'; ra = va; rb = vb }
    else { mode = 'ecart'; ra = va - value(b.card, a.stat, T) - ob; rb = vb - value(a.card, b.stat, T) - oa }
    let r = Math.sign(ra - rb), tie = '';
    if (!r) { r = Math.sign(b.card.k - a.card.k); tie = r ? 'cheap' : 'draw' }
    if (r > 0) A.pts++; else if (r < 0) B.pts++;
    [[A, a.card], [B, b.card]].forEach(([S, c]) => { S.hand.splice(S.hand.indexOf(c), 1); S.played.push(c); if (S.deck.length) S.hand.push(S.deck.shift()) });
    const res = { round: G.round + 1, T, a, b, va, vb, ra, rb, oa, ob, mode, r, tie };
    G.hist.push(res); G.round++;
    if (A.pts >= CFG.WIN || B.pts >= CFG.WIN || G.round >= CFG.ROUNDS || !A.hand.length || !B.hand.length) { G.over = true; G.winner = A.pts > B.pts ? 0 : B.pts > A.pts ? 1 : -1 }
    return res;
  }
  /* IA : évalue chaque carte et chaque stat contre les cartes adverses encore possibles */
  function ai(G, p, level) {
    const S = G.s[p], O = G.s[1 - p], T = terrain(G);
    const foes = O.hand.length ? O.deck.concat(O.hand) : O.played;
    if (level === 'facile') { const c = S.hand[Math.random() * S.hand.length | 0]; return { card: c, stat: ST[Math.random() * 3 | 0] } }
    /* issue d'un face-à-face : +1 si (c, s) bat (f, fs), -1 s'il perd */
    const duel = (c, s, X, f, fs, Y) => { const oa = outsider(c, f) + X.inst, ob = outsider(f, c) + Y.inst, va = value(c, s, T) + oa, vb = value(f, fs, T) + ob;
      const ra = s === fs ? va : va - value(f, s, T) - ob, rb = s === fs ? vb : vb - value(c, fs, T) - oa; return Math.sign(ra - rb) || Math.sign(f.k - c.k) };
    /* expert : devine ce que l'adversaire a intérêt à jouer et pèse ses options en conséquence */
    const opts = []; for (const f of foes) for (const fs of ST) {
      let wt = 1; if (level === 'expert') { let a = 0; for (const c of S.hand) for (const s of ST) a += duel(f, fs, O, c, s, S); wt = Math.exp(a / (S.hand.length * 3) * 3) }
      opts.push([f, fs, wt]) }
    const tot = opts.reduce((x, o) => x + o[2], 0) || 1;
    let best = null, bv = -1e9;
    for (const c of S.hand) for (const s of ST) {
      let w = 0; for (const [f, fs, wt] of opts) w += duel(c, s, S, f, fs, O) * wt;
      const sc = w / tot * 10 + Math.random() * (level === 'expert' ? 0.6 : 2);
      if (sc > bv) { bv = sc; best = { card: c, stat: s } }
    }
    return best;
  }
  const API = { CFG, ST, SN, TERRAINS, value, outsider, check, canAdd, autoDeck, newGame, terrain, resolve, ai };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.AF = API;
})(typeof window !== 'undefined' ? window : globalThis);
