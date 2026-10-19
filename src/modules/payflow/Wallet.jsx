import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getWallet } from "../../services/payflowService";

function Wallet() {
  const { t } = useTranslation();
  const [wallet, setWallet] = useState({ balance: 0, currency: "USD" });

  useEffect(() => {
    async function load() {
      const response = await getWallet();
      setWallet(response.data);
    }
    load();
  }, []);

  return (
    <div className="omg-card mt-6 rounded-xl p-6">
      <h2 className="text-xl font-bold text-omgGold">{t("payflow_wallet_balance")}</h2>
      <p className="mt-4 text-4xl font-black text-omgGreen">
        {wallet.balance} {wallet.currency}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to="/payflow/send" className="rounded bg-omgGreen px-4 py-3 text-center font-bold text-white">Envoyer</Link>
        <Link to="/payflow/request" className="rounded border border-omgGold px-4 py-3 text-center font-bold text-omgGold">Demander</Link>
        <Link to="/payflow/deposit" className="rounded border border-gray-600 px-4 py-3 text-center font-bold text-white">Depot</Link>
        <Link to="/payflow/withdraw" className="rounded border border-gray-600 px-4 py-3 text-center font-bold text-white">Retrait</Link>
      </div>
    </div>
  );
}

export default Wallet;
