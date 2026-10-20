export function validateMailportPhoto(file, required = true) {
  if (!file) return required ? 'Photo obligatoire.' : '';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return 'Photo JPG, PNG ou WebP uniquement.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > 5 * 1024 * 1024) return 'Photo non vide de 5 Mo maximum.';
  return '';
}

export function validateMailportPublication(form) {
  for (const field of ['country', 'city', 'street', 'addressType']) if (!form[field]?.trim()) return 'Pays, ville, adresse et type obligatoires.';
  if (!Number.isFinite(form.latitude) || Math.abs(form.latitude) > 90 || !Number.isFinite(form.longitude) || Math.abs(form.longitude) > 180) return 'Selectionnez une adresse geographique verifiee.';
  const photoError = validateMailportPhoto(form.photoFile) || validateMailportPhoto(form.ownerPhotoFile, false);
  if (photoError) return photoError;
  if (!form.authorized) return 'Confirmez votre droit de publier cette adresse.';
  return '';
}

export function validateMailportCourier(form) {
  if (!form.country?.trim() || !form.city?.trim() || !form.transport?.trim() || !form.serviceArea?.trim()) return 'Pays, ville, transport et zone de service obligatoires.';
  if (!/^\+?[0-9 ()-]{7,25}$/.test(form.phone || '') || (form.phone.match(/\d/g) || []).length < 7) return 'Numero de telephone de contact valide obligatoire.';
  if (!form.confirmed) return 'Confirmez les informations du brouillon.';
  return '';
}
