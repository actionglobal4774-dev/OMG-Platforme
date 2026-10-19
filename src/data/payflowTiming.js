export const payflowDeliveryDelays = {
  payflow: "Instantane a 15 minutes",
  card: "Quelques minutes a 24 heures selon la banque",
  operator: "15 minutes a 2 heures selon l'operateur",
  moncash: "15 minutes a 2 heures selon MonCash",
  natcash: "15 minutes a 2 heures selon NatCash",
  ria: "1 a 3 jours ouvrables selon le pays",
  moneygram: "Quelques minutes a 24 heures selon le reseau",
  "cam-transfer": "1 a 3 jours ouvrables selon le pays",
  "bank-transfer": "1 a 3 jours ouvrables pour banque locale",
  "international-bank": "2 a 5 jours ouvrables pour banque internationale"
};

export const payflowSpecialServiceDelays = {
  countryChange: "Immediat a 24 heures apres confirmation et controle securite",
  directDeposit: "15 minutes a 3 jours ouvrables selon le compte de destination",
  qrBuySell: "Instantane a 15 minutes apres confirmation QR",
  dispute: "24 a 72 heures pour premiere analyse",
  trackTransfer: "Suivi disponible immediatement avec la reference"
};

export function getPayflowDeliveryDelay(method, transferType = "local") {
  if (method === "bank-transfer" && transferType === "international") {
    return payflowDeliveryDelays["international-bank"];
  }

  return payflowDeliveryDelays[method] || payflowDeliveryDelays.payflow;
}
