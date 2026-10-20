export const supervisedModules = [
  ['payflow', 'Payflow', '/payflow', 'Transactions, agents et rapprochement'],
  ['mailport', 'Mailport', '/mailport', 'Adresses, achats, colis et livreurs'],
  ['property', 'Property', '/property', 'Biens, contrats et versements'],
  ['restaurant', 'Restaurant', '/restaurant-hotel-traiteur', 'Commandes, tables et chambres'],
  ['store', 'Store', '/store', 'Vendeurs, produits et livraison'],
  ['health', 'Health', '/health-care', 'Institutions et habilitations, sans acces clinique implicite'],
  ['school', 'School', '/school', 'Ecoles et habilitations, sans dossiers eleves implicites'],
  ['city', 'City', '/city-administration', 'Municipalites, zones et declarations'],
  ['tax', 'USA Tax Pro', '/usa-tax-pro', 'Dossiers, sans soumission fiscale implicite'],
  ['university', 'University', '/university-integration', 'Catalogue, inscriptions et droits'],
  ['travel', 'Travel', '/travel', 'Fournisseurs, demandes et annulations']
].map(([id, name, path, scope]) => ({ id, name, path, scope }));

export function adminActivityCount(activities, moduleId) {
  const items = activities?.[moduleId === 'tax' && !activities?.tax ? 'taxpro' : moduleId];
  return Array.isArray(items) ? items.length : 0;
}

export function validateAdminModuleRequest(moduleId, action, reason, email) {
  if (!supervisedModules.some((item) => item.id === moduleId)) return 'Module inconnu.';
  if (!['Revue du module', 'Maintenance demandee', 'Reprise demandee', 'Revue des permissions'].includes(action)) return 'Action inconnue.';
  if (!email || reason.trim().length < 10) return 'Identite et justification de 10 caracteres minimum obligatoires.';
  return '';
}
