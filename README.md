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
