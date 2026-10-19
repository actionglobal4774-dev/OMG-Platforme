import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getTransactions } from "../../services/payflowService";

function Transactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const transactionTypeLabel = (type) => t(`payflow_transaction_${type}`, { defaultValue: type });

  useEffect(() => {
    async function load() {
      const response = await getTransactions();
      setTransactions(response.data);
    }
    load();
  }, []);

  return (
    <div className="omg-card mt-6 rounded-xl p-5">
      <h2 className="text-2xl font-bold text-omgGold">{t("transactions")}</h2>
      <div className="mt-4 space-y-2">
        {transactions.map((transaction) => (
          <div key={transaction.id} className="flex justify-between rounded border border-gray-800 p-3 text-sm">
            <span>{transaction.id} - {transactionTypeLabel(transaction.type)}</span>
            <span>{transaction.amount} {transaction.currency}</span>
          </div>
        ))}
        {!transactions.length && <div className="rounded border border-gray-800 p-4 text-sm text-gray-300">Aucune transaction Payflow pour ce compte.</div>}
      </div>
    </div>
  );
}

export default Transactions;
