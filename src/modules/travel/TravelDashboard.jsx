import React from "react";
import ModuleDashboardTemplate from "../../components/modules/ModuleDashboardTemplate";
import { getModuleById } from "../../data/modules";
import ModuleActionDestination from "../../components/modules/ModuleActionDestination";

export default function TravelDashboard() {
  const module = getModuleById("travel");
  return <ModuleDashboardTemplate module={module} compactMenu menuActions={module.actions} suppressCompactActionFooter renderCompactAction={({ selectedAction }) => <ModuleActionDestination moduleId="travel" action={selectedAction} />} />;
}
