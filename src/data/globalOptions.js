export const countries = [
  { code: "US", name: "United States", flag: "US", phoneCode: "+1", currency: "USD", currencyRateFromUsd: 1, languages: ["en", "es"], regions: ["Massachusetts", "New York", "Florida", "California", "Texas"] },
  { code: "HT", name: "Haiti", flag: "HT", phoneCode: "+509", currency: "HTG", currencyRateFromUsd: 132, languages: ["ht", "fr"], regions: ["Ouest", "Nord", "Artibonite", "Sud", "Centre"] },
  { code: "DO", name: "Dominican Republic", flag: "DO", phoneCode: "+1", currency: "DOP", currencyRateFromUsd: 59, languages: ["es"], regions: ["Distrito Nacional", "Santiago", "La Vega", "San Cristobal"] },
  { code: "CA", name: "Canada", flag: "CA", phoneCode: "+1", currency: "CAD", currencyRateFromUsd: 1.37, languages: ["en", "fr"], regions: ["Quebec", "Ontario", "Alberta", "British Columbia"] },
  { code: "FR", name: "France", flag: "FR", phoneCode: "+33", currency: "EUR", currencyRateFromUsd: 0.92, languages: ["fr"], regions: ["Ile-de-France", "Provence-Alpes-Cote d'Azur", "Occitanie"] },
  { code: "SN", name: "Senegal", flag: "SN", phoneCode: "+221", currency: "XOF", currencyRateFromUsd: 604, languages: ["fr"], regions: ["Dakar", "Thies", "Saint-Louis", "Ziguinchor"] },
  { code: "CI", name: "Cote d'Ivoire", flag: "CI", phoneCode: "+225", currency: "XOF", currencyRateFromUsd: 604, languages: ["fr"], regions: ["Abidjan", "Yamoussoukro", "Bouake", "San-Pedro"] },
  { code: "CM", name: "Cameroon", flag: "CM", phoneCode: "+237", currency: "XAF", currencyRateFromUsd: 604, languages: ["fr", "en"], regions: ["Centre", "Littoral", "Ouest", "Nord-Ouest"] },
  { code: "NG", name: "Nigeria", flag: "NG", phoneCode: "+234", currency: "NGN", currencyRateFromUsd: 1500, languages: ["en"], regions: ["Lagos", "Abuja", "Kano", "Rivers"] },
  { code: "GH", name: "Ghana", flag: "GH", phoneCode: "+233", currency: "GHS", currencyRateFromUsd: 15, languages: ["en"], regions: ["Greater Accra", "Ashanti", "Northern", "Western"] },
  { code: "BR", name: "Brazil", flag: "BR", phoneCode: "+55", currency: "BRL", currencyRateFromUsd: 5.5, languages: ["pt"], regions: ["Sao Paulo", "Rio de Janeiro", "Bahia", "Minas Gerais"] },
  { code: "MX", name: "Mexico", flag: "MX", phoneCode: "+52", currency: "MXN", currencyRateFromUsd: 18, languages: ["es"], regions: ["Ciudad de Mexico", "Jalisco", "Nuevo Leon", "Puebla"] },
  { code: "ES", name: "Spain", flag: "ES", phoneCode: "+34", currency: "EUR", currencyRateFromUsd: 0.92, languages: ["es"], regions: ["Madrid", "Catalonia", "Andalusia", "Valencia"] },
  { code: "PT", name: "Portugal", flag: "PT", phoneCode: "+351", currency: "EUR", currencyRateFromUsd: 0.92, languages: ["pt"], regions: ["Lisbon", "Porto", "Braga", "Coimbra"] },
  { code: "MA", name: "Morocco", flag: "MA", phoneCode: "+212", currency: "MAD", currencyRateFromUsd: 10, languages: ["ar", "fr"], regions: ["Casablanca-Settat", "Rabat-Sale-Kenitra", "Marrakesh-Safi"] },
  { code: "DZ", name: "Algeria", flag: "DZ", phoneCode: "+213", currency: "DZD", currencyRateFromUsd: 135, languages: ["ar", "fr"], regions: ["Algiers", "Oran", "Constantine", "Setif"] },
  { code: "TN", name: "Tunisia", flag: "TN", phoneCode: "+216", currency: "TND", currencyRateFromUsd: 3.1, languages: ["ar", "fr"], regions: ["Tunis", "Sfax", "Sousse", "Kairouan"] },
  { code: "KE", name: "Kenya", flag: "KE", phoneCode: "+254", currency: "KES", currencyRateFromUsd: 129, languages: ["en"], regions: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"] },
  { code: "ZA", name: "South Africa", flag: "ZA", phoneCode: "+27", currency: "ZAR", currencyRateFromUsd: 18, languages: ["en"], regions: ["Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape"] },
  { code: "IN", name: "India", flag: "IN", phoneCode: "+91", currency: "INR", currencyRateFromUsd: 83, languages: ["en"], regions: ["Delhi", "Maharashtra", "Karnataka", "Tamil Nadu"] }
];

export const languages = [
  { code: "en", label: "English" },
  { code: "fr", label: "Francais" },
  { code: "ht", label: "Kreyol Ayisyen" },
  { code: "es", label: "Espanol" },
  { code: "pt", label: "Portugues" },
  { code: "ar", label: "Arabic" }
];

export function getCountryByName(name) {
  return countries.find((country) => country.name === name) || countries[0];
}

export function getCountryByCode(code) {
  return countries.find((country) => country.code === code) || countries[0];
}

export function getCurrencyForCountryCode(code) {
  return getCountryByCode(code).currency || "USD";
}

export function getCountryServiceCharge(countryCode, usdAmount = 4.99) {
  const country = getCountryByCode(countryCode);
  const localAmount = Number((usdAmount * Number(country.currencyRateFromUsd || 1)).toFixed(2));
  return {
    usdAmount,
    localAmount,
    currency: country.currency || "USD"
  };
}

export function getPrimaryLanguageForCountry(countryName) {
  const country = getCountryByName(countryName);
  return country.languages[0] || "en";
}
