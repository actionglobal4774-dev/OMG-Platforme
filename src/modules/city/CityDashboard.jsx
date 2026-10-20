import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

function CityDashboard() {
  const module = getModuleById("city");

  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction }) => (
        <ModuleActionDestination moduleId="city" action={selectedAction} />
      )}
    />
  );
}

export default CityDashboard;
