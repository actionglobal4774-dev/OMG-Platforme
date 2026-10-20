# Navigation frontend — audit du 19 octobre 2026

Le backend n'a pas été modifié pendant cet audit. Les anciens contrôles de présence de chaînes dans le code ne constituent pas une recette fonctionnelle. Les 123 entrées d'inventaire ne sont pas nécessairement 123 écrans distincts.

## Corrections effectuées

- Les routes protégées conservent la destination demandée pendant la connexion. Login revient à cette destination interne après authentification.
- Les formulaires métier Property, Restaurant, School, City, Tax Pro, Administration, Health Care et Store sont réinitialisés au changement de section pour éviter de conserver un état appartenant à l'écran précédent.
- University refuse désormais les sections inconnues au lieu d'afficher son tableau général pour toute URL.
- Mailport : remplacement du bouton cartographique sans action par un lien vers le suivi de colis.
- Store : le bouton « Voir la boutique » ouvre et ferme maintenant les détails disponibles de la boutique sélectionnée.
- Le balayage des dépendances Vite est limité à index.html pour éviter de parcourir les copies natives Android/iOS.
- Le message du contrôle statique a été corrigé pour ne pas présenter la présence des routes comme une recette page par page.

## Bilan par module — inspection du code, dans l'ordre

| Module | Entrées | Constat et suite nécessaire |
|---|---:|---|
| Payflow | 15 | Routes spécialisées et retours présents. Navigateur : portefeuille anonyme renvoyé à Login. Transactions et retours connecté à tester avec un compte de test. |
| Mailport | 12 | Navigation filtrée par rôle. Bouton sans action corrigé. Détails colis, suivi, livraison et retour à tester connecté. |
| Property | 6 | Plusieurs sections conduisent aux mêmes actions (recherche, détails, carte). Détails/contact doivent devenir de véritables parcours dédiés. |
| Restaurants / hôtels / traiteur | 7 | Certaines sections partagent une action commande/vente ; il reste à distinguer le parcours traiteur et les réservations selon le rôle. |
| School | 8 | Profil élève, parent et rapports partagent les actions de rapports. Recette parent/école nécessaire, notamment les dossiers protégés. |
| Health Care | 15 | Quatre anciennes URL redirigent vers des parcours canoniques. Tester les accès autorisés/refusés pour chaque rôle ; ne pas compter ces redirections comme des écrans distincts. |
| Store | 12 | Recherche/produit/catégories partagent le catalogue ; commande/suivi partagent un espace. Bouton détails boutique corrigé. Fiche produit et suivi détaillé restent à distinguer. |
| City Management | 10 | Calcul et paiement de taxe ouvrent une même action. Les cartes/catégories nécessitent des écrans correspondant réellement à leurs intitulés. |
| Administration | 8 | Plusieurs pages sélectionnent la même action autorisée. Vérification par rôle et séparation utilisateurs/permissions/configuration à terminer. |
| USA Tax Pro | 11 | Plusieurs routes affichent le même formulaire métier. Distinguer résumé, profil, entreprise, revenus, dépenses et calendrier. |
| University Integration | 7 | Section inconnue corrigée. Les sept sections connues aboutissent encore au tableau partagé ; elles ne sont pas sept parcours distincts. |
| One Million Travel | 12 | Accueil, assistant et paiement partagent encore la planification. « Mes voyages » lit les réservations plutôt que les brouillons. Les sélections ne sont pas encore conservées entre tous les écrans. À corriger avant recette complète. |

## Limite des essais navigateur

Un navigateur neuf ne possède aucune session connectée. L'ouverture de /#/payflow/wallet a affiché Login comme attendu. Les essais sur données réelles, rôles, retour navigateur et mobile des écrans connectés restent à exécuter avec une session de test. Aucun paiement ni envoi de données métier n'a été effectué.

L'audit n'est pas terminé et la navigation n'est pas déclarée à 100 %. Les doublons fonctionnels ci-dessus doivent être traités avant de passer au backend.
