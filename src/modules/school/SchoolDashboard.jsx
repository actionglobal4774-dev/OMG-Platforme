import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

function SchoolDashboard() {
  const module = getModuleById("school");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction }) => (
        <ModuleActionDestination moduleId="school" action={selectedAction} />
      )}
    />
  );
}

export default SchoolDashboard;
