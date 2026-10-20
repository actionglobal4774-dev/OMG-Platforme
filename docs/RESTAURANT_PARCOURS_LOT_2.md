# One Million Restaurants — parcours lot 2

19 octobre 2026. Frontend uniquement ; aucun backend modifie.

## Corrections

- Exemples menus/chambres limites au mode demonstration si le catalogue local est vide.
- Validation du panier a l'ajout et avant commande : stock, quantites entieres, prix courant ; retrait d'un article possible.
- Commande locale non presentee comme transmise ; lien vers preparation du paiement avec reference conservee.
- Demande de table non presentee comme reservation garantie ; rejet d'une demande identique pour le meme client/creneau.
- Chambre : dates, voyageurs, capacite si renseignee, tarif et chevauchement local controles. Recapitulatif du prix des nuits sans frais de plateforme avant enregistrement d'une demande non confirmee. Correction utilisateur : les frais hotel de 4,99 USD concernent uniquement One Million Travel, pas Restaurants.
- Liste des demandes du client dans les ecrans tables/chambres.
- Transitions locales de commande ordonnees pending -> preparing -> ready -> completed pour le role Employe.
- Paiement : recapitulatif avant preparation, garde anti-double-clic, absence de nouvelle preparation si paymentId deja present ; statut de paiement distinct du statut de preparation cuisine ; aucun PIN inutilise demande.
- Simulations et historique locaux distingues des encaissements reels. Aucun total de revenus reels calcule depuis les simulations. Creation d'une fiche employe non presentee comme attribution de droits serveur.

## Verifications

- `node scripts/test-restaurant-journey.mjs` : panier, tarifs, frais, chevauchements et transitions reussis.
- `npm run test:module-navigation` : notamment 14 actions Restaurant vers sections existantes ; controle statique uniquement.
- `npm run lint` : reussi (controle statique limite).
- Compilation Vite : 178 modules, reussie en 3,93 s avec option temporaire preserveSymlinks ; configuration du projet inchangee.

## Reste a faire

Recette navigateur desktop/mobile avec comptes par role, retours arriere et rechargement. Verifier transmission cuisine, capacite des tables, inventaire serveur transactionnel, disponibilite hoteliere reelle, paiements sandbox et recus verifies. La demande de chambre n'a pas encore de parcours de paiement connecte : aucun debit n'est lance par sa creation.

Les collections locales restent partagees par navigateur et pas suffisamment cloisonnees par compte/etablissement ; les affectations employes et permissions necessitent une verification serveur. Les conflits de reservation sont controles localement seulement. Les protections frontend ne garantissent pas l'idempotence serveur apres rechargement ou perte de reponse reseau. Le cash n'est pas encaisse par ce formulaire. La synchronisation cloud existante n'est pas attendue comme preuve de validation metier.

Ce lot ne certifie pas le module a 100 %.
