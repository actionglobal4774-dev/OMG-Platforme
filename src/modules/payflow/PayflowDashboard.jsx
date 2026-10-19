import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import PayflowQr from "./PayflowQr";
import PayflowSpecialServices from "./PayflowSpecialServices";
import ReceiveMoney from "./ReceiveMoney";
import RequestMoney from "./RequestMoney";
import SendMoney from "./SendMoney";
import Transactions from "./Transactions";
import OperatorCash from "./OperatorCash";

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getPayflowActionView(selectedAction, activeAction) {
  const action = normalize(selectedAction);

  if (action.includes("depot") || action.includes("deposit")) {
    return <OperatorCash mode="deposit" />;
  }

  if (action.includes("retrait") || action.includes("withdraw")) {
    return <OperatorCash mode="withdraw" />;
  }

  if (action.includes("envoyer") || action.includes("send")) {
    return <SendMoney />;
  }

  if (action.includes("demander") || action.includes("request")) {
    return <RequestMoney />;
  }

  if (action.includes("recevoir") || action.includes("receive")) {
    return <ReceiveMoney />;
  }

  if (action.includes("qr")) {
    return <PayflowQr />;
  }

  if (action.includes("historique") || action.includes("transaction")) {
    return <Transactions />;
  }

  if (action.includes("client") || action.includes("special")) {
    return <PayflowSpecialServices />;
  }

  if (action.includes("litige") || action.includes("track") || action.includes("suivi")) {
    return <PayflowSpecialServices selectedAction={selectedAction} />;
  }

  return <PayflowSpecialServices selectedAction={selectedAction} />;
}

function PayflowDashboard() {
  const module = getModuleById("payflow");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, activeAction }) => getPayflowActionView(selectedAction, activeAction)}
    />
  );
}

export default PayflowDashboard;
