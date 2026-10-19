export const payflowBankDirectory = {
  US: ["JPMorgan Chase", "Bank of America", "Wells Fargo", "Citibank", "U.S. Bank", "PNC Bank"],
  HT: ["Unibank", "Sogebank", "Banque Nationale de Credit", "Capital Bank", "BUH"],
  DO: ["Banco Popular Dominicano", "Banreservas", "Banco BHD", "Scotiabank Republica Dominicana"],
  CA: ["RBC Royal Bank", "TD Canada Trust", "Scotiabank", "BMO", "CIBC"],
  FR: ["BNP Paribas", "Credit Agricole", "Societe Generale", "Banque Populaire", "La Banque Postale"],
  SN: ["CBAO", "Ecobank Senegal", "Societe Generale Senegal", "Banque Atlantique Senegal", "Banque de l'Habitat du Senegal"],
  CI: ["Ecobank Cote d'Ivoire", "Societe Generale Cote d'Ivoire", "NSIA Banque", "Banque Atlantique Cote d'Ivoire", "BNI"],
  CM: ["Afriland First Bank", "Ecobank Cameroon", "Societe Generale Cameroun", "UBA Cameroon", "BICEC"],
  NG: ["Access Bank", "Zenith Bank", "GTBank", "First Bank of Nigeria", "United Bank for Africa"],
  GH: ["GCB Bank", "Ecobank Ghana", "Absa Bank Ghana", "Stanbic Bank Ghana", "Fidelity Bank Ghana"],
  BR: ["Banco do Brasil", "Caixa Economica Federal", "Itau", "Bradesco", "Santander Brasil"],
  MX: ["BBVA Mexico", "Banorte", "Santander Mexico", "Citibanamex", "HSBC Mexico"],
  ES: ["Banco Santander", "BBVA", "CaixaBank", "Banco Sabadell", "Bankinter"],
  PT: ["Caixa Geral de Depositos", "Millennium BCP", "Novo Banco", "Santander Totta", "Banco BPI"],
  MA: ["Attijariwafa Bank", "Banque Populaire", "BMCE Bank of Africa", "Societe Generale Maroc", "Credit Agricole du Maroc"],
  DZ: ["Banque Nationale d'Algerie", "Credit Populaire d'Algerie", "Banque Exterieure d'Algerie", "Banque de Developpement Local", "Societe Generale Algerie"],
  TN: ["Banque Internationale Arabe de Tunisie", "Amen Bank", "Banque de Tunisie", "Attijari Bank Tunisie", "STB Bank"],
  KE: ["KCB Bank", "Equity Bank Kenya", "Co-operative Bank of Kenya", "Absa Bank Kenya", "Standard Chartered Kenya"],
  ZA: ["Standard Bank", "First National Bank", "Absa Bank", "Nedbank", "Capitec Bank"],
  IN: ["State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank", "Punjab National Bank"]
};

export function getBanksForCountry(countryCode) {
  return payflowBankDirectory[countryCode] || [];
}
