export function validateHealthAppointment(appointment, provider, appointments, patient, now = Date.now()) {
  const when = Date.parse(`${appointment.date}T${appointment.time}`);
  if (!patient || !provider || !appointment.consent || !Number.isFinite(when) || when <= now) return 'Professionnel, creneau futur valide et consentement obligatoires.';
  if (appointments.some((item) => item.patient === patient && item.providerId === provider.id && item.date === appointment.date && item.time === appointment.time && item.status !== 'cancelled')) return 'Une demande existe deja pour ce professionnel et ce creneau.';
  return '';
}

export function validateHealthPayment(item, patient, confirmed) {
  if (!item || !patient || item.patient !== patient) return 'Choisissez votre propre rendez-vous.';
  if (item.paymentId || ['paid', 'payment_prepared', 'simulated'].includes(item.paymentStatus)) return 'Un paiement ou une preparation existe deja : verifiez son statut avant de recommencer.';
  if (!Number.isFinite(Number(item.price)) || Number(item.price) <= 0) return 'Montant du service invalide.';
  if (!confirmed) return 'Confirmez le service et son montant.';
  return '';
}

export function validateHealthShare(share, patient, isPatient, now = Date.now()) {
  if (!share.patientRef?.trim() || !share.recipient?.trim() || !share.scope?.trim()) return 'Patient, destinataire et perimetre obligatoires.';
  if (isPatient && share.patientRef.trim().toLowerCase() !== String(patient || '').trim().toLowerCase()) return 'Un patient peut demander le partage de son propre dossier uniquement.';
  const expiry = Date.parse(share.expiresAt);
  return !Number.isFinite(expiry) || expiry <= now ? 'La date expiration doit etre dans le futur.' : '';
}
