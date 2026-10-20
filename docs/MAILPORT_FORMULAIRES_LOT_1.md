# Mailport — completion des formulaires, premier lot

Publication : pays/ville/rue/type requis, coordonnees bornees, autorisation explicite de publier, garde anti-double-clic. Modifier la rue invalide ses coordonnees pour eviter une geolocalisation obsolete. Photos adresse/proprietaire : JPG, PNG ou WebP non vides, maximum 5 Mo. Meme validation pour la preuve finale de livraison avant televersement.

Candidature livreur : pays, ville, transport, telephone et zone de service ; confirmation invalidee lorsque ces champs changent. Sauvegarde/reprise locale par email du profil, confirmation non restauree. Pas de reference d'identite recueillie a ce stade. Stockage indisponible signale sans annoncer une sauvegarde reussie. Bouton et messages indiquent clairement brouillon, pas envoi.

Preuves : 14 assertions unitaires ; navigation statique Mailport ; lint ; compilation en 4,09 s avec option temporaire preserveSymlinks.

Limites : aucune recette navigateur ni transmission effective de candidature. Stockage local non chiffre, pas de controle serveur du fichier ajoute par ce lot (la verification MIME frontend n'est pas une garantie de securite). Mise a jour des photos d'une adresse existante encore non transmise et non terminee. Les droits de publication et livreur restent a verifier par le serveur. Une interruption apres televersement peut laisser un fichier sans publication. Pas de nouvelle integration backend. Ce lot ne termine pas tous les formulaires Mailport ni ceux de la plateforme.
