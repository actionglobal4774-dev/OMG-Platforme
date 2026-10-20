# One Million Store Online — parcours lot 2

19 octobre 2026. Frontend uniquement ; backend inchange.

Corrections : preparation de commande distincte de la confirmation de paiement ; affichage du devis serveur, livraison incluse, avant debit Payflow ou redirection ; garde anti-double-clic et conservation du devis dans l'ecran en cas d'erreur. Aucun frais fixe ajoute par le frontend.

Panier : limites de stock depuis catalogue, fiche produit, panier et paiement ; controle des prix, quantites, doublons et devise USD avant preparation. Produits exemples limites au mode demonstration. Adresse initiale filtree par compte ; controle de possession avant modification photo/stock ; photo indiquee comme nom de fichier local non televerse. Commandes filtrees par client localement ; liens adresse -> paiement -> commandes -> suivi Mailport. Le total de simulations locales n'est plus presente comme revenu vendeur reel.

Preuves : 17 assertions unitaires panier/possession/devis ; test statique des 12 sections ; lint ; compilation reussie en 3,63 s. Compilation avec option temporaire preserveSymlinks sans modifier la configuration du projet.

Limites : pas de recette navigateur mobile/web ni paiement sandbox. Catalogue/panier et collections locales partages par navigateur ; synchronisation cloud non attendue comme validation metier. Retours PayPal/Stripe ne restituent pas encore toujours customer dans le cache : certaines commandes externes pourront ne pas apparaitre dans la liste filtree. Recuperation de commandes serveur et reprise apres rechargement a terminer. Retour sans payer laisse une commande serveur en attente, sans annulation backend. Une perte de reponse peut necessiter une verification manuelle avant nouvel essai ; garde frontend non equivalente a idempotence serveur.

Les avis ne sont pas verifies par achat, la carte reste mock et Commerce AI reste une recherche locale. L'affichage des droits et le filtrage frontend ne remplacent pas les permissions serveur. Le colis Mailport exige son QR signe pour une inspection reelle ; le lien de suivi ne prouve pas une livraison.

Le module n'est pas certifie operationnel a 100 %.
