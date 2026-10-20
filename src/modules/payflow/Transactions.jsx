import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getTransactions } from "../../services/payflowService";

function Transactions() {
  const { t } = useTranslation();
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const statuses = { completed: "Confirmée par le serveur", awaiting_payment: "En attente de paiement", awaiting_verification: "En attente de vérification", prepared: "Préparée", demo: "Démonstration" };
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
      <p className="mt-3 text-sm text-gray-300">Historique des démarches préparées depuis cet appareil. Le relevé financier serveur reste à connecter.</p>
      <div className="mt-4 flex flex-wrap gap-3"><input aria-label="Rechercher une référence Payflow" value={search} onChange={(event) => setSearch(event.target.value)} className="rounded border bg-black p-3 text-white" placeholder="Référence" /><select aria-label="Filtrer le statut" className="rounded border bg-black p-3 text-white" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tous les statuts</option>{Object.entries(statuses).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
      <div className="mt-4 space-y-2">
        {transactions.filter((item) => item.id.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || item.status === filter)).map((transaction) => (
          <div key={transaction.id} className="flex flex-wrap justify-between gap-3 rounded border border-gray-800 p-3 text-sm">
            <span>{transaction.id} - {transactionTypeLabel(transaction.type)}</span>
            <span>{transaction.amount} {transaction.currency}</span>
            <span>{statuses[transaction.status] || "Statut inconnu"}</span>
            <span className="flex gap-3"><Link className="underline" to={`/payflow/track-transfer?reference=${encodeURIComponent(transaction.id)}`}>Suivre</Link><Link className="underline" to={`/payflow/dispute?reference=${encodeURIComponent(transaction.id)}`}>Signaler un probleme</Link></span>
          </div>
        ))}
        {!transactions.length && <div className="rounded border border-gray-800 p-4 text-sm text-gray-300">Aucune transaction Payflow pour ce compte.</div>}
        {transactions.length > 0 && !transactions.some((item) => item.id.toLowerCase().includes(search.toLowerCase()) && (filter === "all" || item.status === filter)) && <p>Aucune démarche ne correspond aux filtres.</p>}
      </div>
    </div>
  );
}

export default Transactions;
