# One Million School — parcours lot 2

19 octobre 2026. Frontend uniquement ; aucun backend modifie.

Corrections : frais/livres exemples reserves au mode demonstration ; recapitulatif beneficiaire/montant/devise avant preparation du paiement ; remplacement des simulations directes Payflow par preparation serveur ou demonstration explicite ; garde anti-double-clic ; detection locale de paiement de frais deja prepare pour le meme beneficiaire ; PIN inutilise supprime ; NatCash/banque signales non connectes ; exemples de frais bloques chez les prestataires externes ; contexte Stripe School conserve avant redirection.

Livres : stock, quantite et prix verifies ; retrait du panier possible. Ecoles : controle de possession avant creation de classe, frais ou livre. Rapports : brouillons, filtre responsable et verification du code local avant affichage du contenu. Messages : brouillons, non presentes comme transmis. Journal et operations locales ne sont plus presentes comme paiements confirmes.

Preuves : 13 assertions unitaires stock/propriete/lecture de rapport ; controle statique de navigation (9 actions School) ; lint ; compilation 180 modules en 3,90 s, option temporaire preserveSymlinks sans changer la configuration.

Limites : aucune recette navigateur ou paiement sandbox. Pas de lien serveur entre eleve, responsable et etablissement ; stockage navigateur partage et codes de rapport en clair dans le stockage existant. Le verrou visuel ne constitue pas une securite pour des dossiers reels. Pas de gestion transactionnelle du stock, d'inscription des eleves, de livraison de livres ou de solde de facture scolaire. Les retours des prestataires ne rapprochent pas encore le paiement du dossier beneficiaire et peuvent revenir au tableau global. Un rechargement ou une perte de reponse reseau peut contourner les protections locales anti-doublons. Synchronisation cloud non attendue comme preuve de publication. Pas de migration ni suppression des anciennes donnees.

Le module ne doit pas etre utilise pour des dossiers reels d'eleves avant securisation serveur et recette complete. Non certifie a 100 %.
