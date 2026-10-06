/* Sauvegarde en ligne et classement entre amis, avec Supabase.
   Sans configuration (config.js vide), le jeu reste en mode local : rien ne change pour le joueur.
   Le jeu garde ses données dans les variables col, stock et wins (script principal) ; ce fichier les recopie en ligne. */
(function () {
  const cfg = window.SUPA || {};
  const ready = !!(cfg.url && cfg.key && window.supabase);
  const sb = ready ? window.supabase.createClient(cfg.url, cfg.key) : null;
  let user = null, timer = 0, state = ready ? 'Non connecté' : 'Mode local', board = null;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const getPseudo = () => { try { return localStorage.getItem('hp:pseudo') || '' } catch (e) { return '' } };
  const setPseudo = p => { try { localStorage.setItem('hp:pseudo', p) } catch (e) {} };

  window.cloudSave = function () {
    if (!user) return;
    clearTimeout(timer);
    timer = setTimeout(push, 1500);
  };

  async function push() {
    if (!user) return;
    const now = new Date().toISOString();
    const r1 = await sb.from('collections').upsert({ user_id: user.id, data: { col, stock, wins, v: 1 }, updated_at: now });
    const r2 = await sb.from('profiles').upsert({ user_id: user.id, pseudo: getPseudo() || 'Joueur', cards: Object.keys(col).length, wins, updated_at: now });
    state = r1.error || r2.error ? 'Erreur de sauvegarde : ' + (r1.error || r2.error).message : 'Sauvegardé en ligne';
    paint();
  }

  /* À la connexion : on fusionne la collection en ligne et celle du téléphone (on garde le plus grand nombre d'exemplaires de chaque carte). */
  async function pull() {
    const { data, error } = await sb.from('collections').select('data').eq('user_id', user.id).maybeSingle();
    if (error) { state = 'Erreur de lecture : ' + error.message; paint(); return }
    if (data && data.data) {
      const d = data.data;
      for (const id in d.col || {}) col[id] = Math.max(col[id] || 0, d.col[id]);
      wins = Math.max(wins, d.wins || 0);
      try { localStorage.setItem('hp:col', JSON.stringify(col)); localStorage.setItem('hp:wins', JSON.stringify(wins)) } catch (e) {}
      if (typeof render === 'function') render();
    }
    await push();
  }

  async function loadBoard() {
    const { data, error } = await sb.from('profiles').select('user_id,pseudo,cards,wins').order('cards', { ascending: false }).limit(50);
    board = error ? null : data;
    paint();
  }

  function paint() {
    const b = $('acctB');
    if (b) { b.textContent = user ? (getPseudo() || 'Compte') : 'Compte'; b.classList.toggle('on', !!user) }
    const box = $('acctIn');
    if (!box || $('acct').hidden) return;
    if (!ready) {
      box.innerHTML = `<p class="amsg">La sauvegarde en ligne n'est pas encore activée sur ce site. Votre collection est gardée dans ce téléphone.</p>`;
      return;
    }
    if (!user) {
      box.innerHTML = `<p class="amsg">Créez un compte pour retrouver votre collection sur un autre téléphone et voir le classement de vos amis.</p>
        <label>Pseudo (visible par vos amis)<input id="aPs" maxlength="20" autocomplete="nickname" value="${esc(getPseudo())}"></label>
        <label>E-mail<input id="aEm" type="email" autocomplete="email"></label>
        <label>Mot de passe (6 caractères au moins)<input id="aPw" type="password" autocomplete="current-password"></label>
        <div class="row"><button class="btn" id="aIn">Se connecter</button><button class="btn ghost" id="aUp">Créer un compte</button></div>
        <p class="amsg" id="aMsg"></p>`;
      const msg = (t, k) => { const m = $('aMsg'); m.textContent = t; m.className = 'amsg ' + (k || '') };
      const go = async signup => {
        const em = $('aEm').value.trim(), pw = $('aPw').value, ps = $('aPs').value.trim();
        if (!em || pw.length < 6) return msg('Entrez votre e-mail et un mot de passe de 6 caractères au moins.', 'ko');
        if (signup && ps.length < 2) return msg('Choisissez un pseudo de 2 caractères au moins.', 'ko');
        if (ps) setPseudo(ps);
        msg(signup ? 'Création du compte…' : 'Connexion…');
        const r = signup ? await sb.auth.signUp({ email: em, password: pw }) : await sb.auth.signInWithPassword({ email: em, password: pw });
        if (r.error) return msg(r.error.message === 'Invalid login credentials' ? 'E-mail ou mot de passe incorrect.' : r.error.message, 'ko');
        if (signup && !r.data.session) return msg('Compte créé. Ouvrez l\'e-mail de confirmation, puis revenez vous connecter.', 'ok');
      };
      $('aIn').addEventListener('click', () => go(false));
      $('aUp').addEventListener('click', () => go(true));
      return;
    }
    const rows = (board || []).map((p, i) => `<tr class="${p.user_id === user.id ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.pseudo)}</td><td>${p.cards}</td></tr>`).join('');
    box.innerHTML = `<p class="amsg ok">Connecté : ${esc(user.email || '')}</p><p class="amsg">${esc(state)}</p>
      <label>Pseudo<input id="aPs" maxlength="20" value="${esc(getPseudo())}"></label>
      <h2 style="font-size:18px;margin:8px 0 0">Classement des amis</h2>
      ${board ? `<table class="lb"><thead><tr><th>#</th><th>Joueur</th><th>Cartes</th></tr></thead><tbody>${rows}</tbody></table>` : '<p class="amsg">Chargement…</p>'}
      <div class="row"><button class="btn ghost" id="aOut">Se déconnecter</button></div>`;
    $('aPs').addEventListener('change', e => { const v = e.target.value.trim(); if (v.length >= 2) { setPseudo(v); push() } });
    $('aOut').addEventListener('click', async () => { await sb.auth.signOut() });
  }

  if (sb) {
    sb.auth.onAuthStateChange((ev, session) => {
      const was = user && user.id;
      user = session ? session.user : null;
      if (user && user.id !== was) { state = 'Synchronisation…'; pull().then(loadBoard) }
      if (!user) { state = 'Non connecté'; board = null }
      paint();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    $('acctB').addEventListener('click', () => { $('acct').hidden = false; paint(); if (user) loadBoard() });
    $('acctX').addEventListener('click', () => { $('acct').hidden = true });
    paint();
  });
  if (document.readyState !== 'loading') document.dispatchEvent(new Event('DOMContentLoaded'));
})();
