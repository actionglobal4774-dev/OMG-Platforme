import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

function HealthDashboard() {
  const module = getModuleById("health");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction }) => (
        <ModuleActionDestination moduleId="health" action={selectedAction} />
      )}
    />
  );
}

export default HealthDashboard;
