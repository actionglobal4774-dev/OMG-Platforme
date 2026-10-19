import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import CityWorkspace from "./CityWorkspace";

function CityDashboard() {
  const module = getModuleById("city");

  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <CityWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />
      )}
    />
  );
}

export default CityDashboard;
