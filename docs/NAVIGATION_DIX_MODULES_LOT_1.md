# Navigation frontend — dix modules, traitement séquentiel

Après Payflow et Mailport, les dix modules suivants ont été modifiés un par un, avec un contrôle de leurs actions avant de poursuivre. Ce lot porte sur la navigation ; il ne termine pas l'ensemble des fonctionnalités métier et ne modifie pas le backend.

| Ordre | Module | Réalisation | Actions contrôlées |
|---|---|---|---:|
| 1 | Property | Menu vers URL canonique, fiche de bien distincte, recherche vers fiche puis paiement avec référence du bien. Carte annoncée comme non connectée. | 10 |
| 2 | Restaurants / hôtels / traiteur | Menu vers pages de commande, réservation, hôtel, paiement et gestion ; panier conservé pendant la session. | 14 |
| 3 | School | Menu vers frais, livres, classes, rapports et messagerie selon le rôle ; référence élève reprise lorsqu'elle est fournie. | 9 |
| 4 | Health Care | Actions des neuf profils joignables par URL contrôlée ; accès patient aux vues rendez-vous et paiement ; anciennes URL professionnelles orientées selon le rôle. | 30 |
| 5 | Store | Actions acheteur/vendeur vers les pages ; fiche produit distincte avec identifiant, ajout au panier et retour catalogue. | 10 |
| 6 | City | Menu vers actions mairie/agent/marchand ; références transmises aux formulaires photo, collecte et paiement. | 12 |
| 7 | Administration | Liens vers les actions autorisées de chaque rôle ; Travel ajouté aux listes des modules administrés. | 14 |
| 8 | USA Tax Pro | Dossier, documents, assistant, signature, paiement, revue et préparation accessibles par URL spécifique à l'action. | 8 |
| 9 | University | Navigation entre sections avec vues adaptées admission/paiement/cours/progression ; menu vers les pages au lieu du formulaire générique ; état des choix conservé lors du changement de section sans remonter le composant. | 8 |
| 10 | Travel | Menu vers pages voyageur/partenaire/administration ; séparation préparation, assistant, récapitulatif et itinéraires ; brouillons lus dans leur collection ; correction du classement de la file de vérification administrative. | 18 |

## Mécanisme commun

Le catalogue moduleNavigation relie chaque action métier à une section existante. Le paramètre task n'est accepté que si l'action correspond à cette section et au rôle du profil. Les pages partagées affichent les actions réellement autorisées et des retours explicites. Une référence fournie est transmise entre leurs liens ; elle ne constitue pas une preuve d'accès aux données.

Le déverrouillage local d'une page partagée est lié au module courant pour ne pas être réutilisé lors du changement de module. Il ne remplace pas les contrôles serveur.

## Vérifications réalisées

- Assertions sur les 133 actions des dix modules : destinations dans l'inventaire, rôle, correspondance task/section, refus d'actions inconnues.
- Contrôles statiques frontend, routes, sections restantes, Health et Store réussis.
- Contrôle University sur le catalogue, les exercices et le seuil de réussite réussi.
- Lint ciblé du projet réussi.
- Compilation Vite réussie avec resolve.preserveSymlinks=true passé temporairement à la commande pour éviter le refus de résolution des chemins dans l'environnement de l'agent. Aucun changement permanent de cette option.

## Ce qui reste hors de ce lot

La recette complète navigateur/mobile et rôle par rôle reste à faire après l'optimisation demandée. Certains écrans de l'ancien inventaire partagent encore des actions métier ; les liens explicites task distinguent les parcours mais ne constituent pas automatiquement des écrans métiers nouveaux. Le traiteur, les calendriers et analyses fiscales détaillés, la cartographie réelle, les intégrations externes, les permissions serveur et les opérations financières réelles ne sont pas déclarés terminés. Aucune réservation ni transaction réelle n'a été exécutée. L'assistant Travel décrit sa génération IA comme restant à connecter.
