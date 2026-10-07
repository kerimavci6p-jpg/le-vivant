# Le Vivant

Jeu de cartes d'animaux à collectionner : sachets gratuits, album, duels. Version de test entre amis.

**Jouer :** https://kerimavci6p-jpg.github.io/le-vivant/

Le jeu est une page web qui s'installe sur le téléphone (« Ajouter à l'écran d'accueil »). Il marche sans serveur ; la sauvegarde en ligne et le classement entre amis passent par Supabase (gratuit), à activer une seule fois.

## 1. Mettre le jeu en ligne (GitHub Pages, gratuit)

1. Sur GitHub, ouvrez ce dépôt, puis **Settings → Pages**.
2. **Source** : « Deploy from a branch ». **Branch** : `main`, dossier `/ (root)`. **Save**.
3. Une à deux minutes plus tard, le lien du jeu s'affiche en haut de la page : `https://<votre-pseudo>.github.io/le-vivant/`.

Sur le téléphone : ouvrez le lien, puis menu du navigateur → **Ajouter à l'écran d'accueil**. Le jeu s'ouvre alors comme une application.

## 2. Activer la sauvegarde en ligne et le classement (Supabase, gratuit)

1. Créez un compte sur supabase.com, puis **New project** (nom : `le-vivant`, région : Europe, notez le mot de passe de la base quelque part).
2. **SQL Editor → New query** : collez tout le contenu de `supabase/schema.sql`, puis **Run**.
3. **Authentication → Sign In / Providers → Email** : pour un test entre amis, désactivez **Confirm email** (sinon chaque ami doit cliquer sur un e-mail de confirmation, et l'envoi d'e-mails gratuit est limité à quelques-uns par heure).
4. **Project Settings → API** : copiez **Project URL** et la clé **publishable** (`sb_publishable_…`). Ne copiez jamais la clé secrète (`sb_secret_…`).
5. Dans ce dépôt sur GitHub, ouvrez `config.js` → crayon (modifier) → collez les deux valeurs entre les guillemets → **Commit changes**.

Le bouton « Compte » du jeu permet alors de créer un compte (pseudo, e-mail, mot de passe), de retrouver sa collection sur un autre téléphone et de voir le classement des amis.

## Mettre à jour le jeu

Après une modification, changez `VERSION` en haut de `sw.js` (par exemple `le-vivant-2`) pour que les téléphones qui ont installé le jeu prennent la nouvelle version.

## À savoir

- Les sachets restent gratuits : les sachets payants avec hasard sont interdits en Belgique.
- La clé publiable de Supabase peut être publique : les règles de `supabase/schema.sql` empêchent chacun de lire ou modifier la collection des autres.
- Pour un test entre amis, c'est suffisant. Avant une vraie sortie publique : mentions légales, politique de confidentialité (RGPD), et contrôle côté serveur pour empêcher la triche.

## WILD DUEL (onglet Duel) — Phase 1 : prototype local contre l'IA

Règle fondamentale : **une seule carte active par joueur**.

- `duel.js` : moteur de partie (aucun affichage). PV 20, deck 30 (2 exemplaires au plus), main 5 (8 au plus),
  énergie +1 par tour (10 au plus), 1 remplacement par tour, 1 duel par tour, fatigue de la stat utilisée,
  dégâts selon l'écart (1-2 : 1, 3-4 : 2, 5-6 : 3, 7+ : 4), riposte de 1, attaque directe de 1 si l'adversaire n'a pas d'animal,
  règle Outsider (+1 par point de coût de moins, +2 au plus), mulligan de 3 cartes, effets décrits en données
  (`EFFECTS`, `CARD_EFFECTS`), graine de hasard sauvegardable, vue privée par joueur (`view`), IA facile / normale / expert.
  Les réglages sont dans `CONFIG` (nom du jeu, PV, taille du deck, temps par tour…).
- `jeu.js` (section WILD DUEL) : écrans menu, VS, tutoriel, mulligan, plateau, victoire / défaite, constructeur de deck avec courbe.
- Tests du moteur : `node tests/duel.test.js` (17 tests).

Phases suivantes : 2 multijoueur (serveur qui décide de tout : Supabase Realtime ou un petit serveur Node avec Socket.IO),
3 comptes et decks en ligne, 4 matchmaking et classement, 5 contenu.

## L'Affût (onglet Duel, à côté de WILD DUEL)

Duel court de bluff : 5 manches au plus, premier à 3. Moteur dans `affut.js`, écrans dans `affut-ui.js`, tests : `node tests/affut.test.js`.

- **Deck de 12 cartes**, un exemplaire par animal, **budget de 50** points de coût, au plus 1 Légende, 2 Noires et 2 stars (coût 8+). 3 decks enregistrables.
- **Instinct** : +1 à toutes les manches par tranche de 5 points de budget non dépensés.
- **Terrain** : chaque manche double une stat ; les familles chez elles gagnent +2. Les 2 terrains suivants sont visibles.
- **Manche** : chacun pose une carte et choisit une épreuve en secret. Même épreuve : la plus forte valeur gagne. Épreuves différentes : la plus grande avance sur l'autre animal gagne.
- **Outsider** : la carte la moins chère gagne +1 par point de coût d'écart (+3 au plus). Égalité : la moins chère gagne.
- Réglages dans `CFG` en haut de `affut.js`.
