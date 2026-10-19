import React, { useEffect, useState } from "react";
import { getGoogleAddressDetails, isGoogleMapsConfigured, suggestGoogleAddresses } from "../../services/googleMapsService";

export default function AddressAutocomplete({ value, onChange, onAddress, placeholder = "Rechercher une adresse", className = "" }) {
  const [suggestions, setSuggestions] = useState([]);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!isGoogleMapsConfigured() || String(value || "").trim().length < 3) {
      setSuggestions([]);
      return undefined;
    }
    const timer = window.setTimeout(async () => {
      try {
        setSuggestions(await suggestGoogleAddresses(value));
        setNotice("");
      } catch (error) {
        setSuggestions([]);
        setNotice(error?.message || "Recherche d'adresse indisponible.");
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [value]);

  const choose = async (suggestion) => {
    onChange?.(suggestion.label);
    setSuggestions([]);
    try {
      const details = await getGoogleAddressDetails(suggestion.placeId);
      onChange?.(details.formattedAddress || suggestion.label);
      onAddress?.(details);
      setNotice("Adresse verifiee par Google Maps.");
    } catch (error) {
      setNotice(error?.message || "Adresse selectionnee, mais non verifiee.");
    }
  };

  return (
    <div className={`relative ${className}`}>
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full rounded border p-3"
        placeholder={placeholder}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {suggestions.slice(0, 5).map((suggestion) => (
            <button key={suggestion.placeId} type="button" onClick={() => choose(suggestion)} className="block w-full border-b border-slate-100 p-3 text-left text-sm hover:bg-slate-50">
              {suggestion.label}
            </button>
          ))}
          <p className="px-3 py-2 text-right text-xs font-semibold text-slate-500">Powered by Google</p>
        </div>
      )}
      {notice && <p className="mt-1 text-xs text-slate-600">{notice}</p>}
    </div>
  );
}
