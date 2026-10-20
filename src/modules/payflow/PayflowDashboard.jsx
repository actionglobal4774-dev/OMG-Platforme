import React from "react";
import { Navigate } from "react-router-dom";
import { getPayflowActionPath } from "./payflowNavigation";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import PayflowSpecialServices from "./PayflowSpecialServices";

function getPayflowActionView(selectedAction) {
  const canonicalPath = getPayflowActionPath(selectedAction);
  if (canonicalPath) return <Navigate to={canonicalPath} />;
  return <PayflowSpecialServices />;
}

function PayflowDashboard() {
  const module = getModuleById("payflow");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction }) => getPayflowActionView(selectedAction)}
    />
  );
}

export default PayflowDashboard;
