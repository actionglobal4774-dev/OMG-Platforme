export function validPropertyDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validatePropertyDraft(draft) {
  for (const field of ['title', 'country', 'city', 'street']) if (!draft[field]?.trim()) return 'Titre, pays, ville et rue obligatoires.';
  if (!['House', 'Apartment', 'Land', 'Commercial'].includes(draft.type) || !['USD', 'EUR', 'HTG'].includes(draft.currency)) return 'Type et devise valides obligatoires.';
  if (!Number.isFinite(Number(draft.price)) || Number(draft.price) <= 0) return 'Prix positif valide obligatoire.';
  for (const field of ['bedrooms', 'bathrooms']) if (String(draft[field]).trim() === '' || !Number.isInteger(Number(draft[field])) || Number(draft[field]) < 0) return 'Chambres et salles de bain : nombres entiers positifs ou nuls obligatoires.';
  if (draft.type === 'Land' && (Number(draft.bedrooms) !== 0 || Number(draft.bathrooms) !== 0)) return 'Pour un terrain, indiquez 0 chambre et 0 salle de bain.';
  if (!draft.authorized) return 'Confirmez votre droit de publier ce bien.';
  return '';
}

export function validatePropertyMedia(file, type) {
  if (!file) return 'Selectionnez un fichier.';
  const allowed = type === 'photo' ? ['image/jpeg', 'image/png', 'image/webp'] : type === 'video' ? ['video/mp4', 'video/webm'] : [];
  const limit = type === 'photo' ? 5 : 50;
  return allowed.includes(file.type) && file.size > 0 && file.size <= limit * 1024 * 1024 ? '' : `Format incompatible ou taille depassee (${limit} Mo maximum).`;
}
