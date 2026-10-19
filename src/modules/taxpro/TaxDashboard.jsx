import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import TaxWorkspace from "./TaxWorkspace";

function TaxDashboard() {
  const module = getModuleById("tax");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <TaxWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />
      )}
    />
  );
}

export default TaxDashboard;
