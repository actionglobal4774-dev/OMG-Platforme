import React from "react";
import { useTranslation } from "react-i18next";

function PaymentMethods() {
  const { t } = useTranslation();
  const label = (key, fallback) => t(key, { defaultValue: fallback });
  const methods = [
    t("payflow_method_omg_wallet"),
    t("payflow_method_bank_card"),
    t("payflow_method_operator"),
    "PayPal",
    t("payflow_method_bank_transfer"),
    t("payflow_method_international_bank", { defaultValue: "Banque internationale" }),
    "SWIFT / IBAN / Routing",
    t("payflow_method_mobile_money"),
    "MonCash",
    "NatCash",
    "Ria",
    "MoneyGram",
    "CAM Transfer"
  ];

  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">{t("payment_methods")}</h2>
      <p className="mt-2 text-sm text-gray-400">
        {label("payflow_external_methods_notice", "Ces connexions doivent rester activees par API officielle et accord partenaire avant production.")}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {methods.map((method) => (
          <div key={method} className="rounded border border-omgGold/30 p-3 text-gray-200">{method}</div>
        ))}
      </div>
    </div>
  );
}

export default PaymentMethods;
