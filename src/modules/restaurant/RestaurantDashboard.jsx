import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

function RestaurantDashboard() {
  const module = getModuleById("restaurant");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction }) => (
        <ModuleActionDestination moduleId="restaurant" action={selectedAction} />
      )}
    />
  );
}

export default RestaurantDashboard;
