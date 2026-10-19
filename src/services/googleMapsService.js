const mapsApiKey = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

export function isGoogleMapsConfigured() {
  return Boolean(mapsApiKey);
}

export async function suggestGoogleAddresses(input, languageCode = "fr") {
  const query = String(input || "").trim();
  if (!mapsApiKey || query.length < 3) return [];
  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": mapsApiKey
    },
    body: JSON.stringify({ input: query, languageCode })
  });
  if (!response.ok) throw new Error("La recherche d'adresses Google est temporairement indisponible.");
  const body = await response.json();
  return (body.suggestions || []).map((item) => item.placePrediction).filter(Boolean).map((prediction) => ({
    placeId: prediction.placeId,
    label: prediction.text?.text || "Adresse"
  }));
}

function componentValue(components, type) {
  const component = (components || []).find((item) => item.types?.includes(type));
  return component?.longText || component?.shortText || "";
}

export async function getGoogleAddressDetails(placeId, languageCode = "fr") {
  if (!mapsApiKey || !placeId) throw new Error("Adresse Google non configuree.");
  const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(languageCode)}`, {
    headers: {
      "X-Goog-Api-Key": mapsApiKey,
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location"
    }
  });
  if (!response.ok) throw new Error("Les details de cette adresse sont indisponibles.");
  const place = await response.json();
  const components = place.addressComponents || [];
  const streetNumber = componentValue(components, "street_number");
  const route = componentValue(components, "route");
  return {
    placeId: place.id || placeId,
    formattedAddress: place.formattedAddress || "",
    street: [streetNumber, route].filter(Boolean).join(" ") || place.formattedAddress || "",
    zone: componentValue(components, "sublocality") || componentValue(components, "neighborhood"),
    city: componentValue(components, "locality") || componentValue(components, "administrative_area_level_2"),
    country: componentValue(components, "country"),
    postalCode: componentValue(components, "postal_code"),
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null
  };
}
