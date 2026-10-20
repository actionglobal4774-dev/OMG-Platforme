# One Million City Management — parcours lot 2

19 octobre 2026. Frontend uniquement ; backend inchange.

Corrections : aucun premier marchand choisi comme dossier de secours ; marchand limite a son email, agent aux zones affectees, responsable aux municipalites dont il est gestionnaire. Controles de zone lors de l'enregistrement, photo, collecte et affectation. Doublon email/zone detecte. Coordonnees terrain controlees si renseignees.

Taxe : marchand explicite, montant fini positif, confirmation et recapitulatif avant operation. Detection locale d'une operation deja preparee pour la meme periode. PIN inutilise retire. Preparation Payflow protegee contre double-clic. Declaration agent separee du paiement : ne lance pas de preparation financiere, ne marque pas la taxe acquittee. Les simulations ne changent plus le marchand en PAYE ni lastPaidAt. Audit de preparation au lieu de TAX_PAID. Aucun total de collecte reelle calcule depuis les operations locales. Lien de resultat vers l'historique canonique /city-administration/history.

Preuves : 15 assertions unitaires acces/coordonnees/taxe ; controle statique des 12 actions City ; lint ; compilation reussie en 3,63 s avec option temporaire preserveSymlinks, sans changement de configuration.

Limites : recette navigateur et paiements sandbox non executes. Periodes encore saisies en texte libre : ecrire une periode datee, pas seulement Mois. Echeances, devises municipales, baremes autoritaires, quittances serveur, rapprochement et annulation de declarations restent a construire/verifier. Aucun droit serveur cree par l'affectation locale d'une zone. Collections locales partagees par navigateur ; filtrage frontend non equivalent a securite serveur. Anciennes valeurs paid conservees mais avertissement visible : non preuve de paiement. Vue retards fondee sur taxStatus local et non sur une creance/une echeance certifiee. Le journal local et le champ immutable ne rendent pas les donnees inviolables. Reprise apres perte reseau/rechargement non garantie ; synchronisation cloud non attendue comme validation municipale.

Ce lot ne certifie pas City operationnel a 100 %.
