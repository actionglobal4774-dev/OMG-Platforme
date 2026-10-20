export const payflowPages = [
  ["wallet", "Portefeuille Payflow", "Portefeuille"],
  ["send", "Envoyer de l'argent", "Envoyer"],
  ["request", "Demander de l'argent", "Demander"],
  ["receive", "Recevoir de l'argent", "Recevoir"],
  ["deposit", "Depot operateur", "Depot"],
  ["withdraw", "Retrait operateur", "Retrait"],
  ["exchange", "Changer de pays et de devise", "Devise"],
  ["transactions", "Historique des transactions", "Transactions"],
  ["qr-payment", "Paiement QR Payflow", "QR"],
  ["operators", "Operateurs Payflow", "Operateurs"],
  ["verification", "Verification du compte", "Verification"],
  ["payment-methods", "Moyens de paiement", "Paiements"],
  ["settings", "Parametres Payflow", "Parametres"],
  ["dispute", "Ouvrir un litige Payflow", "Litige"],
  ["track-transfer", "Suivre un transfert Payflow", "Suivi"]
];

export function getPayflowActionPath(action) {
  const value = String(action || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const matches = [
    [/depot|deposit/, "deposit"], [/retrait|withdraw/, "withdraw"],
    [/envoyer|send/, "send"], [/demander|request/, "request"],
    [/recevoir|receive/, "receive"], [/qr/, "qr-payment"],
    [/historique|transaction/, "transactions"], [/litige|dispute/, "dispute"],
    [/track|suivi/, "track-transfer"]
  ];
  const match = matches.find(([pattern]) => pattern.test(value));
  return match ? `/payflow/${match[1]}` : null;
}
