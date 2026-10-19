import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import SchoolWorkspace from "./SchoolWorkspace";

function SchoolDashboard() {
  const module = getModuleById("school");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <SchoolWorkspace selectedAction={selectedAction} profile={profile} closeModuleAction={closeModuleAction} />
      )}
    />
  );
}

export default SchoolDashboard;
