import React from "react";
import { useTranslation } from "react-i18next";
import { payService } from "../../services/payflowService";

function Checkout({ module, amount = 0 }) {
  const { t } = useTranslation();
  const moduleName = module || t("payflow_default_service");
  const payment = async () => {
    await payService({ module: moduleName, amount });
    alert(t("payflow_checkout_sent"));
  };

  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <h2 className="font-bold text-omgGold">{t("payflow_checkout")}</h2>
      <p className="mt-2 text-gray-300">{t("services")}: {moduleName}</p>
      <p className="text-gray-300">{t("payflow_amount_placeholder")}: ${amount}</p>
      <button onClick={payment} className="mt-3 rounded bg-omgGreen p-3 font-bold text-white">{t("payflow_pay_with")}</button>
    </div>
  );
}

export default Checkout;
