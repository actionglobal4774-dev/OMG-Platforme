# Property — parcours lot 2, 19 octobre 2026

Frontend uniquement. Aucun backend modifie.

Corrections : catalogue exemple limite au mode demonstration ; controle de possession avant medias, disponibilite et contrat ; contrat brouillon au lieu de signe localement ; montant fini et dates strictement ordonnees ; publication et televersement non presentes comme confirmes ; recapitulatif avant preparation du paiement, devise du bien, garde anti-double-clic, suppression de la demande de PIN inutilise ; simulations non additionnees comme revenus reels.

Frais : taux existant Property de 4,99 % conserve. La demande de 4,99 USD concernait Travel/hotel ; aucune generalisation a Property sans validation. Le serveur reste autoritaire pour les frais.

Preuves : 11 assertions unitaires propriete/contrat reussies ; test module-navigation reussi (dont 10 actions Property), lint reussi. Compilation avec option temporaire preserveSymlinks, sans changer la configuration du projet.

Limites : pas de recette navigateur mobile/web ou de paiement reel ; autorisations frontend non equivalentes a une securite serveur ; catalogue, favoris, contrats et historique locaux non isoles par compte ; synchronisation cloud non attendue et non confirmee ; contact/messagerie, reservation de visite, signature electronique, publication verifiee et execution de paiement restent a connecter ou verifier. Les selections d'autres proprietaires peuvent rester visibles mais les modifications sont refusees.

Ce lot ne certifie pas Property operationnel a 100 %. Les autres modules ne sont pas couverts par ces corrections.
