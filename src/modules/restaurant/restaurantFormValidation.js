export function ownsRestaurant(establishments, id, email) {
  return Boolean(email && establishments.some((item) => item.id === id && item.owner?.toLowerCase() === email.toLowerCase()));
}

export function validateRestaurantResource(resource) {
  if (!resource.name?.trim() || !['Menu', 'Chambre', 'Table'].includes(resource.kind)) return 'Nom et type de ressource obligatoires.';
  if (resource.kind === 'Table') return Number.isInteger(Number(resource.stock)) && Number(resource.stock) >= 1 ? '' : 'Une table doit avoir au moins une place.';
  if (!Number.isFinite(Number(resource.price)) || Number(resource.price) <= 0) return 'Prix positif valide obligatoire.';
  if (!Number.isInteger(Number(resource.stock)) || Number(resource.stock) < 0 || String(resource.stock).trim() === '') return 'Stock entier positif ou nul obligatoire.';
  if (resource.kind === 'Chambre' && (!Number.isInteger(Number(resource.capacity)) || Number(resource.capacity) < 1)) return 'Capacite voyageurs positive obligatoire pour une chambre.';
  return '';
}

export function validateRestaurantTable(reservation, table, existing) {
  if (!table?.available || !Number.isInteger(Number(reservation.guests)) || Number(reservation.guests) > table.capacity || Number(reservation.guests) < 1) return 'Choisissez une table disponible de capacite suffisante.';
  if (existing.some((item) => item.tableId === table.id && item.date === reservation.date && item.time === reservation.time && item.status !== 'cancelled')) return 'Cette table a deja une demande locale pour ce creneau.';
  return '';
}
