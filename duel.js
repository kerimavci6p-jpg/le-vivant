/* WILD DUEL : moteur de partie (aucun affichage ici).
   Règle fondamentale : UNE SEULE carte active par joueur.
   Le moteur reçoit des intentions (jouer, remplacer, attaquer, finir le tour) et refuse tout ce qui n'est pas permis.
   Utilisable dans la page (window.WD) et dans Node pour les tests (module.exports). */
(function (root) {
  const CONFIG = {
    name: 'WILD DUEL', subtitle: 'Le duel des espèces',
    HP: 20, DECK: 30, COPIES: 2, HAND_START: 5, HAND_MAX: 8, ENERGY_MAX: 10,
    MULLIGAN_MAX: 3, TURN_SECONDS: 45, DIRECT_DAMAGE: 1, MAX_TURNS: 80,
    /* Outsider : la carte la moins chère gagne +1 par tranche de OUT_STEP points de coût d'écart (OUT_MAX au plus) */
    OUT_STEP: 1, OUT_MAX: 2
  };
  const STATS = ['power', 'speed', 'intelligence'];
  const STAT_FR = { power: 'Puissance', speed: 'Vitesse', intelligence: 'Intelligence' };

  /* ---------- effets décrits en données (le moteur ne connaît que les déclencheurs) ---------- */
  const EFFECTS = {
    orca_collective_intelligence: { name: 'Intelligence collective', text: 'Quand elle gagne un duel Intelligence : +1 dégât.',
      trigger: 'ON_STAT_WIN', condition: { stat: 'intelligence' }, effect: { type: 'BONUS_PLAYER_DAMAGE', value: 1 } },
    cheetah_acceleration: { name: 'Accélération', text: 'En arrivant en jeu : Vitesse +1 pendant ce tour.',
      trigger: 'ON_ENTER', effect: { type: 'TEMP_STAT', stat: 'speed', value: 1 } },
    tortoise_shell: { name: 'Carapace', text: 'La première fois qu\'elle devrait vous faire perdre des PV : 1 dégât de moins.',
      trigger: 'ON_DAMAGE_TAKEN_FIRST', effect: { type: 'REDUCE_DAMAGE', value: 1 } },
    eagle_vision: { name: 'Vision', text: 'En arrivant en jeu : regardez la première carte de votre deck.',
      trigger: 'ON_ENTER', effect: { type: 'PEEK_DECK', value: 1 } },
    wolf_pack: { name: 'Meute', text: 'Quand il gagne un duel Vitesse : +1 dégât.',
      trigger: 'ON_STAT_WIN', condition: { stat: 'speed' }, effect: { type: 'BONUS_PLAYER_DAMAGE', value: 1 } },
    bear_might: { name: 'Force brute', text: 'Quand il gagne un duel Puissance : +1 dégât.',
      trigger: 'ON_STAT_WIN', condition: { stat: 'power' }, effect: { type: 'BONUS_PLAYER_DAMAGE', value: 1 } },
    raven_cunning: { name: 'Ruse', text: 'En arrivant en jeu : Intelligence +1 pendant ce tour.',
      trigger: 'ON_ENTER', effect: { type: 'TEMP_STAT', stat: 'intelligence', value: 1 } }
  };
  const CARD_EFFECTS = {
    orque: ['orca_collective_intelligence'], guepard: ['cheetah_acceleration'], tortuegeantedesgalapagos: ['tortoise_shell'],
    aigleroyal: ['eagle_vision'], loupgris: ['wolf_pack'], ourspolaire: ['bear_might'], oursgrizzli: ['bear_might'], corbeaufreux: ['raven_cunning']
  };

  /* ---------- hasard reproductible (graine sauvegardable pour rejouer une partie) ---------- */
  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296 } }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a }

  /* ---------- dégâts ---------- */
  function damageFor(diff) { return diff <= 0 ? 0 : diff <= 2 ? 1 : diff <= 4 ? 2 : diff <= 6 ? 3 : 4 }

  let uid = 0;
  function instance(card) { return { uid: 'c' + (++uid), id: card.id, name: card.name, cost: card.cost, stats: Object.assign({}, card.stats), effects: card.effects || CARD_EFFECTS[card.id] || [] } }
  function newPlayer(name, deckCards, r) {
    const deck = shuffle(deckCards.map(instance), r);
    return { name, health: CONFIG.HP, energy: 0, maxEnergy: 0, deck, hand: deck.splice(0, CONFIG.HAND_START), discard: [], activeCard: null,
      replacementUsedThisTurn: false, attackedThisTurn: false, lockedStat: null, lastStat: null, temp: {}, shellUsed: false, mulliganDone: false,
      dealt: 0, taken: 0, peek: null, mvp: {} };
  }
  function newGame(deckA, deckB, opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 2 ** 31);
    const r = rng(seed);
    const G = { seed, r, phase: 'MULLIGAN', turn: 0, active: 0, players: [newPlayer(opts.nameA || 'Vous', deckA, r), newPlayer(opts.nameB || 'Adversaire', deckB, r)],
      winner: null, log: [], events: [] };
    G.first = r() < 0.5 ? 0 : 1;
    return G;
  }
  const ev = (G, e) => { G.events.push(e); if (e.text) G.log.push(e.text) };
  function err(m) { return { ok: false, error: m } }
  const ok = (x) => Object.assign({ ok: true }, x || {});

  /* ---------- mulligan : jusqu'à 3 cartes, une seule fois ---------- */
  function mulligan(G, p, uids) {
    const P = G.players[p];
    if (G.phase !== 'MULLIGAN') return err('Le mulligan est terminé.');
    if (P.mulliganDone) return err('Mulligan déjà fait.');
    if (uids.length > CONFIG.MULLIGAN_MAX) return err('3 cartes au plus.');
    const back = P.hand.filter(c => uids.includes(c.uid));
    if (back.length !== uids.length) return err('Carte inconnue.');
    P.hand = P.hand.filter(c => !uids.includes(c.uid));
    P.deck.push(...back); shuffle(P.deck, G.r);
    P.hand.push(...P.deck.splice(0, back.length));
    P.mulliganDone = true;
    if (G.players.every(x => x.mulliganDone)) startGame(G);
    return ok({ replaced: back.length });
  }
  function startGame(G) { G.phase = 'PLAY'; G.active = G.first; G.turn = 0; startTurn(G) }

  /* ---------- tour : START_TURN, DRAW, ENERGY_REFRESH, MAIN_PHASE, COMBAT, END_TURN ---------- */
  function startTurn(G) {
    const P = G.players[G.active];
    G.turn++;
    ev(G, { type: 'TURN_CHANGED', player: G.active, text: (G.active === 0 ? 'À vous' : 'Tour de ' + P.name) + ' (tour ' + G.turn + ').' });
    /* DRAW */
    if (P.deck.length) { const c = P.deck.shift(); if (P.hand.length < CONFIG.HAND_MAX) { P.hand.push(c); ev(G, { type: 'DRAW', player: G.active }) } else { P.discard.push(c); ev(G, { type: 'BURN', player: G.active, text: P.name + ' a la main pleine : ' + c.name + ' est défaussé.' }) } }
    /* ENERGY_REFRESH */
    P.maxEnergy = Math.min(CONFIG.ENERGY_MAX, P.maxEnergy + 1); P.energy = P.maxEnergy;
    P.replacementUsedThisTurn = false; P.attackedThisTurn = false; P.temp = {};
    /* fatigue : la stat utilisée au tour précédent est verrouillée pour ce tour */
    P.lockedStat = P.lastStat; P.lastStat = null;
    G.turnStartedAt = Date.now();
  }
  function enter(G, p, card) {
    const P = G.players[p];
    P.activeCard = card; P.lockedStat = null; P.shellUsed = false;
    ev(G, { type: 'CARD_PLAYED', player: p, card: card.uid, text: card.name + ' entre en jeu' + (p === 0 ? '.' : ' chez ' + P.name + '.') });
    card.effects.forEach(id => { const E = EFFECTS[id]; if (!E || E.trigger !== 'ON_ENTER') return;
      if (E.effect.type === 'TEMP_STAT') { P.temp[E.effect.stat] = (P.temp[E.effect.stat] || 0) + E.effect.value; ev(G, { type: 'EFFECT', player: p, text: E.name + ' : ' + STAT_FR[E.effect.stat] + ' +' + E.effect.value + ' ce tour.' }) }
      if (E.effect.type === 'PEEK_DECK') { P.peek = P.deck[0] ? P.deck[0].uid : null; ev(G, { type: 'EFFECT', player: p, text: E.name + ' : ' + P.name + ' regarde la première carte de son deck.' }) }
    });
  }
  function canAct(G, p) { if (G.phase !== 'PLAY') return 'La partie n\'est pas en cours.'; if (G.active !== p) return 'Ce n\'est pas votre tour.'; return null }
  function playCard(G, p, uid) {
    const no = canAct(G, p); if (no) return err(no);
    const P = G.players[p], c = P.hand.find(x => x.uid === uid);
    if (!c) return err('Cette carte n\'est pas dans votre main.');
    if (c.cost > P.energy) return err('Pas assez d\'énergie (' + P.energy + '/' + c.cost + ').');
    if (P.activeCard) {
      if (P.replacementUsedThisTurn) return err('Un seul remplacement par tour.');
      P.discard.push(P.activeCard); P.replacementUsedThisTurn = true;
      ev(G, { type: 'ACTIVE_CARD_CHANGED', player: p, text: P.activeCard.name + ' part à la défausse.' });
    }
    P.energy -= c.cost; P.hand.splice(P.hand.indexOf(c), 1);
    enter(G, p, c);
    return ok({ card: c });
  }
  function statOf(P, stat) { return P.activeCard ? P.activeCard.stats[stat] + (P.temp[stat] || 0) : 0 }
  function hurt(G, p, n, from) {
    const P = G.players[p];
    if (n > 0 && P.activeCard && !P.shellUsed && P.activeCard.effects.some(id => EFFECTS[id] && EFFECTS[id].trigger === 'ON_DAMAGE_TAKEN_FIRST')) {
      P.shellUsed = true; n = Math.max(0, n - 1); ev(G, { type: 'EFFECT', player: p, text: 'Carapace : 1 dégât de moins.' });
    }
    if (n <= 0) return 0;
    P.health = Math.max(0, P.health - n); P.taken += n; G.players[1 - p].dealt += n;
    if (from) { const A = G.players[1 - p]; A.mvp[from.name] = (A.mvp[from.name] || 0) + n }
    ev(G, { type: 'DAMAGE_DEALT', player: p, value: n, text: P.name + ' perd ' + n + ' PV.' });
    if (P.health <= 0) { G.phase = 'GAME_OVER'; G.winner = 1 - p; ev(G, { type: 'GAME_OVER', winner: 1 - p, text: G.players[1 - p].name + ' gagne la partie.' }) }
    return n;
  }
  /* COMBAT : on compare la même stat ; si l'adversaire n'a pas d'animal actif, attaque directe (1 dégât) */
  function attack(G, p, stat) {
    const no = canAct(G, p); if (no) return err(no);
    const P = G.players[p], D = G.players[1 - p];
    if (!STATS.includes(stat)) return err('Statistique inconnue.');
    if (!P.activeCard) return err('Posez d\'abord un animal.');
    if (P.attackedThisTurn) return err('Un seul duel par tour.');
    if (P.lockedStat === stat) return err(STAT_FR[stat] + ' est fatiguée : choisissez une autre statistique.');
    P.attackedThisTurn = true; P.lastStat = stat;
    if (!D.activeCard) {
      ev(G, { type: 'COMBAT_RESOLVED', player: p, stat, a: statOf(P, stat), b: null, text: P.activeCard.name + ' attaque directement.' });
      hurt(G, 1 - p, CONFIG.DIRECT_DAMAGE, P.activeCard);
      return ok({ direct: true });
    }
    const out = (x, y) => Math.min(CONFIG.OUT_MAX, Math.max(0, Math.floor((y.cost - x.cost) / CONFIG.OUT_STEP)));
    const oa = out(P.activeCard, D.activeCard), ob = out(D.activeCard, P.activeCard);
    const a = statOf(P, stat) + oa, b = statOf(D, stat) + ob, diff = a - b;
    if (oa || ob) ev(G, { type: 'EFFECT', player: oa ? p : 1 - p, text: 'Outsider : ' + (oa ? P : D).activeCard.name + ' +' + (oa || ob) + '.' });
    ev(G, { type: 'COMBAT_RESOLVED', player: p, stat, a, b, text: P.activeCard.name + ' utilise ' + STAT_FR[stat] + ' : ' + a + (diff > 0 ? ' > ' : diff < 0 ? ' < ' : ' = ') + b + ' ' + D.activeCard.name + '.' });
    let dmg = 0, to = null;
    if (diff > 0) {
      dmg = damageFor(diff); to = 1 - p;
      P.activeCard.effects.forEach(id => { const E = EFFECTS[id]; if (E && E.trigger === 'ON_STAT_WIN' && (!E.condition || E.condition.stat === stat) && E.effect.type === 'BONUS_PLAYER_DAMAGE') { dmg += E.effect.value; ev(G, { type: 'EFFECT', player: p, text: E.name + ' : +' + E.effect.value + ' dégât.' }) } });
      hurt(G, to, dmg, P.activeCard);
    } else if (diff < 0) { to = p; dmg = 1; ev(G, { type: 'RIPOSTE', player: 1 - p, text: D.activeCard.name + ' riposte.' }); hurt(G, p, 1, D.activeCard) }
    return ok({ a, b, oa, ob, diff, dmg, to });
  }
  function endTurn(G, p) {
    const no = canAct(G, p); if (no) return err(no);
    if (G.turn >= CONFIG.MAX_TURNS) { G.phase = 'GAME_OVER'; const [A, B] = G.players; G.winner = A.health === B.health ? -1 : A.health > B.health ? 0 : 1; ev(G, { type: 'GAME_OVER', winner: G.winner, text: 'Limite de tours atteinte.' }); return ok() }
    G.active = 1 - G.active; startTurn(G); return ok();
  }
  function surrender(G, p) { if (G.phase === 'GAME_OVER') return err('Partie terminée.'); G.phase = 'GAME_OVER'; G.winner = 1 - p; ev(G, { type: 'GAME_OVER', winner: 1 - p, text: G.players[p].name + ' abandonne.' }); return ok() }

  /* ---------- ce qu'un joueur a le droit de voir (la main et le deck adverses restent privés) ---------- */
  function view(G, p) {
    const me = G.players[p], op = G.players[1 - p];
    const pub = P => ({ name: P.name, health: P.health, energy: P.energy, maxEnergy: P.maxEnergy, handCount: P.hand.length, deckCount: P.deck.length, discardCount: P.discard.length, activeCard: P.activeCard, lockedStat: P.lockedStat });
    return { phase: G.phase, turn: G.turn, myTurn: G.active === p, winner: G.winner, log: G.log.slice(-30),
      me: Object.assign(pub(me), { hand: me.hand, replacementUsedThisTurn: me.replacementUsedThisTurn, attackedThisTurn: me.attackedThisTurn, temp: me.temp, peek: me.peek && me.deck[0] && me.deck[0].uid === me.peek ? me.deck[0] : null }),
      opponent: pub(op) };
  }

  /* ---------- IA : facile (au hasard), normale (raisonnable), expert (calcule) ---------- */
  function bestStat(P, D, locked) {
    let best = null, bv = -99;
    STATS.forEach(s => { if (s === locked) return; const v = D.activeCard ? statOf(P, s) - statOf(D, s) : 9; if (v > bv) { bv = v; best = s } });
    return { stat: best, diff: bv };
  }
  function aiTurn(G, p, level) {
    const P = G.players[p], D = G.players[1 - p], R = G.r;
    const affordable = () => P.hand.filter(c => c.cost <= P.energy);
    const score = c => { if (!D.activeCard) return c.stats.power + c.stats.speed + c.stats.intelligence;
      return Math.max(...STATS.filter(s => s !== P.lockedStat).map(s => c.stats[s] - statOf(D, s))) * 3 + (c.stats.power + c.stats.speed + c.stats.intelligence) / 6 };
    if (level === 'facile') {
      if (!P.activeCard) { const a = affordable(); if (a.length) playCard(G, p, a[Math.floor(R() * a.length)].uid) }
      if (P.activeCard && G.phase === 'PLAY') { const s = STATS.filter(x => x !== P.lockedStat); if (R() < .85) attack(G, p, s[Math.floor(R() * s.length)]) }
    } else {
      if (!P.activeCard) { const a = affordable().sort((x, y) => score(y) - score(x)); if (a.length) playCard(G, p, a[0].uid) }
      else {
        const cur = bestStat(P, D, P.lockedStat);
        const alt = affordable().map(c => ({ c, v: score(c) })).sort((x, y) => y.v - x.v)[0];
        const curV = cur.diff * 3;
        const margin = level === 'expert' ? 2 : 5;
        if (alt && cur.diff <= 0 && alt.v > curV + margin && !P.replacementUsedThisTurn) playCard(G, p, alt.c.uid);
      }
      if (P.activeCard && G.phase === 'PLAY') {
        const b = bestStat(P, D, P.lockedStat);
        /* l'expert évite une riposte inutile ; le normal attaque presque toujours */
        if (b.stat && (b.diff >= 0 || (level === 'normal' && R() < .3) || !D.activeCard)) attack(G, p, b.stat);
      }
    }
    if (G.phase === 'PLAY') endTurn(G, p);
  }
  function aiMulligan(G, p) { const P = G.players[p]; mulligan(G, p, P.hand.filter(c => c.cost >= 7).slice(0, 3).map(c => c.uid)) }

  const API = { CONFIG, STATS, STAT_FR, EFFECTS, CARD_EFFECTS, damageFor, newGame, mulligan, playCard, attack, endTurn, surrender, view, aiTurn, aiMulligan, statOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.WD = API;
})(typeof window !== 'undefined' ? window : globalThis);
