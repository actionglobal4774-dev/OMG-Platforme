export function validateHealthVitals(form, role) {
  if (role !== 'Infirmier') return 'Saisie reservee au role Infirmier de ce parcours.';
  if (!form.patientRef?.trim()) return 'Reference patient obligatoire.';
  if (!['C', 'F'].includes(form.temperatureUnit)) return 'Unite de temperature obligatoire.';
  for (const key of ['temperature', 'pulse']) if (String(form[key] ?? '').trim() === '' || !Number.isFinite(Number(form[key])) || Number(form[key]) <= 0) return 'Temperature et pouls numeriques positifs obligatoires.';
  if (!/^\d+(?:\.\d+)?\s*\/\s*\d+(?:\.\d+)?$/.test(form.pressure || '')) return 'Tension au format systolique/diastolique, en mmHg.';
  if (form.pressure.split('/').some((value) => Number(value) <= 0)) return 'Valeurs de tension positives obligatoires.';
  return '';
}

export function validateHealthPrescription(form, role) {
  if (role !== 'Medecin') return 'Preparation reservee au role Medecin.';
  for (const field of ['patientRef', 'medication', 'dosage', 'duration', 'route', 'frequency']) if (!form[field]?.trim()) return 'Patient, medicament, dose, voie, frequence et duree obligatoires.';
  if (!form.reviewed) return 'Confirmez la relecture du brouillon.';
  return '';
}
