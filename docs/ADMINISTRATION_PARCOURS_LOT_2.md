# Administration — supervision frontend

19 octobre 2026. Aucun backend modifie.

Vue centrale ajoutee : 11 modules metier (Payflow, Mailport, Property, Restaurant, Store, Health, School, City, USA Tax Pro, University, Travel), liens canoniques et perimetres de supervision explicites. Compteurs d'activites utilisant les vrais identifiants, y compris tax/taxpro. Chaque module garde ses permissions : un lien administrateur n'accorde pas automatiquement un acces aux dossiers medicaux, scolaires ou fiscaux.

Demandes de revue, maintenance, reprise et permissions : cible, justification et confirmation obligatoires. Enregistrement comme brouillon uniquement, sans mise en maintenance effective. La fausse seconde approbation locale ne marque plus une demande approved : authentification distincte et autorisation serveur requises. Journal local non presente comme inviolable. Activites de gestion prepared, pas confirmed.

Finance : 11 modules au lieu de 10, retrait du total consolide et de la commission globale 4,99 % sur la vue transactions ; calculateur financier clairement identifie comme simulation locale, sans appliquer son taux aux autres modules.

Preuves : test des 11 modules et de leurs routes, compteurs et validations de demandes ; controle statique navigation dont 14 actions Administration ; lint ; compilation reussie en 3,73 s avec option temporaire preserveSymlinks sans modifier la configuration.

Limites : aucun essai navigateur ni authentification admin serveur verifiee. Les roles locaux ne constituent pas une autorisation administrateur. Absence de controles backend effectifs de maintenance, suspension, nomination, seconde approbation, collecte de statistiques et rapprochement. Collections locales partagees et champs sensibles potentiellement trop larges : un cloisonnement serveur et des vues agreg ees minimales sont indispensables. Pays/modules des admins limites pas encore garantis par le serveur. Le simulateur financier peut encore melanger des ecritures/devises et n'est pas une comptabilite. Les anciennes donnees approved et immutable ne sont pas migrees ou effacees.

Ne pas considerer cette console comme une administration de production complete. Les etapes suivantes doivent definir les permissions serveur par role/pays/module, l'approbation authentifiee, les API de gestion, les audits inviolables et les tests d'acces interdits.

Couverture restante : USA Tax Pro figure dans la supervision et a eu une verification statique de navigation, mais n'a pas encore recu ce lot 2 de correction detaillee des parcours dans cette suite de travail. Les autres modules conservent les limites documentees dans leurs rapports.
