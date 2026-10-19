import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import MailportWorkspace from "./MailportWorkspace";

function MailportDashboard() {
  const module = getModuleById("mailport");
  return (
    <ModuleDashboardTemplate
      module={module}
      compactMenu
      menuActions={module.actions}
      suppressCompactActionFooter
      renderCompactAction={({ selectedAction, profile, closeModuleAction }) => (
        <MailportWorkspace
          selectedAction={selectedAction}
          profile={profile}
          closeModuleAction={closeModuleAction}
        />
      )}
    />
  );
}

export default MailportDashboard;
