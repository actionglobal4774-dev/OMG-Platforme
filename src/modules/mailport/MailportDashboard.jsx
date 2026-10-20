import React from "react";
import { Navigate } from "react-router-dom";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import { getMailportActionPath } from "./mailportNavigation";

function MailportDashboard() {
  const module = getModuleById("mailport");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, closeModuleAction }) => {
        const destination = getMailportActionPath(selectedAction);
        return destination ? <Navigate to={destination} /> : <div role="status"><p>Cette fonction n'est pas disponible.</p><button type="button" onClick={closeModuleAction}>Retour au menu</button></div>;
      }}
    />
  );
}

export default MailportDashboard;
