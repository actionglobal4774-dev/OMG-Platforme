# Backend renforce OMG Platforme

Ce dossier contient une version renforcee du backend Firebase pour One Million Global Platforme.

## Elements ajoutes

- Comptes separes par module avec pays, langue, role, statut et regle de mot de passe non stocke en clair.
- Navigation backend par module selon les roles autorises.
- Validation serveur des transferts Payflow avec KYC automatique a partir de 500 USD.
- File de messages `communicationsQueue` pour email, SMS et notifications application.
- Tickets support par module.
- Capture PayPal cote serveur.
- Règles Firestore pour nouvelles collections.
- Règles Storage pour images et PDF jusqu'a 15 MB.
- Index Firestore pour les requetes principales.

## Fichiers a copier dans le projet reel

- `functions/index.js`
- `functions/package.json`
- `firestore.rules`
- `storage.rules`
- `firebase.json`
- `firestore.indexes.json`

## Commandes PowerShell de copie

Depuis n'importe quel dossier PowerShell :

```powershell
$src="C:\Users\actio\Documents\Codex\BACKEND_RENFORCE_OMG_PLATFORME_2026-06-11"
$dst="C:\Users\actio\Documents\OMG Platforme"
Copy-Item "$src\functions\index.js" "$dst\functions\index.js" -Force
Copy-Item "$src\functions\package.json" "$dst\functions\package.json" -Force
Copy-Item "$src\firestore.rules" "$dst\firestore.rules" -Force
Copy-Item "$src\storage.rules" "$dst\storage.rules" -Force
Copy-Item "$src\firebase.json" "$dst\firebase.json" -Force
Copy-Item "$src\firestore.indexes.json" "$dst\firestore.indexes.json" -Force
```

## Verification locale

```powershell
cd "C:\Users\actio\Documents\OMG Platforme\functions"
npm run lint
```

## Deploiement Firebase

```powershell
cd "C:\Users\actio\Documents\OMG Platforme"
firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

## Notes importantes

- Les secrets PayPal doivent rester dans Firebase Functions, jamais dans `App.js`.
- Les mots de passe par module ne doivent pas etre stockes en clair dans Firestore.
- Les vrais envois email/SMS devront etre connectes plus tard a un fournisseur comme SendGrid, Twilio ou Firebase Extensions.
