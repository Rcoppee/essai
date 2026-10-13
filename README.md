# Suivi des investissements

Site statique (HTML, CSS, JavaScript) pour suivre ses placements. Première partie en place : le **P2P**, avec une page par plateforme (Peerberry pour l'instant), un récapitulatif P2P et une vue d'ensemble. PEA, PER, assurance vie, CTO et cryptomonnaies sont déjà dans la barre latérale et seront branchés ensuite.

## Confidentialité : à lire avant de publier

- Un site GitHub Pages est **public sur Internet**, même si le dépôt est privé (sauf offre Enterprise avec contrôle d'accès).
- Le fichier `data/p2p/peerberry.json` contient vos vraies transactions. Dans un dépôt public, tout le monde peut le lire.
- Deux usages sûrs :
  1. **Local uniquement** : ne commitez pas `data/` (ajoutez `data/` au `.gitignore`), importez vos fichiers dans le navigateur. Ils restent dans ce navigateur.
  2. **Dépôt privé, site ouvert en local** : `python3 -m http.server`, puis http://localhost:8000. Pas de Pages.
- La page contient `noindex`, mais cela ne protège pas les données.

## Mise en ligne (GitHub Pages)

1. Créez un dépôt GitHub et poussez le contenu de ce dossier à la racine.
2. Dépôt > Settings > Pages > Source : « Deploy from a branch », branche `main`, dossier `/ (root)`.
3. Le site est servi à `https://<utilisateur>.github.io/<dépôt>/`.

## Tester en local

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Ouvrir `index.html` directement (file://) ne charge pas les fichiers de `data/` : passez par le petit serveur ci-dessus.
Les graphiques (Chart.js) et la lecture des fichiers Excel (SheetJS) sont chargés depuis cdnjs : une connexion est nécessaire.

## Importer un fichier

Sur la page d'une plateforme : **Importer un fichier** (ou glisser-déposer le fichier sur la page). Formats acceptés : `.xlsx`, `.xls`, `.csv`.

- Un import **remplace toujours** les données précédentes de cette plateforme. Une fenêtre de confirmation indique le nombre de transactions, la période, et prévient si le nouveau fichier est plus court ou s'arrête plus tôt que les données actuelles.
- L'import est enregistré dans le navigateur (localStorage) et prend le dessus sur le dépôt.
- Pour le conserver sur GitHub : **Exporter en JSON**, remplacez `data/p2p/<plateforme>.json` par le fichier téléchargé, puis commit.
- **Revenir aux données du dépôt** supprime l'import local.

Les fichiers doivent partir du premier dépôt : le cash et le capital en cours se déduisent de l'historique complet.

## Comment sont calculés les chiffres

| Indicateur | Calcul |
|---|---|
| Cash disponible | somme de tous les montants du fichier |
| Capital en cours | investissements − capital remboursé |
| Valeur estimée | cash + capital en cours (intérêts courus non versés exclus) |
| Capital versé net | dépôts − retraits |
| Gain net | valeur estimée − capital versé net |
| Capital en retard | capital en cours des prêts au statut « en retard » ou « défaut » |
| Rendement annualisé | XIRR sur les dépôts et retraits, affiché à partir de 60 jours d'historique |

Seules les transactions en euros entrent dans les totaux ; les autres devises sont signalées par un avertissement.

## Ajouter une plateforme P2P

Chaque plateforme a son propre parseur, car les fichiers diffèrent.

1. Copier `js/parsers/peerberry.js` vers `js/parsers/<nom>.js` et adapter les colonnes et la classification des types.
2. Le parseur expose `{ id, name, fileHint, parse(rows) }`. `parse` reçoit les lignes du fichier (tableau d'objets, clés = en-têtes) et retourne `{ transactions, warnings }`. Chaque transaction :

```js
{ id, date: 'AAAA-MM-JJ', kind, rawType, amount, currency, loanId, country, loanStatus, loanStatusRaw }
```

   - `kind` : `deposit`, `withdrawal`, `investment`, `principal`, `interest`, `bonus`, `fee` ou `other`
   - `amount` : signé du point de vue du compte (dépôt > 0, investissement < 0, retrait < 0)
   - `loanStatus` : `active`, `finished`, `late`, `default` ou `other`
3. L'ajouter dans `js/config.js` (liste `P2P_PLATFORMS`). La barre latérale, la page de la plateforme et le récapitulatif P2P se mettent à jour seuls.

## Structure

```
index.html
css/style.css
data/p2p/peerberry.json   données versionnées (voir Confidentialité)
js/app.js                 routage et rendu
js/config.js              catégories et plateformes
js/store.js               localStorage, dépôt, export JSON
js/metrics.js             calculs (valeur, gain, prêts, XIRR, séries)
js/parsers/               un parseur par plateforme
js/views/                 vue d'ensemble, récap P2P, page plateforme, tableaux, graphiques
```
