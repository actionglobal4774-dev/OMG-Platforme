# Restaurants — formulaires, premier lot

Etablissement explicite appartenant au proprietaire requis pour ajouter menus/chambres/tables ou employes. Ressources rattachees a cet etablissement. Chambre : capacite voyageurs requise. Table : capacite positive et prix de reservation nul, sans exiger un prix de menu. Demande de table rattachee a une table concrete, capacite et doublon de creneau local controles. Fiche employe en attente, doublon email/etablissement refuse. Modification de stock limitee aux produits de l'etablissement possede.

Preuves : 9 assertions de formulaires ; tests parcours Restaurant existants ; lint ; compilation reussie en 4,59 s avec option temporaire preserveSymlinks.

Limites : pas de recette navigateur ; pas de stock transactionnel, horaire/duree de table ou disponibilite serveur. Anciens produits sans etablissement restent non modifiables par ce parcours jusqu'a rattachement verifie ; aucune migration automatique. Les anciens champs et dates doivent encore etre testes de bout en bout. Aucun backend modifie. Aucun droit serveur accorde par une fiche employe. Frais plateforme chambres Restaurants : toujours 0 ; frais de 4,99 USD reserves a Travel. Ce lot ne termine pas tous les formulaires de la plateforme.
