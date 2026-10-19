import React from "react";
import { useTranslation } from "react-i18next";
import { languages } from "../../data/globalOptions";

function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (event) => {
    const language = event.target.value;
    localStorage.setItem("omg_language", language);
    i18n.changeLanguage(language);
  };

  return (
    <label className="flex items-center gap-2 text-sm text-gray-200">
      <span className="sr-only">{t("language")}</span>
      <select
        value={i18n.language}
        onChange={changeLanguage}
        className="max-w-28 rounded-full border border-omgGold/50 bg-black px-2 py-2 text-xs text-white omg-focus sm:max-w-none sm:px-3 sm:text-sm"
        aria-label={t("language")}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.code.toUpperCase()} - {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
