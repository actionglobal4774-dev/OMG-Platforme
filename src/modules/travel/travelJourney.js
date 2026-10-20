export const TRAVEL_SERVICE_FEE_USD = 4.99;

function validTravelDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function travelHotelNights(trip) {
  if (!validTravelDate(trip.checkIn) || !validTravelDate(trip.checkOut) || trip.checkOut <= trip.checkIn) return null;
  return (Date.parse(`${trip.checkOut}T00:00:00Z`) - Date.parse(`${trip.checkIn}T00:00:00Z`)) / 86400000;
}

export function validateTravelDates(trip, hotelSelected = false) {
  if (trip.returnDate && (!validTravelDate(trip.returnDate) || trip.returnDate < trip.departure)) return 'Le retour doit etre une date valide, non anterieure au depart.';
  if (hotelSelected || trip.checkIn || trip.checkOut) {
    if (!travelHotelNights(trip)) return 'Arrivee et depart hotel valides obligatoires, avec au moins une nuit.';
    if (trip.checkIn < trip.departure || (trip.returnDate && trip.checkOut > trip.returnDate)) return 'Le sejour hotel doit etre compris dans les dates du voyage.';
  }
  return '';
}

export function validateTravelTrip(trip, today = new Date().toLocaleDateString('en-CA')) {
  if (!trip.origin?.trim() || !trip.destination?.trim() || !trip.consent) return 'Origine, destination et consentement aux donnees obligatoires.';
  const date = new Date(`${trip.departure}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== trip.departure || trip.departure < today) return 'Date de depart valide, non passee, obligatoire.';
  for (const field of ['days', 'travelers', 'rooms']) if (!Number.isSafeInteger(Number(trip[field])) || Number(trip[field]) < 1) return 'Duree, voyageurs et chambres doivent etre des entiers positifs.';
  if (trip.budget && (!Number.isFinite(Number(trip.budget)) || Number(trip.budget) <= 0)) return 'Budget positif valide obligatoire si renseigne.';
  const dateError = validateTravelDates(trip);
  if (dateError) return dateError;
  return '';
}

export function quoteTravel(trip, flight, hotel, insurance) {
  const travelers = Number(trip.travelers), rooms = Number(trip.rooms);
  // Old saved drafts remain readable; new forms provide explicit hotel dates.
  const nights = trip.checkIn || trip.checkOut ? travelHotelNights(trip) : Number(trip.days);
  if (![travelers, rooms, nights].every((value) => Number.isSafeInteger(value) && value > 0)) return null;
  const round = (amount) => Math.round(amount * 100) / 100;
  const flightAmount = flight ? round((flight.supplierPrice + flight.taxes) * travelers) : 0;
  const hotelAmount = hotel ? round((hotel.nightly * nights + hotel.taxes) * rooms) : 0;
  const insuranceAmount = insurance ? round(insurance.price * travelers) : 0;
  const ticketServiceFee = flight ? round(TRAVEL_SERVICE_FEE_USD * travelers) : 0;
  const roomServiceFee = hotel ? round(TRAVEL_SERVICE_FEE_USD * rooms) : 0;
  const serviceFee = round(ticketServiceFee + roomServiceFee);
  const total = round(flightAmount + hotelAmount + insuranceAmount + serviceFee);
  if (![flightAmount, hotelAmount, insuranceAmount, total].every((amount) => Number.isFinite(amount) && amount >= 0)) return null;
  return { flightAmount, hotelAmount, insuranceAmount, ticketServiceFee, roomServiceFee, serviceFee, total };
}
