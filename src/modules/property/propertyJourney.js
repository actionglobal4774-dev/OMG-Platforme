import { validPropertyDate } from './propertyFormValidation.js';

export function ownsProperty(item, profile) {
  return Boolean(item?.owner && profile?.email && item.owner.toLowerCase() === profile.email.toLowerCase());
}

export function validatePropertyContract(contract, property, profile) {
  if (!ownsProperty(property, profile)) return 'Choisissez un bien qui vous appartient.';
  if (!contract.tenant?.trim() || !Number.isFinite(Number(contract.amount)) || Number(contract.amount) <= 0) return 'Locataire et montant valide obligatoires.';
  if (!validPropertyDate(contract.startDate) || !validPropertyDate(contract.endDate) || contract.endDate <= contract.startDate) return 'Dates valides obligatoires, fin strictement posterieure au debut.';
  if (!contract.confirmed) return 'Confirmez les informations du brouillon.';
  return '';
}
