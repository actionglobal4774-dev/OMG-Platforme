import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { countries, languages, getCountryByName, getPrimaryLanguageForCountry } from "../../data/globalOptions";

function CountryLanguageFields({ country, language, phone, region, onChange }) {
  const { i18n, t } = useTranslation();
  const selectedCountry = getCountryByName(country);
  const phoneValue = phone?.startsWith(selectedCountry.phoneCode) ? phone : `${selectedCountry.phoneCode} `;

  useEffect(() => {
    if (!language) {
      const nextLanguage = getPrimaryLanguageForCountry(country);
      onChange("language", nextLanguage);
      i18n.changeLanguage(nextLanguage);
    }
  }, [country, language, i18n, onChange]);

  const handleCountryChange = (event) => {
    const nextCountry = event.target.value;
    const nextLanguage = getPrimaryLanguageForCountry(nextCountry);
    const nextPhoneCode = getCountryByName(nextCountry).phoneCode;
    const nextRegion = getCountryByName(nextCountry).regions?.[0] || "";
    onChange("country", nextCountry);
    onChange("language", nextLanguage);
    onChange("phone", `${nextPhoneCode} `);
    onChange("region", nextRegion);
    localStorage.setItem("omg_language", nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  const handleLanguageChange = (event) => {
    const nextLanguage = event.target.value;
    onChange("language", nextLanguage);
    localStorage.setItem("omg_language", nextLanguage);
    i18n.changeLanguage(nextLanguage);
  };

  return (
    <>
      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-700">{t("country")}</span>
        <select value={country} onChange={handleCountryChange} className="rounded border p-3">
          {countries.map((item) => (
            <option key={item.code} value={item.name}>
              {item.flag} {item.name}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1">
        <span className="text-sm font-semibold text-slate-700">{t("language")}</span>
        <select value={language} onChange={handleLanguageChange} className="rounded border p-3">
          {languages.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">{t("region", { defaultValue: "Region / State / City" })}</span>
        <select
          value={selectedCountry.regions?.includes(region) ? region : selectedCountry.regions?.[0] || ""}
          onChange={(event) => onChange("region", event.target.value)}
          className="rounded border p-3"
        >
          {(selectedCountry.regions || []).map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1 md:col-span-2">
        <span className="text-sm font-semibold text-slate-700">Telephone</span>
        <input
          value={phoneValue}
          onChange={(event) => onChange("phone", event.target.value)}
          className="rounded border p-3"
          placeholder={`${selectedCountry.phoneCode} 000 000 0000`}
        />
      </label>
    </>
  );
}

export default CountryLanguageFields;
