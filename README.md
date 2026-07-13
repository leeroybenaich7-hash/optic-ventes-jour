# Ventes du jour — Optic City

Caisse du jour en temps réel pour le magasin : chaque vente saisie en quelques
secondes, les chiffres du jour toujours à jour, et deux garde-fous qui
n'oublient jamais rien — les **télétransmissions mutuelle** et les
**restes à encaisser** clients.

- Charte visuelle reprise de l'app « Espace RH » (palette coucher de soleil).
- Fonctionne **immédiatement en local** (données dans le navigateur du PC).
- Passe **en ligne** (données partagées + sauvegardées) en remplissant 2 lignes
  de configuration Supabase — voir plus bas.

---

## 1. Lancer l'app sur le PC (pour tester)

```bash
cd optic-city-ventes-jour
npm install
npm run dev
```

Ouvrir l'adresse affichée (http://localhost:5173). **Code d'accès par défaut : `1234`**
(à changer dans l'onglet Réglages).

---

## 2. Mettre les données en ligne (Supabase) — recommandé

Tant que ce n'est pas fait, l'app marche en « mode local » : les données restent
dans le navigateur de CE PC. Pour les mettre en ligne (rien ne se perd, plusieurs
postes possibles) :

1. Aller sur https://supabase.com → **New project** (nom : `ventes-optic-city`,
   région Europe (Paris ou Frankfurt), mot de passe base : le noter quelque part).
2. Une fois le projet créé : menu **SQL Editor** → **New query** → coller TOUT le
   contenu du fichier [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Il doit afficher « Success ».
3. Menu **Settings → API** : copier
   - **Project URL** (commence par `https://…supabase.co`)
   - **anon public key** (longue chaîne de caractères)
4. Ouvrir le fichier [`src/lib/config.js`](src/lib/config.js) et coller les deux
   valeurs entre les guillemets :
   ```js
   export const SUPABASE_URL = 'https://xxxx.supabase.co'
   export const SUPABASE_ANON_KEY = 'eyJ…'
   ```
5. Relancer / redéployer. En haut à droite du bandeau, l'app doit afficher
   **« Données en ligne »**.

> ⚠️ Si des ventes ont déjà été saisies en mode local, faire **Réglages →
> Télécharger une sauvegarde** AVANT de passer en ligne (le mode en ligne
> repart d'une base vide).

---

## 3. Mettre l'app en ligne (Vercel)

Comme les autres apps :

1. Pousser le dossier sur GitHub (dépôt privé).
2. https://vercel.com → **Add New → Project** → importer le dépôt.
3. Framework : **Vite** (détecté tout seul). Build : `npm run build`,
   dossier de sortie : `dist`. → **Deploy**.
4. L'app est accessible sur `https://….vercel.app` depuis le PC du magasin.

**À chaque mise à jour :** augmenter `APP_VERSION` dans
[`src/lib/config.js`](src/lib/config.js) (anti-cache), puis pousser sur GitHub —
Vercel redéploie tout seul.

---

## 4. Comment c'est rangé

```
src/
  App.jsx                  coquille : bandeau de vigilance, onglets, pastilles
  styles.css               charte graphique (mêmes couleurs que l'app RH)
  lib/
    config.js              ← les 2 lignes Supabase + version
    store.jsx               moteur de données (Supabase OU local, temps réel)
    format.js               formats € / dates
  components/
    SaleForm.jsx            saisie d'une vente
    Dashboard.jsx           compteurs du jour + caisse par moyen de paiement
    SalesTable.jsx          liste des ventes
    Teletrans.jsx           télétransmissions en attente
    Encaissements.jsx       restes à encaisser + paiements partiels
    Historique.jsx          historique + statistiques
    Reglages.jsx            équipe, moyens de paiement, code, sauvegarde
    Lockscreen.jsx          écran de code d'accès
supabase/schema.sql         tables à coller dans Supabase
MODE-D-EMPLOI.md            la page à imprimer pour le magasin
```
