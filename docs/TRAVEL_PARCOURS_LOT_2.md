# One Million Travel — parcours lot 2

19 octobre 2026. Frontend uniquement ; aucun backend modifie. Administration reste le dernier module.

## Corrections

- Calcul des vols et taxes multiplie par voyageurs ; frais de service 4,99 USD par billet et 4,99 USD par chambre/reservation, jamais par nuit. Tarifs en centimes arrondis. Assurance exemple par voyageur, taxes hotel exemples par chambre/sejour, hypotheses affichees.
- Dates non passees, duree et quantites entieres positives, budget fini positif si renseigne. Dans le prototype actuel, le champ duree est interprete comme nuits facturees et ce point est indique au recapitulatif.
- Consentement donnees distinct de confirmation du recapitulatif ; modification du voyage, des offres ou de la preference de paiement invalide la confirmation.
- Garde anti-double-clic ; detection locale de demande similaire. Resultat serveur exige ok/live/id : absence de configuration ne devient plus un succes local.
- Offres exemples bloquees en production avant demande ou paiement. Preferences Payflow/MonCash/NatCash/carte non presentees comme integration de paiement effective.
- Annulation : recapitulatif et confirmation humaine, controle proprietaire, resultat serveur verifie lorsqu'une reference serveur existe ; dossier uniquement local explicitement non transmis.
- Assistance : brouillon local et non message transmis. Collections reservations/support filtrees par compte, y compris compteurs partenaires/admin : ce ne sont donc pas des statistiques globales.

## Preuves

15 assertions unitaires tarifs/dates/quantites/frais ; test statique Travel des 12 ecrans ; lint ; compilation 184 modules reussie en 3,68 s avec option temporaire preserveSymlinks, sans modification de configuration.

## Limites

Pas de recette navigateur desktop/mobile ni paiement sandbox. Aucun connecteur de disponibilite/recherche/achat fournisseur reel ; aucun billet ou police emis. Les exemples ne sont pas adaptes dynamiquement aux destinations saisies. Le parcours ne debite ni Payflow ni MonCash/NatCash.

Il reste a separer proprement dates aller/retour, arrivee/depart hotel, nuits et duree totale ; prendre en charge devis fournisseur expire, disponibilite, capacite, devises, regles enfants/chambres, remboursement et documents reels. Aucun changement de tarification Restaurants : ces frais sont propres a Travel.

Collections locales partagees par navigateur et filtrage frontend non equivalents a autorisations serveur. Reprise apres rechargement, idempotence serveur et recherche des dossiers serveur restent a terminer. Les documents et statuts historiques locaux ne constituent pas une confirmation fournisseur ; administration et partenaires ont encore des panneaux explicatifs plutot que des outils relies a leurs donnees serveur.

Ce lot ne certifie pas Travel operationnel a 100 %.
