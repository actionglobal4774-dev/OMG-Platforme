const sameEmail = (a, b) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

export function canAccessCityMerchant(merchant, profile, zones, municipalities) {
  if (!merchant || !profile?.email) return false;
  if (profile.userType === 'Marchand') return sameEmail(merchant.email, profile.email);
  const zone = zones.find((item) => item.id === merchant.zoneId);
  if (profile.userType === 'Agent') return sameEmail(zone?.agentEmail, profile.email);
  if (profile.userType === 'Responsable mairie') return municipalities.some((item) => item.id === zone?.municipalityId && sameEmail(item.manager, profile.email));
  return false;
}

export function validateCityCoordinates(latitude, longitude) {
  if (!latitude && !longitude) return '';
  if (!String(latitude).trim() || !String(longitude).trim()) return 'Renseignez latitude et longitude ensemble.';
  const lat = Number(latitude), lng = Number(longitude);
  return Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180 ? '' : 'Coordonnees geographiques invalides.';
}

export function validateCityTaxPayment(merchant, payment, priorPayments) {
  if (!merchant || !payment.periodLabel?.trim()) return 'Choisissez explicitement un marchand et une periode fiscale datee.';
  if (!Number.isFinite(Number(payment.amount)) || Number(payment.amount) <= 0) return 'Montant de taxe invalide.';
  if (!payment.confirmed) return 'Confirmez le marchand, la periode et le montant.';
  if (priorPayments.some((item) => item.merchantId === merchant.id && String(item.period || '').trim().toLowerCase() === payment.periodLabel.trim().toLowerCase() && ['payment_prepared', 'simulated', 'paid', 'collection_declared'].includes(item.status))) return 'Une operation existe deja pour ce marchand et cette periode. Verifiez son statut.';
  return '';
}
