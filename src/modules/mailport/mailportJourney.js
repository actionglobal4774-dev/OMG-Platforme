export function nextMailportStatus(status) {
  return ({ created: 'carrier_scanned', carrier_scanned: 'in_transit', in_transit: 'delivered' })[status] || null;
}

export function validateMailportDelivery(role, nextStatus, receiverName, proofPhoto) {
  if (role !== 'carrier') return 'Seul un livreur autorise peut confirmer cette etape avec le service actuel.';
  if (!nextStatus) return 'Aucune prochaine etape disponible pour ce colis.';
  if (nextStatus === 'delivered' && (!receiverName?.trim() || !proofPhoto)) return 'La livraison exige le nom du receveur et une photo de preuve.';
  return '';
}
